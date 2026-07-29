import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { createServer } from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import dns from "node:dns";
import "dotenv/config";

// شبكة Railway تفضّل IPv6 لكنها لا تصل لبعض الخوادم الخارجية (مثل smtp.gmail.com) عبره.
// نجبر Node على تفضيل IPv4 حتى لا يعلّق إرسال الإيميل بخطأ ENETUNREACH.
dns.setDefaultResultOrder("ipv4first");

import { setIO, userRoom, ADMIN_ROOM, emitTyping, emitRead, emitPresence, adminsOnline } from "./utils/socket.js";
import SupportMessage from "./models/support/SupportMessage.js";

import connectDB, { sequelize } from "./config/db.js";
import "./config/redis.js";
import sanitizeBody from "./middleware/sanitize.js";
import errorHandler from "./middleware/errorHandler.js";
import logger from "./utils/logger.js";

/* =========================
   Models
   (تُستورد هنا خطوة بخطوة مع بناء كل دومين)
========================= */
import "./models/user/User.js";
import Category from "./models/category/Category.js";
import Event from "./models/event/Event.js";
import TicketCategory from "./models/ticket/TicketCategory.js";
import Seat from "./models/ticket/Seat.js";
import Booking from "./models/booking/Booking.js";
import BookingSeat from "./models/booking/BookingSeat.js";
import RefundRequest from "./models/booking/RefundRequest.js";
import "./models/payment/PaymentMethod.js";
import "./models/settings/PlatformSetting.js";
import "./models/support/SupportMessage.js";
import SupportSession from "./models/support/SupportSession.js";
import AdminRole from "./models/admin/AdminRole.js";
import Admin from "./models/admin/Admin.js";
import "./models/admin/AuditLog.js";
import Venue from "./models/venue/Venue.js";
import User from "./models/user/User.js";
import runSeed from "./utils/seed.js";

/* =========================
   Routes (imports)
========================= */
import authRoutes from "./routes/user/authRoutes.js";
import userRoutes from "./routes/user/userRoutes.js";
import categoryRoutes from "./routes/public/categoryRoutes.js";
import adminCategoryRoutes from "./routes/admin/categoryRoutes.js";
import eventRoutes from "./routes/public/eventRoutes.js";
import adminEventRoutes from "./routes/admin/eventRoutes.js";
import adminTicketCategoryRoutes from "./routes/admin/ticketCategoryRoutes.js";
import bookingRoutes from "./routes/user/bookingRoutes.js";
import seatRoutes from "./routes/user/seatRoutes.js";
import paymentRoutes from "./routes/user/paymentRoutes.js";
import paymentMethodRoutes from "./routes/public/paymentMethodRoutes.js";
import adminPaymentMethodRoutes from "./routes/admin/paymentMethodRoutes.js";
import configRoutes from "./routes/public/configRoutes.js";
import adminSettingsRoutes from "./routes/admin/settingsRoutes.js";
import supportRoutes from "./routes/user/supportRoutes.js";
import adminSupportRoutes from "./routes/admin/supportRoutes.js";
import adminAuthRoutes from "./routes/admin/authRoutes.js";
import roleRoutes from "./routes/admin/roleRoutes.js";
import statsRoutes from "./routes/admin/statsRoutes.js";
import venueRoutes from "./routes/public/venueRoutes.js";
import adminVenueRoutes from "./routes/admin/venueRoutes.js";
import adminBookingRoutes from "./routes/admin/bookingRoutes.js";
import adminRefundRoutes from "./routes/admin/refundRoutes.js";
import adminUserRoutes from "./routes/admin/userRoutes.js";
import adminFinanceRoutes from "./routes/admin/financeRoutes.js";
import adminAuditRoutes from "./routes/admin/auditRoutes.js";
import adminProfileRoutes from "./routes/admin/profileRoutes.js";

/* =========================
   Associations
========================= */
Category.hasMany(Event, { foreignKey: "category_id", as: "events" });
Event.belongsTo(Category, { foreignKey: "category_id", as: "category" });

Venue.hasMany(Event, { foreignKey: "venue_id", as: "events" });
Event.belongsTo(Venue, { foreignKey: "venue_id", as: "venue" });

Event.hasMany(TicketCategory, { foreignKey: "event_id", as: "ticketCategories" });
TicketCategory.belongsTo(Event, { foreignKey: "event_id", as: "event" });
TicketCategory.hasMany(Seat, { foreignKey: "ticket_category_id", as: "seats" });
Seat.belongsTo(TicketCategory, { foreignKey: "ticket_category_id", as: "ticketCategory" });
Event.hasMany(Seat, { foreignKey: "event_id", as: "seats" });

AdminRole.hasMany(Admin, { foreignKey: "admin_role_id", as: "admins" });
Admin.belongsTo(AdminRole, { foreignKey: "admin_role_id", as: "adminRole" });

User.hasMany(Booking, { foreignKey: "user_id", as: "bookings" });
Booking.belongsTo(User, { foreignKey: "user_id", as: "user" });
Booking.belongsTo(Event, { foreignKey: "event_id", as: "event" });
Booking.belongsTo(TicketCategory, { foreignKey: "ticket_category_id", as: "ticketCategory" });
Booking.hasMany(BookingSeat, { foreignKey: "booking_id", as: "seats" });
BookingSeat.belongsTo(Booking, { foreignKey: "booking_id", as: "booking" });
BookingSeat.belongsTo(Seat, { foreignKey: "seat_id", as: "seat" });

Booking.hasMany(RefundRequest, { foreignKey: "booking_id", as: "refunds" });
RefundRequest.belongsTo(Booking, { foreignKey: "booking_id", as: "booking" });
RefundRequest.belongsTo(User, { foreignKey: "user_id", as: "user" });

const app = express();

/* ---------- Core middleware ---------- */
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

const isDev = process.env.NODE_ENV !== "production";

// في التطوير: اسمح بأي localhost (المنافذ بتتغير). في الإنتاج: قائمة محددة.
const prodOrigins = [process.env.CLIENT_URL, process.env.ADMIN_URL].filter(Boolean);
const corsOrigin = isDev
  ? (origin, cb) => cb(null, !origin || /^http:\/\/localhost:\d+$/.test(origin))
  : prodOrigins;

const allowedOrigins = corsOrigin; // يُستخدم في socket.io أيضًا

app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan("dev"));
app.use(sanitizeBody);

/* ---------- Static uploads ---------- */
app.use("/uploads", express.static("uploads"));

/* ---------- Health check ---------- */
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "eventy-backend", time: new Date() });
});

/* =========================
   Routes
========================= */
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/admin/categories", adminCategoryRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/admin/events", adminEventRoutes);
app.use("/api/admin/ticket-categories", adminTicketCategoryRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/seats", seatRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/payment-methods", paymentMethodRoutes);
app.use("/api/admin/payment-methods", adminPaymentMethodRoutes);
app.use("/api/config", configRoutes);
app.use("/api/admin/settings", adminSettingsRoutes);
app.use("/api/support", supportRoutes);
app.use("/api/admin/auth", adminAuthRoutes); // login / logout / owner-setup
app.use("/api/admin/profile", adminProfileRoutes);
app.use("/api/admin/audit", adminAuditRoutes);
app.use("/api/admin/support", adminSupportRoutes);
app.use("/api/admin", roleRoutes); // /me /permissions /roles /admins
app.use("/api/admin/stats", statsRoutes);
app.use("/api/venues", venueRoutes);
app.use("/api/admin/venues", adminVenueRoutes);
app.use("/api/admin/bookings", adminBookingRoutes);
app.use("/api/admin/refunds", adminRefundRoutes);
app.use("/api/admin/users", adminUserRoutes);
app.use("/api/admin/finance", adminFinanceRoutes);

/* ---------- 404 + Error handler ---------- */
app.use((_req, res) => res.status(404).json({ message: "المسار غير موجود" }));
app.use(errorHandler);

/* =========================
   Socket.io
========================= */
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: allowedOrigins, credentials: true },
});
setIO(io);

// مصادقة الـ socket — كوكي admin_token (أدمن) أو access_token (عميل)
io.use((socket, next) => {
  try {
    const raw = socket.handshake.headers.cookie || "";
    const pick = (name) => raw.split(";").map((c) => c.trim()).find((c) => c.startsWith(`${name}=`))?.split("=")[1];
    const token = pick("admin_token") || pick("access_token");
    if (!token) return next(new Error("unauthorized"));
    socket.user = jwt.verify(decodeURIComponent(token), process.env.JWT_SECRET);
    next();
  } catch {
    next(new Error("unauthorized"));
  }
});

io.on("connection", (socket) => {
  const { id: uid, kind } = socket.user;
  const isAdmin = kind === "admin";
  if (isAdmin) socket.join(ADMIN_ROOM);
  else socket.join(userRoom(uid)); // غرفة محادثة العميل
  logger.debug(`Socket connected: ${kind} ${uid}`);

  // تواجد: أبلغ الأدمنز أن المستخدم متصل + أبلغ المستخدم هل الدعم متصل
  if (!isAdmin) emitPresence(uid, true);
  socket.emit("support:agents", { online: adminsOnline() });

  // مؤشّر الكتابة
  socket.on("support:typing", ({ userId, isTyping }) => {
    const target = isAdmin ? Number(userId) : uid; // الأدمن يحدّد المحادثة
    emitTyping(target, isAdmin ? "admin" : "user", !!isTyping);
  });

  // إشعار القراءة — علِّم الرسائل مقروءة وبثّ
  socket.on("support:read", async ({ userId }) => {
    const target = isAdmin ? Number(userId) : uid;
    const senderToRead = isAdmin ? "user" : "admin"; // كل طرف يقرأ رسائل الآخر
    await SupportMessage.update(
      { is_read: true },
      { where: { user_id: target, sender: senderToRead, is_read: false } }
    );
    emitRead(target, isAdmin ? "admin" : "user");
  });

  // مشاهدة مقاعد فعالية بشكل حيّ
  socket.on("seat:watch", ({ eventId }) => { if (eventId) socket.join(`event:${eventId}`); });
  socket.on("seat:unwatch", ({ eventId }) => { if (eventId) socket.leave(`event:${eventId}`); });

  socket.on("disconnect", () => {
    if (!isAdmin) {
      // أبلغ الأوفلاين فقط إن لم يبق له أي اتصال آخر
      const room = io.sockets.adapter.rooms.get(userRoom(uid));
      if (!room || room.size === 0) emitPresence(uid, false);
    }
  });
});

/* =========================
   Bootstrap
========================= */
const PORT = process.env.PORT || 5000;

(async () => {
  try {
    await connectDB();
    // alter=true يكرّر فهارس unique (email) عند كل إقلاع حتى يتعطّل عند 64 مفتاح.
    // فعّله يدويًا مؤقتًا فقط عند تغيير المخطط: SYNC_ALTER=1 npm run dev
    await sequelize.sync({ alter: process.env.SYNC_ALTER === "1" });
    logger.info("Database synced ✅");
    await runSeed();

    httpServer.listen(PORT, () =>
      logger.info(`Eventy backend running on http://localhost:${PORT} 🚀`)
    );
  } catch (err) {
    logger.error("Failed to start server", { stack: err.stack });
    process.exit(1);
  }
})();

// لا نُسقِط الخادم بسبب خطأ في socket handler — نسجّله فقط
process.on("unhandledRejection", (reason) => {
  logger.error("UnhandledRejection", { stack: reason?.stack || String(reason) });
});
process.on("uncaughtException", (err) => {
  logger.error("UncaughtException", { stack: err?.stack || String(err) });
});

export { io };
