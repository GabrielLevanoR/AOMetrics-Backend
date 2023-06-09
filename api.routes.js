const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use("/items", require("./routes/item.routes"));
app.use("/battles", require("./routes/battle.routes"));
app.use("/communityNews", require("./routes/communityNews.routes"));
app.use("/developerNews", require("./routes/developerNews.routes"));
app.use("/topGuilds", require("./routes/topGuilds.routes"));
module.exports = app;
