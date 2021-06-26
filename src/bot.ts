import fetch from 'node-fetch';
import { isEmpty, find } from 'lodash';
import TelegramBot from 'node-telegram-bot-api';
import {Server} from './server';

import { getHash, addAge, addPin, formateDistMsg, getDate, isValidPinCode, removeAge, removePin, 
    sendNotofication, isValidCmd, getCmd, isValidArgvCmd, logCmd, delay} from './helper/helper';
import { getSessionsByPinCode } from './actions';
import config from './config.json';
import  users  from './data/users.json';
import { UserType } from './types/users';
import { exit } from 'process';
import * as DbHelper from './helper/db.helper';

if(!process.env.APP_MODE){
    const rst = require('dotenv').config();    
    console.log(`APP_MODE not found in ENV!\n Loading dotenv...`);
    if(rst.error){
        console.log('Error:',rst.error);
    }
    else{
        console.log('App Mode:',process.env.APP_MODE);
    }
}
else{
    console.log(`APP_MODE found in ENV`);
}

const MAX_LEN = 4096 ;
const TIME_INTERVAL = 60000*3 ;
const distId = 670; // LKO
const Users = (users as UserType[]); 

let centers :any[]= [];
let t:any,t_dis:any;
let runDist:any;

let usersCache:any={};
const skChatId = process.env.skChatId ? parseInt(process.env.skChatId) : undefined ;
const botToken = process.env.BOT_TOKEN || undefined;

// For Azure App Server as Live pod line & to server public folder
Server();

if(!botToken){
    console.log('Bot Token not Found!\n',`botToken:${botToken}`);
    exit(1);// closing application
}

// const token = config.botTokenPROD;
// Create a bot that uses 'polling' to fetch new updates
const bot = botToken ? new TelegramBot(botToken, {polling: true}) : undefined;

if(!bot){
    console.log('bot is undefine.');     
    exit(1);// closing application
}

if(!DbHelper.dbInit()){
    console.log('!!! Error while connecting to DB !!!');
}
else{
    console.log('Successfully Connected to DB.');
}

const cowinLink =  `<a href="${config.cowinHomeUrl}"> Book Your Slot @COWIN </a>`;
//Conatins all valid commands
const cmdList = '/start /help /search /listpin /live /echo /listage /getUsers /listall /addpin /addage /delpin /delage';
//Contains onlt valid argumnet commands
const argvCmdList = '/addpin /addage /delpin /delage';
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
    
    <b>List Age & Pin Codes. </b>
        /listall

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
const pinSearchHandler = async (msg?:TelegramBot.Message, match?:RegExpExecArray | null)=>{
    
    let weeks = 1;   
    let msgs:string[]=[];

    if(isEmpty(msg)){ // activated by time intervals
        let users:UserType[]=[];
        await DbHelper.fetchAllUser().then(data=>{users=data.users});
        users.forEach(async(user)=>{
            const chatId = user.id;            
            let resp= await getSessionsByPinCode(user,weeks);            
            
            let hs = getHash(resp.toString());
            let sendMsg = false;

            console.log('Users cache:',usersCache);
            // Checking if msg is same as last time
            if(usersCache[chatId.toString()]){
                if (usersCache[chatId.toString()] !== hs ){ // Msg is different
                    //send msg
                    sendMsg = true;
                    console.log('Found diff msg:',chatId);
                }
                else{
                    //Not send Msg
                    sendMsg = false;
                    console.log('Found same msg:',chatId);
                }
            }
            else{// User Cache do not have any entry
                console.log('User Cash not found:',chatId);
                usersCache[chatId.toString()] = hs;
                sendMsg = true;
            }

            if(sendMsg === true){                
                if(!isEmpty(resp)){
                    usersCache[chatId.toString()] = hs;
                    let msg='';
                    for(let i=0;i<resp.length; ++i){
                        if(Buffer.from(msg+resp[i]).length < MAX_LEN){
                            msg += resp[i];
                        }
                        else{
                            msgs.push(msg);
                            msg = '';
                        }            
                    }
                    !isEmpty(msg) && msgs.push(msg);

                    // console.log(`msgs`,msgs[msgs.length-1]);
                    if(!isEmpty(msgs))
                        msgs[msgs.length-1]+= cowinLink;

                    msgs.forEach(msg=>{
                        bot.sendMessage(chatId, msg, {parse_mode:"HTML"})
                        .then(data=>{
                            console.log(`Vaccine updates send to ${chatId} successfully. `);
                        })
                        .catch(ex =>{
                            console.log(`Error while sending msg to ${chatId} \n ${ex}`);
                        });
                    });
                }
            }
    
        });
        
        clearInterval(t);
        t = setInterval(pinSearchHandler, TIME_INTERVAL);
    }
    else{// Activated by user command /search
        let chatId = msg?.chat.id;
        let user:UserType|undefined;
        await DbHelper.fetchUser(chatId!).then(data=>{user=data.user});
        if(user && chatId && !isEmpty(user.pincodes) && !isEmpty(user.age) && !isEmpty(user)){
            console.log('User:',user?.id,' init a pin search.');
            let resp= await getSessionsByPinCode(user,weeks);
            // console.log(`resp: ${resp}`);
            
            if(isEmpty(resp))
                bot.sendMessage(chatId, 'No Session Found !!!');
            else{
                let hs = getHash(resp.toString());
                usersCache[chatId.toString()] = hs;
                let msg='';
                for(let i=0;i<resp.length; ++i){
                    if(Buffer.from(msg+resp[i]).length < MAX_LEN){
                        msg += resp[i];
                    }
                    else{
                        msgs.push(msg);
                        msg = '';
                    }            
                }
                !isEmpty(msg) && msgs.push(msg);

                if(!isEmpty(msgs))
                    msgs[msgs.length-1]+= cowinLink;

                msgs.forEach(msg=>{
                    chatId && bot.sendMessage(chatId, msg, {parse_mode:"HTML"})
                    .then(data=>{
                        console.log(`Vaccine updates send to ${chatId} successfully. `);
                    })
                    .catch(ex =>{
                        console.log(`Error while sending msg to ${chatId} \n ${ex}`);
                    });
                    
                })
            }
        }
        else{
            if(chatId){
                if(!user || isEmpty(user?.pincodes))
                    bot.sendMessage(chatId,'Please Add a Pincode First \n Type /help for getting help.');
                else if(isEmpty(user?.age))
                    bot.sendMessage(chatId,'Please Add an Age First \n Type /help for getting help.');
            }
        }
    }
    
}

bot.onText(/\/start$/,(msg,match)=>{
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
    bot.sendMessage(chatId, resp, {parse_mode:"HTML"}) ;
});

// Help Command
bot.onText(/\/help/, (msg, match) => {
    const chatId = msg.chat.id;        
    const resp = chatId === skChatId ? helpText+skResp : helpText;
    // console.log('resp',resp);
    bot.sendMessage(chatId, resp,{parse_mode : "HTML"});
});

// Matches "/echo [whatever]"
bot.onText(/\/echo (.+)/, (msg, match) => {
  console.log('match:',match);
  const chatId = msg.chat.id;
  const resp = match && !isEmpty(match[1])?match[1]:'/echo "msg" echo server'; // the captured "whatever"
  // send back the matched "whatever" to the chat
  bot.sendMessage(chatId, resp);
});

// /pin Search on the bases of Pincode
bot.onText(/\/search/, pinSearchHandler);

// add pincode to user
bot.onText(/\/addpin (.+)/,(msg,match)=>{
    const chatId = msg.chat.id;
    const pin = match?match[1]:'';

    if(!isValidPinCode(pin)){
        bot.sendMessage(chatId,`<b style="color:red">Please enter a valid pin !!!</b>`,{parse_mode:"HTML"});
    }
    else{
        addPin(chatId, parseInt(pin))
        .then((data)=>{
            if(data.error){
                bot.sendMessage(chatId,data.msg);
                console.log(data);
            }
            else{
                bot.sendMessage(chatId,'Pin added to list.\n Try /listpin');
                console.log(data);
            }
        });
    }

});

//list Pin Code
bot.onText(/\/listpin$/,async(msg,match)=>{
    const chatId = msg.chat.id;
    let usr:UserType|undefined;
    await DbHelper.fetchUser(chatId).then(data=>{usr=data.user});

    if(!isEmpty(usr)){
        let resp='';
        usr?.pincodes.forEach(p=>{resp+=`${p}\n`});
        if(isEmpty(resp)){
            resp = 'No Pin Codes Found.';
        }
        else
            resp = `Added Pin Codes:\n${resp}`;
        bot.sendMessage(chatId,resp);
    }
    else{
        bot.sendMessage(chatId,'No Pin Codes Found.');
    }
});

// Matches "/dist"
bot.onText(/\/dist$/, runDist = async(msg:TelegramBot.Message, match:RegExpExecArray | null) => {    
  
    if( msg && (msg.chat.id !== skChatId) )  return;

    let resp = []; // the captured "whatever"
    let msgs=[];
    resp= await getSessionsByDisCode();
    
    if(skChatId && isEmpty(resp)){
        bot.sendMessage(skChatId,'No Session Found By Dist !!!');
    }
    else{
        let msg='';
        for(let i=0;i<resp.length; ++i){
            if(Buffer.from(msg+resp[i]).length < MAX_LEN){
                msg += resp[i];
            }
            else{
                msgs.push(msg);
                msg = '';
            }            
        }

        msgs.forEach(msg=>{
            if(skChatId && !isEmpty(msg))
                bot.sendMessage(skChatId,msg,{parse_mode:"HTML"});
        })
    }
    
    // clearInterval(t_dis);
    // t_dis = setInterval(runDist, TIME_INTERVAL);

});

bot.onText(/\/live$/, (msg, match) => {
    const chatId = msg.chat.id;
    let resp = 'Bot is Running...';
    bot.sendMessage(chatId, resp);
});

//list Age Code
bot.onText(/\/listage$/,async(msg,match)=>{
    const chatId = msg.chat.id;
    // let usr = find(Users,{id:chatId});
    let usr:UserType|undefined;
    await DbHelper.fetchUser(chatId).then(data=>{usr=data.user});

    if(!isEmpty(usr)){
        let resp='';
        usr?.age.forEach(p=>{resp+=`${p}, `});
        if(isEmpty(resp))
            resp = 'No Age Found.'
        else
            resp = 'Added Ages:\n'+resp;
        bot.sendMessage(chatId,resp);
    }
    else{
        bot.sendMessage(chatId,'No Age Found.');
    }
});

//Add age
bot.onText(/\/addage (.+)/,async(msg,match)=>{
    const chatId = msg.chat.id;
    let resp = 'Default';

    if(match){
        let age = parseInt(match[1]);
        if(age && config.validAges.includes(age) ){
            addAge(chatId,age)
            .then((data)=>{
                if(data.error){
                    bot.sendMessage(chatId,data.msg);
                    console.log(data);
                }
                else{
                    bot.sendMessage(chatId,'Age added to list.\n Try /listage');
                    console.log(data);
                }
            })
        }
        else{
            resp = `Valid ages are ${config.validAges} .`;
            bot.sendMessage(chatId,resp);
        }
    }
});

//del age
bot.onText(/\/delage (.+)/,async(msg,match)=>{
    const chatId = msg.chat.id;
    console.log('Match:',match);
    let resp = 'Default';

    if(match){
        let age = parseInt(match[1]);
        if(age){
            let user:UserType|undefined;
            await DbHelper.fetchUser(chatId).then(data=>{user=data.user});

            if(user){
                if(user && !user.age.includes(age)){
                    resp = `Age "${age}" NOT in list.`;
                }
                else if(user){
                    let rst = removeAge(user,age);
                    resp = (await rst).error?'Error while adding age.':'Updated age list\n Try /listage ';
                }
            }
            else{
                resp = 'No Age Found.'
            }
        }
        else{
            resp = `Valid ages are ${config.validAges}.`;
        }
    } 

    bot.sendMessage(chatId,resp);
});

//del pin
bot.onText(/\/delpin (.+)/,async(msg,match)=>{
    const chatId = msg.chat.id;
    console.log('Match:',match);
    let resp = 'Default';

    if(match){
        let pin = parseInt(match[1]);
        if(pin){
            let user:UserType|undefined;
            await DbHelper.fetchUser(chatId).then(data=>{user=data.user});
            
            if(user){
                if(!user.pincodes.includes(pin)){
                    resp = `Pin Code "${pin}" NOT in list.`;
                }
                else{
                    let rst = removePin(user,pin);
                    resp = (await rst).error?'Error while deleting Pin.':'Updated Pin Code list\n Try /listpin ';
                }
            }
            else{
                resp = 'No Pin Code Found.'
            }
        }
        else{
            resp = `Invalid Pin ${match[1]}.`;
        }
    } 

    bot.sendMessage(chatId,resp);
});

//get Users data
bot.onText(/\/getUsers$/,async(msg)=>{
    const chatId = msg.chat.id;
    let usr:UserType[]|undefined;
    await DbHelper.fetchAllUser().then(data=>{usr=data.users});
    if(chatId !== skChatId)
        return;
    
    bot.sendMessage(chatId,JSON.stringify(usr));
});

//list Pin Codes & age both
bot.onText(/\/listall/,async (msg)=>{
    const chatId = msg.chat.id;
    let usr:UserType|undefined;
    await DbHelper.fetchUser(chatId).then(data=>{usr=data.user});

    if(!isEmpty(usr)){
        let pin='', age='', resp='';
        usr?.pincodes.forEach(p=>{pin+=`${p}\n`});
        usr?.age.forEach(a=>{age+=`${a}\n`});

        if(isEmpty(pin))
            resp += 'No Pin Codes Found.\n';
        else
            resp += `Added Pin Codes:\n${pin}\n`;            

        if(isEmpty(age))
            resp += 'No Age Found.\n';
        else
            resp += `Added Age :\n${age}`;
        bot.sendMessage(chatId,resp);
    }
    else{
        bot.sendMessage(chatId,'No Pin Codes and no Age Found.');
    }

});

// Listen for any kind of message. There are different kinds of messages.
bot.on('message', (msg,match) => {
    logCmd(msg);
    const chatId = msg.chat.id;  
    if( !isValidCmd(msg,cmdList) ){
        bot.sendMessage(chatId, 'Wrong Command !!!\n Try /help');
    }
    else if(isValidCmd(msg,cmdList) && !isValidArgvCmd(msg,argvCmdList)) {
        const cmd = getCmd(msg);
        switch(cmd){
            case '/delpin':
                bot.sendMessage(chatId,`
                    <b>!!! Command Error !!!</b>\
                    \n/delpin command need an argument.\
                    \n    <b>Syntex:</b> /delpin PIN_CODE\
                    \n    <b>Eg:</b> /delpin 602350\
                    `,{parse_mode:"HTML"})
                break;
            case '/delage':
                bot.sendMessage(chatId,`
                    <b>!!! Command Error !!!</b>\
                    \n/delage command need an argument.\
                    \n    <b>Syntex:</b> /delage AGE\
                    \n    <b>Eg:</b> /delage 45\
                    `,{parse_mode:"HTML"})
                break;
            case '/addpin':
                bot.sendMessage(chatId,`
                    <b>!!! Command Error !!!</b>\
                    \n/addpin command need an argument.\
                    \n    <b>Syntex:</b> /addpin PIN_CODE\
                    \n    <b>Eg:</b> /addpin 602201\
                    `,{parse_mode:"HTML"})
                break;
            case '/addage':
                bot.sendMessage(chatId,`
                    <b>!!! Command Error !!!</b>\
                    \n/addage command need an argument.\
                    \n    <b>Syntex:</b> /addage AGE\
                    \n    <b>Eg:</b> /addage 18\
                    `,{parse_mode:"HTML"})
                break;
        }
    }
});

const getSessionsByDisCode = async ()=>{
    // find by distric code
    // const url = 'https://cdn-api.co-vin.in/api/v2/appointment/sessions/public/calendarByDistrict?district_id=670&date=11-05-2021';
    const baseUrl = 'https://cdn-api.co-vin.in/api/v2/appointment/sessions/public/calendarByDistrict?';
    
    let date = getDate();
    let days = 14;
    let msgs='';
    centers=[];
    
    for(let i=0;i<days;++i){
        console.log('date:',getDate(i));
        date = getDate(i);        
        let options={
          method: "GET",
          headers: {
              "Content-type": "application/json;charset=UTF-8",
              "User-Agent":"PostmanRuntime/7.28.0"
            }
        };
        
        const url = baseUrl+ 'district_id='+distId+'&date='+date ;
        console.log('url:',url);
        console.log(`Fetch -> distId: ${distId} date: ${date} `);
        await fetch(url,options)
        .then(rsp => {
            try{
                return rsp.json();
            }catch(err){
                console.error(`Error: ${err}`);
            }
        })
        .then(data => {
            // console.log(data); 
            data.centers.forEach( 
                (c:any)=>{centers.push(c)} ) 
            })
        .catch( err => {console.error(`Error: ${err}`)} );
    }

    let msg:string[] = [];
    centers.forEach(c=>{
        if( c ){
            let sk = find(Users,{id:skChatId});
            let m = formateDistMsg(c,sk?sk.age:[18,45]);
            if(!isEmpty(m))
                msg.push(m);
        }
    });

    if(!isEmpty(msg)){
        msgs='';
        msg.forEach(m =>{
            if(!isEmpty(m))
            msgs = msgs +'\n\n' + m;
        })
        console.log('msg:',msgs);
        console.log('byte size',Buffer.from(msgs).length) ;
    }
    return msg;    
}

const main = async ()=>{    
    botToken && skChatId && sendNotofication(botToken,skChatId,'Server Started !!!');
    pinSearchHandler();
    // runDist();
}

main();
