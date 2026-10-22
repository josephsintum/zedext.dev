<script lang="ts">
	import Seo from '$lib/components/Seo.svelte';

	const link = 'text-accent hover:underline';
	const issues = 'https://github.com/josephsintum/zedext.dev/issues';
</script>

<Seo
	title="Contact — ZedExt"
	description="How to reach ZedExt: report a bug or wrong data, suggest a feature, or find the right place for questions about an extension or Zed itself."
	path="/contact"
	ogTitle="Contact"
/>

<div class="mx-auto max-w-3xl px-6 py-16">
	<header class="mb-16">
		<h1 class="font-mono text-2xl font-bold tracking-tight">Contact</h1>
		<p class="mt-4 text-lg leading-relaxed text-text-secondary">
			ZedExt is an open-source community project, run in the open on GitHub. The best way to reach
			us is an issue there.
		</p>
	</header>

	<section class="mb-14">
		<h2 class="mb-4 text-sm font-semibold tracking-widest text-text-tertiary uppercase">
			About this site
		</h2>
		<div class="space-y-4 text-15 leading-relaxed text-text-secondary">
			<p>
				For a bug, a broken page, data that looks wrong on ZedExt, or an idea for a feature,
				<a href={issues} class={link} target="_blank" rel="noopener noreferrer"
					>open an issue on GitHub</a
				>. Include the page’s URL and what you expected to see. Pull requests are welcome too.
			</p>
			<a
				href="{issues}/new"
				class="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2.5 text-13 font-medium text-text transition-colors hover:border-border-hover hover:bg-surface-hover"
				target="_blank"
				rel="noopener noreferrer"
			>
				New issue
			</a>
		</div>
	</section>

	<section class="mb-14">
		<h2 class="mb-4 text-sm font-semibold tracking-widest text-text-tertiary uppercase">
			About an extension
		</h2>
		<div class="space-y-4 text-15 leading-relaxed text-text-secondary">
			<p>
				ZedExt shows what’s in Zed’s extension registry and doesn’t host or publish extensions. For
				a problem with an extension itself, or to ask its author something, use the issue tracker of
				its repository, linked from the extension’s page here.
			</p>
			<p>
				If you’re an author and your extension’s name, description or version is wrong, change its
				<code class="font-mono text-13">extension.toml</code> and publish a new version through
				<a
					href="https://github.com/zed-industries/extensions"
					class={link}
					target="_blank"
					rel="noopener noreferrer">zed-industries/extensions</a
				>; ZedExt picks it up at the next nightly sync. README and GitHub stats come straight from
				your repository.
			</p>
		</div>
	</section>

	<section class="mb-14">
		<h2 class="mb-4 text-sm font-semibold tracking-widest text-text-tertiary uppercase">
			About Zed
		</h2>
		<div class="space-y-4 text-15 leading-relaxed text-text-secondary">
			<p>
				ZedExt isn’t affiliated with Zed Industries. For the editor itself, see
				<a href="https://zed.dev/docs" class={link} target="_blank" rel="noopener noreferrer"
					>Zed’s documentation</a
				>
				or
				<a
					href="https://github.com/zed-industries/zed/issues"
					class={link}
					target="_blank"
					rel="noopener noreferrer">Zed’s issue tracker</a
				>.
			</p>
		</div>
	</section>
</div>
