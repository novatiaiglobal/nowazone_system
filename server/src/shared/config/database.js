const mongoose = require('mongoose');
const ChatbotFaq = require('../../modules/chatbot/models/ChatbotFaq');
const ChatbotConfig = require('../../modules/chatbot/models/ChatbotConfig');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // Ensure indexes are in sync with the current schema definitions.
    // This will drop the old text index that incorrectly included `tags`
    // and recreate it using only scalar string fields.
    ChatbotFaq.syncIndexes().catch((err) => {
      console.error('Failed to sync ChatbotFaq indexes:', err.message);
    });

    // Ensure chatbot config has optimal defaults for AI mode
    ChatbotConfig.updateOne(
      {},
      { $set: { minConfidence: 0.3, temperature: 0.5 } }
    ).catch((err) => {
      console.error('Failed to patch ChatbotConfig:', err.message);
    });

    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected. Attempting to reconnect...');
    });

  } catch (error) {
    console.error('Database connection failed:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
