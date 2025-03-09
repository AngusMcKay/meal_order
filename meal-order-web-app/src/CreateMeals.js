import React, { useState, useEffect } from "react";
import "./CreateMeals.css";
import "./Generic.css";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { runSeleniumTest, loadBasketMorrisons } from './Selenium.js'
import { CartSidebar, LoadingBasketPopup } from "./Generic.js";

// Set up socket.io for order progress updates
import io from "socket.io-client";
const socket = io("http://localhost:5000", { transports: ["websocket"] });
socket.on("connect", () => {
    console.log("🟢 Connected to Socket.IO server");
});

const CreateMeals = () => {
    const [meals, setMeals] = useState([]);
    const [editedMeals, setEditedMeals] = useState([]);
    const [items, setItems] = useState([]);
    const [search, setSearch] = useState("");
    const [newMealName, setNewMealName] = useState("");
    const [selectedMeal, setSelectedMeal] = useState(null);
    const [mealItems, setMealItems] = useState([]);
    const [error, setError] = useState("");
    const [orderList, setOrderList] = useState(() => {
        const savedOrders = localStorage.getItem("orderList");
        return savedOrders ? JSON.parse(savedOrders) : [];
    });
    const [cartVisible, setCartVisible] = useState(false);
    const [editingMode, setEditingMode] = useState(false);
    const [loading, setLoading] = useState(true);
    const [isMealPopupOpen, setIsMealPopupOpen] = useState(false);
    const [recipeLink, setRecipeLink] = useState("");
    const [showPopup, setShowPopup] = useState(false);
    const [externalResults, setExternalResults] = useState([]);
    const [popupLoading, setPopupLoading] = useState(false);
    const [searchCompleteStatement, setSearchCompleteStatement] = useState("");
    const [loadingBasketPopup, setLoadingBasketPopup] = useState(false);
    const [loadingBasket, setLoadingBasket] = useState(false);
    const [failedItems, setFailedItems] = useState([]);
    const [showDeletePopup, setShowDeletePopup] = useState(false);
    const [deleteConfirmation, setDeleteConfirmation] = useState(false);

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
        fetch("http://localhost:5000/meals")
            .then(response => response.json())
            .then(data => setMeals(data))
            .catch(error => console.error("Error fetching meals:", error));

        fetch("http://localhost:5000/items")
            .then(response => response.json())
            .then(data => {
                setItems(data);
                setLoading(false);
            })
            .catch(error => {
                console.error("Error fetching items:", error)
                setLoading(false);
            });
    }, []);

    const handleCreateMeal = () => {
        if (meals.some(meal => meal.name.toLowerCase() === newMealName.toLowerCase())) {
            setError("Meal name already exists");
            setTimeout(() => setError(""), 3000);
            return;
        }
        setError("");
        setMeals([...meals, { name: newMealName, items: [] }]);
        setSelectedMeal(newMealName);
        setMealItems([]);
        setEditingMode(true);
        setIsMealPopupOpen(true);
        setNewMealName("");
        setRecipeLink("");
    };

    const handleSelectMeal = (meal) => {
        let mealRecipe = ""
        if (meal.recipe) {
            mealRecipe = meal.recipe;
        }
        setSelectedMeal(meal.name);
        setMealItems(meal.items);
        setRecipeLink(mealRecipe)
        setEditingMode(true);
        setIsMealPopupOpen(true);
    };

    const handleAddItemToMeal = (item) => {
        const newItemsList = mealItems;
        newItemsList.push(item);
        setMealItems(newItemsList);
        setMeals((prevMeals) => {
            const updatedMeals = prevMeals.map((meal) => {
                if (meal.name === selectedMeal) {
                    return { name: selectedMeal, items: newItemsList, recipe: recipeLink };
                }
                return meal;
            });
            return updatedMeals;
        });
        if (editedMeals.some(item => selectedMeal === item)) {
            setEditedMeals([...editedMeals, selectedMeal]);
        }
    };

    const handleRemoveMealItem = (index) => {
        const newItemsList = mealItems.filter((item, idx) => idx !== index);
        setMealItems(newItemsList);
        setMeals((prevMeals) => {
            const updatedMeals = prevMeals.map((meal) => {
                if (meal.name === selectedMeal) {
                    return { name: selectedMeal, items: newItemsList, recipe: recipeLink };
                }
                return meal;
            });
            return updatedMeals;
        });
        if (editedMeals.some(item => selectedMeal === item)) {
            setEditedMeals([...editedMeals, selectedMeal]);
        }
    };

    const handleAddMealRecipe = (recipe) => {
        setRecipeLink(recipe);
        setMeals((prevMeals) => {
            const updatedMeals = prevMeals.map((meal) => {
                if (meal.name === selectedMeal) {
                    return { name: selectedMeal, items: mealItems, recipe: recipe };
                }
                return meal;
            });
            return updatedMeals;
        });
        if (editedMeals.some(item => selectedMeal === item)) {
            setEditedMeals([...editedMeals, selectedMeal]);
        }
    };

    const handleStoreMeal = async () => {
        if (!selectedMeal) {
            alert("Please select a meal to save.");
            return;
        }
        try {
            const response = await fetch("http://localhost:5000/upsert-meal", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: selectedMeal,
                    items: mealItems,
                    recipe: recipeLink
                }),
            });

            const data = await response.json();
            if (data.success) {
                toast.success("Meal saved successfully!", { position: "top-center" });
            } else {
                toast.error("Error saving meal.", { position: "top-center" });
            }
        } catch (error) {
            console.error("Error saving meal:", error);
            toast.error("Server error.", { position: "top-center" });
        }
    };

    const handleAddMealToOrder = () => {
        setOrderList([...orderList, { meal: selectedMeal, items: mealItems }]);
        localStorage.setItem("orderList", JSON.stringify([...orderList, { meal: selectedMeal, items: mealItems }]));
    };

    const handleDeleteMeal = async () => {
        try {
            const response = await fetch(`http://localhost:5000/meals/${encodeURIComponent(selectedMeal)}`, {
                method: "DELETE",
            });

            if (!response.ok) {
                const data = await response.json();
                if (data.message === "Meal not found") {
                    console.log("Meal was not saved in the database, but has been removed from this session.");
                } else {
                    throw new Error("Failed to delete meal");
                }
            }

            // Remove meal from state
            setMeals(meals.filter(m => m.name !== selectedMeal));

            // Reset to initial view
            setShowDeletePopup(false);
            setDeleteConfirmation(true);
        } catch (error) {
            console.error("Error deleting meal:", error);
            alert("Failed to delete meal. Please try again.");
        }
    };

    const handleGoBack = () => {
        setEditingMode(false);
        setSelectedMeal(null);
        setIsMealPopupOpen(false);
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
        setPopupLoading(true);
        setSearchCompleteStatement("");
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
        } finally {
            setPopupLoading(false);
            setSearchCompleteStatement("No items found"); // will only display if externalResults is length 0
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
        } catch (error) {
            console.error("Error adding items:", error);
        } finally {
            setShowPopup(false);
            setExternalResults([]);
            setSearchCompleteStatement("");
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

    return (
        <div className="create-meals-container">
            <ToastContainer />
            <div className="top-section-create">
                <div className="header">
                    <button className="home-button" onClick={() => window.location.href = "/"}>Home</button>
                    <button className="cart-button" onClick={() => setCartVisible(!cartVisible)}>🛒 Shopping List</button>
                </div>
                <h1 className="title">Create Meals</h1>
            </div>
            
            <div className="bottom-section-create">
                
                {!editingMode ? (

                    <>
                        <p className="items-description">
                            Create and save meals to add to order now or in the future
                        </p>
                        <div className="options">
                            <div className="create-new">
                                <input
                                    className="create-new-input"
                                    type="text" 
                                    placeholder="Enter new meal name" 
                                    value={newMealName} 
                                    onChange={(e) => setNewMealName(e.target.value)}
                                />
                                <button className="create-new-button" onClick={handleCreateMeal}>Create</button>
                            </div>

                            {/* Temporary Error Message */}
                            {error && <div className="error-popup">{error}</div>}

                            
                            <div className="create-option-split">
                                Or
                            </div>

                            <div className="edit-existing">
                                <select className="edit-meal-dropdown" value="" onChange={(e) => handleSelectMeal(meals.find(meal => meal.name === e.target.value))}>
                                    <option value="" disabled>Select existing meal to edit</option>
                                    {meals.map(meal => (
                                        <option key={meal.name} value={meal.name}>{meal.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </>

                ) : (
                    
                    <>
                        <div className="edit-controls">
                            <button className="save-button" onClick={handleStoreMeal}>Save</button>
                            <button className="create-add-order" onClick={handleAddMealToOrder}>Add to Order</button>
                            <button className="delete-meal-button" onClick={() => setShowDeletePopup(true)}>Delete</button>
                            <button className="go-back-button" onClick={handleGoBack}>Back</button>
                            <select className="change-meal-dropdown" value="" onChange={(e) => handleSelectMeal(meals.find(meal => meal.name === e.target.value))}>
                                <option value="" disabled>Change meal</option>
                                {meals.map(meal => (
                                    <option key={meal.name} value={meal.name}>{meal.name}</option>
                                ))}
                            </select>
                        </div>
                        {showDeletePopup && (
                            <div className="delete-popup-overlay">
                                <div className="delete-popup">
                                    <h3>Are you sure you want to delete this meal?</h3>
                                    <p>This action cannot be undone</p>
                                    <div className="delete-popup-buttons">
                                        <button className="confirm-delete" onClick={handleDeleteMeal}>Yes, Delete</button>
                                        <button className="cancel-delete" onClick={() => setShowDeletePopup(false)}>Cancel</button>
                                    </div>
                                </div>
                            </div>
                        )}
                        {deleteConfirmation && (
                            <div className="confirm-delete-overlay">
                                <div className="delete-confirmation-popup">
                                    <p>Meal deleted</p>
                                    <button onClick={() => {
                                        setDeleteConfirmation(false);
                                        setSelectedMeal(null);
                                        setEditingMode(false);
                                    }}>Close</button>
                                </div>
                            </div>
                        )}
                        <div className="recipe-link-container">
                            <p htmlFor="recipe-link">Recipe Link:</p>
                            <input 
                                type="text" 
                                id="recipe-link" 
                                placeholder="Paste recipe URL here..." 
                                value={recipeLink} 
                                onChange={(e) => handleAddMealRecipe(e.target.value)} 
                                className="recipe-link-input"
                            />
                        </div>

                        {selectedMeal && (
                            <div className="meal-edit-section">
                                {isMealPopupOpen && (
                                    <div className="meal-details">
                                        <button className="close-meal-details" onClick={() => setIsMealPopupOpen(false)}>◀ Hide</button>
                                        <h2 className='meal-details-meal-name'>{selectedMeal}</h2>
                                        {mealItems.map((item, index) => (
                                            <div key={item._id} className="item-create-meal">
                                                <span className="item-create-meal-text" key={index}>{item.name}</span>
                                                <span className="remove-meal-item" onClick={() => handleRemoveMealItem(index)}>✖</span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {!isMealPopupOpen && (
                                    <div className="meal-details-minimised">
                                        <button className="open-meal-details" onClick={() => setIsMealPopupOpen(true)}>▶</button>
                                    </div>
                                )}

                                <div className="search-items-create">
                                    <input
                                        className="search-bar-create" 
                                        type="text" 
                                        placeholder="Search for an item..." 
                                        value={search} 
                                        onChange={(e) => setSearch(e.target.value)}
                                    />
                                    <span className="external-search-link-create" onClick={() => setShowPopup(true)}>
                                        Can't find what you're looking for?
                                    </span>
                                    {loading ? (
                                        <div className="loading-message-create">Finding items...<div className="loading-spinner"></div></div>
                                    ) : (
                                        <div className="items-list-create">
                                            {items.filter(item => item.name.toLowerCase().includes(search.toLowerCase())).map((item) => (
                                                <div key={item._id} className="item-create">
                                                    <span className="item-text-create">
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
                                                    <button className="add-item-button" onClick={() => handleAddItemToMeal(item)}>Add</button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </>
                
                )}
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

            {/* POPUP */}
            {showPopup && (
                <div className="popup-overlay">
                    <div className="popup-content">
                        <span className="popup-close-button" onClick={() => popupClose(false)}>✖</span>
                        <h2 className="popup-title">Find More Items</h2>
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
                            <p>{searchCompleteStatement}</p>
                        )}
                    </div>
                </div>
            )}

        </div>
    );
};

export default CreateMeals;
