import { index, integer, pgTable, uuid } from "drizzle-orm/pg-core";
import { timestamptz } from "../utils/columns.ts";
import { userTable } from "./user.schema.ts";

/** One row per signed-in session; `jti` is the session ID both tokens carry. */
export const refreshTokenTable = pgTable(
  "refresh_tokens",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    userId: integer("user_id")
      .notNull()
      .references(() => userTable.id, { onDelete: "cascade" }),
    jti: uuid().notNull().unique(),
    expiresAt: timestamptz("expires_at").notNull(),
    createdAt: timestamptz("created_at").notNull().defaultNow(),
  },
  (table) => [index("refresh_tokens_user_id_idx").on(table.userId)],
);
