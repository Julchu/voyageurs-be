import { type Response, type Router, Router as createRouter } from "express";
import type { InsertPublicUser } from "../../db/schemas/user.schema.ts";
import {
  bearerToken,
  clearAuthCookies,
  loginWithGoogleCode,
  logoutSession,
  refreshSession,
  setAuthCookies,
  userSetter,
} from "../../lib/auth/auth-handlers.ts";
import type { AuthRequest } from "../../types";
import { getUserById, updateUser } from "./user.service.ts";

export const userRouter: Router = createRouter();

userRouter.get("/", userSetter, async (req: AuthRequest, res) => {
  if (!req.userId) {
    res.status(401).json({ success: false, error: "Invalid user ID" });
    return;
  }

  try {
    const user = await getUserById(req.userId);
    res.json({ success: true, data: user });
  } catch (error) {
    console.error("Failed to get user", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});

userRouter.patch(
  "/update",
  userSetter,
  async (req: AuthRequest<unknown, unknown, { user: InsertPublicUser }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ success: false, error: "Invalid user ID" });
      return;
    }

    try {
      const updatedUser = await updateUser(req.userId, req.body.user);
      res.status(200).json({
        success: true,
        data: updatedUser,
      });
    } catch (error) {
      console.error("Failed to update user", error);
      res.status(500).json({ success: false, error: "Internal Server Error" });
    }
  },
);

userRouter.post("/login/google", async (req, res) => {
  const code = req.body?.code;
  const codeVerifier = req.body?.codeVerifier;

  if (typeof code !== "string" || typeof codeVerifier !== "string") {
    res.status(400).json({ success: false, error: "Missing authorization code" });
    return;
  }

  try {
    const tokens = await loginWithGoogleCode(code, codeVerifier);

    if (!tokens?.refreshToken) {
      res.status(401).json({ success: false, error: "Unauthorized" });
      return;
    }

    setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Failed to login", error instanceof Error ? error.name : "unknown");
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});

userRouter.post("/refresh", async (req, res) => {
  const token = bearerToken(req.header("Authorization"));

  try {
    const refreshed = await refreshSession(token);

    if (!refreshed) {
      clearAuthCookies(res);
      res.status(401).json({ success: false, error: "Unauthorized" });
      return;
    }

    setAuthCookies(res, refreshed.accessToken);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Failed to refresh session", error instanceof Error ? error.name : "unknown");
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});

userRouter.post("/logout", async (req, res) => {
  const accessToken = bearerToken(req.header("Authorization"));
  const refreshToken = req.header("x-refresh-token")?.trim();

  await logoutSession(accessToken, refreshToken);
  clearAuthCookies(res);
  res.status(200).json({ success: true, data: null });
});