/**
 * Test script for AI Chat Endpoint
 * 
 * This script demonstrates how to test the AI chat functionality.
 * Make sure to:
 * 1. Set GOOGLE_GEMINI_API_KEY in your .env file
 * 2. Start the server with: npm start or npm run dev
 * 3. Have a valid JWT token for authentication
 */

const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:8000';
const JWT_TOKEN = 'your_jwt_token_here'; // Replace with actual token

// Test data
const testMessage = {
  message: "What are your best-selling products?",
  conversationHistory: []
};

// Test AI Chat Endpoint
async function testAIChat() {
  try {
    console.log('🤖 Testing AI Chat Endpoint...');
    
    const response = await axios.post(`${BASE_URL}/api/ai/chat`, testMessage, {
      headers: {
        'Authorization': `Bearer ${JWT_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ AI Chat Response:');
    console.log(JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ AI Chat Error:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

// Test AI Suggestions Endpoint
async function testAISuggestions() {
  try {
    console.log('\n💡 Testing AI Suggestions Endpoint...');
    
    const response = await axios.get(`${BASE_URL}/api/ai/suggestions`, {
      headers: {
        'Authorization': `Bearer ${JWT_TOKEN}`
      }
    });
    
    console.log('✅ AI Suggestions Response:');
    console.log(JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ AI Suggestions Error:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

// Test AI Health Check Endpoint
async function testAIHealth() {
  try {
    console.log('\n🏥 Testing AI Health Check Endpoint...');
    
    const response = await axios.get(`${BASE_URL}/api/ai/health`, {
      headers: {
        'Authorization': `Bearer ${JWT_TOKEN}`
      }
    });
    
    console.log('✅ AI Health Check Response:');
    console.log(JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ AI Health Check Error:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting AI Endpoint Tests...\n');
  
  if (JWT_TOKEN === 'your_jwt_token_here') {
    console.log('⚠️  Please update JWT_TOKEN in this script with a valid token');
    console.log('   You can get a token by logging in through /api/users/login');
    return;
  }
  
  await testAIHealth();
  await testAISuggestions();
  await testAIChat();
  
  console.log('\n✨ All tests completed!');
}

// Export for use in other scripts
module.exports = {
  testAIChat,
  testAISuggestions,
  testAIHealth,
  runAllTests
};

// Run tests if this script is executed directly
if (require.main === module) {
  runAllTests();
}