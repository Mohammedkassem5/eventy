import { mediaUrl } from "../../lib/api";
import "./Avatar.css";

// لون ثابت مشتق من الاسم
const COLORS = ["#f75200", "#6d28d9", "#0ea5e9", "#16a34a", "#d97706", "#dc2626", "#0891b2", "#7c3aed"];
const initials = (name = "") =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "؟";

// صورة حقيقية إن وُجدت، وإلا أحرف أولى بلون ثابت — بدون صور عشوائية
export default function Avatar({ src, name, size = 40, className = "" }) {
  const px = { width: size, height: size, fontSize: size * 0.4 };
  if (src) return <img className={`avatar ${className}`} style={px} src={mediaUrl(src)} alt={name || ""} />;
  const bg = COLORS[(name || "").length % COLORS.length];
  return (
    <span className={`avatar avatar--fallback ${className}`} style={{ ...px, background: bg }}>
      {initials(name)}
    </span>
  );
}
