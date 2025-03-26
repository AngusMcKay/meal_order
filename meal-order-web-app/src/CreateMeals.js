import React, { useState, useEffect } from "react";
import "./CreateMeals.css";
import "./Generic.css";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { loadBasketMorrisons } from './Selenium.js'
import { CartSidebar, LoadingBasketPopup } from "./Generic.js";
import io from "socket.io-client";

const EXTENSION_ID = process.env.REACT_APP_EXTENSION_ID;
const API_BASE_URL = process.env.REACT_APP_SERVER_HOST;
const GROCERY_SITE_URL = process.env.REACT_APP_GROCERY_SITE_URL;

const socket = io(`${API_BASE_URL}`, { transports: ["websocket"] });
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
    const [cartVisible, setCartVisible] = useState(() => {
        const savedCartPosition = localStorage.getItem("cartVisible");
        return savedCartPosition ? JSON.parse(savedCartPosition) : false;
    });
    const [clearCartPopup, setClearCartPopup] = useState(false);
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
    const [extractedIngredients, setExtractedIngredients] = useState([]);
    const [extractIngredientsPopupOpen, setExtractIngredientsPopupOpen] = useState(false);
    const [extractIngredientsInputs, setExtractIngredientsInputs] = useState(false);
    const [extractIngredientsLoading, setExtractIngredientsLoading] = useState(false);
    const [recipeText, setRecipeText] = useState("");
    const [imageBase64, setImageBase64] = useState(null);
    const [hoveredItem, setHoveredItem] = useState(null);
    const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 });

    // cookies stuff
    const [extensionExists, setExtensionExists] = useState(null);
    const [showExtCookiePopup, setShowExtCookiePopup] = useState(false);
    const [extCookiePopupMessage, setExtCookiePopupMessage] = useState("");
    const [extCookiePopupLink, setExtCookiePopupLink] = useState("");
    const [extCookiePopupLinkText, setExtCookiePopupLinkText] = useState("Click here to open");

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

    useEffect(() => {
        fetch(`${API_BASE_URL}/meals`, { method: 'GET', headers: { "ngrok-skip-browser-warning": "true", "Content-Type": "application/json" } })
            .then(response => response.json())
            .then(data => setMeals(data))
            .catch(error => console.error("Error fetching meals:", error));

        fetch(`${API_BASE_URL}/items`, { method: 'GET', headers: { "ngrok-skip-browser-warning": "true", "Content-Type": "application/json" } })
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
        if (newMealName === "") {
            setError("Enter a meal name to proceed!");
            return;
        }
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

    const checkPlaceholderItem = (item) => { // function to check if an item is just a placeholder and not an actual grocery store item
        if (item.type && item.type === 'placeholder') {
            return true;
        } else {
            return false;
        }
    };

    const handleAddPlaceholderItemToMeal = (itemName) => {
        const placeholderItem = { name: itemName, type: "placeholder" }
        const newItemsList = mealItems;
        newItemsList.push(placeholderItem);
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
    }

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
            const response = await fetch(`${API_BASE_URL}/upsert-meal`, {
                method: "POST",
                headers: { "ngrok-skip-browser-warning": "true", "Content-Type": "application/json" },
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
        const itemsToAdd = mealItems.filter((item) => !checkPlaceholderItem(item));
        setOrderList([...orderList, { meal: selectedMeal, items: itemsToAdd }]);
        localStorage.setItem("orderList", JSON.stringify([...orderList, { meal: selectedMeal, items: mealItems }]));
    };

    const handleDeleteMeal = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/meals/${encodeURIComponent(selectedMeal)}`, {
                method: "DELETE",
                "ngrok-skip-browser-warning": "true"
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
        setExternalResults([]);
        setPopupLoading(true);
        setSearchCompleteStatement("");
        try {
            const response = await fetch(`${API_BASE_URL}/find-new-items`, {
                method: "POST",
                headers: { "ngrok-skip-browser-warning": "true", "Content-Type": "application/json" },
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
            await fetch(`${API_BASE_URL}/add-new-items`, {
                method: "POST",
                headers: { "ngrok-skip-browser-warning": "true", "Content-Type": "application/json" },
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

    const handleAddExternalToMeal = async (itemToAdd) => {
        const newItemsList = mealItems;
        newItemsList.push(itemToAdd);
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

        // Also add to database
        try {
            await fetch(`${API_BASE_URL}/add-new-items`, {
                method: "POST",
                headers: { "ngrok-skip-browser-warning": "true", "Content-Type": "application/json" },
                body: JSON.stringify({ items: [itemToAdd] }),
            });

            setItems((prevItems) => {
                const updatedItems = [...prevItems]; // copy existing

                [itemToAdd].forEach(newItem => {
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
        }
    };


    const popupClose = () => {
        setExternalResults([]);
        setShowPopup(false);
        setSearchCompleteStatement("");
    };

    const loadBasket = async (orderList) => {
        setFailedItems([]);
        let orderResponse = {};
        let orderFails = [];
        try {
            setLoadingBasketPopup(true);
            setLoadingBasket(true);
            orderResponse = await loadBasketMorrisons(orderList);
            if (orderResponse.success === true) {
                orderFails = orderResponse.failedItems;
            } else {
                checkForExtension();
            }
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

    const checkForExtension = (initOrOngoing) => {
        console.log(`Attempting to connect to extension ${EXTENSION_ID}`)
        
        let extMessage = ""
        if (initOrOngoing === 'init') {
            extMessage = "A Chrome browser extension is required for this app to work. Please install it and click OK once done. Chrome is the only supported browser at this stage. Additional browser support will be added soon.";
        } else {
            extMessage = "Still unable to detect the required Chrome browser extension. Please confirm it is installed and activated and click OK once done. Chrome is the only supported browser at this stage. Additional browser support will be added soon.";
        }
        if (!window.chrome || !window.chrome.runtime || !window.chrome.runtime.sendMessage) {
            console.log("❌ Chrome extension API not available");
            setExtCookiePopupMessage(extMessage);
            setExtCookiePopupLink(`https://chrome.google.com/webstore/detail/${EXTENSION_ID}`); // Replace with actual extension link
            setExtCookiePopupLinkText("Click here to go to extension install page");
            setShowExtCookiePopup(true);
            setExtensionExists(false);
            setLoadingBasketPopup(false);
            setLoadingBasket(false);
            return;
        }

        window.chrome.runtime.sendMessage(EXTENSION_ID, { action: "ping" }, (response) => {
            if (window.chrome.runtime.lastError) {
                console.error("❌ Error:", window.chrome.runtime.lastError.message);
                setExtCookiePopupMessage(extMessage);
                setExtCookiePopupLink(`https://chrome.google.com/webstore/detail/${EXTENSION_ID}`); // Replace with actual extension link
                setExtCookiePopupLinkText("Click here to go to extension install page");
                setShowExtCookiePopup(true);
                setExtensionExists(false);
                setLoadingBasketPopup(false);
                setLoadingBasket(false);
            } else if (!response) {
                console.log("❌ Extension NOT found - can't find.");
                setExtCookiePopupMessage(extMessage);
                setExtCookiePopupLink(`https://chrome.google.com/webstore/detail/${EXTENSION_ID}`); // Replace with actual extension link
                setExtCookiePopupLinkText("Click here to go to extension install page");
                setShowExtCookiePopup(true);
                setExtensionExists(false);
                setLoadingBasketPopup(false);
                setLoadingBasket(false);
            } else {
                console.log("✅ Extension found.");
                setExtensionExists(true);
                extractCookies(initOrOngoing);
            }
        });

    };

    const extractCookies = (initOrOngoing) => {
        let extMessage = ""
        if (initOrOngoing === 'init') {
            extMessage = "A Chrome browser extension is required for this app to work. Please install it and click OK once done. Chrome is the only supported browser at this stage. Additional browser support will be added soon.";
        } else {
            extMessage = "Still unable to detect the required Chrome browser extension. Please confirm it is installed and activated and click OK once done. Chrome is the only supported browser at this stage. Additional browser support will be added soon.";
        }
        if (!window.chrome || !window.chrome.runtime) {
            console.log("❌ Chrome extension API not available.");
            setExtCookiePopupMessage(extMessage);
            setExtCookiePopupLink(`https://chrome.google.com/webstore/detail/${EXTENSION_ID}`); // Replace with actual extension link
            setExtCookiePopupLinkText("Click here to go to extension install page");
            setShowExtCookiePopup(true);
            setExtensionExists(false);
            setLoadingBasketPopup(false);
            setLoadingBasket(false);
            return;
        }

        window.chrome.runtime.sendMessage(EXTENSION_ID, { action: "extract_cookies" }, (response) => {
            if (window.chrome.runtime.lastError) {
                console.error("Error communicating with extension:", window.chrome.runtime.lastError.message);
            } else if (!response || response.error) {
                console.error("Error extracting cookies:", response ? response.error : "Unknown error");
            } else {
                console.log("✅ Cookies received from extension:", response.cookies);
                checkExtractedCookies(response.cookies);
            }
        });
    };

    const checkExtractedCookies = async (cookies) => {
        const relevantCookies = cookies.filter(cookie => cookie.domain.includes("morrisons.com")); // Add more constraints: cookie.name === "session" && cookie.domain.includes("morrisons.com")

        if (relevantCookies.length > 0) {
            console.log("✅ Required cookies are present. Saving..");
            const saving_response = await fetch(`http://localhost:5000/store-cookies`, {
                method: "POST",
                headers: { "ngrok-skip-browser-warning": "true", "Content-Type": "application/json" },
                body: JSON.stringify({ cookies: relevantCookies }),
            });

            const data = await saving_response.json();
            if (data.success) {
                console.log(data.message);
                loadBasket(orderList);
                setShowExtCookiePopup(false);
            } else {
                console.log("Failed to save cookies");
            }
            
        } else {
            console.log("❌ Required cookies NOT found.");
            setExtCookiePopupMessage("Store login needed before app can proceed. Please follow the link below to login and click OK once done.");
            setExtCookiePopupLink(GROCERY_SITE_URL);
            setExtCookiePopupLinkText(`Click here to log in to ${GROCERY_SITE_URL}`);
            setShowExtCookiePopup(true);
        }
    };

    // Meal auto generation
    const extractIngredientsStart = () => {
        setExtractIngredientsPopupOpen(true);
        setExtractIngredientsInputs(true);
        setExtractIngredientsLoading(false);
        setExtractedIngredients([]);
    };

    const extractIngredientsFromText = async () => {
        if (!recipeText) {

            alert("Please copy the ingredients/recipe into the box and try again");

        } else {
            
            try {

                setExtractIngredientsInputs(false);
                setExtractIngredientsLoading(true);
                const recipeTextOrImage = recipeText;
                const itemNames = items.map(item => item.name); // item.name + "(" + `{item.size ? item.size.value : ""}` + ")" // Can try this again later with cut down list
                const extractFrom = 'text'
                const response = await fetch(`${API_BASE_URL}/extract-ingredients`, {
                    method: "POST",
                    headers: { "ngrok-skip-browser-warning": "true", "Content-Type": "application/json" },
                    body: JSON.stringify({ recipeTextOrImage, itemNames, extractFrom }),
                });

                console.log(response.ok);

                if (!response.ok) {
                    throw new Error("Failed to fetch AI suggestions");
                }

                const data = await response.json();
                setExtractIngredientsLoading(false);

                // Map extracted ingredients to include full item details
                const updatedIngredients = data.ingredients.map((ingredient) => {
                    if (ingredient.suggestedItem) {
                        const matchedItem = items.find(
                            (item) => item.name.trim() === ingredient.suggestedItem.trim()
                        );

                        return {
                            ...ingredient,
                            fullItem: matchedItem || { name: ingredient.ingredient, type: 'placeholder' }, // Add full item if found, otherwise placeholder
                        };
                    }
                    return ingredient;
                });

                setExtractedIngredients(updatedIngredients); // Store extracted ingredients
            } catch (error) {
                console.error("Failed to extract ingredients:", error);
            }
        }
    };

    const extractIngredientsFromImage = async () => {
        if (!imageBase64) {

            alert("Please upload an image and try again");

        } else {
            try {

                setExtractIngredientsInputs(false);
                setExtractIngredientsLoading(true);
                const recipeTextOrImage = imageBase64;
                const itemNames = items.map(item => item.name);
                const extractFrom = 'image'
                const response = await fetch(`${API_BASE_URL}/extract-ingredients`, {
                    method: "POST",
                    headers: { "ngrok-skip-browser-warning": "true", "Content-Type": "application/json" },
                    body: JSON.stringify({ recipeTextOrImage, itemNames, extractFrom }),
                });

                console.log(response.ok);

                if (!response.ok) {
                    throw new Error("Failed to fetch AI suggestions");
                }

                const data = await response.json();
                setExtractIngredientsLoading(false);

                // Map extracted ingredients to include full item details
                const updatedIngredients = data.ingredients.map((ingredient) => {
                    if (ingredient.suggestedItem) {
                        const matchedItem = items.find(
                            (item) => item.name.trim() === ingredient.suggestedItem.trim()
                        );

                        return {
                            ...ingredient,
                            fullItem: matchedItem || { name: ingredient.ingredient, type: 'placeholder' }, // Add full item if found, otherwise placeholder
                        };
                    }
                    return ingredient;
                });

                setExtractedIngredients(updatedIngredients); // Store extracted ingredients
            } catch (error) {
                console.error("Failed to extract ingredients:", error);
            }
        }
    };

    const createMealFromExtraction = async () => {
        await extractedIngredients.forEach((ingredient) => handleAddItemToMeal(ingredient.fullItem))
        setExtractIngredientsPopupOpen(false);
        setExtractIngredientsLoading(false);
        setExtractedIngredients([]);
    };

    const extractPopupClose = () => {
        setExtractIngredientsPopupOpen(false);
        setExtractIngredientsLoading(false);
        setExtractIngredientsInputs(false);
        setExtractedIngredients([]);
    };

    const handleImageUpload = (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.readAsDataURL(file);

            reader.onload = (e) => {
                const img = new Image();
                img.src = e.target.result;

                img.onload = () => {
                    const canvas = document.createElement("canvas");
                    const ctx = canvas.getContext("2d");

                    // Set the new image dimensions
                    const maxWidth = 600; // Resize width
                    const maxHeight = 600; // Resize height
                    let width = img.width;
                    let height = img.height;

                    if (width > maxWidth || height > maxHeight) {
                        if (width > height) {
                            height *= maxWidth / width;
                            width = maxWidth;
                        } else {
                            width *= maxHeight / height;
                            height = maxHeight;
                        }
                    }

                    // Apply resizing to canvas
                    canvas.width = width;
                    canvas.height = height;
                    ctx.drawImage(img, 0, 0, width, height);

                    // Convert canvas back to Base64
                    const resizedBase64 = canvas.toDataURL("image/png", 0.8); // Compress at 80% quality
                    setImageBase64(resizedBase64);
                };
            };
        };
    };

    const handleMouseEnter = (event, item) => {
        try {
            if ( item.image.src ) {
                setHoveredItem(item);
                
                const rect = event.currentTarget.getBoundingClientRect();

                setPopupPosition({
                    top: rect.top,
                    left: rect.right
                });    
            } else {
                setHoveredItem(null);
            }
        } catch {
            setHoveredItem(null);
        }
            
    };

    return (
        <div className="create-meals-container">
            <ToastContainer />
            <div className="top-section-create">
                <div className="header">
                    <button className="home-button" onClick={() => window.location.href = "/"}>Home</button>
                    <button className="cart-button" onClick={() => setCartVisible(!cartVisible)}>🛒 Shopping List</button>
                </div>
                <h1 className="create-title">Create Meals and Lists</h1>
            </div>
            
            <div className="bottom-section-create">
                
                {!editingMode ? (

                    <>
                        <p className="items-description">
                            Create and save meals and lists to add to order now or save for future adding ease
                        </p>
                        <div className="options">
                            <div className="create-new">
                                <input
                                    className="create-new-input"
                                    type="text" 
                                    placeholder="Enter new meal/list name" 
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
                                    <option value="" disabled>Select existing meal/list to edit</option>
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
                                    <h3>Are you sure you want to delete this meal/list?</h3>
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
                                    <p>Meal/list deleted</p>
                                    <button onClick={() => {
                                        setDeleteConfirmation(false);
                                        setSelectedMeal(null);
                                        setEditingMode(false);
                                    }}>Close</button>
                                </div>
                            </div>
                        )}

                        <div className="recipe-link-container">
                            <button title="Use AI to auto-populate meal item list from either recipe text or a picture of a recipe" className='auto-create-meal' onClick={() => extractIngredientsStart()}>
                            🤖 Auto Populate From Text or Image ⓘ
                            </button>
                            {/*<p htmlFor="recipe-link">Recipe Link:</p>*/}
                            <input 
                                type="text" 
                                id="recipe-link" 
                                placeholder="Save recipe URL with meal..." 
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
                                                <span className="item-create-meal-text" key={index}>
                                                    {item.name}
                                                    {checkPlaceholderItem(item) ? (
                                                    <sup className="item-create-meal-text-placeholder" title="Placeholder Item: reminder to either look for and replace with a grocery store item from the app, or order it directly from the grocery store later if the item can't be found in the app." data-toggle="tooltip"> ⓘ placeholder</sup>
                                                    ) : (
                                                        <>
                                                        </>
                                                    )}
                                                </span>
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
                                    <div className="search-bar-container">
                                        <input
                                            className="search-bar-create" 
                                            type="text" 
                                            placeholder="Search for an item..." 
                                            value={search} 
                                            onChange={(e) => setSearch(e.target.value)}
                                        />
                                        {search && (
                                            <button title="If you can't find an item in the app (or via the exteral search link below) you can add the search term as a placeholder reminder to add it directly from the grocery store later." className='add-placeholder' onClick={() => handleAddPlaceholderItemToMeal(search)}>
                                            Add item placeholder ⓘ
                                            </button>
                                        )}
                                    </div>
                                    <span className="external-search-link-create" onClick={() => setShowPopup(true)}>
                                        Can't find what you're looking for?
                                    </span>
                                    {loading ? (
                                        <div className="loading-message-create">Finding items...<div className="loading-spinner"></div></div>
                                    ) : (
                                        <div className="items-list-create">
                                            {items.filter(item => item.name.toLowerCase().includes(search.toLowerCase())).map((item) => (
                                                <div key={item._id} className="item-create" onMouseEnter={(event) => handleMouseEnter(event, item)} onMouseLeave={() => setHoveredItem(null)}>
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

            {hoveredItem && hoveredItem.image?.src && (
                <div 
                    className="hover-popup-create" 
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

            {/* External search popup */}
            {showPopup && (
                <div className="popup-overlay">
                    <div className="popup-content">
                        <span className="popup-close-button" onClick={() => popupClose()}>✖</span>
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
                                            <button className="add-item-button" onClick={() => handleAddExternalToMeal(item)}>Add</button>
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

            {extractIngredientsPopupOpen && (
                <div className="popup-overlay">
                    <div className="popup-content">
                        <span className="popup-close-button" onClick={() => extractPopupClose()}>✖</span>
                        <h3 className="popup-title">Auto Populate Meal From Recipe</h3>
                        {extractIngredientsInputs ? (
                            <>
                                <div className="extract-text-area">
                                    <p>Text upload</p>
                                    <div className="extract-text-sub-area">
                                        <div className="extract-text-sub-area-left">
                                            <textarea
                                                className="extract-text-input"
                                                placeholder="Paste recipe text here..."
                                                value={recipeText}
                                                onChange={(e) => setRecipeText(e.target.value)}
                                                rows={5}
                                            />
                                        </div>
                                        <div className="extract-text-sub-area-right">
                                            <button className="extract-create-meal" onClick={() => extractIngredientsFromText()}>Generate Meal From Text</button>
                                        </div>
                                    </div>
                                </div>

                                <div className="extract-image-area">
                                    <p>Image upload</p>
                                    <div className="extract-image-sub-area">
                                        <div className="extract-image-sub-area-left">
                                            <input type="file" accept="image/*" onChange={handleImageUpload} />
                                        </div>
                                        <div className="extract-image-sub-area-right">
                                            <span><button className="extract-create-meal" onClick={extractIngredientsFromImage}>Generate Meal From Image</button></span>
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <>
                            </>
                        )}

                        {extractIngredientsLoading ? (
                            <div className="loading-message">Reading recipe, decyphering ingredients and finding appropriate items, please be patient...<div className="loading-spinner"></div></div>
                        ) : (
                            <>
                            </>
                        )}
                        
                        {extractedIngredients.length > 0 && (
                            <>
                                <div className="items-list">
                                    {extractedIngredients.map((ingredient) => (
                                        <div className="item-extracted" key={ingredient.ingredient} onMouseEnter={(event) => handleMouseEnter(event, ingredient.fullItem)} onMouseLeave={() => setHoveredItem(null)}>
                                            {ingredient.ingredient} ({ingredient.quantity}): {!checkPlaceholderItem(ingredient.fullItem) ? (
                                                <span>
                                                    {ingredient.fullItem.name}{ingredient.fullItem.size ? ` (${ingredient.fullItem.size.value})` : ""}{ingredient.fullItem.price ? `, £${ingredient.fullItem.price.current.amount}` : ""}
                                                    <sup>
                                                        <a 
                                                            href={`https://groceries.morrisons.com/products/${ingredient.fullItem.retailerProductId}`} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            className="item-link"
                                                        >view ⎘</a>
                                                    </sup>
                                                </span>
                                            ) : (
                                                <span className="extract-fail-warning" title="Clicking 'Add Items' will add this item as a placeholder which can then be replaced by an actual grocery store item once found, or kept as a placeholder as a reminder to add manually" data-toggle="tooltip">⚠️ No match found ⓘ</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <button className="extract-create-meal" onClick={() => createMealFromExtraction()}>Add Items</button>
                                <button className="extract-cancel" onClick={() => extractPopupClose()}>Cancel</button>
                            </>
                        )}
                    </div>
                </div>
            )}

        </div>
    );
};

export default CreateMeals;
