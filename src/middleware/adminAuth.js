/**
 * Middleware to check if the user has admin role
 */
const adminAuth = (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        next();
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
};

module.exports = adminAuth; 