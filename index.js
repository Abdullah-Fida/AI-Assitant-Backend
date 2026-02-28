const express = require('express');
const app = express();
const cors = require("cors");

// Import routes
const routes = require('./routes.js');

// Middleware
app.use(express.json());
app.use(cors());
app.use(express.urlencoded({ extended: true }));

// Use routes with /api prefix
app.use('/api', routes);

// Root route
app.get('/', (req, res) => {
    res.send(`
        <h1>Backend Server is Running on Vercel</h1>
        <p>The Agency Product API is active</p>
        <p>API Base: <a href="/api">/api</a></p>
    `);
});

// Simple test route
app.get('/api/test', (req, res) => {
    res.json({ message: "API is working on Vercel!" });
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