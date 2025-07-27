const axios = require('axios');

// Test script for message API endpoints
const API_BASE_URL = 'http://localhost:5000/api';

// Test data
const testMessage = {
    to: 'test@example.com',
    subject: 'Test Message from Dashboard',
    message: 'This is a test message sent from the Light Charity dashboard messaging system.'
};

// Mock JWT token (you'll need to replace this with a real token from a logged-in user)
const mockToken = 'your-jwt-token-here';

async function testMessageAPI() {
    console.log('🧪 Testing Light Charity Message API\n');

    try {
        // Test 1: Health check
        console.log('1. Testing health check...');
        const healthResponse = await axios.get(`${API_BASE_URL}/messages/health`);
        console.log('✅ Health check passed:', healthResponse.data);
        console.log('');

        // Test 2: Send message endpoint (requires authentication)
        console.log('2. Testing send message endpoint...');
        console.log('Note: This test requires a valid JWT token to work properly.');
        console.log('To test with authentication:');
        console.log('1. Login through the frontend or auth API');
        console.log('2. Copy the JWT token');
        console.log('3. Replace mockToken variable in this script');
        console.log('4. Re-run this test');
        console.log('');

        if (mockToken !== 'your-jwt-token-here') {
            try {
                const messageResponse = await axios.post(
                    `${API_BASE_URL}/messages/send`,
                    testMessage,
                    {
                        headers: {
                            'Authorization': `Bearer ${mockToken}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );
                console.log('✅ Message sent successfully:', messageResponse.data);
            } catch (authError) {
                console.log('❌ Authentication failed (expected if using mock token):');
                console.log('   Status:', authError.response?.status);
                console.log('   Message:', authError.response?.data?.message);
            }
        } else {
            console.log('⏩ Skipping authenticated test (no token provided)');
        }

        console.log('');
        console.log('🎉 Basic API tests completed!');
        console.log('');
        console.log('📝 To fully test the messaging system:');
        console.log('1. Start the backend server: cd backend && npm run dev');
        console.log('2. Start the frontend: cd frontend && npm run dev');
        console.log('3. Login to the dashboard');
        console.log('4. Navigate to Messages page');
        console.log('5. Try sending a message');
        console.log('');
        console.log('📧 Email Configuration:');
        console.log('- Make sure RESEND_API_KEY is set in your .env file');
        console.log('- Configure EMAIL_FROM with your verified domain or email');
        console.log('- See backend/config/env.example.txt for details');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        
        if (error.code === 'ECONNREFUSED') {
            console.log('');
            console.log('🔧 Make sure the backend server is running:');
            console.log('   cd backend && npm run dev');
        }
    }
}

// Run the test
testMessageAPI(); 