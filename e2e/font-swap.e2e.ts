import { expect, test } from '@playwright/test';

// Text first shows in a fallback font and swaps to Plex Sans when it arrives. If the fallback
// is wider, lines wrap differently and everything below jumps when the swap happens: /themes
// once moved its preview 28 px at 390 px (CLS 0.175). Fonts are held back here so the swap
// lands after the first paint, as it does on a slow connection.
const paths = ['/', '/themes', '/extensions', '/extensions/catppuccin'];

for (const path of paths) {
	for (const width of [360, 390, 414, 1280]) {
		test(`${path} doesn't shift when the fonts swap in at ${width}px`, async ({ page }) => {
			await page.route('**/*.woff2', async (route) => {
				await new Promise((resolve) => setTimeout(resolve, 800));
				await route.continue();
			});
			await page.setViewportSize({ width, height: 844 });
			await page.goto(path);
			await page.evaluate(() => document.fonts.ready);
			await page.waitForTimeout(300);

			const shift = await page.evaluate(
				() =>
					new Promise<number>((resolve) => {
						new PerformanceObserver((list) =>
							resolve(
								list
									.getEntries()
									.reduce((sum, e) => sum + (e as unknown as { value: number }).value, 0)
							)
						).observe({ type: 'layout-shift', buffered: true });
						setTimeout(() => resolve(0), 300);
					})
			);
			expect(shift).toBeLessThan(0.05);
		});
	}
}

// The fallback face stands in for Plex only while it loads. Characters Plex doesn't have (→, ↗,
// non-Latin scripts) must keep falling through to the system font, not to Arial
test('characters Plex lacks still use the system font once fonts load', async ({ page }) => {
	await page.goto('/themes', { waitUntil: 'networkidle' });
	await page.evaluate(() => document.fonts.ready);
	const cdp = await page.context().newCDPSession(page);
	await cdp.send('DOM.enable');
	await cdp.send('CSS.enable');
	const { root } = await cdp.send('DOM.getDocument');
	const { nodeId } = await cdp.send('DOM.querySelector', {
		nodeId: root.nodeId,
		selector: 'a[href^="/extensions/"].text-accent'
	});
	const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId });
	expect(fonts.map((f) => f.familyName)).toContain('IBM Plex Sans');
	expect(fonts.map((f) => f.familyName)).not.toContain('Arial');
});
