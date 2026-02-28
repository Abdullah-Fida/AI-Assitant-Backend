const express = require('express');
const app = express();
const cors = require("cors");

// Import routes
const routes = require('./routes.js');

// Middleware
app.use(express.json());
app.use(cors());
app.use(express.urlencoded({ extended: true }));

// ✅ ADD THIS TEST ENDPOINT AT THE VERY TOP (before any other routes)
app.get('/ping', (req, res) => {
    res.status(200).json({ 
        message: 'pong', 
        time: new Date().toISOString(),
        env: process.env.NODE_ENV 
    });
});

// Handle favicon.ico
app.get('/favicon.ico', (req, res) => res.status(204).end());

// Root route
app.get('/', (req, res) => {
    res.send(`
        <h1>Backend Server is Running on Vercel</h1>
        <p>The Agency Product API is active</p>
        <p>Test: <a href="/ping">/ping</a></p>
        <p>API Test: <a href="/api/test">/api/test</a></p>
    `);
});

// Test route
app.get('/api/test', (req, res) => {
    res.json({ message: "API is working on Vercel!" });
});

// Use routes with /api prefix
app.use('/api', routes);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('🔥 Express error:', err);
    res.status(500).json({ 
        error: 'Internal Server Error', 
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Route not found', path: req.originalUrl });
});

module.exports = app;