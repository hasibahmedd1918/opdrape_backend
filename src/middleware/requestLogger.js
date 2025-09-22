const colors = require('colors');

// Initialize colors
colors.enable();

const requestLogger = (req, res, next) => {
    if (process.env.NODE_ENV === 'production') {
        next();
        return;
    }

    // Generate request ID
    const requestId = Math.random().toString(36).substring(7);
    const startTime = Date.now();

    // Log the incoming request
    console.log('\n━━━━━━━━━━ INCOMING REQUEST ━━━━━━━━━━'.blue.bold);
    console.log('⌚', new Date().toISOString().gray);
    console.log('📍', req.method.yellow.bold, req.url.cyan);
    
    // Log headers
    console.log('\n📋 Headers:'.gray);
    console.log(JSON.stringify(req.headers, null, 2).gray);

    // Log query parameters if they exist
    if (Object.keys(req.query).length > 0) {
        console.log('\n🔍 Query Parameters:'.gray);
        console.log(JSON.stringify(req.query, null, 2).gray);
    }

    // Log request body if it exists
    if (req.body && Object.keys(req.body).length > 0) {
        console.log('\n📦 Request Body:'.gray);
        console.log(JSON.stringify(req.body, null, 2).gray);
    }

    // Capture the original send function
    const originalSend = res.send;

    // Override the send function to log the response
    res.send = function (body) {
        const responseTime = Date.now() - startTime;

        console.log('\n━━━━━━━━━━ OUTGOING RESPONSE ━━━━━━━━━━'.green.bold);
        console.log('⌚', new Date().toISOString().gray);
        console.log('⏱️ ', `${responseTime}ms`.yellow.bold);
        
        // Log response status
        const statusCode = res.statusCode;
        const statusColor = statusCode >= 500 ? 'red' : 
                          statusCode >= 400 ? 'yellow' : 
                          statusCode >= 300 ? 'cyan' : 
                          'green';
        console.log('📊', `Status: ${statusCode}`[statusColor].bold);

        // Log response body
        console.log('\n📦 Response Body:'.gray);
        if (typeof body === 'string') {
            try {
                // Try to parse JSON string
                const parsed = JSON.parse(body);
                console.log(JSON.stringify(parsed, null, 2).gray);
            } catch {
                console.log(body.gray);
            }
        } else {
            console.log(JSON.stringify(body, null, 2).gray);
        }

        console.log('\n━━━━━━━━━━ END REQUEST ━━━━━━━━━━\n'.blue.bold);

        // Call the original send function
        originalSend.call(this, body);
    };

    next();
};

// Error logger middleware
const errorLogger = (err, req, res, next) => {
    if (process.env.NODE_ENV === 'production') {
        next(err);
        return;
    }

    console.log('\n━━━━━━━━━━ ERROR ━━━━━━━━━━'.red.bold);
    console.log('⌚', new Date().toISOString().gray);
    console.log('🔥', 'Error Message:'.red.bold, err.message);
    console.log('📍', req.method.yellow.bold, req.url.cyan);
    
    if (err.stack) {
        console.log('\n⚠️  Stack Trace:'.gray);
        console.log(err.stack.gray);
    }
    
    console.log('\n━━━━━━━━━━ END ERROR ━━━━━━━━━━\n'.red.bold);
    next(err);
};

module.exports = { requestLogger, errorLogger }; 