import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';

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

export const GET: RequestHandler = async ({ url, setHeaders }) => {
	const title = url.searchParams.get('title') || 'ZedExt';
	const description = url.searchParams.get('description') || 'Discover Zed Extensions';
	const type = url.searchParams.get('type') || 'default';

	const [fontRegular, fontBold] = await Promise.all([loadFont(400), loadFont(700)]);

	const badge =
		type === 'extension'
			? 'Extension'
			: type === 'author'
				? 'Author'
				: null;

	let svg: string;
	try {
		svg = await satori(
			{
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
														description.length > 120
															? description.slice(0, 120) + '...'
															: description
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
			},
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
