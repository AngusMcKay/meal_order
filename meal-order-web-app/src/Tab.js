import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./Tabs.css";

const Tabs = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const tabs = [
        { name: "Home", path: "/", color: "#ff909e" },
        { name: "My Meals", path: "/select-meals", color: "#58855C" },
        { name: "Items", path: "/select-items", color: "#4a5568" },
        { name: "Create Meals", path: "/create-meals", color: "#245682" },
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
                    {location.pathname !== tab.path && tab.name}
                </div>
            ))}
        </div>
    );
};

export default Tabs;