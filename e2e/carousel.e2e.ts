import { expect, test, type Page } from '@playwright/test';

/**
 * The Featured card that's only partly in the row (it peeks in at the right edge), or null when
 * the data gives no such card: no Featured row, or every card fits. Never the first card, so the
 * Tab test always has one before it.
 */
async function peekingCard(page: Page) {
	return page.evaluate(() => {
		const row = document.querySelector('section:has(#featured) .snap-x');
		if (!row) return null;
		row.scrollIntoView({ block: 'center' });
		const rowBox = row.getBoundingClientRect();
		const links = [...row.querySelectorAll('a')];
		const index = links.findIndex((a) => {
			const b = a.getBoundingClientRect();
			return b.left < rowBox.right - 30 && b.right > rowBox.right;
		});
		if (index < 1) return null;
		const box = links[index].getBoundingClientRect();
		// Top-left of the card: its middle is under the "next" arrow button
		return { index, href: links[index].getAttribute('href')!, x: box.left + 20, y: box.top + 24 };
	});
}

// Chrome focuses a link on mousedown; scrolling the snapping row then once moved another card
// under the pointer, so the click opened nothing. Worst with reduced motion (an instant jump)
test.describe('clicking the peeking carousel card', () => {
	test.use({ reducedMotion: 'reduce' });
	for (const width of [1280, 700]) {
		test(`opens it at ${width}px`, async ({ page }) => {
			await page.setViewportSize({ width, height: 900 });
			await page.goto('/', { waitUntil: 'networkidle' });
			const card = await peekingCard(page);
			test.skip(!card, 'No Featured card peeks past the row edge with the current data');
			await page.mouse.move(card!.x, card!.y);
			await page.mouse.down();
			await page.waitForTimeout(250); // a slow click
			await page.mouse.up();
			// Compared as URLs, not a regex, so ids with '.' or '(' match literally
			await expect(page).toHaveURL((url) => url.pathname === new URL(card!.href, url).pathname);
		});
	}
});

test('tabbing onto the peeking carousel card brings it fully into view', async ({ page }) => {
	await page.setViewportSize({ width: 1280, height: 900 });
	await page.goto('/', { waitUntil: 'networkidle' });
	const card = await peekingCard(page);
	test.skip(!card, 'No Featured card peeks past the row edge with the current data');
	await page.evaluate((index) => {
		const links = document.querySelectorAll<HTMLAnchorElement>('section:has(#featured) .snap-x a');
		links[index - 1].focus();
	}, card!.index);
	await page.keyboard.press('Tab');
	await expect(page.locator(':focus')).toHaveAttribute('href', card!.href);
	await expect
		.poll(() =>
			page.evaluate(() => {
				const row = document
					.querySelector('section:has(#featured) .snap-x')!
					.getBoundingClientRect();
				const focused = document.activeElement!.getBoundingClientRect();
				return focused.left >= row.left - 1 && focused.right <= row.right + 1;
			})
		)
		.toBe(true);
});
