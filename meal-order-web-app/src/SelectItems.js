import React, { useState, useEffect } from "react";
import "./SelectItems.css";
import "./Generic.css";
import { runSeleniumTest, loadBasketMorrisons } from './Selenium.js'

const SelectItems = () => {
    const [items, setItems] = useState([]);
    const [search, setSearch] = useState("");
    const [customHeading, setCustomHeading] = useState("Individual Items");
    const [orderList, setOrderList] = useState(() => {
        const savedOrders = localStorage.getItem("orderList");
        return savedOrders ? JSON.parse(savedOrders) : [];
    });
    const [cartVisible, setCartVisible] = useState(false);
    const [loading, setLoading] = useState(true);
    const [showPopup, setShowPopup] = useState(false);
    const [externalResults, setExternalResults] = useState([]);

    useEffect(() => {
        localStorage.setItem("orderList", JSON.stringify(orderList));
    }, [orderList]);

    // Fetch items from backend
    useEffect(() => {
        fetch("http://localhost:5000/items")
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

    const findNewItems = async (searchTerm) => {
        try {
            const response = await fetch("http://localhost:5000/find-new-items", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query: searchTerm }),
            });

            const data = await response.json();

            const itemsArray = Object.values(data);
            setExternalResults(itemsArray);
        } catch (error) {
            console.error("Error scraping items:", error);
        }
    };

    const addNewItems = async () => {
        try {
            await fetch("http://localhost:5000/add-new-items", {
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
        } catch (error) {
            console.error("Error adding items:", error);
        }
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
                <input 
                    className="search-bar" 
                    type="text" 
                    placeholder="Search for an item..." 
                    value={search} 
                    onChange={(e) => setSearch(e.target.value)}
                />
                <span className="external-search-link" onClick={() => setShowPopup(true)}>
                    Can't find what you're looking for?
                </span>
                <p className="items-description">
                    Change the description below before adding items<br></br>to store them under different headings in the cart 
                </p>
                <input 
                    type="text" 
                    placeholder="Enter category name (optional)" 
                    className="category-input" 
                    value={customHeading} 
                    onChange={(e) => setCustomHeading(e.target.value)}
                />

                {loading ? (
                    <div className="loading-message">Finding items...<div className="loading-spinner"></div></div>
                ) : (
                    <div className="items-list">
                        {items.filter(item => item.name.toLowerCase().includes(search.toLowerCase())).map((item) => (
                            <div key={item._id} className="item formatted-item">
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

            {cartVisible && (
                <>
                    <div className="cart-sidebar">
                        <button className="close-cart" onClick={() => setCartVisible(false)}>✖</button>
                        <h2 className="cart-title">Shopping List</h2>
                        {orderList.length > 0 ? (
                            orderList.map((order, mealIndex) => (
                                <div key={mealIndex} className="cart-meal">
                                    <strong>{order.meal}</strong>
                                    {order.items.map((item, itemIndex) => (
                                        <div key={itemIndex} className="cart-item">
                                            <span className="cart-item-text">{item.name}</span>
                                            <span className="remove-cart-item" onClick={() => removeCartItem(mealIndex, itemIndex)}>✖</span>
                                        </div>
                                    ))}
                                </div>
                            ))
                        ) : (
                            <p>No items in the cart.</p>
                        )}
                    </div>
                    <div className='cart-sidebar-bottom'>
                        <button className="export-order-button" onClick={() => loadBasketMorrisons(orderList)}>Export Order</button>
                    </div>
                </>
            )}

            {/* POPUP */}
            {showPopup && (
                <div className="popup-overlay">
                    <div className="popup-content">
                        <span className="popup-close-button" onClick={() => setShowPopup(false)}>✖</span>
                        <h2>Search External Store</h2>
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="popup-search-bar"
                        />
                        <button className="popup-search-button" onClick={() => findNewItems(search)}>
                            Search External Store
                        </button>

                        {externalResults.length > 0 ? (
                            <>
                                <button className="popup-add-items-db-button" onClick={addNewItems}>
                                    Add Items to Database
                                </button>
                                <div className="items-list">
                                    {externalResults.map((item, index) => (
                                        <div key={index} className="item">
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
                            <p></p>
                        )}
                    </div>
                </div>
            )}

        </div>
    );
};

export default SelectItems;
