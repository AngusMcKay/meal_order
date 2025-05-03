import React, { useState }  from "react";
import "./Generic.css";
import { useUser } from "./context/UserContext";

export const CartSidebar = ({ cartVisible, setCartVisible, orderList, removeCartItem, removeCartMeal, loadBasket, clearCartCheck }) => {
    return (
    	<>
	        <div className={`cart-sidebar ${cartVisible ? "visible" : ""}`}>
	            <button className="close-cart" onClick={() => setCartVisible(false)}>✖</button>
	            <h2 className="cart-title">Shopping List</h2>
	            {orderList.length > 0 && (
					<div className="clear-cart" onClick={() => clearCartCheck()}>[Clear List]</div>
	            )}
	            {orderList.length > 0 ? (
	                orderList.map((order, mealIndex) => (
	                    <div key={mealIndex} className="cart-meal">
	                        <strong className="cart-item-text">{order.meal}</strong><div className="clear-cart" onClick={() => removeCartMeal(mealIndex)}> [Remove Meal]</div>
	                        {order.items.map((item, itemIndex) => (
	                            <div key={itemIndex} className="cart-item">
	                                <span className="cart-item-text">{item.name}</span>
	                                <span className="remove-cart-item" onClick={() => removeCartItem(mealIndex, itemIndex)}>✖</span>
	                            </div>
	                        ))}
	                    </div>
	                ))
	            ) : (
	                <p className="cart-item-text">No items in the cart.</p>
	            )}
	        </div>
	        <div className='cart-sidebar-bottom'>
	            <button className="export-order-button" onClick={() => loadBasket(orderList)}>Ready to Order</button>
	        </div>
	    </>
    );
};

export const OrderTablePopup = ({ orderList, onClose, openAllLinks }) => {
    return (
        <div className="order-table-popup-overlay">
            <div className="order-table-popup">
                <span className="popup-close-button" onClick={onClose}>✖</span>
                <h3>Shopping List</h3>
                <table className="order-table">
                    <thead>
                        <tr>
                            <th>Meal/Category</th>
                            <th>Item</th>
                            <th>Size</th>
                            <th>Link</th>
                            <th>Ordered</th>
                        </tr>
                    </thead>
                    <tbody>
                        {orderList.map((order, mealIndex) =>
                            order.items.map((item, itemIndex) => (
                                <tr key={`${mealIndex}-${itemIndex}`}>
                                    <td>{order.meal}</td>
                                    <td>{item.name}</td>
                                    <td>{item.size}</td>
                                    <td>
                                        {item.link ? (
                                            <a href={item.link} target="_blank" rel="noopener noreferrer">
                                                View
                                            </a>
                                        ) : (
                                            "N/A"
                                        )}
                                    </td>
                                    <td>
                                        <input type="checkbox" />
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
                <div className="order-table-popup-buttons">
                    <button className="order-table-button" onClick={openAllLinks}>Open All Links</button>
                </div>
            </div>
        </div>
    );
};

export const LoadingBasketPopup = ({ loadingBasketPopup, loadingBasket, setLoadingBasket, basketPopupClose, failedItems, orderProgress }) => {
	return (
		<div className={`popup-overlay ${loadingBasketPopup ? "visible" : ""}`}>
            <div className="popup-content">
                { loadingBasket ? (
                	<>
	                    <div className="loading-message">Exporting shopping list to supplier, please wait it can take a few minutes...<div className="loading-spinner"></div></div>
	                    <div className="order-progress">{orderProgress}</div>
	                </>
                ) : (
                    <>
                        <span className="popup-close-button" onClick={() => basketPopupClose()}>✖</span>

                        { failedItems.length > 0 ? (
                            <>
                                <div className="popup-description-fail">⚠️ The following items failed to export to supplier, please check and add manually if need be</div>
                                <div className="popup-description-fail">When ready head over to <a href='https://groceries.morrisons.com' target="_blank" rel="noopener noreferrer" className="store-link"> https://groceries.morrisons.com</a> to arrange delivery</div>
                                <div className="items-list">
                                    {failedItems.map((item, index) => (
                                        <div key={index} className="item">
                                            <span className="item-text-select-items">
                                                {item.name}
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
                            <div className="popup-description">
                            	All items exported successfully, to arrange delivery head to:
                            	<a href='https://groceries.morrisons.com' target="_blank" rel="noopener noreferrer" className="store-link"> https://groceries.morrisons.com</a>
                            </div>
                        )}
                    </>
                )}
                
            </div>
        </div>
	);
};

export const ExtCookiePopup = ({ extCookiePopupMessage, extCookiePopupLink, setShowExtCookiePopup, extensionExists, checkForExtension, extractCookies, extCookiePopupLinkText }) => {
	return (
		<div className="popup-overlay">
            <div className="popup-content">
                <div className="popup-description">{extCookiePopupMessage}</div>
                {extCookiePopupLink && <div className="popup-cookie-link"><a href={extCookiePopupLink} target="_blank" rel="noopener noreferrer">{extCookiePopupLinkText}</a></div>}
                <div>
                    <button className="popup-cookie-ok-button" onClick={() => {
                        setShowExtCookiePopup(false);
                        extensionExists === false ? checkForExtension() : extractCookies();
                    }}>OK</button>
                    <button className="popup-cookie-cancel-button" onClick={() => setShowExtCookiePopup(false)}>Cancel</button>
                </div>
            </div>
        </div>
	);
};

export const AuthPopup = ({ showAuthPopup, setShowAuthPopup }) => {
    const { login, register } = useUser();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isRegistering, setIsRegistering] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMessage(""); // Clear any previous errors
        try {
            if (isRegistering) {
                await register(email, password);
                alert("Registration successful!");
            } else {
                await login(email, password);
                alert("Login successful!");
            }
            setShowAuthPopup(false); // Close the popup after success
        } catch (error) {
            setErrorMessage(error.message || "An error occurred. Please try again.");
        }
    };

    return (
        showAuthPopup && (
            <div className="auth-popup-overlay">
                <div className="auth-popup">
                    <span className="popup-close-button" onClick={() => setShowAuthPopup(false)}>✖</span>
                    <h2>{isRegistering ? "Register" : "Login"}</h2>
                    <button
                        className="auth-toggle-button"
                        onClick={() => setIsRegistering(!isRegistering)}
                    >
                        {isRegistering ? "Already registered? Click here to switch to login instead" : "Not yet registered? Click here to switch to registration"}
                    </button>
                    <form onSubmit={handleSubmit}>
                        <input
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                        <button type="submit" className="auth-submit-button">
                            {isRegistering ? "Register" : "Login"}
                        </button>
                    </form>
                    {errorMessage && <p className="auth-error-message">{errorMessage}</p>}
                </div>
            </div>
        )
    );
};
