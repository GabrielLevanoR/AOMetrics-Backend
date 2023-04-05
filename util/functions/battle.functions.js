//const chalk = require("chalk");
const axios = require("axios");
const Battle = require("../../models/battle.model");
const BattleQueue = require("../../models/battleQueue.model");
const TopGuilds = require("../../models/topGuilds");

const moment = require("moment");

const { formatAlliances } = require("../functions/alliance.functions");
const { formatGuilds } = require("../functions/guild.functions");
const {
  formatPlayers,
  getHighestDamagePlayer,
  getHighestHealingPlayer,
  getHighestKillsPlayer,
  getHighestAssists,
  getMostExpensiveDeath,
} = require("../functions/player.functions");
const {
  BATTLE_WEST_ROOT_URL,
  BATTLE_EAST_ROOT_URL,
  BATTLE_WEST_HISTORY_URL,
  BATTLE_EAST_HISTORY_URL,
} = require("../constants");
const mongoose = require("mongoose");

exports.getDeathHistory = (history) => {
  let deathHistory = [];
  history.forEach((element) => {
    deathHistory.push({
      timeStamp: element.TimeStamp,
      totalVictimFame: element.TotalVictimKillFame,
      eventId: element.EventId,
      killer: {
        name: element.Killer.Name,
        allianceName: element.Killer.AllianceName,
        guildName: element.Killer.GuildName,
        equipment: element.Killer.Equipment,
      },
      victim: {
        name: element.Victim.Name,
        allianceName: element.Victim.AllianceName,
        guildName: element.Victim.GuildName,
        equipment: element.Victim.Equipment,
      },
    });
  });
  deathHistory.sort((a, b) => a.timeStamp - b.timeStamp);
  return deathHistory;
};

exports.getHistory = async (battle, url) => {
  try {
    let moreHistory = true;
    let offset = 0;
    let battleHistory = [];
    while (moreHistory) {
      const { data } = await axios.get(
        `${url}/${battle.id}?offset=${offset}&limit=51`,
        {
          timeout: 120000,
        }
      );
      if (data.length) {
        data.forEach((element) => {
          battleHistory.push(element);
        });
        offset = offset + 50;
      } else {
        moreHistory = false;
      }
    }
    battleHistory.sort((a, b) => a.TimeStamp - b.TimeStamp);
    return battleHistory;
  } catch (error) {
    console.log(error);
  }
};

exports.saveBattle = async (bid, server) => {
  try {
    let battle, serverURL;
    if (server === "west") {
      const response = await axios.get(`${BATTLE_WEST_ROOT_URL}/${bid}`);
      battle = response.data;
      serverURL = BATTLE_WEST_HISTORY_URL;
    } else {
      const response = await axios.get(`${BATTLE_EAST_ROOT_URL}/${bid}`);
      battle = response.data;
      serverURL = BATTLE_EAST_HISTORY_URL;
    }

    const history = await exports.getHistory(battle, serverURL);
    const players = formatPlayers(battle, history);
    const alliances = formatAlliances(battle, history, players);
    const guilds = formatGuilds(battle, history, players);

    const highestDamagePlayer = getHighestDamagePlayer(players);
    const highestHealingPlayer = getHighestHealingPlayer(players);
    const highestAssists = getHighestAssists(players);
    const highestKillsPlayer = getHighestKillsPlayer(players);
    const mostExpensiveDeath = getMostExpensiveDeath(history);
    const deathsHistory = exports.getDeathHistory(history);

    battle.players = players;
    battle.alliances = alliances;
    battle.guilds = guilds;
    battle.highestDamagePlayer = highestDamagePlayer;
    battle.highestKillsPlayer = highestKillsPlayer;
    battle.highestHealingPlayer = highestHealingPlayer;
    battle.highestAssists = highestAssists;
    battle.mostExpensiveDeath = mostExpensiveDeath;
    battle.date_created = Date.now();
    battle.history = deathsHistory;
    battle.server = server;

    let newBattle = new Battle(battle);

    await newBattle.save(async (err) => {
      if (err) {
        if (err.code === 11000) {
          BattleQueue.findOneAndRemove({ id: battle.id });
        }
      } else {
        if (battle.totalFame > 200000 && battle.players.players.length > 30) {
          const now = new Date();
          const halfHourAgo = new Date(now - 30 * 60 * 1000);
          for (const guild of guilds.guilds) {
            if (guild.totalPlayers > 10) {
              const topGuild = await TopGuilds.findOne({ id: guild.id });
              if (topGuild && topGuild.updatedAt < halfHourAgo) {
                const { totalFame } = topGuild;
                await TopGuilds.findOneAndUpdate(
                  { id: guild.id },
                  {
                    $set: {
                      oldTotalFame: totalFame,
                      updatedAt: now,
                    },
                    $inc: {
                      totalKills: guild.kills,
                      totalFame: guild.killFame,
                      totalDeaths: guild.deaths,
                      totalBattles: 1,
                    },
                    $push: {
                      battles: battle.id,
                    },
                  },
                  { upsert: true }
                );
              } else {
                await TopGuilds.findOneAndUpdate(
                  { id: guild.id },
                  {
                    $setOnInsert: {
                      name: guild.name,
                      alliance: guild.alliance,
                      allianceId: guild.allianceId,
                      oldTotalFame: 0,
                    },
                    $inc: {
                      totalKills: guild.kills,
                      totalFame: guild.killFame,
                      totalDeaths: guild.deaths,
                      totalBattles: 1,
                    },
                    $set: {
                      updatedAt: now,
                    },
                    $push: {
                      battles: battle.id,
                    },
                  },
                  { upsert: true }
                );
              }
            }
          }
        }
        BattleQueue.findOneAndRemove({ id: battle.id });
      }
    });
    return newBattle;
  } catch (err) {
    console.log(err);
  }
};
