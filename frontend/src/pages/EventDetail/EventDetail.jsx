import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import "dayjs/locale/ar";
import { FiMapPin, FiUsers, FiCalendar, FiClock, FiTag } from "react-icons/fi";
import { eventApi } from "../../services/eventApi";
import { mediaUrl } from "../../lib/api";
import Loader from "../../components/Loader/Loader";
import GuidelinesModal from "../../components/GuidelinesModal/GuidelinesModal";
import { formatPrice } from "../../utils/format";
import { useAuth } from "../../store/authStore";
import { showBanToast, isBanned } from "../../lib/ban";
import "./EventDetail.css";

dayjs.locale("ar");

const FALLBACK = "https://images.unsplash.com/photo-1459865264687-595d652de67e?auto=format&fit=crop&w=1000&q=75";

export default function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);
  const [showGuidelines, setShowGuidelines] = useState(false);
  const { data: event, isLoading, isError } = useQuery({
    queryKey: ["event", id],
    queryFn: () => eventApi.get(id),
  });

  // الانتقال لصفحة الحجز (اختيار الفئة → المقاعد)
  const proceedBooking = () => navigate(`/events/${id}/book`);

  const onBook = () => {
    // منع المحظور من الحجز — إشعار في كل ضغطة
    if (isBanned(user)) { showBanToast(user.ban); return; }
    // لو الأدمن مفعّل إرشادات + فيه بنود → اعرض الـ modal الأول
    if (event?.show_guidelines && event?.guidelines?.length) {
      setShowGuidelines(true);
    } else {
      proceedBooking();
    }
  };

  const acceptGuidelines = () => {
    setShowGuidelines(false);
    proceedBooking();
  };

  if (isLoading) return <Loader fullscreen label="جارٍ التحميل..." />;
  if (isError || !event)
    return (
      <div className="container ed__notfound">
        <h2>الفعالية غير موجودة</h2>
        <Link to="/events" className="btn btn-primary">عرض كل الفعاليات</Link>
      </div>
    );

  const d = event.date_start ? dayjs(event.date_start) : null;

  return (
    <div className="container ed">
      <div className="ed__poster" data-aos="fade-up">
        <img src={event.poster ? mediaUrl(event.poster) : FALLBACK} alt={event.title_ar} />
        {event.is_featured && <span className="ed__badge">مميّز ✦</span>}
      </div>

      <div className="ed__info" data-aos="fade-up" data-aos-delay="80">
        {event.category?.name_ar && (
          <span className="ed__cat">{event.category.icon} {event.category.name_ar}</span>
        )}
        <h1 className="ed__title">{event.title_ar}</h1>

        <ul className="ed__meta">
          {event.subtitle && <li><FiUsers /> {event.subtitle}</li>}
          {event.venue_name && <li><FiMapPin /> {event.venue_name}{event.city ? ` — ${event.city}` : ""}</li>}
          {d && <li><FiCalendar /> {d.format("dddd D MMMM YYYY")}</li>}
          {d && <li><FiClock /> {d.format("HH:mm")} {d.hour() < 12 ? "صباحًا" : "مساءً"}</li>}
          {event.price_from != null && <li><FiTag /> يبدأ من {formatPrice(event.price_from)}</li>}
        </ul>

        {event.description && <p className="ed__desc">{event.description}</p>}

        <button className="ed__book" onClick={onBook}>
          احجز الآن
        </button>
      </div>

      <GuidelinesModal
        open={showGuidelines}
        title={event.guidelines_title}
        items={event.guidelines || []}
        onAccept={acceptGuidelines}
        onClose={() => setShowGuidelines(false)}
      />
    </div>
  );
}
