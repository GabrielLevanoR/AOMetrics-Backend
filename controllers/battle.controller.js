const Battle = require("../models/battle.model");
const BattleQueue = require("../models/battleQueue.model");
const axios = require("axios");
const schedule = require("node-schedule");
const moment = require("moment");
const chalk = require("chalk");

const {
  BATTLE_WEST_ROOT_URL,
  BATTLE_EAST_ROOT_URL,
} = require("../util/constants");
const BATTLES_LIMIT = 50;
const BATTLES_SORT = "recent";
const { saveBattle } = require("../util/functions/battle.functions");

exports.getBattles = async (req, res) => {
  const query = req.query;
  let queryOptions = {};

  if (query.largeOnly === "true") {
    queryOptions.totalKills = { $gte: 20 };
    queryOptions.totalFame = { $gte: 1000000 };
  }
  if (query.search) {
    queryOptions["$or"] = [
      { "alliances.list": { $regex: query.search, $options: "i" } },
      { "guilds.list": { $regex: query.search, $options: "i" } },
      { "players.list": { $regex: query.search, $options: "i" } },
    ];
    if (!Number.isNaN(parseInt(query.search))) {
      queryOptions["$or"].push({ id: parseInt(query.search) });
    }
  }
  if (query.server) {
    queryOptions["server"] = { $in: query.server };
  }
  try {
    let battles = await Battle.paginate(queryOptions, {
      select:
        "id startTime guilds.list endTime totalKills alliances.list totalFame players.list server",
      sort: { startTime: "desc" },
      limit: 20,
      offset: parseInt(query.offset),
    });

    return res.status(200).json(battles);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: err.message });
  }
};

exports.getTopFameBattles = async (req, res) => {
  const query = req.query;
  let queryOptions = {};

  if (query.server) {
    queryOptions["server"] = { $in: query.server };
  }

  try {
    let battles = await Battle.paginate(queryOptions, {
      select:
        "id startTime guilds.list endTime totalKills alliances.list totalFame players.list server",
      sort: { totalFame: -1 },
      limit: 20,
      offset: parseInt(query.offset),
    });

    return res.status(200).json(battles);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: err.message });
  }
};

exports.getBattle = async (req, res) => {
  try {
    const battleID = req.params.id;
    const battleDB = await Battle.findOne({ id: battleID }).select("-history");
    if (battleDB !== null) {
      return res.status(200).json(battleDB);
    } else {
      const battle = await saveBattle(req.params.id);
      return res.status(200).json(battle);
    }
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.getMultiLog = async (req, res) => {
  try {
    const ids = req.params.ids.split(",");
    let main = null;
    let battles = [];
    await (async function () {
      for (var i = 0; i < ids.length; i++) {
        const battleID = ids[i].trim();
        const battle = await Battle.findOne({ id: battleID }).select(
          "-history"
        );
        if (battle !== null) {
          if (i === 0) {
            main = battle;
          } else {
            battles.push(battle);
          }
        }
      }
    })();

    if (main === null) {
      return res.status(400).json({ message: "invalid battle IDs" });
    }

    if (battles.length < 1) {
      return res.status(200).json(main);
    }

    let combinedalliances = {};
    let combinedguilds = {};
    let combinedplayers = {};

    main.alliances.alliances.forEach((a) => {
      combinedalliances[a.id] = a;
      combinedalliances[a.id].count = 1;
      combinedalliances[a.id].totalPlayers = 0;
    });

    main.guilds.guilds.forEach((g) => {
      combinedguilds[g.id] = g;
      combinedguilds[g.id].count = 1;
      combinedguilds[g.id].totalPlayers = 0;
    });

    main.players.players.forEach((p) => {
      combinedplayers[p.id] = p;
      combinedplayers[p.id].count = 1;
    });

    battles.forEach((b) => {
      main.totalKills += b.totalKills;
      main.totalFame += b.totalFame;
      b.alliances.alliances.forEach((a) => {
        if (combinedalliances[a.id]) {
          combinedalliances[a.id].count += 1;
          combinedalliances[a.id].kills += a.kills;
          combinedalliances[a.id].deaths += a.deaths;
          combinedalliances[a.id].killFame += a.killFame;
          combinedalliances[a.id].totalDamage += a.totalDamage;
          combinedalliances[a.id].totalHealing += a.totalHealing;
          combinedalliances[a.id].averageIp += a.averageIp;
        } else {
          combinedalliances[a.id] = a;
          combinedalliances[a.id].count = 1;
          combinedalliances[a.id].totalPlayers = 0;
        }
      });

      b.guilds.guilds.forEach((g) => {
        console.log(g);
        if (combinedguilds[g.id]) {
          combinedguilds[g.id].count += 1;
          combinedguilds[g.id].kills += g.kills;
          combinedguilds[g.id].deaths += g.deaths;
          combinedguilds[g.id].killFame += g.killFame;
          combinedguilds[g.id].averageIp += g.averageIp;
        } else {
          combinedguilds[g.id] = g;
          combinedguilds[g.id].count = 1;
          combinedguilds[g.id].totalPlayers = 0;
        }
      });
      b.players.players.forEach((p) => {
        if (combinedplayers[p.id]) {
          combinedplayers[p.id].count += 1;
          combinedplayers[p.id].kills += p.kills;
          combinedplayers[p.id].deaths += p.deaths;
          combinedplayers[p.id].killFame += p.killFame;
          combinedplayers[p.id].totalDamage += p.totalDamage;
          combinedplayers[p.id].totalHealing += p.totalHealing;
          combinedplayers[p.id].totalKillContribution +=
            p.totalKillContribution;
          combinedplayers[p.id].ip += p.ip;
        } else {
          combinedplayers[p.id] = p;
        }
      });

      if (
        b.highestDamagePlayer.players[0].totalDamage >
        main.highestDamagePlayer.players[0].totalDamage
      ) {
        main.highestDamagePlayer = b.highestDamagePlayer;
      }

      if (
        b.highestAssists.players[0].totalKillContribution >
        main.highestAssists.players[0].totalKillContribution
      ) {
        main.highestAssists = b.highestAssists;
      }

      if (
        b.highestHealingPlayer.players[0].totalHealing >
        main.highestHealingPlayer.players[0].totalHealing
      ) {
        main.highestHealingPlayer = b.highestHealingPlayer;
      }

      if (
        b.highestKillsPlayer.players[0].kills >
        main.highestKillsPlayer.players[0].kills
      ) {
        main.highestKillsPlayer = b.highestKillsPlayer;
      }

      if (
        b.mostExpensiveDeath.player.DeathFame >
        main.mostExpensiveDeath.player.DeathFame
      ) {
        main.mostExpensiveDeath = b.mostExpensiveDeath;
      }
    });

    main.alliances.alliances = [];
    main.guilds.guilds = [];
    main.players.players = [];

    Object.keys(combinedplayers).forEach((pid) => {
      combinedplayers[pid].ip = Math.round(
        combinedplayers[pid].ip / combinedplayers[pid].count
      );
      main.players.players.push(combinedplayers[pid]);
    });

    main.players.players.forEach((p) => {
      if (combinedalliances[p.allianceId]) {
        combinedalliances[p.allianceId].totalPlayers += 1;
      }
      if (combinedguilds[p.guildId]) {
        combinedguilds[p.guildId].totalPlayers += 1;
      }
    });

    Object.keys(combinedalliances).forEach((aid) => {
      combinedalliances[aid].averageIp = Math.round(
        combinedalliances[aid].averageIp / combinedalliances[aid].count
      );
      main.alliances.alliances.push(combinedalliances[aid]);
    });

    Object.keys(combinedguilds).forEach((gid) => {
      combinedguilds[gid].averageIp = Math.round(
        combinedguilds[gid].averageIp / combinedguilds[gid].count
      );
      main.guilds.guilds.push(combinedguilds[gid]);
    });

    main.totalPlayers = main.players.players.length;
    return res.status(200).json(main);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/**
 *
 */

if (
  process.env.NODE_ENV !== "dev" &&
  process.env.NODE_ENV !== "GENERATE_ITEMS"
) {
  schedule.scheduleJob("* * * * *", async () => {
    try {
      let queued = await BattleQueue.find()
        .sort({ date_created: -1 })
        .limit(500);
      await (async () => {
        for (let i = 0; i < queued.length; i++) {
          const battle = queued[i];
          let savedBattle = await Battle.findOne({ id: battle.id }).select(
            "id"
          );
          if (!savedBattle) {
            await saveBattle(battle.id, battle.server);
          } else {
            BattleQueue.findOneAndRemove({ id: battle.id }).then(() => {});
          }
        }
      })();
    } catch (error) {
      console.log(error.message);
    }
  });
  schedule.scheduleJob("*/2 * * * *", async () => {
    try {
      let gathered = 0;
      let offset = 0;
      while (gathered < 200) {
        /**        console.log(
          `Gathering west battles with offset: ${chalk.magenta(offset)}`
        ); */
        const { data } = await axios.get(BATTLE_WEST_ROOT_URL, {
          params: {
            offset: offset,
            limit: 51,
            sort: BATTLES_SORT,
            timestamp: moment().unix(),
          },
          timeout: 120000,
        });
        await (async () => {
          for (var i = 0; i < data.length; i++) {
            let battle = data[i];
            const parsed = await Battle.findOne({ id: battle.id });
            if (parsed) {
              gathered += 1;
            } else {
              const queued = await BattleQueue.findOne({ id: battle.id });
              if (queued) {
                gathered += 1;
              } else {
                console.log(`Battle ${chalk.green(battle.id)} added to queue`);
                let newQueue = new BattleQueue({
                  id: battle.id,
                  server: "west",
                });
                await newQueue.save();
              }
            }
          }
        })();
        /**console.log(gathered); */
        offset += BATTLES_LIMIT;
      }
    } catch (err) {
      console.log(err.message);
    }
  });

  schedule.scheduleJob("*/2 * * * *", async () => {
    try {
      let gathered = 0;
      let offset = 0;
      while (gathered < 200) {
        /**        console.log(
          `Gathering east battles with offset: ${chalk.magenta(offset)}`
        ); */
        const { data } = await axios.get(BATTLE_EAST_ROOT_URL, {
          params: {
            offset: offset,
            limit: 51,
            sort: BATTLES_SORT,
            timestamp: moment().unix(),
          },
          timeout: 120000,
        });
        await (async () => {
          for (var i = 0; i < data.length; i++) {
            let battle = data[i];
            const parsed = await Battle.findOne({ id: battle.id });
            if (parsed) {
              gathered += 1;
            } else {
              const queued = await BattleQueue.findOne({ id: battle.id });
              if (queued) {
                gathered += 1;
              } else {
                let newQueue = new BattleQueue({
                  id: battle.id,
                  server: "east",
                });
                await newQueue.save();
              }
            }
          }
        })();
        offset += BATTLES_LIMIT;
      }
    } catch (err) {
      console.log(err.message);
    }
  });

  schedule.scheduleJob("*/20 * * * *", async () => {
    const mydate = moment().subtract(7, "days");
    try {
      await Battle.deleteMany().where("date_created").lte(mydate);
    } catch (err) {
      console.log(err.message);
    }
  });
}
