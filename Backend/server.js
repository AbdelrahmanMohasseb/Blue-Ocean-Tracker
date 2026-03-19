const express = require("express");
const sequelize = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const shipmentRoutes = require("./routes/shipmentRoutes");

const app = express();
app.use(express.json());
const cors = require("cors");
app.use(cors());


// Routes
app.use("/api/auth", authRoutes);
app.use("/api/shipments", shipmentRoutes);

sequelize.sync({ alter: true })
  .then(() => console.log(" Database synced"))
  .catch(err => console.error("DB Error:", err));

const PORT = 5000;
app.listen(PORT, () => console.log(` Server running on port ${PORT}`));
