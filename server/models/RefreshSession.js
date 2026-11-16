const mongoose = require('mongoose');

const refreshSessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  refreshTokenHash: {
    type: String,
    required: true,
    index: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastUsedAt: {
    type: Date,
    default: Date.now
  },
  revokedAt: {
    type: Date,
    default: null
  },
  deviceInformation: {
    type: String,
    default: ''
  }
});

// Automatically clean up expired sessions using MongoDB TTL index
refreshSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('RefreshSession', refreshSessionSchema);
