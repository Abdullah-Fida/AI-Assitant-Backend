const express = require('express');
const app = express();
const cors = require("cors");

// Import routes
const routes = require('./routes.js');

// Middleware
app.use(express.json());
app.use(cors());
app.use(express.urlencoded({ extended: true }));

// Add request logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Test endpoint
app.get('/ping', (req, res) => {
    res.status(200).json({ message: 'pong', time: new Date().toISOString() });
});

// Handle favicon.ico
app.get('/favicon.ico', (req, res) => res.status(204).end());

// Root route
app.get('/', (req, res) => {
    res.send(`
        <h1>Backend Server is Running on Vercel</h1>
        <p>The Agency Product API is active</p>
        <p>Test: <a href="/ping">/ping</a></p>
        <p>Health: <a href="/health">/health</a></p>
        <p>API Test: <a href="/api/test">/api/test</a></p>
    `);
});

// Simple test route
app.get('/api/test', (req, res) => {
    res.json({ message: "API is working on Vercel!" });
});

// Use routes with /api prefix
app.use('/api', routes);

// 404 handler - FIXED for Express 5
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found', path: req.originalUrl });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('🔥 Express error:', err);
    res.status(500).json({ 
        error: 'Internal Server Error', 
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

// Only start the server if running directly (not on Vercel)
if (process.env.NODE_ENV !== 'production' && require.main === module) {
    const port = process.env.PORT || 3000;
    app.listen(port, () => {
        console.log("✅ Server started on port " + port);
        console.log("📡 API Base URL: http://localhost:" + port + "/api");
    });
}

module.exports = app;