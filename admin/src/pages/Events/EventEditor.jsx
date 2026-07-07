import { useEffect, useRef, useState } from "react";
import dayjs from "dayjs";
import toast from "react-hot-toast";
import { FiImage, FiPlus, FiX, FiMapPin } from "react-icons/fi";
import { eventApi } from "../../services/eventApi";
import { categoryApi } from "../../services/categoryApi";
import { venueApi } from "../../services/venueApi";
import { venueTypeLabel } from "../../constants/venueTypes";
import { mediaUrl, apiError } from "../../lib/api";
import Modal from "../../components/Modal/Modal";
import TicketsSection from "./TicketsSection";

const toInput = (iso) => (iso ? dayjs(iso).format("YYYY-MM-DDTHH:mm") : "");

const TABS = [
  "تفاصيل الفعالية",
  "التسليم والدفع والتعليمات",
  "فئات التذاكر ومخطط المكان",
  "تحديد مناطق الفئات",
];

const blank = {
  title_ar: "",
  title_en: "",
  subtitle: "",
  category_id: "",
  venue_id: "",
  seatmap_image: "",
  description: "",
  venue_name: "",
  city: "",
  date_start: "",
  date_end: "",
  price_from: "",
  status: "draft",
  is_featured: false,
  sort_order: 0,
  delivery_mode: "before_event",
  qr_lead_hours: 24,
  allow_cod: true,
  guidelines_title: "",
  show_guidelines: false,
  guidelines: [],
  gallery: [],
  pickup_branches: [],
};

export default function EventEditor({ event, onClose, onSaved }) {
  const isEdit = !!event;
  const [tab, setTab] = useState(0);
  const [cats, setCats] = useState([]);
  const [venues, setVenues] = useState([]);
  const [f, setF] = useState(blank);
  const [posterFile, setPosterFile] = useState(null);
  const [galleryFiles, setGalleryFiles] = useState([]);
  const [saving, setSaving] = useState(false);
  const [createdEvent, setCreatedEvent] = useState(null);
  const activeEvent = event || createdEvent;
  const posterRef = useRef(null);
  const galleryRef = useRef(null);

  useEffect(() => {
    categoryApi.list().then(setCats).catch(() => {});
    venueApi.list().then(setVenues).catch(() => {});
    if (event) {
      setF({
        ...blank,
        ...event,
        category_id: event.category_id || "",
        venue_id: event.venue_id || "",
        seatmap_image: event.seatmap_image || "",
        date_start: toInput(event.date_start),
        date_end: toInput(event.date_end),
        price_from: event.price_from ?? "",
        allow_cod: event.allow_cod ?? true,
        guidelines: Array.isArray(event.guidelines) ? event.guidelines : [],
        gallery: Array.isArray(event.gallery) ? event.gallery : [],
        pickup_branches: Array.isArray(event.pickup_branches) ? event.pickup_branches : [],
      });
    }
  }, [event]);

  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  const pickVenue = (id) => {
    const v = venues.find((x) => String(x.id) === String(id));
    setF((p) => ({
      ...p,
      venue_id: id,
      venue_name: v ? v.name_ar : p.venue_name,
      city: v?.city || p.city,
      // مخطط الفعالية يُؤخذ دائمًا من المكان المختار (لا رفع صور داخل الفعالية)
      seatmap_image: v ? (v.map_image || "") : p.seatmap_image,
    }));
  };

  const setGuide = (i, v) =>
    setF((p) => ({ ...p, guidelines: p.guidelines.map((g, j) => (j === i ? v : g)) }));
  const addGuide = () => setF((p) => ({ ...p, guidelines: [...p.guidelines, ""] }));
  const delGuide = (i) => setF((p) => ({ ...p, guidelines: p.guidelines.filter((_, j) => j !== i) }));

  const setBranch = (i, k, v) =>
    setF((p) => ({
      ...p,
      pickup_branches: p.pickup_branches.map((b, j) => (j === i ? { ...b, [k]: v } : b)),
    }));
  const addBranch = () =>
    setF((p) => ({
      ...p,
      pickup_branches: [...p.pickup_branches, { name: "", address: "", map_url: "" }],
    }));
  const delBranch = (i) =>
    setF((p) => ({ ...p, pickup_branches: p.pickup_branches.filter((_, j) => j !== i) }));

  const delGalleryUrl = (url) => setF((p) => ({ ...p, gallery: p.gallery.filter((u) => u !== url) }));

  const save = async (e) => {
    if (e) e.preventDefault();
    if (f.title_ar.trim().length < 2) {
      setTab(0);
      return toast.error("اكتب عنوان الفعالية");
    }
    setSaving(true);
    try {
      const payload = {
        title_ar: f.title_ar,
        title_en: f.title_en || null,
        subtitle: f.subtitle || null,
        category_id: f.category_id ? Number(f.category_id) : null,
        venue_id: f.venue_id ? Number(f.venue_id) : null,
        seatmap_image: f.seatmap_image || null,
        description: f.description || null,
        venue_name: f.venue_name || null,
        city: f.city || null,
        date_start: f.date_start ? new Date(f.date_start).toISOString() : null,
        date_end: f.date_end ? new Date(f.date_end).toISOString() : null,
        price_from: f.price_from === "" ? null : Number(f.price_from),
        status: f.status,
        is_featured: !!f.is_featured,
        sort_order: Number(f.sort_order) || 0,
        delivery_mode: f.delivery_mode,
        qr_lead_hours: Number(f.qr_lead_hours) || 24,
        allow_cod: f.delivery_mode === "branch_pickup", // مشتق تلقائيًا من طريقة التسليم
        gallery: f.gallery,
        pickup_branches:
          f.delivery_mode === "branch_pickup"
            ? f.pickup_branches.filter((b) => b.name?.trim())
            : [],
        guidelines_title: f.guidelines_title || null,
        show_guidelines: !!f.show_guidelines,
        guidelines: f.guidelines.map((g) => g.trim()).filter(Boolean),
      };

      const saved = activeEvent
        ? await eventApi.update(activeEvent.id, payload)
        : await eventApi.create(payload);

      if (posterFile) await eventApi.uploadPoster(saved.id, posterFile);
      if (galleryFiles.length) await eventApi.uploadGallery(saved.id, galleryFiles);

      toast.success(activeEvent ? "تم التحديث" : "تمت إضافة الفعالية بنجاح");

      if (!activeEvent) {
        setCreatedEvent(saved);
        setTab(2); // الانتقال التلقائي لتبويب فئات التذاكر
      } else if (!event) {
        setCreatedEvent(saved);
      } else {
        // إذا كنا نعدّل فعالية موجودة من قبل، لا نغلق المودال تلقائياً لمواصلة تحرير التذاكر
        // بل نقوم بتحديث البيانات المحلية فقط
        setCreatedEvent(saved);
      }
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setSaving(false);
    }
  };

  const posterPreview = posterFile
    ? URL.createObjectURL(posterFile)
    : f.poster
    ? mediaUrl(f.poster)
    : null;

  return (
    <Modal open title={isEdit ? "تعديل فعالية" : "فعالية جديدة"} onClose={onClose} width={720}>
      {/* tabs */}
      <div className="wiz-tabs">
        {TABS.map((t, i) => (
          <button
            key={i}
            type="button"
            className={`wiz-tab ${tab === i ? "is-on" : ""}`}
            onClick={() => setTab(i)}
          >
            <span className="wiz-num">{i + 1}</span> {t}
          </button>
        ))}
      </div>

      <form onSubmit={save} className="ev-form">
        {/* Step 1: تفاصيل الفعالية */}
        {tab === 0 && (
          <>
            <h4 className="ev-section">البيانات الأساسية</h4>
            <div className="field-row">
              <div className="field">
                <label>العنوان (عربي) *</label>
                <input value={f.title_ar} onChange={(e) => set("title_ar", e.target.value)} />
              </div>
              <div className="field">
                <label>العنوان (إنجليزي)</label>
                <input
                  dir="ltr"
                  value={f.title_en}
                  onChange={(e) => set("title_en", e.target.value)}
                />
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label>العنوان الفرعي</label>
                <input
                  value={f.subtitle}
                  onChange={(e) => set("subtitle", e.target.value)}
                  placeholder="تشيلسي × مانشستر سيتي"
                />
              </div>
              <div className="field">
                <label>التصنيف / النوع</label>
                <select value={f.category_id} onChange={(e) => set("category_id", e.target.value)}>
                  <option value="">— اختر النوع —</option>
                  {cats.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name_ar}
                    </option>
                  ))}
                </select>
                {!cats.length && (
                  <small className="hint-warn">لا توجد أنواع — أضفها من قسم التصنيفات أولًا.</small>
                )}
              </div>
            </div>
            <div className="field">
              <label>الوصف</label>
              <textarea rows="3" value={f.description} onChange={(e) => set("description", e.target.value)} />
            </div>
            <div className="field-row">
              <div className="field">
                <label>السعر يبدأ من (ج.م)</label>
                <input
                  type="number"
                  value={f.price_from}
                  onChange={(e) => set("price_from", e.target.value)}
                />
              </div>
              <div className="field">
                <label>الترتيب</label>
                <input
                  type="number"
                  value={f.sort_order}
                  onChange={(e) => set("sort_order", e.target.value)}
                />
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label>الحالة</label>
                <select value={f.status} onChange={(e) => set("status", e.target.value)}>
                  <option value="draft">مسودة</option>
                  <option value="published">منشورة</option>
                </select>
              </div>
              <div className="check-field">
                <label>مميّزة (الأبرز)</label>
                <label className="switch-lbl">
                  <input
                    type="checkbox"
                    checked={f.is_featured}
                    onChange={(e) => set("is_featured", e.target.checked)}
                  />{" "}
                  <span>تفعيل</span>
                </label>
              </div>
            </div>

            <h4 className="ev-section" style={{ marginTop: 20 }}>المكان والموعد</h4>
            <div className="field">
              <label>اختر من الأماكن المحفوظة</label>
              <select value={f.venue_id} onChange={(e) => pickVenue(e.target.value)}>
                <option value="">— مكان مخصّص (يدوي) —</option>
                {venues.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name_ar} — {venueTypeLabel(v.type)}
                    {v.city ? ` · ${v.city}` : ""}
                  </option>
                ))}
              </select>
              {f.venue_id && (
                <small className="hint-warn" style={{ color: "var(--success)" }}>
                  سيُستخدم مخطط هذا المكان كمخطط افتراضي للفعالية.
                </small>
              )}
            </div>
            <div className="field-row">
              <div className="field">
                <label>المكان (الاسم الظاهر)</label>
                <input
                  value={f.venue_name}
                  onChange={(e) => set("venue_name", e.target.value)}
                  placeholder="ستاد القاهرة الدولي"
                />
              </div>
              <div className="field">
                <label>المدينة</label>
                <input value={f.city} onChange={(e) => set("city", e.target.value)} />
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label>يبدأ</label>
                <input
                  type="datetime-local"
                  value={f.date_start}
                  onChange={(e) => set("date_start", e.target.value)}
                />
              </div>
              <div className="field">
                <label>ينتهي</label>
                <input
                  type="datetime-local"
                  value={f.date_end}
                  onChange={(e) => set("date_end", e.target.value)}
                />
              </div>
            </div>

            <h4 className="ev-section" style={{ marginTop: 20 }}>الصور والبوستر</h4>
            <div className="field">
              <label>البوستر الرئيسي</label>
              <div className="poster-row">
                {posterPreview ? (
                  <img src={posterPreview} alt="" className="poster-prev" />
                ) : (
                  <span className="poster-ph">🎫</span>
                )}
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => posterRef.current?.click()}
                >
                  <FiImage /> اختر البوستر
                </button>
                <input
                  ref={posterRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => setPosterFile(e.target.files?.[0] || null)}
                />
              </div>
            </div>
            <div className="field">
              <label>صور إضافية (الأجواء / الملعب)</label>
              <div className="gallery-grid">
                {f.gallery.map((url) => (
                  <div className="gthumb" key={url}>
                    <img src={mediaUrl(url)} alt="" />
                    <button type="button" onClick={() => delGalleryUrl(url)}>
                      <FiX />
                    </button>
                  </div>
                ))}
                {galleryFiles.map((file, i) => (
                  <div className="gthumb gthumb--new" key={i}>
                    <img src={URL.createObjectURL(file)} alt="" />
                    <button
                      type="button"
                      onClick={() => setGalleryFiles((g) => g.filter((_, j) => j !== i))}
                    >
                      <FiX />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="gadd"
                  onClick={() => galleryRef.current?.click()}
                >
                  <FiPlus /> إضافة
                </button>
                <input
                  ref={galleryRef}
                  type="file"
                  accept="image/*"
                  multiple
                  hidden
                  onChange={(e) =>
                    setGalleryFiles((g) => [...g, ...Array.from(e.target.files || [])])
                  }
                />
              </div>
            </div>
          </>
        )}

        {/* Step 2: التسليم والدفع والتعليمات */}
        {tab === 1 && (
          <>
            <h4 className="ev-section">خيارات التسليم والتذاكر</h4>
            <div className="field">
              <label>طريقة تسليم التذاكر</label>
              <select value={f.delivery_mode} onChange={(e) => set("delivery_mode", e.target.value)}>
                <option value="branch_pickup">استلام من الفرع — لا QR (إلغاء حتى البدء)</option>
                <option value="instant">فوري + QR — لا إلغاء نهائيًا</option>
                <option value="before_event">QR قبل الفعالية — إلغاء قبل وصوله فقط</option>
              </select>
            </div>
            {f.delivery_mode === "before_event" && (
              <div className="field">
                <label>يصل الـ QR قبل الفعالية بـ (ساعة)</label>
                <input
                  type="number"
                  value={f.qr_lead_hours}
                  onChange={(e) => set("qr_lead_hours", e.target.value)}
                />
              </div>
            )}
            {f.delivery_mode === "branch_pickup" && (
              <div className="field">
                <label>
                  <FiMapPin /> فروع الاستلام (تظهر للمستخدم وتُرسل في البريد)
                </label>
                {f.pickup_branches.map((b, i) => (
                  <div className="branch-row" key={i}>
                    <input
                      placeholder="اسم الفرع"
                      value={b.name}
                      onChange={(e) => setBranch(i, "name", e.target.value)}
                    />
                    <input
                      placeholder="العنوان"
                      value={b.address}
                      onChange={(e) => setBranch(i, "address", e.target.value)}
                    />
                    <input
                      placeholder="رابط الخريطة"
                      dir="ltr"
                      value={b.map_url}
                      onChange={(e) => setBranch(i, "map_url", e.target.value)}
                    />
                    <button
                      type="button"
                      className="icon-btn icon-btn--danger"
                      onClick={() => delBranch(i)}
                    >
                      <FiX />
                    </button>
                  </div>
                ))}
                <button type="button" className="btn btn-ghost" onClick={addBranch}>
                  <FiPlus /> إضافة فرع
                </button>
              </div>
            )}

            <div className="cod-note">
              الدفع عند الاستلام يُحدَّد تلقائيًا: متاح فقط لطريقة «الاستلام من الفرع».
              أي فعالية يُرسل لها QR (فوري / قبل الفعالية) لا يظهر فيها الدفع النقدي.
            </div>

            <h4 className="ev-section" style={{ marginTop: 25 }}>إرشادات الحضور</h4>
            <div className="field-row">
              <div className="field">
                <label>عنوان الإرشادات</label>
                <input
                  value={f.guidelines_title}
                  onChange={(e) => set("guidelines_title", e.target.value)}
                  placeholder="تعليمات دخول العرض"
                />
              </div>
              <div className="check-field">
                <label>تفعيل عرض الإرشادات قبل الحجز</label>
                <label className="switch-lbl">
                  <input
                    type="checkbox"
                    checked={f.show_guidelines}
                    onChange={(e) => set("show_guidelines", e.target.checked)}
                  />
                  <span>تفعيل</span>
                </label>
              </div>
            </div>
            <div className="field">
              <label>البنود والتعليمات</label>
              {f.guidelines.map((g, i) => (
                <div className="guide-row" key={i}>
                  <input
                    value={g}
                    onChange={(e) => setGuide(i, e.target.value)}
                    placeholder={`بند ${i + 1}`}
                  />
                  <button
                    type="button"
                    className="icon-btn icon-btn--danger"
                    onClick={() => delGuide(i)}
                  >
                    <FiX />
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="btn btn-ghost add-guide"
                onClick={addGuide}
                style={{ marginTop: 5 }}
              >
                <FiPlus /> إضافة بند
              </button>
            </div>
          </>
        )}

        {/* Step 3: فئات التذاكر ومخطط المكان */}
        {tab === 2 && (
          <div className="field">
            {activeEvent ? (
              <TicketsSection event={activeEvent} defaultTab="cats" hideTabs={true} />
            ) : (
              <div className="text-muted" style={{ padding: "40px 0", textAlign: "center" }}>
                <p>يرجى حفظ تفاصيل الفعالية أولاً لكي تتمكن من إضافة فئات التذاكر.</p>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ marginTop: 15 }}
                  onClick={() => save()}
                  disabled={saving}
                >
                  {saving ? "جارٍ حفظ الفعالية..." : "حفظ الفعالية والمتابعة"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step 4: رسم مناطق فئات المقاعد */}
        {tab === 3 && (
          <div className="field">
            {activeEvent ? (
              <TicketsSection event={activeEvent} defaultTab="layout" hideTabs={true} />
            ) : (
              <div className="text-muted" style={{ padding: "40px 0", textAlign: "center" }}>
                <p>يرجى حفظ تفاصيل الفعالية أولاً لكي تتمكن من تحديد مناطق الفئات.</p>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ marginTop: 15 }}
                  onClick={() => save()}
                  disabled={saving}
                >
                  {saving ? "جارٍ حفظ الفعالية..." : "حفظ الفعالية والمتابعة"}
                </button>
              </div>
            )}
          </div>
        )}

        <div className="wiz-foot">
          <div className="wiz-steps">
            {tab > 0 && (
              <button type="button" className="btn btn-ghost" onClick={() => setTab(tab - 1)}>
                السابق
              </button>
            )}
            {tab < TABS.length - 1 && (
              <button type="button" className="btn btn-ghost" onClick={() => setTab(tab + 1)}>
                التالي
              </button>
            )}
          </div>
          {tab >= 2 ? (
            <button type="button" className="btn btn-primary" onClick={onSaved}>
              إغلاق وحفظ
            </button>
          ) : (
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "جارٍ الحفظ..." : activeEvent ? "حفظ التعديلات" : "إنشاء الفعالية والمتابعة"}
            </button>
          )}
        </div>
      </form>
    </Modal>
  );
}
