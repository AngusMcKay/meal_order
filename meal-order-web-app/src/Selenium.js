import { extractCookies, checkExtensionInstalled } from "./Generic.js";

const API_BASE_URL = process.env.REACT_APP_SERVER_HOST;

export const runSeleniumTest = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/run-selenium-test`, { method: "POST" });
        const data = await response.json();
        alert(data.message);
    } catch (error) {
        console.error("Error running Selenium:", error);
    }
};

export const loadBasketMorrisons = async (orderList) => {
    try {

        const response = await fetch(`${API_BASE_URL}/run-selenium-morrisons-order`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderList })
        });

        /* // Original way of running and checking cookies etc
        const response = await fetch(`${API_BASE_URL}/run-selenium-morrisons-order-orig`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderList })
        });*/

        const data = await response.json();

        return data;
    } catch (error) {
        console.error("Error running Selenium:", error);
    }
};

