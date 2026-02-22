export interface DiagnosticIssue {
	file: string | null;
	line: number | null;
	col: number | null;
	message: string;
}

export type DiagnosticSeverity = "warning" | "error";

export function normalizeIssue(issue: any): DiagnosticIssue {
	return {
		file: issue && issue.file !== undefined ? String(issue.file) : null,
		line: issue && typeof issue.line === "number" ? issue.line : null,
		col: issue && typeof issue.col === "number" ? issue.col : null,
		message: issue && issue.message ? String(issue.message) : String(issue),
	};
}

export function formatDiagnostic(issue: any, severity: DiagnosticSeverity = "error"): string {
	const normalized = normalizeIssue(issue);

	if (normalized.file && normalized.line !== null && normalized.col !== null) {
		return `${normalized.file}(${normalized.line},${normalized.col}): ${severity}: ${normalized.message}`;
	}
	if (normalized.file && normalized.line !== null) {
		return `${normalized.file}(${normalized.line}): ${severity}: ${normalized.message}`;
	}
	if (normalized.file) {
		return `${normalized.file}: ${severity}: ${normalized.message}`;
	}
	return `${severity}: ${normalized.message}`;
}
