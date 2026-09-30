import { drizzle } from "drizzle-orm/postgres-js";
import { relations, schema } from "./relations.ts";

export const db = drizzle({
  connection: {
    url: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === "production" || process.env.NODE_ENV === "staging",
  },
  schema,
  relations,
});
