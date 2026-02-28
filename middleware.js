const supabase = require('./config/supabase.js');

const supabaseAuth = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ error: "Missing Authorization header" });
    }

    const token = authHeader.split(' ')[1]; // Bearer <token>

    if (!token) {
      return res.status(401).json({ error: "Missing token" });
    }

    // Verify token and get user
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    // Attach user to request
    req.user = user;

    // Proceed to next middleware / route
    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error during authentication" });
  }
};

// Export the middleware
module.exports = supabaseAuth;