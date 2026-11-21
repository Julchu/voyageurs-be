import { eq } from "drizzle-orm";
import { db } from "../../db";
import { type InsertUser, userTable } from "../../db/schemas/user.schema.ts";

export const getUserById = (id: number) => db.query.userTable.findFirst({ where: { id } });

export const getUserByEmail = async (email?: string) =>
  email ? db.query.userTable.findFirst({ where: { email } }) : undefined;

export const insertUser = async (user: Pick<InsertUser, "name" | "email" | "image">) => {
  const [created] = await db.insert(userTable).values(user).returning();
  return created;
};

export const updateUser = async (
  id: number,
  changes: Partial<Pick<InsertUser, "name" | "preferences">>,
) => {
  const [updated] = await db.update(userTable).set(changes).where(eq(userTable.id, id)).returning();
  return updated;
};
