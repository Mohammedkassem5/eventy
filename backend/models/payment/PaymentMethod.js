import { DataTypes } from "sequelize";
import { sequelize } from "../../config/db.js";

const PaymentMethod = sequelize.define(
  "PaymentMethod",
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    key: { type: DataTypes.STRING(40), allowNull: false, unique: true }, // card / fawry / wallet ...
    name_ar: { type: DataTypes.STRING(80), allowNull: false },
    icon: { type: DataTypes.STRING(20), allowNull: true }, // emoji
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    sort_order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  },
  { tableName: "payment_methods", timestamps: true }
);

export default PaymentMethod;
