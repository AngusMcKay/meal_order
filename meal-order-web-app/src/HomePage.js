import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Tooltip } from "@mui/material";
import "./HomePage.css";
import "./Generic.css";
import { runSeleniumTest, loadBasketMorrisons } from './Selenium.js'

const HomePage = () => {
    const navigate = useNavigate();
    const [orderList, setOrderList] = useState(() => {
        const savedOrders = localStorage.getItem("orderList");
        return savedOrders ? JSON.parse(savedOrders) : [];
    });
    const [cartVisible, setCartVisible] = useState(false);

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

    return (
        <div className="container">
            <div className="header">
                <button className="cart-button-home" onClick={() => setCartVisible(!cartVisible)}>🛒 Shopping List</button>
            </div>
            <h1 className="title">Welcome to the Meal Order Web App</h1>
            <p className="description">
                Streamline your grocery shopping by selecting meals and automatically populating shopping carts.
                Choose one of the options below to get started.
            </p>
            
            <div className="button-container row">
                <Tooltip title="Select predefined meal combinations" arrow>
                    <button className="button meals" onClick={() => navigate("/select-meals")}>Select Meals</button>
                </Tooltip>
                
                <Tooltip title="Choose individual items for your order" arrow>
                    <button className="button items" onClick={() => navigate("/select-items")}>Select Individual Items</button>
                </Tooltip>
                
                <Tooltip title="Create custom meal combinations" arrow>
                    <button className="button create" onClick={() => navigate("/create-meals")}>Create Meals</button>
                </Tooltip>
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
        </div>
    );
};

export default HomePage;
