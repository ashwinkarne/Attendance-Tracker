const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: [true, 'Full Name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
  },
  rollNumber: {
    type: String,
    required: [true, 'Roll Number is required'],
    unique: true,
    trim: true
  },
  dateOfBirth: {
    type: String, // Stored as YYYY-MM-DD
    required: [true, 'Date of Birth is required']
  },
  password: {
    type: String,
    required: [true, 'Password is required']
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', userSchema);
