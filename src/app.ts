import express, { type Express } from "express";
import logger from "morgan";
import { env } from "./env.ts";
import { notFound } from "./lib/errors.ts";
import { errorHandler } from "./middleware/error-handler.ts";
import { ipLimit, refreshLimit } from "./middleware/rate-limit.ts";
import { geoRouter } from "./modules/geo/geo.routes.ts";
import { searchRouter } from "./modules/search/search.routes.ts";
import { tripRouter } from "./modules/trip/trip.routes.ts";
import { tripadvisorRouter } from "./modules/tripadvisor/tripadvisor.routes.ts";
import { userRouter } from "./modules/user/user.routes.ts";

const app: Express = express();

// Proxy hops in front of the API, so req.ip is the visitor's address.
if (env.TRUST_PROXY) app.set("trust proxy", env.TRUST_PROXY === "true" || Number(env.TRUST_PROXY));

app.disable("x-powered-by");
app.use(logger("dev"));

app.get("/health", (_req, res) => {
  res.json({ success: true });
});

app.use(express.json({ limit: "2mb" }));
// Signed-in routes are limited per user inside requireUser.
app.use(["/user/login", "/user/logout"], ipLimit);
app.use("/user/refresh", refreshLimit);

app.use("/user", userRouter);
app.use("/geo", geoRouter);
app.use("/trips", tripRouter);
app.use("/searches", searchRouter);
// TODO: tighter rate limit for /tripadvisor once billing volume is known
app.use("/tripadvisor", tripadvisorRouter);

app.use(() => {
  throw notFound();
});
app.use(errorHandler);

export default app;
