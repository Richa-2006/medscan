const express = require("express");
const Medicine = require("../models/Medicine");
const fetchFromFDA = require("../utils/fetchFromFDA");

const router = express.Router();

router.get("/search/:name", async (req, res) => {
  try {
    const name = req.params.name.trim();

    const cached = await Medicine.findOne({
      name: { $regex: `^${name}$`, $options: "i" }
    });

    if (cached) {
      cached.searchCount += 1;
      await cached.save();
      return res.json({ success: true, source: "cache", data: cached });
    }

    let result = await fetchFromFDA("brand_name", name)
      || await fetchFromFDA("generic_name", name)
      || await fetchFromFDA("substance_name", name);

    if (!result) {
      return res.status(404).json({ message: "Medicine not found" });
    }

    const medicineData = {
      name: result.openfda?.brand_name?.[0] || name,
      genericName: result.openfda?.generic_name?.[0],
      manufacturer: result.openfda?.manufacturer_name?.[0],
      purpose: result.indications_and_usage?.[0],
      ingredients: result.active_ingredient?.[0],
      sideEffects: result.adverse_reactions?.[0],
      warnings: result.boxed_warning?.[0] || result.warnings?.[0],
      interactions: result.drug_interactions?.[0],
      dosage: result.dosage_and_administration?.[0],
      whoShouldAvoid: result.contraindications?.[0]
    };

    const saved = await Medicine.create(medicineData);

    res.json({ success: true, source: "OpenFDA", data: saved });

  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/popular", async (req, res) => {
  const popular = await Medicine.find()
    .sort({ searchCount: -1 })
    .limit(10)
    .select("name searchCount");

  res.json(popular);
});

module.exports = router;