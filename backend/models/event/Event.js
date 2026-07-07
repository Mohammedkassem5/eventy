import { DataTypes } from "sequelize";
import { sequelize } from "../../config/db.js";

const Event = sequelize.define(
  "Event",
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    category_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    venue_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    title_ar: { type: DataTypes.STRING(200), allowNull: false },
    title_en: { type: DataTypes.STRING(200), allowNull: true },
    subtitle: { type: DataTypes.STRING(200), allowNull: true }, // "تشيلسي × مانشستر سيتي"
    description: { type: DataTypes.TEXT, allowNull: true },
    poster: { type: DataTypes.STRING(255), allowNull: true },
    gallery: { type: DataTypes.JSON, allowNull: true }, // صور إضافية (الملعب/المسرح/الأجواء)
    seatmap_image: { type: DataTypes.STRING(255), allowNull: true }, // صورة مخطط المكان التي يرفعها الأدمن
    venue_name: { type: DataTypes.STRING(160), allowNull: true },
    city: { type: DataTypes.STRING(80), allowNull: true },
    date_start: { type: DataTypes.DATE, allowNull: true },
    date_end: { type: DataTypes.DATE, allowNull: true },
    price_from: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    status: {
      type: DataTypes.ENUM("draft", "published"),
      allowNull: false,
      defaultValue: "draft",
    },
    is_featured: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    sort_order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    // إرشادات الحضور — يكتبها الأدمن، وتظهر كـ modal قبل الحجز
    guidelines: { type: DataTypes.JSON, allowNull: true }, // ["بند 1", "بند 2", ...]
    guidelines_title: { type: DataTypes.STRING(160), allowNull: true },
    show_guidelines: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    // طريقة التسليم — يتحكم بها الأدمن، تحدد قواعد الـ QR والإلغاء
    // branch_pickup: استلام من الفرع/المكان — لا QR إلكتروني، إلغاء حتى بدء الفعالية
    // instant: التذكرة + QR فورًا — لا إلغاء ولا استرداد نهائيًا
    // before_event: QR يصل قبل الفعالية بـ qr_lead_hours — إلغاء مسموح قبل وصوله فقط
    delivery_mode: {
      type: DataTypes.ENUM("branch_pickup", "instant", "before_event"),
      allowNull: false,
      defaultValue: "before_event",
    },
    qr_lead_hours: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 24 },
    // فروع الاستلام (لطريقة branch_pickup) — تُرسل في الإيميل
    pickup_branches: { type: DataTypes.JSON, allowNull: true }, // [{name, address, map_url}]
    // هل يُسمح بالدفع عند الاستلام لهذه الفعالية؟
    allow_cod: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  {
    tableName: "events",
    timestamps: true,
  }
);

export default Event;
