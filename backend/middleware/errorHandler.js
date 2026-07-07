import logger from "../utils/logger.js";

// معالج الأخطاء المركزي — آخر middleware في السلسلة
export default function errorHandler(err, _req, res, _next) {
  const status = err.status || err.statusCode || 500;
  logger.error(err.message, { stack: err.stack });

  res.status(status).json({
    message:
      status === 500 ? "حدث خطأ في الخادم" : err.message || "حدث خطأ",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
}
