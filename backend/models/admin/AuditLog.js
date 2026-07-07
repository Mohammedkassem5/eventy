import { DataTypes } from "sequelize";
import { sequelize } from "../../config/db.js";

// سجل تدقيق — كل إجراء حسّاس يقوم به مشرف
const AuditLog = sequelize.define(
  "AuditLog",
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    admin_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    admin_name: { type: DataTypes.STRING(120), allowNull: true }, // لقطة الاسم
    action: { type: DataTypes.STRING(60), allowNull: false }, // مثل admin.create
    target: { type: DataTypes.STRING(160), allowNull: true }, // وصف الهدف
    meta: { type: DataTypes.JSON, allowNull: true },
  },
  { tableName: "audit_logs", timestamps: true, indexes: [{ fields: ["admin_id"] }, { fields: ["action"] }] }
);

export default AuditLog;
