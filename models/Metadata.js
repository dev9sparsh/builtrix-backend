const { DataTypes } = require("sequelize");
const sequelize = require("../db");

const Metadata = sequelize.define("Metadata", {
  cpe: DataTypes.STRING,
  name: DataTypes.STRING,
  fulladdress: DataTypes.STRING,
  lat: DataTypes.FLOAT,
  lon: DataTypes.FLOAT,
  totalarea: DataTypes.INTEGER
});

module.exports = Metadata;
