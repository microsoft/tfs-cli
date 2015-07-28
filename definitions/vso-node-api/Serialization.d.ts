export interface ContractEnumMetadata {
    enumValues?: {
        [name: string]: number;
    };
}
export interface SerializationData {
    requestTypeMetadata?: ContractMetadata;
    responseTypeMetadata?: ContractMetadata;
    responseIsCollection: boolean;
}
export interface ContractFieldMetadata {
    isArray?: boolean;
    isDate?: boolean;
    enumType?: ContractEnumMetadata;
    typeInfo?: ContractMetadata;
    isDictionary?: boolean;
    dictionaryKeyIsDate?: boolean;
    dictionaryValueIsDate?: boolean;
    dictionaryKeyEnumType?: ContractEnumMetadata;
    dictionaryValueEnumType?: ContractEnumMetadata;
    dictionaryValueTypeInfo?: ContractMetadata;
    dictionaryValueFieldInfo?: ContractFieldMetadata;
}
export interface ContractMetadata {
    fields?: {
        [fieldName: string]: ContractFieldMetadata;
    };
}
export interface IWebApiArrayResult {
    count: number;
    value: any[];
}
export declare module ContractSerializer {
    function serialize(data: any, contractMetadata: ContractMetadata, preserveOriginal?: boolean): any;
    function deserialize(data: any, contractMetadata: ContractMetadata, preserveOriginal?: boolean, unwrapWrappedCollections?: boolean): any;
}
