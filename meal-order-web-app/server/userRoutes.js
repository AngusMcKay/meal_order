const express = require("express");
const mongoose = require("mongoose");

const router = express.Router();

// 📌 Define the User Schema
const userSchema = new mongoose.Schema({
    anonIds: [{ type: String, unique: true }], // Supports multiple anonymous IDs
    email: { type: String, unique: true, sparse: true }, // Use email for login
    meals: [{ name: String, items: [], recipe: String, tags: [] }],
    items: [{ name: String, size: String, link: String, tags: [] }],
}, { timestamps: true });

const User = mongoose.model("User", userSchema);

// 📌 Middleware to find or create user
async function findOrCreateUser(req, res, next) {
    console.log("Trying to find or create user...");
    try {
        const { anonUserId, email } = req.query;

        let user = null;

        if (email) {
            console.log("Trying to find user by email");
            // Find the user by email
            user = await User.findOne({ email });

            if (user && anonUserId) {
                // If this anonUserId was linked to another user, remove it from the old user
                await User.updateMany({ anonIds: anonUserId }, { $pull: { anonIds: anonUserId } });

                // Add the anonUserId to the logged-in user (if not already present)
                if (!user.anonIds.includes(anonUserId)) {
                    user.anonIds.push(anonUserId);
                }
            }
        } else if (anonUserId) {
            console.log("Trying to find user by anonUserId");
            // Find by anonUserId if email is not provided
            user = await User.findOne({ anonIds: anonUserId });
        }

        // If no user exists, create a new one
        if (!user) {
            user = new User({ anonIds: anonUserId ? [anonUserId] : [], email });
            await user.save();
        } else {
            await user.save();
        }

        req.user = user;
        next();
    } catch (error) {
        console.error("Error in findOrCreateUser:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}


// 📌 GET /get-user → Retrieve user data
router.get("/get-user", findOrCreateUser, async (req, res) => {
    //console.log(`Sending user: ${req.user}`);  // for debugging
    res.json({ user: req.user} );
});

// 📌 POST /save-meals → Save user meals
router.post("/save-meal", findOrCreateUser, async (req, res) => {
    try {
        const { meal } = req.body; // Expecting a single meal object

        if (!meal || !meal.name) {
            return res.status(400).json({ error: "Meal must have a name" });
        }

        // Find index of existing meal
        const mealIndex = req.user.meals.findIndex(m => m.name === meal.name);

        if (mealIndex !== -1) {
            // ✅ Update existing meal
            req.user.meals[mealIndex] = meal;
        } else {
            // ✅ Add new meal
            req.user.meals.push(meal);
        }

        await req.user.save(); // Save changes to DB
        res.json(req.user);

    } catch (error) {
        console.error("Error saving meal:", error);
        res.status(500).json({ error: "Failed to save meal" });
    }
});

// 📌 POST /save-items → Save grocery items
router.post("/save-item", findOrCreateUser, async (req, res) => {
    try {
        const { item } = req.body; // Expecting a single item object

        if (!item || !item.name) {
            return res.status(400).json({ error: "Item must have a name" });
        }

        // Find index of existing item
        const itemIndex = req.user.items.findIndex(i => i.name === item.name);

        if (itemIndex !== -1) {
            // ✅ Update existing item
            req.user.items[itemIndex] = item;
        } else {
            // ✅ Add new item
            req.user.items.push(item);
        }

        await req.user.save(); // Save changes to DB
        res.json(req.user);

    } catch (error) {
        console.error("Error saving item:", error);
        res.status(500).json({ error: "Failed to save item" });
    }
});

// 📌 DELETE /delete-meal → Remove a meal by name
router.delete("/delete-meal", findOrCreateUser, async (req, res) => {
    try {
        const mealName = req.body.mealName;
        req.user.meals = req.user.meals.filter(meal => meal.name !== mealName);
        await req.user.save();
        res.json({ success: true, meals: req.user.meals });
    } catch (error) {
        console.error("Error deleting meal:", error);
        res.status(500).json({ error: "Failed to delete meal" });
    }
});

module.exports = router;
