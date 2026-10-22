import { expect, test } from '@playwright/test';

const paths = ['/', '/themes', '/themes?appearance=light', '/extensions/catppuccin'];
// 320 and 360: the header's search button has to fit beside the links on small phones
const widths = [320, 360, 390, 768, 1024, 1440];

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

// Squeezed headers don't scroll sideways, they overlap: the links slid under the logo when the
// search button first joined them on phones
// 399–414 px: Themes once stayed on at 399 and up and squeezed the logo to 0–15 px (iPhone 16 Pro: 402)
for (const width of [320, 360, 390, 399, 402, 414, 420]) {
	test(`the header's logo and links keep apart at ${width}px`, async ({ page }) => {
		await page.setViewportSize({ width, height: 800 });
		await page.goto('/extensions/catppuccin');
		const { logoRight, navLeft, navRight } = await page.evaluate(() => {
			const logo = document.querySelector('header a[href="/"]')!.getBoundingClientRect();
			const nav = document.querySelector('header nav')!.getBoundingClientRect();
			return { logoRight: logo.right, navLeft: nav.left, navRight: nav.right };
		});
		expect(navLeft - logoRight).toBeGreaterThanOrEqual(12);
		expect(navRight).toBeLessThanOrEqual(width);
	});
}

// The accent was once group-hover:border-l-*, on the .group element itself, so it never matched
test('hovering an extension card colors its left border', async ({ page }) => {
	await page.emulateMedia({ reducedMotion: 'reduce' }); // no border-color transition
	await page.goto('/');
	const card = page.locator('a.card-hover').first();
	const leftDiffersFromTop = () =>
		card.evaluate((a) => {
			const style = getComputedStyle(a);
			return style.borderLeftColor !== style.borderTopColor;
		});
	expect(await leftDiffersFromTop()).toBe(false);
	await card.hover();
	await expect.poll(leftDiffersFromTop).toBe(true); // only the left edge takes the accent
});

test('the film grain is hidden when printing', async ({ page }) => {
	await page.goto('/');
	await page.emulateMedia({ media: 'print' });
	const display = await page.evaluate(() => getComputedStyle(document.body, '::before').display);
	expect(display).toBe('none');
});

// Speed Insights was removed (lab numbers come from scripts/perf.ts); the privacy page no longer lists it
test('pages do not load the Speed Insights script', async ({ page }) => {
	await page.goto('/guides/vim', { waitUntil: 'networkidle' });
	await expect(page.locator('script[src*="speed-insights"]')).toHaveCount(0);
});
