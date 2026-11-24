import { drizzle } from "drizzle-orm/postgres-js";
import { env } from "../env.ts";
import { relations, schema } from "./relations.ts";

export const db = drizzle({
  connection: {
    url: env.DATABASE_URL,
    ssl: env.NODE_ENV !== "development",
  },
  schema,
  relations,
});
