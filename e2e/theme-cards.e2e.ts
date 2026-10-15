import { expect, test, type Page } from '@playwright/test';

const CIRCLE = 'span.rounded-full[style*="box-shadow"]';

/** How far the least round circle on the first theme card is from round, in px */
async function worstCircle(page: Page) {
	// Theme-card circles carry a ring in the theme's background (box-shadow); other round
	// things, like the dot in an extension card's LSP pill, don't
	const card = page
		.locator(CIRCLE)
		.first()
		.locator('xpath=ancestor::*[self::a or self::button][1]');
	await card.scrollIntoViewIfNeeded();
	const measure = () =>
		card.evaluate((c) =>
			Math.max(
				...[...c.querySelectorAll<HTMLElement>('span.rounded-full[style*="box-shadow"]')].map(
					(s) => {
						const r = s.getBoundingClientRect();
						return Math.abs(r.width - r.height);
					}
				)
			)
		);
	const rest = await measure();
	await card.hover();
	await page.waitForTimeout(300); // the hover spread animates for 200ms
	return { rest, hover: await measure() };
}

// Six circles once didn't fit narrow cards and squashed into ovals (phones, homepage at ~660px)
for (const path of ['/', '/themes']) {
	for (const width of [320, 360, 660, 1280]) {
		test(`theme card circles stay round on ${path} at ${width}px`, async ({ page }) => {
			await page.setViewportSize({ width, height: 900 });
			await page.goto(path, { waitUntil: 'networkidle' });
			const { rest, hover } = await worstCircle(page);
			expect(rest).toBeLessThan(0.5);
			expect(hover).toBeLessThan(0.5);
		});
	}
}
