import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import ExistingApp from './ExistingApp';

// Main App with routing
// - "/" renders the new portfolio landing page
// - "/app" and "/app/*" render the existing web app
function App() {
    return (
        <Routes>
            {/* Portfolio landing page */}
            <Route path="/" element={<Home />} />

            {/* Existing web app - keeps all functionality */}
            <Route path="/app/*" element={<ExistingApp />} />
        </Routes>
    );
}

export default App;
