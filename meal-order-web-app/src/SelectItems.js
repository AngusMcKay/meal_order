import React, { useState, useEffect } from "react";
import "./SelectItems.css";

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
            const existingCategory = prevOrders.find(order => order.meal === customHeading);
            if (existingCategory) {
                return prevOrders.map(order =>
                    order.meal === customHeading ? { ...order, items: [...order.items, item] } : order
                );
            }
            return [...prevOrders, { meal: customHeading, items: [item] }];
        });
    };

    const removeCartItem = (mealIndex, item) => {
        setOrderList((prevOrders) => {
            const updatedOrders = prevOrders.map((order, index) => {
                if (index === mealIndex) {
                    return { ...order, items: order.items.filter((i) => i !== item) };
                }
                return order;
            }).filter(order => order.items.length > 0);
            return updatedOrders;
        });
    };

    return (
        <div className="items-container">
            <div className="top-section">
                <div className="header">
                    <button className="home-button" onClick={() => window.location.href = "/"}>Home</button>
                    <button className="cart-button" onClick={() => setCartVisible(!cartVisible)}>🛒 Cart</button>
                </div>
                <h1 className="items-title">Select Individual Items</h1>
            </div>

            <div className="bottom-section">
                <p className="items-description">
                    Seach for and select individual items to add to order
                </p>
                <input 
                    type="text" 
                    placeholder="Search for an item..." 
                    className="search-bar" 
                    value={search} 
                    onChange={(e) => setSearch(e.target.value)}
                />
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
                                <span className="item-text">{item.name}{item.size ? ` (${item.size.value})` : ""}{item.price ? `, £${item.price.current.amount}` : ""}</span>
                                <button className="add-item-button" onClick={() => handleAddToOrder(item.name)}>Add</button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {cartVisible && (
                <div className="cart-sidebar">
                    <button className="close-cart" onClick={() => setCartVisible(false)}>✖</button>
                    <h2 className="cart-title">Cart</h2>
                    {orderList.length > 0 ? (
                        orderList.map((order, mealIndex) => (
                            <div key={mealIndex} className="cart-meal">
                                <strong>{order.meal}</strong>
                                {order.items.map((item) => (
                                    <div key={item} className="cart-item">
                                        <span className="cart-item-text">{item}</span>
                                        <span className="remove-cart-item" onClick={() => removeCartItem(mealIndex, item)}>✖</span>
                                    </div>
                                ))}
                            </div>
                        ))
                    ) : (
                        <p>No items in the cart.</p>
                    )}
                </div>
            )}
        </div>
    );
};

export default SelectItems;
