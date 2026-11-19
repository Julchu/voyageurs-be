import { sql, type SQL } from "drizzle-orm";

/** The single row an INSERT/UPDATE ... RETURNING produces. */
export const single = <T>([row]: T[]) => {
  if (!row) throw new Error("Expected a returned row");
  return row;
};

/** Rows sent as one JSON parameter that Postgres expands into a table, instead of a query per row. */
export const recordset = (rows: object[], columns: SQL) =>
  sql`jsonb_to_recordset(${JSON.stringify(rows)}::jsonb) AS changes(${columns})`;
