import { isEmpty , find, findIndex ,remove, isNumber} from 'lodash';
import fetch from 'node-fetch';
import  users  from '../data/users.json';
import { UserType } from '../types/users';
import crypto from 'crypto';
import config from '../config.json';
import TelegramBot, { User } from 'node-telegram-bot-api';
import * as DbHelper from './db.helper';

export const delay = (ms:number) => new Promise(resolve => setTimeout(resolve, ms));

export const formatePinMsg = (centers:any[], user:UserType)=>{
    let resp = '';
    centers.forEach(c=>{
        resp += formateDistMsg(c,user);
    });
    return resp;
}

const getVaccineFee = (center:any,vaccine:string) : string | undefined=>{
    let vaccFees: string | undefined;
    if(center.vaccine_fees){
        let vacc = find(center.vaccine_fees,{vaccine:vaccine});
        vaccFees = vacc ? vacc.fee:undefined;
    }

    return vaccFees;
}

const hasRequiredDose = (session:any,dose:number[]) : boolean=>{
    return (dose.includes(1) && session.available_capacity_dose1>0) || (dose.includes(2) && session.available_capacity_dose2>0);
}

export const formateDistMsg = (c:any, user:UserType)=>{
    let isVaccAvail = false;
    let {age,dose} = {...user};
    const feeType = c.fee_type;
    let msg=`🏥 <b><u>Name: ${c.name} </u></b>\
        \n  Address: ${c.address}\
        \n  PinCode: ${c.pincode}\
        \n ---------------------------------`;
    c.sessions && c.sessions.forEach( (s:any) =>{
        if( s && parseInt(s.available_capacity) > 0 && age.includes(s.min_age_limit) && hasRequiredDose(s,dose) ){
            isVaccAvail = true;
            msg += `\n<b><u>💉Vaccine Slot</u></b> \
                    \n    <b>Date: ${s.date}  </b> \
                    \n    <b>Dose-1 : ${s.available_capacity_dose1} </b> \
                    \n    <b>Dose-2 : ${s.available_capacity_dose2} </b> \
                    \n    <b>Age Limit: ${s.min_age_limit} </b> \
                    \n    Vaccine: <b>${s.vaccine} [${feeType} ${feeType == 'Paid'? getVaccineFee(c,s.vaccine) : ''}] </b>\
                    \n ---------------------------------`;
        }
    });

    if(isVaccAvail)
        return msg+'\n\n';
    else
        return '';
}

export const getDate = (day:number=0)=>{
    const dateObj = new Date();
    return ( ''+(dateObj.getDate()+day)+'-'+(dateObj.getMonth()+1)+'-'+dateObj.getFullYear() )
}

export const sendNotofication = async (token:string,chatId:number,msg:string) =>{
    if(isEmpty(msg))
        return;
    const url = 'https://api.telegram.org/bot'+token+'/sendMessage?chat_id='+chatId+'&text='+msg+'';
    await fetch(url)
        .then(rsp => rsp)
        .catch( err => {console.log(err)} );
}

export const isValidPinCode = (pin:string|number)=>{
    let regx = /^(\d{4}|\d{6})$/;
    console.log('Pin:',pin);
    return regx.test(pin.toString());
}

export const isValidDose = (dose:string)=>{
    // console.log('Dose:',dose);
    try{
        const doseNum = parseInt(dose);
        if(config.valideDoses.includes(doseNum))
            return true;
        else 
            return false;
    }
    catch(err){
        return false;
    }
}

export const getUser = (userId:number) =>{
    const Users = (users as UserType[]);
    return find(Users,{id:userId});
}

export const addPin = async (userId:number,pin:number)=>{
    // let Users = (users as UserType[]);
    let user:UserType|undefined;
    await DbHelper.fetchUser(userId).then(data=>{user=data.user});
    // console.log('user:',user);
    let rsp = {error:false,msg:''};
    
    // let user = find(Users,{id:userId});
    if(isEmpty(user)){
        // let resp = addUser(userId,pin);  
        await DbHelper.addUser(new UserType(userId,[pin],[18,45]))
        .then((d:any)=>{
            rsp={error:d.error,msg:d.msg};
        })
        .catch(err=>{
            rsp={error:err.error,msg:err.msg};
        })
    } 
    else if(user) {
        if(user.pincodes.indexOf(pin) !== -1 ){
            console.log('Pin All ready exists.');
            rsp.error=true;
            rsp.msg='Pin All ready exists !!!';
        }
        else{
            user.pincodes.push(pin);
            console.log(`Pin Updated in user ${user.id} `);
            DbHelper.updateUser(user)
            .then(data=>{ 
                console.log(`Pin Added to user:`,data);
                rsp = {error:data.error,msg:data.msg};
            });
        }
    }
    
    return rsp;
}

export const addAge = async (userId:number,age:number)=>{
       // let Users = (users as UserType[]);
    let user:UserType|undefined;
    await DbHelper.fetchUser(userId).then(data=>{user=data.user});
    // console.log('user:',user);
    let rsp = {error:false,msg:''};
    
    // let user = find(Users,{id:userId});
    if(isEmpty(user)){
        // let resp = addUser(userId,pin);  
        await DbHelper.addUser(new UserType(userId,[],[age]))
        .then((d:any)=>{
            rsp={error:d.error,msg:d.msg};
        })
        .catch(err=>{
            rsp={error:err.error,msg:err.msg};
        })
    } 
    else if(user) {
        if(user.age.indexOf(age) !== -1 ){
            console.log('Age All ready exists.');
            rsp.error=true;
            rsp.msg='Age All ready exists !!!';
        }
        else{
            user.age.push(age);
            console.log(`Age Update for user ${user.id} init...`);
            DbHelper.updateUser(user)
            .then(data=>{ 
                console.log(`Age Added to user:`,data);
                rsp = {error:data.error,msg:data.msg};
            });
        }
    }
    
    return rsp;   
}

export const addDose = async (userId:number,dose:number)=>{
    let user:UserType|undefined;
    await DbHelper.fetchUser(userId).then(data=>{user=data.user});
    let rsp = {error:false,msg:''};
    
    if(isEmpty(user)){
        await DbHelper.addUser({id:userId,pincodes:[],age:[],dose:[dose],notify:true})
        .then((d:any)=>{
            rsp={error:d.error,msg:d.msg};
        })
        .catch(err=>{
            rsp={error:err.error,msg:err.msg};
        })
    } 
    else if(user) {
        if(!isEmpty(user.dose) && user.dose.includes(dose)){
            console.log('Does All ready exists.');
            rsp.error=true;
            rsp.msg='Does All ready exists !!!';
        }
        else{
            user.dose.push(dose);
            console.log(`Does Update for user ${user.id} init...`);
            DbHelper.updateUser(user)
            .then(data=>{ 
                console.log(`Does Added to user:`,data);
                rsp = {error:data.error,msg:data.msg};
            });
        }
    }
    
    return rsp;   
}

export const removeAge = (user:UserType,age:number)=>{
    let rsp = {error:false,msg:''};
    user.age = user.age.filter(a=> a!=age );
    console.log(`Del Age for user ${user.id} init...`);
    DbHelper.updateUser(user)
    .then(data=>{ 
        console.log(`Age Deleted for user:`,data);
        rsp = {error:data.error,msg:data.msg};
    });    
    return rsp;   
}

export const removeDose = (user:UserType,dose:number)=>{
    let rsp = {error:false,msg:''};
    user.dose = user.dose.filter(d=> d!=dose );
    console.log(`Del Dose for user ${user.id} init...`);
    DbHelper.updateUser(user)
    .then(data=>{ 
        console.log(`Dose Deleted for user:`,data);
        rsp = {error:data.error,msg:data.msg};
    });    
    return rsp;   
}

export const removePin = async (user:UserType,pin:number)=>{
    let rsp = {error:false,msg:''};
    user.pincodes = user.pincodes.filter(a=> a!=pin );
    console.log(`Pin Del for user ${user.id} init...`);
    DbHelper.updateUser(user)
    .then(data=>{ 
        console.log(`Pin Deleted for user:`,data);
        rsp = {error:data.error,msg:data.msg};
    });
    return rsp;   
}

export const getHash = (msg:string)=>{
    const sha256Hasher = crypto.createHmac("sha256", config.secret);
    return sha256Hasher.update(msg).digest("hex");
}

export const isValidCmd = (msg:TelegramBot.Message, cmdList:string) : boolean=>{
    if(msg.entities){
        const txt = msg.text;
        let cmd = txt?.split(' ');
        if(cmd && (cmdList.indexOf(cmd[0]) !== -1) )
            return true;
        else{
            console.log('InValid Cmd Found: ',cmd);
            return false;
        }
    }
    else
        return false
};

export const isValidArgvCmd = (msg:TelegramBot.Message, argvCmdList:string) : boolean=>{
    if(msg.entities){
        const txt = msg.text;
        let cmd = txt?.split(' ');
        if(cmd && (argvCmdList.indexOf(cmd[0]) !== -1) && cmd.length > 1 )
            return true;
        else{
            console.log('Invalid Argv Cmd Found: ',cmd);
            return false;
        }
    }
    else
        return false
};

export const getCmd = (msg:TelegramBot.Message) :string | undefined =>{
    let cmd =  msg.text?.split(' ');
    // console.log('cmd:',cmd);
    if(cmd && cmd[0] )
        return cmd[0];
    else
        return undefined;
}

export const logCmd = (msg:TelegramBot.Message) =>{
    console.log('Cmd Received :', JSON.stringify({...msg.chat,text:msg.text}) );
}