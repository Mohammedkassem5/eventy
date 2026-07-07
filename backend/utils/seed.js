import bcrypt from "bcryptjs";
import User from "../models/user/User.js";
import Category from "../models/category/Category.js";
import Event from "../models/event/Event.js";
import TicketCategory from "../models/ticket/TicketCategory.js";
import Seat from "../models/ticket/Seat.js";
import PaymentMethod from "../models/payment/PaymentMethod.js";
import PlatformSetting from "../models/settings/PlatformSetting.js";
import Venue from "../models/venue/Venue.js";
import logger from "./logger.js";

const PAYMENT_METHODS = [
  { key: "card", name_ar: "بطاقة ائتمان (Visa / Mastercard)", icon: "💳", sort_order: 1 },
  { key: "vodafone_cash", name_ar: "فودافون كاش", icon: "📱", sort_order: 2 },
  { key: "wallet", name_ar: "محفظة Eventy", icon: "👛", sort_order: 3 },
  { key: "cash", name_ar: "الدفع عند الاستلام", icon: "💵", sort_order: 4 },
];

const rowLabel = (i) => String.fromCharCode(65 + i);

function gridSeats(eventId, catId, rows, cols) {
  const seats = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      seats.push({
        event_id: eventId, ticket_category_id: catId,
        row_label: rowLabel(r), seat_number: c + 1, seat_code: `${rowLabel(r)}${c + 1}`,
        status: "available", x: c, y: r,
      });
  return seats;
}

// أماكن حقيقية في مصر — ملاعب ومسارح وقاعات (سعات وإحداثيات واقعية)
const STARTER_VENUES = [
  { name_ar: "استاد القاهرة الدولي", name_en: "Cairo International Stadium", type: "stadium", city: "القاهرة", address: "مدينة نصر، القاهرة", capacity: 75000, lat: 30.0686, lng: 31.3122, sort_order: 1 },
  { name_ar: "استاد برج العرب", name_en: "Borg El Arab Stadium", type: "stadium", city: "الإسكندرية", address: "برج العرب، الإسكندرية", capacity: 86000, lat: 30.9631, lng: 29.7189, sort_order: 2 },
  { name_ar: "استاد 30 يونيو", name_en: "30 June Stadium", type: "stadium", city: "القاهرة", address: "مقر قوات الدفاع الجوي، القاهرة الجديدة", capacity: 30000, lat: 30.0942, lng: 31.3428, sort_order: 3 },
  { name_ar: "استاد السلام", name_en: "Al Salam Stadium", type: "stadium", city: "القاهرة", address: "طريق السويس، القاهرة", capacity: 30000, lat: 30.1057, lng: 31.3903, sort_order: 4 },
  { name_ar: "استاد الإسكندرية", name_en: "Alexandria Stadium", type: "stadium", city: "الإسكندرية", address: "محطة الرمل، الإسكندرية", capacity: 19676, lat: 31.1959, lng: 29.9101, sort_order: 5 },
  { name_ar: "المسرح الكبير — دار الأوبرا المصرية", name_en: "Cairo Opera House — Main Hall", type: "theater", city: "القاهرة", address: "أرض الجزيرة، الزمالك", capacity: 1200, lat: 30.0426, lng: 31.2247, sort_order: 6 },
  { name_ar: "مسرح النافورة — دار الأوبرا", name_en: "El Nafoura Open-Air Theatre", type: "open_air", city: "القاهرة", address: "أرض الجزيرة، الزمالك", capacity: 600, lat: 30.0423, lng: 31.2251, sort_order: 7 },
  { name_ar: "الصالة المغطاة — استاد القاهرة", name_en: "Cairo Stadium Indoor Halls Complex", type: "arena", city: "القاهرة", address: "مدينة نصر، القاهرة", capacity: 17000, lat: 30.0722, lng: 31.3115, sort_order: 8 },
  { name_ar: "مركز المنارة الدولي للمؤتمرات", name_en: "Al Manara International Conference Center", type: "hall", city: "القاهرة", address: "التجمع الخامس، القاهرة الجديدة", capacity: 2800, lat: 30.0330, lng: 31.4103, sort_order: 9 },
  { name_ar: "مسرح الأهرامات", name_en: "Pyramids Open-Air Theatre", type: "open_air", city: "الجيزة", address: "سفح أهرامات الجيزة", capacity: 10000, lat: 29.9773, lng: 31.1325, sort_order: 10 },
  { name_ar: "قاعة المؤتمرات — مكتبة الإسكندرية", name_en: "Bibliotheca Alexandrina Conference Center", type: "hall", city: "الإسكندرية", address: "طريق الجيش، الشاطبي", capacity: 1600, lat: 31.2089, lng: 29.9092, sort_order: 11 },
  { name_ar: "زد بارك — الشيخ زايد", name_en: "ZED Park", type: "open_air", city: "الجيزة", address: "مدينة الشيخ زايد، الجيزة", capacity: 30000, lat: 30.0430, lng: 30.9760, sort_order: 12 },
];

const STARTER_CATEGORIES = [
  { name_ar: "كرة قدم", name_en: "Football", slug: "football", icon: "⚽", sort_order: 1,
    image: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=800&q=70" },
  { name_ar: "حفلات موسيقية", name_en: "Concerts", slug: "concerts", icon: "🎤", sort_order: 2,
    image: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=800&q=70" },
  { name_ar: "مسرح وأوبرا", name_en: "Theater", slug: "theater", icon: "🎭", sort_order: 3,
    image: "https://images.unsplash.com/photo-1503095396549-807759245b7b?auto=format&fit=crop&w=800&q=70" },
  { name_ar: "مؤتمرات", name_en: "Conferences", slug: "conferences", icon: "🎙️", sort_order: 4,
    image: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=70" },
  { name_ar: "ورش عمل", name_en: "Workshops", slug: "workshops", icon: "🛠️", sort_order: 5,
    image: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=800&q=70" },
  { name_ar: "كوميديا", name_en: "Comedy", slug: "comedy", icon: "😂", sort_order: 6,
    image: "https://images.unsplash.com/photo-1527224857830-43a7acc85260?auto=format&fit=crop&w=800&q=70" },
];

export default async function runSeed() {
  // ملاحظة: حساب الأدمن/المالك يُنشأ يدويًا عبر POST /api/auth/owner-setup

  // دور المالك — يُنشأ حساب المالك يدويًا عبر POST /api/admin/auth/owner-setup
  const { default: AdminRole } = await import("../models/admin/AdminRole.js");
  const { default: Admin } = await import("../models/admin/Admin.js");
  const [owner] = await AdminRole.findOrCreate({
    where: { name: "Owner" },
    defaults: { name: "Owner", permissions: ["*"], is_system: true },
  });
  await Admin.update({ admin_role_id: owner.id }, { where: { admin_role_id: null } });

  // الأماكن الحقيقية — أضِف الناقص فقط (findOrCreate بالاسم)
  for (const v of STARTER_VENUES) {
    await Venue.findOrCreate({ where: { name_ar: v.name_ar }, defaults: v });
  }

  // فئات البداية لو الجدول فاضي
  if ((await Category.count()) === 0) {
    await Category.bulkCreate(STARTER_CATEGORIES);
    logger.info("Seeded starter categories");
  }

  // ===== فعاليات حقيقية كاملة — idempotent (findOrCreate بالعنوان) + تذاكر + مقاعد =====
  const cats = Object.fromEntries(
    (await Category.findAll()).map((c) => [c.slug, c.id])
  );
  const venues = Object.fromEntries(
    (await Venue.findAll()).map((v) => [v.name_ar, v])
  );

  const daysFromNow = (d, hh = 20, mm = 0) => {
    const t = new Date();
    t.setDate(t.getDate() + d);
    t.setHours(hh, mm, 0, 0);
    return t;
  };

  // فئات تذاكر جاهزة حسب الحجم
  const TIER_SETS = {
    big: [
      { name: "VIP", price: 2500, color_hex: "#f59e0b", rows: 5, cols: 14, points_reward: 2000 },
      { name: "الدرجة الأولى", price: 1200, color_hex: "#6d28d9", rows: 7, cols: 18, points_reward: 1000 },
      { name: "الدرجة الثانية", price: 600, color_hex: "#0ea5e9", rows: 8, cols: 20, points_reward: 500 },
      { name: "المدرجات", price: 250, color_hex: "#16a34a", rows: 6, cols: 22, points_reward: 200 },
    ],
    mid: [
      { name: "VIP", price: 1500, color_hex: "#f59e0b", rows: 4, cols: 12, points_reward: 1200 },
      { name: "الدرجة الأولى", price: 800, color_hex: "#6d28d9", rows: 6, cols: 16, points_reward: 700 },
      { name: "عادي", price: 350, color_hex: "#0ea5e9", rows: 7, cols: 18, points_reward: 300 },
    ],
    small: [
      { name: "الصف الأمامي", price: 900, color_hex: "#f59e0b", rows: 3, cols: 12, points_reward: 700 },
      { name: "عادي", price: 400, color_hex: "#6d28d9", rows: 6, cols: 16, points_reward: 300 },
    ],
  };

  const P = {
    football: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=900&q=75",
    stadium: "https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=900&q=75",
    concert: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=900&q=75",
    concert2: "https://images.unsplash.com/photo-1493676304819-0d7a8d026dcf?auto=format&fit=crop&w=900&q=75",
    dj: "https://images.unsplash.com/photo-1571266028243-e4733b0f0bb0?auto=format&fit=crop&w=900&q=75",
    theater: "https://images.unsplash.com/photo-1503095396549-807759245b7b?auto=format&fit=crop&w=900&q=75",
    opera: "https://images.unsplash.com/photo-1580809361436-42a7ec204889?auto=format&fit=crop&w=900&q=75",
    comedy: "https://images.unsplash.com/photo-1527224857830-43a7acc85260?auto=format&fit=crop&w=900&q=75",
    conf: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=900&q=75",
    workshop: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=900&q=75",
  };

  const OPERA_RULES = [
    "تفتح الأبواب قبل الحفل بساعة.",
    "يلزم الزي الرسمي اللائق لدخول المسرح الكبير.",
    "ممنوع دخول الأطفال أقل من 7 سنوات.",
    "ممنوع التصوير داخل القاعة.",
    "لا استرجاع أو استبدال للتذاكر.",
  ];
  const STADIUM_RULES = [
    "أحضر بطاقة الرقم القومي المطابقة للحجز.",
    "الأبواب تفتح قبل المباراة بساعتين.",
    "ممنوع إدخال المشروبات أو الألعاب النارية.",
    "الجلوس في المقعد المحجوز فقط.",
  ];

  const EVENTS = [
    // ===== كرة قدم =====
    { title_ar: "القمة 128: الأهلي × الزمالك", subtitle: "الدوري المصري الممتاز", category: "football",
      venue: "استاد القاهرة الدولي", poster: P.football, days: 12, hh: 19, delivery: "branch_pickup", featured: true,
      desc: "ديربي القاهرة الأشهر في إفريقيا — مواجهة نارية بين القطبين على أرض استاد القاهرة الدولي.",
      tiers: "big", rules: STADIUM_RULES },
    { title_ar: "منتخب مصر × نيجيريا", subtitle: "تصفيات كأس العالم", category: "football",
      venue: "استاد برج العرب", poster: P.stadium, days: 25, hh: 20, delivery: "branch_pickup", featured: true,
      desc: "الفراعنة في مواجهة حاسمة أمام نيجيريا ضمن تصفيات كأس العالم على أكبر ملاعب مصر.",
      tiers: "big", rules: STADIUM_RULES },
    { title_ar: "الأهلي × بيراميدز", subtitle: "قمة الدوري", category: "football",
      venue: "استاد 30 يونيو", poster: P.football, days: 8, hh: 21, delivery: "branch_pickup", featured: false,
      desc: "مباراة قوية بين الأهلي وبيراميدز في صراع الصدارة.", tiers: "mid", rules: STADIUM_RULES },
    { title_ar: "الزمالك × المصري البورسعيدي", subtitle: "الدوري المصري", category: "football",
      venue: "استاد السلام", poster: P.stadium, days: 18, hh: 20, delivery: "branch_pickup", featured: false,
      desc: "الزمالك يستضيف المصري في لقاء مثير.", tiers: "mid", rules: STADIUM_RULES },

    // ===== حفلات =====
    { title_ar: "عمرو دياب — الهضبة لايف", subtitle: "أضخم حفلات 2026", category: "concerts",
      venue: "زد بارك — الشيخ زايد", poster: P.concert2, days: 20, hh: 21, delivery: "before_event", featured: true,
      desc: "أمسية استثنائية مع الهضبة عمرو دياب وأشهر أغانيه في أجواء لا تُنسى بزد بارك.", tiers: "big" },
    { title_ar: "تامر حسني — حفل رأس السنة", subtitle: "ليلة رأس السنة", category: "concerts",
      venue: "زد بارك — الشيخ زايد", poster: P.concert, days: 40, hh: 22, delivery: "before_event", featured: true,
      desc: "استقبل العام الجديد مع نجم الجيل تامر حسني في حفل ضخم.", tiers: "big" },
    { title_ar: "كايروكي — حفل مباشر", subtitle: "روك عربي", category: "concerts",
      venue: "مسرح الأهرامات", poster: P.concert, days: 15, hh: 21, delivery: "before_event", featured: false,
      desc: "فرقة كايروكي على مسرح الأهرامات في ليلة روك لا تُنسى تحت سفح الأهرامات.", tiers: "mid" },
    { title_ar: "محمد حماقي — نغم مصري", subtitle: "حفل غنائي", category: "concerts",
      venue: "الصالة المغطاة — استاد القاهرة", poster: P.concert2, days: 30, hh: 21, delivery: "before_event", featured: false,
      desc: "حفل غنائي كبير مع محمد حماقي وأجمل ألحانه.", tiers: "mid" },
    { title_ar: "مروان بابلو — Trap Night", subtitle: "راب / تراب", category: "concerts",
      venue: "زد بارك — الشيخ زايد", poster: P.dj, days: 10, hh: 22, delivery: "instant", featured: false,
      desc: "ليلة تراب مع الجوكر مروان بابلو وأقوى تراكاته.", tiers: "mid" },

    // ===== مسرح وأوبرا =====
    { title_ar: "أوبرا عايدة", subtitle: "دار الأوبرا المصرية", category: "theater",
      venue: "المسرح الكبير — دار الأوبرا المصرية", poster: P.opera, days: 22, hh: 19, delivery: "instant", featured: true,
      desc: "رائعة فيردي «عايدة» على خشبة المسرح الكبير بمشاركة نخبة الفنانين والأوركسترا.",
      tiers: "small", rules: OPERA_RULES },
    { title_ar: "الأوركسترا السيمفوني المصري", subtitle: "أمسية كلاسيكية", category: "theater",
      venue: "المسرح الكبير — دار الأوبرا المصرية", poster: P.theater, days: 14, hh: 20, delivery: "instant", featured: false,
      desc: "أمسية موسيقية كلاسيكية مع الأوركسترا السيمفوني المصري.", tiers: "small", rules: OPERA_RULES },

    // ===== كوميديا =====
    { title_ar: "مسرح مصر — علي ربيع وأصدقاؤه", subtitle: "عرض كوميدي", category: "comedy",
      venue: "مركز المنارة الدولي للمؤتمرات", poster: P.comedy, days: 9, hh: 21, delivery: "before_event", featured: true,
      desc: "ليلة ضحك متواصلة مع نجوم مسرح مصر وعلى رأسهم علي ربيع.", tiers: "mid" },
    { title_ar: "Stand-Up Comedy Night", subtitle: "ستاند أب كوميدي", category: "comedy",
      venue: "مركز المنارة الدولي للمؤتمرات", poster: P.comedy, days: 17, hh: 21, delivery: "instant", featured: false,
      desc: "أمسية ستاند أب كوميدي مع ألمع الكوميديانز الشباب.", tiers: "small" },

    // ===== مؤتمرات =====
    { title_ar: "مؤتمر Cairo ICT التقني 2026", subtitle: "أكبر تجمع تقني", category: "conferences",
      venue: "مركز المنارة الدولي للمؤتمرات", poster: P.conf, days: 35, hh: 10, delivery: "instant", featured: false,
      desc: "أكبر معرض ومؤتمر للتكنولوجيا والاتصالات في المنطقة — جلسات وخبراء وشركات عالمية.", tiers: "mid" },

    // ===== ورش عمل =====
    { title_ar: "ورشة التصوير الفوتوغرافي الاحترافي", subtitle: "3 أيام تدريبية", category: "workshops",
      venue: "قاعة المؤتمرات — مكتبة الإسكندرية", poster: P.workshop, days: 28, hh: 11, delivery: "instant", featured: false,
      desc: "ورشة مكثفة لاحتراف التصوير الفوتوغرافي مع مصورين محترفين — نظري وعملي.", tiers: "small" },
  ];

  let createdEvents = 0;
  for (const [i, e] of EVENTS.entries()) {
    const venue = venues[e.venue];
    const [ev, created] = await Event.findOrCreate({
      where: { title_ar: e.title_ar },
      defaults: {
        category_id: cats[e.category] || null,
        venue_id: venue?.id || null,
        venue_name: venue?.name_ar || null,
        city: venue?.city || null,
        title_ar: e.title_ar,
        subtitle: e.subtitle,
        description: e.desc,
        poster: e.poster,
        date_start: daysFromNow(e.days, e.hh || 20),
        status: "published",
        is_featured: !!e.featured,
        sort_order: i + 1,
        delivery_mode: e.delivery || "before_event",
        qr_lead_hours: 24,
        show_guidelines: !!e.rules,
        guidelines_title: e.rules ? "تعليمات الحضور" : null,
        guidelines: e.rules || null,
      },
    });
    if (!created) continue;
    createdEvents++;

    // تذاكر + مقاعد
    const defs = TIER_SETS[e.tiers] || TIER_SETS.mid;
    let minPrice = Infinity;
    for (const [j, d] of defs.entries()) {
      const total = d.rows * d.cols;
      const cat = await TicketCategory.create({
        event_id: ev.id, name: d.name, price: d.price, color_hex: d.color_hex,
        rows_count: d.rows, cols_count: d.cols, total_seats: total, available_seats: total,
        sort_order: j + 1, points_reward: d.points_reward || 0,
      });
      const seats = gridSeats(ev.id, cat.id, d.rows, d.cols);
      // احجز نسبة عشوائية واقعية (~15%)
      seats.forEach((s, idx) => { if ((idx * 7 + j) % 100 < 15) s.status = "booked"; });
      await Seat.bulkCreate(seats);
      await cat.update({ available_seats: seats.filter((s) => s.status === "available").length });
      minPrice = Math.min(minPrice, Number(d.price));
    }
    await ev.update({ price_from: minPrice === Infinity ? 0 : minPrice });
  }
  if (createdEvents) logger.info(`Seeded ${createdEvents} full events (tickets + seats)`);

  // وسائل الدفع
  if ((await PaymentMethod.count()) === 0) {
    await PaymentMethod.bulkCreate(PAYMENT_METHODS);
    logger.info("Seeded payment methods");
  }

  // إعدادات المنصة
  const DEFAULT_SETTINGS = [
    { key: "site_name", value: "Eventy", label_ar: "اسم المنصة" },
    { key: "support_email", value: "support@eventy.com", label_ar: "بريد الدعم" },
    { key: "support_phone", value: "19999", label_ar: "هاتف الدعم" },
    { key: "points_per_egp", value: "100", label_ar: "عدد النقاط لكل جنيه (100 نقطة = 1 ج.م)" },
    { key: "currency_symbol", value: "ج.م", label_ar: "رمز العملة" },
    { key: "booking_hold_minutes", value: "10", label_ar: "مدة حجز المقاعد المؤقت (دقائق)" },
    { key: "vodafone_cash_number", value: "01012345678", label_ar: "رقم فودافون كاش للتحويل" },
    { key: "vodafone_cash_name", value: "شركة إيفنتي للفعاليات", label_ar: "اسم صاحب محفظة فودافون كاش" },
    { key: "vodafone_cash_instructions", value: "1. افتح تطبيق فودافون كاش\n2. اختر تحويل أموال\n3. أدخل الرقم المذكور أعلاه\n4. أدخل المبلغ المطلوب\n5. أكّد التحويل واحتفظ برقم العملية", label_ar: "تعليمات التحويل عبر فودافون كاش" },
  ];
  for (const s of DEFAULT_SETTINGS) {
    await PlatformSetting.findOrCreate({ where: { key: s.key }, defaults: s });
  }
}
