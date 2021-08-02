import { TableUtilities } from 'azure-storage';
import config from '../config.json';
export class UserType {
    constructor(
        public id:number,
        public pincodes:number[],
        public age:number[]=config.validAges,
        public dose:number[]=config.valideDoses,
        public notify:boolean=true
    ){}
};

export class UserDbType{
    constructor(
        public PartitionKey: TableUtilities.entityGenerator.EntityProperty<string>,
        public RowKey: TableUtilities.entityGenerator.EntityProperty<string>,
        public id: TableUtilities.entityGenerator.EntityProperty<number>,
        public pincode: TableUtilities.entityGenerator.EntityProperty<string>,
        public age: TableUtilities.entityGenerator.EntityProperty<string>,
        public dose: TableUtilities.entityGenerator.EntityProperty<string>,
        public notify: TableUtilities.entityGenerator.EntityProperty<boolean>
    ){}
};