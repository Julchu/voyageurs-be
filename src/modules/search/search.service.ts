import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "../../db";
import { placeSearchTable } from "../../db/schemas/place-search.schema.ts";
import type { PlaceSearch, PlaceSearchInput } from "../../types";

const toSearch = (row: typeof placeSearchTable.$inferSelect): PlaceSearch => ({
  publicId: row.publicId,
  query: row.query,
  name: row.name,
  streetAddress: row.streetAddress,
  areaAddress: row.areaAddress,
  category: row.category,
  coordinates: { lat: row.latitude, lng: row.longitude },
  searchedAt: (row.createdAt ?? new Date()).toISOString(),
});

export const listSearches = async (userId: number) => {
  try {
    const rows = await db
      .select()
      .from(placeSearchTable)
      .where(and(eq(placeSearchTable.userId, userId), isNull(placeSearchTable.deletedAt)))
      .orderBy(desc(placeSearchTable.createdAt))
      .limit(100);
    return rows.map(toSearch);
  } catch (error) {
    throw new Error("Error listing searches", { cause: error });
  }
};

export const logSearch = async (userId: number, input: PlaceSearchInput) => {
  try {
    const [created] = await db
      .insert(placeSearchTable)
      .values({
        userId,
        query: input.query,
        name: input.name,
        streetAddress: input.streetAddress,
        areaAddress: input.areaAddress,
        category: input.category,
        latitude: input.coordinates.lat,
        longitude: input.coordinates.lng,
      })
      .returning();
    if (!created) throw new Error("Search was not saved");
    return toSearch(created);
  } catch (error) {
    throw new Error("Error logging search", { cause: error });
  }
};