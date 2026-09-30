import { defineRelations } from "drizzle-orm";
import { placeSearchTable } from "./schemas/place-search.schema.ts";
import { refreshTokenTable } from "./schemas/refresh-token.schema.ts";
import { tripStopTable, tripTable } from "./schemas/trip.schema.ts";
import { userTable } from "./schemas/user.schema.ts";

export const schema = {
  userTable,
  refreshTokenTable,
  tripTable,
  tripStopTable,
  placeSearchTable,
};

export const relations = defineRelations(schema, (r) => ({
  userTable: {
    trips: r.many.tripTable(),
    placeSearches: r.many.placeSearchTable(),
    refreshTokens: r.many.refreshTokenTable(),
  },
  tripTable: {
    user: r.one.userTable({
      from: r.tripTable.userId,
      to: r.userTable.id,
      optional: false,
    }),
    stops: r.many.tripStopTable(),
  },
  tripStopTable: {
    trip: r.one.tripTable({
      from: r.tripStopTable.tripId,
      to: r.tripTable.id,
      optional: false,
    }),
  },
  placeSearchTable: {
    user: r.one.userTable({
      from: r.placeSearchTable.userId,
      to: r.userTable.id,
      optional: false,
    }),
  },
  refreshTokenTable: {
    user: r.one.userTable({
      from: r.refreshTokenTable.userId,
      to: r.userTable.id,
      optional: false,
    }),
  },
}));
