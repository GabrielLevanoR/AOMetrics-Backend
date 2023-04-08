const fs = require("fs");
const util = require("util");
const { categoryItems } = require("./formatWeapons");

const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);

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
const generateComposition = async () => {
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
      "COMBAT_QUARTERSTAFFS_AVALON",
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
generateComposition();
