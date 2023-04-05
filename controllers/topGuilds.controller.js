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
    return res.status(200).json(topGuilds);
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
