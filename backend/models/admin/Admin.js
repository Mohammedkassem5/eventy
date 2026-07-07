import { DataTypes } from "sequelize";
import { sequelize } from "../../config/db.js";

// حساب لوحة التحكم — منفصل تمامًا عن عملاء الموقع (users)
const Admin = sequelize.define(
  "Admin",
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(120), allowNull: false },
    email: { type: DataTypes.STRING(160), allowNull: false, unique: true },
    password: { type: DataTypes.STRING(255), allowNull: false },
    admin_role_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true }, // دور الصلاحيات
    avatar: { type: DataTypes.STRING(255), allowNull: true },
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }, // تعطيل بدل الحذف
    is_demo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false }, // حساب تجريبي — تغييراته مؤقتة
    last_login_at: { type: DataTypes.DATE, allowNull: true },
  },
  { tableName: "admins", timestamps: true }
);

Admin.prototype.toSafeJSON = function () {
  const { password, ...safe } = this.toJSON();
  return safe;
};

export default Admin;
