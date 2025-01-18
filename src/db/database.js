import mongoose from 'mongoose';
import Logger from '../services/Logger.js';
import config from '../config/config.json' assert { type: 'json' };
import User from '../db/models/user.js';

// Connect to MongoDB
export const connectToDatabase = async () => {
    try {
        await mongoose.connect(config.dataURL, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        Logger.info('[Database] Database is successfully connected.');
    } catch (error) {
        Logger.error('[Database] Connection error:', error);
    }
};

// Check if a user exists and retrieve their data
export const checkUser = async (userId) => {
    try {
        const user = await User.findOne({ userId });
        if (!user) {
            Logger.warn(`[Database] User with ID ${userId} not found.`);
            return null;
        }
        return user;
    } catch (error) {
        Logger.error(`[Database] Error fetching user with ID ${userId}:`, error);
        return null;
    }
};

// Update a user's subscription status (isSubscribed)
export const updateUserSubscription = async (userId, isSubscribed) => {
    try {
        const user = await User.findOneAndUpdate(
            { userId },
            { isSubscribed },
            { new: true } // Returns the updated user
        );

        if (user) {
            Logger.info(`[Database] User ${userId} subscription status updated to: ${isSubscribed}`);
            return user;
        } else {
            Logger.warn(`[Database] User with ID ${userId} not found to update subscription.`);
            return null;
        }
    } catch (error) {
        Logger.error(`[Database] Error updating subscription status for user ${userId}:`, error);
        return null;
    }
};

// Save session (you can expand this method to save the session data if necessary)
export const saveSession = async (params) => {
    // Your logic to save session data
};

// Load session (your current method to load session from DB)
export const loadSession = async (params) => {
    // Your logic to load session data
};

export default {
    connectToDatabase,
    checkUser,
    updateUserSubscription,
    saveSession,
    loadSession
};
