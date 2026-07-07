import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import dayjs from "dayjs";
import "dayjs/locale/ar";
import toast from "react-hot-toast";
import { FiCalendar, FiMapPin, FiTag, FiX } from "react-icons/fi";
import { bookingApi } from "../../services/bookingApi";
import { useAuth } from "../../store/authStore";
import { formatPrice } from "../../utils/format";
import Loader from "../../components/Loader/Loader";
import "./MyTickets.css";

dayjs.locale("ar");

const TABS = [
  { key: "", label: "الكل" },
  { key: "confirmed", label: "مؤكدة" },
  { key: "pending", label: "قيد الانتظار" },
  { key: "cancelled", label: "ملغية" },
];

const STATUS = {
  confirmed: { label: "مؤكد", cls: "ok" },
  pending: { label: "قيد الانتظار", cls: "wait" },
  cancelled: { label: "ملغي", cls: "bad" },
};

export default function MyTickets() {
  const { user, ready } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState("");

  const { data: bookings, isLoading } = useQuery({
    queryKey: ["bookings", tab],
    queryFn: () => bookingApi.list(tab || undefined),
    enabled: !!user,
  });

  if (ready && !user) return <Navigate to="/login?redirect=/my-tickets" replace />;
  if (!ready) return <Loader fullscreen label="جارٍ التحميل..." />;

  const requestRefund = async (ref) => {
    const reason = prompt("سبب طلب الاسترداد (اختياري):") ?? "";
    try {
      await bookingApi.requestRefund(ref, reason);
      toast.success("تم إرسال طلب الاسترداد — بانتظار مراجعة الإدارة");
      qc.invalidateQueries({ queryKey: ["bookings"] });
    } catch (e) {
      toast.error(e?.response?.data?.message || "تعذّر إرسال الطلب");
    }
  };

  return (
    <div className="container mybk">
      <h1 className="mybk__title">حجوزاتي</h1>

      <div className="mybk__tabs">
        {TABS.map((t) => (
          <button key={t.key} className={`mybk__tab ${tab === t.key ? "is-on" : ""}`} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <Loader label="جارٍ تحميل الحجوزات..." />
      ) : bookings?.length ? (
        <div className="mybk__grid">
          <AnimatePresence>
            {bookings.map((b) => {
              const st = STATUS[b.status] || STATUS.pending;
              const d = b.event?.date_start ? dayjs(b.event.date_start) : null;
              return (
                <motion.article
                  key={b.id}
                  className="bkc"
                  layout
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                >
                  <div className="bkc__qr">
                    {b.qr_available && b.qr_code ? (
                      <img src={b.qr_code} alt="QR" />
                    ) : (
                      <div className="bkc__qr-wait"><span>🎫</span></div>
                    )}
                  </div>
                  <div className="bkc__body">
                    <div className="bkc__head">
                      <h3>{b.event?.title_ar}</h3>
                      <span className={`bkc__badge bkc__badge--${st.cls}`}>{st.label}</span>
                    </div>
                    {d && <p><FiCalendar /> {d.format("D MMMM YYYY")} — {d.format("HH:mm")}</p>}
                    {b.event?.venue_name && <p><FiMapPin /> {b.event.venue_name}</p>}
                    <p><FiTag /> {b.ticketCategory?.name} × {b.quantity}</p>
                    {b.delivery_label && <p className="bkc__deliv">🎫 {b.delivery_label}</p>}
                    <div className="bkc__seats">
                      {b.seats?.map((s) => <span key={s.seat_code}>{s.seat_code}</span>)}
                    </div>
                    <div className="bkc__foot">
                      <span className="bkc__ref">{b.booking_ref}</span>
                      <strong className="bkc__total">{formatPrice(b.total_amount)}</strong>
                    </div>
                    <div className="bkc__actions">
                      <Link to={`/booking/${b.booking_ref}`} className="bkc__view">عرض التذكرة</Link>
                      {b.refund_status === "pending" ? (
                        <span className="bkc__refund-state">طلب الاسترداد قيد المراجعة</span>
                      ) : b.refund_status === "rejected" ? (
                        <span className="bkc__refund-state bkc__refund-state--bad">طلب الاسترداد مرفوض</span>
                      ) : b.can_cancel && b.status !== "cancelled" ? (
                        <button className="bkc__cancel" onClick={() => requestRefund(b.booking_ref)}>
                          <FiX /> طلب استرداد
                        </button>
                      ) : null}
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </AnimatePresence>
        </div>
      ) : (
        <div className="mybk__empty">
          <p className="text-muted">لا توجد حجوزات هنا بعد.</p>
          <Link to="/events" className="btn btn-primary">تصفّح الفعاليات</Link>
        </div>
      )}
    </div>
  );
}
