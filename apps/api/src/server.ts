import "dotenv/config";
import { createApp } from "./app";
import { env } from "./lib/env";

createApp().listen(env.PORT, () => {
  console.log(`Brillanda API listening on http://localhost:${env.PORT}`);
});
