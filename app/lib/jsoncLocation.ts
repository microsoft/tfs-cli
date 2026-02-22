import * as jsonc from "jsonc-parser";

export interface JsoncPointerContext {
	sourceText: string;
	root: any;
}

export function escapeJsonPointerToken(token: string): string {
	return token.replace(/~/g, "~0").replace(/\//g, "~1");
}

function decodeJsonPointerToken(token: string): string {
	return token.replace(/~1/g, "/").replace(/~0/g, "~");
}

export function pointerLocation(
	pointerContext: JsoncPointerContext | null | undefined,
	pointerPath: string,
): { line: number | null; col: number | null } {
	if (!pointerContext || !pointerContext.root || typeof pointerContext.sourceText !== "string") {
		return { line: null, col: null };
	}

	const segments =
		pointerPath === ""
			? []
			: pointerPath
					.split("/")
					.slice(1)
					.map(token => decodeJsonPointerToken(token))
					.map(token => (/^\d+$/.test(token) ? parseInt(token, 10) : token));

	const node = jsonc.findNodeAtLocation(pointerContext.root, segments);
	if (!node) {
		return { line: null, col: null };
	}

	const locationNode = node.parent && node.parent.type === "property" ? node.parent : node;
	return offsetToLineCol(pointerContext.sourceText, locationNode.offset);
}

export function offsetToLineCol(text: string, offset: number): { line: number; col: number } {
	let line = 1;
	let col = 1;

	for (let i = 0; i < offset && i < text.length; i++) {
		const ch = text.charCodeAt(i);
		if (ch === 13) {
			if (i + 1 < text.length && text.charCodeAt(i + 1) === 10) {
				i++;
			}
			line++;
			col = 1;
		} else if (ch === 10) {
			line++;
			col = 1;
		} else {
			col++;
		}
	}

	return { line, col };
}
