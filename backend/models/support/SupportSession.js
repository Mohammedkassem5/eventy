import { DataTypes } from "sequelize";
import { sequelize } from "../../config/db.js";

// جلسة محادثة دعم — تُفتح، تُغلق نهائيًا، ثم تُقيَّم
const SupportSession = sequelize.define(
  "SupportSession",
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    agent_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true }, // أول أدمن يردّ
    status: { type: DataTypes.ENUM("open", "closed"), allowNull: false, defaultValue: "open" },
    closed_by: { type: DataTypes.ENUM("user", "admin"), allowNull: true },
    closed_at: { type: DataTypes.DATE, allowNull: true },
    rating: { type: DataTypes.TINYINT, allowNull: true }, // 1..5
    rating_comment: { type: DataTypes.STRING(500), allowNull: true },
    rated_at: { type: DataTypes.DATE, allowNull: true },
  },
  { tableName: "support_sessions", timestamps: true, indexes: [{ fields: ["user_id"] }, { fields: ["agent_id"] }] }
);

export default SupportSession;
