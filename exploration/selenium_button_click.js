const { Builder, By } = require('selenium-webdriver');

(async function clickButton() {
    let driver = await new Builder().forBrowser('chrome').build();

    try {
        await driver.get('https://example.com');

        // Find button by class and click it
        let button = await driver.findElement(By.css('.add-to-cart-button'));
        await button.click();

        console.log("Button clicked!");

    } finally {
        await driver.quit();
    }
})();