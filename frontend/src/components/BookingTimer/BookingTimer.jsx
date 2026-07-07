import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { FiClock } from "react-icons/fi";
import { startSession, getSession, clearSession, secondsLeft } from "../../lib/bookingSession";
import "./BookingTimer.css";

// شريط عدّاد جلسة الحجز — 10 دقائق. عند الانتهاء يطرد المستخدم للرئيسية.
export default function BookingTimer({ eventId, onExpire }) {
  const navigate = useNavigate();
  const [left, setLeft] = useState(() => secondsLeft(startSession(eventId)));
  const firedRef = useRef(false);

  useEffect(() => {
    startSession(eventId); // تأكيد وجود الجلسة
    const tick = () => {
      const s = getSession(eventId);
      const l = secondsLeft(s);
      setLeft(l);
      if (l <= 0 && !firedRef.current) {
        firedRef.current = true;
        clearSession();
        onExpire?.();
        toast.error("انتهت مهلة الجلسة (10 دقائق) — ابدأ الحجز من جديد", { duration: 5000 });
        navigate("/", { replace: true });
      }
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [eventId, navigate, onExpire]);

  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");
  const danger = left <= 60;

  return (
    <div className={`bktimer ${danger ? "bktimer--danger" : ""}`}>
      <FiClock />
      <span>الوقت المتبقّي لإتمام الحجز: <b>{mm}:{ss}</b></span>
    </div>
  );
}
