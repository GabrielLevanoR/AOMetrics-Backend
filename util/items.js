const fs = require("fs");
const util = require("util");
const R = require("ramda");
const Item = require("../models/item.model");
const chalk = require("chalk");

const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);

exports.getAlbionItems = async () => {
  const filePaths = [
    "./util/json/items.json",
    "./util/json/descriptions.json",
    //"./util/json/loot.json",
    //"./util/json/mobs.json",
  ];

  try {
    const results = await Promise.all(filePaths.map((path) => readJson(path)));
    let items = formatItems(results[0].items, results[1]);
    items.forEach((element) => {
      let item = {
        itemURL: element.itemURL,
        uniqueName: element["@uniquename"],
        tier: element["@tier"],
        enchantmentLevel: element.enchantmentlevel,
        weight: element["@weight"],
        maxStacksize: element["@maxstacksize"],
        shopCategory: element["@shopcategory"],
        shopSubcategory1: element["@shopsubcategory1"],
        craftingRequirements: element.craftingrequirements,
        name: element.name,
        description: element.description,
        slotType: element["@slottype"] ? element["@slottype"] : null,
        itemURL: element.itemURL,
      };

      let newItem = new Item(item);
      newItem.save((err) => {
        if (err) {
          console.log(`Failed ${chalk.red(item.itemURL)}, ${err.message}`);
        } else {
          console.log(`Saved ${chalk.green(item.itemURL)}`);
        }
      });
    });
    //writeJson("./util/json/test.json", items);
  } catch (e) {
    console.log(e.message);
  }
};

const readJson = async (path) => {
  try {
    const data = await readFile(path, "utf-8");
    return JSON.parse(data);
  } catch (e) {
    console.log(e);
  }
};
const writeJson = async (path, jsonToSave) => {
  try {
    await writeFile(path, JSON.stringify(jsonToSave, null, 4));
  } catch (e) {
    console.log(e);
  }
};

const findAttr = (itemName, property) => R.find(R.propEq(property, itemName));
const omitExtraAttr = R.map(R.omit(["enchantments"]));

const addAttr = (item, toSearch) => {
  let itemPurged;
  let attrItem = findAttr(item["@uniquename"], "UniqueName")(toSearch);
  if (!attrItem) {
    attrItem = findAttr(
      `@ITEMS_${item["@uniquename"]}`,
      "LocalizationNameVariable"
    )(toSearch);
  }
  itemPurged = {
    ...item,
    name: attrItem.LocalizedNames ? attrItem.LocalizedNames["EN-US"] : "",
    description: attrItem.LocalizedDescriptions
      ? attrItem.LocalizedDescriptions["EN-US"]
      : "",
  };
  return itemPurged;
};

const formatItems = (rawItems, descriptions) => {
  try {
    let givenItems = { ...rawItems };
    let downLevelItems = [];
    let formatedItems = [];
    delete givenItems["@xmlns:xsi"];
    delete givenItems["@xsi:noNamespaceSchemaLocation"];
    delete givenItems["shopcategories"];

    givenItems.simpleitem = R.reject(
      R.propEq("@shopsubcategory1", "mission"),
      givenItems.simpleitem
    );
    Object.keys(givenItems).forEach((element) => {
      if (isArray(givenItems[element])) {
        givenItems[element].forEach((item) => {
          downLevelItems.push(addAttr(item, descriptions));
        });
      } else {
        downLevelItems.push(addAttr(givenItems[element], descriptions));
      }
    });

    downLevelItems.forEach((item) => {
      formatedItems.push({
        ...item,
        enchantmentlevel: 0,
        itemURL: item["@uniquename"],
      });
      //console.log(item);
      if (item.enchantments) {
        if (isArray(item.enchantments.enchantment)) {
          item.enchantments.enchantment.forEach((ench) => {
            let enchantmentItem = {
              ...item,
              enchantmentlevel: ench["@enchantmentlevel"],
              itemURL: `${item["@uniquename"]}@${ench["@enchantmentlevel"]}`,
            };
            enchantmentItem.craftingrequirements = {
              ...ench["craftingrequirements"],
            };
            formatedItems.push(enchantmentItem);
          });
        } else {
          let enchantmentItem = {
            ...item,
            itemURL: item["@uniquename"],
            enchantmentlevel: item["@enchatmentlevel"]
              ? item["@enchatmentlevel"]
              : item.enchantments.enchantment["@enchantmentlevel"],
          };
          enchantmentItem.craftingrequirements = {
            ...item.enchantments.enchantment["craftingrequirements"],
          };
          formatedItems.push(enchantmentItem);
        }
      }
    });

    return omitExtraAttr(formatedItems);
  } catch (error) {
    console.log(error);
  }
};
const isArray = (a) => {
  return !!a && a.constructor === Array;
};
