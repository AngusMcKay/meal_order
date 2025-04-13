import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./Tabs.css";

const Tabs = ({ handleNavigation }) => {
    const navigate = useNavigate();
    const location = useLocation();

    const tabs = [
        { name: "Home", path: "/", color: "#f3f4f6" },
        { name: "My Meals", path: "/select-meals", color: "#6bcad1" },
        { name: "Items", path: "/select-items", color: "#ffde8f" },
        { name: "Create Meals", path: "/create-meals", color: "#ff909e" },
    ];

    const handleTabClick = (path) => {
        if (handleNavigation) {
            handleNavigation(() => navigate(path)); // Use handleNavigation to check for unsaved changes on createMeals page
        } else {
            navigate(path);
        }
    };

    return (
        <div className="tabs-container">
            {tabs.map((tab) => (
                <div
                    key={tab.name}
                    className={`tab ${location.pathname === tab.path ? "active" : ""}`}
                    style={{ backgroundColor: tab.color }}
                    onClick={() => handleTabClick(tab.path)}
                >
                    {tab.name}
                </div>
            ))}
        </div>
    );
};

export default Tabs;