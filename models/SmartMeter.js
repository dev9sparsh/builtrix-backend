const { DataTypes } = require("sequelize");
const sequelize = require("../db");

const SmartMeter = sequelize.define("SmartMeter", {
  timestamp: DataTypes.DATE,
  active_energy: DataTypes.FLOAT,
  cpe: DataTypes.STRING,
});

module.exports = SmartMeter;
