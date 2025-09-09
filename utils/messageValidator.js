const { body } = require('express-validator');

// Message content validation and sanitization
const validateMessageContent = [
  body('content')
    .trim()
    .isLength({ min: 1, max: 2000 })
    .withMessage('Message content must be between 1 and 2000 characters')
    .escape() // Escape HTML entities
    .customSanitizer((value) => {
      // Remove excessive whitespace
      return value.replace(/\s+/g, ' ').trim();
    })
    .custom((value) => {
      // Check for spam patterns
      const spamPatterns = [
        /(.)\1{10,}/, // Repeated characters (more than 10 times)
        /https?:\/\/[^\s]+/gi, // URLs (you might want to allow these)
        /\b(buy now|click here|free money|win big)\b/gi // Common spam phrases
      ];
      
      // Only check for repeated characters and obvious spam
      if (spamPatterns[0].test(value) || spamPatterns[2].test(value)) {
        throw new Error('Message contains spam-like content');
      }
      
      return true;
    }),

  body('messageType')
    .optional()
    .isIn(['text', 'image', 'file', 'audio', 'video'])
    .withMessage('Invalid message type'),

  body('replyTo')
    .optional()
    .isMongoId()
    .withMessage('Invalid reply message ID')
];

// Message editing validation
const validateMessageEdit = [
  body('content')
    .trim()
    .isLength({ min: 1, max: 2000 })
    .withMessage('Message content must be between 1 and 2000 characters')
    .escape()
    .customSanitizer((value) => {
      return value.replace(/\s+/g, ' ').trim();
    })
];

// Message reaction validation
const validateMessageReaction = [
  body('emoji')
    .isLength({ min: 1, max: 10 })
    .withMessage('Emoji must be between 1 and 10 characters')
    .matches(/^[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]$/u)
    .withMessage('Invalid emoji format')
];

// Content sanitization for display
const sanitizeMessageForDisplay = (content) => {
  if (!content || typeof content !== 'string') {
    return '';
  }
  
  // Basic HTML sanitization (remove script tags, etc.)
  const sanitized = content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '');
  
  return sanitized.trim();
};

// Check if message content is appropriate
const isMessageAppropriate = (content) => {
  if (!content || typeof content !== 'string') {
    return false;
  }
  
  // Basic profanity filter (extend as needed)
  const inappropriateWords = [
    // Add inappropriate words here
    // This is a basic example - consider using a proper profanity filter library
  ];
  
  const lowerContent = content.toLowerCase();
  return !inappropriateWords.some(word => lowerContent.includes(word));
};

// Rate limiting check for message frequency
const checkMessageFrequency = (userId, lastMessageTime, minInterval = 1000) => {
  const now = Date.now();
  const timeSinceLastMessage = now - lastMessageTime;
  
  return timeSinceLastMessage >= minInterval;
};

// Message length and complexity validation
const validateMessageComplexity = (content) => {
  if (!content || typeof content !== 'string') {
    return { valid: false, reason: 'Empty content' };
  }
  
  // Check for excessive capitalization
  const upperCaseRatio = (content.match(/[A-Z]/g) || []).length / content.length;
  if (upperCaseRatio > 0.7 && content.length > 10) {
    return { valid: false, reason: 'Excessive capitalization' };
  }
  
  // Check for excessive special characters
  const specialCharRatio = (content.match(/[!@#$%^&*(),.?":{}|<>]/g) || []).length / content.length;
  if (specialCharRatio > 0.3) {
    return { valid: false, reason: 'Excessive special characters' };
  }
  
  return { valid: true };
};

module.exports = {
  validateMessageContent,
  validateMessageEdit,
  validateMessageReaction,
  sanitizeMessageForDisplay,
  isMessageAppropriate,
  checkMessageFrequency,
  validateMessageComplexity
};
