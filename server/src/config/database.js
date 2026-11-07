import mongoose from 'mongoose';

/**
 * Establishes connection to MongoDB database.
 * Listens for connection events and manages graceful disconnection.
 */
export const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/cloudlabs_dashboard';

  try {
    const conn = await mongoose.connect(uri);

    console.log(`[Database] MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);

    mongoose.connection.on('error', (err) => {
      console.error(`[Database] MongoDB runtime error: ${err.message}`);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('[Database] MongoDB disconnected');
    });

    return conn;
  } catch (error) {
    console.error(`[Database] MongoDB connection error: ${error.message}`);
    // In development or when MongoDB isn't running yet, we report the error clearly.
    throw error;
  }
};

export const disconnectDB = async () => {
  try {
    await mongoose.connection.close();
    console.log('[Database] MongoDB connection closed gracefully');
  } catch (error) {
    console.error(`[Database] Error closing MongoDB connection: ${error.message}`);
  }
};
