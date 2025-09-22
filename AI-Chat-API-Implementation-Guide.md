# AI Chat System - Frontend Implementation Guide

## Overview
This guide provides comprehensive API documentation for implementing the AI chat system in your frontend application. The AI chat feature provides real-time access to your database, allowing users to get accurate information about products, orders, and business services.

## Base Configuration

### Base URL
```
http://localhost:8000/api/ai
```
*For production, replace with your actual domain*

### Authentication
All endpoints require JWT authentication via Bearer token in the Authorization header.

## API Endpoints

### 1. Send Message to AI

**Endpoint:** `POST /api/ai/chat`

**Purpose:** Send a message to the AI and receive a response with real-time database information.

#### Request Headers
```
Content-Type: application/json
Authorization: Bearer <your_jwt_token>
```

#### Request Body Structure
```json
{
  "message": "string (required, 1-2000 characters)",
  "conversationHistory": [
    {
      "role": "string (user|assistant)",
      "content": "string"
    }
  ]
}
```

#### Request Body Details
- **message**: The user's question or message to the AI
  - Required: Yes
  - Type: String
  - Length: 1-2000 characters
  - Example: "What are your best-selling products?"

- **conversationHistory**: Previous conversation context (optional)
  - Required: No
  - Type: Array of objects
  - Purpose: Maintains conversation context for better responses
  - Each object contains:
    - **role**: Either "user" or "assistant"
    - **content**: The actual message content

#### Success Response (200 OK)
```json
{
  "success": true,
  "data": {
    "message": "string (AI response text)",
    "timestamp": "string (ISO 8601 format)",
    "conversationId": "string (unique conversation identifier)",
    "dataUsed": {
      "productsFound": "number (products found in database)",
      "categoriesFound": "number (categories found)",
      "promotionsFound": "number (active promotions found)",
      "userOrdersFound": "number (user's orders found)"
    }
  }
}
```

#### Response Data Details
- **message**: The AI's response to the user's query
- **timestamp**: When the response was generated (ISO 8601 format)
- **conversationId**: Unique identifier for this conversation session
- **dataUsed**: Statistics about what database data was used to generate the response

#### Error Responses

**400 Bad Request - Empty Message**
```json
{
  "success": false,
  "message": "Message is required and cannot be empty"
}
```

**400 Bad Request - Message Too Long**
```json
{
  "success": false,
  "message": "Message is too long. Please keep it under 2000 characters"
}
```

**401 Unauthorized - Missing/Invalid Token**
```json
{
  "error": "Authentication required"
}
```

**429 Too Many Requests - API Quota Exceeded**
```json
{
  "success": false,
  "message": "AI service is temporarily unavailable due to high usage. Please try again later."
}
```

**500 Internal Server Error**
```json
{
  "success": false,
  "message": "Failed to process your message. Please try again."
}
```

---

### 2. Get AI Suggestions

**Endpoint:** `GET /api/ai/suggestions`

**Purpose:** Retrieve dynamic suggestions for common queries based on available data.

#### Request Headers
```
Authorization: Bearer <your_jwt_token>
```

#### Request Body
No request body required.

#### Success Response (200 OK)
```json
{
  "success": true,
  "data": {
    "suggestions": [
      "string (suggestion text)"
    ],
    "timestamp": "string (ISO 8601 format)",
    "dynamicData": {
      "categoriesAvailable": "number (available categories)",
      "bestSellersAvailable": "number (best selling products)",
      "newArrivalsAvailable": "number (new arrival products)",
      "userHasOrders": "boolean (user has order history)"
    }
  }
}
```

#### Response Data Details
- **suggestions**: Array of suggested questions/queries
- **timestamp**: When suggestions were generated
- **dynamicData**: Metadata about available data for generating suggestions

#### Example Suggestions
- "What are your best-selling products?"
- "Show me new arrivals"
- "What categories do you have?"
- "How can I track my order?"
- "What is your return policy?"
- "Do you offer international shipping?"
- "What payment methods do you accept?"
- "How long does shipping take?"

---

### 3. AI Service Health Check

**Endpoint:** `GET /api/ai/health`

**Purpose:** Check if the AI service is operational and properly configured.

#### Request Headers
```
Authorization: Bearer <your_jwt_token>
```

#### Request Body
No request body required.

#### Success Response (200 OK)
```json
{
  "success": true,
  "data": {
    "status": "AI service is operational",
    "timestamp": "string (ISO 8601 format)",
    "apiKeyConfigured": "boolean (API key status)"
  }
}
```

#### Error Response (500 Internal Server Error)
```json
{
  "success": false,
  "data": {
    "status": "AI service is not available",
    "timestamp": "string (ISO 8601 format)",
    "error": "string (error details)"
  }
}
```

## Data Types and Formats

### Conversation History Format
```json
[
  {
    "role": "user",
    "content": "What are your best-selling products?"
  },
  {
    "role": "assistant", 
    "content": "Our best-selling products include..."
  }
]
```

### Timestamp Format
- **Format**: ISO 8601
- **Example**: "2025-01-15T10:30:00.000Z"
- **Timezone**: UTC

### Conversation ID Format
- **Pattern**: `conv_{userId}_{timestamp}`
- **Example**: "conv_67d3438bdedb844ad5047029_1758482735543"

## AI Response Capabilities

### Product Queries
The AI can provide information about:
- **Best-selling products** with real prices and ratings
- **New arrivals** with current availability
- **Sale items** with discount percentages
- **Product categories** and subcategories
- **Product details** including colors, sizes, and descriptions

### Order Queries
The AI can help with:
- **Order tracking** using real order status
- **Order history** showing recent purchases
- **Order details** including items and quantities
- **Shipping information** and delivery status

### Business Queries
The AI can provide information about:
- **Store policies** (returns, shipping, payments)
- **Active promotions** and discount codes
- **Payment methods** accepted
- **Customer support** information
- **International shipping** options

## Error Handling Best Practices

### Client-Side Error Handling
1. **Network Errors**: Handle connection timeouts and network failures
2. **Authentication Errors**: Redirect to login if token is invalid
3. **Rate Limiting**: Show user-friendly message for quota exceeded
4. **Validation Errors**: Display specific error messages for invalid input
5. **Server Errors**: Provide fallback responses for service unavailability

### Retry Logic
- Implement exponential backoff for temporary failures
- Retry up to 3 times for network errors
- Don't retry for authentication or validation errors

## Performance Considerations

### Request Optimization
- **Message Length**: Keep messages under 2000 characters
- **Conversation History**: Limit to last 10 messages for context
- **Debouncing**: Implement input debouncing to prevent excessive requests

### Response Handling
- **Loading States**: Show loading indicators during AI processing
- **Streaming**: Consider implementing streaming responses for long AI replies
- **Caching**: Cache suggestions and common responses

## Security Considerations

### Authentication
- **Token Storage**: Store JWT tokens securely (httpOnly cookies recommended)
- **Token Refresh**: Implement automatic token refresh before expiration
- **Logout**: Clear tokens on user logout

### Input Validation
- **Client-Side**: Validate message length and content before sending
- **Sanitization**: Sanitize user input to prevent XSS attacks
- **Rate Limiting**: Implement client-side rate limiting

## Integration Examples

### Basic Chat Implementation
1. **Setup**: Configure base URL and authentication headers
2. **Send Message**: POST to `/api/ai/chat` with message and optional history
3. **Handle Response**: Display AI response and update conversation history
4. **Error Handling**: Show appropriate error messages

### Suggestions Integration
1. **Load Suggestions**: GET from `/api/ai/suggestions` on component mount
2. **Display Options**: Show suggestions as clickable buttons or dropdown
3. **Auto-fill**: Populate chat input when suggestion is clicked
4. **Dynamic Updates**: Refresh suggestions based on user context

### Health Monitoring
1. **Startup Check**: Verify AI service health on app initialization
2. **Periodic Checks**: Monitor service status during usage
3. **Fallback Mode**: Provide offline functionality if AI is unavailable

## Testing Scenarios

### Functional Testing
- **Basic Chat**: Send simple messages and verify responses
- **Product Queries**: Test product-related questions
- **Order Queries**: Test order tracking and history
- **Error Handling**: Test various error conditions
- **Authentication**: Test with valid/invalid tokens

### Performance Testing
- **Response Time**: Measure AI response latency
- **Concurrent Users**: Test multiple simultaneous requests
- **Large Messages**: Test with maximum message length
- **Long Conversations**: Test with extensive conversation history

## Monitoring and Analytics

### Key Metrics to Track
- **Response Time**: Average time for AI responses
- **Success Rate**: Percentage of successful requests
- **Error Types**: Distribution of different error types
- **User Engagement**: Chat usage patterns and frequency
- **Query Types**: Most common user questions

### Logging Recommendations
- **Request Logging**: Log all API requests with timestamps
- **Error Logging**: Log detailed error information
- **Performance Logging**: Track response times and bottlenecks
- **User Activity**: Log user interaction patterns (anonymized)

## Troubleshooting Guide

### Common Issues
1. **Authentication Failures**: Check token validity and expiration
2. **Network Timeouts**: Verify server connectivity and response times
3. **Empty Responses**: Check if database has data for the query
4. **Rate Limiting**: Monitor API usage and implement backoff
5. **CORS Issues**: Ensure proper CORS configuration

### Debug Information
- **Request Headers**: Verify all required headers are present
- **Request Body**: Validate JSON format and required fields
- **Response Status**: Check HTTP status codes
- **Error Messages**: Parse and display specific error details
- **Network Tab**: Use browser dev tools to inspect requests/responses

---

This guide provides all the necessary information to implement the AI chat system in your frontend application. The API is designed to be simple yet powerful, providing real-time access to your database while maintaining security and performance standards.