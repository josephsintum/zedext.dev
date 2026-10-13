// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		interface PageState {
			/** Search params set by a shallow update, see $lib/search/client.svelte.ts */
			search?: string;
		}
		// interface Platform {}
	}
}

export {};
