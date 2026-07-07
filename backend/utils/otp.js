import redis from "../config/redis.js";

const TTL = 600; // 10 دقائق
const MAX_ATTEMPTS = 5;

const key = (purpose, id) => `otp:${purpose}:${id.toLowerCase()}`;
const attemptsKey = (purpose, id) => `otp_att:${purpose}:${id.toLowerCase()}`;

// يولّد كودًا من 6 أرقام ويخزّنه في Redis مع مدة صلاحية
export async function generateOtp(purpose, identifier) {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  await redis.set(key(purpose, identifier), code, "EX", TTL);
  await redis.del(attemptsKey(purpose, identifier));
  return code;
}

// يتحقق من الكود — يرجّع { ok, reason }
export async function verifyOtp(purpose, identifier, code) {
  const stored = await redis.get(key(purpose, identifier));
  if (!stored) return { ok: false, reason: "انتهت صلاحية الكود أو غير موجود" };

  const attempts = Number(await redis.incr(attemptsKey(purpose, identifier)));
  await redis.expire(attemptsKey(purpose, identifier), TTL);
  if (attempts > MAX_ATTEMPTS) {
    await redis.del(key(purpose, identifier));
    return { ok: false, reason: "محاولات كثيرة — اطلب كودًا جديدًا" };
  }

  if (stored !== String(code)) return { ok: false, reason: "كود غير صحيح" };

  await redis.del(key(purpose, identifier));
  await redis.del(attemptsKey(purpose, identifier));
  return { ok: true };
}
