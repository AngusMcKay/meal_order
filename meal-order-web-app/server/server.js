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
    items: [String]
});

const Meal = mongoose.model("Meal", MealSchema);

// API to fetch meals
app.get("/meals", async (req, res) => {
    try {
        const meals = await Meal.find();
        console.log("Meals sent to frontend:", meals);
        res.json(meals);
    } catch (err) {
        console.error("Error fetching meals:", err);
        res.status(500).json({ error: "Error fetching meals" });
    }
});

const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
