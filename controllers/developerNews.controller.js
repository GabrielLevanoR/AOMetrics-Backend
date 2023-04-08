const schedule = require("node-schedule");
const axios = require("axios");
const cheerio = require("cheerio");
const chalk = require("chalk");

const { DEVELOPER_NEWS_URL } = require("../util/constants");
const { convertStringDate } = require("../util/functions/time.functions");

const DeveloperNew = require("../models/developerNews.model");

const saveDeveloperNew = async (html) => {
  let news = [];
  const $ = cheerio.load(html);
  $("a").each((i, el) => {
    const date = $(el).find(".news-item__meta .news-item__date").text();
    const title = $(el).find(".news-item__headline").text();
    const imageUrl = $(el)
      .find(".news-item__image .news-item__image-body .lazy")
      .attr("src");
    const description = $(el).find(".news-item__body p").text();
    const redirection = $(el).attr("href");
    const timeStamp = convertStringDate(date);
    news.push({
      id: timeStamp,
      title: title,
      imageUrl: imageUrl,
      description: description,
      redirection: redirection,
      date: date,
    });
  });
  for (const elem in news) {
    try {
      const alreadyNew = await DeveloperNew.findOne({ id: news[elem].id });
      if (!alreadyNew) {
        let newReport = new DeveloperNew(news[elem]);
        newReport.save((err) => {
          if (err) {
            console.log(`Failed Dev new ${chalk.red(newReport.id)}`);
          }
        });
      }
    } catch (error) {
      console.log(error);
    }
  }
};

exports.getNews = async (req, res) => {
  try {
    let news = await DeveloperNew.find()
      .sort({ id: -1 })
      .select("id title imageUrl description redirection date");
    return res.status(200).json(news);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: error.message });
  }
};
if (
  process.env.NODE_ENV !== "dev" &&
  process.env.NODE_ENV !== "GENERATE_ITEMS"
) {
  schedule.scheduleJob("*/2 * * * *", async () => {
    try {
      let page = 1;
      let amount = 6;
      await (async () => {
        const { data } = await axios.get(
          DEVELOPER_NEWS_URL + `/${page}/${amount}`,
          {
            timeout: 120000,
          }
        );
        await saveDeveloperNew(data);
      })();
    } catch (error) {
      console.log(error);
    }
  });
}

schedule.scheduleJob("0 * * * *", async () => {
  DeveloperNew.countDocuments({}, (err, count) => {
    if (err) {
      console.log(err);
    } else if (count > 6) {
      DeveloperNew.find()
        .sort({ id: 1 })
        .limit(count - 6)
        .exec((err, news) => {
          if (err) {
            console.error(err);
          } else {
            for (let oldNew of news) {
              oldNew.remove();
            }
          }
        });
    }
  });
});
