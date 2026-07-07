import { useEffect, useState, useRef } from "react";
import { useParams, useLocation, useNavigate, Navigate } from "react-router-dom";
import toast from "react-hot-toast";
import { paymentApi } from "../../services/bookingApi";
import { authApi } from "../../services/authApi";
import { useAuth } from "../../store/authStore";
import { clearSession } from "../../lib/bookingSession";
import "./Payment.css";

export default function Payment() {
  const { id } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const setUser = useAuth((s) => s.setUser);
  const ref = state?.booking_ref;
  const url = state?.iframe_url;
  const [done, setDone] = useState(false);
  const doneRef = useRef(false);

  useEffect(() => {
    if (!ref) return;
    let alive = true;
    const poll = async () => {
      try {
        const r = await paymentApi.paymobStatus(ref);
        if (!alive || doneRef.current) return;
        if (r.status === "confirmed") {
          doneRef.current = true; setDone(true);
          clearSession();
          authApi.me().then((d) => setUser(d.user)).catch(() => {});
          toast.success("تم الدفع بنجاح 🎉");
          setTimeout(() => navigate(`/booking/${ref}`, { replace: true }), 1000);
          return;
        }
        if (r.status === "cancelled") { toast.error("لم يكتمل الدفع"); }
      } catch { /* تجاهل */ }
    };
    const iv = setInterval(poll, 4000);
    poll();
    return () => { alive = false; clearInterval(iv); };
  }, [ref, navigate, setUser]);

  if (!url || !ref) return <Navigate to={`/events/${id}/book`} replace />;

  return (
    <div className="pay">
      <div className="pay__bar">
        <button className="pay__back" onClick={() => navigate(`/events/${id}/checkout`)}>← إلغاء والعودة</button>
        <span className="pay__hint">أكمل الدفع في النافذة بالأسفل — لا تغلق الصفحة</span>
      </div>
      {done ? (
        <div className="pay__done">✅ تم الدفع — يتم تحويلك لتذكرتك...</div>
      ) : (
        <iframe className="pay__frame" title="Paymob" src={url} allow="payment" />
      )}
    </div>
  );
}
