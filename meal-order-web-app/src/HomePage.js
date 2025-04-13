import React, { useState, useEffect } from "react";
import Tabs from "./Tabs";
import { useNavigate } from "react-router-dom";
import { Tooltip } from "@mui/material";
import "./HomePage.css";
import "./Generic.css";
import { loadBasketMorrisons } from './Selenium.js'
import { CartSidebar, LoadingBasketPopup, ExtCookiePopup } from "./Generic.js";
import io from "socket.io-client";
import { useUser } from "./context/UserContext";

const EXTENSION_ID = process.env.REACT_APP_EXTENSION_ID;
const API_BASE_URL = process.env.REACT_APP_SERVER_HOST;
const GROCERY_SITE_URL = process.env.REACT_APP_GROCERY_SITE_URL;

// Set up socket.io for order progress updates
const socket = io(`${API_BASE_URL}`, { transports: ["websocket"] });
socket.on("connect", () => {
    console.log("🟢 Connected to Socket.IO server");
});

const HomePage = () => {
    const { user, saveMeal, saveItem, deleteMeal } = useUser();
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
    const [showExtCookiePopup, setShowExtCookiePopup] = useState(false);
    const [extCookiePopupMessage, setExtCookiePopupMessage] = useState("");
    const [extCookiePopupLink, setExtCookiePopupLink] = useState("");
    const [extCookiePopupLinkText, setExtCookiePopupLinkText] = useState("Click here to open");
    
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
                checkForExtension('init');
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

    const checkForExtension = (initOrOngoing) => {
        console.log(`Attempting to connect to extension ${EXTENSION_ID}`)
        
        let extMessage = ""
        if (initOrOngoing === 'init') {
            extMessage = "A Chrome browser extension is required for this app to work. Please install it and click OK once done. Chrome is the only supported browser at this stage. Additional browser support will be added soon.";
        } else {
            extMessage = "Still unable to detect the required Chrome browser extension. Please confirm it is installed and activated and click OK once done. Chrome is the only supported browser at this stage. Additional browser support will be added soon.";
        }
        if (!window.chrome || !window.chrome.runtime || !window.chrome.runtime.sendMessage) {
            console.log("❌ Chrome extension API not available");
            setExtCookiePopupMessage(extMessage);
            setExtCookiePopupLink(`https://chrome.google.com/webstore/detail/${EXTENSION_ID}`); // Replace with actual extension link
            setExtCookiePopupLinkText("Click here to go to extension install page");
            setShowExtCookiePopup(true);
            setExtensionExists(false);
            setLoadingBasketPopup(false);
            setLoadingBasket(false);
            return;
        }

        window.chrome.runtime.sendMessage(EXTENSION_ID, { action: "ping" }, (response) => {
            if (window.chrome.runtime.lastError) {
                console.error("❌ Error:", window.chrome.runtime.lastError.message);
                setExtCookiePopupMessage(extMessage);
                setExtCookiePopupLink(`https://chrome.google.com/webstore/detail/${EXTENSION_ID}`); // Replace with actual extension link
                setExtCookiePopupLinkText("Click here to go to extension install page");
                setShowExtCookiePopup(true);
                setExtensionExists(false);
                setLoadingBasketPopup(false);
                setLoadingBasket(false);
            } else if (!response) {
                console.log("❌ Extension NOT found - can't find.");
                setExtCookiePopupMessage(extMessage);
                setExtCookiePopupLink(`https://chrome.google.com/webstore/detail/${EXTENSION_ID}`); // Replace with actual extension link
                setExtCookiePopupLinkText("Click here to go to extension install page");
                setShowExtCookiePopup(true);
                setExtensionExists(false);
                setLoadingBasketPopup(false);
                setLoadingBasket(false);
            } else {
                console.log("✅ Extension found.");
                setExtensionExists(true);
                extractCookies(initOrOngoing);
            }
        });

    };

    const extractCookies = (initOrOngoing) => {
        let extMessage = ""
        if (initOrOngoing === 'init') {
            extMessage = "A Chrome browser extension is required for this app to work. Please install it and click OK once done. Chrome is the only supported browser at this stage. Additional browser support will be added soon.";
        } else {
            extMessage = "Still unable to detect the required Chrome browser extension. Please confirm it is installed and activated and click OK once done. Chrome is the only supported browser at this stage. Additional browser support will be added soon.";
        }
        if (!window.chrome || !window.chrome.runtime) {
            console.log("❌ Chrome extension API not available.");
            setExtCookiePopupMessage(extMessage);
            setExtCookiePopupLink(`https://chrome.google.com/webstore/detail/${EXTENSION_ID}`); // Replace with actual extension link
            setExtCookiePopupLinkText("Click here to go to extension install page");
            setShowExtCookiePopup(true);
            setExtensionExists(false);
            setLoadingBasketPopup(false);
            setLoadingBasket(false);
            return;
        }

        window.chrome.runtime.sendMessage(EXTENSION_ID, { action: "extract_cookies" }, (response) => {
            if (window.chrome.runtime.lastError) {
                console.error("Error communicating with extension:", window.chrome.runtime.lastError.message);
            } else if (!response || response.error) {
                console.error("Error extracting cookies:", response ? response.error : "Unknown error");
            } else {
                console.log("✅ Cookies received from extension:", response.cookies);
                checkExtractedCookies(response.cookies);
            }
        });
    };

    const checkExtractedCookies = async (cookies) => {
        const relevantCookies = cookies.filter(cookie => cookie.domain.includes("morrisons.com")); // Add more constraints: cookie.name === "session" && cookie.domain.includes("morrisons.com")

        if (relevantCookies.length > 0) {
            console.log("✅ Required cookies are present. Saving..");
            const saving_response = await fetch(`http://localhost:5000/store-cookies`, {
                method: "POST",
                headers: { "ngrok-skip-browser-warning": "true", "Content-Type": "application/json" },
                body: JSON.stringify({ cookies: relevantCookies }),
            });

            const data = await saving_response.json();
            if (data.success) {
                console.log(data.message);
                loadBasket(orderList);
                setShowExtCookiePopup(false);
            } else {
                console.log("Failed to save cookies");
            }
            
        } else {
            console.log("❌ Required cookies NOT found.");
            setExtCookiePopupMessage("Store login needed before app can proceed. Please follow the link below to login and click OK once done.");
            setExtCookiePopupLink(GROCERY_SITE_URL);
            setExtCookiePopupLinkText(`Click here to log in to ${GROCERY_SITE_URL}`);
            setShowExtCookiePopup(true);
        }
    };

    return (
        <div className='home-page'>
            <Tabs />
            <div className="top-section-home">
                <div className="header">
                    <button className="cart-button" onClick={() => setCartVisible(!cartVisible)}>🛒 Shopping List</button>
                </div>
            </div>
            <div className="container">
                
                <h1 className="title">Welcome to Grocery List & Delivery</h1>
                <p className="description">
                    Streamline your grocery shopping by selecting meals and automatically populating shopping carts.
                    Choose the appropriate tab above for what you want to do:
                    <ul className="home-guidance">
                        <li><span className="bold">My Meals:</span> select presaved meals to add items to Shopping List</li>
                        <li><span className="bold">Items:</span> add individual items to your order</li>
                        <li><span className="bold">Create Meals:</span> create meals to add to order or save for future use</li>
                    </ul>
                </p>
                
                {/*<div className="button-container row">
                    <Tooltip title="Select from presaved meal combinations and item lists to add to Shopping Basket" arrow>
                        <button className="button meals" onClick={() => navigate("/select-meals")}>My Meals and Lists</button>
                    </Tooltip>
                    
                    <Tooltip title="Add individual items for your order" arrow>
                        <button className="button items" onClick={() => navigate("/select-items")}>Individual Items</button>
                    </Tooltip>
                    
                    <Tooltip title="Create meals and lists to save for future use" arrow>
                        <button className="button create" onClick={() => navigate("/create-meals")}>Create Meals and Lists</button>
                    </Tooltip>
                </div>*/}

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
                    <ExtCookiePopup
                        extCookiePopupMessage={extCookiePopupMessage}
                        extCookiePopupLink={extCookiePopupLink}
                        setShowExtCookiePopup={setShowExtCookiePopup}
                        extensionExists={extensionExists}
                        checkForExtension={checkForExtension}
                        extractCookies={extractCookies}
                        extCookiePopupLinkText={extCookiePopupLinkText}
                    />
                )}

            </div>
        </div>
    );
};

export default HomePage;
