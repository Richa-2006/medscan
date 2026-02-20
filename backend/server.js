const express = require("express");
const mongoose = require("mongoose");
const axios = require("axios");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();

// ================================
// MIDDLEWARE
// ================================
app.use(cors({
    origin: process.env.FRONTEND_URL,
    credentials: true
}));
app.use(express.json());

// ================================
// USER MODEL
// ================================
const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String },
    avatar: { type: String },
    searchHistory: [{
        medicine: String,
        searchedAt: { type: Date, default: Date.now }
    }],
    savedMedicines: [String]
}, { timestamps: true });

const User = mongoose.model("User", UserSchema);

// ================================
// MEDICINE MODEL
// ================================
const Medicine = mongoose.model("Medicine", new mongoose.Schema({
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
}, { timestamps: true }));

// ================================
// VERIFY TOKEN MIDDLEWARE
// ================================
const requireAuth = (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
        return res.status(401).json({
            success: false,
            message: "Please login first"
        });
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.userId;
        next();
    } catch {
        return res.status(401).json({
            success: false,
            message: "Session expired, please login again"
        });
    }
};

const createToken = (userId) => {
    return jwt.sign(
        { userId },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
    );
};

// ================================
// REGISTER
// ================================
app.post("/api/auth/register", async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Please fill in all fields"
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 6 characters"
            });
        }

        const existing = await User.findOne({ email });
        if (existing) {
            return res.status(400).json({
                success: false,
                message: "Email already registered. Please login."
            });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const user = await User.create({
            name,
            email,
            password: hashedPassword
        });

        const token = createToken(user._id);

        res.status(201).json({
            success: true,
            message: "Account created successfully!",
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                avatar: user.avatar
            }
        });

    } catch (error) {
        console.error("Register error:", error.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// ================================
// LOGIN
// ================================
app.post("/api/auth/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Please enter email and password"
            });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({
                success: false,
                message: "No account found with this email"
            });
        }

        if (!user.password) {
            return res.status(400).json({
                success: false,
                message: "This account uses Google login."
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: "Incorrect password"
            });
        }

        const token = createToken(user._id);

        res.json({
            success: true,
            message: "Logged in successfully!",
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                avatar: user.avatar
            }
        });

    } catch (error) {
        console.error("Login error:", error.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// ================================
// GET CURRENT USER
// ================================
app.get("/api/auth/me", requireAuth, async (req, res) => {
    try {
        const user = await User.findById(req.userId).select("-password");
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }
        res.json({ success: true, user });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// ================================
// SEARCH HISTORY
// ================================
app.post("/api/user/history", requireAuth, async (req, res) => {
    try {
        const { medicine } = req.body;
        await User.findByIdAndUpdate(req.userId, {
            $push: {
                searchHistory: {
                    medicine,
                    searchedAt: new Date()
                }
            }
        });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

app.get("/api/user/history", requireAuth, async (req, res) => {
    try {
        const user = await User.findById(req.userId).select("searchHistory");
        res.json({ success: true, data: user.searchHistory });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// ================================
// MEDICINE SEARCH
// ================================
async function fetchFromFDA(searchType, name) {
    try {
        const url = `https://api.fda.gov/drug/label.json?search=openfda.${searchType}:"${encodeURIComponent(name)}"&limit=1`;
        const response = await axios.get(url, { timeout: 8000 });
        return response.data.results?.[0] || null;
    } catch {
        return null;
    }
}

app.get("/api/medicine/search/:name", async (req, res) => {
    try {
        const name = req.params.name.trim();
        console.log(`Searching: ${name}`);

        const cached = await Medicine.findOne({
            name: { $regex: name, $options: "i" }
        });

        if (cached) {
            await Medicine.findByIdAndUpdate(
                cached._id,
                { $inc: { searchCount: 1 } }
            );
            return res.json({ success: true, source: "cache", data: cached });
        }

        let result = await fetchFromFDA("brand_name", name);
        if (!result) result = await fetchFromFDA("generic_name", name);
        if (!result) result = await fetchFromFDA("substance_name", name);

        if (!result) {
            return res.status(404).json({
                success: false,
                message: "Medicine not found"
            });
        }

        const medicineData = {
            name: result.openfda?.brand_name?.[0] || name,
            genericName: result.openfda?.generic_name?.[0] || "Not available",
            manufacturer: result.openfda?.manufacturer_name?.[0] || "Not available",
            purpose: result.indications_and_usage?.[0] || "Not available",
            ingredients: result.active_ingredient?.[0] || "Not available",
            sideEffects: result.adverse_reactions?.[0] || "Not available",
            warnings: result.boxed_warning?.[0] || result.warnings?.[0] || "Not available",
            interactions: result.drug_interactions?.[0] || "Not available",
            dosage: result.dosage_and_administration?.[0] || "Not available",
            whoShouldAvoid: result.contraindications?.[0] || "Not available"
        };

        const saved = await Medicine.create(medicineData);
        return res.json({ success: true, source: "OpenFDA", data: saved });

    } catch (error) {
        console.error("Error:", error.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// ================================
// POPULAR MEDICINES
// ================================
app.get("/api/medicine/popular", async (req, res) => {
    try {
        const popular = await Medicine.find()
            .sort({ searchCount: -1 })
            .limit(10)
            .select("name searchCount");
        res.json({ success: true, data: popular });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// ================================
// TEST ROUTE
// ================================
app.get("/", (req, res) => {
    res.json({ message: "MedScan backend running!" });
});

// ================================
// START SERVER
// ================================
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log("✅ MongoDB connected");
        app.listen(process.env.PORT || 5000, () => {
            console.log("✅ Server running on http://localhost:5000");
        });
    })
    .catch(err => console.error("❌ DB Error:", err.message));
if (!process.env.MONGO_URI) {
    console.error("❌ Error: MONGO_URI is not defined in .env file");
    process.exit(1);
}

mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log("✅ MongoDB connected");
        // ... rest of your code
    })
