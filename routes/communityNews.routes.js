const express = require("express");
const CONTROLLER = require("../controllers/communityNews.controller");
const router = express.Router();

router.get("/", CONTROLLER.getNews);

module.exports = router;
