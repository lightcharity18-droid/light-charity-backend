const rateLimit = require('express-rate-limit');
const { logger } = require('../services/logger.service');

// General API rate limiter - more lenient for development
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute (shorter window)
  max: process.env.NODE_ENV === 'production' ? 60 : 200, // More requests allowed, especially in development
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: 60 // 1 minute in seconds
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  trustProxy: true, // Trust proxy for production deployments
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.url,
      method: req.method
    });
    
    res.status(429).json({
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: 60
    });
  }
});

// Strict rate limiter for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs for auth
  message: {
    error: 'Too many authentication attempts, please try again later.',
    retryAfter: Math.ceil(15 * 60)
  },
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: true, // Trust proxy for production deployments
  skipSuccessfulRequests: true, // Don't count successful requests
  handler: (req, res) => {
    logger.warn('Auth rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.url,
      method: req.method
    });
    
    res.status(429).json({
      error: 'Too many authentication attempts, please try again later.',
      retryAfter: Math.ceil(15 * 60)
    });
  }
});

// Message sending rate limiter - more lenient for development
const messageLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: process.env.NODE_ENV === 'production' ? 30 : 100, // More requests allowed in development
  message: {
    error: 'Too many messages sent, please slow down.',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: true, // Trust proxy for production deployments
  handler: (req, res) => {
    logger.warn('Message rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.url,
      method: req.method
    });
    
    res.status(429).json({
      error: 'Too many messages sent, please slow down.',
      retryAfter: 60
    });
  }
});

// WebSocket connection rate limiter
const wsConnectionLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // limit each IP to 10 WebSocket connection attempts per minute
  message: {
    error: 'Too many WebSocket connection attempts, please try again later.',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: true, // Trust proxy for production deployments
  handler: (req, res) => {
    logger.warn('WebSocket connection rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    res.status(429).json({
      error: 'Too many WebSocket connection attempts, please try again later.',
      retryAfter: 60
    });
  }
});

module.exports = {
  apiLimiter,
  authLimiter,
  messageLimiter,
  wsConnectionLimiter
};
