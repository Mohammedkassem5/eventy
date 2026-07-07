import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { FiMapPin, FiPlus, FiTrash2 } from "react-icons/fi";
import { eventApi, ticketApi } from "../../services/eventApi";
import { mediaUrl, apiError } from "../../lib/api";

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

export default function SeatmapBuilder({ event, categories, onChange }) {
  const [ev, setEv] = useState(event);
  const [zones, setZones] = useState({});
  const areaRef = useRef(null);
  const drag = useRef(null);

  // وضع تحديد مضلّع: اضغط نقاطًا حول الشكل ثم OK (يدعم الأشكال غير المنتظمة)
  const [capCat, setCapCat] = useState(null); // فئة قيد التحديد
  const [points, setPoints] = useState([]);    // نقاط المضلّع %
  const [cursor, setCursor] = useState(null);  // موضع المؤشّر للمعاينة

  const toPct = (e) => {
    const r = areaRef.current.getBoundingClientRect();
    return {
      x: +clamp(((e.clientX - r.left) / r.width) * 100, 0, 100).toFixed(1),
      y: +clamp(((e.clientY - r.top) / r.height) * 100, 0, 100).toFixed(1),
    };
  };

  const startCapture = (catId) => {
    setCapCat(catId); setPoints([]); setCursor(null);
    toast("اضغط لإضافة نقاط حول الشكل (حتى المنحنيات)، ثم OK", { icon: "✏️" });
  };
  const cancelCapture = () => { setCapCat(null); setPoints([]); setCursor(null); };

  const onAreaClick = (e) => {
    if (!capCat) return;
    setPoints((p) => [...p, toPct(e)]);
  };
  const onAreaMove = (e) => {
    if (capCat) { setCursor(toPct(e)); return; }
    onMove(e); // وضع سحب المستطيلات القديمة
  };
  const undoPoint = () => setPoints((p) => p.slice(0, -1));

  const confirmCapture = async () => {
    if (points.length < 3) { toast.error("أضف 3 نقاط على الأقل"); return; }
    const updated = [...(zones[capCat] || []), { points }];
    setZones((z) => ({ ...z, [capCat]: updated }));
    await saveZone(capCat, updated);
    cancelCapture();
    toast.success("تمت إضافة المنطقة");
  };

  // حمّل الفعالية الطازجة (الصورة تُحفظ وتظهر عند الرجوع)
  useEffect(() => {
    eventApi.get(event.id).then(setEv).catch(() => {});
  }, [event.id]);

  // زامن المناطق من الفئات
  useEffect(() => {
    const z = {};
    categories.forEach((c) => {
      if (c.zone) {
        z[c.id] = Array.isArray(c.zone) ? c.zone : [c.zone];
      }
    });
    setZones(z);
  }, [categories]);

  const img = ev?.seatmap_image; // مأخوذة من المكان (Venue.map_image)

  const saveZone = async (catId, zoneList) => {
    try {
      await ticketApi.update(catId, { zone: zoneList });
    } catch (e) {
      toast.error(apiError(e));
      onChange?.();
    }
  };

  const addZone = async (c) => {
    const defaultZone = { x: 38, y: 38, w: 24, h: 18 };
    const current = zones[c.id] || [];
    const updated = [...current, defaultZone];
    setZones((z) => ({ ...z, [c.id]: updated }));
    await saveZone(c.id, updated);
  };

  const deleteZoneIndex = async (catId, index) => {
    const current = zones[catId] || [];
    const updated = current.filter((_, i) => i !== index);
    setZones((z) => {
      const n = { ...z };
      if (updated.length === 0) {
        delete n[catId];
      } else {
        n[catId] = updated;
      }
      return n;
    });
    await saveZone(catId, updated.length === 0 ? null : updated);
  };

  const removeZone = async (c) => {
    setZones((z) => {
      const n = { ...z };
      delete n[c.id];
      return n;
    });
    try {
      await ticketApi.update(c.id, { zone: null });
    } catch {
      /* ignore */
    }
  };

  // ── direct manipulation ──
  const onDown = (e, catId, index, mode) => {
    e.stopPropagation();
    const r = areaRef.current.getBoundingClientRect();
    const list = zones[catId] || [];
    drag.current = {
      catId,
      index,
      mode,
      rect: r,
      startX: e.clientX,
      startY: e.clientY,
      orig: { ...list[index] },
    };
  };

  const onMove = (e) => {
    const d = drag.current;
    if (!d) return;
    const dx = ((e.clientX - d.startX) / d.rect.width) * 100;
    const dy = ((e.clientY - d.startY) / d.rect.height) * 100;
    setZones((z) => {
      const list = [...(z[d.catId] || [])];
      const o = d.orig;
      let nz;
      if (d.mode === "move") {
        nz = {
          ...o,
          x: clamp(o.x + dx, 0, 100 - o.w),
          y: clamp(o.y + dy, 0, 100 - o.h),
        };
      } else {
        nz = {
          ...o,
          w: clamp(o.w + dx, 5, 100 - o.x),
          h: clamp(o.h + dy, 5, 100 - o.y),
        };
      }
      list[d.index] = nz;
      return { ...z, [d.catId]: list };
    });
  };

  const onUp = () => {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    saveZone(d.catId, zones[d.catId]);
  };

  return (
    <div className="smb">
      <div className="smb__bar">
        <span className="smb__hint">
          <FiMapPin /> «أضف منطقة» → اضغط نقاطًا حول أي شكل (حتى المنحنيات) → OK · ✕ للحذف
        </span>
      </div>

      {!img ? (
        <div className="smb__empty">
          لا توجد صورة مخطط لهذا المكان. أضِف صورة المخطط في صفحة «الأماكن» على المكان المختار، ثم اربط الفعالية به.
        </div>
      ) : (
        <div
          ref={areaRef}
          className={`smb__area ${capCat ? "smb__area--capturing" : ""}`}
          onMouseMove={onAreaMove}
          onMouseUp={onUp}
          onMouseLeave={onUp}
          onClick={onAreaClick}
        >
          <img src={mediaUrl(img)} alt="" draggable={false} />

          {/* طبقة SVG: مضلّعات الفئات + المضلّع الجاري */}
          <svg className="smb__svg" viewBox="0 0 100 100" preserveAspectRatio="none">
            {categories.filter((c) => zones[c.id]).flatMap((c) =>
              (zones[c.id] || []).map((z, index) =>
                z.points ? (
                  <polygon
                    key={`${c.id}-p${index}`}
                    points={z.points.map((p) => `${p.x},${p.y}`).join(" ")}
                    fill={`${c.color_hex}55`}
                    stroke={c.color_hex}
                    strokeWidth="2"
                    vectorEffect="non-scaling-stroke"
                    strokeLinejoin="round"
                  />
                ) : null
              )
            )}
            {capCat && points.length > 0 && (() => {
              const col = categories.find((c) => c.id === capCat)?.color_hex || "#f75200";
              const chain = [...points, ...(cursor ? [cursor] : [])];
              return (
                <g>
                  {points.length >= 3 && (
                    <polygon points={points.map((p) => `${p.x},${p.y}`).join(" ")} fill={`${col}33`} stroke="none" />
                  )}
                  <polyline points={chain.map((p) => `${p.x},${p.y}`).join(" ")} fill="none" stroke={col} strokeWidth="2" strokeDasharray="4 3" vectorEffect="non-scaling-stroke" />
                  {points.map((p, i) => (
                    <circle key={i} cx={p.x} cy={p.y} r="1.1" fill="#fff" stroke={col} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
                  ))}
                </g>
              );
            })()}
          </svg>

          {/* مستطيلات قديمة (draggable) */}
          {categories.filter((c) => zones[c.id]).flatMap((c) =>
            (zones[c.id] || []).map((z, index) =>
              z.points ? null : (
                <div
                  key={`${c.id}-r${index}`}
                  className="smb__zone"
                  style={{ left: `${z.x}%`, top: `${z.y}%`, width: `${z.w}%`, height: `${z.h}%`, borderColor: c.color_hex, background: `${c.color_hex}45` }}
                  onMouseDown={(e) => onDown(e, c.id, index, "move")}
                >
                  <span className="smb__zone-tag" style={{ background: c.color_hex }}>{c.name}</span>
                  <span className="smb__handle" onMouseDown={(e) => onDown(e, c.id, index, "resize")} />
                  <button type="button" className="smb__zone-del" onClick={(e) => { e.stopPropagation(); deleteZoneIndex(c.id, index); }}>✕</button>
                </div>
              )
            )
          )}

          {/* زرّ حذف لكل مضلّع (عند مركزه) */}
          {!capCat && categories.filter((c) => zones[c.id]).flatMap((c) =>
            (zones[c.id] || []).map((z, index) => {
              if (!z.points) return null;
              const cx = z.points.reduce((s, p) => s + p.x, 0) / z.points.length;
              const cy = z.points.reduce((s, p) => s + p.y, 0) / z.points.length;
              return (
                <button key={`del-${c.id}-${index}`} type="button" className="smb__zone-del smb__poly-del"
                  style={{ left: `${cx}%`, top: `${cy}%` }}
                  onClick={(e) => { e.stopPropagation(); deleteZoneIndex(c.id, index); }}>✕</button>
              );
            })
          )}

          {/* شريط إجراءات التحديد */}
          {capCat && (
            <div className="smb__cap-bar" onClick={(e) => e.stopPropagation()}>
              <span>{points.length} نقطة</span>
              <button type="button" className="btn btn-primary btn-sm" disabled={points.length < 3} onClick={confirmCapture}>OK</button>
              <button type="button" className="btn btn-ghost btn-sm" disabled={!points.length} onClick={undoPoint}>تراجع</button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={cancelCapture}>إلغاء</button>
            </div>
          )}
        </div>
      )}

      <div className="smb__cats">
        <h4 className="ev-section">مناطق الفئات على المخطط</h4>
        {categories.map((c) => {
          const zList = zones[c.id] || [];
          return (
            <div className="smb__cat" key={c.id}>
              <span className="tk-dot" style={{ background: c.color_hex }} />
              <span className="smb__cat-name">{c.name}</span>
              <span className="smb__cat-state">
                {zList.length > 0 ? `محدّدة (${zList.length} مناطق) ✓` : "بدون منطقة"}
              </span>
              <div style={{ display: "flex", gap: 5 }}>
                {zList.length > 0 && (
                  <button className="icon-btn icon-btn--danger" onClick={() => removeZone(c)}>
                    <FiTrash2 />
                  </button>
                )}
                <button
                  className="btn btn-ghost smb__draw"
                  disabled={!img || capCat === c.id}
                  onClick={() => startCapture(c.id)}
                  style={{ padding: "6px 10px", fontSize: 12 }}
                >
                  <FiPlus /> {capCat === c.id ? "حدّد نقطتين..." : "أضف منطقة"}
                </button>
              </div>
            </div>
          );
        })}
        {!categories.length && <p className="text-muted">أضف فئات أولًا من تبويب «الفئات».</p>}
      </div>
    </div>
  );
}
