import { DataTypes } from "sequelize";
import { sequelize } from "../../config/db.js";

const AdminRole = sequelize.define(
  "AdminRole",
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(80), allowNull: false, unique: true },
    permissions: { type: DataTypes.JSON, allowNull: false, defaultValue: [] }, // ["events.manage", ...] أو ["*"]
    is_system: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false }, // Owner — لا يُحذف/يُعدّل
  },
  { tableName: "admin_roles", timestamps: true }
);

export default AdminRole;
