const TopGuilds = require("../models/topGuilds");
const schedule = require("node-schedule");

exports.getTopGuilds = async (req, res) => {
  const query = req.query;
  let queryOptions = {};

  if (query.server) {
    queryOptions["server"] = { $in: query.server };
  }
  try {
    let topGuilds = await TopGuilds.paginate(queryOptions, {
      sort: { totalFame: -1 },
      limit: 20,
      offset: parseInt(query.offset),
    });
    let guildsRanking = [...topGuilds.docs];
    let oldFameGuilds = [];
    let newFameGuilds = [];
    guildsRanking.forEach((el) => {
      oldFameGuilds.push({ fame: el.oldTotalFame, id: el.id });
      newFameGuilds.push({ fame: el.totalFame, id: el.id });
    });
    oldFameGuilds.sort((a, b) => b.fame - a.fame);
    newFameGuilds.sort((a, b) => b.fame - a.fame);
    guildsRanking.forEach((el, index) => {
      const oldGuild = oldFameGuilds.find(
        (oldNewGuild) => oldNewGuild.id === el.id
      );
      const newGuild = newFameGuilds.find(
        (newSearchGuild) => newSearchGuild.id === el.id
      );
      guildsRanking[index] = {
        ...guildsRanking[index]._doc,
        position:
          oldFameGuilds.indexOf(oldGuild) - newFameGuilds.indexOf(newGuild) ,
        oldPosition: oldFameGuilds.indexOf(oldGuild),
        newPosition: newFameGuilds.indexOf(newGuild),
      };
    });
    return res.status(200).json([...guildsRanking]);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: err.message });
  }
};
schedule.scheduleJob("0 6 * * 1", async () => {
  try {
    await TopGuilds.deleteMany({});
  } catch (err) {
    console.log(err.message);
  }
});
