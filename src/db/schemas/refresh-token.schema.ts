import { index, integer, pgTable, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { userTable } from "./user.schema.ts";

export const refreshTokenTable = pgTable(
  "refresh_tokens",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    userId: integer("user_id")
      .references(() => userTable.id, { onDelete: "cascade" })
      .notNull(),
    jti: uuid("jti").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("refresh_tokens_jti_unique").on(table.jti),
    index("refresh_tokens_user_id_idx").on(table.userId),
  ],
);
