import React, { useState, useEffect } from "react";
import "./SelectItems.css";
import "./Generic.css";
import { loadBasketMorrisons } from './Selenium.js'
import { CartSidebar, LoadingBasketPopup } from "./Generic.js";

// Set up socket.io for order progress updates
import io from "socket.io-client";
const socket = io("http://192.168.1.165:5000", { transports: ["websocket"] });
socket.on("connect", () => {
    console.log("🟢 Connected to Socket.IO server");
});

const SelectItems = () => {
    const [items, setItems] = useState([]);
    const [search, setSearch] = useState("");
    const [customHeading, setCustomHeading] = useState("Individual Items");
    const [orderList, setOrderList] = useState(() => {
        const savedOrders = localStorage.getItem("orderList");
        return savedOrders ? JSON.parse(savedOrders) : [];
    });
    const [cartVisible, setCartVisible] = useState(() => {
        const savedCartPosition = localStorage.getItem("cartVisible");
        return savedCartPosition ? JSON.parse(savedCartPosition) : false;
    });
    const [clearCartPopup, setClearCartPopup] = useState(false);
    const [loading, setLoading] = useState(true);
    const [showPopup, setShowPopup] = useState(false);
    const [externalResults, setExternalResults] = useState([]);
    const [popupLoading, setPopupLoading] = useState(false);
    const [searchCompleteStatement, setSearchCompleteStatement] = useState("");
    const [loadingBasketPopup, setLoadingBasketPopup] = useState(false);
    const [loadingBasket, setLoadingBasket] = useState(false);
    const [failedItems, setFailedItems] = useState([]);
    const [hoveredItem, setHoveredItem] = useState(null);
    const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 });

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

    // Fetch items from backend
    useEffect(() => {
        fetch("http://192.168.1.165:5000/items")
            .then(response => response.json())
            .then(data => {
                setItems(data);
                setLoading(false);
            })
            .catch(error => {
                console.error("Error fetching items:", error);
                setLoading(false);
            });
    }, []);

    const handleAddToOrder = (item) => {
        setOrderList((prevOrders) => {
            const existingCategory = prevOrders.find(order => order.meal.toLowerCase() === customHeading.toLowerCase());
            if (existingCategory) {
                return prevOrders.map(order =>
                    order.meal.toLowerCase() === customHeading.toLowerCase() ? { ...order, items: [...order.items, item] } : order
                );
            }
            return [...prevOrders, { meal: customHeading, items: [item] }];
        });
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

    const findNewItems = async (searchTerm) => {
        setPopupLoading(true);
        setSearchCompleteStatement("");
        try {
            const response = await fetch("http://192.168.1.165:5000/find-new-items", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query: searchTerm }),
            });

            const data = await response.json();

            const itemsArray = Object.values(data);
            setExternalResults(itemsArray);
        } catch (error) {
            console.error("Error scraping items:", error);
        } finally {
            setPopupLoading(false);
            setSearchCompleteStatement("No items found"); // will only display if externalResults is length 0
        }
    };

    const addNewItems = async () => {
        try {
            await fetch("http://192.168.1.165:5000/add-new-items", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ items: externalResults }),
            });

            setItems((prevItems) => {
                const updatedItems = [...prevItems]; // copy existing

                externalResults.forEach(newItem => {
                    const index = updatedItems.findIndex(item => item.retailerProductId === newItem.retailerProductId);

                    if (index !== -1) {
                        updatedItems[index] = newItem;
                    } else {
                        updatedItems.push(newItem);
                    }
                });

                return updatedItems;
            });

            setExternalResults([]);
            setShowPopup(false); // Close pop-up after adding
            setSearchCompleteStatement("");
        } catch (error) {
            console.error("Error adding items:", error);
        }
    };

    const popupClose = () => {
        setExternalResults([]);
        setShowPopup(false);
        setSearchCompleteStatement("");
    };

    const loadBasket = async (orderList) => {
        setFailedItems([]);
        let orderFails = [];
        try {
            setLoadingBasketPopup(true);
            setLoadingBasket(true);
            orderFails = await loadBasketMorrisons(orderList);
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

    const handleMouseEnter = (event, item) => {
        setHoveredItem(item);
        
        const rect = event.currentTarget.getBoundingClientRect();
        //const container = document.querySelector(".item-list-container"); // Get the container
        //const containerRect = container?.getBoundingClientRect(); // Get container position

        /* // Keeping these here for reference later if needed
        console.log(`event.pageX: ${event.pageX}`); // x position of mouse wrt edge of the page (including all off-screen content)
        console.log(`event.pageY: ${event.pageY}`); // x position of mouse wrt edge of the page (including off-screen content)
        console.log(`event.clientX: ${event.clientX}`); // Same as pageX when not scrolled
        console.log(`event.clientY: ${event.clientY}`); // Same as rect.top
        console.log(`window.scrollX: ${window.scrollX}`); //
        console.log(`window.scrollY: ${window.scrollY}`); // Scroll amount = pageY - clientY (or pageY = rect.top)
        console.log(`rect.top: ${rect.top}`); // position of top of item being hovered over wrt edge of browser window (can be negative if top of item is partially off screen)
        console.log(`rect.left: ${rect.left}`); // left hand side of item being hovered over wrt browser window (can be -ve)
        console.log(`rect.width: ${rect.width}`); // width of item being hovered over (can be -ve)
        console.log(`rect.right: ${rect.right}`);
        console.log(`document.documentElement.scrollTop: ${document.documentElement.scrollTop}`);
        */
        
        // Popup has 'fixed' position so top and left are relative to entire page
        setPopupPosition({
            top: rect.top,  // want this to be based on "event.pageY - height of content above items container"
            left: rect.right
        });
    };

    return (
        <div className="items-container">
            <div className="top-section">
                <div className="header">
                    <button className="home-button" onClick={() => window.location.href = "/"}>Home</button>
                    <button className="cart-button" onClick={() => setCartVisible(!cartVisible)}>🛒 Shopping List</button>
                </div>
                <h1 className="items-title">Select Individual Items</h1>
            </div>

            <div className="bottom-section">
                <p className="items-description">
                    Seach for and select individual items to add to order
                </p>
                <div className="select-item-category">
                    <span className="select-item-category-title" data-tooltip="Any items added will be shown under this heading in the shopping list">
                    <span className="info-sign">ⓘ</span> Category: 
                    </span>
                    <input 
                        type="text" 
                        placeholder="Enter category name (optional)" 
                        className="category-input" 
                        value={customHeading} 
                        onChange={(e) => setCustomHeading(e.target.value)}
                    />
                </div>
                <div className="select-item-search">
                    <input 
                        className="search-bar" 
                        type="text" 
                        placeholder="Search for an item..." 
                        value={search} 
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    <div className="external-search-link" onClick={() => setShowPopup(true)}>
                        Can't find what you're looking for?
                    </div>
                </div>

                {loading ? (
                    <div className="loading-message">Finding items...<div className="loading-spinner"></div></div>
                ) : (
                    <div className="items-list">
                        {items.filter(item => item.name.toLowerCase().includes(search.toLowerCase())).map((item) => (
                            <div key={item._id} className="item formatted-item" onMouseEnter={(event) => handleMouseEnter(event, item)} onMouseLeave={() => setHoveredItem(null)}>
                                <span className="item-text-select-items">
                                    {item.name}{item.size ? ` (${item.size.value})` : ""}{item.price ? `, £${item.price.current.amount}` : ""}
                                    <sup>
                                        <a 
                                            href={`https://groceries.morrisons.com/products/${item.retailerProductId}`} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="item-link"
                                        >view ⎘</a>
                                    </sup>
                                </span>
                                <button className="add-item-button" onClick={() => handleAddToOrder(item)}>Add</button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
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

            {/* POPUP */}
            {showPopup && (
                <div className="popup-overlay">
                    <div className="popup-content">
                        <span className="popup-close-button" onClick={() => popupClose()}>✖</span>
                        <h2 className="popup-title">Find more items</h2>
                        <div className="popup-description">Search for more items from grocery suppliers and add them to the app</div>
                        <input
                            type="text"
                            value={search}
                            placeholder="Search for an item..." 
                            onChange={(e) => setSearch(e.target.value)}
                            className="popup-search-bar"
                        />
                        <div className="popup-controls">
                            <button className="popup-search-button" onClick={() => findNewItems(search)}>
                                Search External Store
                            </button>
                        </div>

                        {popupLoading ? (
                            <div className="loading-message">Searching for items...<div className="loading-spinner"></div></div>
                        ) : (
                            <>
                            </>
                        )}

                        {externalResults.length > 0 ? (
                            <>
                                <button className="popup-add-items-db-button" onClick={addNewItems}>
                                    Add Items to Database
                                </button>
                                <div className="items-list">
                                    {externalResults.map((item, index) => (
                                        <div key={index} className="item" onMouseEnter={(event) => handleMouseEnter(event, item)} onMouseLeave={() => setHoveredItem(null)}>
                                            <span className="item-text-select-items">
                                                {item.name}{item.size ? ` (${item.size.value})` : ""}{item.price ? `, £${item.price.current.amount}` : ""}
                                                <sup>
                                                    <a 
                                                        href={`https://groceries.morrisons.com/products/${item.retailerProductId}`} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="item-link"
                                                    >view ⎘</a>
                                                </sup>
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <p>{searchCompleteStatement}</p>
                        )}
                    </div>
                </div>
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

        </div>
    );
};

export default SelectItems;
