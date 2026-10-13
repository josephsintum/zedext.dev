import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { getPreviews } from '$lib/server/previews.js';
import type { ThemeColors } from '$lib/theme-preview.js';

let fontDataCache: ArrayBuffer | null = null;
let fontBoldCache: ArrayBuffer | null = null;

async function loadFont(weight: 400 | 700): Promise<ArrayBuffer> {
	if (weight === 400 && fontDataCache) return fontDataCache;
	if (weight === 700 && fontBoldCache) return fontBoldCache;

	const res = await fetch(
		`https://cdn.jsdelivr.net/fontsource/fonts/geist-sans@latest/latin-${weight}-normal.woff`
	);
	if (!res.ok) throw new Error(`Failed to load font: ${res.status}`);
	const buf = await res.arrayBuffer();

	if (weight === 400) fontDataCache = buf;
	else fontBoldCache = buf;
	return buf;
}

/** A code card drawn in the theme's own colors (all validated hex values). */
function themeCard(title: string, c: ThemeColors) {
	const line = (parts: [string, string][]) => ({
		type: 'div',
		props: {
			style: { display: 'flex', whiteSpace: 'pre' },
			children: parts.map(([text, color]) => ({
				type: 'span',
				props: { style: { color }, children: text }
			}))
		}
	});
	return {
		type: 'div',
		props: {
			style: {
				width: '100%',
				height: '100%',
				display: 'flex',
				flexDirection: 'column',
				padding: '48px',
				background: c.status,
				fontFamily: 'Geist Sans'
			},
			children: [
				{
					type: 'div',
					props: {
						style: {
							display: 'flex',
							justifyContent: 'space-between',
							alignItems: 'baseline',
							marginBottom: '28px'
						},
						children: [
							{
								type: 'span',
								props: {
									style: { fontSize: '48px', fontWeight: 700, color: c.fg },
									children: title
								}
							},
							{
								type: 'span',
								props: { style: { fontSize: '22px', color: c.comment }, children: 'zedext.dev' }
							}
						]
					}
				},
				{
					type: 'div',
					props: {
						style: {
							display: 'flex',
							flexDirection: 'column',
							flex: 1,
							background: c.bg,
							border: `2px solid ${c.border}`,
							borderRadius: '16px',
							padding: '36px 40px',
							fontSize: '30px',
							lineHeight: 1.6,
							color: c.fg
						},
						children: [
							line([['// Load settings, retrying a few times', c.comment]]),
							line([
								['fn ', c.keyword],
								['load_config', c.function],
								['(', c.punct],
								['path', c.variable],
								[': &', c.punct],
								['str', c.type],
								[') -> ', c.punct],
								['Result', c.type],
								['<Config> {', c.punct]
							]),
							line([
								['    let ', c.keyword],
								['retries', c.variable],
								[' = ', c.punct],
								['3', c.number],
								[';', c.punct]
							]),
							line([
								['    let ', c.keyword],
								['name', c.variable],
								[' = ', c.punct],
								['"settings.json"', c.string],
								[';', c.punct]
							]),
							line([
								['    Ok', c.type],
								['(', c.punct],
								['Config', c.type],
								[' { ', c.punct],
								['retries', c.variable],
								[', ', c.punct],
								['name', c.variable],
								[' })', c.punct]
							]),
							line([['}', c.punct]])
						]
					}
				}
			]
		}
	};
}

export const GET: RequestHandler = async ({ url, setHeaders }) => {
	const title = url.searchParams.get('title') || 'ZedExt';
	const description = url.searchParams.get('description') || 'Discover Zed Extensions';
	const type = url.searchParams.get('type') || 'default';
	const themeColors =
		type === 'theme'
			? ((await getPreviews())?.themes[url.searchParams.get('id') ?? '']?.variants[0]?.colors ??
				null)
			: null;

	const [fontRegular, fontBold] = await Promise.all([loadFont(400), loadFont(700)]);

	const badge = type === 'extension' ? 'Extension' : type === 'author' ? 'Author' : null;

	const defaultCard = {
		type: 'div',
		props: {
			style: {
				width: '100%',
				height: '100%',
				display: 'flex',
				flexDirection: 'column',
				justifyContent: 'space-between',
				padding: '60px 70px',
				backgroundColor: '#111216',
				color: '#fafaf9',
				fontFamily: 'Geist Sans'
			},
			children: [
				{
					type: 'div',
					props: {
						style: { display: 'flex', flexDirection: 'column', gap: '16px' },
						children: [
							badge
								? {
										type: 'div',
										props: {
											style: {
												display: 'flex',
												fontSize: '20px',
												color: '#a1a1aa',
												letterSpacing: '0.05em',
												textTransform: 'uppercase'
											},
											children: badge
										}
									}
								: null,
							{
								type: 'div',
								props: {
									style: {
										fontSize: title.length > 30 ? '48px' : '56px',
										fontWeight: 700,
										lineHeight: 1.15,
										letterSpacing: '-0.02em',
										overflow: 'hidden',
										textOverflow: 'ellipsis',
										maxHeight: '200px'
									},
									children: title
								}
							},
							description
								? {
										type: 'div',
										props: {
											style: {
												fontSize: '24px',
												color: '#a1a1aa',
												lineHeight: 1.4,
												overflow: 'hidden',
												textOverflow: 'ellipsis',
												maxHeight: '100px'
											},
											children:
												description.length > 120 ? description.slice(0, 120) + '...' : description
										}
									}
								: null
						].filter(Boolean)
					}
				},
				{
					type: 'div',
					props: {
						style: {
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'space-between'
						},
						children: [
							{
								type: 'div',
								props: {
									style: {
										display: 'flex',
										alignItems: 'center',
										gap: '12px',
										fontSize: '24px',
										fontWeight: 700,
										letterSpacing: '-0.01em'
									},
									children: [
										{
											type: 'div',
											props: {
												style: {
													width: '36px',
													height: '36px',
													borderRadius: '8px',
													backgroundColor: '#fafaf9',
													display: 'flex',
													alignItems: 'center',
													justifyContent: 'center'
												},
												children: {
													type: 'div',
													props: {
														style: {
															color: '#111216',
															fontSize: '20px',
															fontWeight: 700
														},
														children: 'Z'
													}
												}
											}
										},
										'ZedExt'
									]
								}
							},
							{
								type: 'div',
								props: {
									style: { fontSize: '20px', color: '#71717a' },
									children: 'zedext.dev'
								}
							}
						]
					}
				}
			]
		}
	};

	let svg: string;
	try {
		svg = await satori(
			(themeColors ? themeCard(title, themeColors) : defaultCard) as Parameters<typeof satori>[0],
			{
				width: 1200,
				height: 630,
				fonts: [
					{ name: 'Geist Sans', data: fontRegular, weight: 400, style: 'normal' },
					{ name: 'Geist Sans', data: fontBold, weight: 700, style: 'normal' }
				]
			}
		);
	} catch (err) {
		console.error('Satori render failed:', err);
		throw error(500, 'Failed to generate OG image');
	}

	const resvg = new Resvg(svg, {
		fitTo: { mode: 'width', value: 1200 }
	});
	const png = resvg.render().asPng();

	setHeaders({
		'content-type': 'image/png',
		'cache-control': 'public, s-maxage=604800, stale-while-revalidate=2592000'
	});

	return new Response(new Uint8Array(png));
};
