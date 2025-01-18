import { Scenes, Telegraf } from 'telegraf';
import mongoose from 'mongoose';
import { session } from 'telegraf-session-mongodb';
import config from './config/config.json' assert { type: 'json' };
import DatabaseHelper from '../src/helpers/DatabaseHelper.js';
import Register from './scenes/Register.js';
import Start from './scenes/Start.js';
import Menu from './scenes/Menu.js';
import { start } from './controllers/commands.js';
import { BUTTON_TEXT } from './utils/constants.js'; // Import the BUTTON_TEXT constants

const curScene = Register;
const startCurScene = Start;
const menuCurScene = Menu;

const {
    GetName: nameScene,
    GetAge: ageScene,
    GetGender: genderScene,
    GetWantedGender: wantedGenderScene,
    GetCity: cityScene,
    GetDescription: descriptionScene,
    GetPhoto: photoScene,
    ApproveRegister: approveScene
} = curScene;

const { FirstStep: firstScene } = startCurScene;

const { 
    Main: main, 
    View: view, 
    ViewMessage: view_message, 
    Profile: profile, 
    Likes: likes, 
    Hide: hide, 
    Wait: wait, 
    ChangePhoto: updatePhoto, 
    ChangeDescription: updateDescription,
    Subscription: subscriptionScene  // Add the subscription scene
} = menuCurScene;

const bot = new Telegraf(config.token);

// Add the subscription scene to the stages
const stage = new Scenes.Stage([
    nameScene(),
    ageScene(),
    genderScene(),
    wantedGenderScene(),
    cityScene(),
    descriptionScene(),
    photoScene(),
    approveScene(),
    firstScene(),
    main(),
    view(),
    view_message(),
    profile(),
    likes(),
    updatePhoto(),
    updateDescription(),
    hide(),
    wait(),
    subscriptionScene() // Add the subscription scene to the stages
]);

// Set up the bot with session management and payment handling
const setupBot = async () => {
    bot.use(session(mongoose.connection, { collectionName: 'sessions' }));
    bot.use(stage.middleware());

    bot.use(async (ctx, next) => {
        const sessionId = ctx.from.id.toString();
        ctx.session = await DatabaseHelper.loadSession({ key: sessionId });
        await next();
        await DatabaseHelper.saveSession({ key: sessionId, data: ctx.session });
    });

    // Start the bot and register the /start command
    bot.start(start);

    return bot;
};

export { setupBot };

// --- Menu and Subscription Scene Integration ---
const menuButton = Markup.keyboard([
    [BUTTON_TEXT.view_profiles, BUTTON_TEXT.my_profile, BUTTON_TEXT.likes, BUTTON_TEXT.hide_profile],
    [BUTTON_TEXT.subscribe] // Add the subscribe button to the menu
]).resize();

Menu.Main = () => 
    new Scenes.BaseScene('main')
        .enter(async (ctx) => {
            await ctx.reply('Welcome to the menu. Choose an option:', menuButton);
        })
        .on('text', async (ctx) => {
            const text = ctx.message.text;
            if (text === BUTTON_TEXT.subscribe) {
                await ctx.scene.enter('subscription'); // Enter the subscription scene
            } else {
                await ctx.reply('Select a valid option.');
            }
        });

// Subscription Scene
Menu.Subscription = () =>
    new Scenes.BaseScene('subscription')
        .enter(async (ctx) => {
            await ctx.replyWithInvoice({
                title: 'Premium Subscription',
                description: 'Unlock the ability to chat with others.',
                payload: `subscribe_${ctx.from.id}`,
                provider_token: process.env.PROVIDER_TOKEN, // Set your Telegram payment provider token
                currency: 'USD',
                prices: [{ label: 'Premium Access', amount: 499 * 100 }], // $4.99 (convert to cents)
                start_parameter: 'subscribe',
            });
        })
        .on('successful_payment', async (ctx) => {
            // Once payment is successful, update user's subscription status in DB
            await DatabaseHelper.updateUser(ctx.from.id, { isSubscribed: true });
            await ctx.reply('Thank you for subscribing! You can now message others.');
            await ctx.scene.enter('main'); // Return to main menu after payment
        });
