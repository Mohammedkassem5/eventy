import { DataTypes } from "sequelize";
import { sequelize } from "../../config/db.js";

const Seat = sequelize.define(
  "Seat",
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    event_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    ticket_category_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    row_label: { type: DataTypes.STRING(8), allowNull: false }, // A, B, C...
    seat_number: { type: DataTypes.INTEGER, allowNull: false }, // 1..n
    seat_code: { type: DataTypes.STRING(16), allowNull: false }, // A1
    status: {
      type: DataTypes.ENUM("available", "held", "booked"),
      allowNull: false,
      defaultValue: "available",
    },
    x: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    y: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  },
  {
    tableName: "seats",
    timestamps: true,
    indexes: [{ fields: ["event_id", "ticket_category_id"] }],
  }
);

export default Seat;
