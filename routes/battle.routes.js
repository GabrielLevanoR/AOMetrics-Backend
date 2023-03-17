const express = require("express");
const CONTROLLER = require("../controllers/battle.controller");
const router = express.Router();

router.get("/", CONTROLLER.getBattles);
router.get("/battle/:id", CONTROLLER.getBattle);
router.get("/multilog/:ids", CONTROLLER.getMultiLog);
router.get("/top-fame", CONTROLLER.getTopFameBattles);
module.exports = router;
