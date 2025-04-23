import React, { useState, useEffect } from "react";
import Tabs from "./Tabs";
import "./SelectItems.css";
import "./Generic.css";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { loadBasketMorrisons } from './Selenium.js'
import { CartSidebar, OrderTablePopup, LoadingBasketPopup } from "./Generic.js";
import io from "socket.io-client";
import { useUser } from "./context/UserContext";

const EXTENSION_ID = process.env.REACT_APP_EXTENSION_ID;
const API_BASE_URL = process.env.REACT_APP_SERVER_HOST;
const GROCERY_SITE_URL = process.env.REACT_APP_GROCERY_SITE_URL;

const socket = io(`${API_BASE_URL}`, { transports: ["websocket"] });
socket.on("connect", () => {
    console.log("🟢 Connected to Socket.IO server");
});

const SelectItems = () => {
    const { user, saveMeal, saveItem, deleteMeal, deleteItem } = useUser();
    const [items, setItems] = useState(user?.items || []);
    //const [items, setItems] = useState([]);
    const [search, setSearch] = useState("");
    const [searchExternal, setSearchExternal] = useState("");
    const [customHeading, setCustomHeading] = useState("Individual Items");
    const [newItemName, setNewItemName] = useState("");
    const [newItemQuantity, setNewItemQuantity] = useState("");
    const [newItemLink, setNewItemLink] = useState("");
    const [newItemTags, setNewItemTags] = useState("");
    const [newItemImage, setNewItemImage] = useState("");
    const [orderList, setOrderList] = useState(() => {
        const savedOrders = localStorage.getItem("orderList");
        return savedOrders ? JSON.parse(savedOrders) : [];
    });
    const [cartVisible, setCartVisible] = useState(() => {
        const savedCartPosition = localStorage.getItem("cartVisible");
        return savedCartPosition ? JSON.parse(savedCartPosition) : false;
    });
    const [clearCartPopup, setClearCartPopup] = useState(false);
    const [loading, setLoading] = useState(true);
    const [showPopup, setShowPopup] = useState(false);
    const [externalResults, setExternalResults] = useState([]);
    const [popupLoading, setPopupLoading] = useState(false);
    const [searchCompleteStatement, setSearchCompleteStatement] = useState("");
    const [orderTablePopup, setOrderTablePopup] = useState(false);
    const [loadingBasketPopup, setLoadingBasketPopup] = useState(false);
    const [loadingBasket, setLoadingBasket] = useState(false);
    const [failedItems, setFailedItems] = useState([]);
    const [hoveredItem, setHoveredItem] = useState(null);
    const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 });
    const [saveItemPopup, setSaveItemPopup] = useState(false);

    // cookies stuff
    const [extensionExists, setExtensionExists] = useState(null);
    const [showExtCookiePopup, setShowExtCookiePopup] = useState(false);
    const [extCookiePopupMessage, setExtCookiePopupMessage] = useState("");
    const [extCookiePopupLink, setExtCookiePopupLink] = useState("");
    const [extCookiePopupLinkText, setExtCookiePopupLinkText] = useState("Click here to open");

    // tag filtering
    const [selectedTags, setSelectedTags] = useState([]); // Stores selected tags
    const [allTags, setAllTags] = useState([]); // Stores all distinct tags

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

    // Fetch items from backend
    useEffect(() => {
        // Extract distinct tags from items
        const tags = new Set();
        user?.items?.forEach(item => {
            item.tags?.forEach(tag => tags.add(tag));
        });
        setAllTags([...tags]); // Convert Set to Array
        setItems(user?.items || []);
        setLoading(false);
    }, [user]);
    /* DEPRECATED - now using user specific items
    useEffect(() => {
        fetch(`${API_BASE_URL}/items`, { method: 'GET', headers: { "ngrok-skip-browser-warning": "true", "Content-Type": "application/json" } })
            .then(response => response.json())
            .then(data => {
                setItems(data);
                setLoading(false);
            })
            .catch(error => {
                console.error("Error fetching items:", error);
                setLoading(false);
            });
    }, []);*/

    const parseTags = (input) => {
        return input
            .replace(/,/g, " ") // Replace commas with spaces
            .split(/\s+/) // Split by any number of spaces
            .filter(tag => tag.trim() !== "") // Remove empty values
            .map(tag => tag.toLowerCase()); // Convert to lowercase
    };

    const handleSaveItem = async () => {

        if (!newItemName) {
            alert("Please enter item name");
            return;
        }

        // Check if an item with the same name already exists
        const existingItem = items.find(item => item.name.toLowerCase() === newItemName.toLowerCase());

        if (existingItem) {
            // Show confirmation popup
            setSaveItemPopup(true);
            return; // move to handling via the popup
        }
        
        doTheActualSaving();
    };

    const doTheActualSaving = async () => {
        try {
            setSaveItemPopup(false)
            const data = await saveItem({ name: newItemName, size: newItemQuantity, link: newItemLink, tags: parseTags(newItemTags), image: {src: newItemImage} });

            if (data.success) {
                toast.success("Item saved!", { position: "top-center" });
            } else {
                toast.error("Error saving item", { position: "top-center" });
            }
        } catch (error) {
            console.error("Error saving item:", error);
            toast.error("Server error", { position: "top-center" });
        }
    }

    const handleAddNewItemToOrder = () => {
        const newItem = { name: newItemName, size: newItemQuantity, link: newItemLink, tags: parseTags(newItemTags) };
        setOrderList((prevOrders) => {
            const existingCategory = prevOrders.find(order => order.meal.toLowerCase() === customHeading.toLowerCase());
            if (existingCategory) {
                return prevOrders.map(order =>
                    order.meal.toLowerCase() === customHeading.toLowerCase() ? { ...order, items: [...order.items, newItem] } : order
                );
            }
            return [...prevOrders, { meal: customHeading, items: [newItem] }];
        });
        toast.success("Item added!", { position: "top-center" });
    };

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
        toast.success("Item added!", { position: "top-center" });
    };

    const handleEditItem = (item) => {
        setNewItemName(item.name);
        setNewItemQuantity(item.size || "");
        setNewItemLink(item.link || "");
        setNewItemTags(item.tags ? item.tags.join(", ") : "");
        setNewItemImage(item.image?.src || ""); // even though not displayed, needs included so that remains when item is saved again
    };

    const handleDeleteItem = async (item) => {
        try {

            const data = await deleteItem({ itemName: item.name });

            if (data.success) {
                toast.success("Item deleted!", { position: "top-center" });
            } else {
                toast.error("Error deleting item", { position: "top-center" });
            }
        } catch (error) {
            console.error("Error deleting item:", error);
            toast.error("Server error", { position: "top-center" });
        }
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

    // DEPRECATED, was used for saving externally found items to database of all items but now storing items separately for each individual user
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

            setExternalResults([]);
            setShowPopup(false); // Close pop-up after adding
            setSearchCompleteStatement("");
        } catch (error) {
            console.error("Error adding items:", error);
        }
    };

    const handleAddExternalToOrder = async (itemToAdd) => {
        setOrderList((prevOrders) => {
            const existingCategory = prevOrders.find(order => order.meal.toLowerCase() === customHeading.toLowerCase());
            if (existingCategory) {
                return prevOrders.map(order =>
                    order.meal.toLowerCase() === customHeading.toLowerCase() ? { ...order, items: [...order.items, itemToAdd] } : order
                );
            }
            return [...prevOrders, { meal: customHeading, items: [itemToAdd] }];
        });

        // Also add to database - DEPRECATED, ITEMS NOW STORED FOR INDIVIDUAL USERS
        /*try {
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
        }*/
    };

    const handleLinkExternalToNewItem = (itemToLink) => {
        setNewItemLink(`https://groceries.morrisons.com/products/${itemToLink.retailerProductId}`);
        setNewItemImage(itemToLink.image.src);
        setNewItemQuantity(itemToLink.size.value);

        if (newItemName === "") {
            setNewItemName(itemToLink.name);
        }
    };

    const popupClose = () => {
        setExternalResults([]);
        setShowPopup(false);
        setSearchCompleteStatement("");
    };

    const loadBasket = async (orderList, orderType = "tablePopup") => {

        if (orderType === "tablePopup") {
            // Prepare data for the table popup
            setOrderTablePopup(true);
        
        } else if (orderType === "autoOrderMorrisons") {
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
        }
    };
    
    const openAllLinks = () => {
        orderList.forEach((order) => {
            order.items.forEach((item) => {
                if (item.link) {
                    window.open(item.link, "_blank");
                }
            });
        });
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

    const handleMouseEnter = (event, item) => {
        setHoveredItem(item);
        
        const rect = event.currentTarget.getBoundingClientRect();
        //const container = document.querySelector(".item-list-container"); // Get the container
        //const containerRect = container?.getBoundingClientRect(); // Get container position

        /* // Keeping these here for reference later if needed
        console.log(`event.pageX: ${event.pageX}`); // x position of mouse wrt edge of the page (including all off-screen content)
        console.log(`event.pageY: ${event.pageY}`); // x position of mouse wrt edge of the page (including off-screen content)
        console.log(`event.clientX: ${event.clientX}`); // Same as pageX when not scrolled
        console.log(`event.clientY: ${event.clientY}`); // Same as rect.top
        console.log(`window.scrollX: ${window.scrollX}`); //
        console.log(`window.scrollY: ${window.scrollY}`); // Scroll amount = pageY - clientY (or pageY = rect.top)
        console.log(`rect.top: ${rect.top}`); // position of top of item being hovered over wrt edge of browser window (can be negative if top of item is partially off screen)
        console.log(`rect.left: ${rect.left}`); // left hand side of item being hovered over wrt browser window (can be -ve)
        console.log(`rect.width: ${rect.width}`); // width of item being hovered over (can be -ve)
        console.log(`rect.right: ${rect.right}`);
        console.log(`document.documentElement.scrollTop: ${document.documentElement.scrollTop}`);
        */
        
        // Popup has 'fixed' position so top and left are relative to entire page
        setPopupPosition({
            top: rect.top,  // want this to be based on "event.pageY - height of content above items container"
            left: rect.right
        });
    };

    // Tag filtering
    const handleTagSelect = (tag) => {
        if (!selectedTags.includes(tag)) {
            setSelectedTags([...selectedTags, tag]); // Add tag to selectedTags
        }
    };

    const handleTagRemove = (tag) => {
        setSelectedTags(selectedTags.filter(t => t !== tag)); // Remove tag from selectedTags
    };

    const filteredItems = items.filter(item => {
        // Filter items based on selected tags
        if (selectedTags.length === 0) return true; // Show all items if no tags are selected
        return selectedTags.every(tag => item.tags?.includes(tag));
    });

    return (
        <div className="items-container">
            <Tabs />
            <ToastContainer />
            <div className="top-section">
                <div className="header">
                    {/*<button className="home-button" onClick={() => window.location.href = "/"}>Home</button>*/}
                    <button className="cart-button" onClick={() => setCartVisible(!cartVisible)}>🛒 Shopping List</button>
                </div>
                <h1 className="items-title">Select Individual Items</h1>
            </div>

            <div className="bottom-section">
                <p className="items-description">
                    Add new or select saved items to add to shopping lists. Tag items for filtering to speed up list creation. Add links to streamline ordering.
                </p>
                <div className="select-item-category">
                    <span className="select-item-category-title" data-tooltip="Any items added will be shown under this heading in the shopping list">
                    <span className="info-sign">ⓘ</span> Category: 
                    </span>
                    <input 
                        type="text" 
                        placeholder="Enter category name (optional)" 
                        className="category-input" 
                        value={customHeading} 
                        onChange={(e) => setCustomHeading(e.target.value)}
                    />
                </div>

                <hr className='page-break-line'></hr>

                <div className="select-item-category">
                    <span className="create-item-title" data-tooltip="Create new items and add to Shopping List or save for adding later. Tagging items (e.g. freezer) will make it easier to filter and streamline Shopping List creation.">
                    <span className="info-sign">ⓘ</span> Create new item: 
                    </span>
                    <input 
                        type="text"
                        placeholder="Item name"
                        className="create-item-name"
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        title="Required: item name"
                    />
                    <input 
                        type="text"
                        placeholder="Size*"
                        className="create-item-quantity"
                        value={newItemQuantity}
                        onChange={(e) => setNewItemQuantity(e.target.value)}
                        title="Optional: add a link to external site for future reference"
                    />
                    <input 
                        type="text"
                        placeholder="Link*"
                        className="create-item-link"
                        value={newItemLink}
                        onChange={(e) => setNewItemLink(e.target.value)}
                        title="Optional: add a link to external site for future reference"
                    />
                    <input 
                        type="text"
                        placeholder="Tags*"
                        className="create-item-tags"
                        value={newItemTags}
                        onChange={(e) => setNewItemTags(e.target.value)}
                        title="Optional: add tags separated by spaces and/or commas to help with filtering saved items"
                    />
                    <button className="save-item-button" onClick={() => handleAddNewItemToOrder()}>Add to Shopping List</button>
                    <button className="save-item-button" onClick={() => handleSaveItem()}>Save Item</button>
                    <div className="external-search-link" onClick={() => setShowPopup(true)}>
                        🔍 Search store for items
                    </div>
                </div>

                <hr className='page-break-line'></hr>

                <div className="select-item-category">
                    <span className="create-item-title">Search pre-saved items: </span>
                    <input 
                        className="search-bar" 
                        type="text" 
                        placeholder="Search for an item..." 
                        value={search} 
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    <select
                        className="tag-dropdown"
                        onChange={(e) => handleTagSelect(e.target.value)}
                        value="" // Reset dropdown after selection
                    >
                        <option value="" disabled>Filter by tags</option>
                        {allTags.map(tag => (
                            <option key={tag} value={tag} disabled={selectedTags.includes(tag)}>
                                {tag}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="selected-tags">
                    {selectedTags.map(tag => (
                        <span key={tag} className="tag">
                            {tag}
                            <button className="remove-tag-button" onClick={() => handleTagRemove(tag)}>✖</button>
                        </span>
                    ))}
                </div>

                {loading ? (
                    <div className="loading-message">Finding items...<div className="loading-spinner"></div></div>
                ) : filteredItems.length === 0 ? (
                    <div className="no-items-message">No items match the selected tags and search term.</div>
                ) : (
                    <div className="items-list">
                        {filteredItems.filter(item => item.name.toLowerCase().includes(search.toLowerCase())).map((item) => (
                            <div key={item._id} className="item formatted-item" onMouseEnter={(event) => handleMouseEnter(event, item)} onMouseLeave={() => setHoveredItem(null)}>
                                <span className="item-text-select-items">
                                    {item.name}{item.size ? ` (${item.size})` : ""}{item.price ? `, £${item.price.current.amount}` : ""}
                                    { item.link? (
                                        <sup>
                                            <a 
                                                href={`${item.link}`} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="item-link"
                                            >view ⎘</a>
                                        </sup>
                                    ) : (
                                        <></>
                                    )}
                                </span>
                                <button className="add-item-button" onClick={() => handleAddToOrder(item)}>Add</button>
                                <button className="edit-item-button" onClick={() => handleEditItem(item)}>Edit</button>
                                <button className="delete-item-button" onClick={() => handleDeleteItem(item)}>Delete</button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            {saveItemPopup && (
                <div className="save-popup-overlay">
                    <div className="save-popup">
                        <h3>{`Overwrite existing item "${newItemName}"?`}</h3>
                        <div className="save-popup-buttons">
                            <button className="confirm-save" onClick={doTheActualSaving}>Yes, overwrite</button>
                            <button className="cancel-save" onClick={() => setSaveItemPopup(false)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {hoveredItem && hoveredItem.image?.src && (
                <div 
                    className="hover-popup-select" 
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

            {/* POPUP */}
            {showPopup && (
                <div className="popup-overlay">
                    <div className="popup-content">
                        <span className="popup-close-button" onClick={() => popupClose()}>✖</span>
                        <h2 className="popup-title">Find more items</h2>
                        <div className="popup-description">Search selected store for an item to link to item being created</div>
                        <input
                            type="text"
                            value={searchExternal}
                            placeholder="Search for an item..." 
                            onChange={(e) => setSearchExternal(e.target.value)}
                            className="popup-search-bar"
                        />
                        <div className="popup-controls">
                            <button className="popup-search-button" onClick={() => findNewItems(searchExternal)}>
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
                                            <button className="add-item-button" onClick={() => handleAddExternalToOrder(item)}>Add to Shopping List</button>
                                            <button className="add-item-button" onClick={() => handleLinkExternalToNewItem(item)}>Link to New Item</button>
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

            {orderTablePopup && (
                <OrderTablePopup
                    orderList={orderList}
                    onClose={() => setOrderTablePopup(false)}
                    openAllLinks={openAllLinks}
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

        </div>
    );
};

export default SelectItems;
