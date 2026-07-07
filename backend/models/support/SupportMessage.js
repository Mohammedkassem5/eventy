import { DataTypes } from "sequelize";
import { sequelize } from "../../config/db.js";

const SupportMessage = sequelize.define(
  "SupportMessage",
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    session_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true }, // جلسة المحادثة
    user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false }, // صاحب المحادثة
    sender: { type: DataTypes.ENUM("user", "admin"), allowNull: false },
    body: { type: DataTypes.TEXT, allowNull: false },
    is_read: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  },
  { tableName: "support_messages", timestamps: true, indexes: [{ fields: ["user_id"] }] }
);

export default SupportMessage;
