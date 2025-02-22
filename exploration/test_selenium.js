const { Builder, By, until } = require('selenium-webdriver');

async function testSelenium() {
    // Set up WebDriver for Chrome
    let driver = await new Builder().forBrowser('chrome').build();

    try {
        // Open a website
        await driver.get('https://example.com');

        // Get and print the page title
        let title = await driver.getTitle();
        console.log("Page Title:", title);

    } finally {
        // Close the browser
        await driver.quit();
    }
};

async function loadBasketTemplate() {
    let driver = await new Builder().forBrowser('chrome').build();

    try {
        // implicit wait time to allow for cookie popup to occur and be closed (note that)
        await driver.manage().setTimeouts({ implicit: 10000 });

        //await driver.get('https://www.tesco.com/groceries/en-GB/products/313168567');
        await driver.get('https://groceries.morrisons.com/products/morrisons-fine-green-beans/113430859');

        //await driver.wait(until.elementLocated(By.id('onetrust-accept-btn-handler'))); // Could do this explicit wait instead of above implicit
        let cookieAccept = await driver.findElement(By.id('onetrust-accept-btn-handler'));
        //await driver.wait(until.elementIsVisible(cookieAccept), 10000); // Doesn't work in this case as element doesn't exist at first (i.e. it isn't just hidden from view)
        await cookieAccept.click();

        // Find button (several options commented out for future reference)
        //let button = await driver.findElement(By.css('.add-to-cart-button'));
        //let button = await driver.findElement(By.id('button-id')); // Find by ID
        //let button = await driver.findElement(By.name('button-name'));
        //let button = await driver.findElement(By.xpath('//button[text()="Add"]'));
        //let button = await driver.findElement(By.xpath('//button[@_formgroupid="quantity-controls-313168567"]'));
        let button = await driver.findElement(By.xpath('//button[@aria-label="Add Morrisons Fine Green Beans to basket"]'));
        await button.click();

        console.log("Button clicked!");

        // now order additional item
        await driver.get('https://groceries.morrisons.com/products/morrisons-baby-corn/108391912')
        button = await driver.findElement(By.xpath('//button[@aria-label="Add Morrisons Baby Corn  to basket"]')); // note can update button as it's a let but can't re-declare it (var can do both, const can do neither)
        await button.click();

        console.log("Additional item added!");


    } finally {
        //await driver.quit();
    }
};


async function loadBasketMorrisons(itemsDict) {

    /*
    Seems to work well adding items while not signed in and then can sign in at the end
    */
    let driver = await new Builder().forBrowser('chrome').build();
    let failedItems = [];

    try {
        
        // Implicit wait time to allow for cookie popup to occur and be closed
        await driver.manage().setTimeouts({ implicit: 10000 });

        // Initial page open and deal with cookies message
        await driver.get('https://www.morrisons.com/');

        // Accept cookies
        let cookieAccept = await driver.findElement(By.id('onetrust-accept-btn-handler'));
        await cookieAccept.click();

        for (let item in itemsDict) {
            let url = itemsDict[item]['morrisonsUrl'];
            let buttonXpath = itemsDict[item]['morrisonsAddButtonXpath'];
            console.log(`\n🔎 Looking for ${item} at ${url}`);

            // Order item
            try {
                await driver.get(url);
                let button = await driver.findElement(By.xpath(buttonXpath));
                await button.click();
                console.log(`✅ ${item} added to basket`);
            } catch (error) {
                console.log(`❌ Couldn\'t add the ${item}, please add this manually afterwards before placing the order`);
                failedItems.push(item);
            }
        }

        if (failedItems.length == 0) {
            console.log('All items added, they should now be in the basket ready to arrange the delivery');
        } else {
            console.log(`\nUh oh some items not added, please add these manually: \n${failedItems.join("\n")}`);
        }

    } finally {
        //await driver.quit();
    }
};

async function loadBasketAsda() {

    /*
    NOTE: cannot add to Asda basket without being logged in, and cannot log in to bot opened browser
    so need to either find way to not be bot-detected to allow user login
    or use session_id of non-bot opened page - is it possible to run command-line to open chrome browser not as bot and capture session_id etc as needed?
    Also issues with wait times etc if doing this?
    */


    let driver = await new Builder().forBrowser('chrome').build();

    try {
        // implicit wait time to allow for cookie popup to occur and be closed (note that)
        await driver.manage().setTimeouts({ implicit: 10000 });

        // Open page
        await driver.get('https://groceries.asda.com/product/beans-asparagus-sweetcorn/asda-tender-crunchy-trimmed-fine-beans/910003089133');

        // Accept cookies
        let cookieAccept = await driver.findElement(By.id('onetrust-accept-btn-handler'));
        await cookieAccept.click();

        // Find button and click
        let button = await driver.findElement(By.xpath('//button[@aria-label="Add item ASDA Tender & Crunchy Trimmed Fine Beans to cart"]'));
        await button.click();

        console.log("Button clicked!");

    } finally {
        //await driver.quit();
    }
};

async function loadBasketTesco() {

    /*
    NOTE: "If you are seeing this page it is because your browser has failed some security checks" displayed
    need to investigate being undetectable as a bot
    */

    let driver = await new Builder().forBrowser('chrome').build();

    try {
        // implicit wait time to allow for cookie popup to occur and be closed (note that)
        await driver.manage().setTimeouts({ implicit: 10000 });

        // Open page
        await driver.get('https://www.tesco.com/groceries/en-GB/products/313168567');

        // Accept cookies
        //let cookieAccept = await driver.findElement(By.id('onetrust-accept-btn-handler'));
        //await cookieAccept.click();

        // Find button and click
        let button = await driver.findElement(By.xpath('//button[@aria-label="add 1 Tesco Green Beans 220G"]'));
        await button.click();

        console.log("Button clicked!");

    } finally {
        //await driver.quit();
    }
};

async function loadBasketWaitrose() {

    /*
    NOTE: Seems to work behind the scenes of login pop-up and all items are there except the first one that was attempted pre-login popup
    */

    let driver = await new Builder().forBrowser('chrome').build();

    try {
        // implicit wait time to allow for cookie popup to occur and be closed (note that)
        await driver.manage().setTimeouts({ implicit: 10000 });

        // Open page to do dummy run to clear cookie and login pop-ups
        await driver.get('https://www.waitrose.com/ecom/products/waitrose-trimmed-fine-green-beans/085418-43456-43457');

        // Accept cookies
        let cookieAccept = await driver.findElement(By.xpath('//button[@data-webviewid="accept-cookies"]'));
        await cookieAccept.click();

        // Find button and click
        let button = await driver.findElement(By.xpath('//button[@aria-label="Add Waitrose Trimmed Fine Green Beans to trolley"]'));//id('tAbtn-085418-43456-43457'));
        await button.click();

        console.log("Button clicked!");

        // Re-order first item post login pop-up
        await driver.get('https://www.waitrose.com/ecom/products/waitrose-trimmed-fine-green-beans/085418-43456-43457')
        button = await driver.findElement(By.xpath('//button[@aria-label="Add Waitrose Trimmed Fine Green Beans to trolley"]')); // note can update button as it's a let but can't re-declare it (var can do both, const can do neither)
        await button.click();

        console.log("First item added!");

        // Order additional item
        await driver.get('https://www.waitrose.com/ecom/products/essential-fairtrade-bananas/088903-45703-45704')
        button = await driver.findElement(By.xpath('//button[@aria-label="Add Essential Fairtrade Bananas to trolley"]')); // note can update button as it's a let but can't re-declare it (var can do both, const can do neither)
        await button.click();

        console.log("Additional item added!");

    } finally {
        //await driver.quit();
    }
};

async function loadBasketSainsburys() {

    /*
    Issues with account registration
    */

    let driver = await new Builder().forBrowser('chrome').build();

    try {
        // Implicit wait time to allow for cookie popup to occur and be closed (note that)
        await driver.manage().setTimeouts({ implicit: 10000 });

        // Open page
        await driver.get('https://www.sainsburys.co.uk/gol-ui/product/sainsburys-fine-beans-200g');

        // Accept cookies
        let cookieAccept = await driver.findElement(By.id('onetrust-accept-btn-handler'));
        await cookieAccept.click();

        // Find button and click
        let button = await driver.findElement(By.xpath('//button[@aria-label="Add Sainsbury\'s Fine Green Beans 200g to trolley"]'));
        await button.click();

        console.log("Button clicked!");

        // Order additional item
        //await driver.get('https://groceries.morrisons.com/products/morrisons-baby-corn/108391912')
        //button = await driver.findElement(By.xpath('//button[@aria-label="Add Morrisons Baby Corn  to basket"]')); // note can update button as it's a let but can't re-declare it (var can do both, const can do neither)
        //await button.click();

        console.log("Additional item added!");

    } finally {
        //await driver.quit();
    }
};

async function loadBasketIceland() {

    /*
    Different button type, need to review later
    */

    let driver = await new Builder().forBrowser('chrome').build();

    try {
        // Implicit wait time to allow for cookie popup to occur and be closed (note that)
        await driver.manage().setTimeouts({ implicit: 10000 });

        // Open page
        await driver.get('https://www.iceland.co.uk/p/iceland-green-beans-160g/56845.html');

        // Accept cookies
        let cookieAccept = await driver.findElement(By.id('onetrust-accept-btn-handler'));
        await cookieAccept.click();

        // Find button and click
        let button = await driver.findElement(By.xpath('//button[@aria-label="Add Sainsbury\'s Fine Green Beans 200g to trolley"]'));
        await button.click();

        console.log("Button clicked!");

        // Order additional item
        //await driver.get('https://groceries.morrisons.com/products/morrisons-baby-corn/108391912')
        //button = await driver.findElement(By.xpath('//button[@aria-label="Add Morrisons Baby Corn  to basket"]')); // note can update button as it's a let but can't re-declare it (var can do both, const can do neither)
        //await button.click();

        console.log("Additional item added!");

    } finally {
        //await driver.quit();
    }
};

async function loadBasketCoop() {

    /*
    Different button type, need to review later
    */

    let driver = await new Builder().forBrowser('chrome').build();

    try {
        // Implicit wait time to allow for cookie popup to occur and be closed (note that)
        await driver.manage().setTimeouts({ implicit: 10000 });

        // Open page
        await driver.get('https://shop.coop.co.uk/product/co-op-hand-picked-fine-beans-170g--47bbbf24-cc4f-4b6c-ae70-e888f400e167');

        // Accept cookies
        let cookieAccept = await driver.findElement(By.id('onetrust-accept-btn-handler'));
        await cookieAccept.click();

        // Find button and click
        let button = await driver.findElement(By.xpath('//button[@aria-label="Add Sainsbury\'s Fine Green Beans 200g to trolley"]'));
        await button.click();

        console.log("Button clicked!");

        // Order additional item
        //await driver.get('https://groceries.morrisons.com/products/morrisons-baby-corn/108391912')
        //button = await driver.findElement(By.xpath('//button[@aria-label="Add Morrisons Baby Corn  to basket"]')); // note can update button as it's a let but can't re-declare it (var can do both, const can do neither)
        //await button.click();

        console.log("Additional item added!");

    } finally {
        //await driver.quit();
    }
};

async function fillForm() {
    let driver = await new Builder().forBrowser('chrome').build();

    try {
        await driver.get('https://example.com/login');

        // Find input fields and enter values
        await driver.findElement(By.name('username')).sendKeys('myUsername');
        await driver.findElement(By.name('password')).sendKeys('mySecurePassword');

        // Click the login button
        await driver.findElement(By.css('.login-button')).click();

        console.log("Form submitted!");

    } finally {
        await driver.quit();
    }
};


let greenBeansAndCorn = {
    'Green Beans': {
        'morrisonsUrl': 'https://groceries.morrisons.com/products/morrisons-fine-green-beans/113430859',
        'morrisonsAddButtonXpath': '//button[@aria-label="Add Morrisons Fine Green Beans to basket"]'
    },
    'Corn': {
        'morrisonsUrl': 'https://groceries.morrisons.com/products/morrisons-baby-corn/108391912',
        'morrisonsAddButtonXpath': '//button[@aria-label="Add Morrisons Baby Corn  to basket"]'
    }
};


//testSelenium();
loadBasketMorrisons(greenBeansAndCorn);
//loadBasketAsda();
//loadBasketTesco();
//loadBasketWaitrose();
//loadBasketSainsburys();

