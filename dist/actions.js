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
exports.getSessionsByPinCode = void 0;
const helper_1 = require("./helper");
const config_json_1 = __importDefault(require("./config.json"));
const lodash_1 = require("lodash");
const node_fetch_1 = __importDefault(require("node-fetch"));
const getSessionsByPinCode = (user, weeks) => __awaiter(void 0, void 0, void 0, function* () {
    let pinData = [];
    const promises = [];
    let resp = '';
    for (let i = 0; i < weeks; ++i) {
        let options = {
            method: "GET",
            headers: {
                "Accept-Language": "hi_IN",
                "Accept": "application/json",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36"
            }
        };
        user.pincodes.forEach((pin) => {
            let date = helper_1.getDate(i * 7);
            let url = config_json_1.default.calendarByPinUrl;
            url = lodash_1.replace(url, 'PIN', pin.toString());
            url = lodash_1.replace(url, 'DATE', date);
            console.log('date:', date);
            console.log('url:', url);
            console.log(`Fetch -> pin: ${pin} date: ${date} week:${weeks}`);
            promises.push(node_fetch_1.default(url, options));
        });
    }
    const onSuccess = (response) => __awaiter(void 0, void 0, void 0, function* () {
        console.log(`response:`, response);
        const data = yield Promise.all(response.map((res) => res.json()));
        lodash_1.map(data, (d) => { pinData = pinData.concat(d.centers); });
        resp = helper_1.formatePinMsg(pinData, user.age);
    });
    const onError = (error) => {
        console.log(`error:`, error);
        resp = '';
    };
    const onCatch = (ex) => {
        console.log(`ex:`, ex);
    };
    const onFinally = () => {
        console.log('Finnaly !!!');
    };
    yield Promise.all(promises)
        .then(onSuccess, onError)
        .catch(onCatch)
        .finally(onFinally);
    // let resp=formatePinMsg(pinData);
    // console.log('pinData:',pinData);
    return resp;
});
exports.getSessionsByPinCode = getSessionsByPinCode;
