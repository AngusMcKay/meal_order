import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import HomePage from "./HomePage";
import SelectMeals from "./SelectMeals"
import SelectItems from "./SelectItems"
import CreateMeals from "./CreateMeals"

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/select-meals" element={<SelectMeals />} />
                <Route path="/select-items" element={<SelectItems />} />
                <Route path="/create-meals" element={<CreateMeals />} />
            </Routes>
        </Router>
    );
}

export default App;
