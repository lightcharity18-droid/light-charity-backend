const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-here-make-it-very-long-and-random-in-production';

// Test token creation
const userId = '507f1f77bcf86cd799439011'; // Sample MongoDB ObjectId
console.log('Creating token for userId:', userId);

const token = jwt.sign(
  { userId },
  JWT_SECRET,
  { expiresIn: '7d' }
);

console.log('Generated token:', token);
console.log('Token length:', token.length);

// Test token verification
try {
  const decoded = jwt.verify(token, JWT_SECRET);
  console.log('Decoded token:', decoded);
  console.log('Has userId:', !!decoded.userId);
  console.log('UserId value:', decoded.userId);
} catch (error) {
  console.error('Token verification failed:', error.message);
}

// Test with different structure (what might be coming from frontend)
const tokenWithId = jwt.sign(
  { id: userId }, // Using 'id' instead of 'userId'
  JWT_SECRET,
  { expiresIn: '7d' }
);

console.log('\n--- Testing with id field ---');
console.log('Token with id field:', tokenWithId);

try {
  const decodedWithId = jwt.verify(tokenWithId, JWT_SECRET);
  console.log('Decoded token with id:', decodedWithId);
  console.log('Has id:', !!decodedWithId.id);
  console.log('Has userId:', !!decodedWithId.userId);
} catch (error) {
  console.error('Token with id verification failed:', error.message);
}
