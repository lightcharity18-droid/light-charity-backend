const express = require('express');
const router = express.Router();

// Import controllers
const {
  createCommunity,
  getCommunities,
  getUserCommunities,
  getCommunityById,
  joinCommunity,
  leaveCommunity,
  updateCommunity,
  deleteCommunity
} = require('../controllers/community.controller');

const {
  sendMessage,
  getCommunityMessages,
  editMessage,
  deleteMessage,
  addReaction,
  removeReaction,
  getRecentMessages
} = require('../controllers/communityMessage.controller');

// Import middleware
const { authenticate } = require('../middleware/auth');
const {
  validateCommunityCreation,
  validateCommunityUpdate,
  validateMessageSend,
  validateMessageEdit,
  validateReaction
} = require('../middleware/validation');
const {
  validateMessageContent,
  validateMessageEdit: validateMessageEditContent,
  validateMessageReaction
} = require('../utils/messageValidator');

// Community routes
router.post('/', authenticate, validateCommunityCreation, createCommunity);
router.get('/', authenticate, getCommunities);
router.get('/my-communities', authenticate, getUserCommunities);
router.get('/recent-messages', authenticate, getRecentMessages);
router.get('/:id', authenticate, getCommunityById);
router.post('/:id/join', authenticate, joinCommunity);
router.post('/:id/leave', authenticate, leaveCommunity);
router.put('/:id', authenticate, validateCommunityUpdate, updateCommunity);
router.delete('/:id', authenticate, deleteCommunity);

// Community message routes with enhanced validation
router.post('/:communityId/messages', authenticate, validateMessageContent, validateMessageSend, sendMessage);
router.get('/:communityId/messages', authenticate, getCommunityMessages);
router.put('/messages/:messageId', authenticate, validateMessageEditContent, validateMessageEdit, editMessage);
router.delete('/messages/:messageId', authenticate, deleteMessage);
router.post('/messages/:messageId/react', authenticate, validateMessageReaction, validateReaction, addReaction);
router.delete('/messages/:messageId/react', authenticate, removeReaction);

module.exports = router;
