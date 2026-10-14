/**
 * Keyboard support for a tablist, as `{@attach tabKeys}` on the element with role="tablist":
 * Arrow Left/Right move to the previous/next tab (wrapping), Home/End to the first/last, and
 * the tab that receives focus is selected. Pair it with roving tabindex on the tabs
 * (0 on the selected one, -1 on the rest) so Tab moves into and out of the list in one step.
 */
export function tabKeys(list: HTMLElement): () => void {
	function onkeydown(e: KeyboardEvent) {
		// Leave browser shortcuts alone (Alt+Left and Cmd+Left go Back)
		if (e.altKey || e.metaKey || e.ctrlKey || e.shiftKey) return;
		const tabs = [...list.querySelectorAll<HTMLElement>('[role="tab"]')];
		const current = tabs.indexOf(document.activeElement as HTMLElement);
		if (current === -1) return;
		const target = {
			ArrowRight: current + 1,
			ArrowLeft: current - 1,
			Home: 0,
			End: tabs.length - 1
		}[e.key];
		if (target === undefined) return;
		e.preventDefault();
		const tab = tabs[(target + tabs.length) % tabs.length];
		tab.focus();
		tab.click();
	}
	list.addEventListener('keydown', onkeydown);
	return () => list.removeEventListener('keydown', onkeydown);
}
