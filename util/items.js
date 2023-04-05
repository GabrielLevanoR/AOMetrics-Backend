const fs = require("fs");
const util = require("util");
const R = require("ramda");
const Item = require("../models/item.model");
const { categoryItems } = require("./formatWeapons");

const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);

exports.generateTypeItems = async () => {
  const path = "./util/json/items.json";
  const results = await readJson(path);
  let mainhandItems = results.items.weapon
    .filter((item) => item["@slottype"] === "mainhand")
    .filter(({ "@shopsubcategory1": shopsubcategory1 }) =>
      categoryItems.includes(shopsubcategory1)
    )
    .map(
      ({
        "@uniquename": uniquename,
        "@combatspecachievement": combatspecachievement,
        "@shopsubcategory1": shopsubcategory1,
      }) => ({
        uniquename,
        "@combatspecachievement": combatspecachievement,
        "@shopsubcategory1": shopsubcategory1,
      })
    );
  let battleMount = results.items.mount
    .filter((item) => item["@shopsubcategory1"] === "battle_mount")
    .map(({ "@uniquename": uniquename }) => uniquename);
  const categorizedItems = {
    support: [],
    range: [],
    melee: [],
    tank: [],
    healer: [],
    battleMount: [],
    flank: [],
  };
  categorizedItems.battleMount = battleMount;
  const exceptions = {
    support: [
      "COMBAT_CURSEDSTAFFS_UNDEAD",
      "COMBAT_CURSEDSTAFFS_MORGANA",
      "COMBAT_MACES_AVALON",
    ],
    flank: [
      "COMBAT_FROSTSTAFFS_HELL",
      "COMBAT_MACES_KEEPER",
      "COMBAT_HAMMERS_KEEPER",
    ],
  };

  mainhandItems.forEach(
    ({
      uniquename,
      "@shopsubcategory1": shopsubcategory1,
      "@combatspecachievement": combatspecachievement,
    }) => {
      switch (shopsubcategory1) {
        case "arcanestaff":
          categorizedItems.support.push(uniquename);
          break;
        case "axe":
        case "dagger":
        case "spear":
        case "sword":
        case "knuckles":
          categorizedItems.melee.push(uniquename);
          break;
        case "cursestaff":
          if (exceptions.support.includes(combatspecachievement)) {
            categorizedItems.support.push(uniquename);
          } else {
            categorizedItems.range.push(uniquename);
          }
          break;
        case "bow":
        case "crossbow":
        case "firestaff":
          categorizedItems.range.push(uniquename);
          break;
        case "froststaff":
          if (exceptions.flank.includes(combatspecachievement)) {
            categorizedItems.flank.push(uniquename);
          } else {
            categorizedItems.range.push(uniquename);
          }
          break;
        case "mace":
          if (exceptions.support.includes(combatspecachievement)) {
            categorizedItems.support.push(uniquename);
          } else if (exceptions.flank.includes(combatspecachievement)) {
            categorizedItems.flank.push(uniquename);
          } else {
            categorizedItems.tank.push(uniquename);
          }
          break;
        case "hammer":
        case "quarterstaff":
          if (exceptions.flank.includes(combatspecachievement)) {
            categorizedItems.flank.push(uniquename);
          } else {
            categorizedItems.tank.push(uniquename);
          }
          break;
        case "holystaff":
        case "naturestaff":
          categorizedItems.healer.push(uniquename);
          break;
        default:
          break;
      }
    }
  );
  writeJson("./util/json/battleRol.json", categorizedItems);
};

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

      /**
       * let newItem = new Item(item);
      newItem.save((err) => {
        if (err) {
          console.log(`Failed ${chalk.red(item.itemURL)}, ${err.message}`);
        } else {
          console.log(`Saved ${chalk.green(item.itemURL)}`);
        }
      });
       */
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
