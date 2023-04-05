const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const mongoosePaginate = require("mongoose-paginate-v2");

const topGuildsSchema = Schema(
  {
    id: { type: String, index: true, unique: true, required: true },
    name: { type: String },
    alliance: { type: String },
    allianceId: { type: String },
    totalKills: { type: Number },
    totalFame: { type: Number },
    oldTotalFame: { type: Number, default: 0 },
    totalDeaths: { type: Number },
    totalBattles: { type: Number },
    battles: { type: Array, default: [] },
    updatedAt: { type: Date },
  },
  { minimize: false }
);

topGuildsSchema.plugin(mongoosePaginate);
const TopGuilds = mongoose.model("TopGuilds", topGuildsSchema);

module.exports = TopGuilds;
