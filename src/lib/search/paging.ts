/** Results per "Show more" step on browse pages. */
export const PER_PAGE = 24;

/** Most pages a ?page= link can ask the server to render at once. */
export const MAX_SERVER_PAGES = 20;

/** The number of pages a `?page=` value asks for: at least 1, at most `max`. */
export function clampPage(value: string | null, max = Infinity): number {
	const n = Number.parseInt(value ?? '', 10);
	return Number.isFinite(n) ? Math.min(Math.max(n, 1), max) : 1;
}
