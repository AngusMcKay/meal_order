const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const router = express.Router();

// 📌 Define the User Schema
const userSchema = new mongoose.Schema({
    anonIds: [{ type: String, unique: true }], // Supports multiple anonymous IDs
    email: { type: String, unique: true, sparse: true }, // Use email for login
    password: { type: String }, // Hashed password for login
    meals: [{ name: String, items: [], recipe: String, tags: [] }],
    items: [{ name: String, size: String, link: String, tags: [] }],
}, { timestamps: true });

const User = mongoose.model("User", userSchema);

// 📌 Middleware to find or create user
async function findOrCreateUser(req, res, next) {
    console.log("Trying to find or create user...");
    try {
        // Extract anonUserId and email from query (get requests) or body (post requests)
        const anonUserId = req.query.anonUserId || req.body.anonUserId;
        /*   // focusing on anonUserId based functionality post registration/login
        const email = req.query.email || req.body.email;

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
        }*/

        if (!anonUserId) {
            return res.status(400).json({ error: "Missing anonUserId" });
        }

        // Find the user by anonUserId
        let user = await User.findOne({ anonIds: anonUserId });

        // If no user exists, create a new one
        if (!user) {
            user = new User({ anonIds: [anonUserId] });
            await user.save();
        }
        
        req.user = user;
        next();
    } catch (error) {
        console.error("Error in findOrCreateUser:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

// Register a new user
router.post("/register", async (req, res) => {
    try {
        const { email, password, anonUserId } = req.body;

        if (!email || !password || !anonUserId) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        // Check if the email already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: "Email already exists" });
        }

        // Find the user associated with the anonUserId
        // This should ensure that existing progress in app is not lost when creating a registered account
        let user = await User.findOne({ anonIds: anonUserId });

        if (!user) {
            // If no user exists for the anonUserId, create a new user
            // User really should already exist for current session as anonUserId created on first device session
            // So this is just a safety net, and need to accept that it might mean any current session changes are not recorded to the user
            user = new User({ anonIds: [anonUserId] });
        }

        // Update the user with the email and hashed password
        user.email = email;
        user.password = await bcrypt.hash(password, 10);
        await user.save();

        res.status(201).json({ message: "User registered successfully" });
    } catch (error) {
        console.error("Error in /register:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Login a user
router.post("/login", async (req, res) => {
    try {
        const { email, password, anonUserId } = req.body;

        if (!email || !password || !anonUserId) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        // Find the user by email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // Check the password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: "Invalid password" });
        }

        // Check if the anonUserId is already associated with another account
        const otherUser = await User.findOne({ anonIds: anonUserId });
        if (otherUser && otherUser._id.toString() !== user._id.toString()) {
            // Remove the anonUserId from the other account
            otherUser.anonIds = otherUser.anonIds.filter(id => id !== anonUserId);
            await otherUser.save();
        }

        // Add the anonUserId to the user's anonIds array if not already present
        if (!user.anonIds.includes(anonUserId)) {
            user.anonIds.push(anonUserId);
            await user.save();
        }

        // Generate a JWT token
        const token = jwt.sign({ email }, "your_jwt_secret", { expiresIn: "1h" });

        res.status(200).json({ message: "Login successful", token });
    } catch (error) {
        console.error("Error in /login:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});


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

        const mealIndex = req.user.meals.findIndex(m => m.name === meal.name);

        if (mealIndex !== -1) {
            req.user.meals[mealIndex] = meal;
        } else {
            req.user.meals.push(meal);
        }

        await req.user.save();
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

        const itemIndex = req.user.items.findIndex(i => i.name === item.name);

        if (itemIndex !== -1) {
            req.user.items[itemIndex] = item;
        } else {
            req.user.items.push(item);
        }

        await req.user.save();
        res.json(req.user);

    } catch (error) {
        console.error("Error saving item:", error);
        res.status(500).json({ error: "Failed to save item" });
    }
});

// 📌 DELETE /delete-meal → Remove a meal by name
router.delete("/delete-meal", findOrCreateUser, async (req, res) => {
    try {
        const { mealName } = req.body.mealName;
        req.user.meals = req.user.meals.filter(meal => meal.name !== mealName);
        await req.user.save();
        //console.log("user after deleting meal:", req.user); // useful for debugging
        res.json(req.user);
    } catch (error) {
        console.error("Error deleting meal:", error);
        res.status(500).json({ error: "Failed to delete meal" });
    }
});

// 📌 DELETE /delete-item → Remove a meal by name
router.delete("/delete-item", findOrCreateUser, async (req, res) => {
    try {
        const { itemName } = req.body.itemName;
        req.user.items = req.user.items.filter(item => item.name !== itemName);
        await req.user.save();
        res.json(req.user);
    } catch (error) {
        console.error("Error deleting item:", error);
        res.status(500).json({ error: "Failed to delete item" });
    }
});

module.exports = router;
