const express = require("express");
const CONTROLLER = require("../controllers/topGuilds.controller");
const router = express.Router();

router.get("/", CONTROLLER.getTopGuilds);

module.exports = router;
