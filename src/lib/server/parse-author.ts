export function parseAuthor(author: string): { name: string; email: string | null } {
	const match = author.match(/^(.+?)\s*<([^>]+)>$/);
	if (match) return { name: match[1].trim(), email: match[2] };
	return { name: author.trim(), email: null };
}

export function parseAuthorNames(authors: string[]): string[] {
	return authors.map((a) => parseAuthor(a).name);
}
