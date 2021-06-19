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
exports.getCmd = exports.isValidArgvCmd = exports.isValidCmd = exports.getHash = exports.removePin = exports.removeAge = exports.addAge = exports.addPin = exports.getUser = exports.isValidPinCode = exports.sendNotofication = exports.getDate = exports.formateDistMsg = exports.formatePinMsg = void 0;
const lodash_1 = require("lodash");
const node_fetch_1 = __importDefault(require("node-fetch"));
const users_json_1 = __importDefault(require("./data/users.json"));
const users_1 = require("./types/users");
const fs_1 = __importDefault(require("fs"));
const crypto_1 = __importDefault(require("crypto"));
const config_json_1 = __importDefault(require("./config.json"));
const dataFile = './src/data/users.json';
const formatePinMsg = (centers, ages) => {
    let resp = '';
    centers.forEach(c => {
        resp += exports.formateDistMsg(c, ages);
    });
    return resp;
};
exports.formatePinMsg = formatePinMsg;
const getVaccineFee = (center, vaccine) => {
    let vaccFees;
    if (center.vaccine_fees) {
        let vacc = lodash_1.find(center.vaccine_fees, { vaccine: vaccine });
        vaccFees = vacc ? vacc.fee : undefined;
    }
    return vaccFees;
};
const formateDistMsg = (c, ages) => {
    let isVaccAvail = false;
    const feeType = c.fee_type;
    let msg = `🏥 <b><u>Name: ${c.name} </u></b>\
        \n  Address: ${c.address}\
        \n  PinCode: ${c.pincode}\
        \n ---------------------------------`;
    c.sessions.forEach((s) => {
        if (s && parseInt(s.available_capacity) > 0 && ages.includes(s.min_age_limit)) {
            isVaccAvail = true;
            msg += `\n<b><u>💉Vaccine Slot</u></b> \
                    \n    <b>Date: ${s.date}  </b> \
                    \n    <b>Dose-1 : ${s.available_capacity_dose1} </b> \
                    \n    <b>Dose-2 : ${s.available_capacity_dose2} </b> \
                    \n    <b>Age Limit: ${s.min_age_limit} </b> \
                    \n    Vaccine: <b>${s.vaccine} [${feeType} ${feeType == 'Paid' ? getVaccineFee(c, s.vaccine) : ''}] </b>\
                    \n ---------------------------------`;
        }
    });
    if (isVaccAvail)
        return msg + '\n\n';
    else
        return '';
};
exports.formateDistMsg = formateDistMsg;
const getDate = (day = 0) => {
    const dateObj = new Date();
    return ('' + (dateObj.getDate() + day) + '-' + (dateObj.getMonth() + 1) + '-' + dateObj.getFullYear());
};
exports.getDate = getDate;
const sendNotofication = (token, chatId, msg) => __awaiter(void 0, void 0, void 0, function* () {
    if (lodash_1.isEmpty(msg))
        return;
    const url = 'https://api.telegram.org/bot' + token + '/sendMessage?chat_id=' + chatId + '&text=' + msg + '';
    yield node_fetch_1.default(url)
        .then(rsp => rsp)
        .catch(err => { console.log(err); });
});
exports.sendNotofication = sendNotofication;
const isValidPinCode = (pin) => {
    let regx = /^(\d{4}|\d{6})$/;
    console.log('Pin:', pin);
    return regx.test(pin.toString());
};
exports.isValidPinCode = isValidPinCode;
const addUser = (userId, pin) => {
    const Users = users_json_1.default;
    Users.push(new users_1.UserType(userId, [pin], [18, 45], true));
    console.log('New Users:', Users, '\n', JSON.stringify(Users));
    fs_1.default.writeFile(dataFile, JSON.stringify(Users), (err) => {
        console.log('addUser Error:', err);
        return false;
    });
    return true;
};
const getUser = (userId) => {
    const Users = users_json_1.default;
    return lodash_1.find(Users, { id: userId });
};
exports.getUser = getUser;
const addPin = (userId, pin) => {
    let Users = users_json_1.default;
    let rsp = { error: false, msg: '' };
    let user = lodash_1.find(Users, { id: userId });
    if (lodash_1.isEmpty(user)) {
        let resp = addUser(userId, pin);
        rsp.error = resp;
    }
    else {
        if ((user === null || user === void 0 ? void 0 : user.pincodes.indexOf(pin)) !== -1) {
            console.log('Pin All ready exists.');
            rsp.error = true;
            rsp.msg = 'Pin All ready exists !!!';
        }
        else {
            user.pincodes.push(pin);
            Users = lodash_1.remove(Users, (u) => { u.id === (user === null || user === void 0 ? void 0 : user.id); });
            fs_1.default.writeFile(dataFile, JSON.stringify([...Users, user]), (err) => {
                console.log('addPin Error:', err);
                rsp = { error: true, msg: 'Error while adding Pin !!!' };
            });
        }
    }
    return rsp;
};
exports.addPin = addPin;
const addAge = (usr, age) => {
    let Users = users_json_1.default;
    usr.age.push(age);
    let newUsers = lodash_1.remove(Users, (u) => { u.id === (usr === null || usr === void 0 ? void 0 : usr.id); });
    fs_1.default.writeFile(dataFile, JSON.stringify([...newUsers, usr]), (err) => {
        console.log('add Age Error:', err);
        return false;
    });
    return true;
};
exports.addAge = addAge;
const removeAge = (usr, age) => {
    let Users = users_json_1.default;
    usr.age = usr.age.filter(a => a != age);
    let newUsers = lodash_1.remove(Users, (u) => { u.id === (usr === null || usr === void 0 ? void 0 : usr.id); });
    fs_1.default.writeFile(dataFile, JSON.stringify([...newUsers, usr]), (err) => {
        console.log('remove Age Error:', err);
        return false;
    });
    return true;
};
exports.removeAge = removeAge;
const removePin = (usr, pin) => {
    let Users = users_json_1.default;
    usr.pincodes = usr.pincodes.filter(a => a != pin);
    let newUsers = lodash_1.remove(Users, (u) => { u.id === (usr === null || usr === void 0 ? void 0 : usr.id); });
    fs_1.default.writeFile(dataFile, JSON.stringify([...newUsers, usr]), (err) => {
        console.log('remove Pin Error:', err);
        return false;
    });
    return true;
};
exports.removePin = removePin;
const getHash = (msg) => {
    const sha256Hasher = crypto_1.default.createHmac("sha256", config_json_1.default.secret);
    return sha256Hasher.update(msg).digest("hex");
};
exports.getHash = getHash;
const isValidCmd = (msg, cmdList) => {
    if (msg.entities) {
        const txt = msg.text;
        let cmd = txt === null || txt === void 0 ? void 0 : txt.split(' ');
        console.log('cmd:', cmd);
        if (cmd && (cmdList.indexOf(cmd[0]) !== -1))
            return true;
        else
            return false;
    }
    else
        return false;
};
exports.isValidCmd = isValidCmd;
const isValidArgvCmd = (msg, argvCmdList) => {
    if (msg.entities) {
        const txt = msg.text;
        let cmd = txt === null || txt === void 0 ? void 0 : txt.split(' ');
        console.log('argvCmd:', cmd);
        if (cmd && cmd.length > 1 && (argvCmdList.indexOf(cmd[0]) !== -1))
            return true;
        else
            return false;
    }
    else
        return false;
};
exports.isValidArgvCmd = isValidArgvCmd;
const getCmd = (msg) => {
    var _a;
    let cmd = (_a = msg.text) === null || _a === void 0 ? void 0 : _a.split(' ');
    console.log('cmd:', cmd);
    if (cmd && cmd[0])
        return cmd[0];
    else
        return undefined;
};
exports.getCmd = getCmd;
