import app from "./app.ts";
import { env } from "./env.ts";

app.listen(env.PORT, (error) => {
  if (error) throw error;
  console.log(`API listening on port ${env.PORT}`);
});
