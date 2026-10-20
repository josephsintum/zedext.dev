import { expect, test, type Page } from '@playwright/test';

const pageSearchBox = (page: Page) => page.getByRole('searchbox', { name: 'Search extensions' });

// Pages with their own search box: the shortcuts focus it (the window never opens there)
for (const path of ['/', '/extensions']) {
	test(`⌘K and / focus the search box on ${path}`, async ({ page }) => {
		await page.goto(path, { waitUntil: 'networkidle' });
		await page.keyboard.press('ControlOrMeta+k');
		await expect(pageSearchBox(page)).toBeFocused();
		await pageSearchBox(page).blur();
		await page.keyboard.press('/');
		await expect(pageSearchBox(page)).toBeFocused();
		await expect(pageSearchBox(page)).toHaveValue(''); // the "/" wasn't typed into it
	});
}

const dialog = (page: Page) => page.getByRole('dialog', { name: 'Search extensions' });
const field = (page: Page) => dialog(page).getByRole('combobox', { name: 'Search extensions' });
const headerButton = (page: Page) => page.getByRole('button', { name: /^Search extensions/ });
const scrollLocked = (page: Page) =>
	page.evaluate(() => document.documentElement.style.overflow === 'hidden');

test('⌘K opens the window, and Enter opens the top match', async ({ page }) => {
	await page.goto('/extensions/git-firefly', { waitUntil: 'networkidle' });
	await page.keyboard.press('ControlOrMeta+k');
	await expect(dialog(page)).toBeVisible();
	expect(await scrollLocked(page)).toBe(true);
	await field(page).fill('catppuccin');
	const first = dialog(page).getByRole('option').first();
	await expect(first).toHaveAttribute('aria-selected', 'true');
	await expect(first).toContainText('Catppuccin');
	await page.keyboard.press('Enter');
	await expect(page).toHaveURL(/\/extensions\/catppuccin$/);
	await expect(dialog(page)).toBeHidden();
	// The dialog fires `close` (which unlocks) a moment after it hides
	await expect.poll(() => scrollLocked(page)).toBe(false);
});

test('the window loads the long-cached, versioned search index', async ({ page }) => {
	await page.goto('/extensions/git-firefly', { waitUntil: 'networkidle' });
	const index = page.waitForRequest((req) => new URL(req.url()).pathname === '/extensions.json');
	await page.keyboard.press('ControlOrMeta+k');
	expect(new URL((await index).url()).searchParams.get('v')).toMatch(/^\d{4}-\d\d-\d\dT/);
});

test('the last row hands off to the full results page', async ({ page }) => {
	await page.goto('/extensions/git-firefly', { waitUntil: 'networkidle' });
	await headerButton(page).click();
	await field(page).fill('python');
	await expect(dialog(page).getByRole('option').first()).toHaveAttribute('aria-selected', 'true');
	await page.keyboard.press('ArrowUp'); // wraps from the first row to the last
	const seeAll = dialog(page).getByRole('option', { name: /^See all \d+ results for “python”/ });
	await expect(seeAll).toHaveAttribute('aria-selected', 'true');
	await page.keyboard.press('Enter');
	await expect(page).toHaveURL(/\/extensions\?q=python$/);
});

test('Esc closes the window and focus goes back to the header button', async ({ page }) => {
	await page.goto('/extensions/git-firefly', { waitUntil: 'networkidle' });
	await headerButton(page).click();
	await expect(dialog(page)).toBeVisible();
	await page.keyboard.press('Escape');
	await expect(dialog(page)).toBeHidden();
	await expect(headerButton(page)).toBeFocused();
	// The dialog fires `close` (which unlocks) a moment after it hides
	await expect.poll(() => scrollLocked(page)).toBe(false);
});

test('⌘K again closes the window', async ({ page }) => {
	await page.goto('/extensions/git-firefly', { waitUntil: 'networkidle' });
	await page.keyboard.press('ControlOrMeta+k');
	await expect(dialog(page)).toBeVisible();
	await page.keyboard.press('ControlOrMeta+k');
	await expect(dialog(page)).toBeHidden();
});

test('the empty window lists recently viewed extensions, newest first', async ({ page }) => {
	await page.goto('/extensions/oxc', { waitUntil: 'networkidle' });
	await page.goto('/extensions/java', { waitUntil: 'networkidle' });
	await page.keyboard.press('ControlOrMeta+k');
	await expect(dialog(page).getByText('Recently viewed')).toBeVisible();
	const options = dialog(page).getByRole('option');
	await expect(options).toHaveCount(2);
	await expect(options.nth(0)).toContainText('Java');
	await expect(options.nth(1)).toContainText('Oxc');
	await expect(options.nth(0)).toHaveAttribute('aria-selected', 'true');
});

test('choosing the extension you are on just closes the window', async ({ page }) => {
	await page.goto('/extensions/catppuccin', { waitUntil: 'networkidle' });
	await page.keyboard.press('ControlOrMeta+k');
	await field(page).fill('catppuccin');
	await expect(dialog(page).getByRole('option').first()).toContainText('Catppuccin');
	await page.keyboard.press('Enter');
	await expect(dialog(page)).toBeHidden();
	await expect(page).toHaveURL(/\/extensions\/catppuccin$/);
	// The dialog fires `close` (which unlocks) a moment after it hides
	await expect.poll(() => scrollLocked(page)).toBe(false);
});

test('pages with their own search box have no header button', async ({ page }) => {
	for (const path of ['/', '/extensions', '/languages']) {
		await page.goto(path, { waitUntil: 'networkidle' });
		await expect(headerButton(page)).toHaveCount(0);
	}
	await page.goto('/extensions/git-firefly', { waitUntil: 'networkidle' });
	await expect(headerButton(page)).toHaveCount(1);
});

test('/ typed into another field stays text', async ({ page }) => {
	await page.goto('/themes', { waitUntil: 'networkidle' });
	const filter = page.getByLabel('Filter themes');
	await filter.click();
	await page.keyboard.type('a/b');
	await expect(filter).toHaveValue('a/b');
	await expect(dialog(page)).toBeHidden();
	await filter.blur();
	await page.keyboard.press('/');
	await expect(dialog(page)).toBeVisible();
});

test('when the search index fails, the window links to the full results page', async ({ page }) => {
	await page.route('**/extensions.json*', (route) => route.fulfill({ status: 500, body: 'down' }));
	await page.goto('/extensions/git-firefly', { waitUntil: 'networkidle' });
	await page.keyboard.press('ControlOrMeta+k');
	await field(page).fill('rust');
	await expect(dialog(page).getByText('Search couldn’t load.')).toBeVisible();
	const link = dialog(page).getByRole('link', { name: 'See all results for “rust”' });
	await expect(link).toHaveAttribute('href', '/extensions?q=rust');
});

test('Enter before the index loads goes to the full results page', async ({ page }) => {
	await page.route('**/extensions.json*', async (route) => {
		await new Promise((resolve) => setTimeout(resolve, 10_000));
		await route.continue().catch(() => {}); // the page has moved on by then
	});
	await page.goto('/extensions/git-firefly', { waitUntil: 'networkidle' });
	await page.keyboard.press('ControlOrMeta+k');
	await field(page).fill('rust');
	await expect(dialog(page).getByText('Searching…')).toBeVisible();
	await page.keyboard.press('Enter');
	await expect(page).toHaveURL(/\/extensions\?q=rust$/);
});

test.describe('on a phone', () => {
	test.use({ viewport: { width: 390, height: 844 } });

	test('the magnifier opens a full-screen window that Cancel closes', async ({ page }) => {
		await page.goto('/extensions/git-firefly', { waitUntil: 'networkidle' });
		await page.getByRole('button', { name: 'Search extensions', exact: true }).click();
		const box = await dialog(page).boundingBox();
		expect(box && Math.round(box.width)).toBe(390);
		expect(box && Math.round(box.height)).toBe(844);
		const cancel = dialog(page).getByRole('button', { name: 'Cancel' });
		expect((await cancel.boundingBox())!.height).toBeGreaterThanOrEqual(44);
		await cancel.click();
		await expect(dialog(page)).toBeHidden();
	});
});

// --- Found in the final reviews ---

test('selecting the query by dragging past the window keeps it open', async ({ page }) => {
	await page.goto('/extensions/git-firefly', { waitUntil: 'networkidle' });
	await page.keyboard.press('ControlOrMeta+k');
	await field(page).fill('python');
	const box = (await field(page).boundingBox())!;
	await page.mouse.move(box.x + box.width - 5, box.y + box.height / 2);
	await page.mouse.down();
	await page.mouse.move(box.x + 5, box.y + 300); // ends on the backdrop, below-left of the panel
	await page.mouse.move(5, 700);
	await page.mouse.up();
	await expect(dialog(page)).toBeVisible();
	await expect(field(page)).toHaveValue('python');
	await page.mouse.click(5, 700); // a real click on the backdrop still closes
	await expect(dialog(page)).toBeHidden();
});

test('Enter that finishes an IME composition stays in the field', async ({ page }) => {
	await page.goto('/extensions/git-firefly', { waitUntil: 'networkidle' });
	await page.keyboard.press('ControlOrMeta+k');
	await field(page).fill('rust');
	await expect(dialog(page).getByRole('option').first()).toHaveAttribute('aria-selected', 'true');
	await field(page).evaluate((el) =>
		el.dispatchEvent(
			new KeyboardEvent('keydown', { key: 'Enter', isComposing: true, bubbles: true })
		)
	);
	await page.waitForTimeout(300);
	await expect(page).toHaveURL(/\/extensions\/git-firefly$/);
	await expect(dialog(page)).toBeVisible();
});

test('opening the extension you are on keeps your place on the page', async ({ page }) => {
	await page.goto('/extensions/catppuccin', { waitUntil: 'networkidle' });
	await page.evaluate(() => window.scrollTo(0, 1200));
	const before = await page.evaluate(() => scrollY);
	expect(before).toBeGreaterThan(0);
	await page.keyboard.press('ControlOrMeta+k');
	await field(page).fill('catppuccin');
	await expect(dialog(page).getByRole('option').first()).toContainText('Catppuccin');
	await page.keyboard.press('Enter');
	await expect(dialog(page)).toBeHidden();
	await page.waitForTimeout(300);
	expect(await page.evaluate(() => scrollY)).toBe(before);
});

test('screen readers hear when search is loading or failed', async ({ page }) => {
	await page.route('**/extensions.json*', (route) => route.fulfill({ status: 500, body: 'down' }));
	await page.goto('/extensions/git-firefly', { waitUntil: 'networkidle' });
	await page.keyboard.press('ControlOrMeta+k');
	await field(page).fill('rust');
	await expect(dialog(page).locator('[aria-live="polite"]')).toHaveText(/Search couldn’t load/);
});

test('a keydown without a key (autofill) is ignored without errors', async ({ page }) => {
	const errors: string[] = [];
	page.on('pageerror', (err) => errors.push(err.message));
	await page.goto('/extensions/git-firefly', { waitUntil: 'networkidle' });
	await page.evaluate(() => window.dispatchEvent(new Event('keydown')));
	await page.waitForTimeout(100);
	expect(errors).toEqual([]);
});

test('the listbox says when it has nothing to show, and the esc button says what it does', async ({
	page
}) => {
	await page.goto('/extensions/git-firefly', { waitUntil: 'networkidle' });
	await page.keyboard.press('ControlOrMeta+k');
	await field(page).fill('zzzzqx');
	await expect(dialog(page).getByText('No extensions match “zzzzqx”')).toBeVisible();
	await expect(field(page)).toHaveAttribute('aria-expanded', 'false');
	await field(page).fill('rust');
	await expect(field(page)).toHaveAttribute('aria-expanded', 'true');
	await expect(dialog(page).getByRole('button', { name: 'Close (esc)' })).toBeVisible();
});

test('"See all" is in view on a laptop screen without scrolling', async ({ page }) => {
	await page.setViewportSize({ width: 1440, height: 900 });
	await page.goto('/extensions/git-firefly', { waitUntil: 'networkidle' });
	await page.keyboard.press('ControlOrMeta+k');
	await field(page).fill('python');
	const seeAll = dialog(page).getByRole('option', { name: /^See all \d+ results/ });
	await expect(seeAll).toBeVisible();
	const row = (await seeAll.boundingBox())!;
	const panel = (await dialog(page).boundingBox())!;
	expect(row.y + row.height).toBeLessThanOrEqual(panel.y + panel.height);
});

test("the window's list keeps scrolling to itself", async ({ page }) => {
	await page.goto('/extensions/git-firefly', { waitUntil: 'networkidle' });
	await page.keyboard.press('ControlOrMeta+k');
	const overscroll = await dialog(page)
		.getByRole('listbox')
		.evaluate((el) => getComputedStyle(el.closest('.overflow-y-auto')!).overscrollBehaviorY);
	expect(overscroll).toBe('contain');
});

test.describe('in dark mode', () => {
	test.use({ colorScheme: 'dark' });

	test('the highlighted row stands out and the backdrop dims more', async ({ page }) => {
		await page.goto('/extensions/git-firefly', { waitUntil: 'networkidle' });
		await page.keyboard.press('ControlOrMeta+k');
		await field(page).fill('python');
		const first = dialog(page).getByRole('option').first();
		await expect(first).toHaveAttribute('aria-selected', 'true');
		expect(await first.evaluate((el) => getComputedStyle(el).boxShadow)).not.toBe('none');
		await expect(first.getByText('↵')).toBeVisible();
		await expect(dialog(page).getByRole('option').nth(1).getByText('↵')).toBeHidden();
		const backdrop = await dialog(page).evaluate(
			(el) => getComputedStyle(el, '::backdrop').backgroundColor
		);
		expect(backdrop).toMatch(/0\.5\)$/);
	});
});

test.describe('on a Mac', () => {
	test.use({
		userAgent:
			'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
	});

	test('Ctrl+K stays the text-field shortcut; ⌘K opens the window', async ({ page }) => {
		await page.goto('/themes', { waitUntil: 'networkidle' });
		await expect(headerButton(page)).toContainText('⌘K');
		await page.getByLabel('Filter themes').click();
		await page.keyboard.press('Control+k');
		await expect(dialog(page)).toBeHidden();
		await page.keyboard.press('Meta+k');
		await expect(dialog(page)).toBeVisible();
	});
});
