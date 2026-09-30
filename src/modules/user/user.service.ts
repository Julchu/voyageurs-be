import { eq } from "drizzle-orm";
import { db } from "../../db";
import { type InsertPublicUser, userTable } from "../../db/schemas/user.schema.ts";

export const getUserById = async (userId: number) => {
  try {
    return await db.query.userTable.findFirst({
      where: { id: userId },
    });
  } catch (error) {
    throw new Error("Error getting user", { cause: error });
  }
};

export const getUserByEmail = async (email?: string) => {
  if (!email) return;
  try {
    return await db.query.userTable.findFirst({
      where: { email },
    });
  } catch (error) {
    throw new Error("Error getting user", { cause: error });
  }
};

export const insertUser = async (user: InsertPublicUser) => {
  const { name, email, image } = user;
  try {
    return await db.insert(userTable).values({ name, email, image }).returning();
  } catch (error) {
    throw new Error("Error inserting user", { cause: error });
  }
};

export const updateUser = async (userId: number, updatedUser: InsertPublicUser) => {
  const { email, ...userInfo } = updatedUser;
  try {
    const existingUser = await db.query.userTable.findFirst({
      where: { id: userId, email },
    });

    if (existingUser)
      return await db.update(userTable).set(userInfo).where(eq(userTable.id, userId)).returning();
  } catch (error) {
    throw new Error("Error updating user", { cause: error });
  }
};
