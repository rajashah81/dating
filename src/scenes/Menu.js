import { Scenes, Markup } from 'telegraf';
import DatabaseHelper from '../helpers/DatabaseHelper.js';
import { SCENES_TEXT, BUTTON_TEXT } from '../utils/constants.js';
import { menuButton, profileButton, hideButton, returnMenuButton, viewProfileButton, likeButton, waitButton, subscribeButton } from '../utils/buttons.js';
import TelegramService from '../services/TelegramService.js';

export default class Menu {
    static Main() {
        const main = new Scenes.BaseScene('main');

        main.enter(async (ctx) => {
            await ctx.reply(SCENES_TEXT.main_enter, {
                ...Markup.keyboard([
                    [BUTTON_TEXT.view_profiles],
                    [BUTTON_TEXT.my_profile],
                    [BUTTON_TEXT.likes],
                    [BUTTON_TEXT.hide_profile],
                ]).resize(),
            });
        });

        main.on('text', async (ctx) => {
            switch (ctx.message.text) {
                case BUTTON_TEXT.view_profiles:
                    await ctx.scene.enter('view');
                    break;
                case BUTTON_TEXT.my_profile:
                    await ctx.scene.enter('profile');
                    break;
                case BUTTON_TEXT.likes:
                    await ctx.scene.enter('likes');
                    break;
                case BUTTON_TEXT.hide_profile:
                    await ctx.scene.enter('hide');
                    break;
                default:
                    await ctx.reply(SCENES_TEXT.register_wrong_asnwer);
                    break;
            }
        });

        return main;
    }

        // Subscription Scene: Add a payment option for subscription
    static Subscription() {
        const subscription = new Scenes.BaseScene('subscription');

        subscription.enter(async (ctx) => {
            // Send the payment invoice to the user
            await ctx.replyWithInvoice({
                title: 'Premium Subscription',
                description: 'Unlock the ability to chat with others.',
                payload: `subscribe_${ctx.from.id}`,  // Use user ID as the payload
                provider_token: process.env.PROVIDER_TOKEN,  // Set your Telegram payment provider token
                currency: 'USD',
                prices: [{ label: 'Premium Access', amount: 499 * 100 }],  // $4.99 (converted to cents)
                start_parameter: 'subscribe',
            });
        });

        // Handle successful payment
        subscription.on('successful_payment', async (ctx) => {
            // Once payment is successful, update user's subscription status in DB
            await DatabaseHelper.updateUser(ctx.from.id, { isSubscribed: true });

            await ctx.reply('Thank you for subscribing! You can now send direct messages to other users.');
            await ctx.scene.enter('main');  // Return to main menu after payment
        });

        return subscription;
    }

    static View() {
        const view = new Scenes.BaseScene('view');

        view.enter(async (ctx) => {
            const telegram = new TelegramService(ctx);
            const isPrivate = await telegram._getPrivateForwardsType(ctx);

            if (isPrivate) {
                await ctx.reply(SCENES_TEXT.private_forwards);
                return await ctx.scene.enter('main');
            }

            const { age, wantedGender, history } = ctx.session;

            const result = await telegram._findProfile(age, wantedGender, history);

            if (result) {
                const { chatId, name, age, city, description, photo } = result;
                ctx.session.memberId = chatId;

                await ctx.replyWithPhoto(
                    { url: photo },
                    {
                        caption: `${name}, ${age}, ${city} ${description === 'Skip' ? '' : ' - ' + description}`,
                        ...Markup.inlineKeyboard([
                            [Markup.button.callback(BUTTON_TEXT.view_like, 'like')],
                            [Markup.button.callback(BUTTON_TEXT.return_menu, 'return_menu')],
                        ]),
                    }
                );
            } else {
                await ctx.reply(SCENES_TEXT.view_error);
                return ctx.scene.enter('main');
            }
        });

        view.action('like', async (ctx) => {
            const userId = ctx.chat.id;
            const memberId = ctx.session.memberId;

            if (!userId || !memberId) {
                await ctx.reply('User ID or Member ID is missing.');
                return ctx.scene.enter('main');
            }

            try {
                await DatabaseHelper.newLike({ userId, memberId });
                await ctx.telegram.sendMessage(memberId, SCENES_TEXT.view_like);
                await DatabaseHelper.pushHistory({ ctx, memberId });
                await ctx.scene.reenter();
            } catch (error) {
                await ctx.reply('An error occurred while liking the profile. Please try again.');
                console.error(error);
            }
        });

        view.action('return_menu', async (ctx) => {
            await ctx.scene.enter('main');
        });

        return view;
    }
    

static ViewMessage() {
    const view_message = new Scenes.BaseScene('viewmessage');

    view_message.enter(async (ctx) => {
        await ctx.reply(SCENES_TEXT.view_message_enter);
    });

view_message.on('text', async (ctx) => {
    try {
        const messageText = ctx.message.text;
        
        // Ensure that userId and memberId are set properly before saving the like
        const userId = ctx.chat.id;  // This is the user who liked
        const memberId = ctx.session.memberId;  // This is the member whose profile is liked

        if (!memberId) {
            await ctx.reply("Error: Member ID is missing.");
            return;
        }

        // Save the like message with userId, memberId, and message text
        await DatabaseHelper.newLikeMessage({
            userId,
            memberId,
            message: messageText
        });

        // Notify the user about the like
        await ctx.telegram.sendMessage(memberId, SCENES_TEXT.view_like);

        // Continue with history and scene transition
        await DatabaseHelper.pushHistory({ ctx, memberId });
        await ctx.scene.enter('view');
    } catch (error) {
        console.error("Error saving like message:", error);
        await ctx.reply("An error occurred while processing your like message.");
    }
});


    view_message.on('message', async (ctx) => {
        return await ctx.reply(SCENES_TEXT.view_message_error);
    });

    return view_message;
}


    static Profile() {
        const profile = new Scenes.BaseScene('profile');

        profile.enter(async (ctx) => {
            await ctx.reply(SCENES_TEXT.register_approve_enter, {
                ...profileButton
            });

            const { name, age, city, description, photo } = ctx.session;

            await ctx.replyWithPhoto({ url: photo }, { caption: `${name}, ${age}, ${city} ${description === 'Skip' ? '' : ' - ' + description}` });
            return await ctx.reply(SCENES_TEXT.profile_enter);
        });

        profile.on('text', async (ctx) => {
            switch (ctx.message.text) {
                case BUTTON_TEXT.change_profile:
                    await ctx.scene.enter('name');
                    break;
                case BUTTON_TEXT.change_photo_profile:
                    await ctx.scene.enter('newphoto');
                    break;
                case BUTTON_TEXT.change_text_profile:
                    await ctx.scene.enter('newdescription');
                    break;
                case BUTTON_TEXT.return_menu:
                    await ctx.scene.enter('main');
                    break;
                default:
                    await ctx.reply(SCENES_TEXT.register_wrong_asnwer);
                    break;
            }
        });

        return profile;
    }

    static Likes() {
        const likes = new Scenes.BaseScene('likes');

        likes.enter(async (ctx) => {
            const telegram = new TelegramService(ctx);
            const isPrivate = await telegram._getPrivateForwardsType(ctx);

            if (isPrivate) {
                await ctx.reply(SCENES_TEXT.private_forwards);
                return await ctx.scene.enter('main');
            }

            const result = await DatabaseHelper.checkLikes({ memberId: ctx.chat.id });

            if (result) {
                const { userId, message } = result;
                const data = await DatabaseHelper.checkUser({ chatId: userId });
                const { name, age, city, description, photo } = data;

                if (message) {
                    await ctx.replyWithPhoto({ url: photo }, { caption: `${SCENES_TEXT.likes_enter}\n\n${name}, ${age}, ${city} ${description === 'Skip' ? '' : ' - ' + description}\n\n${SCENES_TEXT.likes_message_for_you} ${message}`, ...likeButton });
                } else {
                    await ctx.replyWithPhoto({ url: photo }, { caption: `${SCENES_TEXT.likes_enter}\n\n${name}, ${age}, ${city} ${description === 'Skip' ? '' : ' - ' + description}`, ...likeButton });
                }
            } else {
                await ctx.reply(SCENES_TEXT.likes_error);
                return await ctx.scene.enter('main');
            }
        });

likes.on('text', async (ctx) => {
    const data = await DatabaseHelper.checkLikes({ memberId: ctx.chat.id });
    const { userId, memberId } = data;

    try {
        const telegram = new TelegramService(ctx);
        const name = await telegram._getMemberUsername(ctx, userId);

        const linkMember = `<a href="tg://user?id=${memberId}">${ctx.message.from.first_name}</a>`;
        const linkUser = `<a href="tg://user?id=${userId}">${name}</a>`;

        if (ctx.message.text === BUTTON_TEXT.view_like) {
            try {
                await ctx.telegram.sendMessage(userId, SCENES_TEXT.likes_message + linkMember, { parse_mode: 'HTML' });
                await ctx.reply(SCENES_TEXT.likes_message_user + linkUser, { parse_mode: 'HTML' });
            } catch (error) {
                if (error.response?.error_code === 400) {
                    console.error(`Failed to send message to chat ID: ${userId}. ${error.response.description}`);
                    await DatabaseHelper.markUserInactive(userId);
                }
            }

            data.status = false;
            await data.save();
            return await ctx.scene.enter('likes');
        } else {
            data.status = false;
            await data.save();
            return await ctx.scene.enter('likes');
        }
    } catch (err) {
        console.error('Unexpected error in Likes scene:', err);
    }
});

        return likes;
    }

    static ChangePhoto() {
        const photo = new Scenes.BaseScene('newphoto');

        photo.enter(async (ctx) => {
            await ctx.reply(SCENES_TEXT.register_enter_photo, {
                ...returnMenuButton
            });
        });

        photo.on('photo', async (ctx) => {
            const photo = ctx.message.photo.pop();
            const fileId = photo.file_id;
            const fileUrl = await ctx.telegram.getFileLink(fileId);

            ctx.session.photo = fileUrl.href;
            await ctx.reply(SCENES_TEXT.update_photo);
            await ctx.scene.enter('main');
        });

        photo.on('message', async (ctx) => {
            switch (ctx.message.text) {
                case BUTTON_TEXT.return_menu:
                    await ctx.scene.enter('main');
                    break;
                default:
                    await ctx.reply(SCENES_TEXT.update_photo_error);
                    break;
            }
        });

        return photo;
    }

    static ChangeDescription() {
        const description = new Scenes.BaseScene('newdescription');

        description.enter(async (ctx) => {
            await ctx.reply(SCENES_TEXT.register_enter_description, {
                ...returnMenuButton
            }
        );
        });

        description.on('text', async (ctx) => {
            const currentDescription = ctx.message.text;

            if (currentDescription && currentDescription != BUTTON_TEXT.return_menu) {
                ctx.session.description = currentDescription;
                await ctx.reply(SCENES_TEXT.update_description);
                await ctx.scene.enter('main');
            } else if (currentDescription === BUTTON_TEXT.return_menu) await ctx.scene.enter('main');
        });

        description.on('message', async (ctx) => {
            return await ctx.reply(SCENES_TEXT.update_description_error);
        });

        return description;
    }

    static Hide() {
        const hide = new Scenes.BaseScene('hide');

        hide.enter((ctx) => {
            ctx.reply(SCENES_TEXT.hide_enter, {
                ...hideButton
            });
        });

        hide.on('text', async (ctx) => {
            switch (ctx.message.text) {
                case BUTTON_TEXT.yes:
                    const data = await DatabaseHelper.checkUser({ chatId: ctx.from.id });

                    await ctx.reply(SCENES_TEXT.hide_yes, {
                        ...waitButton
                    });

                    data.status = false;
                    data.save();

                    await ctx.scene.enter('wait');
                    break;
                case BUTTON_TEXT.no:
                    await ctx.scene.enter('main');
                    break;
                default:
                    await ctx.reply(SCENES_TEXT.register_wrong_asnwer);
                    break;
            }
        });

        return hide;
    }

    static Wait() {
        const wait = new Scenes.BaseScene('wait');

        wait.on('text', async (ctx) => {
            switch (ctx.message.text) {
                case BUTTON_TEXT.view_profiles:
                    const data = await DatabaseHelper.checkUser({ chatId: ctx.from.id });

                    await ctx.scene.enter('main');
                    data.status = true;
                    await data.save();
                    break;
                default:
                    await ctx.reply(SCENES_TEXT.register_wrong_asnwer);
                    break;
            }
        });

        return wait;
    }
} 
