import { fileURLToPath } from "node:url";

const schedule = fileURLToPath(new URL("../visualiser/src/lib/schedule", import.meta.url));

export default {
  resolve: { alias: { "@schedule": schedule } },
  server: { fs: { allow: [schedule, "."] } },
};
