import { DataTypes } from "sequelize";
import { sequelize } from "../../config/db.js";

const Category = sequelize.define(
  "Category",
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    name_ar: { type: DataTypes.STRING(120), allowNull: false },
    name_en: { type: DataTypes.STRING(120), allowNull: false },
    slug: { type: DataTypes.STRING(140), allowNull: false, unique: true },
    icon: { type: DataTypes.STRING(20), allowNull: true }, // emoji اختياري
    image: { type: DataTypes.STRING(255), allowNull: true }, // صورة الكارت
    sort_order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  {
    tableName: "categories",
    timestamps: true,
  }
);

export default Category;
