import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Tooltip } from "@mui/material";
import "./HomePage.css";
import "./Generic.css";
import { runSeleniumTest, loadBasketMorrisons } from './Selenium.js'
import { CartSidebar, LoadingBasketPopup } from "./Generic.js";

// Set up socket.io for order progress updates
import io from "socket.io-client";
const socket = io("http://localhost:5000", { transports: ["websocket"] });
socket.on("connect", () => {
    console.log("🟢 Connected to Socket.IO server");
});

const HomePage = () => {
    const navigate = useNavigate();
    const [orderList, setOrderList] = useState(() => {
        const savedOrders = localStorage.getItem("orderList");
        return savedOrders ? JSON.parse(savedOrders) : [];
    });
    const [cartVisible, setCartVisible] = useState(false);
    const [loadingBasketPopup, setLoadingBasketPopup] = useState(false);
    const [loadingBasket, setLoadingBasket] = useState(false);
    const [failedItems, setFailedItems] = useState([]);
    
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

export default HomePage;
