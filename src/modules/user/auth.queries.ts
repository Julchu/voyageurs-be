import { and, eq, gt, lt } from "drizzle-orm";
import { db } from "../../db";
import { refreshTokenTable } from "../../db/schemas/refresh-token.schema.ts";
import type { Session } from "../../lib/auth/tokens.ts";

const isSession = ({ userId, sessionId }: Session) =>
  and(eq(refreshTokenTable.userId, userId), eq(refreshTokenTable.jti, sessionId));

export const storeSession = (userId: number, sessionId: string, expiresAt: Date) =>
  db.insert(refreshTokenTable).values({ userId, jti: sessionId, expiresAt });

export const pruneSessions = (userId: number) =>
  db
    .delete(refreshTokenTable)
    .where(and(eq(refreshTokenTable.userId, userId), lt(refreshTokenTable.expiresAt, new Date())));

export const isSessionCurrent = async ({ userId, sessionId }: Session) =>
  !!(await db.query.refreshTokenTable.findFirst({
    columns: { id: true },
    where: { userId, jti: sessionId, expiresAt: { gt: new Date() } },
  }));

/** Pushes a current session's expiry forward; false once it has ended. */
export const extendSession = async (session: Session, expiresAt: Date) =>
  (
    await db
      .update(refreshTokenTable)
      .set({ expiresAt })
      .where(and(isSession(session), gt(refreshTokenTable.expiresAt, new Date())))
      .returning({ id: refreshTokenTable.id })
  ).length > 0;

export const endSession = (session: Session) =>
  db.delete(refreshTokenTable).where(isSession(session));
