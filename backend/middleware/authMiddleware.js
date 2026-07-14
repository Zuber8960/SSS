const jwt = require('jsonwebtoken');

/**
 * Authentication middleware - Verifies JWT token
 * Extracts token from Authorization header (Bearer token)
 * Attaches user data to req.user if token is valid
 */
const authMiddleware = (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'No authorization token provided'
      });
    }

    // Extract token from "Bearer <token>"
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : authHeader;

    // Verify token
    const secret = process.env.JWT_SECRET || 'your_jwt_secret_key';
    const decoded = jwt.verify(token, secret);

    // Attach user data to request object
    req.user = decoded;
    // req.company_code = decoded.company_code ?? req.headers['x-company-code'] ?? null;
    req.tenant_id = decoded.tenant_id ?? req.headers['x-tenant-id'] ?? null;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    return res.status(401).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};

module.exports = authMiddleware;