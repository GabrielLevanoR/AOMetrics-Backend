const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const communityNews = Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    imageUrl: { type: String },
    description: { type: String },
    redirection: { type: String },
    date: { type: String, required: true },
  },
  { minimize: false }
);
communityNews.post("remove", () => {});

const CommunityNews = mongoose.model("CommunityNews", communityNews);

module.exports = CommunityNews;
