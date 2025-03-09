import React, { useState, useEffect } from "react";
import "./SelectMeals.css";
import "./Generic.css";
import { runSeleniumTest, loadBasketMorrisons } from './Selenium.js'
import { CartSidebar, LoadingBasketPopup } from "./Generic.js";

// Set up socket.io for order progress updates
import io from "socket.io-client";
const socket = io("http://localhost:5000", { transports: ["websocket"] });
socket.on("connect", () => {
    console.log("🟢 Connected to Socket.IO server");
});

const SelectMeals = () => {
    const [mealsData, setMealsData] = useState([]);
    const [selectedMeal, setSelectedMeal] = useState("");
    const [selectedItems, setSelectedItems] = useState({});
    const [recipe, setRecipe] = useState("");
    const [orderList, setOrderList] = useState(() => {
        const savedOrders = localStorage.getItem("orderList");
        return savedOrders ? JSON.parse(savedOrders) : [];
    });
    const [cartVisible, setCartVisible] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [loadingBasketPopup, setLoadingBasketPopup] = useState(false);
    const [loadingBasket, setLoadingBasket] = useState(false);
    const [failedItems, setFailedItems] = useState([]);

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
            setSelectedItems(meal.items.reduce((accumulator, item, index) => ({ ...accumulator, [index]: true }), {}));  // changed to idx
            setRecipe(meal.recipe);
            console.log(JSON.stringify(selectedItems));
        }
    };

    const toggleItemSelection = (itemIndex) => { // changed to idx
        setSelectedItems((prev) => ({ ...prev, [itemIndex]: !prev[itemIndex] }));  // changed to idx
    };

    const handleAddToOrder = () => {
        const selectedOrder = mealsData.find((m) => m.name === selectedMeal).items.filter((item, index) => selectedItems[index]) // Object.keys(selectedItems).filter((item) => selectedItems[item]);
        if (selectedOrder.length > 0) {
            setOrderList((prevOrders) => [...prevOrders, { meal: selectedMeal, items: selectedOrder }]);
        }
        // console.log("Added to order:", selectedOrder);  // removed as part of id add
        // alert(`Added to order: ${selectedOrder.join(", ")}`);  // removed as part of id add
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
    }

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

    /* // Ignore favourites for now
    const handleAddToFaves = () => {
        console.log("Added to favourites:", selectedMeal);
        alert(`Added to favourites: ${selectedMeal}\nContaining items: ${Object.keys(selectedItems).join(", ")}`);
    };
    */

    return (
        <div className="meal-container">
            <div className="top-section-meals"> 
                <div className="header">
                    <button className="home-button" onClick={() => window.location.href = "/"}>Home</button>
                    <button className="cart-button" onClick={() => setCartVisible(!cartVisible)}>🛒 Shopping List</button>
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
                        <div key={index} className="item">
                            <span className="item-text">
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
                            <span className={selectedItems[index] ? "bold-green" : "faded-green"} onClick={() => toggleItemSelection(index)}>✔</span>
                            <span className={!selectedItems[index] ? "bold-red" : "faded-red"} onClick={() => toggleItemSelection(index)}>✖</span>
                        </div>
                    ))}
                    <button className="add-order-button" onClick={handleAddToOrder}>Add To Order</button>
                    {/*
                    <br/>
                    <button className="add-faves-button" onClick={handleAddToFaves}>Add To Favourites</button>
                    */}
                </div>
            )}

            {cartVisible && (
                <CartSidebar 
                    cartVisible={cartVisible} 
                    setCartVisible={setCartVisible} 
                    orderList={orderList} 
                    removeCartItem={removeCartItem}
                    loadBasket={loadBasket}
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
        </div>
    );
};

export default SelectMeals;
