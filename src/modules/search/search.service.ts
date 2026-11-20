import { db } from "../../db";
import { placeSearchTable, type SelectPlaceSearch } from "../../db/schemas/place-search.schema.ts";
import type { PlaceSearch, PlaceSearchInput } from "../../types";

const toSearch = (row: SelectPlaceSearch): PlaceSearch => ({
  publicId: row.publicId,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
  query: row.query,
  mapboxId: row.mapboxId ?? undefined,
  name: row.name,
  streetAddress: row.streetAddress,
  areaAddress: row.areaAddress,
  category: row.category,
  coordinates: { lat: row.latitude, lng: row.longitude },
  searchedAt: row.createdAt.toISOString(),
});

export const listSearches = async (userId: number) => {
  const rows = await db.query.placeSearchTable.findMany({
    where: { userId, deletedAt: { isNull: true } },
    orderBy: { createdAt: "desc" },
    limit: 100,
  });
  return rows.map(toSearch);
};

export const logSearch = async (userId: number, { coordinates, ...search }: PlaceSearchInput) => {
  const [created] = await db
    .insert(placeSearchTable)
    .values({ userId, ...search, latitude: coordinates.lat, longitude: coordinates.lng })
    .returning();
  if (!created) throw new Error("Search was not saved");
  return toSearch(created);
};
