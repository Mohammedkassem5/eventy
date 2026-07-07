import { Navigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import dayjs from "dayjs";
import "dayjs/locale/ar";
import { FiGift, FiCreditCard, FiArrowUpRight, FiArrowDownLeft } from "react-icons/fi";
import { useAuth } from "../../store/authStore";
import { configApi } from "../../services/configApi";
import { bookingApi } from "../../services/bookingApi";
import { formatPrice } from "../../utils/format";
import Loader from "../../components/Loader/Loader";
import "./Wallet.css";

dayjs.locale("ar");

export default function Wallet() {
  const { user, ready } = useAuth();
  const { data: config } = useQuery({ queryKey: ["config"], queryFn: configApi.get });
  const { data: bookings, isLoading } = useQuery({
    queryKey: ["bookings", ""],
    queryFn: () => bookingApi.list(),
    enabled: !!user,
  });

  if (ready && !user) return <Navigate to="/login?redirect=/wallet" replace />;
  if (!ready) return <Loader fullscreen label="جارٍ التحميل..." />;

  const ppe = config?.points_per_egp || 100;
  const points = user?.loyalty_points || 0;
  const value = points / ppe;

  // حركات النقاط من الحجوزات
  const moves = [];
  (bookings || []).forEach((b) => {
    if (b.points_earned > 0) moves.push({ id: `${b.id}-e`, dir: "in", pts: b.points_earned, label: `كسب من حجز ${b.event?.title_ar || ""}`, date: b.createdAt });
    if (b.points_used > 0) moves.push({ id: `${b.id}-u`, dir: "out", pts: b.points_used, label: `استخدام في حجز ${b.event?.title_ar || ""}`, date: b.createdAt });
  });
  moves.sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div className="container wallet">
      <h1 className="wallet__title">محفظتي</h1>

      <div className="wallet__cards">
        <motion.div className="wcard wcard--points" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
          <FiGift className="wcard__ic" />
          <span className="wcard__label">نقاط الولاء</span>
          <span className="wcard__big">{points.toLocaleString("ar-EG")}</span>
          <span className="wcard__sub">≈ {formatPrice(value)}</span>
        </motion.div>

        <motion.div className="wcard wcard--cash" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
          <FiCreditCard className="wcard__ic" />
          <span className="wcard__label">رصيد المحفظة</span>
          <span className="wcard__big">{formatPrice(user?.wallet_balance || 0)}</span>
          <span className="wcard__sub">يُستخدم في الحجز</span>
        </motion.div>
      </div>

      <div className="wallet__note">
        كل {ppe} نقطة = {formatPrice(1)} — استخدمها كخصم عند الحجز التالي.
      </div>

      <h2 className="wallet__sec">سجل النقاط</h2>
      {isLoading ? (
        <Loader label="جارٍ التحميل..." />
      ) : moves.length ? (
        <ul className="wmoves">
          {moves.map((m) => (
            <li key={m.id} className="wmove">
              <span className={`wmove__ic wmove__ic--${m.dir}`}>
                {m.dir === "in" ? <FiArrowDownLeft /> : <FiArrowUpRight />}
              </span>
              <div className="wmove__info">
                <span className="wmove__label">{m.label}</span>
                <span className="wmove__date text-muted">{dayjs(m.date).format("D MMMM YYYY")}</span>
              </div>
              <span className={`wmove__pts wmove__pts--${m.dir}`}>
                {m.dir === "in" ? "+" : "−"}{m.pts.toLocaleString("ar-EG")}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="wallet__empty">
          <p className="text-muted">لا توجد حركات بعد — احجز فعالية واكسب نقاطك الأولى.</p>
          <Link to="/events" className="btn btn-primary">تصفّح الفعاليات</Link>
        </div>
      )}
    </div>
  );
}
