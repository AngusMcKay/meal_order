document.getElementById("extract").addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "extract_cookies" });
});