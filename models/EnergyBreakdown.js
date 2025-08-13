const { DataTypes } = require("sequelize");
const sequelize = require("../db");

const EnergyBreakdown = sequelize.define("EnergyBreakdown", {
  timestamp: DataTypes.DATE,
  renewable_biomass: DataTypes.FLOAT,
  renewable_hydro: DataTypes.FLOAT,
  renewable_solar: DataTypes.FLOAT,
  renewable_wind: DataTypes.FLOAT,
  renewable_geothermal:DataTypes.INTEGER,
  renewable_otherrenewable: DataTypes.FLOAT,
  renewable: DataTypes.FLOAT,
  nonrenewable_coal: DataTypes.FLOAT,
  nonrenewable_gas: DataTypes.FLOAT,
  nonrenewable_nuclear: DataTypes.FLOAT,
  nonrenewable_oil: DataTypes.FLOAT,
  nonrenewable: DataTypes.FLOAT,
  hydropumpedstorage: DataTypes.FLOAT,
  unknown: DataTypes.STRING
});

module.exports = EnergyBreakdown;
