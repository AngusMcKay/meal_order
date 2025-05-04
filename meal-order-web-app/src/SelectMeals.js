import React, { useState, useEffect } from "react";
import Tabs from "./Tabs";
import "./SelectMeals.css";
import "./Generic.css";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { loadBasketMorrisons } from './Selenium.js'
import { CartSidebar, OrderTablePopup, LoadingBasketPopup, AuthPopup } from "./Generic.js";
import io from "socket.io-client";
import { useUser } from "./context/UserContext";

const EXTENSION_ID = process.env.REACT_APP_EXTENSION_ID;
const API_BASE_URL = process.env.REACT_APP_SERVER_HOST;
const GROCERY_SITE_URL = process.env.REACT_APP_GROCERY_SITE_URL;

const socket = io(`${API_BASE_URL}`, { transports: ["websocket"] });
socket.on("connect", () => {
    console.log("🟢 Connected to Socket.IO server");
});

const SelectMeals = () => {
    const { user, saveMeal, saveItem, deleteMeal } = useUser();
    const [mealsData, setMealsData] = useState(user?.meals || []);
    //const [mealsData, setMealsData] = useState([]);
    const [selectedMeal, setSelectedMeal] = useState("");
    const [selectedItems, setSelectedItems] = useState({});
    const [recipe, setRecipe] = useState("");
    const [orderList, setOrderList] = useState(() => {
        const savedOrders = localStorage.getItem("orderList");
        return savedOrders ? JSON.parse(savedOrders) : [];
    });
    const [cartVisible, setCartVisible] = useState(() => {
        const savedCartPosition = localStorage.getItem("cartVisible");
        return savedCartPosition ? JSON.parse(savedCartPosition) : false;
    });
    const [clearCartPopup, setClearCartPopup] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [orderTablePopup, setOrderTablePopup] = useState(false);
    const [loadingBasketPopup, setLoadingBasketPopup] = useState(false);
    const [loadingBasket, setLoadingBasket] = useState(false);
    const [failedItems, setFailedItems] = useState([]);
    const [hoveredItem, setHoveredItem] = useState(null);
    const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 });

    // Auth
    const [showAuthPopup, setShowAuthPopup] = useState(false);

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
            setOrderProgress("");
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
    
    // Fetch meals from backend
    useEffect(() => {
            setMealsData(user?.meals || []);
        }, [user]);

    /* DEPRECATED - now using user specific meals
    useEffect(() => {
        fetch(`${API_BASE_URL}/meals`, { method: 'GET', headers: { "ngrok-skip-browser-warning": "true", "Content-Type": "application/json" } })
            .then((response) => response.json())
            .then((data) => {
                console.log("Fetched data:", data);
                setMealsData(data);
            })
            .catch((err) => console.error("Error fetching meals:", err));
    }, []);*/

    const handleMealChange = (event) => {
        const mealName = event.target.value;
        setSelectedMeal(mealName);

        // Find the meal object from the fetched meals list
        const meal = mealsData.find((m) => m.name === mealName);
        if (meal) {
            setSelectedItems(meal.items.reduce((accumulator, item, index) => ({ ...accumulator, [index]: true }), {}));  // changed to idx
            setRecipe(meal.recipe);
            console.log(JSON.stringify(selectedItems));
        }
    };

    const toggleItemSelection = (itemIndex) => { // changed to idx
        setSelectedItems((prev) => ({ ...prev, [itemIndex]: !prev[itemIndex] }));  // changed to idx
    };

    const checkPlaceholderItem = (item) => { // function to check if an item is just a placeholder and not an actual grocery store item
        if (item.type && item.type === 'placeholder') {
            return true;
        } else {
            return false;
        }
    };

    const handleAddToOrder = () => {
        const selectedOrder = mealsData.find((m) => m.name === selectedMeal).items.filter((item, index) => selectedItems[index] && !checkPlaceholderItem(item)) // Object.keys(selectedItems).filter((item) => selectedItems[item]);
        if (selectedOrder.length > 0) {
            setOrderList((prevOrders) => [...prevOrders, { meal: selectedMeal, items: selectedOrder }]);
            toast.success("Meal added!", { position: "top-center" });
        }
    };

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

    const loadBasket = async (orderList, orderType = "tablePopup") => {

        if (orderType === "tablePopup") {
            // Prepare data for the table popup
            setOrderTablePopup(true);
        
        } else if (orderType === "autoOrderMorrisons") {
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
        }
    };
    
    const openAllLinks = () => {
        orderList.forEach((order) => {
            order.items.forEach((item) => {
                if (item.link) {
                    window.open(item.link, "_blank");
                }
            });
        });
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

    const handleMouseEnter = (event, item) => {
        setHoveredItem(item);
        
        const rect = event.currentTarget.getBoundingClientRect();
        
        // Popup has 'fixed' position so top and left are relative to entire page
        setPopupPosition({
            top: rect.top,  // want this to be based on "event.pageY - height of content above items container"
            left: rect.right
        });
    };

    return (
        <div className="meal-container">
            <Tabs />
            <ToastContainer />
            <div className="top-section-meals"> 
                <div className="header">
                    <button className="auth-popup-trigger" onClick={() => setShowAuthPopup(true)}>
                        👤 Login / Register
                    </button>
                    <AuthPopup showAuthPopup={showAuthPopup} setShowAuthPopup={setShowAuthPopup} />
                    <button className="cart-button" onClick={() => setCartVisible(!cartVisible)}>🛒 Shopping List</button>
                </div>

                <h1 className="meal-title">My Meals and Lists</h1>
            </div>

            <div className="bottom-section-meals"> 
                <p className="meal-description">
                    Select a meal or predefined list below and add items to your order
                </p>
                <select className="meal-dropdown" onChange={handleMealChange} value={selectedMeal}>
                    <option value="" disabled>Select a meal</option>
                    {mealsData.map((meal) => (
                        <option key={meal.name} value={meal.name}>{meal.name}</option>
                    ))}
                </select>
                {recipe && (
                    <div className="select-meal-recipe-link" onMouseEnter={() => setShowPreview(true)} onMouseLeave={() => setShowPreview(false)}>
                        <a href={recipe} target="_blank" rel="noopener noreferrer" className="recipe-link">
                            View Recipe ⎘
                        </a>
                    </div>
                )}
            </div>

            
            
            {selectedMeal && (
                <div className="items-list">
                    {mealsData.find(m => m.name === selectedMeal)?.items.map((item, index) => (
                        <div key={index} className="item" onMouseEnter={(event) => handleMouseEnter(event, item)} onMouseLeave={() => setHoveredItem(null)}>
                            <span className="item-text">
                                {item.name}{item.size ? ` (${item.size})` : ""}{item.price ? `, £${item.price.current.amount}` : ""}
                                { item.link ? (
                                    <sup>
                                        <a 
                                            href={`${item.link}`} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="item-link"
                                        >view ⎘</a>
                                    </sup>
                                ) : (
                                    <>
                                    </>
                                )}
                            </span>
                            { !checkPlaceholderItem(item) ? (
                                <>
                                    <span className={selectedItems[index] ? "bold-green" : "faded-green"} onClick={() => toggleItemSelection(index)}>✔</span>
                                    <span className={!selectedItems[index] ? "bold-red" : "faded-red"} onClick={() => toggleItemSelection(index)}>✖</span>
                                </>
                            ) : (
                                <span className="faded-red-info" title="Placeholder Item: These items are not specific items available from the grocery store and so will not be added to cart. These need to be added/bought manually directly from the grocery store. Update the meal on the Create Meals page if you want to replace the placeholder with an item that can be automatically included in the order." data-toggle="tooltip">ⓘ</span>
                            )}
                        </div>
                    ))}
                    <button className="add-order-button" onClick={handleAddToOrder}>Add To Order</button>
                </div>
            )}
            {hoveredItem && hoveredItem.image?.src && (
                <div 
                    className="hover-popup-select" 
                    style={{ top: `${popupPosition.top}px`, left: `${popupPosition.left}px` }}
                >
                    <img src={hoveredItem.image.src} alt={hoveredItem.name} />
                </div>
            )}

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

            {orderTablePopup && (
                <OrderTablePopup
                    orderList={orderList}
                    onClose={() => setOrderTablePopup(false)}
                    openAllLinks={openAllLinks}
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
        </div>
    );
};

export default SelectMeals;
