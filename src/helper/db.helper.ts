import { UserDbType, UserType } from "../types/users";
import { createTableService, TableQuery, TableService, TableUtilities } from 'azure-storage';

let tableSvc : TableService | undefined = undefined; 
let StorageAccount : string | undefined  ;
let StorageKey : string | undefined  ;
let TableName : string | undefined ;
let PartitionKey : string | undefined;
const entGen = TableUtilities.entityGenerator;

export const dbInit =():boolean =>{
  console.log('DB init...');
  if(!process.env.APP_MODE){
    const rst = require('dotenv').config();    
    if(rst.error){
        console.log('Error:',rst.error);
    }
    else{
        console.log('App Mode:',process.env.APP_MODE);
    }
  }

  StorageAccount = process.env.StorageAccount ;
  StorageKey =  process.env.StorageKey;
  TableName = process.env.TableName;
  PartitionKey = process.env.PartitionKey;  
  
  if(StorageAccount && StorageKey){
    tableSvc =createTableService(StorageAccount, StorageKey)
  }
  else{
    console.log(`Error: StorageAccount OR StorageKey is undefile`);
    console.log(`StorageAccount:${StorageAccount}\n StorageKey:${StorageKey}`);
  }
  console.log('DB init Complete.');
  return tableSvc?  true : false;
}

export const mapToDbUser = (user:UserType) : UserDbType=>{
    return {
        PartitionKey: entGen.String(PartitionKey?PartitionKey:'PartitionKey'),
        RowKey: entGen.String(user.id.toString()),
        id: entGen.Int32(user.id),
        pincode: entGen.String(JSON.stringify(user.pincodes)),
        age: entGen.String(JSON.stringify(user.age)),
        dose: entGen.String(JSON.stringify(user.dose)),
        notify: entGen.Boolean(user.notify)   
    }
}

export const mapToUser = (entry:any):UserType=>{
  let user = new UserType(
    entry.id._,
    JSON.parse(entry.pincode._ || '[]'),
    JSON.parse(entry.age._ || '[]'),
    JSON.parse(entry.dose && entry.dose._ || '[]'),
    entry.notify._
  );
  return user;
}

export const addUser = async (user:UserType) : Promise<{error:boolean,msg:string,statusCode:number}>=>{  
  return new Promise((resolve, reject)=>{
    if(!tableSvc || !TableName){
      if(!tableSvc){
        console.log('DB addUsers Error : No connection to DB !!!');
        reject({error:true,msg:'No connection to DB !!!',statusCode:-1});
        return;
      }

      if(!TableName){
        console.log('DB addUsers Error : No Table Name Found !!!');
        reject({error:true,msg:'No Table Name Found !!!',statusCode:-1}) ;
        return; 
      }
    }
    const dbUser =  mapToDbUser(user);
    tableSvc.insertEntity(TableName!,dbUser, async (error, result, responce)=>{
        if(error){
          reject({error:true,msg:error.message,statusCode:(error as any).statusCode}) ;
          return
        }
        // if(result)
        //     console.log("Rest:",result);
        if(responce){
          resolve({ error:!responce.isSuccessful,msg:'responce.msg',statusCode:responce.statusCode });
        }
    });
  });
}

export const fetchUser = async (userId:number) : Promise<{error:boolean,user:UserType|undefined,statusCode:number}> =>{
  return new Promise((resolve, reject)=>{
    if(!tableSvc || !TableName){
      if(!tableSvc){
        console.log('DB addUsers Error : No connection to DB !!!');
        reject({error:true,msg:'No connection to DB !!!',statusCode:-1});
        return;
      }

      if(!TableName){
        console.log('DB addUsers Error : No Table Name Found !!!');
        reject({error:true,msg:'No Table Name Found !!!',statusCode:-1});
        return; 
      }
    }

    var query = new TableQuery().where('id eq ?', userId);
    tableSvc.queryEntities(TableName,query, null!, (error, result, response)=> {
      if(error){
        console.log(error);
        reject({error:true,user:null,statusCode:(error as any).statusCode}) ;
        return
      }
      if(result){
        // console.log("Rest:",result);
        // console.log("Rest:",result.entries);
        if(result.entries.length>0){
          const user = mapToUser(result.entries[0]);
          resolve({error:false,user:user,statusCode:200});
        }
        else{
          resolve({error:false,user:undefined,statusCode:404});
        }
      }
      if(response){
        // console.log('response:',response);
        // resolve({ error:!response.isSuccessful,statusCode:response.statusCode });
      }
    });
  });
}

export const fetchAllUser = async () : Promise<{error:boolean,users:UserType[],statusCode:number}> =>{
  return new Promise((resolve, reject)=>{
    if(!tableSvc || !TableName){
      if(!tableSvc){
        console.log('DB addUsers Error : No connection to DB !!!');
        reject({error:true,msg:'No connection to DB !!!',statusCode:-1});
        return;
      }

      if(!TableName){
        console.log('DB addUsers Error : No Table Name Found !!!');
        reject({error:true,msg:'No Table Name Found !!!',statusCode:-1});
        return; 
      }
    }

    var query = new TableQuery();
    tableSvc.queryEntities(TableName,query, null!, (error, result, response)=> {
      if(error){
        console.log(error);
        reject({error:true,user:null,statusCode:(error as any).statusCode}) ;
        return
      }
      if(result){
        // console.log("Rest:",result);
        // console.log("Rest:",result.entries);
        const users:UserType[]=[];
        if(result.entries.length>0){
          result.entries.forEach(e=>{
            users.push(mapToUser(e) ) ;
          });
          resolve({error:false,users:users,statusCode:200});
        }
        else{
          resolve({error:false,users:users,statusCode:404});
        }
      }
      if(response){
        // console.log('response:',response);
        // resolve({ error:!response.isSuccessful,statusCode:response.statusCode });
      }
    });
  });
}

export const updateUser = async (user:UserType) : Promise<{error:boolean,msg:string,statusCode:number}> =>{
  return new Promise((resolve, reject)=>{
    if(!tableSvc || !TableName){
      if(!tableSvc){
        console.log('DB addUsers Error : No connection to DB !!!');
        reject({error:true,msg:'No connection to DB !!!',statusCode:-1});
        return;
      }

      if(!TableName){
        console.log('DB addUsers Error : No Table Name Found !!!');
        reject({error:true,msg:'No Table Name Found !!!',statusCode:-1});
        return; 
      }
    }

    const dbUser =  mapToDbUser(user);
    tableSvc.replaceEntity(TableName,dbUser, (error, result, response)=> {
      if(error){
        console.log(error);
        reject({error:true,user:null,statusCode:(error as any).statusCode}) ;
        return
      }
      // if(result){
      //   console.log("Result:",result);
      // }
      if(response){
        // console.log('response:',response)
        resolve({ error:!response.isSuccessful,msg:'User Updated',statusCode:response.statusCode });
      }
    });
  });
}