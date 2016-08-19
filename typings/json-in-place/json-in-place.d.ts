declare class InPlace {
    public set: (path: string, value: any) => InPlace;
    public toString: () => string;
}

declare const JSONInPlace: (json: string) => InPlace;

declare module "json-in-place" {
    export = JSONInPlace;
}