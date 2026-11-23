import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./drizzle",
  schema: "./src/db/schemas/*.ts",
  dialect: "postgresql",
  dbCredentials: {
    // Not env.ts: drizzle-kit runs with DATABASE_URL alone, and generate runs with none.
    url: process.env.DATABASE_URL ?? "",
  },
});
