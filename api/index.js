const serverless = require('serverless-http');
const app = require('../index.js');

// Catch ALL errors
process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION:', err);
    console.error('STACK:', err.stack);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('UNHANDLED REJECTION:', reason);
});

module.exports.handler = async (req, res) => {
    try {
        console.log('REQUEST:', req.method, req.url);
        
        // Handle favicon.ico immediately
        if (req.url === '/favicon.ico') {
            return { statusCode: 204, body: '' };
        }
        
        return await serverless(app)(req, res);
    } catch (error) {
        console.error('HANDLER CRASHED:', error);
        console.error('FULL ERROR:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
        return {
            statusCode: 500,
            body: JSON.stringify({ 
                error: error.message,
                name: error.name,
                stack: error.stack
            })
        };
    }
};