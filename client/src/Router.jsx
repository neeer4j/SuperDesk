import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import LandingPage from './LandingPage';

export default function Router() {
    return (
        <Routes>
            {/* Portfolio landing page */}
            <Route path="/" element={<Home />} />

            {/* Existing web app */}
            <Route path="/app/*" element={<LandingPage />} />
        </Routes>
    );
}
