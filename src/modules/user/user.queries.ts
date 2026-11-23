import { eq } from "drizzle-orm";
import { db } from "../../db";
import { type InsertUser, userTable } from "../../db/schemas/user.schema.ts";
import { single } from "../../db/utils/sql.ts";

export const getUserById = (id: number) => db.query.userTable.findFirst({ where: { id } });

export const getUserByEmail = async (email?: string) =>
  email ? db.query.userTable.findFirst({ where: { email } }) : undefined;

/** Creates the user, or reads back the one a concurrent first login just created. */
export const insertUser = async (user: Pick<InsertUser, "name" | "email" | "image">) => {
  await db.insert(userTable).values(user).onConflictDoNothing({ target: userTable.email });
  return db.select().from(userTable).where(eq(userTable.email, user.email)).then(single);
};

export const updateUser = (
  id: number,
  changes: Partial<Pick<InsertUser, "name" | "preferences">>,
) => db.update(userTable).set(changes).where(eq(userTable.id, id)).returning().then(single);
