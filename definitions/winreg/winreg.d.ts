// Type definitions for winreg 0.0.12
// Project: https://www.npmjs.com/package/winreg

declare module "winreg" {
	export = winreg;
}
	
interface WinregOptions {
	host?: string;
	hive: Hive;
	key: string;
}

declare enum Hive {
	HKLM,
	HKCU,
	HKCR,
	HKCC,
	HKU
}

interface WinregValue {
	host: string;
	hive: string;
	key: string;
	name: string;
	type: string;
	value: string;
}

interface Winreg {
	new (options: WinregOptions): Winreg;
	host: string;
	hive: string;
	key: string;
	path: string;
	parent: Winreg;
	
	values: (callback: WinregCallback<WinregValue[]>) => void;
	keys: (callback: WinregCallback<string[]>) => void;
	get: (name: string, callback: WinregCallback<WinregValue>) => void;
	set: (name: string, type: string, value: WinregValue, callback: WinregCallback<void>) => void;
	remove: (name: string, callback: WinregCallback<void>) => void;
	create: (callback: WinregCallback<void>) => void;
	erase: (callback: WinregCallback<void>) => void;
	
	HKLM: Hive;
	HKCU: Hive;
	HKCR: Hive;
	HKCC: Hive;
	HKU: Hive;
}

interface WinregCallback<T> {
	(err: NodeJS.ErrnoException, val: T): void;
}

declare var winreg: Winreg;
