/** Exact-word matching on an extension's id and name (not its description). */
export function nameWords(r: { id: string; name: string }): Set<string> {
	return new Set(
		`${r.id} ${r.name}`
			.toLowerCase()
			.split(/[^a-z0-9+]+/)
			.filter(Boolean)
	);
}

/** Exact words only: prefix matching would put "javascript" in the Java hub */
export function hasKeyword(words: Set<string>, keywords: string[]): boolean {
	return keywords.some((k) => words.has(k));
}
