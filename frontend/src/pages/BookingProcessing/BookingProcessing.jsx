import { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { FiCheckCircle, FiXCircle, FiLoader } from "react-icons/fi";
import { bookingApi, paymentApi } from "../../services/bookingApi";
import { authApi } from "../../services/authApi";
import { useAuth } from "../../store/authStore";
import { clearSession } from "../../lib/bookingSession";
import "./BookingProcessing.css";

export default function BookingProcessing() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const setUser = useAuth((s) => s.setUser);
  const ref = params.get("merchant_order_id") || params.get("ref");
  const [state, setState] = useState("checking"); // checking | success | failed
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    let alive = true;
    (async () => {
      // كل معاملات رجوع Paymob (تحتوي hmac + نتيجة العملية)
      const q = Object.fromEntries(params.entries());
      try {
        if (q.hmac) {
          const r = await paymentApi.paymobVerify(q); // تحقّق بالـ HMAC وتسوية الحجز
          if (!alive) return;
          if (r.status === "confirmed") {
            clearSession();
            authApi.me().then((d) => setUser(d.user)).catch(() => {});
            setState("success");
            return;
          }
          setState("failed");
          return;
        }
      } catch { /* نكمّل بالـ polling */ }

      // fallback: تابع حالة الحجز
      let tries = 0;
      const poll = async () => {
        try {
          const b = await bookingApi.get(ref);
          if (!alive) return;
          if (b.status === "confirmed") {
            clearSession();
            authApi.me().then((d) => setUser(d.user)).catch(() => {});
            setState("success");
            return;
          }
          if (b.status === "cancelled") { setState("failed"); return; }
        } catch { /* لسه */ }
        if (++tries < 15 && alive) setTimeout(poll, 2000);
        else if (alive) setState("failed");
      };
      if (ref) poll(); else setState("failed");
    })();
    return () => { alive = false; };
  }, [ref, params, setUser]);

  useEffect(() => {
    if (state !== "success") return;
    const iv = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(iv);
          navigate(`/booking/${ref}`, { replace: true });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [state, ref, navigate]);

  return (
    <div className="container bkproc">
      {state === "checking" && (
        <div className="bkproc__box">
          <FiLoader className="bkproc__spin" />
          <h2>...جارٍ تأكيد الدفع</h2>
          <p className="text-muted">لحظات من فضلك، لا تغلق الصفحة.</p>
        </div>
      )}
      {state === "success" && (
        <div className="bkproc__box bkproc__box--ok">
          <FiCheckCircle />
          <h2>تم الدفع بنجاح 🎉</h2>
          <p className="text-muted">سيتم تحويلك إلى صفحة تأكيد الحجز خلال {countdown} ثوانٍ...</p>
        </div>
      )}
      {state === "failed" && (
        <div className="bkproc__box bkproc__box--fail">
          <FiXCircle />
          <h2>لم يكتمل الدفع</h2>
          <p className="text-muted">لم نستلم تأكيد الدفع. لم يتم خصم أي مبلغ عادةً.</p>
          <Link to="/" className="btn btn-primary">العودة للرئيسية</Link>
        </div>
      )}
    </div>
  );
}
