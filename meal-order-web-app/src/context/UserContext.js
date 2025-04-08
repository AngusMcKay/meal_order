import { createContext, useContext, useEffect, useState } from "react";

const getOrCreateAnonymousId = () => {
    let anonId = localStorage.getItem("anon_user_id");
    if (!anonId) {
        anonId = crypto.randomUUID();
        localStorage.setItem("anon_user_id", anonId);
    }
    return anonId;
};

const UserContext = createContext();

export const UserContextProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const anonUserId = getOrCreateAnonymousId();

    useEffect(() => {
        fetch(`http://localhost:5000/user/get-user?anonUserId=${anonUserId}`)
            .then(res => res.json())
            .then(data => {
                //console.log("User fetched:", data.user); // for debugging
                setUser(data.user);
            })
            .catch(err => console.error("Error fetching user:", err));
    }, [anonUserId]);

    const saveMeal = async (meal) => {
	    try {
	        const response = await fetch(`http://localhost:5000/user/save-meal`, {
	            method: "POST",
	            headers: { "Content-Type": "application/json" },
	            body: JSON.stringify({ meal, anonUserId }),
	        });

	        if (!response.ok) {
	            throw new Error("Failed to save meal");
	        }

	        const updatedUser = await response.json(); // Get updated user from backend

	        setUser(updatedUser); // ✅ Update user state with latest data

	        return { success: true, message: "Meal saved!" };

	    } catch (error) {
	        console.error("Error saving meal:", error);
	    }
	};

    const saveItem = async (item) => {
        try {
	        const response = await fetch(`http://localhost:5000/user/save-item`, {
	            method: "POST",
	            headers: { "Content-Type": "application/json" },
	            body: JSON.stringify({ item, anonUserId }),
	        });

	        if (!response.ok) {
	            throw new Error("Failed to save item");
	        }

	        const updatedUser = await response.json(); // Get updated user from backend

	        setUser(updatedUser); // ✅ Update user state with latest data

	        return { success: true, message: "Item saved!" };

	    } catch (error) {
	        console.error("Error saving item:", error);
	    }
    };

    const deleteMeal = async (mealId) => {
        await fetch(`http://localhost:5000/user/delete-meal`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ anonUserId, mealId }),
        });
        setUser(prev => ({ ...prev, meals: prev.meals.filter(meal => meal.id !== mealId) }));

        return { success: true, message: "Meal deleted!" };
    };

    return (
        <UserContext.Provider value={{ user, saveMeal, saveItem, deleteMeal }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => useContext(UserContext);

