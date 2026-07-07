import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import dayjs from "dayjs";
import "dayjs/locale/ar";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, BarChart, Bar,
} from "recharts";
import {
  FiDollarSign, FiShoppingBag, FiUsers, FiCalendar, FiTrendingUp, FiHeadphones,
} from "react-icons/fi";
import { statsApi } from "../../services/statsApi";
import { useAuth } from "../../store/authStore";
import Avatar from "../../components/Avatar/Avatar";
import "./Overview.css";

dayjs.locale("ar");

const egp = (n) => `${Number(n).toLocaleString("ar-EG")} ج.م`;
const STATUS_COLORS = { confirmed: "#16a34a", pending: "#f59e0b", cancelled: "#dc2626" };
const STATUS_AR = { confirmed: "مؤكدة", pending: "معلّقة", cancelled: "ملغية" };

export default function Overview() {
  const { admin } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    statsApi.dashboard().then(setData).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="ov-loading">جارٍ تحميل البيانات...</div>;
  if (!data) return <div className="ov-loading">تعذّر تحميل الإحصائيات.</div>;

  const t = data.totals;
  const kpis = [
    { icon: FiDollarSign, label: "إجمالي الإيراد", value: egp(t.revenue_total), sub: `اليوم: ${egp(t.revenue_today)}`, c: "#f75200" },
    { icon: FiShoppingBag, label: "الحجوزات", value: Number(t.bookings_total).toLocaleString("ar-EG"), sub: `اليوم: ${t.bookings_today}`, c: "#6d28d9" },
    { icon: FiTrendingUp, label: "تذاكر مباعة", value: Number(t.tickets_sold).toLocaleString("ar-EG"), sub: `${t.events_upcoming} فعالية قادمة`, c: "#0ea5e9" },
    { icon: FiUsers, label: "المستخدمون", value: Number(t.users_total).toLocaleString("ar-EG"), sub: `اليوم: +${t.users_today}`, c: "#16a34a" },
    { icon: FiCalendar, label: "الفعاليات", value: `${t.events_published}/${t.events_total}`, sub: "منشورة / الكل", c: "#e11d48" },
    { icon: FiHeadphones, label: "محادثات دعم مفتوحة", value: data.supportOpen, sub: "بانتظار الرد", c: "#0891b2" },
  ];

  const statusData = Object.entries(data.byStatus).map(([k, v]) => ({ name: STATUS_AR[k] || k, value: v, key: k }));

  return (
    <div className="ov">
      <div className="ov__head">
        <h1>الرئيسية</h1>
        <p className="text-muted">مرحبًا {admin?.name} 👋 — ملخّص أداء المنصة.</p>
      </div>

      {/* KPI cards */}
      <div className="kpis">
        {kpis.map((k, i) => (
          <div className="kpi" key={i}>
            <span className="kpi__ic" style={{ background: `${k.c}1a`, color: k.c }}><k.icon /></span>
            <div className="kpi__body">
              <span className="kpi__label">{k.label}</span>
              <span className="kpi__value">{k.value}</span>
              <span className="kpi__sub">{k.sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* charts row */}
      <div className="ov__grid">
        <div className="card card--wide">
          <div className="card__head"><h3>الإيراد — آخر 14 يوم</h3></div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={data.series} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f75200" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#f75200" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={(d) => dayjs(d).format("D/M")} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} width={48} />
              <Tooltip formatter={(v) => egp(v)} labelFormatter={(d) => dayjs(d).format("dddd D MMMM")} />
              <Area type="monotone" dataKey="revenue" stroke="#f75200" strokeWidth={2.5} fill="url(#rev)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="card__head"><h3>الحجوزات حسب الحالة</h3></div>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
                {statusData.map((s) => <Cell key={s.key} fill={STATUS_COLORS[s.key]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="legend">
            {statusData.map((s) => (
              <span key={s.key}><i style={{ background: STATUS_COLORS[s.key] }} /> {s.name} ({s.value})</span>
            ))}
          </div>
        </div>
      </div>

      <div className="ov__grid">
        {/* top events */}
        <div className="card card--wide">
          <div className="card__head"><h3>أعلى الفعاليات إيرادًا</h3></div>
          {data.topEvents.length ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data.topEvents} layout="vertical" margin={{ left: 10, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <YAxis type="category" dataKey="title_ar" width={120} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <Tooltip formatter={(v) => egp(v)} />
                <Bar dataKey="revenue" fill="#f75200" radius={[0, 6, 6, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="empty">لا توجد بيانات بعد.</p>}
        </div>

        {/* recent users */}
        <div className="card">
          <div className="card__head"><h3>أحدث المستخدمين</h3></div>
          <ul className="ulist">
            {data.recentUsers.map((u) => (
              <li key={u.id}>
                <Avatar src={u.avatar} name={u.name} size={44} />
                <div>
                  <span className="ulist__name">{u.name}</span>
                  <span className="ulist__sub">{u.email}</span>
                </div>
                <span className="ulist__date">{dayjs(u.createdAt).format("D MMM")}</span>
              </li>
            ))}
            {!data.recentUsers.length && <li className="empty">لا يوجد.</li>}
          </ul>
        </div>
      </div>

      {/* recent bookings */}
      <div className="card">
        <div className="card__head">
          <h3>أحدث الحجوزات</h3>
          <Link to="/bookings" className="card__link">عرض الكل ←</Link>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>المرجع</th><th>المستخدم</th><th>الفعالية</th><th>الكمية</th><th>المبلغ</th><th>الحالة</th><th>التاريخ</th></tr></thead>
            <tbody>
              {data.recentBookings.map((b) => (
                <tr key={b.id}>
                  <td className="td-mono">{b.booking_ref}</td>
                  <td>{b.user?.name}</td>
                  <td>{b.event?.title_ar}</td>
                  <td>{b.quantity}</td>
                  <td className="td-strong">{egp(b.total_amount)}</td>
                  <td><span className="badge" style={{ background: `${STATUS_COLORS[b.status]}1a`, color: STATUS_COLORS[b.status] }}>{STATUS_AR[b.status]}</span></td>
                  <td className="ulist__date">{dayjs(b.createdAt).format("D MMM HH:mm")}</td>
                </tr>
              ))}
              {!data.recentBookings.length && <tr><td colSpan="7" className="empty">لا توجد حجوزات.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
