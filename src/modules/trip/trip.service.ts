import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
import { db } from "../../db";
import {
  type SelectTrip,
  type SelectTripStop,
  tripStopTable,
  tripTable,
} from "../../db/schemas/trip.schema.ts";
import type { StopInput, Trip } from "../../types";
import type { UpdateTripBody } from "./trip.validation.ts";

const toStop = (stop: SelectTripStop) => ({
  publicId: stop.publicId,
  name: stop.name,
  streetAddress: stop.streetAddress,
  areaAddress: stop.areaAddress,
  coordinates: { lat: stop.latitude, lng: stop.longitude },
  position: stop.position,
  visited: stop.visited,
  visitedAt: stop.visitedAt ? stop.visitedAt.toISOString() : null,
});

const toTrip = (trip: SelectTrip, stops: SelectTripStop[]): Trip => ({
  publicId: trip.publicId,
  name: trip.name,
  stops: stops
    .filter((stop) => stop.deletedAt === null)
    .sort((left, right) => left.position - right.position)
    .map(toStop),
});

const activeTrips = async (userId: number) => {
  const trips = await db
    .select()
    .from(tripTable)
    .where(and(eq(tripTable.userId, userId), isNull(tripTable.deletedAt)))
    .orderBy(desc(tripTable.createdAt));

  if (trips.length === 0) return [];

  const stops = await db
    .select()
    .from(tripStopTable)
    .where(
      and(
        inArray(
          tripStopTable.tripId,
          trips.map((trip) => trip.id),
        ),
        isNull(tripStopTable.deletedAt),
      ),
    )
    .orderBy(asc(tripStopTable.position));

  const stopsByTrip = new Map<number, SelectTripStop[]>();
  for (const stop of stops) {
    const list = stopsByTrip.get(stop.tripId) ?? [];
    list.push(stop);
    stopsByTrip.set(stop.tripId, list);
  }

  return trips.map((trip) => toTrip(trip, stopsByTrip.get(trip.id) ?? [])).sort();
};

const findOwnedTrip = async (userId: number, publicId: string) => {
  const [trip] = await db
    .select()
    .from(tripTable)
    .where(
      and(
        eq(tripTable.userId, userId),
        eq(tripTable.publicId, publicId),
        isNull(tripTable.deletedAt),
      ),
    )
    .limit(1);
  return trip;
};

export const listTrips = async (userId: number) => {
  try {
    return await activeTrips(userId);
  } catch (error) {
    throw new Error("Error listing trips", { cause: error });
  }
};

export const createTrip = async (userId: number, name: string) => {
  try {
    await db.transaction(async (tx) => {
      await tx
        .update(tripTable)
        .set({ updatedAt: new Date() })
        .where(and(eq(tripTable.userId, userId), isNull(tripTable.deletedAt)));
      await tx.insert(tripTable).values({ userId, name });
    });
    return await activeTrips(userId);
  } catch (error) {
    throw new Error("Error creating trip", { cause: error });
  }
};

export const updateTrip = async (userId: number, publicId: string, patch: UpdateTripBody) => {
  const trip = await findOwnedTrip(userId, publicId);
  if (!trip) return;

  try {
    await db.transaction(async (tx) => {
      if (patch.status === "current") {
        await tx
          .update(tripTable)
          .set({ updatedAt: new Date() })
          .where(and(eq(tripTable.userId, userId), isNull(tripTable.deletedAt)));
      }

      const values: { name?: string; updatedAt: Date } = {
        updatedAt: new Date(),
      };
      if (patch.name !== undefined) values.name = patch.name;
      await tx.update(tripTable).set(values).where(eq(tripTable.id, trip.id));
    });
    return await activeTrips(userId);
  } catch (error) {
    throw new Error("Error updating trip", { cause: error });
  }
};

const nextPosition = async (tripId: number) => {
  const stops = await db
    .select({ position: tripStopTable.position })
    .from(tripStopTable)
    .where(and(eq(tripStopTable.tripId, tripId), isNull(tripStopTable.deletedAt)));
  return stops.reduce((max, stop) => Math.max(max, stop.position), -1) + 1;
};

const insertStop = async (tripId: number, input: StopInput) => {
  const position = await nextPosition(tripId);
  await db.insert(tripStopTable).values({
    tripId,
    name: input.name,
    streetAddress: input.streetAddress,
    areaAddress: input.areaAddress,
    latitude: input.coordinates.lat,
    longitude: input.coordinates.lng,
    position,
  });
};

// TODO: remove, save will be full sync of trip
export const appendToCurrentTrip = async (userId: number, input: StopInput) => {
  try {
    const current = await db
      .select()
      .from(tripTable)
      .where(and(eq(tripTable.userId, userId), isNull(tripTable.deletedAt)))
      .limit(1);

    const existing = current[0];
    if (existing) {
      await insertStop(existing.id, input);
      return await activeTrips(userId);
    }

    await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(tripTable)
        .values({ userId, name: "Current trip" })
        .returning();
      if (!created) throw new Error("Trip was not created");
      await tx.insert(tripStopTable).values({
        tripId: created.id,
        name: input.name,
        streetAddress: input.streetAddress,
        areaAddress: input.areaAddress,
        latitude: input.coordinates.lat,
        longitude: input.coordinates.lng,
        position: 0,
      });
    });
    return await activeTrips(userId);
  } catch (error) {
    throw new Error("Error adding stop", { cause: error });
  }
};

export const reorderStops = async (userId: number, publicId: string, publicIds: string[]) => {
  const trip = await findOwnedTrip(userId, publicId);
  if (!trip) return;

  const stops = await db
    .select()
    .from(tripStopTable)
    .where(and(eq(tripStopTable.tripId, trip.id), isNull(tripStopTable.deletedAt)));

  const known = new Set(stops.map((stop) => stop.publicId));
  if (publicIds.length !== stops.length || publicIds.some((id) => !known.has(id))) return "invalid";

  try {
    await db.transaction(async (tx) => {
      for (const [position, stopPublicId] of publicIds.entries()) {
        await tx
          .update(tripStopTable)
          .set({ position, updatedAt: new Date() })
          .where(and(eq(tripStopTable.tripId, trip.id), eq(tripStopTable.publicId, stopPublicId)));
      }
      await tx.update(tripTable).set({ updatedAt: new Date() }).where(eq(tripTable.id, trip.id));
    });
    return await activeTrips(userId);
  } catch (error) {
    throw new Error("Error reordering stops", { cause: error });
  }
};

export const setStopVisited = async (
  userId: number,
  tripPublicId: string,
  stopPublicId: string,
  visited: boolean,
) => {
  const trip = await findOwnedTrip(userId, tripPublicId);
  if (!trip) return;

  try {
    const updated = await db
      .update(tripStopTable)
      .set({
        visited,
        visitedAt: visited ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(tripStopTable.tripId, trip.id),
          eq(tripStopTable.publicId, stopPublicId),
          isNull(tripStopTable.deletedAt),
        ),
      )
      .returning({ id: tripStopTable.id });

    if (updated.length === 0) return;
    return await activeTrips(userId);
  } catch (error) {
    throw new Error("Error updating stop", { cause: error });
  }
};

export const removeStop = async (userId: number, tripPublicId: string, stopPublicId: string) => {
  const trip = await findOwnedTrip(userId, tripPublicId);
  if (!trip) return;

  try {
    const removed = await db
      .update(tripStopTable)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(tripStopTable.tripId, trip.id),
          eq(tripStopTable.publicId, stopPublicId),
          isNull(tripStopTable.deletedAt),
        ),
      )
      .returning({ id: tripStopTable.id });

    if (removed.length === 0) return;
    return await activeTrips(userId);
  } catch (error) {
    throw new Error("Error removing stop", { cause: error });
  }
};