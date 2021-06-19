import { formatePinMsg, getDate} from "./helper/helper";
import { UserType } from "./types/users";
import config from './config.json';
import { replace, map } from 'lodash';
import fetch from "node-fetch";

export const getSessionsByPinCode = async (user:UserType, weeks:number)=>{
    let pinData:any[] = [];
    const promises: Array<Promise<any>> = [];
    let resp='';

    for(let i=0;i<weeks;++i){
        
        let options={
            method: "GET",
            headers: {
                "Accept-Language": "hi_IN",
                "Accept": "application/json",
                "User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36"
            }
        };

        user.pincodes.forEach((pin)=>{
            let date = getDate(i*7);
            let url = config.calendarByPinUrl; 
            url = replace(url,'PIN',pin.toString());
            url = replace(url,'DATE',date);
            console.log(`[Init] Fetch Sessions for: -> url: ${url}`);    
            promises.push(fetch(url,options));  
        });
        
    }

    const onSuccess = async (response: any) => {
        const data = await Promise.all(response.map((res:any) => {
            console.log(`[Done] Fetch Sessions for: -> url: ${res.url}`);    
            return res.json();
        }));
        map(data, (d:any)=> {pinData = pinData.concat(d.centers); });
        resp = formatePinMsg(pinData,user.age);
    }
    
    const onError = (error: any) => {
        console.log(`error:`,error);
        resp = '';
    }

    const onCatch = (ex: any) => {
        console.log(`Error:`,ex);
    }

    const onFinally = () => {
        // console.log('Finnaly !!!');
    }

    await Promise.all(promises)
    .then(onSuccess,onError)
    .catch(onCatch)
    .finally(onFinally); 

    // let resp=formatePinMsg(pinData);
    // console.log('pinData:',pinData);
    
    return resp;
}