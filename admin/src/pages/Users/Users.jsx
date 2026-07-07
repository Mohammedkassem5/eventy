import { useEffect, useState, useCallback } from "react";
import dayjs from "dayjs";
import "dayjs/locale/ar";
import toast from "react-hot-toast";
import {
  FiEye, FiSearch, FiSlash, FiCheckCircle, FiChevronRight, FiChevronLeft,
  FiPhone, FiMail, FiAward, FiPlus, FiMinus, FiCalendar,
} from "react-icons/fi";
import { userApi } from "../../services/userApi";
import { apiError } from "../../lib/api";
import Avatar from "../../components/Avatar/Avatar";
import Modal from "../../components/Modal/Modal";
import "../Bookings/Bookings.css";
import "./Users.css";

dayjs.locale("ar");
const egp = (n) => `${Number(n).toLocaleString("ar-EG")} ج.م`;
const ST = {
  confirmed: { t: "مؤكد", c: "#16a34a" },
  pending: { t: "معلق", c: "#d97706" },
  cancelled: { t: "ملغي", c: "#dc2626" },
  refunded: { t: "مسترد", c: "#6d28d9" },
};
const TABS = [{ k: "", l: "الكل" }, { k: "active", l: "نشط" }, { k: "verified", l: "موثّق" }, { k: "banned", l: "محظور" }];

export default function Users() {
  const [data, setData] = useState({ users: [], summary: {}, total: 0, pages: 1, page: 1 });
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [term, setTerm] = useState("");
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState(null);
  const [busy, setBusy] = useState(false);
  const [banForm, setBanForm] = useState(null); // {days, reason, permanent}

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await userApi.list({ status: status || undefined, q: term || undefined, page, limit: 12 })); }
    catch (e) { toast.error(apiError(e)); }
    finally { setLoading(false); }
  }, [status, term, page]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [status, term]);
  useEffect(() => { const t = setTimeout(() => setTerm(q.trim()), 350); return () => clearTimeout(t); }, [q]);

  const openDetail = async (id) => {
    try { setDetail(await userApi.get(id)); }
    catch (e) { toast.error(apiError(e)); }
  };

  const submitBan = async () => {
    if (!banForm.permanent && (!banForm.days || banForm.days < 1)) return toast.error("أدخل عدد أيام صالح");
    setBusy(true);
    try {
      const r = await userApi.ban(detail.user.id, {
        permanent: banForm.permanent,
        days: banForm.permanent ? undefined : Number(banForm.days),
        reason: banForm.reason?.trim() || undefined,
      });
      toast.success(r.message);
      setDetail((d) => ({ ...d, user: { ...d.user, ban: r.ban } }));
      setBanForm(null); load();
    } catch (e) { toast.error(apiError(e)); }
    finally { setBusy(false); }
  };

  const unban = async () => {
    setBusy(true);
    try {
      const r = await userApi.unban(detail.user.id);
      toast.success(r.message);
      setDetail((d) => ({ ...d, user: { ...d.user, ban: r.ban } }));
      load();
    } catch (e) { toast.error(apiError(e)); }
    finally { setBusy(false); }
  };

  const points = async (delta) => {
    setBusy(true);
    try {
      const r = await userApi.adjustPoints(detail.user.id, delta);
      setDetail((d) => ({ ...d, user: { ...d.user, loyalty_points: r.loyalty_points } }));
    } catch (e) { toast.error(apiError(e)); }
    finally { setBusy(false); }
  };

  const s = data.summary || {};
  const cards = [
    { l: "إجمالي العملاء", v: s.total ?? 0, c: "#6d28d9" },
    { l: "موثّقون", v: s.verified ?? 0, c: "#16a34a" },
    { l: "محظورون", v: s.banned ?? 0, c: "#dc2626" },
  ];

  return (
    <div className="bk-admin">
      <div className="page-head">
        <div><h1>المستخدمون</h1><p>كل العملاء المسجّلين — ابحث، اعرض الحجوزات، احظر أو عدّل نقاط الولاء.</p></div>
      </div>

      <div className="bk-cards">
        {cards.map((c, i) => (
          <div className="bk-card" key={i} style={{ animationDelay: `${i * 50}ms` }}>
            <span className="bk-card__bar" style={{ background: c.c }} />
            <span className="bk-card__label">{c.l}</span>
            <span className="bk-card__value" style={{ color: c.c }}>{c.v.toLocaleString("ar-EG")}</span>
          </div>
        ))}
      </div>

      <div className="bk-toolbar">
        <div className="bk-tabs">{TABS.map((t) => <button key={t.k} className={`chip ${status === t.k ? "chip--on" : ""}`} onClick={() => setStatus(t.k)}>{t.l}</button>)}</div>
        <div className="search">
          <FiSearch className="search__icon" />
          <input className="search__input" placeholder="ابحث بالاسم أو البريد أو الهاتف..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      {loading ? <div className="loading">جارٍ التحميل...</div> : (
        <>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>العميل</th><th>الهاتف</th><th>الحجوزات</th><th>النقاط</th><th>الحالة</th><th>الانضمام</th><th></th></tr></thead>
              <tbody>
                {data.users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="bk-user">
                        <Avatar src={u.avatar} name={u.name} size={40} />
                        <div><span className="bk-user__name">{u.name}</span><span className="bk-user__mail">{u.email}</span></div>
                      </div>
                    </td>
                    <td className="td-mono">{u.phone || "—"}</td>
                    <td className="td-strong">{Number(u.bookings_count || 0).toLocaleString("ar-EG")}</td>
                    <td className="td-strong">{Number(u.loyalty_points).toLocaleString("ar-EG")}</td>
                    <td>
                      {u.ban?.active
                        ? <span className="badge" style={{ background: "#dc26261a", color: "#dc2626" }}>{u.ban.permanent ? "محظور دائم" : "محظور مؤقت"}</span>
                        : u.is_verified
                          ? <span className="badge" style={{ background: "#16a34a1a", color: "#16a34a" }}>موثّق</span>
                          : <span className="badge" style={{ background: "#d977061a", color: "#d97706" }}>غير موثّق</span>}
                    </td>
                    <td className="bk-date">{dayjs(u.createdAt).format("D MMM YYYY")}</td>
                    <td><button className="icon-btn" onClick={() => openDetail(u.id)}><FiEye /></button></td>
                  </tr>
                ))}
                {!data.users.length && <tr><td colSpan="7" className="td-empty">لا يوجد عملاء.</td></tr>}
              </tbody>
            </table>
          </div>

          {data.pages > 1 && (
            <div className="bk-pager">
              <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><FiChevronRight /> السابق</button>
              <span>صفحة {data.page} من {data.pages}</span>
              <button className="btn btn-ghost btn-sm" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}>التالي <FiChevronLeft /></button>
            </div>
          )}
        </>
      )}

      <Modal open={!!detail} title="ملف العميل" onClose={() => setDetail(null)} width={600}>
        {detail && (
          <div className="usr">
            <div className="usr__head">
              <Avatar className="usr__avatar" src={detail.user.avatar} name={detail.user.name} size={72} />
              <div className="usr__id">
                <h3>{detail.user.name}{detail.user.ban?.active && <span className="usr__banned">{detail.user.ban.permanent ? "محظور دائم" : "محظور مؤقت"}</span>}</h3>
                <p className="text-muted"><FiMail /> {detail.user.email}</p>
                {detail.user.phone && <p className="text-muted"><FiPhone /> {detail.user.phone}</p>}
              </div>
            </div>

            {detail.user.ban?.active && (
              <div className="usr__ban-banner">
                <FiSlash />
                <div>
                  {detail.user.ban.permanent
                    ? <b>حظر دائم</b>
                    : <b>محظور حتى {dayjs(detail.user.ban.until).format("D MMMM YYYY · HH:mm")}</b>}
                  {detail.user.ban.reason && <p>السبب: {detail.user.ban.reason}</p>}
                </div>
              </div>
            )}

            <div className="usr__stats">
              <div><span>الحجوزات</span><b>{detail.stats.bookings.toLocaleString("ar-EG")}</b></div>
              <div><span>إجمالي الإنفاق</span><b>{egp(detail.stats.spent)}</b></div>
              <div className="usr__points">
                <span><FiAward /> نقاط الولاء</span>
                <div className="usr__points-ctl">
                  <button className="icon-btn" disabled={busy} onClick={() => points(-50)}><FiMinus /></button>
                  <b>{Number(detail.user.loyalty_points).toLocaleString("ar-EG")}</b>
                  <button className="icon-btn" disabled={busy} onClick={() => points(50)}><FiPlus /></button>
                </div>
              </div>
            </div>

            <h4 className="usr__sub"><FiCalendar /> آخر الحجوزات</h4>
            <div className="usr__bookings">
              {detail.bookings.length ? detail.bookings.map((b) => {
                const st = ST[b.status] || { t: b.status, c: "#888" };
                return (
                  <div className="usr__bk" key={b.booking_ref}>
                    <div><b>{b.event || "—"}</b><span className="td-mono">{b.booking_ref}</span></div>
                    <div className="usr__bk-meta">
                      <span>{egp(b.total_amount)} · ×{b.quantity}</span>
                      <span className="badge" style={{ background: `${st.c}1a`, color: st.c }}>{st.t}</span>
                    </div>
                  </div>
                );
              }) : <p className="text-muted">لا حجوزات بعد.</p>}
            </div>

            <div className="usr__actions">
              {detail.user.ban?.active
                ? <button className="btn btn-primary" disabled={busy} onClick={unban}><FiCheckCircle /> رفع الحظر</button>
                : <button className="btn btn-danger" disabled={busy} onClick={() => setBanForm({ days: 7, reason: "", permanent: false })}><FiSlash /> حظر العميل</button>}
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!banForm} title="حظر العميل" onClose={() => setBanForm(null)} width={440}>
        {banForm && (
          <div className="usr__banform">
            <div className="field">
              <label>نوع الحظر</label>
              <div className="bk-tabs">
                <button className={`chip ${!banForm.permanent ? "chip--on" : ""}`} onClick={() => setBanForm((f) => ({ ...f, permanent: false }))}>مؤقت (أيام)</button>
                <button className={`chip ${banForm.permanent ? "chip--on" : ""}`} onClick={() => setBanForm((f) => ({ ...f, permanent: true }))}>دائم</button>
              </div>
            </div>
            {!banForm.permanent && (
              <div className="field">
                <label>المدة بالأيام</label>
                <div className="usr__days">
                  {[3, 7, 14, 30].map((n) => (
                    <button key={n} className={`chip ${Number(banForm.days) === n ? "chip--on" : ""}`} onClick={() => setBanForm((f) => ({ ...f, days: n }))}>{n}</button>
                  ))}
                  <input type="number" min="1" value={banForm.days} onChange={(e) => setBanForm((f) => ({ ...f, days: e.target.value }))} />
                </div>
              </div>
            )}
            <div className="field">
              <label>السبب (يظهر للعميل)</label>
              <textarea rows="2" value={banForm.reason} onChange={(e) => setBanForm((f) => ({ ...f, reason: e.target.value }))} placeholder="مثال: عدم الحضور بعد الحجز بالدفع عند الاستلام" />
            </div>
            <div className="usr__actions">
              <button className="btn btn-ghost" onClick={() => setBanForm(null)}>إلغاء</button>
              <button className="btn btn-danger" disabled={busy} onClick={submitBan}><FiSlash /> تأكيد الحظر</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
