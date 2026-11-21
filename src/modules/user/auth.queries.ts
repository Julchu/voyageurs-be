import { eq } from "drizzle-orm";
import { db } from "../../db";
import { refreshTokenTable } from "../../db/schemas/refresh-token.schema.ts";
import type { Session } from "../../lib/auth/tokens.ts";

export const storeSession = (userId: number, sessionId: string, expiresAt: Date) =>
  db.insert(refreshTokenTable).values({ userId, jti: sessionId, expiresAt });

export const isSessionCurrent = async ({ userId, sessionId }: Session) =>
  !!(await db.query.refreshTokenTable.findFirst({
    columns: { id: true },
    where: { userId, jti: sessionId, expiresAt: { gt: new Date() } },
  }));

export const revokeSessions = (userId: number) =>
  db.delete(refreshTokenTable).where(eq(refreshTokenTable.userId, userId));
