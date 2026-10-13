const SIZE = 16;
const GAP = 6;

/**
 * A row of icons as one SVG for an <img>. Each icon is embedded as a base64 data URI, so
 * its markup is never parsed as part of this document (and images can't run scripts).
 */
export function iconStripSvg(svgs: string[]): string {
	const width = Math.max(svgs.length * (SIZE + GAP) - GAP, SIZE);
	const images = svgs
		.map(
			(svg, i) =>
				`<image x="${i * (SIZE + GAP)}" y="0" width="${SIZE}" height="${SIZE}" href="data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}"/>`
		)
		.join('');
	return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${SIZE}" viewBox="0 0 ${width} ${SIZE}">${images}</svg>`;
}
