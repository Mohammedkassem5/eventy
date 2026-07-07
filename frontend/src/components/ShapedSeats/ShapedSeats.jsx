import { layoutSeats } from "../../lib/seatLayout";
import "./ShapedSeats.css";

// مقاعد مربّعة (نمط مرجعي) موزّعة على شكل المكان الحقيقي
export default function ShapedSeats({ polygon, seats = [], selectedIds = [], onSeat }) {
  if (!polygon?.length || !seats.length) return null;
  const raw = layoutSeats(seats, polygon);

  // طبّع لملء الحاوية (بغضّ النظر عن حجم/موضع المضلّع على الصورة) مع الحفاظ على الشكل
  const xs = raw.map((p) => p.x), ys = raw.map((p) => p.y);
  const xMin = Math.min(...xs), xMax = Math.max(...xs), yMin = Math.min(...ys), yMax = Math.max(...ys);
  const nx = (v) => (xMax > xMin ? 7 + ((v - xMin) / (xMax - xMin)) * 86 : 50);
  const ny = (v) => (yMax > yMin ? 10 + ((v - yMin) / (yMax - yMin)) * 80 : 50);
  const placed = raw.map((p) => ({ ...p, x: nx(p.x), y: ny(p.y) }));
  // حدّ الشكل مطبّع أيضًا
  const polyN = polygon.map((p) => ({ x: nx(p.x), y: ny(p.y) }));

  return (
    <div className="shs">
      <div className="shs__bg" />
      <svg className="shs__svg" viewBox="0 0 100 100" preserveAspectRatio="none">
        <polygon points={polyN.map((p) => `${p.x},${p.y}`).join(" ")} fill="rgba(120,140,200,0.06)" strokeWidth="1.2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
      </svg>
      {placed.map(({ seat: s, x, y }) => {
        const sel = selectedIds.includes(s.id);
        const st = sel ? "sel" : s.status; // sel | booked | held | available
        return (
          <button
            key={s.id}
            type="button"
            className={`shs__seat is-${st}`}
            style={{ left: `${x}%`, top: `${y}%` }}
            onClick={() => onSeat?.(s)}
            disabled={s.status === "booked" || s.status === "held"}
            title={`صف ${s.row_label} · مقعد ${s.seat_number}`}
          >
            <span>{st === "booked" ? "✕" : s.seat_number}</span>
          </button>
        );
      })}
    </div>
  );
}
