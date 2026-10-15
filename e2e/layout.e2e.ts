import { expect, test } from '@playwright/test';

const paths = ['/', '/themes', '/themes?appearance=light', '/extensions/catppuccin'];
const widths = [390, 768, 1024, 1440];

// The /themes preview glow spreads sideways; it once made narrow screens scroll horizontally
for (const path of paths) {
	for (const width of widths) {
		test(`${path} doesn't scroll sideways at ${width}px`, async ({ page }) => {
			await page.setViewportSize({ width, height: 900 });
			await page.goto(path, { waitUntil: 'networkidle' });
			const { scrollWidth, clientWidth } = await page.evaluate(() => ({
				scrollWidth: document.documentElement.scrollWidth,
				clientWidth: document.documentElement.clientWidth
			}));
			expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
		});
	}
}

test('the film grain is hidden when printing', async ({ page }) => {
	await page.goto('/');
	await page.emulateMedia({ media: 'print' });
	const display = await page.evaluate(() => getComputedStyle(document.body, '::before').display);
	expect(display).toBe('none');
});
