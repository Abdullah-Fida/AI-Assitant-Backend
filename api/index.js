const serverless = require('serverless-http');

// Crash immediately if this runs
console.log("🚨 API INDEX.JS IS RUNNING");

// Try to load the app
let app;
try {
    console.log("Attempting to load ../index.js");
    app = require('../index.js');
    console.log("✅ App loaded successfully");
} catch (error) {
    console.log("❌ Failed to load app:", error);
    console.log("Stack:", error.stack);
    
    // Create a fallback app that returns errors
    const express = require('express');
    const fallbackApp = express();
    fallbackApp.get('*', (req, res) => {
        res.status(500).json({
            error: "App failed to load",
            message: error.message,
            stack: error.stack
        });
    });
    app = fallbackApp;
}

// Wrap with serverless
const handler = serverless(app);

// Export with error handling
module.exports.handler = async (req, res) => {
    console.log(`📡 ${req.method} ${req.url}`);
    
    // Handle favicon immediately
    if (req.url === '/favicon.ico') {
        return { statusCode: 204, body: '' };
    }
    
    try {
        return await handler(req, res);
    } catch (error) {
        console.error("💥 Handler error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: error.message,
                stack: error.stack
            })
        };
    }
};