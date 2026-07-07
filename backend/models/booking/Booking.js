import { DataTypes } from "sequelize";
import { sequelize } from "../../config/db.js";

const Booking = sequelize.define(
  "Booking",
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    booking_ref: { type: DataTypes.STRING(24), allowNull: false, unique: true },
    user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    event_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    ticket_category_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    quantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    total_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    payment_method: { type: DataTypes.STRING(40), allowNull: true },
    payment_status: {
      type: DataTypes.ENUM("pending", "paid", "refunded"),
      allowNull: false,
      defaultValue: "pending",
    },
    status: {
      type: DataTypes.ENUM("pending", "confirmed", "cancelled"),
      allowNull: false,
      defaultValue: "pending",
    },
    qr_code: { type: DataTypes.TEXT, allowNull: true }, // data URL
    points_earned: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    points_used: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    wallet_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 }, // المبلغ المخصوم من المحفظة
    vodafone_ref: { type: DataTypes.STRING(100), allowNull: true }, // رقم مرجع فودافون كاش
    qr_sent: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false }, // أُرسل فعليًا
  },
  { tableName: "bookings", timestamps: true }
);

export default Booking;
