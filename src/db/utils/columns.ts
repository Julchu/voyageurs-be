import { integer, timestamp, uuid } from "drizzle-orm/pg-core";

export const timestamptz = (name: string) => timestamp(name, { withTimezone: true });

/** Internal ID for joins; public ID for the API. */
export const identity = {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  publicId: uuid("public_id").notNull().defaultRandom().unique(),
};

export const timestamps = {
  createdAt: timestamptz("created_at").notNull().defaultNow(),
  updatedAt: timestamptz("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  deletedAt: timestamptz("deleted_at"),
};
