import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import "dayjs/locale/ar";
import { FiMinus, FiPlus, FiArrowLeft, FiInfo } from "react-icons/fi";
import toast from "react-hot-toast";
import { useAuth } from "../../store/authStore";
import { eventApi } from "../../services/eventApi";
import { ticketApi } from "../../services/ticketApi";
import { formatPrice } from "../../utils/format";
import StadiumMap from "../../components/StadiumMap/StadiumMap";
import VenueImageMap from "../../components/VenueImageMap/VenueImageMap";
import Loader from "../../components/Loader/Loader";
import BookingTimer from "../../components/BookingTimer/BookingTimer";
import "./Booking.css";

dayjs.locale("ar");
const MAX_QTY = 8;

export default function Booking() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, ready } = useAuth();
  const [catId, setCatId] = useState(null);
  const [qty, setQty] = useState(1);
  const [adjacent, setAdjacent] = useState(false);

  useEffect(() => {
    if (ready && !user) {
      toast.error("يجب تسجيل الدخول أولاً للمتابعة");
      navigate(`/login?redirect=/events/${id}/book`);
    }
  }, [user, ready, id, navigate]);

  const { data: event } = useQuery({ queryKey: ["event", id], queryFn: () => eventApi.get(id) });
  const { data: categories, isLoading } = useQuery({
    queryKey: ["ticketCategories", id],
    queryFn: () => ticketApi.categories(id),
    staleTime: 0,
    refetchOnMount: "always",
  });

  const selected = categories?.find((c) => c.id === catId);
  const maxQty = Math.min(MAX_QTY, selected?.available_seats || MAX_QTY);
  const d = event?.date_start ? dayjs(event.date_start) : null;

  const goSeats = () => {
    if (!user) {
      toast.error("يجب تسجيل الدخول أولاً للمتابعة");
      navigate(`/login?redirect=/events/${id}/book`);
      return;
    }
    navigate(`/events/${id}/seats?category=${catId}&qty=${qty}&adjacent=${adjacent ? 1 : 0}`);
  };

  return (
    <div className="container book">
      <button className="book__back" onClick={() => navigate(`/events/${id}`)}>
        رجوع <FiArrowLeft />
      </button>

      {user && <BookingTimer eventId={id} />}

      {isLoading || !ready ? (
        <Loader fullscreen label="جارٍ تحميل المخطط..." />
      ) : (
        <div className="book__grid">
          {/* المخطط — صورة المكان إن وُجدت، وإلا المجسّم الافتراضي */}
          <div className="book__map">
            {event?.seatmap_image ? (
              <VenueImageMap image={event.seatmap_image} categories={categories || []} activeCat={catId} onSelect={setCatId} />
            ) : (
              <StadiumMap categories={categories || []} activeCat={catId} onSelect={setCatId} />
            )}
          </div>

          {/* اللوحة */}
          <aside className="book__panel">
            <div className="book__ev">
              <h1 className="book__title"><FiInfo /> {event?.title_ar}</h1>
              {d && <p className="book__date text-muted">{d.format("dddd D MMMM YYYY")} — {d.format("HH:mm")}</p>}
            </div>

            <div className="book__opts">
              <label className="book__toggle">
                <span>مقاعد متجاورة؟</span>
                <input type="checkbox" checked={adjacent} onChange={(e) => setAdjacent(e.target.checked)} />
                <span className="switch" />
              </label>
              <div className="book__qty">
                <span>الكمية</span>
                <div className="stepper">
                  <button onClick={() => setQty((q) => Math.max(1, q - 1))}><FiMinus /></button>
                  <span>{qty}</span>
                  <button onClick={() => setQty((q) => Math.min(maxQty, q + 1))}><FiPlus /></button>
                </div>
              </div>
            </div>

            <div className="book__list">
              {categories?.map((c) => {
                const out = c.available_seats <= 0;
                return (
                  <button
                    key={c.id}
                    className={`bcat ${catId === c.id ? "bcat--on" : ""} ${out ? "bcat--out" : ""}`}
                    style={{ "--c": c.color_hex || "#f75200" }}
                    onClick={() => { if (!out) { setCatId(c.id); setQty(1); } }}
                    disabled={out}
                  >
                    <span className="bcat__bar" />
                    <div className="bcat__main">
                      <span className="bcat__name">{c.name}</span>
                      <span className="bcat__avail text-muted">
                        {out ? "نفدت التذاكر" : c.available_seats === 1 ? "مقعد واحد متبقٍ" : `${c.available_seats} مقعد متاح`}
                      </span>
                      {c.points_reward > 0 && (
                        <span className="bcat__points" style={{
                          fontSize: "12px",
                          color: catId === c.id ? "#fff" : "var(--color-primary)",
                          fontWeight: "bold",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          marginTop: "4px",
                          transition: "color 0.2s"
                        }}>
                          🎁 +{c.points_reward} نقطة للمقعد
                        </span>
                      )}
                    </div>
                    <span className="bcat__price">{formatPrice(c.price)}</span>
                  </button>
                );
              })}
            </div>

            <button className="book__next" disabled={!selected} onClick={goSeats}>
              {selected ? `اختيار المقاعد — ${formatPrice((selected.price || 0) * qty)}` : "اختر فئة أولاً"}
            </button>
          </aside>
        </div>
      )}
    </div>
  );
}
