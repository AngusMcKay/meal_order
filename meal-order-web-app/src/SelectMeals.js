import React, { useState, useEffect } from "react";
import "./SelectMeals.css";

const SelectMeals = () => {
    const [mealsData, setMealsData] = useState([]);
    const [selectedMeal, setSelectedMeal] = useState("");
    const [selectedItems, setSelectedItems] = useState({});
    const [orderList, setOrderList] = useState(() => {
        const savedOrders = localStorage.getItem("orderList");
        return savedOrders ? JSON.parse(savedOrders) : [];
    });
    const [cartVisible, setCartVisible] = useState(false);

    useEffect(() => {
        localStorage.setItem("orderList", JSON.stringify(orderList));
    }, [orderList]);
    
    // Fetch meals from backend
    useEffect(() => {
        fetch("http://localhost:5000/meals")
            .then((response) => response.json())
            .then((data) => setMealsData(data))
            .catch((err) => console.error("Error fetching meals:", err));
    }, []);

    const handleMealChange = (event) => {
        const mealName = event.target.value;
        setSelectedMeal(mealName);

        // Find the meal object from the fetched meals list
        const meal = mealsData.find((m) => m.name === mealName);
        if (meal) {
            setSelectedItems(meal.items.reduce((acc, item) => ({ ...acc, [item]: true }), {}));
        }
    };

    const toggleItemSelection = (item) => {
        setSelectedItems((prev) => ({ ...prev, [item]: !prev[item] }));
    };

    const handleAddToOrder = () => {
        const selectedOrder = Object.keys(selectedItems).filter((item) => selectedItems[item]);
        if (selectedOrder.length > 0) {
            setOrderList((prevOrders) => [...prevOrders, { meal: selectedMeal, items: selectedOrder }]);
        }
        console.log("Added to order:", selectedOrder);
        alert(`Added to order: ${selectedOrder.join(", ")}`);
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
    }

    const handleAddToFaves = () => {
        console.log("Added to favourites:", selectedMeal);
        alert(`Added to favourites: ${selectedMeal}\nContaining items: ${Object.keys(selectedItems).join(", ")}`);
    };

    return (
        <div className="meal-container">
            <div className="top-section-meals"> 
                <div className="header">
                    <button className="home-button" onClick={() => window.location.href = "/"}>Home</button>
                    <button className="cart-button" onClick={() => setCartVisible(!cartVisible)}>🛒 Cart</button>
                </div>

                <h1 className="meal-title">Select Your Meal</h1>
            </div>

            <div className="bottom-section-meals"> 
                <p className="meal-description">
                    Select a meal below and add items to your order
                </p>
                <select className="meal-dropdown" onChange={handleMealChange} value={selectedMeal}>
                    <option value="" disabled>Select a meal</option>
                    {mealsData.map((meal) => (
                        <option key={meal.name} value={meal.name}>{meal.name}</option>
                    ))}
                </select>
            </div>
            
            {selectedMeal && (
                <div className="items-list">
                    {mealsData.find(m => m.name === selectedMeal)?.items.map((item) => (
                        <div key={item} className="item">
                            <span className="item-text">{item}</span>
                            <span className={selectedItems[item] ? "bold-green" : "faded-green"} onClick={() => toggleItemSelection(item)}>✔</span>
                            <span className={!selectedItems[item] ? "bold-red" : "faded-red"} onClick={() => toggleItemSelection(item)}>✖</span>
                        </div>
                    ))}
                    <button className="add-order-button" onClick={handleAddToOrder}>Add To Order</button>
                    <br/>
                    <button className="add-faves-button" onClick={handleAddToFaves}>Add To Favourites</button>
                </div>
            )}

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

export default SelectMeals;
