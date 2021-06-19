"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fetch_1 = __importDefault(require("node-fetch"));
const lodash_1 = require("lodash");
const node_telegram_bot_api_1 = __importDefault(require("node-telegram-bot-api"));
const hb_1 = require("./hb");
const helper_1 = require("./helper");
const actions_1 = require("./actions");
const config_json_1 = __importDefault(require("./config.json"));
const users_json_1 = __importDefault(require("./data/users.json"));
const MAX_LEN = 4096;
const TIME_INTERVAL = 60000 * 3;
const distId = 670; // LKO
const Users = users_json_1.default;
let centers = [];
let t, t_dis;
let runDist;
let usersCache = {};
const skChatId = config_json_1.default.skChatId;
// const token = process.env.APP_MODE === 'prod'? config.botTokenPROD: config.botTokenDev;
const token = config_json_1.default.botTokenPROD;
// Create a bot that uses 'polling' to fetch new updates
const bot = new node_telegram_bot_api_1.default(token, { polling: true });
// For Azure App Server as Live pod line
hb_1.HearBeat();
const cowinLink = `<a href="${config_json_1.default.cowinHomeUrl}"> Book Your Slot @COWIN </a>`;
const cmdList = '/start /help /addpin /search /listpin /live /echo /addage /listage /delage /delpin /getUsers';
const argvCmdList = '/addpin /addage /delpin/ /delage';
const helpText = `<b>Command HELP !</b>\n 
    <b>Check by PinCode</b>
        /search

    <b>Add Pin Codes </b>
        /addpin "pinCode" 
            Eg:- /addpin 245606

    <b>List all added pin codes </b>
        /listpin

    <b>Remove a pin code.</b>
        /delpin "pinCode"
            Eg: /delpin 245606 

    <b>List all added ages. </b>
        /listage       

    <b>Add an age.</b>
        /addage "age"
        Eg: /addage 18
    
    <b>Remove an age.</b>
        /delage "age"
        Eg: /delage 18
    
    <b>Check if Bot is Running.    </b>
        /live

    <b>Echo server.</b>
        /echo "msg" 
        Eh: /echo Hello Spark.        
   `;
const skResp = `   
    /dist - Check by Disctric  
    /getUsers - Get Users List`;
// Controllers
const pinHandler = (msg, match) => __awaiter(void 0, void 0, void 0, function* () {
    let weeks = 1;
    if (lodash_1.isEmpty(msg)) { // activated by time intervals
        Users.forEach((user) => __awaiter(void 0, void 0, void 0, function* () {
            const chatId = user.id;
            let resp = yield actions_1.getSessionsByPinCode(user, weeks);
            if (!lodash_1.isEmpty(resp))
                resp += cowinLink;
            // console.log('resp:',resp);
            let hs = helper_1.getHash(resp);
            let sendMsg = false;
            console.log('Users cache:', usersCache);
            // Checking if msg is same as last time
            if (usersCache[chatId.toString()]) {
                if (usersCache[chatId.toString()] !== hs) { // Msg is different
                    //send msg
                    sendMsg = true;
                    console.log('Found diff msg:', chatId);
                }
                else {
                    //Not send Msg
                    sendMsg = false;
                    console.log('Found same msg:', chatId);
                }
            }
            else { // User Cache do not have any entry
                console.log('User Cash not found:', chatId);
                usersCache[chatId.toString()] = hs;
                sendMsg = true;
            }
            if (sendMsg === true) {
                if (!lodash_1.isEmpty(resp)) {
                    usersCache[chatId.toString()] = hs;
                    bot.sendMessage(chatId, resp, { parse_mode: "HTML" });
                }
            }
        }));
        clearInterval(t);
        t = setInterval(pinHandler, TIME_INTERVAL);
    }
    else { // Activated by user by command /pin
        let user = lodash_1.find(Users, { id: msg === null || msg === void 0 ? void 0 : msg.chat.id });
        let chatId = msg === null || msg === void 0 ? void 0 : msg.chat.id;
        if (user && !lodash_1.isEmpty(user.pincodes) && chatId && !lodash_1.isEmpty(user)) {
            console.log('User:', user === null || user === void 0 ? void 0 : user.id, ' init a pin search.');
            let resp = yield actions_1.getSessionsByPinCode(user, weeks);
            // console.log(`resp: ${resp}`);
            if (!lodash_1.isEmpty(resp))
                resp += cowinLink;
            // console.log('resp:',resp);
            if (lodash_1.isEmpty(resp))
                bot.sendMessage(chatId, 'No Session Found !!!');
            else {
                let hs = helper_1.getHash(resp);
                usersCache[chatId.toString()] = hs;
                bot.sendMessage(chatId, resp, { parse_mode: "HTML" });
            }
        }
        else {
            if (chatId)
                bot.sendMessage(chatId, 'Please Add a Pincode First \n Type /help for getting help.');
        }
    }
});
bot.onText(/\/start$/, (msg, match) => {
    const chatId = msg.chat.id;
    const resp = `
        <b> Welcome! </b>
        You have reached Vaccination Bot.
        You can add your pin code which u want to monitor for vaccine.
        And we will send u a notification as soon as we found any 
        vaccine slot available.
        We Suggest you add at least 2-3 pin code. 
        You can also add ages for which u want to monitor vaccine.
        Currenty allowed ages are:
            For 18-44 enter 18.
            For 45+ enter 45.            
    \n<b> Get Commands List </b>
    Use /help command to get list of all available commands.   
    \n<b> **Coming Soon** </b>
        /feedback To send us ur feedback 
    `;
    bot.sendMessage(chatId, resp, { parse_mode: "HTML" });
});
// Help Command
bot.onText(/\/help$/, (msg, match) => {
    const chatId = msg.chat.id;
    const resp = chatId === config_json_1.default.skChatId ? helpText + skResp : helpText;
    console.log('resp', resp);
    bot.sendMessage(chatId, resp, { parse_mode: "HTML" });
});
// Matches "/echo [whatever]"
bot.onText(/\/echo (.+)/, (msg, match) => {
    // 'msg' is the received Message from Telegram
    // 'match' is the result of executing the regexp above on the text content
    // of the message
    console.log('match:', match);
    const chatId = msg.chat.id;
    const resp = match && !lodash_1.isEmpty(match[1]) ? match[1] : '/echo "msg" echo server'; // the captured "whatever"
    // send back the matched "whatever" to the chat
    bot.sendMessage(chatId, resp);
});
// /pin Search on the bases of Pincode
bot.onText(/\/search$/, pinHandler);
// add pincode to user
bot.onText(/\/addpin (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const pin = match ? match[1] : '';
    if (!helper_1.isValidPinCode(pin)) {
        bot.sendMessage(chatId, `<b style="color:red">Please enter a valid pin !!!</b>`, { parse_mode: "HTML" });
    }
    else {
        let rst = helper_1.addPin(chatId, parseInt(pin));
        if (rst.error === true)
            bot.sendMessage(chatId, rst.msg);
        if (rst.error === false)
            bot.sendMessage(chatId, 'Pin added to list.\n Try /listpin');
    }
});
//list Pin Code
bot.onText(/\/listpin$/, (msg, match) => {
    const chatId = msg.chat.id;
    let usr = lodash_1.find(Users, { id: chatId });
    if (!lodash_1.isEmpty(usr)) {
        let resp = '';
        usr === null || usr === void 0 ? void 0 : usr.pincodes.forEach(p => { resp += `${p}\n`; });
        if (lodash_1.isEmpty(resp)) {
            resp = 'No Pin Codes Found.';
        }
        bot.sendMessage(chatId, resp);
    }
    else {
        bot.sendMessage(chatId, 'No Pin Codes Found.');
    }
});
// Matches "/dist"
bot.onText(/\/dist$/, runDist = (msg, match) => __awaiter(void 0, void 0, void 0, function* () {
    if (msg && (msg.chat.id !== skChatId))
        return;
    let resp = []; // the captured "whatever"
    let msgs = [];
    resp = yield getSessionsByDisCode();
    if (lodash_1.isEmpty(resp)) {
        bot.sendMessage(skChatId, 'No Session Found By Dist !!!');
    }
    else {
        let msg = '';
        for (let i = 0; i < resp.length; ++i) {
            if (Buffer.from(msg + resp[i]).length < MAX_LEN) {
                msg += resp[i];
            }
            else {
                msgs.push(msg);
                msg = '';
            }
        }
        msgs.forEach(msg => {
            bot.sendMessage(skChatId, msg, { parse_mode: "HTML" });
        });
    }
    // clearInterval(t_dis);
    // t_dis = setInterval(runDist, TIME_INTERVAL);
}));
bot.onText(/\/live$/, (msg, match) => {
    const chatId = msg.chat.id;
    let resp = 'Bot is Running...';
    bot.sendMessage(chatId, resp);
});
//list Age Code
bot.onText(/\/listage$/, (msg, match) => {
    const chatId = msg.chat.id;
    let usr = lodash_1.find(Users, { id: chatId });
    if (!lodash_1.isEmpty(usr)) {
        let resp = 'Age List: ';
        usr === null || usr === void 0 ? void 0 : usr.age.forEach(p => { resp += `${p}, `; });
        if (lodash_1.isEmpty(resp))
            resp = 'No Age Found';
        bot.sendMessage(chatId, resp);
    }
    else {
        bot.sendMessage(chatId, 'No Age Found.');
    }
});
//Add age
bot.onText(/\/addage (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    console.log('Match:', match);
    let resp = 'Default';
    if (match) {
        let age = parseInt(match[1]);
        if (age && config_json_1.default.validAges.includes(age)) {
            resp = `Age: ${age}`;
            let user = helper_1.getUser(chatId);
            if (user && user.age.includes(age)) {
                resp = `Age "${age}" already in list.`;
            }
            else if (user) {
                let rst = helper_1.addAge(user, age);
                resp = rst ? 'Updated age list\n Try /listage ' : 'Error while adding age.';
            }
        }
        else {
            resp = `Valid ages are ${config_json_1.default.validAges} .`;
        }
    }
    bot.sendMessage(chatId, resp);
});
//del age
bot.onText(/\/delage (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    console.log('Match:', match);
    let resp = 'Default';
    if (match) {
        let age = parseInt(match[1]);
        if (age) {
            resp = `Age: ${age}`;
            let user = helper_1.getUser(chatId);
            if (user && !user.age.includes(age)) {
                resp = `Age "${age}" NOT in list.`;
            }
            else if (user) {
                let rst = helper_1.removeAge(user, age);
                resp = rst ? 'Updated age list\n Try /listage ' : 'Error while adding age.';
            }
        }
        else {
            resp = `Valid ages are ${config_json_1.default.validAges} .`;
        }
    }
    bot.sendMessage(chatId, resp);
});
//del pin
bot.onText(/\/delpin (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    console.log('Match:', match);
    let resp = 'Default';
    if (match) {
        let pin = parseInt(match[1]);
        if (pin) {
            resp = `Pin: ${pin}`;
            let user = helper_1.getUser(chatId);
            if (user && !user.pincodes.includes(pin)) {
                resp = `Pin Code "${pin}" NOT in list.`;
            }
            else if (user) {
                let rst = helper_1.removePin(user, pin);
                resp = rst ? 'Updated Pin Code list\n Try /listpin ' : 'Error while adding Pin.';
            }
        }
        else {
            resp = `Invalid Pin ${match[1]}.`;
        }
    }
    bot.sendMessage(chatId, resp);
});
//get Users data
bot.onText(/\/getUsers$/, (msg) => {
    const chatId = msg.chat.id;
    if (chatId !== config_json_1.default.skChatId)
        return;
    bot.sendMessage(chatId, JSON.stringify(Users));
});
// Listen for any kind of message. There are different kinds of messages.
bot.on('message', (msg, match) => {
    const chatId = msg.chat.id;
    console.log('Default:', match, '\n', msg);
    if (!helper_1.isValidCmd(msg, cmdList)) {
        bot.sendMessage(chatId, 'Wrong Command !!!\n Try /help');
    }
    else if (!helper_1.isValidArgvCmd(msg, argvCmdList)) {
        const cmd = helper_1.getCmd(msg);
        switch (cmd) {
            case '/delpin':
                bot.sendMessage(chatId, `
                    <b>!!! Command Error !!!</b>\
                    \n/delpin command need an argument.\
                    \n    <b>Syntex:</b> /delpin PIN_CODE\
                    \n    <b>Eg:</b> /delpin 602350\
                    `, { parse_mode: "HTML" });
                break;
            case '/delage':
                bot.sendMessage(chatId, `
                    <b>!!! Command Error !!!</b>\
                    \n/delage command need an argument.\
                    \n    <b>Syntex:</b> /delage AGE\
                    \n    <b>Eg:</b> /delage 45\
                    `, { parse_mode: "HTML" });
                break;
            case '/addpin':
                bot.sendMessage(chatId, `
                    <b>!!! Command Error !!!</b>\
                    \n/addpin command need an argument.\
                    \n    <b>Syntex:</b> /addpin PIN_CODE\
                    \n    <b>Eg:</b> /addpin 602201\
                    `, { parse_mode: "HTML" });
                break;
            case '/addage':
                bot.sendMessage(chatId, `
                    <b>!!! Command Error !!!</b>\
                    \n/addage command need an argument.\
                    \n    <b>Syntex:</b> /addage AGE\
                    \n    <b>Eg:</b> /addage 18\
                    `, { parse_mode: "HTML" });
                break;
        }
    }
});
const getSessionsByDisCode = () => __awaiter(void 0, void 0, void 0, function* () {
    // find by distric code
    // const url = 'https://cdn-api.co-vin.in/api/v2/appointment/sessions/public/calendarByDistrict?district_id=670&date=11-05-2021';
    const baseUrl = 'https://cdn-api.co-vin.in/api/v2/appointment/sessions/public/calendarByDistrict?';
    let date = helper_1.getDate();
    let days = 14;
    let msgs = '';
    centers = [];
    for (let i = 0; i < days; ++i) {
        console.log('date:', helper_1.getDate(i));
        date = helper_1.getDate(i);
        let options = {
            method: "GET",
            headers: {
                "Content-type": "application/json;charset=UTF-8",
                "User-Agent": "PostmanRuntime/7.28.0"
            }
        };
        const url = baseUrl + 'district_id=' + distId + '&date=' + date;
        console.log('url:', url);
        console.log(`Fetch -> distId: ${distId} date: ${date} `);
        yield node_fetch_1.default(url, options)
            .then(rsp => {
            try {
                return rsp.json();
            }
            catch (err) {
                console.error(`Error: ${err}`);
            }
        })
            .then(data => {
            // console.log(data); 
            data.centers.forEach((c) => { centers.push(c); });
        })
            .catch(err => { console.error(`Error: ${err}`); });
    }
    let msg = [];
    centers.forEach(c => {
        if (c) {
            let sk = lodash_1.find(Users, { id: config_json_1.default.skChatId });
            let m = helper_1.formateDistMsg(c, sk ? sk.age : [18, 45]);
            if (!lodash_1.isEmpty(m))
                msg.push(m);
        }
    });
    if (!lodash_1.isEmpty(msg)) {
        msgs = '';
        msg.forEach(m => {
            if (!lodash_1.isEmpty(m))
                msgs = msgs + '\n\n' + m;
        });
        console.log('msg:', msgs);
        console.log('byte size', Buffer.from(msgs).length);
    }
    return msg;
});
const main = () => __awaiter(void 0, void 0, void 0, function* () {
    helper_1.sendNotofication(token, skChatId, 'Server Started !!!');
    pinHandler();
    // runDist();
});
main();
