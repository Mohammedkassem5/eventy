import { DataTypes } from "sequelize";
import { sequelize } from "../../config/db.js";

const RefundRequest = sequelize.define(
  "RefundRequest",
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    booking_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    reason: { type: DataTypes.STRING(500), allowNull: true },
    refund_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    status: {
      type: DataTypes.ENUM("pending", "approved", "rejected"),
      allowNull: false,
      defaultValue: "pending",
    },
    admin_note: { type: DataTypes.STRING(500), allowNull: true },
    responded_at: { type: DataTypes.DATE, allowNull: true },
  },
  { tableName: "refund_requests", timestamps: true }
);

export default RefundRequest;
