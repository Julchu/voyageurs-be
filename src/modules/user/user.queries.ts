import { eq } from "drizzle-orm";
import { db } from "../../db";
import { type InsertUser, userTable } from "../../db/schemas/user.schema.ts";
import { single } from "../../db/utils/sql.ts";

export const getUserById = (id: number) => db.query.userTable.findFirst({ where: { id } });

export const getUserByEmail = async (email?: string) =>
  email ? db.query.userTable.findFirst({ where: { email } }) : undefined;

export const getUserByGoogleSub = (googleSub: string) =>
  db.query.userTable.findFirst({ where: { googleSub } });

/**
 * Creates the user, or reads back the one a concurrent first login just created.
 * Undefined when the email already belongs to another Google account.
 */
export const insertUser = async (
  user: Pick<InsertUser, "googleSub" | "name" | "email" | "image">,
) => {
  await db.insert(userTable).values(user).onConflictDoNothing();
  return getUserByGoogleSub(user.googleSub);
};

export const updateUser = (
  id: number,
  changes: Partial<Pick<InsertUser, "name" | "preferences">>,
) => db.update(userTable).set(changes).where(eq(userTable.id, id)).returning().then(single);
