// Type definitions for copy-paste
// Project: https://github.com/xavi-/node-copy-paste

declare module 'copy-paste' {

	interface ClipboardFunctions {
		copy: (text: string, callback?: (err: NodeJS.ErrnoException, text: string) => void) => void;
		paste: ((callback: (err: NodeJS.ErrnoException, text: string) => void) => void |
			   (() => string));
	}
	
	interface CopyPaste extends ClipboardFunctions {
		global: () => ClipboardFunctions;
	}
	
	var copyPaste: CopyPaste;
	
	export = copyPaste;
}
