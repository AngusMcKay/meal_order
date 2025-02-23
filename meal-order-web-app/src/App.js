import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import HomePage from "./HomePage";
import SelectMeals from "./SelectMeals"
import SelectItems from "./SelectItems"

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/select-meals" element={<SelectMeals />} />
                <Route path="/select-items" element={<SelectItems />} />
                <Route path="/create-meals" element={<div>Create Meals Page</div>} />
            </Routes>
        </Router>
    );
}

export default App;
