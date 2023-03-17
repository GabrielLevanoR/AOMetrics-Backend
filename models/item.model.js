const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const mongoosePaginate = require("mongoose-paginate-v2");

const itemSchema = Schema(
  {
    itemURL: { type: String, unique: true, index: true },
    uniqueName: { type: String },
    tier: { type: Number, index: true },
    enchantmentLevel: { type: Number },
    weight: { type: Number },
    maxStackSize: { type: Number },
    shopCategory: { type: String, index: true },
    shopSubcategory1: { type: String, index: true },
    craftingRequirements: { type: Schema.Types.Mixed },
    name: { type: String },
    description: { type: String },
    slotType: { type: String },
    itemURL: { type: String },
  },
  { minimize: false }
);

itemSchema.plugin(mongoosePaginate);
const ItemClass = mongoose.model("Item", itemSchema);

module.exports = ItemClass;
