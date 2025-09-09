const winston = require('winston');

// Create logger configuration
const loggerConfig = {
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'light-charity-backend' },
  transports: [
    // Console transport for all environments
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
};

// Add file transports in production
if (process.env.NODE_ENV === 'production') {
  loggerConfig.transports.push(
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  );
}

const logger = winston.createLogger(loggerConfig);

// WebSocket specific logging
const wsLogger = {
  connection: (userId, socketId) => {
    logger.info('WebSocket connection established', {
      userId,
      socketId,
      event: 'ws_connection'
    });
  },
  
  disconnection: (userId, socketId, reason) => {
    logger.info('WebSocket connection closed', {
      userId,
      socketId,
      reason,
      event: 'ws_disconnection'
    });
  },
  
  subscription: (userId, communityId, action) => {
    logger.info('Community subscription event', {
      userId,
      communityId,
      action,
      event: 'ws_subscription'
    });
  },
  
  message: (messageId, senderId, communityId, recipientCount) => {
    logger.info('Message broadcast', {
      messageId,
      senderId,
      communityId,
      recipientCount,
      event: 'ws_message'
    });
  },
  
  error: (error, context) => {
    logger.error('WebSocket error', {
      error: error.message,
      stack: error.stack,
      context,
      event: 'ws_error'
    });
  }
};

// API request logging
const apiLogger = {
  request: (req, res, next) => {
    const start = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      logger.info('API request', {
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        event: 'api_request'
      });
    });
    
    next();
  }
};

// Database logging
const dbLogger = {
  connection: (state) => {
    logger.info('Database connection state changed', {
      state,
      event: 'db_connection'
    });
  },
  
  error: (error) => {
    logger.error('Database error', {
      error: error.message,
      stack: error.stack,
      event: 'db_error'
    });
  }
};

module.exports = {
  logger,
  wsLogger,
  apiLogger,
  dbLogger
};
