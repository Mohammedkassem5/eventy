import "./Loader.css";

const DOTS = Array.from({ length: 12 });

/**
 * مؤشّر تحميل — يُعرض فقط أثناء جلب بيانات فعليًا.
 * fullscreen: يملأ الشاشة (للتنقل بين الصفحات).
 * label: نص اختياري تحت السبينر.
 */
export default function Loader({ fullscreen = false, label }) {
  return (
    <div className={`loader ${fullscreen ? "loader--full" : ""}`} role="status" aria-label="جاري التحميل">
      <div className="loader__spin">
        {DOTS.map((_, i) => (
          <span key={i} style={{ "--i": i }} />
        ))}
      </div>
      {label && <p className="loader__label">{label}</p>}
    </div>
  );
}
