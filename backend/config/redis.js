import Redis from "ioredis";
import dotenv from "dotenv";

dotenv.config();

// عميل Redis مشترك — يُستخدم للكاش (settings/templates) والـ soft locks للمقاعد
const redis = new Redis({
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: Number(process.env.REDIS_PORT || 6379),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null, // مطلوب لتوافق Bull
  lazyConnect: true, // يتصل عند أول استخدام فعلي (لحد ما نشغّل Docker Redis)
});

redis.on("connect", () => console.log("Redis connected successfully 🧠"));
redis.on("error", (err) => console.error("Redis error ❌", err?.message));

export default redis;
