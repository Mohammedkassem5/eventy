import { useId } from "react";
import "./StadiumMap.css";

/* ─── SVG canvas constants ─────────────────────────── */
const W = 800;
const H = 600;
const CX = 400;
const CY = 300;
const OUT_RX = 372;
const OUT_RY = 262;
const PITCH_RX = 150;
const PITCH_RY = 92;
const GENERIC_SECTORS = 22;
const GENERIC_GAP = 0.045;
const SECTION_GAP = 0.08;

/* ─── Geometry helpers ─────────────────────────────── */
const pt = (a, rx, ry) => [CX + rx * Math.cos(a), CY + ry * Math.sin(a)];

/** قطاع حلقي (annular sector) كمسار SVG */
// عدد الخطوات يتناسب مع طول القوس ليبقى المنحنى ناعمًا دائمًا
function arcPath(rxO, ryO, rxI, ryI, a1, a2, steps) {
  const n = steps || Math.max(8, Math.ceil((Math.abs(a2 - a1) / (Math.PI / 2)) * 22));
  const pts = [];
  for (let i = 0; i <= n; i++)
    pts.push(pt(a1 + ((a2 - a1) * i) / n, rxO, ryO));
  for (let i = n; i >= 0; i--)
    pts.push(pt(a1 + ((a2 - a1) * i) / n, rxI, ryI));
  return (
    "M" +
    pts.map((p) => `${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(" L") +
    " Z"
  );
}

/** نقطة مركزية لقطاع — لتحديد مكان النص */
function arcCenter(rxO, ryO, rxI, ryI, a1, a2) {
  const a = (a1 + a2) / 2;
  return pt(a, (rxO + rxI) / 2, (ryO + ryI) / 2);
}

/* ─── Component ────────────────────────────────────── */
/**
 * StadiumMap — مخطط الملعب ثلاثي الأبعاد
 *
 * @param {Object[]} categories  فئات التذاكر (id, name, color_hex, …)
 * @param {Function} onSelect    callback عند اختيار فئة (يُستخدم في صفحة الحجز)
 * @param {number}   activeCat   ID الفئة المختارة حالياً
 * @param {number}   lockToCat   قفل الخريطة على فئة واحدة (الباقي مقفل)
 * @param {Object[]} sections    أقسام الفئة النشطة [{id, name, seatCount, availableCount}]
 * @param {number}   activeSection  القسم المُضاء حالياً (أو null)
 * @param {Function} onSelectSection  callback عند اختيار قسم
 * @param {boolean}  mini        الوضع المصغر (mini‑map في الركن)
 */
export default function StadiumMap({
  categories = [],
  onSelect,
  activeCat,
  lockToCat = null,
  sections = [],
  activeSection = null,
  onSelectSection,
  mini = false,
}) {
  /* ID فريد لكل instance — يمنع تعارض gradient IDs */
  const uid = useId().replace(/:/g, "");

  const tiers = categories.slice(0, 5);
  const n = Math.max(tiers.length, 1);
  const bandRx = (OUT_RX - PITCH_RX) / n;
  const bandRy = (OUT_RY - PITCH_RY) / n;

  const tierEls = [];
  const labelEls = [];

  tiers.forEach((cat, k) => {
    const rxO = OUT_RX - k * bandRx;
    const ryO = OUT_RY - k * bandRy;
    const rxI = rxO - bandRx * 0.82;
    const ryI = ryO - bandRy * 0.82;
    const isActiveTier = lockToCat
      ? cat.id === lockToCat
      : cat.id === activeCat;

    /* ── الحلقة النشطة مع أقسام ── */
    if (isActiveTier && sections.length > 0) {
      const count = sections.length;
      const span = (Math.PI * 2) / count;

      sections.forEach((sec, s) => {
        const a1 = s * span + SECTION_GAP / 2;
        const a2 = (s + 1) * span - SECTION_GAP / 2;
        const [cx, cy] = arcCenter(rxO, ryO, rxI, ryI, a1, a2);
        const isSel = activeSection === sec.id;

        tierEls.push(
          <g
            key={`sec-${sec.id}`}
            className="stadium__secgrp"
            onClick={(e) => {
              e.stopPropagation();
              onSelectSection?.(sec.id);
            }}
          >
            <path
              d={arcPath(rxO, ryO, rxI, ryI, a1, a2, 10)}
              className={`stadium__sec stadium__sec--zone ${
                isSel ? "is-active-section" : "is-active"
              }`}
              style={{ fill: cat.color_hex || "#f75200" }}
            />

            {/* نصوص القسم — يُخفى في الوضع المصغر */}
            {!mini && (
              <>
                <text
                  x={cx}
                  y={cy - 4}
                  textAnchor="middle"
                  className="stadium__secnum"
                >
                  {sec.id}
                </text>
                <text
                  x={cx}
                  y={cy + 10}
                  textAnchor="middle"
                  className="stadium__secseats"
                >
                  {sec.availableCount} مقعد
                </text>
              </>
            )}

            {/* نقطة مضيئة في الوضع المصغر */}
            {mini && isSel && (
              <circle cx={cx} cy={cy} r={8} className="stadium__dot" />
            )}
          </g>
        );
      });
    } else {
      /* ── قطاعات عامة (فئات غير نشطة أو بدون أقسام) ── */
      const locked = lockToCat && cat.id !== lockToCat;
      const active = activeCat === cat.id;
      const sectorSpan = (Math.PI * 2) / GENERIC_SECTORS;

      for (let s = 0; s < GENERIC_SECTORS; s++) {
        const a1 = s * sectorSpan + GENERIC_GAP / 2;
        const a2 = (s + 1) * sectorSpan - GENERIC_GAP / 2;
        tierEls.push(
          <path
            key={`t${k}s${s}`}
            d={arcPath(rxO, ryO, rxI, ryI, a1, a2)}
            className={`stadium__sec ${active ? "is-active" : ""} ${
              locked ? "is-locked" : ""
            }`}
            style={{ fill: cat.color_hex || "#f75200" }}
            onClick={() => !locked && onSelect?.(cat.id)}
          />
        );
      }
    }

    /* ── اسم الفئة على الحلقة ── */
    const midRy = (ryO + ryI) / 2;
    const dim = lockToCat && cat.id !== lockToCat;
    if (!mini) {
      labelEls.push(
        <text
          key={`lbl-${k}`}
          x={CX}
          y={CY - midRy + 5}
          textAnchor="middle"
          className={`stadium__label ${dim ? "is-dim" : ""}`}
        >
          {cat.name}
        </text>
      );
    }
  });

  /* ── SVG gradient / filter IDs فريدة ── */
  const rimId = `rim${uid}`;
  const pitchId = `pg${uid}`;
  const filterId = `sf${uid}`;

  return (
    <div className={`stadium ${mini ? "stadium--mini" : ""}`}>
      <div className="stadium__tilt">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="stadium__svg"
          role="img"
          aria-label="مخطط الملعب"
        >
          <defs>
            <radialGradient id={rimId} cx="50%" cy="42%" r="62%">
              <stop offset="0" stopColor="#3a3f4a" />
              <stop offset="1" stopColor="#1b1e25" />
            </radialGradient>
            <radialGradient id={pitchId} cx="50%" cy="40%" r="70%">
              <stop offset="0" stopColor="#36b863" />
              <stop offset="1" stopColor="#176b35" />
            </radialGradient>
            <filter
              id={filterId}
              x="-20%"
              y="-20%"
              width="140%"
              height="140%"
            >
              <feDropShadow
                dx="0"
                dy="10"
                stdDeviation="12"
                floodColor="#000"
                floodOpacity="0.28"
              />
            </filter>
          </defs>

          {/* جدار المدرّج (عمق 3D) */}
          <ellipse
            cx={CX}
            cy={CY + 16}
            rx={OUT_RX + 14}
            ry={OUT_RY + 12}
            fill="#10131a"
          />
          <ellipse
            cx={CX}
            cy={CY}
            rx={OUT_RX + 14}
            ry={OUT_RY + 12}
            fill={`url(#${rimId})`}
            filter={`url(#${filterId})`}
          />

          {/* القطاعات */}
          {tierEls}

          {/* الملعب / المسرح */}
          <ellipse
            cx={CX}
            cy={CY}
            rx={PITCH_RX}
            ry={PITCH_RY}
            fill={`url(#${pitchId})`}
            stroke="rgba(255,255,255,.7)"
            strokeWidth="2"
          />
          <line
            x1={CX}
            y1={CY - PITCH_RY}
            x2={CX}
            y2={CY + PITCH_RY}
            stroke="rgba(255,255,255,.7)"
            strokeWidth="2"
          />
          <circle
            cx={CX}
            cy={CY}
            r="34"
            fill="none"
            stroke="rgba(255,255,255,.7)"
            strokeWidth="2"
          />

          {/* نص الملعب في المنتصف */}
          {!mini && (
            <text
              x={CX}
              y={CY + 5}
              textAnchor="middle"
              className="stadium__pitch-label"
            >
              الملعب
            </text>
          )}

          {/* أسماء الفئات على الحلقات */}
          {labelEls}
        </svg>
      </div>
    </div>
  );
}
