require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const dns = require("node:dns");
const dbConnection = require("./configuration/dbConnection.js");
const routes = require("./routes");

const app = express();
const PORT = process.env.PORT || 8000;

dns.setServers(["8.8.8.8", "1.1.1.1"]);

app.use(
  cors({
    origin: process.env.CLIENT_URL || true,
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

dbConnection();
app.use(routes);
app.use("/uploads", express.static("uploads"));

app.get("/", function (req, res) {
  res.send("ERP Application");
});

app.listen(PORT, () => {
  console.log(`server is running on http://localhost:${PORT}`);
});
