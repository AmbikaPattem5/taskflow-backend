import mongoose from 'mongoose';
import { config } from './env';

export const connectDatabase = async (): Promise<void> => {
  try {
    const conn = await mongoose.connect(config.mongoUri);
    console.log(`[Database] MongoDB Atlas Connected: ${conn.connection.host} (Database: ${conn.connection.name})`);
  } catch (error) {
    console.error('[Database] MongoDB Atlas connection error:', error);
    process.exit(1);
  }
};
