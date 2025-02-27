require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// Check if MongoDB URI is properly loaded
if (!process.env.MONGO_URI) {
    console.error("MongoDB connection string is missing. Check .env file.");
    process.exit(1);
}

// Connect to MongoDB using the environment variable
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => console.log("Connected to MongoDB"))
  .catch(err => console.error("MongoDB connection error:", err));

// Define Meal schema and model
const MealSchema = new mongoose.Schema({
    name: String,
    items: []
});

const Meal = mongoose.model("Meal", MealSchema);

// API to fetch meals
app.get("/meals", async (req, res) => {
    try {
        const meals = await Meal.find();
        //console.log("Meals sent to frontend:", meals); // useful for testing but don't want to always print thousands of documents to console
        res.json(meals);
    } catch (err) {
        console.error("Error fetching meals:", err);
        res.status(500).json({ error: "Error fetching meals" });
    }
});

// Define Item schema and model
const ItemSchema = new mongoose.Schema({ // TO DO
    name: String,
    items: [String]
});

const Item = mongoose.model("Item", {});  // NEED TO REPLACE WITH ACTUAL SCHEMA ONCE SET UP

// API to fetch meals
app.get("/items", async (req, res) => {
    try {
        const items = await Item.find();
        //console.log("Items sent to frontend:", items); // useful for testing but don't want to always print thousands of documents to console
        res.json(items);
    } catch (err) {
        console.error("Error fetching items:", err);
        res.status(500).json({ error: "Error fetching items" });
    }
});

// Upsert created or edited meals
app.post("/upsertMeal", async (req, res) => {
    const { name, items } = req.body;

    if (!name) {
        return res.status(400).json({ error: "Meal name is required" });
    }

    try {
        const updatedMeal = await Meal.findOneAndUpdate(
            { name: name }, // Find by name (case-insensitive match)
            { name, items }, // Update or Insert
            { upsert: true, new: true, setDefaultsOnInsert: true } // Upsert options
        );

        res.json({ success: true, meal: updatedMeal });
    } catch (error) {
        console.error("Error upserting meal:", error);
        res.status(500).json({ error: "Server error" });
    }
});

const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
