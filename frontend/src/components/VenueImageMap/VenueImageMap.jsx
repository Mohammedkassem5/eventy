import { mediaUrl } from "../../lib/api";
import "./VenueImageMap.css";

// مخطط المكان من صورة يرفعها الأدمن + مناطق الفئات فوقها (مستطيلات ومضلّعات)
export default function VenueImageMap({ image, categories = [], activeCat, onSelect, lockToCat = null, markers = [] }) {
  const items = [];
  categories.forEach((c) => {
    if (!c.zone) return;
    const list = Array.isArray(c.zone) ? c.zone : [c.zone];
    list.forEach((z, idx) => items.push({ c, z, key: `${c.id}-${idx}` }));
  });

  const state = (c) => {
    const out = c.available_seats <= 0;
    const locked = lockToCat && c.id !== lockToCat;
    return { out, locked, active: activeCat === c.id, clickable: !out && !locked };
  };

  return (
    <div className="vmap">
      <img className="vmap__img" src={mediaUrl(image)} alt="مخطط المكان" />

      {/* المضلّعات (أشكال غير منتظمة) */}
      <svg className="vmap__svg" viewBox="0 0 100 100" preserveAspectRatio="none">
        {items.filter(({ z }) => z.points).map(({ c, z, key }) => {
          const s = state(c);
          return (
            <polygon
              key={key}
              className={`vmap__poly ${s.active ? "is-active" : ""} ${s.locked ? "is-locked" : ""} ${s.out ? "is-out" : ""}`}
              points={z.points.map((p) => `${p.x},${p.y}`).join(" ")}
              fill={`${c.color_hex}${s.locked || s.out ? "22" : "55"}`}
              stroke={c.color_hex}
              strokeWidth="1.5"
              vectorEffect="non-scaling-stroke"
              strokeLinejoin="round"
              style={{ cursor: s.clickable ? "pointer" : "not-allowed" }}
              onClick={() => s.clickable && onSelect?.(c.id)}
            >
              <title>{`${c.name}${s.out ? " · نفد" : ` · ${c.available_seats} متاح`}`}</title>
            </polygon>
          );
        })}
      </svg>

      {/* المستطيلات */}
      {items.filter(({ z }) => !z.points).map(({ c, z, key }) => {
        const s = state(c);
        return (
          <button
            key={key}
            className={`vmap__zone ${s.active ? "is-active" : ""} ${s.locked ? "is-locked" : ""} ${s.out ? "is-out" : ""}`}
            style={{ left: `${z.x}%`, top: `${z.y}%`, width: `${z.w}%`, height: `${z.h}%`, borderColor: c.color_hex, background: `${c.color_hex}55` }}
            onClick={() => s.clickable && onSelect?.(c.id)}
            disabled={!s.clickable}
            title={`${c.name}${s.out ? " · نفد" : ` · ${c.available_seats} متاح`}`}
          />
        );
      })}

      {/* علامات المقاعد المختارة — تُضيء موقعها الفعلي */}
      {markers.map((m, i) => (
        <span key={i} className="vmap__marker" style={{ left: `${m.x}%`, top: `${m.y}%` }}>
          {m.n ?? ""}
        </span>
      ))}
    </div>
  );
}
