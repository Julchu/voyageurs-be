import cookieParser from "cookie-parser";
import express, { type Express, type NextFunction, type Request, type Response } from "express";
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
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 1000,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, error: "Too many requests, please try again later." },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, error: "Too many requests, please try again later." },
});

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

app.use((_req: Request, _res: Response, next: NextFunction) => {
  next(createError(404));
});

app.use(errorHandler);

export default app;
