import React from "react";
import { useNavigate } from "react-router-dom";
import { Tooltip } from "@mui/material";
import "./HomePage.css";

const HomePage = () => {
    const navigate = useNavigate();

    return (
        <div className="container">
            <h1 className="title">Welcome to the Meal Order Web App</h1>
            <p className="description">
                Streamline your grocery shopping by selecting meals and automatically populating shopping carts.
                Choose one of the options below to get started.
            </p>
            
            <div className="button-container row">
                <Tooltip title="Select predefined meal combinations" arrow>
                    <button className="button blue" onClick={() => navigate("/select-meals")}>Select Meals</button>
                </Tooltip>
                
                <Tooltip title="Choose individual items for your order" arrow>
                    <button className="button green" onClick={() => navigate("/select-items")}>Select Individual Items</button>
                </Tooltip>
                
                <Tooltip title="Create custom meal combinations" arrow>
                    <button className="button purple" onClick={() => navigate("/create-meals")}>Create Meals</button>
                </Tooltip>
            </div>
        </div>
    );
};

export default HomePage;
