import { integer, timestamp, uuid } from "drizzle-orm/pg-core";

export const timestamps = {
  updatedAt: timestamp("updated_at").$onUpdate(() => new Date()),
  createdAt: timestamp("created_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
};

export const requiredColumns = {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  publicId: uuid("public_id").defaultRandom().notNull(),
};

export type PrivateFields = "id" | "userId";

export type AutomaticFields = "createdAt" | "updatedAt" | "deletedAt";
