import { useState, useMemo } from "react";
import { useParams, useNavigate, useLocation, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import "dayjs/locale/ar";
import toast from "react-hot-toast";
import {
  FiMapPin, FiCalendar, FiTag, FiLock, FiCreditCard,
  FiSmartphone, FiDollarSign, FiChevronDown,
} from "react-icons/fi";
import { eventApi } from "../../services/eventApi";
import { ticketApi } from "../../services/ticketApi";
import { bookingApi, paymentApi } from "../../services/bookingApi";
import { configApi } from "../../services/configApi";
import { authApi } from "../../services/authApi";
import { mediaUrl, apiError } from "../../lib/api";
import { formatPrice } from "../../utils/format";
import { useAuth } from "../../store/authStore";
import { showBanToast, isBanned } from "../../lib/ban";
import { getSession, clearSession } from "../../lib/bookingSession";
import Loader from "../../components/Loader/Loader";
import BookingTimer from "../../components/BookingTimer/BookingTimer";
import "./Checkout.css";

dayjs.locale("ar");

const METHOD_ICONS = {
  card: <FiCreditCard />,
  vodafone_cash: <FiSmartphone />,
  cash: <FiDollarSign />,
};

export default function Checkout() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state } = useLocation();
  const { user, ready, setUser } = useAuth();

  // وسيلة الدفع (الثانوية لو المحفظة ماغطّتش الإجمالي)
  const [method, setMethod] = useState(null);
  const [redeem, setRedeem] = useState(false);
  const [busy, setBusy] = useState(false);

  // محفظة Eventy
  const [useWallet, setUseWallet] = useState(false);
  const [walletMode, setWalletMode] = useState("full"); // full | partial
  const [walletInput, setWalletInput] = useState("");

  // فودافون كاش
  const [vodafoneRef, setVodafoneRef] = useState("");

  const catId = state?.catId;
  const seatIds = state?.seatIds || [];

  const { data: event } = useQuery({ queryKey: ["event", id], queryFn: () => eventApi.get(id) });
  const { data: categories } = useQuery({ queryKey: ["ticketCategories", id], queryFn: () => ticketApi.categories(id) });
  // نمرر event_id عشان الـ backend يفلتر COD لو الفعالية مش سامحة
  const { data: methods, isLoading: mLoading } = useQuery({
    queryKey: ["paymentMethods", id],
    queryFn: () => paymentApi.methods(id),
  });
  const { data: config } = useQuery({ queryKey: ["config"], queryFn: configApi.get });

  if (ready && !user) return <Navigate to={`/login?redirect=/events/${id}`} replace />;
  if (!catId || !seatIds.length) return <Navigate to={`/events/${id}/book`} replace />;

  const category = categories?.find((c) => c.id === catId);
  const subtotal = (category?.price || 0) * seatIds.length;
  const d = event?.date_start ? dayjs(event.date_start) : null;

  // نقاط الولاء
  const ppe = config?.points_per_egp || 100;
  const userPoints = user?.loyalty_points || 0;
  const maxDiscount = Math.min(Math.floor(userPoints / ppe), subtotal);
  const canRedeem = maxDiscount > 0;
  const discount = redeem ? maxDiscount : 0;
  const pointsToUse = discount * ppe;
  const totalAfterPoints = subtotal - discount;
  const pointsEarned = (category?.points_reward || 0) * seatIds.length;

  // محفظة Eventy — حساب الخصم الفعلي
  const walletBalance = Number(user?.wallet_balance) || 0;
  const maxWallet = Math.min(walletBalance, totalAfterPoints);
  const walletDeduction = useMemo(() => {
    if (!useWallet || walletBalance <= 0) return 0;
    if (walletMode === "full") return maxWallet;
    const parsed = Number(walletInput) || 0;
    return Math.max(0, Math.min(parsed, maxWallet));
  }, [useWallet, walletMode, walletInput, walletBalance, maxWallet]);

  const remaining = totalAfterPoints - walletDeduction;
  const total = remaining; // المبلغ المتبقي اللي هيدفعه بالوسيلة الثانوية

  // فلترة — «محفظة Eventy» لا تظهر كوسيلة عادية (عندها قسم خاص)
  const visibleMethods = methods?.filter((m) => m.key !== "wallet") || [];

  // هل لازم يختار وسيلة دفع ثانوية؟
  const needsSecondary = remaining > 0;

  const pay = async () => {
    if (isBanned(user)) return showBanToast(user.ban);
    if (needsSecondary && !method) return toast.error("اختر وسيلة الدفع للمبلغ المتبقي");
    if (method === "vodafone_cash" && !vodafoneRef.trim())
      return toast.error("أدخل رقم عملية فودافون كاش");
    setBusy(true);
    try {
      // دفع بالكارت عبر Paymob → صفحة دفع مضمّنة + استعلام مباشر (مستقل عن redirect)
      if (method === "card" && remaining > 0) {
        const { iframe_url, booking_ref } = await paymentApi.paymobInit({
          event_id: Number(id),
          ticket_category_id: catId,
          seat_ids: seatIds,
          points_to_use: pointsToUse,
          wallet_amount: walletDeduction,
          session_id: getSession(id)?.sessionId,
        });
        sessionStorage.setItem("eventy_pay_ref", booking_ref); // للرجوع بعد الدفع
        window.location.href = iframe_url; // توجيه كامل لصفحة Paymob
        return;
      }

      const booking = await bookingApi.create({
        event_id: Number(id),
        ticket_category_id: catId,
        seat_ids: seatIds,
        payment_method: needsSecondary ? method : null,
        points_to_use: pointsToUse,
        wallet_amount: walletDeduction,
        vodafone_ref: method === "vodafone_cash" ? vodafoneRef.trim() : undefined,
        session_id: getSession(id)?.sessionId,
      });

      const isPending = ["cash", "vodafone_cash"].includes(method) && remaining > 0;
      toast.success(isPending ? "تم تسجيل الحجز — في انتظار تأكيد الدفع" : "تم الدفع وتأكيد الحجز");
      clearSession();
      authApi.me().then((d) => setUser(d.user)).catch(() => {});
      navigate(`/booking/${booking.booking_ref}`, { replace: true });
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container checkout">
      <h1 className="checkout__title">إتمام الحجز</h1>
      <BookingTimer eventId={id} />

      <div className="checkout__grid">
        {/* ملخص الطلب */}
        <section className="ck-card" data-aos="fade-up">
          <h2 className="ck-card__title">ملخص الطلب</h2>
          <div className="ck-order">
            <img
              className="ck-order__img"
              src={event?.poster ? mediaUrl(event.poster) : "https://images.unsplash.com/photo-1459865264687-595d652de67e?auto=format&fit=crop&w=400&q=60"}
              alt={event?.title_ar}
            />
            <div className="ck-order__info">
              <h3>{event?.title_ar}</h3>
              {d && <p><FiCalendar /> {d.format("dddd D MMMM YYYY")} — {d.format("HH:mm")}</p>}
              {event?.venue_name && <p><FiMapPin /> {event.venue_name}{event.city ? ` — ${event.city}` : ""}</p>}
              <p><FiTag /> {category?.name} × {seatIds.length}</p>
            </div>
          </div>

          {state?.seatCodes && (
            <div className="ck-seats">
              <span>المقاعد:</span>
              {state.seatCodes.split("، ").map((c) => <span key={c} className="ck-seat">{c}</span>)}
            </div>
          )}

          {/* نقاط الولاء */}
          {pointsEarned > 0 && (
            <div className="ck-points">
              🎁 ستكسب <b>+{pointsEarned}</b> نقطة (≈ {formatPrice(pointsEarned / ppe)}) عند إتمام الحجز
            </div>
          )}
          {canRedeem && (
            <label className="ck-redeem">
              <input type="checkbox" checked={redeem} onChange={(e) => setRedeem(e.target.checked)} />
              <span>استخدم نقاطي ({userPoints} نقطة) — خصم {formatPrice(maxDiscount)}</span>
            </label>
          )}

          <div className="ck-totals">
            <div className="ck-row"><span>سعر التذكرة</span><span>{formatPrice(category?.price || 0)}</span></div>
            <div className="ck-row"><span>الكمية</span><span>{seatIds.length}</span></div>
            {discount > 0 && (
              <div className="ck-row ck-row--disc"><span>خصم النقاط</span><span>− {formatPrice(discount)}</span></div>
            )}
            {walletDeduction > 0 && (
              <div className="ck-row ck-row--wallet"><span>خصم المحفظة</span><span>− {formatPrice(walletDeduction)}</span></div>
            )}
            <div className="ck-row ck-row--total">
              <span>{remaining > 0 ? "المتبقي للدفع" : "الإجمالي"}</span>
              <strong>{formatPrice(remaining)}</strong>
            </div>
          </div>
        </section>

        {/* الدفع */}
        <section className="ck-card" data-aos="fade-up" data-aos-delay="80">

          {/* ===== محفظة Eventy ===== */}
          {walletBalance > 0 && (
            <div className="ck-wallet">
              <div className="ck-wallet__header">
                <div className="ck-wallet__info">
                  <span className="ck-wallet__icon">👛</span>
                  <div>
                    <span className="ck-wallet__label">محفظة Eventy</span>
                    <span className="ck-wallet__balance">الرصيد: {formatPrice(walletBalance)}</span>
                  </div>
                </div>
                <label className="ck-switch">
                  <input
                    type="checkbox"
                    checked={useWallet}
                    onChange={(e) => {
                      setUseWallet(e.target.checked);
                      if (!e.target.checked) { setWalletMode("full"); setWalletInput(""); }
                    }}
                  />
                  <span className="ck-switch__track" />
                </label>
              </div>

              {useWallet && (
                <div className="ck-wallet__body">
                  <label className="ck-wallet__opt">
                    <input
                      type="radio" name="walletMode" value="full"
                      checked={walletMode === "full"}
                      onChange={() => { setWalletMode("full"); setWalletInput(""); }}
                    />
                    <span>
                      {maxWallet >= totalAfterPoints
                        ? `ادفع الإجمالي بالكامل (${formatPrice(totalAfterPoints)})`
                        : `ادفع أقصى مبلغ (${formatPrice(maxWallet)})`}
                    </span>
                  </label>
                  <label className="ck-wallet__opt">
                    <input
                      type="radio" name="walletMode" value="partial"
                      checked={walletMode === "partial"}
                      onChange={() => setWalletMode("partial")}
                    />
                    <span>ادفع مبلغ محدد</span>
                  </label>
                  {walletMode === "partial" && (
                    <div className="ck-wallet__input-wrap">
                      <input
                        type="number"
                        className="ck-wallet__input"
                        placeholder={`الحد الأقصى: ${maxWallet}`}
                        min="1"
                        max={maxWallet}
                        value={walletInput}
                        onChange={(e) => setWalletInput(e.target.value)}
                      />
                      <span className="ck-wallet__currency">ج.م</span>
                    </div>
                  )}
                  {walletDeduction > 0 && remaining > 0 && (
                    <p className="ck-wallet__note">
                      سيتم خصم <strong>{formatPrice(walletDeduction)}</strong> من المحفظة
                      — المتبقي <strong>{formatPrice(remaining)}</strong> يُدفع بالوسيلة أدناه
                    </p>
                  )}
                  {walletDeduction > 0 && remaining === 0 && (
                    <p className="ck-wallet__note ck-wallet__note--full">
                      ✅ المحفظة تغطي الإجمالي بالكامل — لا حاجة لوسيلة دفع أخرى
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ===== وسائل الدفع ===== */}
          {needsSecondary && (
            <>
              <h2 className="ck-card__title">
                {walletDeduction > 0 ? "وسيلة الدفع للمتبقي" : "وسيلة الدفع"}
              </h2>
              {mLoading ? (
                <Loader label="جارٍ تحميل وسائل الدفع..." />
              ) : (
                <div className="ck-methods">
                  {visibleMethods.map((m) => {
                    return (
                      <button
                        key={m.id}
                        className={`ck-method ${method === m.key ? "ck-method--on" : ""}`}
                        onClick={() => setMethod(m.key)}
                      >
                        <span className="ck-method__icon">{METHOD_ICONS[m.key] || m.icon}</span>
                        <span className="ck-method__name">{m.name_ar}</span>
                        <span className="ck-method__radio" />
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* ===== تعليمات فودافون كاش ===== */}
          {method === "vodafone_cash" && (
            <div className="ck-vodafone">
              <div className="ck-vodafone__header">
                <FiSmartphone />
                <span>تعليمات الدفع — فودافون كاش</span>
              </div>
              <div className="ck-vodafone__body">
                {config?.vodafone_cash_number && (
                  <div className="ck-vodafone__field">
                    <span className="ck-vodafone__label">حوّل على الرقم</span>
                    <span className="ck-vodafone__value ck-vodafone__phone">{config.vodafone_cash_number}</span>
                  </div>
                )}
                {config?.vodafone_cash_name && (
                  <div className="ck-vodafone__field">
                    <span className="ck-vodafone__label">باسم</span>
                    <span className="ck-vodafone__value">{config.vodafone_cash_name}</span>
                  </div>
                )}
                <div className="ck-vodafone__field">
                  <span className="ck-vodafone__label">المبلغ المطلوب</span>
                  <span className="ck-vodafone__value ck-vodafone__amount">{formatPrice(remaining)}</span>
                </div>

                {config?.vodafone_cash_instructions && (
                  <div className="ck-vodafone__steps">
                    <span className="ck-vodafone__steps-title">
                      <FiChevronDown /> خطوات التحويل
                    </span>
                    {config.vodafone_cash_instructions.split("\n").map((step, i) => (
                      <p key={i} className="ck-vodafone__step">{step}</p>
                    ))}
                  </div>
                )}

                <div className="ck-vodafone__ref">
                  <label className="ck-vodafone__ref-label">رقم العملية / المرجع</label>
                  <input
                    type="text"
                    className="ck-vodafone__ref-input"
                    placeholder="أدخل رقم العملية بعد التحويل"
                    value={vodafoneRef}
                    onChange={(e) => setVodafoneRef(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ===== تنبيه الدفع عند الاستلام ===== */}
          {method === "cash" && (
            <div className="ck-cod-notice">
              <span className="ck-cod-notice__icon">💵</span>
              <p>سيتم تأكيد حجزك فور استلامك للتذكرة والدفع نقدًا في الموقع. يرجى الحضور في الموعد المحدد.</p>
            </div>
          )}

          <button className="ck-pay" disabled={busy} onClick={pay}>
            <FiLock />
            {busy
              ? "جارٍ الدفع..."
              : remaining === 0 && walletDeduction > 0
                ? `ادفع من المحفظة ${formatPrice(totalAfterPoints)}`
                : `ادفع ${formatPrice(remaining)}`}
          </button>
          <p className="ck-secure text-muted"><FiLock /> دفع آمن ومشفّر</p>
        </section>
      </div>
    </div>
  );
}
