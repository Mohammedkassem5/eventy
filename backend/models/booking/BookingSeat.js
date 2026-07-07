import { DataTypes } from "sequelize";
import { sequelize } from "../../config/db.js";

const BookingSeat = sequelize.define(
  "BookingSeat",
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    booking_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    seat_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    seat_code: { type: DataTypes.STRING(16), allowNull: false },
    price: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
  },
  { tableName: "booking_seats", timestamps: true }
);

export default BookingSeat;
