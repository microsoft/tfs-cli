export interface IStringDictionary { [name: string]: string }
export interface IOptions { [name: string]: string }

export function endsWith(str: string, end:string): boolean {
    return str.slice(-end.length) == end;
}
