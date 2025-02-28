const { Builder, By, until } = require('selenium-webdriver');


export default async function loadBasketMorrisons(itemsDict) {

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

