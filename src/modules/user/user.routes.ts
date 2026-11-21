import { Router } from "express";
import { clearAuthCookies, setAuthCookies } from "../../lib/auth/cookies.ts";
import { bearerToken } from "../../lib/auth/tokens.ts";
import { notFound, unauthorized } from "../../lib/errors.ts";
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
    if (!user) throw notFound("User not found");
    res.json({ success: true, data: toUserDto(user) });
  }),
);

userRouter.post("/login/google", async (req, res) => {
  const { code, codeVerifier } = parse(googleLoginSchema, req.body ?? {});
  const tokens = await loginWithGoogle(code, codeVerifier);
  if (!tokens) throw unauthorized();

  setAuthCookies(res, tokens);
  res.json({ success: true });
});

userRouter.post("/refresh", async (req, res) => {
  const accessToken = await refreshSession(bearerToken(req.header("Authorization")));
  if (!accessToken) {
    clearAuthCookies(res);
    throw unauthorized();
  }

  setAuthCookies(res, { accessToken });
  res.json({ success: true });
});

userRouter.post("/logout", async (req, res) => {
  clearAuthCookies(res);
  await logout(bearerToken(req.header("Authorization")), req.header("x-refresh-token")?.trim());
  res.json({ success: true, data: null });
});
