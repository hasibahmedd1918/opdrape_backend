const AdminActivity = require('../models/AdminActivity');

/**
 * Middleware to log admin activities
 * @param {string} activityType - Type of activity (e.g., 'product', 'order', 'user', 'promotion')
 * @returns {Function} Express middleware function
 */
const adminActivityLogger = (activityType) => {
    return (req, res, next) => {
        // Store the original send method
        const originalSend = res.send;

        // Override the send method
        res.send = function(body) {
            try {
                // Only log successful operations (status 2xx)
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    const activity = {
                        userId: req.user._id,
                        userRole: req.user.role,
                        activityType,
                        action: getActionType(req.method),
                        details: {
                            method: req.method,
                            path: req.originalUrl,
                            body: req.body,
                            params: req.params,
                            query: req.query
                        },
                        ipAddress: req.ip,
                        timestamp: new Date()
                    };

                    // Log the activity (in production, you would save this to the database)
                    console.log(`Admin Activity: ${activity.action} ${activityType}`.cyan);
                    
                    // Here you would typically save to database:
                    // const ActivityLog = require('../models/ActivityLog');
                    // await new ActivityLog(activity).save();
                }
            } catch (error) {
                console.error('Error logging admin activity:', error);
                // Don't block the response if logging fails
            }

            // Call the original send method
            return originalSend.call(this, body);
        };

        next();
    };
};

/**
 * Get the action type based on HTTP method
 * @param {string} method - HTTP method
 * @returns {string} Action type
 */
function getActionType(method) {
    switch (method) {
        case 'POST': return 'create';
        case 'PUT':
        case 'PATCH': return 'update';
        case 'DELETE': return 'delete';
        case 'GET': return 'view';
        default: return 'other';
    }
}

module.exports = adminActivityLogger; 