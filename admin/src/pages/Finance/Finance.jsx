import { useEffect, useState, useCallback } from "react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from "recharts";
import dayjs from "dayjs";
import toast from "react-hot-toast";
import {
  FiTrendingUp, FiTrendingDown, FiDollarSign, FiRotateCcw, FiAward,
  FiShoppingBag, FiCreditCard, FiMapPin, FiTag, FiTruck, FiCalendar,
} from "react-icons/fi";
import { financeApi } from "../../services/financeApi";
import { apiError } from "../../lib/api";
import "./Finance.css";

const egp = (n) => `${Number(n).toLocaleString("ar-EG", { maximumFractionDigits: 0 })} ج.م`;
const PIE = ["#f75200", "#6d28d9", "#0ea5e9", "#16a34a", "#d97706", "#dc2626", "#0891b2", "#7c3aed"];
const DELIVERY = { branch_pickup: "استلام من الفرع", instant: "فوري", before_event: "قبل الفعالية" };

const PRESETS = [
  { l: "آخر 7 أيام", days: 7 },
  { l: "آخر 30 يوم", days: 30 },
  { l: "آخر 90 يوم", days: 90 },
  { l: "الكل", days: null },
];

export default function Finance() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [preset, setPreset] = useState(30);
  const [range, setRange] = useState({ from: dayjs().subtract(30, "day").format("YYYY-MM-DD"), to: dayjs().format("YYYY-MM-DD") });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = preset === null ? {} : { from: range.from, to: range.to };
      setData(await financeApi.overview(params));
    } catch (e) { toast.error(apiError(e)); }
    finally { setLoading(false); }
  }, [preset, range]);
  useEffect(() => { load(); }, [load]);

  const applyPreset = (days) => {
    setPreset(days);
    if (days) setRange({ from: dayjs().subtract(days, "day").format("YYYY-MM-DD"), to: dayjs().format("YYYY-MM-DD") });
  };

  if (loading && !data) return <div className="loading">جارٍ التحميل...</div>;
  const s = data?.summary || {};

  const cards = [
    { icon: FiDollarSign, label: "إجمالي الإيراد", value: egp(s.gross), c: "#16a34a", sub: `${s.confirmed || 0} حجز مؤكد` },
    { icon: FiRotateCcw, label: "المُسترد", value: egp(s.refunded), c: "#dc2626", sub: "مبالغ أُعيدت" },
    { icon: FiTrendingUp, label: "صافي الربح", value: egp(s.net), c: "#f75200", sub: "إيراد − مسترد", big: true },
    { icon: FiShoppingBag, label: "متوسط الطلب", value: egp(s.avg_order), c: "#6d28d9", sub: `${s.tickets_sold || 0} تذكرة` },
    { icon: FiAward, label: "نقاط مُستبدلة", value: egp(s.points_value_egp), c: "#0ea5e9", sub: `${s.points_redeemed || 0} نقطة خصم` },
  ];

  const breakdowns = [
    { key: "byPayment", title: "حسب وسيلة الدفع", icon: FiCreditCard, label: "method" },
    { key: "byCategory", title: "حسب نوع الفعالية", icon: FiTag, label: "category", extra: "seats" },
    { key: "byVenue", title: "حسب المكان", icon: FiMapPin, label: "venue" },
    { key: "byEvent", title: "أعلى الفعاليات إيرادًا", icon: FiCalendar, label: "event", extra: "seats" },
  ];

  const maxRev = (arr) => Math.max(1, ...(arr || []).map((r) => r.revenue));

  return (
    <div className="fin">
      <div className="page-head">
        <div><h1>المالية</h1><p>كل الأرباح بالتفصيل — لكل قسم على حدة: كم حقّق، وكم بلغ.</p></div>
      </div>

      {/* فلتر المدة */}
      <div className="fin__range">
        <div className="bk-tabs">
          {PRESETS.map((p) => <button key={p.l} className={`chip ${preset === p.days ? "chip--on" : ""}`} onClick={() => applyPreset(p.days)}>{p.l}</button>)}
        </div>
        {preset !== null && (
          <div className="fin__dates">
            <input type="date" value={range.from} max={range.to} onChange={(e) => { setRange((r) => ({ ...r, from: e.target.value })); }} />
            <span>→</span>
            <input type="date" value={range.to} min={range.from} max={dayjs().format("YYYY-MM-DD")} onChange={(e) => { setRange((r) => ({ ...r, to: e.target.value })); }} />
          </div>
        )}
      </div>

      {/* بطاقات الملخص */}
      <div className="fin__cards">
        {cards.map((c, i) => (
          <div className={`fin-card ${c.big ? "fin-card--big" : ""}`} key={i} style={{ animationDelay: `${i * 50}ms` }}>
            <span className="fin-card__icon" style={{ background: `${c.c}1a`, color: c.c }}><c.icon /></span>
            <div className="fin-card__body">
              <span className="fin-card__label">{c.label}</span>
              <span className="fin-card__value" style={{ color: c.c }}>{c.value}</span>
              <span className="fin-card__sub">{c.sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* مخطط الإيراد عبر الزمن */}
      <div className="fin-panel">
        <h3><FiTrendingUp /> الإيراد عبر الزمن</h3>
        {data?.series?.length ? (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={data.series} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
              <defs><linearGradient id="rev" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f75200" stopOpacity={0.35} /><stop offset="100%" stopColor="#f75200" stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tickFormatter={(d) => dayjs(d).format("D/M")} tick={{ fontSize: 11, fill: "var(--text-muted)" }} />
              <YAxis tick={{ fontSize: 11, fill: "var(--text-muted)" }} width={48} />
              <Tooltip formatter={(v) => egp(v)} labelFormatter={(d) => dayjs(d).format("D MMM YYYY")} contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10 }} />
              <Area type="monotone" dataKey="revenue" stroke="#f75200" strokeWidth={2.5} fill="url(#rev)" />
            </AreaChart>
          </ResponsiveContainer>
        ) : <p className="text-muted fin-empty">لا بيانات في هذه المدة.</p>}
      </div>

      <div className="fin-grid2">
        {/* دائري وسائل الدفع */}
        <div className="fin-panel">
          <h3><FiCreditCard /> توزيع وسائل الدفع</h3>
          {data?.byPayment?.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={data.byPayment} dataKey="revenue" nameKey="method" cx="50%" cy="50%" outerRadius={90} innerRadius={50} paddingAngle={2}>
                  {data.byPayment.map((_, i) => <Cell key={i} fill={PIE[i % PIE.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => egp(v)} contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-muted fin-empty">لا بيانات.</p>}
        </div>

        {/* أعمدة طريقة التسليم */}
        <div className="fin-panel">
          <h3><FiTruck /> الإيراد حسب التسليم</h3>
          {data?.byDelivery?.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.byDelivery.map((r) => ({ ...r, mode: DELIVERY[r.mode] || r.mode }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="mode" tick={{ fontSize: 11, fill: "var(--text-muted)" }} />
                <YAxis tick={{ fontSize: 11, fill: "var(--text-muted)" }} width={48} />
                <Tooltip formatter={(v) => egp(v)} contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10 }} />
                <Bar dataKey="revenue" fill="#6d28d9" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-muted fin-empty">لا بيانات.</p>}
        </div>
      </div>

      {/* جداول التفصيل */}
      <div className="fin-grid2">
        {breakdowns.map((b) => {
          const rows = data?.[b.key] || [];
          const max = maxRev(rows);
          return (
            <div className="fin-panel" key={b.key}>
              <h3><b.icon /> {b.title}</h3>
              {rows.length ? (
                <div className="fin-bars">
                  {rows.map((r, i) => (
                    <div className="fin-bar" key={i}>
                      <div className="fin-bar__top">
                        <span className="fin-bar__name">{r[b.label] || "—"}</span>
                        <span className="fin-bar__val">{egp(r.revenue)}</span>
                      </div>
                      <div className="fin-bar__track"><span style={{ width: `${(r.revenue / max) * 100}%`, background: PIE[i % PIE.length] }} /></div>
                      <div className="fin-bar__meta">
                        <span>{r.bookings} حجز</span>
                        {b.extra && <span>{r[b.extra]} مقعد</span>}
                        <span>{((r.revenue / (s.gross || 1)) * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p className="text-muted fin-empty">لا بيانات.</p>}
            </div>
          );
        })}
      </div>

      {/* حالة الحجوزات */}
      <div className="fin-panel">
        <h3><FiShoppingBag /> حالة الحجوزات</h3>
        <div className="fin-status">
          <div className="fin-status__item" style={{ borderColor: "#16a34a" }}><span>مؤكدة</span><b style={{ color: "#16a34a" }}>{s.confirmed || 0}</b></div>
          <div className="fin-status__item" style={{ borderColor: "#d97706" }}><span>معلّقة</span><b style={{ color: "#d97706" }}>{s.pending || 0}</b></div>
          <div className="fin-status__item" style={{ borderColor: "#dc2626" }}><span>ملغاة</span><b style={{ color: "#dc2626" }}>{s.cancelled || 0}</b></div>
          <div className="fin-status__item" style={{ borderColor: "#0ea5e9" }}><span>نقاط مُكتسبة</span><b style={{ color: "#0ea5e9" }}>{s.points_awarded || 0}</b></div>
        </div>
      </div>
    </div>
  );
}
