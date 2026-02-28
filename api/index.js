const serverless = require('serverless-http');
const app = require('../index.js');

// Add error handling wrapper
module.exports.handler = async (req, res) => {
  try {
    console.log('Request received:', req.method, req.url);
    return await serverless(app)(req, res);
  } catch (error) {
    console.error('Function crashed:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal Server Error', message: error.message })
    };
  }
};