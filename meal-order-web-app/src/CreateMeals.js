import React, { useState, useEffect } from "react";
import "./CreateMeals.css";

const CreateMeals = () => {
    const [meals, setMeals] = useState([]);
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

    useEffect(() => {
        fetch("http://localhost:5000/meals")
            .then(response => response.json())
            .then(data => setMeals(data))
            .catch(error => console.error("Error fetching meals:", error));

        fetch("http://localhost:5000/items")
            .then(response => response.json())
            .then(data => setItems(data))
            .catch(error => console.error("Error fetching items:", error));
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
        setNewMealName("");
    };

    const handleSelectMeal = (meal) => {
        setSelectedMeal(meal.name);
        setMealItems(meal.items);
        setEditingMode(true);
    };

    const handleAddItemToMeal = (item) => {
        setMealItems([...mealItems, item]);
    };

    const handleStoreMeal = () => {
        fetch("http://localhost:5000/meals", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: selectedMeal, items: mealItems })
        })
            .then(response => response.json())
            .then(data => console.log("Meal stored successfully", data))
            .catch(error => console.error("Error storing meal:", error));
    };

    const handleAddMealToOrder = () => {
        setOrderList([...orderList, { meal: selectedMeal, items: mealItems }]);
        localStorage.setItem("orderList", JSON.stringify([...orderList, { meal: selectedMeal, items: mealItems }]));
    };

    const handleGoBack = () => {
        setEditingMode(false);
        setSelectedMeal(null);
    };

    return (
        <div className="create-meals-container">
            <div className="top-section-create">
                <div className="header">
                    <button className="home-button" onClick={() => window.location.href = "/"}>Home</button>
                    <button className="cart-button" onClick={() => setCartVisible(!cartVisible)}>🛒 Cart</button>
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
                                Or edit an existing meal
                            </div>

                            <div className="edit-existing">
                                <select className="edit-meal-dropdown" onChange={(e) => handleSelectMeal(meals.find(meal => meal.name === e.target.value))}>
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
                            <button className="go-back-button" onClick={handleGoBack}>Back</button>
                            <select className="change-meal-dropdown" value={selectedMeal} onChange={(e) => handleSelectMeal(meals.find(meal => meal.name === e.target.value))}>
                                <option value="" disabled>Select a meal</option>
                                {meals.map(meal => (
                                    <option key={meal.name} value={meal.name}>{meal.name}</option>
                                ))}
                            </select>
                        </div>

                        {selectedMeal && (
                            <div className="meal-edit-section">
                                <div className="meal-details">
                                    <h2>{selectedMeal}</h2>
                                    <ul>
                                        {mealItems.map((item, index) => (
                                            <li key={index}>{item.name}</li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="search-items">
                                    <input 
                                        type="text" 
                                        placeholder="Search for an item..." 
                                        value={search} 
                                        onChange={(e) => setSearch(e.target.value)}
                                    />
                                    <div className="items-list">
                                        {items.filter(item => item.name.toLowerCase().includes(search.toLowerCase())).map((item) => (
                                            <div key={item._id} className="item formatted-item">
                                                <span className="item-text">{item.name}</span>
                                                <button className="add-item-button" onClick={() => handleAddItemToMeal(item)}>Add</button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                
                )}
            </div>


        </div>
    );
};

export default CreateMeals;
