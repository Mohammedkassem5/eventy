import toast from "react-hot-toast";

// نص حالة الحظر (مدة + تاريخ الرفع + السبب)
export function banMessage(ban) {
  if (!ban?.active) return null;
  if (ban.permanent) {
    return `🚫 حسابك محظور نهائيًا${ban.reason ? `\nالسبب: ${ban.reason}` : ""}`;
  }
  const until = new Date(ban.until);
  const days = Math.max(1, Math.ceil((until - new Date()) / 86400000));
  const date = until.toLocaleString("ar-EG", {
    day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
  return `🚫 حسابك محظور لمدة ${days} يوم\nيُرفع الحظر في: ${date}${ban.reason ? `\nالسبب: ${ban.reason}` : ""}`;
}

// إشعار أعلى الصفحة — id ثابت يمنع التكرار عند كل refresh
export function showBanToast(ban) {
  const msg = banMessage(ban);
  if (!msg) return;
  toast.error(msg, { id: "ban-notice", duration: 7000, style: { whiteSpace: "pre-line", textAlign: "right" } });
}

export const isBanned = (user) => !!user?.ban?.active;
