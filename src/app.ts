import cookieParser from "cookie-parser";
import express, { type Express } from "express";
import rateLimit from "express-rate-limit";
import createError from "http-errors";
import logger from "morgan";
import { userSetter } from "./lib/auth/auth-handlers.ts";
import { errorHandler } from "./middleware/error-handler.ts";
import { geoRouter } from "./modules/geo/geo.routes.ts";
import { searchRouter } from "./modules/search/search.routes.ts";
import { tripRouter } from "./modules/trip/trip.routes.ts";
import { userRouter } from "./modules/user/user.routes.ts";

const app: Express = express();

const trustProxy = process.env.TRUST_PROXY;
if (trustProxy === "true") {
  app.set("trust proxy", true);
} else if (trustProxy && /^\d+$/.test(trustProxy)) {
  app.set("trust proxy", Number(trustProxy));
}

app.use(logger("dev"));
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

const rateLimitOptions = {
  windowMs: 15 * 60 * 1000,
  standardHeaders: "draft-7" as const,
  legacyHeaders: false,
  message: { success: false, error: "Too many requests, please try again later." },
};
const limiter = rateLimit({ ...rateLimitOptions, limit: 1000 });
const authLimiter = rateLimit({ ...rateLimitOptions, limit: 30 });

app.use("/user/login", authLimiter);
app.use("/user/refresh", authLimiter);
app.use("/user/logout", authLimiter);
app.use(limiter);

app.get("/health", (_req, res) => {
  res.json({ success: true });
});

app.use("/user", userRouter);

const protectedRoutes = express.Router();
protectedRoutes.use(userSetter);
protectedRoutes.use("/geo", geoRouter);
protectedRoutes.use("/trips", tripRouter);
protectedRoutes.use("/searches", searchRouter);
app.use("/", protectedRoutes);

app.use((_req, _res, next) => {
  next(createError(404));
});

app.use(errorHandler);

export default app;
