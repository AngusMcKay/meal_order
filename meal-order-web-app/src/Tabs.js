import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./Tabs.css";

const Tabs = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const tabs = [
        { name: "Home", path: "/", color: "#f3f4f6" },
        { name: "My Meals", path: "/select-meals", color: "#6bcad1" },
        { name: "Items", path: "/select-items", color: "#ffde8f" },
        { name: "Create Meals", path: "/create-meals", color: "#ff909e" },
    ];

    return (
        <div className="tabs-container">
            {tabs.map((tab) => (
                <div
                    key={tab.name}
                    className={`tab ${location.pathname === tab.path ? "active" : ""}`}
                    style={{ backgroundColor: tab.color }}
                    onClick={() => navigate(tab.path)}
                >
                    {tab.name}
                </div>
            ))}
        </div>
    );
};

export default Tabs;