const chalk = require("chalk");
const axios = require("axios");
const Battle = require("../../models/battle.model");
const BattleQueue = require("../../models/battleQueue.model");
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
      },
      victim: {
        name: element.Victim.Name,
        allianceName: element.Victim.AllianceName,
        guildName: element.Victim.GuildName,
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

    newBattle.save((err) => {
      if (err) {
        console.log(`Failed ${(chalk.red(battle.id), err)}`);
      } else {
        BattleQueue.findOneAndRemove({ id: battle.id }).then(() => {});
      }
    });
    return newBattle;
  } catch (err) {
    console.log(err.message);
  }
};
