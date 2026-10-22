/**
 * Content negotiation for pages that also come as Markdown (acceptmarkdown.com, RFC 9110 §12.5.1).
 * Each representation takes the q of the most specific Accept range matching it (text/markdown
 * over text/* over *\/*); the higher q wins, then the more specific match. HTML is the default:
 * it wins a full tie, unless the client named text/markdown itself (browsers never do).
 */
export type PageFormat = 'html' | 'markdown';

interface MediaRange {
	type: string;
	subtype: string;
	q: number;
}

function parseAccept(accept: string): MediaRange[] {
	return accept.split(',').flatMap((part) => {
		const [range, ...params] = part.split(';').map((s) => s.trim().toLowerCase());
		const [type, subtype] = range.split('/');
		if (!type || !subtype) return [];
		const qParam = params.find((p) => p.startsWith('q='));
		const q = qParam ? Number(qParam.slice(2)) : 1;
		return [{ type, subtype, q: Number.isFinite(q) ? Math.min(Math.max(q, 0), 1) : 1 }];
	});
}

/** The q given to text/<subtype>, and how specific the deciding range was (2 exact, 0 *\/*) */
function rank(ranges: MediaRange[], subtype: string): { q: number; specificity: number } {
	let best = { q: 0, specificity: -1 };
	for (const r of ranges) {
		const specificity =
			r.type === 'text' && r.subtype === subtype
				? 2
				: r.type === 'text' && r.subtype === '*'
					? 1
					: r.type === '*' && r.subtype === '*'
						? 0
						: -1;
		if (specificity > best.specificity) best = { q: r.q, specificity };
	}
	return best;
}

/** Which representation to send, or null when the client accepts neither (406) */
export function preferredFormat(accept: string | null): PageFormat | null {
	const ranges = parseAccept(accept ?? '');
	// No header, or nothing parseable in it: no constraint
	if (ranges.length === 0) return 'html';

	const html = rank(ranges, 'html');
	const markdown = rank(ranges, 'markdown');
	if (html.q === 0 && markdown.q === 0) return null;
	if (html.q !== markdown.q) return markdown.q > html.q ? 'markdown' : 'html';
	if (html.specificity !== markdown.specificity) {
		return markdown.specificity > html.specificity ? 'markdown' : 'html';
	}
	return markdown.specificity === 2 ? 'markdown' : 'html';
}
