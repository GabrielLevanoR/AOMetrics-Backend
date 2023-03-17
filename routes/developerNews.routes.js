const express = require("express");
const CONTROLLER = require("../controllers/developerNews.controller");
const router = express.Router();

router.get("/", CONTROLLER.getNews);

module.exports = router;
