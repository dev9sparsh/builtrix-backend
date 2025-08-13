const express = require("express");
const jwt = require("jsonwebtoken");
const Metadata = require("./models/Metadata");
const SmartMeter = require("./models/SmartMeter");
const EnergyBreakdown = require("./models/EnergyBreakdown");
const { fn, col, literal, Op } = require("sequelize");
const cors = require('cors');
const app = express();
const sequelize = require("./db");
app.use(express.json());



app.use(cors());

const SECRET = "secret123";

// Login route
app.post("/login", (req, res) => {
    const { username, password } = req.body;
    if (username === "test" && password === "test") {
        const token = jwt.sign({ user: username, email: "test@email.com", firtname: "Test First", lastname: "Test Last" }, SECRET, { expiresIn: "1h" });
        res.json({ token });
    } else {
        res.status(401).json({ error: "Invalid credentials" });
    }
});

// Middleware to check token
function auth(req, res, next) {
    const header = req.headers.authorization;
    if (!header) return res.status(401).json({ error: "No token" });
    const token = header.split(" ")[1];
    try {
        jwt.verify(token, SECRET);
        next();
    } catch {
        res.status(401).json({ error: "Invalid token" });
    }
}

// Metadata
app.get("/metadata", async (req, res) => {
    const data = await Metadata.findAll();
    res.json(data);
});



app.get("/energy/monthly", auth, async (req, res) => {
    try {
        const data = await SmartMeter.findAll({
            attributes: [
                [fn("strftime", "%Y-%m", col("timestamp")), "month"],
                [fn("SUM", col("active_energy")), "total_energy"]
            ],
            group: [fn("strftime", "%Y-%m", col("timestamp"))],
            order: [[literal("month"), "ASC"]]
        });

        res.json(data);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});


// Monthly aggregation for a given year + buildingId
app.get("/energy/monthlyyear", async (req, res) => {
    try {
        const { year, buildingId } = req.query;

        // 1. Find metadata record for given buildingId
        const metadata = await Metadata.findByPk(buildingId, {
            attributes: ["cpe"]
        });

        if (!metadata) {
            return res.status(404).json({ error: "Building not found" });
        }

        // 2. Query SmartMeter by cpe
        const data = await SmartMeter.findAll({
            attributes: [
                [fn("strftime", "%m", col("timestamp")), "name"],
                [fn("SUM", col("active_energy")), "value"]
            ],
            where: {
                cpe: metadata.cpe,
                [Op.and]: literal(`strftime('%Y', timestamp) = '${year}'`)
            },
            group: ["name"],
            order: [[literal("name"), "ASC"]],
            raw: true
        });

        res.json(data);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Daily aggregation for a given month/year + buildingId
app.get("/energy/daily", async (req, res) => {
    try {
        const { year, month, buildingId } = req.query;

        // 1. Find CPE for given buildingId
        const metadata = await Metadata.findByPk(buildingId, {
            attributes: ["cpe"]
        });

        if (!metadata) {
            return res.status(404).json({ error: "Building not found" });
        }

        // 2. Query SmartMeter by cpe + date parts
        const data = await SmartMeter.findAll({
            attributes: [
                [fn("strftime", "%d", col("timestamp")), "name"],
                [fn("SUM", col("active_energy")), "value"]
            ],
            where: {
                cpe: metadata.cpe,
                [Op.and]: literal(`
          strftime('%Y', timestamp) = '${year}' AND
          strftime('%m', timestamp) = '${month}'
        `)
            },
            group: ["name"],
            order: [[literal("name"), "ASC"]],
            raw: true
        });

        res.json(data);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

app.get("/energy/15min", async (req, res) => {
    try {
        const { date, buildingId } = req.query;

        // 1. Find CPE for given buildingId
        const metadata = await Metadata.findByPk(buildingId, {
            attributes: ["cpe"]
        });

        if (!metadata) {
            return res.status(404).json({ error: "Building not found" });
        }

        // 2. Query SmartMeter for 15-min intervals
        const data = await SmartMeter.findAll({
            attributes: [
                [
                    literal(`
            strftime('%Y-%m-%d %H:', timestamp) ||
            printf('%02d', (CAST(strftime('%M', timestamp) AS INTEGER) / 15) * 15)
          `),
                    "name"
                ],
                [fn("SUM", col("active_energy")), "value"]
            ],
            where: {
                cpe: metadata.cpe,
                [Op.and]: literal(`strftime('%Y-%m-%d', timestamp) = '${date}'`)
            },
            group: [
                literal(`
          strftime('%Y-%m-%d %H:', timestamp) ||
          printf('%02d', (CAST(strftime('%M', timestamp) AS INTEGER) / 15) * 15)
        `)
            ],
            order: [[literal("name"), "ASC"]],
            raw: true
        });

        res.json(data);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});


app.get("/energy/breakdown", async (req, res) => {
    try {
        const { year, month, date } = req.query;



        // 2. Build dynamic date filter
        const whereClauses = [`strftime('%Y', timestamp) = '${year}'`];
        if (month) whereClauses.push(`strftime('%m', timestamp) = '${month}'`);
        if (date) whereClauses.push(`strftime('%Y-%m-%d', timestamp) = '${date}'`);

        // 3. Query EnergyBreakdown with CPE + date filter
        const data = await EnergyBreakdown.findAll({
            attributes: [
                [fn("SUM", col("renewable_biomass")), "renewable_biomass"],
                [fn("SUM", col("renewable_hydro")), "renewable_hydro"],
                [fn("SUM", col("renewable_solar")), "renewable_solar"],
                [fn("SUM", col("renewable_wind")), "renewable_wind"],
                [fn("SUM", col("renewable_geothermal")), "renewable_geothermal"],
                [fn("SUM", col("renewable_otherrenewable")), "renewable_otherrenewable"],
                [fn("SUM", col("renewable")), "renewable"],
                [fn("SUM", col("nonrenewable_coal")), "nonrenewable_coal"],
                [fn("SUM", col("nonrenewable_gas")), "nonrenewable_gas"],
                [fn("SUM", col("nonrenewable_nuclear")), "nonrenewable_nuclear"],
                [fn("SUM", col("nonrenewable_oil")), "nonrenewable_oil"],
                [fn("SUM", col("nonrenewable")), "nonrenewable"],
                [fn("SUM", col("hydropumpedstorage")), "hydropumpedstorage"],
                [fn("SUM", col("unknown")), "unknown"]
            ],
            where: {
                [Op.and]: [
                    sequelize.where(sequelize.fn('strftime', '%Y', col('timestamp')), year),
                    month ? sequelize.where(sequelize.fn('strftime', '%m', col('timestamp')), month) : {},
                    date ? sequelize.where(sequelize.fn('strftime', '%Y-%m-%d', col('timestamp')), date) : {}
                ]
            },
            raw: true
        });

        res.json(data[0] || {}); // Always return an object, even if empty
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});
app.listen(4000, () => console.log("Backend running on port 4000"));
