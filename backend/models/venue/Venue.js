import { DataTypes } from "sequelize";
import { sequelize } from "../../config/db.js";

const Venue = sequelize.define(
  "Venue",
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    name_ar: { type: DataTypes.STRING(160), allowNull: false },
    name_en: { type: DataTypes.STRING(160), allowNull: true },
    type: {
      type: DataTypes.ENUM("stadium", "theater", "hall", "arena", "open_air", "other"),
      allowNull: false,
      defaultValue: "other",
    },
    address: { type: DataTypes.STRING(300), allowNull: true },
    city: { type: DataTypes.STRING(80), allowNull: true },
    capacity: { type: DataTypes.INTEGER, allowNull: true },
    lat: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
    lng: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
    map_image: { type: DataTypes.STRING(255), allowNull: true }, // صورة المخطط الافتراضي للمكان
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    sort_order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  },
  { tableName: "venues", timestamps: true }
);

export default Venue;
