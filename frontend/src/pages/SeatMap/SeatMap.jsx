import { useMemo, useState, Fragment, useCallback, useEffect, useRef } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  FiMinus,
  FiPlus,
  FiX,
  FiChevronLeft,
  FiChevronRight,
  FiMaximize2,
  FiMapPin,
} from "react-icons/fi";
import { useAuth } from "../../store/authStore";
import { ticketApi } from "../../services/ticketApi";
import { seatApi } from "../../services/seatApi";
import { formatPrice } from "../../utils/format";
import Loader from "../../components/Loader/Loader";
import StadiumMap from "../../components/StadiumMap/StadiumMap";
import VenueImageMap from "../../components/VenueImageMap/VenueImageMap";
import ShapedSeats from "../../components/ShapedSeats/ShapedSeats";
import { layoutSeats } from "../../lib/seatLayout";
import BookingTimer from "../../components/BookingTimer/BookingTimer";
import { eventApi } from "../../services/eventApi";
import { getSocket } from "../../lib/socket";
import { startSession, getSelectedSeats, saveSelectedSeats } from "../../lib/bookingSession";
import "./SeatMap.css";

const MAX_QTY = 8;
const AISLE = 4; // ممر بعد كل 4 مقاعد

/* ═══════════════════════════════════════════════════
   تقسيم المقاعد إلى أقسام (sections)
   ═══════════════════════════════════════════════════ */
function computeSections(seats) {
  if (!seats?.length) return [];
  // قسم واحد يضم كل المقاعد — تُعرض دفعة واحدة
  const rowLabels = [...new Set(seats.map((s) => s.row_label))];
  const all = [...seats].sort((a, b) => a.y - b.y || a.seat_number - b.seat_number);
  return [{
    id: 1,
    name: "كل المقاعد",
    rows: rowLabels,
    seats: all,
    seatCount: all.length,
    availableCount: all.filter((s) => s.status === "available").length,
  }];
}

/* ─── بناء صفوف القسم للعرض ─── */
function buildRows(sectionSeats) {
  const map = new Map();
  for (const s of sectionSeats) {
    if (!map.has(s.row_label)) map.set(s.row_label, []);
    map.get(s.row_label).push(s);
  }
  return [...map.entries()]
    .sort((a, b) => a[1][0].y - b[1][0].y)
    .map(([label, list]) => [
      label,
      list.sort((x, y) => x.seat_number - y.seat_number),
    ]);
}

/* ═══════════════════════════════════════════════════
   SeatMap Component
   ═══════════════════════════════════════════════════ */
export default function SeatMap() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const catId = Number(params.get("category"));

  const { user, ready } = useAuth();

  const [qty, setQty] = useState(
    Math.max(1, Number(params.get("qty")) || 1)
  );
  const [adjacent, setAdjacent] = useState(params.get("adjacent") === "1");
  const [selected, setSelected] = useState(() => getSelectedSeats(id)); // seat ids
  const [activeSection, setActiveSection] = useState(null); // null = overview
  const qc = useQueryClient();
  const sessionId = startSession(id).sessionId; // جلسة الحجز
  const selectedRef = useRef([]);
  selectedRef.current = selected;
  const keepHolds = useRef(false); // لا تحرّر عند الانتقال للدفع

  useEffect(() => {
    if (ready && !user) {
      toast.error("يجب تسجيل الدخول أولاً للمتابعة");
      navigate(`/login?redirect=/events/${id}/seats?category=${catId}&qty=${qty}&adjacent=${adjacent ? 1 : 0}`);
    }
  }, [user, ready, id, catId, qty, adjacent, navigate]);

  /* ─── Quantity stepper ─── */
  const changeQty = (next) => {
    const q = Math.max(1, Math.min(MAX_QTY, next));
    setQty(q);
    setSelected((prev) => prev.slice(0, q));
  };

  /* ─── Data fetching ─── */
  const { data: categories } = useQuery({
    queryKey: ["ticketCategories", id],
    queryFn: () => ticketApi.categories(id),
  });
  const { data: ev } = useQuery({ queryKey: ["event", id], queryFn: () => eventApi.get(id) });
  const { data: seats, isLoading } = useQuery({
    queryKey: ["seats", id, catId, sessionId],
    queryFn: () => ticketApi.seats(id, catId, sessionId),
    staleTime: 0, // المقاعد لازم تكون لحظية — تمنع عرض مقعد محجوز كأنه متاح
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  // حفظ المقاعد المختارة عند كل تغيير
  useEffect(() => {
    saveSelectedSeats(id, selected);
  }, [selected, id]);

  // تنظيف المقاعد التي لم تعد متاحة أو منتهية الصلاحية
  useEffect(() => {
    if (seats?.length && selected.length) {
      const availableIds = new Set(seats.filter((s) => s.status === "available").map((s) => s.id));
      const valid = selected.filter((sid) => availableIds.has(sid));
      if (valid.length !== selected.length) {
        setSelected(valid);
      }
    }
  }, [seats]);

  // مشاهدة حيّة: أي حجز/تحرير من مستخدم آخر → أعد جلب المقاعد
  useEffect(() => {
    const socket = getSocket();
    socket.connect();
    socket.emit("seat:watch", { eventId: Number(id) });
    const onUpdate = (p) => { if (Number(p.eventId) === Number(id)) qc.invalidateQueries({ queryKey: ["seats", id] }); };
    socket.on("seat:update", onUpdate);
    return () => {
      socket.emit("seat:unwatch", { eventId: Number(id) });
      socket.off("seat:update", onUpdate);
      // حرّر المقاعد عند مغادرة الصفحة إلا لو رايح للدفع (نبقيها محجوزة)
      if (!keepHolds.current && selectedRef.current.length)
        seatApi.release(Number(id), sessionId, selectedRef.current).catch(() => {});
    };
  }, [id, sessionId, qc]);

  const category = categories?.find((c) => c.id === catId);

  /* ─── قسم واحد يضم كل المقاعد (بلا تقسيم) ─── */
  const sections = useMemo(() => computeSections(seats), [seats]);
  const currentSection = sections[0] || null;
  const sectionRows = useMemo(
    () => (currentSection ? buildRows(currentSection.seats) : []),
    [currentSection]
  );
  const maxSeatNum = useMemo(() => {
    if (!sectionRows.length) return 0;
    return Math.max(...sectionRows.map(([, l]) => l.length));
  }, [sectionRows]);

  // شكل الفئة الذي رسمه الأدمن (مضلّع) — تُشكّل المقاعد حسبه
  const shapePolygon = useMemo(() => {
    const z = category?.zone;
    const list = Array.isArray(z) ? z : z ? [z] : [];
    return list.find((it) => it?.points)?.points || null;
  }, [category]);

  // مواضع المقاعد المختارة على صورة المكان (لإضاءة موقعها في الرسم فوق)
  const seatMarkers = useMemo(() => {
    if (!shapePolygon || !currentSection) return [];
    const placed = layoutSeats(currentSection.seats, shapePolygon);
    const sel = new Set(selected);
    return placed.filter((p) => sel.has(p.seat.id)).map((p) => ({ x: p.x, y: p.y, n: p.seat.seat_number }));
  }, [shapePolygon, currentSection, selected]);

  /* ─── Seat click handler ─── */
  const clickSeat = useCallback(
    async (seat) => {
      if (seat.status !== "available") {
        if (seat.status === "held") toast("هذا المقعد محجوز مؤقتًا لعميل آخر", { icon: "⏳" });
        return;
      }

      if (adjacent) {
        const rowSeats = (seats || [])
          .filter((s) => s.row_label === seat.row_label)
          .sort((a, b) => a.seat_number - b.seat_number);
        const start = rowSeats.findIndex((s) => s.id === seat.id);
        const block = rowSeats.slice(start, start + qty);
        if (block.length < qty || block.some((s) => s.status !== "available")) {
          toast.error(`لا توجد ${qty} مقاعد متجاورة متاحة من هنا`);
          return;
        }
        // حرّر السابق واحجز البلوك الجديد
        if (selected.length) await seatApi.release(Number(id), sessionId, selected).catch(() => {});
        const blockIds = block.map((s) => s.id);
        const r = await seatApi.hold(Number(id), sessionId, blockIds).catch(() => null);
        if (!r || r.failed.length) {
          toast.error("تعذّر حجز المقاعد المتجاورة — حُجزت للتو");
          qc.invalidateQueries({ queryKey: ["seats", id] });
          return;
        }
        setSelected(blockIds);
        return;
      }

      // إلغاء اختيار → حرّر
      if (selected.includes(seat.id)) {
        setSelected((prev) => prev.filter((x) => x !== seat.id));
        seatApi.release(Number(id), sessionId, [seat.id]).catch(() => {});
        return;
      }
      if (selected.length >= qty) {
        toast(`اخترت ${qty} مقعد بالفعل`, { icon: "ℹ️" });
        return;
      }
      // احجز فورًا (soft-lock)
      const r = await seatApi.hold(Number(id), sessionId, [seat.id]).catch(() => null);
      if (!r || r.failed.length) {
        toast.error("سبقك عميل آخر لهذا المقعد");
        qc.invalidateQueries({ queryKey: ["seats", id] });
        return;
      }
      setSelected((prev) => [...prev, seat.id]);
    },
    [adjacent, qty, seats, selected, id, sessionId, qc]
  );

  /* ─── Derived state ─── */
  const total = (category?.price || 0) * selected.length;
  const done = selected.length === qty;
  const selectedSeats =
    seats?.filter((s) => selected.includes(s.id)) || [];

  /* ─── Confirm booking → checkout ─── */
  const confirm = () => {
    keepHolds.current = true; // احتفظ بالحجز المؤقت حتى الدفع
    const codes = selectedSeats.map((s) => s.seat_code).join("، ");
    navigate(`/events/${id}/checkout`, {
      state: { catId, seatIds: selected, seatCodes: codes },
    });
  };

  /* ─── Loading ─── */
  if (isLoading || !ready) return <Loader fullscreen label="جارٍ تحميل المقاعد..." />;

  return (
    <div className="container seatmap">
      <BookingTimer eventId={id} />
      {/* ── Header ── */}
      <div className="seatmap__head">
        <button
          className="seatmap__back"
          onClick={() => navigate(`/events/${id}/book`)}
        >
          ← رجوع
        </button>
        <h1 className="seatmap__title">
          اختر مقاعدك {category ? `— ${category.name}` : ""}
        </h1>
      </div>

      {/* ── تفاصيل اختيارك (أعلى) ── */}
      <div className="seatmap__top">
        {selected.length ? (
          <div className="seatmap__picked">
            <span className="seatmap__picked-label">مقاعدك ({selected.length}/{qty}):</span>
            {selectedSeats
              .sort((a, b) => a.y - b.y || a.seat_number - b.seat_number)
              .map((s) => (
                <button key={s.id} className="seatchip" onClick={() => setSelected((prev) => prev.filter((x) => x !== s.id))}>
                  صف {s.row_label} · مقعد {s.seat_number}
                  <FiX />
                </button>
              ))}
          </div>
        ) : (
          <p className="seatmap__hint-top">اختر {qty} مقعد من المخطط بالأسفل</p>
        )}
      </div>

      {/* ═══════════════════════════════════════════════
          قاعة المقاعد — كل المقاعد دفعة واحدة + موقع الفئة
         ═══════════════════════════════════════════════ */}
      {currentSection && (
        <div className="seatmap__phase phase--grid">
          <div className="seatmap__dual">
            {/* ── Mini: موقع الفئة داخل المكان ── */}
            <aside className="seatmap__mini-wrap">
              {ev?.seatmap_image ? (
                <VenueImageMap image={ev.seatmap_image} categories={categories || []} activeCat={catId} lockToCat={catId} markers={seatMarkers} />
              ) : (
                <StadiumMap categories={categories || []} activeCat={catId} lockToCat={catId} mini />
              )}
              <span className="seatmap__mini-label">
                {seatMarkers.length ? `مقاعدك مضيئة على المخطط (${seatMarkers.length})` : `${category?.name} — موقعك في المكان`}
              </span>
            </aside>

            {/* ── قاعة المقاعد (كل المقاعد) ── */}
            <div className="seatmap__hall">
              <div className="seatmap__section-head">
                <h2>{category?.name}</h2>
                <span className="text-muted">{currentSection.availableCount} مقعد متاح من {currentSection.seatCount}</span>
              </div>

              {shapePolygon ? (
                <ShapedSeats
                  polygon={shapePolygon}
                  seats={currentSection.seats}
                  selectedIds={selected}
                  onSeat={clickSeat}
                />
              ) : (
              <>
              {/* المسرح / الملعب المنحني */}
              <div className="seatmap__stage">المسرح / الملعب ↑</div>

              <div className="seatmap__scroll">
                <div className="seatmap__grid">
                  {/* رأس أرقام المقاعد */}
                  {sectionRows.length > 0 && (
                    <div className="seatrow seatrow--head">
                      <span className="seatrow__label" />
                      {Array.from({ length: maxSeatNum }).map((_, i) => (
                        <Fragment key={i}>
                          {i > 0 && i % AISLE === 0 && (
                            <span className="seataisle" />
                          )}
                          <span className="seatcol">{i + 1}</span>
                        </Fragment>
                      ))}
                      <span className="seatrow__label" />
                    </div>
                  )}

                  {/* صفوف المقاعد */}
                  {sectionRows.map(([label, list]) => (
                    <div className="seatrow" key={label}>
                      <span className="seatrow__label">{label}</span>
                      {list.map((s, idx) => {
                        const isSel = selected.includes(s.id);
                        const cls =
                          s.status === "booked"
                            ? "seat--booked"
                            : s.status === "held"
                            ? "seat--held"
                            : isSel
                            ? "seat--sel"
                            : "seat--free";
                        return (
                          <Fragment key={s.id}>
                            {idx > 0 && idx % AISLE === 0 && (
                              <span className="seataisle" />
                            )}
                            <button
                              className={`seat ${cls}`}
                              onClick={() => clickSeat(s)}
                              disabled={s.status === "booked"}
                              title={
                                s.status === "held"
                                  ? "محجوز مؤقتًا"
                                  : `صف ${s.row_label} · مقعد ${s.seat_number}`
                              }
                            >
                              {s.status === "booked" ? (
                                <span className="seat__x">✕</span>
                              ) : s.status === "held" ? (
                                <span className="seat__x">⏳</span>
                              ) : isSel ? (
                                <span className="seat__check">✓</span>
                              ) : (
                                s.seat_number
                              )}
                            </button>
                          </Fragment>
                        );
                      })}
                      <span className="seatrow__label">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
              </>
              )}

              {/* Legend */}
              <div className="seatmap__legend">
                <span>
                  <i className="lg lg--free" /> متاح
                </span>
                <span>
                  <i className="lg lg--booked" /> محجوز
                </span>
                <span>
                  <i className="lg lg--held" /> محجوز مؤقتًا
                </span>
                <span>
                  <i className="lg lg--sel" /> اختيارك
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── الخيارات + التأكيد (أسفل) ── */}
      <div className="seatmap__bottom">
        <div className="seatmap__controls">
          <div className="seatmap__ctl">
            <span>الكمية</span>
            <div className="stepper">
              <button onClick={() => changeQty(qty - 1)} aria-label="نقص"><FiMinus /></button>
              <span>{qty}</span>
              <button onClick={() => changeQty(qty + 1)} aria-label="زيادة"><FiPlus /></button>
            </div>
          </div>
          <label className="seatmap__ctl seatmap__toggle">
            <span>مقاعد متجاورة؟</span>
            <input type="checkbox" checked={adjacent} onChange={(e) => { setAdjacent(e.target.checked); setSelected([]); }} />
            <span className="switch" />
          </label>
        </div>

        <div className="seatmap__bar">
          <div className="seatmap__info">
            <span className="text-muted">{selected.length}/{qty} مقعد</span>
            <strong>{formatPrice(total)}</strong>
            {category?.points_reward > 0 && selected.length > 0 && (
              <span className="seatmap__pts">🎁 ستكسب {category.points_reward * selected.length} نقطة</span>
            )}
          </div>
          <button className="seatmap__confirm" disabled={!done} onClick={confirm}>تأكيد الحجز</button>
        </div>
      </div>
    </div>
  );
}
