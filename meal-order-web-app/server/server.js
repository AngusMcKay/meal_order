require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const { Builder, By, Key, until } = require("selenium-webdriver");
const fs = require("fs");


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
    items: [],
    recipe: String
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
    const { name, items, recipe } = req.body;

    if (!name) {
        return res.status(400).json({ error: "Meal name is required" });
    }

    try {
        const updatedMeal = await Meal.findOneAndUpdate(
            { name: name }, // Find by name (case-insensitive match)
            { name, items, recipe }, // Update or Insert
            { upsert: true, new: true, setDefaultsOnInsert: true } // Upsert options
        );

        res.json({ success: true, meal: updatedMeal });
    } catch (error) {
        console.error("Error upserting meal:", error);
        res.status(500).json({ error: "Server error" });
    }
});

// Selenium test
app.post("/run-selenium-test", async (req, res) => {
    let driver = await new Builder().forBrowser("chrome").build();

    try {
        await driver.get("https://example.com");
        //const button = await driver.findElement(By.xpath("//button[text()='Add to Cart']"));
        //await button.click();

        res.json({ success: true, message: "Selenium automation completed!" });
    } catch (error) {
        console.error("Selenium error:", error);
        res.status(500).json({ success: false, message: "Selenium failed", error });
    } finally {
        await driver.quit();
    }
});


// Selenium orders
app.post("/run-selenium-morrisons-order", async (req, res) => {
    const orderList = req.body.orderList; // Receive orderList from frontend
    if (!orderList || orderList.length === 0) {
        return res.status(400).json({ error: "No orders received." });
    }

    // Start headless driver session - used to check valid login cookies and then place order
    let chrome = require("selenium-webdriver/chrome");
    let options = new chrome.Options();
    options.addArguments("--headless"); // Runs Chrome in headless mode
    options.addArguments("--disable-gpu"); // Disables GPU hardware acceleration
    options.addArguments("--window-size=1280,800"); // Ensures consistent rendering
    driver = await new Builder().forBrowser("chrome").setChromeOptions(options).build();
    //driver = await new Builder().forBrowser("chrome").build();  // Headed driver (useful for testing)

    // First open page and accept cookies
    let logged_in = false;
    try {
        driver.manage().setTimeouts({ implicit: 10000 }); // need delay to give cookies pop-up time to pop up
        await driver.get('https://groceries.morrisons.com/');

        // Accept cookies
        let cookieAccept = await driver.findElement(By.id('onetrust-accept-btn-handler'));
        await cookieAccept.click();

        // Check for cookies from previous login and apply
        if (fs.existsSync("saved_cookies_morrisons.json")) {

            console.log("Existing cookies found, applying and confirming log in status");
            let saved_cookies = JSON.parse(fs.readFileSync("saved_cookies_morrisons.json"));
            // Add cookies from previous logged in session (note that site needs to be opened before cookies can be applied)
            for (let cookie of saved_cookies) {
                try {
                    await driver.manage().addCookie(cookie);
                } catch (err) {
                    console.warn(`⚠️ Failed to add cookie: ${cookie.name}`);
                } finally {
                    console.log(`Successfully added cookie: ${cookie.name}`);
                }
            }

            // Login detection method 1: check whether login dropdown still exists
            try {
                driver.manage().setTimeouts({ implicit: 10000 }); // reduce for this test so doesn't take ages
                //let loginButton = await driver.findElement(By.xpath('//button[@data-synthetics="login-dropdown-button"]'));
                //await loginButton.click();
                //console.log('Log in button found after cookies applied, so need to run through manual login again');
                await driver.get('https://groceries.morrisons.com/');
                let accountButton = await driver.findElement(By.id('account-button'));
                await accountButton.click();
                console.log('Account button found after cookies applied, login successful');
                logged_in = true;
            } catch {
                // if above element doesn't exist then it means not logged in so leave logged_in as false - maybe more elegent way to handle this?
            } finally {
                driver.manage().setTimeouts({ implicit: 10000 }); // set back to more tolerant timeout
            }
        }
    } catch (err) {
        console.error("Error starting session:", error);
    }

    // Handle login and save cookies if no existing cookies or expired
    if (!logged_in) {
        console.log('Starting manual log in');
        let driver_login = await new Builder().forBrowser("chrome").build(); // Headed driver for user login
        let saved_cookies = [];

        try {
            // Log in and add username and password
            await driver_login.get("https://accounts.groceries.morrisons.com/auth-service/sso/login");
            try {
                await driver_login.findElement(By.id("login-input")).sendKeys(process.env.MORRISONS_USERNAME);
                await driver_login.findElement(By.xpath('//input[@data-synthetics="password-input"]')).sendKeys(process.env.MORRISONS_PASSWORD);
            } catch {
                // Empty catch block to swallow errors so that they are not passed to next catch (if unable to populate username/password then just wait for user to do it manually)
            }
            await driver_login.wait(until.urlContains("https://groceries.morrisons.com/"), 100000); // setting long timeout to allow user login
            console.log("✅ Logged in successfully!");
            saved_cookies = await driver_login.manage().getCookies();
            fs.writeFileSync("saved_cookies_morrisons.json", JSON.stringify(saved_cookies, null, 2));

        } catch (error) {
            console.error("Error logging in:", error);
        } finally {
            await driver_login.quit();

            // Set cookies to existing headless driver
            console.log('Setting updated cookies in headless browser for placing order');
            for (let cookie of saved_cookies) {
                try {
                    await driver.manage().addCookie(cookie);
                } catch (err) {
                    console.warn(`⚠️ Failed to add cookie: ${cookie.name}`);
                } finally {
                    console.log(`Successfully added cookie: ${cookie.name}`);
                }
            }
        }
    }
    
    // Headless driver should now be logged in, so continue to place order
    let failedItems = [];

    // Place order
    try {

        // Loop through order and try to add items to basket
        for (let order of orderList) {
            for (let item of order.items) {
                let retailerProductId = item.retailerProductId;
                let productUrl = `https://groceries.morrisons.com/products/${retailerProductId}`;
                console.log(`Opening: ${productUrl}`);

                try { // Must be a better way to do this?
                    await driver.get(productUrl);
                    let a1 = `@aria-label='Add ${item.name} to basket'`
                    let a2 = `@aria-label='Add ${item.name}  to basket'`
                    let a3 = `@aria-label='Add ${item.name}   to basket'`
                    let i1 = `@aria-label='Increase quantity of ${item.name} in trolley'`
                    let i2 = `@aria-label='Increase quantity of ${item.name}  in trolley'`
                    let i3 = `@aria-label='Increase quantity of ${item.name}   in trolley'`

                    let addButton = await driver.wait(until.elementLocated(By.xpath(
                        `//button[${a1} or ${a2} or ${a3} or ${i1} or ${i2} or ${i3}]`)), 5000);
                    await addButton.click();
                    console.log(`✅ Added: ${item.name}`);
                } catch (err) {
                    console.log(`❌ Failed to add: ${item.name}`);
                    failedItems.push(item);
                }
            }
        }
    } catch (error) {
        console.error("Error processing order list:", error);
    } finally {
        await driver.get('https://groceries.morrisons.com/'); // final call to go back to home page ensures last item gets added before quiting driver
        await driver.quit();
    }

    res.json({ failedItems }); // Send failed items back to frontend
});


const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
