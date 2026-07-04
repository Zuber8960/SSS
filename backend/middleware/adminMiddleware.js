const adminMiddleware = (req, res, next) => {
  if (req.user?.isAdmin === 'N') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Only admin users can perform this action.',
    });
  }
  next();
};

module.exports = adminMiddleware;
