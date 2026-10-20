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
