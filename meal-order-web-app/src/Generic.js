import React from "react";
import "./Generic.css";

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
	                        <strong>{order.meal}</strong><sup className="remove-cart-meal" onClick={() => removeCartMeal(mealIndex)}> [✖]</sup>
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
	            <button className="export-order-button" onClick={() => loadBasket(orderList)}>Export Order</button>
	        </div>
	    </>
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

