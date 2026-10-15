import { expect, test, type Page } from '@playwright/test';

// The Most popular row is always on the homepage with 16 cards, so one always peeks at the edge
const ROW = 'section:has(#popular) .snap-x';

/** The carousel card that's only partly in the row (it peeks in at the right edge) */
async function peekingCard(page: Page) {
	const card = await page.evaluate((selector) => {
		const row = document.querySelector(selector);
		if (!row) return null;
		row.scrollIntoView({ block: 'center' });
		const rowBox = row.getBoundingClientRect();
		const links = [...row.querySelectorAll('a')];
		const index = links.findIndex((a) => {
			const b = a.getBoundingClientRect();
			return b.left < rowBox.right - 30 && b.right > rowBox.right;
		});
		if (index < 0) return null;
		const box = links[index].getBoundingClientRect();
		// Top-left of the card: its middle is under the "next" arrow button
		return { index, href: links[index].getAttribute('href')!, x: box.left + 20, y: box.top + 24 };
	}, ROW);
	expect(card, 'a Most popular card peeking past the row edge').not.toBeNull();
	return card!;
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
			await page.mouse.move(card.x, card.y);
			await page.mouse.down();
			await page.waitForTimeout(250); // a slow click
			await page.mouse.up();
			await expect(page).toHaveURL(card.href); // resolved against baseURL, matched exactly
		});
	}
});

test('tabbing onto the peeking carousel card brings it fully into view', async ({ page }) => {
	await page.setViewportSize({ width: 1280, height: 900 });
	await page.goto('/', { waitUntil: 'networkidle' });
	const card = await peekingCard(page);
	expect(card.index, 'a card before the peeking one to Tab from').toBeGreaterThan(0);
	await page.evaluate(
		({ selector, index }) => {
			document.querySelectorAll<HTMLAnchorElement>(`${selector} a`)[index - 1].focus();
		},
		{ selector: ROW, index: card.index }
	);
	await page.keyboard.press('Tab');
	await expect(page.locator(':focus')).toHaveAttribute('href', card.href);
	await expect
		.poll(() =>
			page.evaluate((selector) => {
				const row = document.querySelector(selector)!.getBoundingClientRect();
				const focused = document.activeElement!.getBoundingClientRect();
				return focused.left >= row.left - 1 && focused.right <= row.right + 1;
			}, ROW)
		)
		.toBe(true);
});
