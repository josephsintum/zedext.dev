<script lang="ts">
	import Seo from '$lib/components/Seo.svelte';

	const link = 'text-accent hover:underline';
</script>

<Seo
	title="Privacy — ZedExt"
	description="What ZedExt collects: no accounts and no cookies, cookieless page-view analytics from Vercel, and a few preferences kept in your browser."
	path="/privacy"
	ogTitle="Privacy"
/>

<div class="mx-auto max-w-3xl px-6 py-16">
	<header class="mb-16">
		<h1 class="font-mono text-2xl font-bold tracking-tight">Privacy</h1>
		<p class="mt-4 text-lg leading-relaxed text-text-secondary">
			ZedExt has no accounts, no sign-in and no cookies. It doesn’t sell or share data, and it
			doesn’t run ads.
		</p>
	</header>

	<section class="mb-14">
		<h2 class="mb-4 text-sm font-semibold tracking-widest text-text-tertiary uppercase">
			Analytics
		</h2>
		<div class="space-y-4 text-15 leading-relaxed text-text-secondary">
			<p>
				ZedExt uses
				<a
					href="https://vercel.com/docs/analytics/privacy-policy"
					class={link}
					target="_blank"
					rel="noopener noreferrer">Vercel Web Analytics</a
				>
				to count page views and see which pages and referrers bring people here. It’s cookieless. Each
				page view records the page’s URL (which can include a search query), the referring site, your
				country, browser and device type. Visitors are counted with a hash of the request that’s discarded
				after 24 hours, so the numbers are aggregate: they don’t identify you or follow you to other sites.
			</p>
		</div>
	</section>

	<section class="mb-14">
		<h2 class="mb-4 text-sm font-semibold tracking-widest text-text-tertiary uppercase">
			Stored in your browser
		</h2>
		<div class="space-y-4 text-15 leading-relaxed text-text-secondary">
			<p>
				A few preferences are saved in your browser’s local storage so the site remembers them
				between visits. They never leave your device, and clearing site data removes them:
			</p>
			<ul class="ml-1 list-inside list-disc space-y-2 marker:text-border-hover">
				<li><strong class="text-text">Light or dark mode</strong>, if you picked one</li>
				<li><strong class="text-text">Grid or list view</strong> for extension lists</li>
				<li>
					<strong class="text-text">Recently viewed extensions</strong>, shown in the search window
				</li>
				<li><strong class="text-text">The language</strong> you chose for theme previews</li>
			</ul>
		</div>
	</section>

	<section class="mb-14">
		<h2 class="mb-4 text-sm font-semibold tracking-widest text-text-tertiary uppercase">
			Other services your browser talks to
		</h2>
		<div class="space-y-4 text-15 leading-relaxed text-text-secondary">
			<p>
				Like any website, pages load some files from other servers, which see your IP address and
				browser details when they send them:
			</p>
			<ul class="ml-1 list-inside list-disc space-y-2 marker:text-border-hover">
				<li>
					<strong class="text-text">Vercel</strong> hosts the site and handles every request, keeping
					short-lived logs to run it.
				</li>
				<li><strong class="text-text">jsDelivr</strong> serves the fonts.</li>
				<li>
					<strong class="text-text">GitHub</strong> serves author avatars, and README images come from
					wherever each extension’s author put them (usually GitHub, sometimes badge services such as
					shields.io).
				</li>
			</ul>
			<p>
				The extension data itself comes from Zed’s public extension API and GitHub, fetched by our
				servers, not your browser. The search window runs in your browser as you type; a search
				results page carries your query in its URL, so it reaches our server like any link.
			</p>
		</div>
	</section>

	<section class="rounded-lg border border-border bg-surface-raised p-6">
		<h2 class="mb-1 text-14 font-semibold text-text">Questions</h2>
		<p class="text-13 leading-relaxed text-text-secondary">
			ZedExt is open source, so you can check all of this in
			<a
				href="https://github.com/josephsintum/zedext.dev"
				class={link}
				target="_blank"
				rel="noopener noreferrer">the code</a
			>. For anything else, see <a href="/contact" class={link}>Contact</a>.
		</p>
	</section>
</div>
