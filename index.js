require("dotenv").config();
const chalk = require("chalk");
const db = require("./util/db");
const app = require("./api.routes");
const { getAlbionItems, generateTypeItems } = require("./util/items");

db(process.env.MONGO_URI);

const PORT = process.env.PORT || 5001;

try {
  app.listen(PORT, () => {
    console.log(`Server listening on port ${chalk.green(PORT)}`);
  });
} catch (error) {
  console.log(error);
} finally {
  if (process.env.NODE_ENV === "GENERATE_ITEMS") {
    generateTypeItems();
  }
}
