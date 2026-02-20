const express = require("express");
const requireAuth = require("../middleware/requireAuth");
const User = require("../models/User");

const router = express.Router();

// Get current user
router.get("/me", requireAuth, async (req, res) => {
  const user = await User.findById(req.userId).select("-password");
  res.json(user);
});

// Add search history
router.post("/history", requireAuth, async (req, res) => {
  const { medicine } = req.body;

  await User.findByIdAndUpdate(req.userId, {
    $push: {
      searchHistory: { medicine }
    }
  });

  res.json({ message: "Added to history" });
});

// Get history
router.get("/history", requireAuth, async (req, res) => {
  const user = await User.findById(req.userId).select("searchHistory");
  res.json(user.searchHistory);
});

module.exports = router;