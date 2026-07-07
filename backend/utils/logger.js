import winston from "winston";

const logger = winston.createLogger({
  level: process.env.NODE_ENV === "development" ? "debug" : "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.printf(
      ({ level, message, timestamp, stack }) =>
        `${timestamp} [${level}]: ${stack || message}`
    )
  ),
  transports: [new winston.transports.Console()],
});

export default logger;
