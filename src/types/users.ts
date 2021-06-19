import { TableUtilities } from 'azure-storage';
export class UserType {
    constructor(
        public id:number,
        public pincodes:number[],
        public age:number[],
        public notify:boolean
    ){}
};

export class UserDbType{
    constructor(
        public PartitionKey: TableUtilities.entityGenerator.EntityProperty<string>,
        public RowKey: TableUtilities.entityGenerator.EntityProperty<string>,
        public id: TableUtilities.entityGenerator.EntityProperty<number>,
        public pincode: TableUtilities.entityGenerator.EntityProperty<string>,
        public age: TableUtilities.entityGenerator.EntityProperty<string>,
        public notify: TableUtilities.entityGenerator.EntityProperty<boolean>
    ){}
};