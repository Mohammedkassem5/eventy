import { FiAward } from "react-icons/fi";
import "./TheaterMap.css";

const egp = (n) => `${Number(n).toLocaleString("ar-EG")} ج.م`;
const TIER_ICON = ["👑", "💎", "🏅", "🎖️", "🎫", "⭐"];

// شبكة نقاط مقاعد (rows × cols)
function Dots({ rows, cols }) {
  return (
    <div className="thseg__dots" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {Array.from({ length: rows * cols }).map((_, k) => <i key={k} />)}
    </div>
  );
}

/* مخطط المسرح — يُولَّد تلقائيًا من الفئات ليطابق التصميم المرجعي:
   STAGE + شريط أمامي + طبقات (جانب أيسر · وسط · جانب أيمن) + شريط سفلي */
export function TheaterOverview({ categories = [], activeCat, lockToCat = null, onPick }) {
  const tiers = [...categories]; // مرتبة كما جاءت (sort_order)
  const top = tiers[0];
  const bottom = tiers[tiers.length - 1];

  const Band = (c, i) => {
    const locked = lockToCat && c.id !== lockToCat;
    const active = activeCat === c.id;
    const out = c.available_seats <= 0;
    const rows = Math.max(3, Math.min(6, c.rows_count || 4));
    const cols = Math.max(14, Math.min(30, c.cols_count || 20));
    const sideCols = i === 0 ? 3 : 4; // الطبقة العليا جوانبها أضيق (مقسّمة)
    return (
      <button
        key={c.id}
        className={`thband ${active ? "is-active" : ""} ${locked ? "is-locked" : ""} ${out ? "is-out" : ""}`}
        style={{ "--tier": c.color_hex || "#6d28d9" }}
        onClick={() => !locked && !out && onPick?.(c.id)}
        disabled={locked || out}
        title={c.name}
      >
        <span className="thseg thseg--side">
          {i === 0 ? <><Dots rows={rows} cols={2} /><Dots rows={rows} cols={2} /></> : <Dots rows={rows} cols={sideCols} />}
        </span>
        <span className="thseg thseg--center">
          <Dots rows={rows} cols={cols} />
          <span className="thband__pill" style={{ background: c.color_hex || "#6d28d9" }}>
            <span className="thband__ic">{TIER_ICON[i] || <FiAward />}</span>
            <b>{c.name}</b>
            <em>{egp(c.price)}</em>
            {out && <span className="thband__out">نفد</span>}
          </span>
        </span>
        <span className="thseg thseg--side">
          {i === 0 ? <><Dots rows={rows} cols={2} /><Dots rows={rows} cols={2} /></> : <Dots rows={rows} cols={sideCols} />}
        </span>
      </button>
    );
  };

  return (
    <div className="thmap">
      {/* STAGE */}
      <div className="thmap__stage">STAGE</div>

      {/* شريط أمامي (بلون الطبقة العليا) */}
      {top && (
        <div className="thmap__front" style={{ "--tier": top.color_hex || "#6d28d9" }}>
          <Dots rows={2} cols={40} />
        </div>
      )}

      {/* الطبقات */}
      <div className="thmap__bands">{tiers.map(Band)}</div>

      {/* شريط سفلي مقسّم */}
      {bottom && (
        <div className="thmap__back" style={{ "--tier": bottom.color_hex || "#9aa0ab" }}>
          {Array.from({ length: 5 }).map((_, k) => (
            <span className="thmap__back-blk" key={k}><Dots rows={2} cols={6} /></span>
          ))}
        </div>
      )}
    </div>
  );
}

/* مصغّر حيّ: مقاعد القسم بشكلها الحقيقي — يُبرز مقعدك لحظيًا */
export function TheaterMini({ seats = [], selectedIds = [], color = "#f75200", onSeatClick }) {
  if (!seats.length) return null;
  const minX = Math.min(...seats.map((s) => s.x ?? 0));
  const minY = Math.min(...seats.map((s) => s.y ?? 0));
  const cols = Math.max(...seats.map((s) => (s.x ?? 0) - minX + 1), 1);
  const rows = Math.max(...seats.map((s) => (s.y ?? 0) - minY + 1), 1);
  return (
    <div className="thmini" style={{ "--tier": color }}>
      <div className="thmini__stage">المسرح ↑</div>
      <div className="thmini__grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, gridTemplateRows: `repeat(${rows}, 1fr)` }}>
        {seats.map((s) => {
          const sel = selectedIds.includes(s.id);
          const st = sel ? "sel" : s.status;
          return (
            <button
              key={s.id}
              type="button"
              className={`thmini__seat is-${st}`}
              style={{ gridColumn: (s.x ?? 0) - minX + 1, gridRow: (s.y ?? 0) - minY + 1 }}
              onClick={() => onSeatClick?.(s)}
              disabled={s.status === "booked" || s.status === "held"}
              title={`صف ${s.row_label} · مقعد ${s.seat_number}`}
            />
          );
        })}
      </div>
    </div>
  );
}
