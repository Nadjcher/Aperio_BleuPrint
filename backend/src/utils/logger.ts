import { pino } from "pino";
import { env, isProd } from "../config/env.js";

export const logger = pino({
  level: isProd ? "info" : "debug",
  // En dev, une sortie lisible ; en prod, du JSON structuré.
  transport: isProd
    ? undefined
    : { target: "pino-pretty", options: { colorize: true } },
  base: { env: env.NODE_ENV },
  // Ne jamais journaliser de secrets ni de données personnelles brutes.
  redact: ["req.headers.authorization", "password", "*.password", "token", "*.token"],
});
