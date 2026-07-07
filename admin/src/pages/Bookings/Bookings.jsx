import { useEffect, useState, useCallback } from "react";
import dayjs from "dayjs";
import "dayjs/locale/ar";
import toast from "react-hot-toast";
import {
  FiSearch, FiEye, FiX, FiChevronRight, FiChevronLeft,
  FiCalendar, FiMapPin, FiTag, FiUser, FiCreditCard, FiGift, FiClock,
} from "react-icons/fi";
import { bookingApi } from "../../services/bookingApi";
import { apiError } from "../../lib/api";
import Modal from "../../components/Modal/Modal";
import Avatar from "../../components/Avatar/Avatar";
import "./Bookings.css";

dayjs.locale("ar");
const egp = (n) => `${Number(n).toLocaleString("ar-EG")} ج.م`;
const STATUS = {
  confirmed: { t: "مؤكد", c: "#16a34a" },
  pending: { t: "قيد الانتظار", c: "#d97706" },
  cancelled: { t: "ملغي", c: "#dc2626" },
};
const PAY = { card: "بطاقة", fawry: "فوري", vodafone_cash: "فودافون كاش", wallet: "محفظة", cash: "نقدًا عند الاستلام" };
const TABS = [{ k: "", l: "الكل" }, { k: "confirmed", l: "مؤكدة" }, { k: "pending", l: "قيد الانتظار" }, { k: "cancelled", l: "ملغية" }];

export default function Bookings() {
  const [data, setData] = useState({ bookings: [], summary: {}, total: 0, pages: 1, page: 1 });
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await bookingApi.list({ status: status || undefined, q: q || undefined, page, limit: 12 });
      setData(res);
    } catch (e) { toast.error(apiError(e)); }
    finally { setLoading(false); }
  }, [status, q, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [status, q]);

  const cancel = async (ref) => {
    if (!confirm("إلغاء هذا الحجز؟ سيُسترد المقاعد والنقاط.")) return;
    setCancelling(true);
    try {
      await bookingApi.cancel(ref);
      toast.success("تم الإلغاء");
      setDetail(null);
      load();
    } catch (e) { toast.error(apiError(e)); }
    finally { setCancelling(false); }
  };

  const confirmPay = async (ref) => {
    setCancelling(true);
    try {
      await bookingApi.confirmPayment(ref);
      toast.success("تم تأكيد الدفع وإرسال الكود للعميل");
      setDetail(null); load();
    } catch (e) { toast.error(apiError(e)); }
    finally { setCancelling(false); }
  };
  const rejectPay = async (ref) => {
    if (!confirm("رفض الدفع وإلغاء الحجز؟ سيُسترد المقاعد والنقاط.")) return;
    setCancelling(true);
    try {
      await bookingApi.rejectPayment(ref);
      toast.success("تم رفض الدفع");
      setDetail(null); load();
    } catch (e) { toast.error(apiError(e)); }
    finally { setCancelling(false); }
  };

  const s = data.summary || {};
  const cards = [
    { l: "إجمالي الحجوزات", v: s.total ?? 0, c: "#6d28d9" },
    { l: "مؤكدة", v: s.confirmed ?? 0, c: "#16a34a" },
    { l: "قيد الانتظار", v: s.pending ?? 0, c: "#d97706" },
    { l: "ملغية", v: s.cancelled ?? 0, c: "#dc2626" },
    { l: "الإيراد", v: egp(s.revenue ?? 0), c: "#f75200", wide: true },
  ];

  return (
    <div className="bk-admin">
      <div className="page-head">
        <div>
          <h1>الحجوزات</h1>
          <p>كل الحجوزات — بحث، تصفية، تفاصيل كاملة، وإلغاء مع استرداد المقاعد والنقاط.</p>
        </div>
      </div>

      {/* summary cards */}
      <div className="bk-cards">
        {cards.map((c, i) => (
          <div className={`bk-card ${c.wide ? "bk-card--wide" : ""}`} key={i} style={{ animationDelay: `${i * 50}ms` }}>
            <span className="bk-card__bar" style={{ background: c.c }} />
            <span className="bk-card__label">{c.l}</span>
            <span className="bk-card__value" style={{ color: c.c }}>{typeof c.v === "number" ? c.v.toLocaleString("ar-EG") : c.v}</span>
          </div>
        ))}
      </div>

      {/* toolbar */}
      <div className="bk-toolbar">
        <div className="bk-tabs">
          {TABS.map((t) => (
            <button key={t.k} className={`chip ${status === t.k ? "chip--on" : ""}`} onClick={() => setStatus(t.k)}>{t.l}</button>
          ))}
        </div>
        <div className="search">
          <FiSearch />
          <input placeholder="بحث برقم الحجز أو المستخدم..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      {loading ? <div className="loading">جارٍ التحميل...</div> : (
        <>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>المرجع</th><th>المستخدم</th><th>الفعالية</th><th>الفئة</th><th>المقاعد</th><th>المبلغ</th><th>الدفع</th><th>الحالة</th><th>التاريخ</th><th></th></tr></thead>
              <tbody>
                {data.bookings.map((b) => {
                  const st = STATUS[b.status] || STATUS.pending;
                  return (
                    <tr key={b.id}>
                      <td className="td-mono">{b.booking_ref}</td>
                      <td>
                        <div className="bk-user">
                          <Avatar src={b.user?.avatar} name={b.user?.name} size={40} />
                          <div><span className="bk-user__name">{b.user?.name}</span><span className="bk-user__mail">{b.user?.email}</span></div>
                        </div>
                      </td>
                      <td className="td-strong">{b.event?.title_ar}</td>
                      <td><span className="bk-cat" style={{ "--c": b.ticketCategory?.color_hex }}>{b.ticketCategory?.name}</span></td>
                      <td>{b.quantity}</td>
                      <td className="td-strong">{egp(b.total_amount)}</td>
                      <td>{PAY[b.payment_method] || b.payment_method}</td>
                      <td><span className="badge" style={{ background: `${st.c}1a`, color: st.c }}>{st.t}</span></td>
                      <td className="bk-date">{dayjs(b.createdAt).format("D MMM · HH:mm")}</td>
                      <td><button className="icon-btn" onClick={() => setDetail(b)}><FiEye /></button></td>
                    </tr>
                  );
                })}
                {!data.bookings.length && <tr><td colSpan="10" className="td-empty">لا توجد حجوزات.</td></tr>}
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

      {/* detail modal */}
      <Modal open={!!detail} title={`الحجز ${detail?.booking_ref || ""}`} onClose={() => setDetail(null)} width={620}>
        {detail && <BookingDetail b={detail} onCancel={cancel} onConfirmPay={confirmPay} onRejectPay={rejectPay} cancelling={cancelling} />}
      </Modal>
    </div>
  );
}

function BookingDetail({ b, onCancel, onConfirmPay, onRejectPay, cancelling }) {
  const awaitingPay = b.payment_status === "pending" && b.status !== "cancelled";
  const st = STATUS[b.status] || STATUS.pending;
  const d = b.event?.date_start ? dayjs(b.event.date_start) : null;
  return (
    <div className="bkd">
      <div className="bkd__top">
        <span className="badge" style={{ background: `${st.c}1a`, color: st.c }}>{st.t}</span>
        <span className="bkd__pay">{PAY[b.payment_method] || b.payment_method} — {b.payment_status === "paid" ? "مدفوع" : b.payment_status === "refunded" ? "مُسترد" : "معلّق"}</span>
      </div>

      <div className="bkd__grid">
        <div className="bkd__col">
          <h4><FiUser /> المستخدم</h4>
          <p>{b.user?.name}</p>
          <p className="text-muted">{b.user?.email}</p>
          {b.user?.phone && <p className="text-muted">{b.user.phone}</p>}
        </div>
        <div className="bkd__col">
          <h4><FiCalendar /> الفعالية</h4>
          <p>{b.event?.title_ar}</p>
          {d && <p className="text-muted">{d.format("dddd D MMMM YYYY · HH:mm")}</p>}
          {b.event?.venue_name && <p className="text-muted"><FiMapPin /> {b.event.venue_name}</p>}
        </div>
      </div>

      <div className="bkd__row"><FiTag /> الفئة: <b>{b.ticketCategory?.name}</b> × {b.quantity}</div>
      <div className="bkd__seats">
        {b.seats?.map((s) => <span key={s.seat_code}>{s.seat_code}</span>)}
      </div>

      <div className="bkd__money">
        <div><span>الإجمالي</span><strong>{egp(b.total_amount)}</strong></div>
        {b.points_earned > 0 && <div className="bkd__pts"><FiGift /> +{b.points_earned} نقطة</div>}
        {b.points_used > 0 && <div className="bkd__pts">استُخدم {b.points_used} نقطة</div>}
      </div>

      {b.qr_code && (
        <div className="bkd__qr"><img src={b.qr_code} alt="QR" /><span className="text-muted"><FiClock /> {dayjs(b.createdAt).format("D MMM YYYY · HH:mm")}</span></div>
      )}

      {awaitingPay && (
        <div className="bkd__await">
          ⏳ بانتظار تأكيد وصول الدفع ({PAY[b.payment_method] || b.payment_method}).
          {b.vodafone_ref && <span> رقم عملية فودافون: <b>{b.vodafone_ref}</b></span>}
          <div className="bkd__await-actions">
            <button className="btn btn-primary" disabled={cancelling} onClick={() => onConfirmPay(b.booking_ref)}>✅ تأكيد الدفع وإرسال الكود</button>
            <button className="btn btn-ghost btn-danger-ghost" disabled={cancelling} onClick={() => onRejectPay(b.booking_ref)}>رفض</button>
          </div>
        </div>
      )}

      {!awaitingPay && b.status !== "cancelled" && (
        <button className="btn btn-danger btn-block" disabled={cancelling} onClick={() => onCancel(b.booking_ref)}>
          <FiX /> {cancelling ? "جارٍ الإلغاء..." : "إلغاء الحجز واسترداد المقاعد"}
        </button>
      )}
    </div>
  );
}
