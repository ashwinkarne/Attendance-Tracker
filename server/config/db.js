const mongoose = require('mongoose');

let isConnected = false;

const connectDB = async () => {
  if (isConnected) {
    return;
  }

  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.warn('⚠️  MONGODB_URI is not defined in server/.env.');
    console.warn('Please add your MongoDB Atlas connection string to server/.env:');
    console.warn('MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/semester_attendance?retryWrites=true&w=majority');
    return;
  }

  try {
    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000
    });
    isConnected = true;
    console.log('MongoDB Atlas Connected Successfully.');
  } catch (err) {
    console.error('Failed to connect to MongoDB Atlas:', err.message);
    if (process.env.NODE_ENV === 'production') {
      throw err;
    }
  }
};

const disconnectDB = async () => {
  if (isConnected) {
    await mongoose.disconnect();
    isConnected = false;
  }
};

module.exports = { connectDB, disconnectDB };
