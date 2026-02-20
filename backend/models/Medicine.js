const mongoose = require("mongoose");

const MedicineSchema = new mongoose.Schema({
  name: { type: String, required: true },
  genericName: { type: String, default: "Not available" },
  manufacturer: { type: String, default: "Not available" },
  purpose: { type: String, default: "Not available" },
  ingredients: { type: String, default: "Not available" },
  sideEffects: { type: String, default: "Not available" },
  warnings: { type: String, default: "Not available" },
  interactions: { type: String, default: "Not available" },
  dosage: { type: String, default: "Not available" },
  whoShouldAvoid: { type: String, default: "Not available" },
  searchCount: { type: Number, default: 1 }
}, { timestamps: true });

module.exports = mongoose.model("Medicine", MedicineSchema);