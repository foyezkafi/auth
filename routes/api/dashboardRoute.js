const express = require("express");
const router = express.Router();
const authMiddleware = require("../../middleware/authMiddleware");
const dashboarController = require("../../controllers/dashboardController")



router.get("/allusers", authMiddleware, dashboarController.getalluserController);


module.exports = router;