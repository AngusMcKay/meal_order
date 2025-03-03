
export const runSeleniumTest = async () => {
    try {
        const response = await fetch("http://localhost:5000/run-selenium-test", { method: "POST" });
        const data = await response.json();
        alert(data.message);
    } catch (error) {
        console.error("Error running Selenium:", error);
    }
};

export const loadBasketMorrisons = async (orderList) => {
    try {
        const response = await fetch("http://localhost:5000/run-selenium-morrisons-order", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderList })
        });

        const data = await response.json();
        if (data.failedItems.length > 0) {
            alert(`Failed to add items: ${data.failedItems.map(i => i.name).join(", ")}`);
        } else {
            alert("All items added successfully!");
        }
    } catch (error) {
        console.error("Error running Selenium:", error);
    }
};


