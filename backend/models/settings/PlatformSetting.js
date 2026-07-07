import { DataTypes } from "sequelize";
import { sequelize } from "../../config/db.js";

const PlatformSetting = sequelize.define(
  "PlatformSetting",
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    key: { type: DataTypes.STRING(100), allowNull: false, unique: true },
    value: { type: DataTypes.STRING(255), allowNull: false },
    label_ar: { type: DataTypes.STRING(200), allowNull: true },
  },
  { tableName: "platform_settings", timestamps: true }
);

// helper: قراءة قيمة رقمية مع افتراضي
export async function getSettingNumber(key, fallback) {
  const s = await PlatformSetting.findOne({ where: { key } });
  return s ? Number(s.value) : fallback;
}

export default PlatformSetting;
