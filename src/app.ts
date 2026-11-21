import express, { type Express } from "express";
import rateLimit from "express-rate-limit";
import logger from "morgan";
import { notFound } from "./lib/errors.ts";
import { errorHandler } from "./middleware/error-handler.ts";
import { geoRouter } from "./modules/geo/geo.routes.ts";
import { searchRouter } from "./modules/search/search.routes.ts";
import { tripRouter } from "./modules/trip/trip.routes.ts";
import { userRouter } from "./modules/user/user.routes.ts";

const app: Express = express();

// Proxy hops in front of the API, so req.ip is the visitor's address.
const trustProxy = process.env.TRUST_PROXY;
if (trustProxy === "true") app.set("trust proxy", true);
else if (trustProxy && /^\d+$/.test(trustProxy)) app.set("trust proxy", Number(trustProxy));

const rateLimiter = (limit: number) =>
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { success: false, error: "Too many requests, please try again later." },
  });

app.use(logger("dev"));
app.use(express.json({ limit: "2mb" }));
app.use(["/user/login", "/user/refresh", "/user/logout"], rateLimiter(30));
app.use(rateLimiter(1000));

app.get("/health", (_req, res) => {
  res.json({ success: true });
});

app.use("/user", userRouter);
app.use("/geo", geoRouter);
app.use("/trips", tripRouter);
app.use("/searches", searchRouter);

app.use(() => {
  throw notFound();
});
app.use(errorHandler);

export default app;
