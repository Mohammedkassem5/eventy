import { DataTypes } from "sequelize";
import { sequelize } from "../../config/db.js";

const TicketCategory = sequelize.define(
  "TicketCategory",
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    event_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    name: { type: DataTypes.STRING(120), allowNull: false }, // VIP / عادي / C7 ...
    price: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    color_hex: { type: DataTypes.STRING(9), allowNull: true, defaultValue: "#f75200" },
    rows_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    cols_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    total_seats: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    available_seats: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    sort_order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    zone: { type: DataTypes.JSON, allowNull: true }, // موضع المنطقة على صورة المخطط {x,y,w,h} نسبة مئوية
    points_reward: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: "النقاط التي يكسبها المستخدم عند حجز مقعد في هذه الفئة",
    },
  },
  { tableName: "ticket_categories", timestamps: true }
);

export default TicketCategory;
