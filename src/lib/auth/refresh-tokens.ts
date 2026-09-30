import { and, eq, gt } from "drizzle-orm";
import { db } from "../../db";
import { refreshTokenTable } from "../../db/schemas/refresh-token.schema.ts";

export const storeRefreshToken = async ({
  userId,
  jti,
  expiresAt,
}: {
  userId: number;
  jti: string;
  expiresAt: Date;
}) => {
  await db.insert(refreshTokenTable).values({
    userId,
    jti,
    expiresAt,
  });
};

export const refreshTokenIsCurrent = async ({ userId, jti }: { userId: number; jti: string }) => {
  const [row] = await db
    .select({ jti: refreshTokenTable.jti })
    .from(refreshTokenTable)
    .where(
      and(
        eq(refreshTokenTable.jti, jti),
        eq(refreshTokenTable.userId, userId),
        gt(refreshTokenTable.expiresAt, new Date()),
      ),
    )
    .limit(1);

  return Boolean(row);
};

export const revokeUserRefreshTokens = async (userId: number) => {
  await db.delete(refreshTokenTable).where(eq(refreshTokenTable.userId, userId));
};
