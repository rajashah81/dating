import User from '../db/models/user.js';
import Like from '../db/models/like.js';
import SessionModel from '../db/models/session.js';

export default class DatabaseHelper {
    constructor() {
        throw new ReferenceError(`Class ${this.constructor.name} cannot be initialized!`);
    }

    static async saveSession({ key, data }) {
        return await SessionModel.findOneAndUpdate({ key }, { data }, { upsert: true });
    }

    static async loadSession({ key }) {
        return (await SessionModel.findOne({ key }))?.data || {};
    }

    static async checkUser({ chatId }) {
        return await User.findOne({ chatId }).exec();
    }

    static async newLike({ userId, memberId }) {
        return await new Like({ userId, memberId, status: true }).save();
    }

    static async newLikeMessage({ userId, memberId, message }) {
        return await new Like({ userId, memberId, status: true, message }).save();
    }

    static async checkLikes({ memberId }) {
        return await Like.findOne({ memberId, status: true }).exec();
    }

    static async pushHistory({ ctx, memberId }) {
        return ctx.session.history.push(memberId);
    }

    /**
     * Mark a user as inactive, typically if they block the bot.
     * This will prevent further messages being sent to this user.
     * @param {string} userId - The Telegram user ID (chatId).
     * @returns {Promise} - The result of the update operation.
     */
    static async markUserInactive(userId) {
        return await User.findOneAndUpdate({ chatId: userId }, { isActive: false });
    }

    /**
     * Checks if the user is active (has not blocked the bot or is not inactive).
     * @param {string} userId - The Telegram user ID (chatId).
     * @returns {Promise} - The result of the user check.
     */
    static async isUserActive(userId) {
        const user = await User.findOne({ chatId: userId }).exec();
        return user ? user.isActive !== false : false;
    }

    // New method to check if a user is subscribed
    static async isUserSubscribed({ chatId }) {
        const user = await User.findOne({ chatId }).exec();
        return user ? user.isSubscribed : false;
    }

    // New method to update the subscription status of a user
    static async updateSubscriptionStatus({ chatId, isSubscribed }) {
        return await User.findOneAndUpdate({ chatId }, { isSubscribed }, { new: true });
    }
}
