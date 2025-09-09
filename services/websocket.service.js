const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Community = require('../models/community.model');
const { wsLogger } = require('./logger.service');

class WebSocketService {
  constructor() {
    this.io = null;
    this.clients = new Map(); // userId -> Set of Socket.IO socket connections
    this.communitySubscriptions = new Map(); // communityId -> Set of userIds
    this.userCommunities = new Map(); // userId -> Set of communityIds
    this.heartbeatInterval = parseInt(process.env.WEBSOCKET_HEARTBEAT_INTERVAL) || 30000;
    this.maxConnections = parseInt(process.env.MAX_WEBSOCKET_CONNECTIONS) || 1000;
    this.connectionCount = 0;
  }

  initialize(server) {
    this.io = new Server(server, {
      cors: {
        origin: [
          'http://localhost:3000',
          'https://light-charity.netlify.app',
          process.env.FRONTEND_URL,
        ].filter(Boolean),
        credentials: true,
        methods: ['GET', 'POST']
      },
      path: '/socket.io/',
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000,
      maxHttpBufferSize: 1e6, // 1MB
      allowEIO3: true
    });

    // Authentication middleware with rate limiting
    this.io.use(async (socket, next) => {
      try {
        // Check connection limits
        if (this.connectionCount >= this.maxConnections) {
          console.warn(`Connection limit reached: ${this.connectionCount}/${this.maxConnections}`);
          return next(new Error('Server overloaded'));
        }

        const token = socket.handshake.auth.token || socket.handshake.query.token;
        if (!token) {
          console.log('No token provided');
          return next(new Error('Authentication error'));
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded || !decoded.userId) {
          console.log('Invalid token - missing userId');
          return next(new Error('Authentication error'));
        }

        const user = await User.findById(decoded.userId);
        if (!user) {
          console.log('User not found');
          return next(new Error('Authentication error'));
        }
        
        // Store user object in socket
        socket.wsUser = {
          _id: user._id.toString(),
          email: user.email,
          userType: user.userType,
          firstName: user.firstName,
          lastName: user.lastName,
          name: user.name
        };
        
        this.connectionCount++;
        next();
      } catch (error) {
        console.error('Socket.IO authentication failed:', error.message);
        console.error('Token provided:', token ? 'Yes (length: ' + token.length + ')' : 'No');
        next(new Error('Authentication error'));
      }
    });

    this.io.on('connection', (socket) => {
      if (!socket.wsUser) {
        console.error('No user data in Socket.IO connection');
        socket.disconnect();
        return;
      }
      this.handleConnection(socket, socket.wsUser);
    });

    console.log('Socket.IO server initialized');
  }

  async handleConnection(socket, user) {
    if (!user || !user._id) {
      console.error('Invalid user data in handleConnection');
      socket.disconnect();
      return;
    }

    const userId = user._id.toString();
    console.log(`User ${userId} connected via Socket.IO`);
    wsLogger.connection(userId, socket.id);

    // Add client to tracking
    if (!this.clients.has(userId)) {
      this.clients.set(userId, new Set());
    }
    this.clients.get(userId).add(socket);

    // Load user's communities and subscribe to them
    await this.loadUserCommunities(userId);

    // Handle incoming messages
    socket.on('subscribe_community', async (data) => {
      await this.handleCommunitySubscription(userId, data.communityId);
    });

    socket.on('unsubscribe_community', (data) => {
      this.handleCommunityUnsubscription(userId, data.communityId);
    });

    socket.on('ping', () => {
      socket.emit('pong', { timestamp: new Date().toISOString() });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      this.handleDisconnection(userId, socket);
    });

    socket.on('error', (error) => {
      console.error(`Socket.IO error for user ${userId}:`, error);
      this.handleDisconnection(userId, socket);
    });

    // Send connection confirmation
    socket.emit('connection_established', {
      userId,
      userDetails: {
        email: user.email,
        userType: user.userType,
        firstName: user.firstName,
        lastName: user.lastName,
        name: user.name
      },
      timestamp: new Date().toISOString()
    });
  }

  async loadUserCommunities(userId) {
    try {
      const communities = await Community.find({
        'members.user': userId,
        isActive: true
      }).select('_id name');

      const communityIds = communities.map(c => c._id.toString());
      this.userCommunities.set(userId, new Set(communityIds));

      // Subscribe user to all their communities
      for (const community of communities) {
        this.subscribeToCommunity(userId, community._id.toString());
        
        // Send confirmation for each community
        const userClients = this.clients.get(userId);
        if (userClients) {
          userClients.forEach(socket => {
            socket.emit('community_subscribed', {
              communityId: community._id.toString(),
              communityName: community.name
            });
          });
        }
      }
    } catch (error) {
      console.error(`Error loading communities for user ${userId}:`, error);
    }
  }

  subscribeToCommunity(userId, communityId) {
    if (!this.communitySubscriptions.has(communityId)) {
      this.communitySubscriptions.set(communityId, new Set());
    }
    this.communitySubscriptions.get(communityId).add(userId);
    console.log(`User ${userId} subscribed to community ${communityId}. Total subscribers: ${this.communitySubscriptions.get(communityId).size}`);
  }

  unsubscribeFromCommunity(userId, communityId) {
    if (this.communitySubscriptions.has(communityId)) {
      this.communitySubscriptions.get(communityId).delete(userId);
      
      // Clean up empty community subscriptions
      if (this.communitySubscriptions.get(communityId).size === 0) {
        this.communitySubscriptions.delete(communityId);
      }
    }
  }

  // This method is no longer needed as we handle events directly in handleConnection

  async handleCommunitySubscription(userId, communityId) {
    try {
      // Verify user is a member of the community
      const community = await Community.findOne({
        _id: communityId,
        'members.user': userId,
        isActive: true
      });

      if (!community) {
        const userClients = this.clients.get(userId);
        if (userClients) {
          userClients.forEach(socket => {
            socket.emit('error', {
              message: 'Not authorized to subscribe to this community',
              timestamp: new Date().toISOString()
            });
          });
        }
        return;
      }

      this.subscribeToCommunity(userId, communityId);
      
      // Update user's community list
      if (!this.userCommunities.has(userId)) {
        this.userCommunities.set(userId, new Set());
      }
      this.userCommunities.get(userId).add(communityId);

      // Confirm subscription
      const userClients = this.clients.get(userId);
      if (userClients) {
        userClients.forEach(socket => {
          socket.emit('community_subscribed', {
            communityId,
            communityName: community.name
          });
        });
      }
    } catch (error) {
      console.error('Error handling community subscription:', error);
    }
  }

  handleCommunityUnsubscription(userId, communityId) {
    this.unsubscribeFromCommunity(userId, communityId);
    
    if (this.userCommunities.has(userId)) {
      this.userCommunities.get(userId).delete(communityId);
    }

    // Confirm unsubscription
    const userClients = this.clients.get(userId);
    if (userClients) {
      userClients.forEach(socket => {
        socket.emit('community_unsubscribed', { communityId });
      });
    }
  }

  handleDisconnection(userId, socket) {
    console.log(`User ${userId} disconnected from Socket.IO`);
    wsLogger.disconnection(userId, socket.id, 'user_disconnect');
    
    // Decrement connection count
    this.connectionCount = Math.max(0, this.connectionCount - 1);
    
    if (this.clients.has(userId)) {
      this.clients.get(userId).delete(socket);
      
      // If user has no more connections, clean up subscriptions
      if (this.clients.get(userId).size === 0) {
        this.clients.delete(userId);
        
        // Remove user from all community subscriptions
        if (this.userCommunities.has(userId)) {
          const userCommunityIds = this.userCommunities.get(userId);
          for (const communityId of userCommunityIds) {
            this.unsubscribeFromCommunity(userId, communityId);
          }
          this.userCommunities.delete(userId);
        }
      }
    }
  }

  // Broadcast message to all subscribers of a community
  broadcastToCommunity(communityId, eventName, data) {
    console.log(`Broadcasting message to community ${communityId}, event: ${eventName}`);
    const subscribers = this.communitySubscriptions.get(communityId);
    
    if (!subscribers || subscribers.size === 0) {
      console.warn(`No subscribers found for community ${communityId}`);
      return;
    }

    console.log(`Found ${subscribers.size} subscribers for community ${communityId}:`, Array.from(subscribers));
    
    let successCount = 0;
    for (const userId of subscribers) {
      const userClients = this.clients.get(userId);
      if (userClients && userClients.size > 0) {
        userClients.forEach(socket => {
          if (socket.connected) {
            try {
              socket.emit(eventName, data);
              successCount++;
              console.log(`Successfully sent message to user ${userId}`);
            } catch (error) {
              console.error(`Failed to send message to user ${userId}:`, error);
            }
          } else {
            console.warn(`Socket for user ${userId} is not connected`);
          }
        });
      } else {
        console.warn(`No active clients found for user ${userId}`);
      }
    }
    
    console.log(`Message broadcast complete. Sent to ${successCount} clients out of ${subscribers.size} subscribers`);
  }

  // Send message to specific user
  sendToUser(userId, eventName, data) {
    const userClients = this.clients.get(userId);
    if (userClients) {
      userClients.forEach(socket => {
        if (socket.connected) {
          socket.emit(eventName, data);
        }
      });
    }
  }

  // Send message to all connected clients
  broadcast(eventName, data) {
    this.io.emit(eventName, data);
  }

  // Get connection statistics
  getStats() {
    return {
      totalConnections: this.connectionCount,
      totalUsers: this.clients.size,
      totalCommunitySubscriptions: this.communitySubscriptions.size,
      maxConnections: this.maxConnections,
      connectionUtilization: (this.connectionCount / this.maxConnections * 100).toFixed(2) + '%',
      communities: Array.from(this.communitySubscriptions.entries()).map(([communityId, subscribers]) => ({
        communityId,
        subscriberCount: subscribers.size
      }))
    };
  }

  // Add health check method
  getHealthStatus() {
    const stats = this.getStats();
    return {
      status: this.connectionCount < this.maxConnections * 0.9 ? 'healthy' : 'warning',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      ...stats
    };
  }
}

// Create singleton instance
const webSocketService = new WebSocketService();

module.exports = webSocketService;