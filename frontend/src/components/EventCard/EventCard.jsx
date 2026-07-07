import { Link } from "react-router-dom";
import dayjs from "dayjs";
import "dayjs/locale/ar";
import {
  FiMapPin,
  FiUsers,
  FiCalendar,
  FiClock,
  FiArrowLeft,
} from "react-icons/fi";
import { mediaUrl } from "../../lib/api";
import "./EventCard.css";

dayjs.locale("ar");

const FALLBACK = "https://images.unsplash.com/photo-1459865264687-595d652de67e?auto=format&fit=crop&w=900&q=70";

export default function EventCard({ event, aos = "fade-up" }) {
  const d = event.date_start ? dayjs(event.date_start) : null;
  const dateStr = d ? d.format("dddd D MMMM YYYY") : "";
  const timeStr = d ? `${d.format("HH:mm")} ${d.hour() < 12 ? "صباحًا" : "مساءً"}` : "";

  return (
    <article className="ev-card" data-aos={aos}>
      <div className="ev-card__poster">
        <img src={event.poster ? mediaUrl(event.poster) : FALLBACK} alt={event.title_ar} loading="lazy" />
        {event.is_featured && <span className="ev-card__badge">مميّز ✦</span>}
        {event.category?.name_ar && (
          <span className="ev-card__cat">{event.category.icon} {event.category.name_ar}</span>
        )}
        <div className="ev-card__shade" />
      </div>

      <div className="ev-card__body">
        <h3 className="ev-card__title">{event.title_ar}</h3>

        <div className="ev-card__meta-row">
          {event.subtitle && (
            <span className="ev-card__meta"><FiUsers /> {event.subtitle}</span>
          )}
          {event.venue_name && (
            <span className="ev-card__meta"><FiMapPin /> {event.venue_name}</span>
          )}
        </div>

        {d && (
          <div className="ev-card__meta-row">
            <span className="ev-card__meta"><FiCalendar /> {dateStr}</span>
            <span className="ev-card__meta"><FiClock /> {timeStr}</span>
          </div>
        )}

        {event.description && <p className="ev-card__desc">{event.description}</p>}

        <Link to={`/events/${event.id}`} className="ev-card__btn">
          <span>احجز الآن</span>
          <FiArrowLeft />
        </Link>
      </div>
    </article>
  );
}
