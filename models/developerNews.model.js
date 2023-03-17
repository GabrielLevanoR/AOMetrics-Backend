const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const developerNews = Schema(
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
developerNews.post("remove", () => {});

const DeveloperNews = mongoose.model("DeveloperNews", developerNews);

module.exports = DeveloperNews;
