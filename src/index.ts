import app from "./app.ts";

const port = Number(process.env.PORT) || 8001;

app.listen(port, (error) => {
  if (error) throw error;
  console.log(`API listening on port ${port}`);
});
