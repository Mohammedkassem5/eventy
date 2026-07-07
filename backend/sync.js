import connectDB, { sequelize } from "./config/db.js";
import "./models/user/User.js";
import "./models/category/Category.js";
import "./models/event/Event.js";
import "./models/ticket/TicketCategory.js";
import "./models/ticket/Seat.js";
import "./models/booking/Booking.js";
import "./models/booking/BookingSeat.js";
import "./models/booking/RefundRequest.js";
import "./models/payment/PaymentMethod.js";
import "./models/settings/PlatformSetting.js";
import "./models/support/SupportMessage.js";
import "./models/support/SupportSession.js";
import "./models/admin/AdminRole.js";
import "./models/admin/Admin.js";
import "./models/admin/AuditLog.js";
import "./models/venue/Venue.js";

(async () => {
  try {
    await connectDB();
    console.log("Syncing database schema (altering tables)...");
    await sequelize.sync({ alter: true });
    console.log("Database schema synced successfully! ✅");
    process.exit(0);
  } catch (err) {
    console.error("Database sync failed:", err);
    process.exit(1);
  }
})();
