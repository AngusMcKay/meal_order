require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const { Builder, By, Key, until } = require("selenium-webdriver");
const fs = require("fs");
const axios = require("axios");
const https = require('https');
const OpenAI = require("openai");
//import OpenAI from "openai";

const app = express();
app.use(cors({origin: "http://localhost:3000", methods: ["GET", "POST", "DELETE"], credentials: true})); // Important for cookies/sessions));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// socket.io setup for posting updates to front end
const http = require("http");
const { Server } = require("socket.io");
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
    });
});

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
const ItemSchema = new mongoose.Schema(
    {
        retailerProductId: String
    },
    { strict: false } // Might want to think about this more at some point
);

const Item = mongoose.model("Item", ItemSchema);

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

app.post("/find-new-items", async (req, res) => {
    const { query } = req.body;

    try {

        // PUPPETEER VERSION
        /*const browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();

        await page.goto(`https://groceries.morrisons.com/search?q=${query}`, { waitUntil: "domcontentloaded" });

        let pageSource = await page.content();
        let jsonData = pageSource.split('"productEntities":')[1].split(',"missedPromotions"')[0];
        let itemsDict = JSON.parse(jsonData);

        //let results = itemsDict.map(item => ({ name: item.name }));

        await browser.close();
        res.json(itemsDict);*/

        // SELENIUM VERSION
        let chrome = require("selenium-webdriver/chrome");
        let options = new chrome.Options();
        options.addArguments("--headless"); // Runs Chrome in headless mode
        options.addArguments("--disable-gpu"); // Disables GPU hardware acceleration
        options.addArguments("--window-size=1280,800"); // Ensures consistent rendering
        let driver = await new Builder().forBrowser("chrome").setChromeOptions(options).build();
        //let driver = await new Builder().forBrowser("chrome").build();
        await driver.get(`https://groceries.morrisons.com/search?q=${query}`);

        // Extract page source
        let pageSource = await driver.getPageSource();

        // Extract JSON containing product entities
        let jsonData = pageSource.split('"productEntities":')[1].split(',"missedPromotions"')[0];

        // Parse JSON
        let itemsDict = JSON.parse(jsonData);

        await driver.quit();
        res.json(itemsDict);

    } catch (error) {
        console.error("Scraping failed:", error);
        res.status(500).json({ error: "Failed to scrape data." });
    }
});

app.post("/add-new-items", async (req, res) => {
    try {
        const { items } = req.body;

        const bulkOps = items.map(item => ({
            updateOne: {
                filter: { retailerProductId: item.retailerProductId },
                update: { $set: item },
                upsert: true
            }
        }));

        await Item.bulkWrite(bulkOps);

        res.json({ success: true });
    } catch (error) {
        console.error("Error adding to database:", error);
        res.status(500).json({ error: "Failed to save items." });
    }
});

// Upsert created or edited meals
app.post("/upsert-meal", async (req, res) => {
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

// delete meals
app.delete("/meals/:name", async (req, res) => {
    try {
        const mealName = decodeURIComponent(req.params.name);
        const deletedMeal = await Meal.findOneAndDelete({ name: mealName });

        if (!deletedMeal) {
            return res.status(404).json({ message: "Meal not found" });
        }

        res.status(200).json({ message: "Meal deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Error deleting meal", error });
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
    options.addArguments("user-agent=Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.50 Safari/537.36")
    options.addArguments("--headless"); // Runs Chrome in headless mode (can comment out for testing)
    options.addArguments("--disable-gpu"); // Disables GPU hardware acceleration
    options.addArguments("--window-size=1920,1080"); // Ensures consistent rendering
    driver = await new Builder().forBrowser("chrome").setChromeOptions(options).build();

    io.emit("orderProgress", "Connecting to grocery store");

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
                driver.manage().setTimeouts({ implicit: 10000 });
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
        io.emit("orderProgress", "Please log in on the popup manually");
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
                    io.emit("orderProgress", `Finding and adding ${item.name}...    `);
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
                    io.emit("orderProgress", `Finding and adding ${item.name} - ✅`);
                } catch (err) {
                    console.log(`❌ Failed to add: ${item.name}`);
                    console.error('Error', err)
                    io.emit("orderProgress", `Couldn't add ${item.name}, added to fail list (viewable after)`);
                    failedItems.push(item);
                    driver.takeScreenshot().then(
                        function(image, error) {
                            fs.writeFileSync(`failed_order_${retailerProductId}.png`, image, 'base64', function(error) {
                                console.log(error);
                            });
                        }
                    );
                }
            }
        }
    } catch (error) {
        console.error("Error processing order list:", error);
    } finally {
        io.emit("orderComplete", "Order Complete");
        await driver.get('https://groceries.morrisons.com/'); // final call to go back to home page ensures last item gets added before quiting driver
        await driver.quit();
        io.emit("orderComplete", ""); // blanks last message to remove messages
    }

    res.json({ failedItems }); // Send failed items back to frontend
});

// AI agent to interpret recipes into shopping lists
//const router = express.Router();

app.post("/extract-ingredients", async (req, res) => {

    try {
        const { recipeText, itemNames, extractFrom } = req.body;

        const openai = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
        });

        console.log("Constructing query")

        const prompt = `
        Extract the ingredients and quantities if possible from the following text: ${recipeText}.
        Then, match each ingredient to the most suitable item from this list: ${JSON.stringify(itemNames)}.
        Return an array of objects with 'ingredient', 'quantity', 'suggestedItem', and 'confidenceScore'.
        The suggestedItem should match exactly the wording from the list provided, and if no suitable item is found please write "None found".
        `;

        console.log(`Extract the ingredients and quantities if possible from the following text: ${recipeText}.`);

        // Open AI querying
        const aiResponse = await openai.responses.create({
            "model": "gpt-4o-mini",
            "input": [{ "role": "user", "content": prompt }],
            "text": {
                "format": {
                    "type": "json_schema",
                    "name": "recipe_extraction",
                    "strict": true,
                    "schema": {
                        "type": "object",
                        "properties": {
                            "ingredients": {
                                "type": "array",
                                "items": {
                                    "type": "object",
                                    "properties": {
                                        "ingredient": {"type": "string"},
                                        "quantity": {"type": "string"},
                                        "suggestedItem": {"type": "string"},
                                        "confidenceScore": {"type": "number"}
                                    },
                                    "required": ["ingredient", "quantity", "suggestedItem", "confidenceScore"],
                                    "additionalProperties": false
                                }
                            }
                        },
                        "required": ["ingredients"],
                        "additionalProperties": false
                    }
                }
            },
            //"reasoning": {},
            //"tools": [],
            "temperature": 0.2,
            "max_output_tokens": 2048,
            //"top_p": 1,
        });

        console.log(aiResponse)


        /*axios.post("https://api.openai.com/v1/chat/completions", {
            model: "gpt-4-turbo",
            messages: [{ role: "system", content: prompt }],
            temperature: 0.7
        }, {
            headers: {
                "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
                "Content-Type": "application/json"
            }
        });*/


        /* // Webscraping.ai (method to scrape directly from URLs)
        const prompt = `
        Extract the ingredients and quantities from the website provided.
        Return an array of objects with 'ingredient' and 'quantity'
        `;

        const params = {
          "api_key": process.env.WEBSCRAPING_AI_KEY,
          "url": `${recipeUrl}`,
          "timeout": "10000",
          "js": "true",
          "js_timeout": "2000",
          "question": prompt,
          "format": "json"
        };
        const queryString = new URLSearchParams(params).toString();
        const url = 'https://api.webscraping.ai/ai/question?' + queryString;

        console.log("Sending to AI")

        https.get(url, (resp) => {
          let data = '';
          resp.on('data', (chunk) => { data += chunk; });
          resp.on('end', () => {
            console.log(data);
          });
        }).on("error", (err) => {
          console.log("Error: " + err.message);
        });*/

        // Extract AI response
        //const extractedData = JSON.parse(aiResponse.data.choices[0].message.content);
        //res.json({ ingredients: extractedData });

        //res.json({ ingredients: [{ name: "Cucumber", quantity: "1", suggestedItem: "Morrisons Whole Cucumber" }, { name: "Brussel Sprouts", quantity: "200g", suggestedItem: "Morrisons Prepared Sprouts" }] });  // FOR TESTING
        res.json( JSON.parse(aiResponse.output_text) )
    } catch (error) {
        console.error("Error extracting ingredients:", error);
        res.status(500).json({ error: "Failed to extract ingredients" });
    }
});

//module.exports = router;

const PORT = 5000;
//app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
