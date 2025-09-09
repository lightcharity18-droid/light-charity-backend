const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Test WebSocket connection
async function testWebSocket() {
  try {
    // Create a test JWT token (you'll need a valid user ID from your database)
    const testUserId = '507f1f77bcf86cd799439011'; // Replace with actual user ID
    const token = jwt.sign({ id: testUserId }, process.env.JWT_SECRET, { expiresIn: '1h' });
    
    console.log('Connecting to WebSocket server...');
    const ws = new WebSocket(`ws://localhost:5000/ws?token=${encodeURIComponent(token)}`);
    
    ws.on('open', () => {
      console.log('✅ WebSocket connected successfully');
      
      // Test subscribing to a community
      const testCommunityId = '507f1f77bcf86cd799439012'; // Replace with actual community ID
      ws.send(JSON.stringify({
        type: 'subscribe_community',
        data: { communityId: testCommunityId }
      }));
      
      // Send ping
      setTimeout(() => {
        ws.send(JSON.stringify({ type: 'ping', data: {} }));
      }, 1000);
      
      // Close connection after 5 seconds
      setTimeout(() => {
        ws.close();
      }, 5000);
    });
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        console.log('📨 Received message:', message);
      } catch (error) {
        console.error('❌ Error parsing message:', error);
      }
    });
    
    ws.on('close', (code, reason) => {
      console.log(`🔌 WebSocket closed: ${code} ${reason}`);
    });
    
    ws.on('error', (error) => {
      console.error('❌ WebSocket error:', error);
    });
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  console.log('🧪 Starting WebSocket test...');
  testWebSocket();
}

module.exports = testWebSocket;
