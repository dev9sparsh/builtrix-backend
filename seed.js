// const fs = require("fs");
// const csv = require("csv-parser");
// const sequelize = require("./db");
// const Metadata = require("./models/Metadata");
// const SmartMeter = require("./models/SmartMeter");
// const EnergyBreakdown = require("./models/EnergyBreakdown");
// const moment = require("moment");

// const BATCH_SIZE = 5000; // Adjust if needed

// // const parseExcelTimestamp = (value) => {
// //   if (!value) return null;

// //   if (value instanceof Date && !isNaN(value)) return value;

// //   if (!isNaN(value) && String(value).indexOf("-") === -1 && String(value).indexOf("/") === -1) {
// //     const excelEpoch = new Date(1899, 11, 30);
// //     const days = Math.floor(value);
// //     const msPerDay = 86400000;
// //     const timePortion = (value - days) * msPerDay;
// //     return new Date(excelEpoch.getTime() + days * msPerDay + timePortion);
// //   }

// //   if (typeof value === "string") {
// //     const str = value.trim().replace(/\./g, "-").replace(/\//g, "-");
// //     const match = str.match(/^(\d{1,2})-(\d{1,2})-(\d{4})(?:\s+(\d{1,2}):(\d{2}))?$/);
// //     if (match) {
// //       const [, dd, mm, yyyy, hh = "00", min = "00"] = match;
// //       return new Date(`${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}T${hh.padStart(2, "0")}:${min}:00Z`);
// //     }
// //     const d = new Date(str);
// //     if (!isNaN(d)) return d;
// //   }

// //   return null;
// // };

// function parseExcelDate(value) {
//   if (!value) return null;

//   // Case 1: Value is an Excel serial date number (right aligned)
//   if (typeof value === "number") {
//     // Excel stores days since 1899-12-30
//     const jsDate = new Date(Math.round((value - 25569) * 86400 * 1000));
//     return jsDate.toISOString();
//   }

//   // Case 2: Value is a string (left aligned)
//   if (typeof value === "string") {
//     // Try parsing DD-MM-YYYY HH:mm format
//     const parsed = moment(value, ["DD-MM-YYYY HH:mm", "MM-DD-YYYY HH:mm"], true);
//     if (parsed.isValid()) {
//       return parsed.toDate().toISOString();
//     }
//   }

//   return null; // Fallback if unparseable
// }


// async function seedTableInBatches(Model, filePath, mapper) {
//   return new Promise((resolve, reject) => {
//     let batch = [];
//     let totalInserted = 0;

//     const insertBatch = async () => {
//       if (batch.length > 0) {
//         await Model.bulkCreate(batch, { ignoreDuplicates: true });
//         totalInserted += batch.length;
//         batch = [];
//         console.log(`Inserted ${totalInserted} rows into ${Model.name}...`);
//       }
//     };

//     const stream = fs.createReadStream(filePath)
//       .pipe(csv({ mapHeaders: ({ header }) => header.trim().toLowerCase() }))
//       .on("data", (row) => {
//         batch.push(mapper(row));
//         if (batch.length >= BATCH_SIZE) {
//           stream.pause();
//           insertBatch().then(() => stream.resume());
//         }
//       })
//       .on("end", async () => {
//         await insertBatch();
//         console.log(`✅ Finished seeding ${Model.name} (${totalInserted} rows)`);
//         resolve();
//       })
//       .on("error", reject);
//   });
// }

// (async () => {
//   await sequelize.sync({ force: true });

//   await seedTableInBatches(Metadata, "./csv/metadata.csv", (row) => ({
//     cpe: row.cpe,
//     name: row.name,
//     fulladdress: row.fulladdress,
//     lat: row.lat,
//     lon: row.lon,
//     totalarea: row.totalarea,
//   }));

//   await seedTableInBatches(SmartMeter, "./csv/smart_meter.csv", (row) => ({
//     timestamp: parseExcelTimestamp(row.timestamp),
//     active_energy: row.active_energy,
//     cpe: row.cpe
//   }));

//   await seedTableInBatches(EnergyBreakdown, "./csv/energy_source_breakdown.csv", (row) => ({
//     timestamp: parseExcelTimestamp(row.timestamp),
//     renewable_biomass: row.renewable_biomass,
//     renewable_hydro: row.renewable_hydro,
//     renewable_solar: row.renewable_solar,
//     renewable_wind: row.renewable_wind,
//     renewable_geothermal: row.renewable_geothermal,
//     renewable_otherrenewable: row.renewable_otherrenewable,
//     renewable: row.renewable,
//     nonrenewable_coal: row.nonrenewable_coal,
//     nonrenewable_gas: row.nonrenewable_gas,
//     nonrenewable_nuclear: row.nonrenewable_nuclear,
//     nonrenewable_oil: row.nonrenewable_oil,
//     nonrenewable: row.nonrenewable,
//     hydropumpedstorage: row.hydropumpedstorage,
//     unknown: row.unknown,
//   }));

//   console.log("🚀 All CSVs seeded successfully");
//   process.exit();
// })();
const fs = require("fs");
const csv = require("csv-parser");
const sequelize = require("./db");
const Metadata = require("./models/Metadata");
const SmartMeter = require("./models/SmartMeter");
const EnergyBreakdown = require("./models/EnergyBreakdown");
const moment = require("moment");

const BATCH_SIZE = 5000; // Tune if needed

function parseExcelDate(value) {
  if (!value) return null;

  // Case 1: Excel serial number (right-aligned date in Excel)
  if (!isNaN(value) && typeof value === "number") {
    const jsDate = new Date(Math.round((value - 25569) * 86400 * 1000));
    return jsDate.toISOString();
  }

  // Case 2: String date (left-aligned)
  if (typeof value === "string") {
    const trimmed = value.trim();
    const parsed = moment(trimmed, ["DD-MM-YYYY HH:mm", "MM-DD-YYYY HH:mm"], true);
    if (parsed.isValid()) {
      return parsed.toDate().toISOString();
    }
  }

  console.warn("⚠️ Invalid timestamp format:", value);
  return null;
}

async function seedTableInBatches(Model, filePath, mapper) {
  return new Promise((resolve, reject) => {
    let batch = [];
    let totalInserted = 0;

    const insertBatch = async () => {
      if (batch.length > 0) {
        await Model.bulkCreate(batch, { ignoreDuplicates: true });
        totalInserted += batch.length;
        batch = [];
        console.log(`Inserted ${totalInserted} rows into ${Model.name}...`);
      }
    };

    const stream = fs.createReadStream(filePath)
      .pipe(csv({
        mapHeaders: ({ header }) => header.trim().toLowerCase()
      }))
      .on("data", (row) => {
        batch.push(mapper(row));
        if (batch.length >= BATCH_SIZE) {
          stream.pause();
          insertBatch().then(() => stream.resume());
        }
      })
      .on("end", async () => {
        await insertBatch();
        console.log(`✅ Finished seeding ${Model.name} (${totalInserted} rows)`);
        resolve();
      })
      .on("error", reject);
  });
}

(async () => {
  await sequelize.sync({ force: true });

  await seedTableInBatches(Metadata, "./csv/metadata.csv", (row) => ({
    cpe: row.cpe?.trim() || null,
    name: row.name?.trim() || null,
    fulladdress: row.fulladdress?.trim() || null,
    lat: parseFloat(row.lat) || null,
    lon: parseFloat(row.lon) || null,
    totalarea: parseInt(row.totalarea) || null,
  }));

  await seedTableInBatches(SmartMeter, "./csv/smart_meter.csv", (row) => ({
    timestamp: parseExcelDate(row.timestamp),
    active_energy: parseFloat(row.active_energy) || 0,
    cpe: row.cpe?.trim() || null
  }));

  await seedTableInBatches(EnergyBreakdown, "./csv/energy_source_breakdown.csv", (row) => ({
    timestamp: parseExcelDate(row.timestamp),
    renewable_biomass: parseFloat(row.renewable_biomass) || 0,
    renewable_hydro: parseFloat(row.renewable_hydro) || 0,
    renewable_solar: parseFloat(row.renewable_solar) || 0,
    renewable_wind: parseFloat(row.renewable_wind) || 0,
    renewable_geothermal: parseFloat(row.renewable_geothermal) || 0,
    renewable_otherrenewable: parseFloat(row.renewable_otherrenewable) || 0,
    renewable: parseFloat(row.renewable) || 0,
    nonrenewable_coal: parseFloat(row.nonrenewable_coal) || 0,
    nonrenewable_gas: parseFloat(row.nonrenewable_gas) || 0,
    nonrenewable_nuclear: parseFloat(row.nonrenewable_nuclear) || 0,
    nonrenewable_oil: parseFloat(row.nonrenewable_oil) || 0,
    nonrenewable: parseFloat(row.nonrenewable) || 0,
    hydropumpedstorage: parseFloat(row.hydropumpedstorage) || 0,
    unknown: parseFloat(row.unknown) || 0,
  }));

  console.log("🚀 All CSVs seeded successfully");
  process.exit();
})();
