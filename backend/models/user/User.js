import { DataTypes } from "sequelize";
import { sequelize } from "../../config/db.js";

const User = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    name: { type: DataTypes.STRING(120), allowNull: false },
    email: { type: DataTypes.STRING(160), allowNull: false, unique: true },
    password: { type: DataTypes.STRING(255), allowNull: false },
    phone: { type: DataTypes.STRING(20), allowNull: true },
    birthdate: { type: DataTypes.DATEONLY, allowNull: true },
    gender: { type: DataTypes.ENUM("male", "female"), allowNull: true },
    avatar: { type: DataTypes.STRING(255), allowNull: true },
    wallet_balance: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    loyalty_points: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    preferred_lang: {
      type: DataTypes.ENUM("ar", "en"),
      allowNull: false,
      defaultValue: "ar",
    },
    is_verified: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    is_banned: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false }, // حظر دائم
    banned_until: { type: DataTypes.DATE, allowNull: true }, // حظر مؤقت ينتهي تلقائيًا
    ban_reason: { type: DataTypes.STRING(255), allowNull: true },
    is_demo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false }, // حساب تجريبي
  },
  {
    tableName: "users",
    timestamps: true,
  }
);

// حالة الحظر الفعلية (دائم أو مؤقت لم ينتهِ بعد)
User.prototype.banStatus = function () {
  const tempActive = this.banned_until && new Date(this.banned_until) > new Date();
  const active = this.is_banned || !!tempActive;
  return {
    active,
    permanent: !!this.is_banned,
    until: tempActive ? this.banned_until : null,
    reason: active ? this.ban_reason || null : null,
  };
};

// نسخة آمنة بدون كلمة المرور للإرجاع للـ frontend
User.prototype.toSafeJSON = function () {
  const { password, ...safe } = this.toJSON();
  safe.ban = this.banStatus();
  return safe;
};

export default User;
