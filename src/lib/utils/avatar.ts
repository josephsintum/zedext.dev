/**
 * A GitHub avatar sized for display: GitHub sends 460 px (~24 KB) unless asked, so request
 * the CSS size times the screen's pixel ratio. Other hosts pass through unchanged.
 */
export function avatarUrl(url: string, px: number, scale = 2): string {
	let parsed: URL;
	try {
		parsed = new URL(url);
	} catch {
		return url;
	}
	if (parsed.hostname !== 'avatars.githubusercontent.com') return url;
	parsed.searchParams.set('s', String(px * scale));
	return parsed.href;
}

/** 2× and 3× versions, so 3× phones stay sharp (1× screens take the 2× one) */
export function avatarSrcset(url: string, px: number): string {
	return `${avatarUrl(url, px, 2)} 2x, ${avatarUrl(url, px, 3)} 3x`;
}
