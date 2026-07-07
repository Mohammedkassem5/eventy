// جلسة حجز مؤقتة — 10 دقائق، تبدأ عند اختيار الفئة وتستمر حتى الدفع.
// تُخزَّن في sessionStorage فتصمد أمام تحديث الصفحة وتنتهي بإغلاق التبويب.

const KEY = "eventy_booking";
export const DURATION = 600; // ثانية (10 دقائق)

function read() {
  try { return JSON.parse(sessionStorage.getItem(KEY)); } catch { return null; }
}

// جلسة الفعالية الحالية (أو null لو مختلفة/منتهية)
export function getSession(eventId) {
  const s = read();
  if (!s || String(s.eventId) !== String(eventId)) return null;
  return s;
}

// ابدأ (أو استرجع) جلسة لهذه الفعالية
export function startSession(eventId) {
  const existing = getSession(eventId);
  if (existing) return existing;
  const s = {
    eventId: String(eventId),
    sessionId: (crypto.randomUUID?.() || `s_${Date.now()}_${Math.random().toString(36).slice(2)}`),
    startedAt: Date.now(),
  };
  sessionStorage.setItem(KEY, JSON.stringify(s));
  return s;
}

export function clearSession() {
  sessionStorage.removeItem(KEY);
}

export function secondsLeft(session) {
  if (!session) return 0;
  return Math.max(0, DURATION - Math.floor((Date.now() - session.startedAt) / 1000));
}

export function saveSelectedSeats(eventId, seatIds) {
  const s = read();
  if (s && String(s.eventId) === String(eventId)) {
    s.selectedSeats = seatIds;
    sessionStorage.setItem(KEY, JSON.stringify(s));
  }
}

export function getSelectedSeats(eventId) {
  const s = read();
  if (!s || String(s.eventId) !== String(eventId)) return [];
  return s.selectedSeats || [];
}

