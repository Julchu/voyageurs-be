import { Router } from "express";
import { clearAuthCookies, setAuthCookies } from "../../lib/auth/cookies.ts";
import { bearerToken } from "../../lib/auth/tokens.ts";
import { unauthorized } from "../../lib/errors.ts";
import { parse } from "../../lib/validation.ts";
import { requireUser } from "../../middleware/require-user.ts";
import { loginWithGoogle, logout, refreshSession } from "./auth.service.ts";
import { toUserDto } from "./user.mapper.ts";
import { getUserById, updateUser } from "./user.queries.ts";
import { googleLoginSchema, updateUserSchema } from "./user.validation.ts";

export const userRouter: Router = Router();

userRouter.get(
  "/",
  requireUser(async (req, res) => {
    const user = await getUserById(req.userId);
    res.json({ success: true, data: user ? toUserDto(user) : null });
  }),
);

userRouter.patch(
  "/",
  requireUser(async (req, res) => {
    const user = await updateUser(req.userId, parse(updateUserSchema, req.body ?? {}));
    res.json({ success: true, data: toUserDto(user) });
  }),
);

userRouter.post("/login/google", async (req, res) => {
  const tokens = await loginWithGoogle(parse(googleLoginSchema, req.body ?? {}));
  if (!tokens) throw unauthorized();

  // Cookies for the web's server, which ignores the body; the iOS app reads the tokens from the body.
  setAuthCookies(res, tokens);
  res.json({ success: true, data: tokens });
});

userRouter.post("/refresh", async (req, res) => {
  const tokens = await refreshSession(bearerToken(req.header("Authorization")));
  if (!tokens) {
    clearAuthCookies(res);
    throw unauthorized();
  }

  setAuthCookies(res, tokens);
  res.json({ success: true, data: tokens });
});

userRouter.post("/logout", async (req, res) => {
  clearAuthCookies(res);
  await logout(bearerToken(req.header("Authorization")), req.header("x-refresh-token")?.trim());
  res.json({ success: true, data: null });
});
