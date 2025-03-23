import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Tooltip } from "@mui/material";
import "./HomePage.css";
import "./Generic.css";
import { loadBasketMorrisons } from './Selenium.js'
import { CartSidebar, LoadingBasketPopup } from "./Generic.js";
import io from "socket.io-client";

const EXTENSION_ID = process.env.REACT_APP_EXTENSION_ID;
const API_BASE_URL = process.env.REACT_APP_SERVER_HOST;
const GROCERY_SITE_URL = process.env.REACT_APP_GROCERY_SITE_URL;

// Set up socket.io for order progress updates
const socket = io(`${API_BASE_URL}`, { transports: ["websocket"] });
socket.on("connect", () => {
    console.log("🟢 Connected to Socket.IO server");
});

const HomePage = () => {
    const navigate = useNavigate();
    const [orderList, setOrderList] = useState(() => {
        const savedOrders = localStorage.getItem("orderList");
        return savedOrders ? JSON.parse(savedOrders) : [];
    });
    const [cartVisible, setCartVisible] = useState(() => {
        const savedCartPosition = localStorage.getItem("cartVisible");
        return savedCartPosition ? JSON.parse(savedCartPosition) : false;
    });
    const [clearCartPopup, setClearCartPopup] = useState(false);
    const [loadingBasketPopup, setLoadingBasketPopup] = useState(false);
    const [loadingBasket, setLoadingBasket] = useState(false);
    const [failedItems, setFailedItems] = useState([]);
    
    // cookies stuff
    const [extensionExists, setExtensionExists] = useState(null);
    const [cookies, setCookies] = useState(null);
    const [showExtCookiePopup, setShowExtCookiePopup] = useState(false);
    const [extCookiePopupMessage, setExtCookiePopupMessage] = useState("");
    const [extCookiePopupLink, setExtCookiePopupLink] = useState("");
    useEffect(() => {
        checkForExistingCookies();
    }, []);
    
    const [orderProgress, setOrderProgress] = useState("");
    useEffect(() => {
        socket.on("orderProgress", (message) => {
            setOrderProgress(message);
        });

        socket.on("orderComplete", (message) => {
            setOrderProgress(message);
        });

        return () => {
            socket.off("orderProgress");
            socket.off("orderComplete");
        };
    }, []);

    useEffect(() => {
        localStorage.setItem("orderList", JSON.stringify(orderList));
    }, [orderList]);

    useEffect(() => {
        localStorage.setItem("cartVisible", JSON.stringify(cartVisible));
    }, [cartVisible]);  

    const removeCartItem = (mealIndex, itemIndex) => {
        setOrderList((prevOrders) => {
            const updatedOrders = prevOrders.map((order, index) => {
                if (index === mealIndex) {
                    return { ...order, items: order.items.filter((i, idx) => idx !== itemIndex) };
                }
                return order;
            }).filter(order => order.items.length > 0);
            return updatedOrders;
        });
    };

    const removeCartMeal = (mealIndex) => {
        const updatedOrders = orderList.filter((order, index) => index !== mealIndex);
        setOrderList(updatedOrders);
    };

    const clearCartCheck = () => {
        setClearCartPopup(true);
    };

    const clearCart = () => {
        setOrderList([]);
        setClearCartPopup(false);  
    };

    const loadBasket = async (orderList) => {
        setFailedItems([]);
        let orderResponse = {};
        let orderFails = [];
        try {
            setLoadingBasketPopup(true);
            setLoadingBasket(true);
            orderResponse = await loadBasketMorrisons(orderList);
            if (orderResponse.success === true) {
                orderFails = orderResponse.failedItems;
            } else {
                checkForExtension();
            }
        } catch (error) {
            console.error("Error exporting items:", error);
        } finally {
            setLoadingBasket(false);
            setFailedItems(orderFails);
        }
    };

    const basketPopupClose = () => {
        setLoadingBasketPopup(false);
        setLoadingBasket(false);
        setFailedItems([]);
    };

    const checkForExistingCookies = () => {
        // Simulate checking for cookies (Replace this with an actual check)
        const existingCookies = false; // Change to true if cookies exist

        if (existingCookies) {
            console.log("✅ Required cookies found.");
            onCookiesReady();
        } else {
            console.log("❌ Cookies NOT found. Checking for extension...");
            checkForExtension();
        }
    };

    const checkForExtension = () => {
        if (!window.chrome || !window.chrome.runtime || !window.chrome.runtime.sendMessage) {
            console.log("❌ Chrome extension API not available.");
            setExtCookiePopupMessage("A Chrome browser extension is required for this app to work. Please install it and click OK once done. Chrome is the only supported browser at this stage. Additional browser support will be added soon!");
            setExtCookiePopupLink(`https://chrome.google.com/webstore/detail/${EXTENSION_ID}`); // Replace with actual extension link
            setShowExtCookiePopup(true);
            setExtensionExists(false);
            return;
        }

        window.chrome.runtime.sendMessage(EXTENSION_ID, { action: "ping" }, (response) => {
            if (window.chrome.runtime.lastError || !response) {
                console.log("❌ Extension NOT found.");
                setExtCookiePopupMessage("A Chrome browser extension is required for this app to work. Please install it and click OK once done. Chrome is the only supported browser at this stage. Additional browser support will be added soon!");
                setExtCookiePopupLink(`https://chrome.google.com/webstore/detail/${EXTENSION_ID}`); // Replace with actual extension link
                setShowExtCookiePopup(true);
                setExtensionExists(false);
            } else {
                console.log("✅ Extension found.");
                setExtensionExists(true);
                extractCookies();
            }
        });
    };

    const extractCookies = () => {
        if (!window.chrome || !window.chrome.runtime || !window.chrome.runtime.sendMessage) {
            console.log("❌ Chrome extension API not available.");
            setExtCookiePopupMessage("A Chrome browser extension is required for this app to work. Please install it and click OK once done. Chrome is the only supported browser at this stage. Additional browser support will be added soon!");
            setExtCookiePopupLink(`https://chrome.google.com/webstore/detail/${EXTENSION_ID}`); // Replace with actual extension link
            setShowExtCookiePopup(true);
            setExtensionExists(false);
            return;
        }

        window.chrome.runtime.sendMessage(EXTENSION_ID, { action: "extract_cookies" }, (response) => {
            if (window.chrome.runtime.lastError) {
                console.error("Error communicating with extension:", window.chrome.runtime.lastError.message);
            } else if (!response || response.error) {
                console.error("Error extracting cookies:", response ? response.error : "Unknown error");
            } else {
                console.log("✅ Cookies received from extension:", response.cookies);
                setCookies(response.cookies);
                checkExtractedCookies(response.cookies);
            }
        });
    };

    const checkExtractedCookies = async (cookies) => {
        const relevantCookies = cookies.some(cookie => cookie.domain.includes("morrisons.com")); // Add more constraints: cookie.name === "session" && cookie.domain.includes("morrisons.com")

        if (relevantCookies) {
            console.log("✅ Required cookies are present. Saving..");
            await fetch(`http://localhost:5000/store-cookies`, {
                method: "POST",
                headers: { "ngrok-skip-browser-warning": "true", "Content-Type": "application/json" },
                body: JSON.stringify({ cookies: relevantCookies }),
            });
            onCookiesReady();
        } else {
            console.log("❌ Required cookies NOT found.");
            setExtCookiePopupMessage("Store login needed before app can proceed. Please follow the link below to login and click OK once done.");
            setExtCookiePopupLink(GROCERY_SITE_URL);
            setShowExtCookiePopup(true);
        }
    };

    const onCookiesReady = () => {
        console.log("✅ Cookies are ready! Running the main app function...");
        performAppFunction();
    };

    const performAppFunction = () => {
        console.log("🚀 Running the main application function...");
    };

    return (
        <div className="container">
            <div className="header">
                <button className="cart-button-home" onClick={() => setCartVisible(!cartVisible)}>🛒 Shopping List</button>
            </div>
            <h1 className="title">Welcome to Grocery List & Delivery</h1>
            <p className="description">
                Streamline your grocery shopping by selecting meals and automatically populating shopping carts.
                Choose one of the options below to get started.
            </p>
            
            <div className="button-container row">
                <Tooltip title="Select from presaved meal combinations and item lists to add to Shopping Basket" arrow>
                    <button className="button meals" onClick={() => navigate("/select-meals")}>My Meals and Lists</button>
                </Tooltip>
                
                <Tooltip title="Add individual items for your order" arrow>
                    <button className="button items" onClick={() => navigate("/select-items")}>Individual Items</button>
                </Tooltip>
                
                <Tooltip title="Create meals and lists to save for future use" arrow>
                    <button className="button create" onClick={() => navigate("/create-meals")}>Create Meals and Lists</button>
                </Tooltip>
            </div>

            {cartVisible && (
                <CartSidebar 
                    cartVisible={cartVisible}
                    setCartVisible={setCartVisible}
                    orderList={orderList}
                    removeCartItem={removeCartItem}
                    removeCartMeal={removeCartMeal}
                    loadBasket={loadBasket}
                    clearCartCheck={clearCartCheck}
                />
            )}

            { loadingBasketPopup && (
                <LoadingBasketPopup
                    loadingBasketPopup={loadingBasketPopup}
                    loadingBasket={loadingBasket}
                    setLoadingBasket={setLoadingBasket}
                    basketPopupClose={basketPopupClose}
                    failedItems={failedItems}
                    orderProgress={orderProgress}
                />
            )}

            {clearCartPopup && (
                <div className="clear-cart-popup-overlay">
                    <div className="clear-cart-popup">
                        <h3>Are you sure you want to remove all items from the Shopping List?</h3>
                        <p>This action cannot be undone</p>
                        <div className="clear-cart-popup-buttons">
                            <button className="clear-cart-confirm-delete" onClick={clearCart}>Yes, Delete</button>
                            <button className="clear-cart-cancel-delete" onClick={() => setClearCartPopup(false)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {showExtCookiePopup && (
                <div className="popup">
                    <p>{extCookiePopupMessage}</p>
                    {extCookiePopupLink && <a href={extCookiePopupLink} target="_blank" rel="noopener noreferrer">Click here to open</a>}
                    <button onClick={() => {
                        setShowExtCookiePopup(false);
                        extensionExists === false ? checkForExtension() : extractCookies();
                    }}>OK</button>
                    <button onClick={() => setShowExtCookiePopup(false)}>Cancel</button>
                </div>
            )}

        </div>
    );
};

export default HomePage;
