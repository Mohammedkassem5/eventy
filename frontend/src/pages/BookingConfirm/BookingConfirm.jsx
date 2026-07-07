import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import dayjs from "dayjs";
import "dayjs/locale/ar";
import { FiCheck, FiDownload, FiMapPin, FiCalendar, FiTag } from "react-icons/fi";
import { bookingApi } from "../../services/bookingApi";
import { formatPrice } from "../../utils/format";
import Loader from "../../components/Loader/Loader";
import "./BookingConfirm.css";

dayjs.locale("ar");

export default function BookingConfirm() {
  const { ref } = useParams();
  const { data: b, isLoading, isError } = useQuery({
    queryKey: ["booking", ref],
    queryFn: () => bookingApi.get(ref),
    // لو الدفع قيد المراجعة → حدّث تلقائيًا حتى يؤكّده الأدمن
    refetchInterval: (q) => (q.state.data?.payment_pending ? 5000 : false),
  });

  if (isLoading) return <Loader fullscreen label="جارٍ التحميل..." />;
  if (isError || !b)
    return (
      <div className="container bc__nf">
        <h2>الحجز غير موجود</h2>
        <Link to="/my-tickets" className="btn btn-primary">تذاكري</Link>
      </div>
    );

  const d = b.event?.date_start ? dayjs(b.event.date_start) : null;

  return (
    <div className="container bc">
      <motion.div
        className="bc__check"
        initial={{ scale: 0, rotate: -45 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 220, damping: 14 }}
      >
        {b.payment_pending ? "⏳" : <FiCheck />}
      </motion.div>
      <motion.h1
        className="bc__title"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        {b.payment_pending ? "لم يكتمل الدفع بعد" : "تم تأكيد حجزك! 🎉"}
      </motion.h1>
      <p className="bc__ref text-muted">رقم الحجز: <b>{b.booking_ref}</b></p>

      {b.payment_pending && (
        <div className="bc__pending">
          عمليتك <b>قيد المراجعة</b> — لم نتأكّد من وصول الدفع بعد. بمجرد التأكيد سيصلك الكود على بريدك وتظهر التذكرة هنا تلقائيًا. لا تغلق الصفحة.
        </div>
      )}

      <motion.div
        className="bc__ticket"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <div className="bc__qr">
          {b.qr_available && b.qr_code ? (
            <>
              <img src={b.qr_code} alt="QR" />
              <a className="bc__dl" href={b.qr_code} download={`${b.booking_ref}.png`}>
                <FiDownload /> تحميل الكود
              </a>
            </>
          ) : (
            <div className="bc__qr-wait">
              <span className="bc__qr-ic">🎫</span>
              <p>{b.delivery_label || "ستصلك التذكرة قبل الفعالية"}</p>
            </div>
          )}
        </div>

        <div className="bc__details">
          <h2>{b.event?.title_ar}</h2>
          {d && <p><FiCalendar /> {d.format("dddd D MMMM YYYY")} — {d.format("HH:mm")}</p>}
          {b.event?.venue_name && <p><FiMapPin /> {b.event.venue_name}{b.event.city ? ` — ${b.event.city}` : ""}</p>}
          <p><FiTag /> {b.ticketCategory?.name} × {b.quantity}</p>
          <div className="bc__seats">
            {b.seats?.map((s) => <span key={s.seat_code} className="bc__seat">{s.seat_code}</span>)}
          </div>
          <div className="bc__total">الإجمالي: <strong>{formatPrice(b.total_amount)}</strong></div>
          {b.points_earned > 0 && <div className="bc__pts">🎁 كسبت {b.points_earned} نقطة</div>}
        </div>
      </motion.div>

      <div className="bc__actions">
        <Link to="/my-tickets" className="btn btn-primary">تذاكري</Link>
        <Link to="/events" className="btn btn-outline">تصفّح فعاليات أخرى</Link>
      </div>
    </div>
  );
}
