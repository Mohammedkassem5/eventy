import redis from "../config/redis.js";

// حجز مؤقت للمقاعد عبر Redis — soft-lock ذرّي بمهلة 10 دقائق
export const HOLD_TTL = 600; // ثانية
const key = (eventId, seatId) => `seat:hold:${eventId}:${seatId}`;

// حرِّر مقعدًا فقط إن كان مملوكًا لنفس الجلسة (ذرّي عبر Lua)
const RELEASE_LUA =
  "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end";

// احجز مقاعد لجلسة — يُرجّع المحجوز والفاشل (محجوز لغير هذه الجلسة)
export async function holdSeats(eventId, sessionId, seatIds) {
  const held = [], failed = [];
  for (const id of seatIds) {
    const k = key(eventId, id);
    const ok = await redis.set(k, String(sessionId), "EX", HOLD_TTL, "NX");
    if (ok === "OK") { held.push(id); continue; }
    const owner = await redis.get(k);
    if (owner === String(sessionId)) { await redis.expire(k, HOLD_TTL); held.push(id); } // جدّد حجزي
    else failed.push(id);
  }
  return { held, failed };
}

// حرِّر مقاعد تخص هذه الجلسة فقط
export async function releaseSeats(eventId, sessionId, seatIds) {
  const released = [];
  for (const id of seatIds) {
    const r = await redis.eval(RELEASE_LUA, 1, key(eventId, id), String(sessionId));
    if (r === 1) released.push(id);
  }
  return released;
}

// احذف حجوزات مقاعد نهائيًا (بعد الحجز الفعلي)
export async function purgeHolds(eventId, seatIds) {
  if (!seatIds.length) return;
  await redis.del(seatIds.map((id) => key(eventId, id)));
}

// خريطة { seatId: ownerSessionId } للمقاعد المحجوزة مؤقتًا
export async function heldOwners(eventId, seatIds) {
  const map = {};
  if (!seatIds.length) return map;
  const vals = await redis.mget(seatIds.map((id) => key(eventId, id)));
  seatIds.forEach((id, i) => { if (vals[i]) map[id] = vals[i]; });
  return map;
}
