import { createContext, useContext, useEffect, useState } from "react";
const API_BASE_URL = process.env.REACT_APP_SERVER_HOST;

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
        fetch(`${API_BASE_URL}/user/get-user?anonUserId=${anonUserId}`)
            .then(res => res.json())
            .then(data => {
                //console.log("User fetched:", data.user); // for debugging
                setUser(data.user);
            })
            .catch(err => console.error("Error fetching user:", err));
    }, [anonUserId]);

    const login = async (email, password) => {
        try {
            const response = await fetch(`${API_BASE_URL}/user/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password, anonUserId }),
            });
    
            if (!response.ok) {
                throw new Error("Failed to login");
            }
    
            const data = await response.json();
            console.log("Login successful:", data);
    
            // Optionally store the token in localStorage or state
            localStorage.setItem("token", data.token);
    
            return { success: true, message: "Login successful" };
        } catch (error) {
            console.error("Error logging in:", error);
        }
    };
    
    const register = async (email, password) => {
        try {
            const response = await fetch(`${API_BASE_URL}/user/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password, anonUserId }),
            });
    
            if (!response.ok) {
                throw new Error("Failed to register");
            }
    
            const data = await response.json();
            console.log("Registration successful:", data);
    
            return { success: true, message: "Registration successful" };
        } catch (error) {
            console.error("Error registering:", error);
        }
    };
    
    const saveMeal = async (meal) => {
	    try {
	        const response = await fetch(`${API_BASE_URL}/user/save-meal`, {
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
            console.log(`Saving item to user: ${anonUserId}`)
	        const response = await fetch(`${API_BASE_URL}/user/save-item`, {
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

    const deleteMeal = async (mealName) => {
        try {
            const response = await fetch(`${API_BASE_URL}/user/delete-meal`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ mealName, anonUserId }),
            });
            
            if (!response.ok) {
                throw new Error("Failed to delete meal");
            }
            
            const updatedUser = await response.json(); // Get updated user from backend
            
            setUser(updatedUser);

            return { success: true, message: "Meal deleted!" };
        
        } catch (error) {
            console.error("Error deleting meal:", error);
        }
    };

    const deleteItem = async (itemName) => {
        try {
            const response = await fetch(`${API_BASE_URL}/user/delete-item`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ itemName, anonUserId }),
            });

            if (!response.ok) {
                throw new Error("Failed to delete item");
            }
            
            const updatedUser = await response.json(); // Get updated user from backend
            
            setUser(updatedUser);

            return { success: true, message: "Item deleted!" };
        
        } catch (error) {
            console.error("Error deleting item:", error);
        }
    };

    return (
        <UserContext.Provider value={{ user, saveMeal, saveItem, deleteMeal, deleteItem, login, register }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => useContext(UserContext);

