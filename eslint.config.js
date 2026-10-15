import js from '@eslint/js';
import ts from 'typescript-eslint';
import svelte from 'eslint-plugin-svelte';
import prettier from 'eslint-config-prettier';
import tailwindcss from 'eslint-plugin-tailwindcss';
import globals from 'globals';

export default ts.config(
	js.configs.recommended,
	...ts.configs.recommended,
	...svelte.configs.recommended,
	...tailwindcss.configs['flat/recommended'],
	prettier,
	...svelte.configs.prettier,
	{
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.node
			}
		}
	},
	{
		files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
		languageOptions: {
			parserOptions: {
				parser: ts.parser
			}
		}
	},
	{
		rules: {
			'@typescript-eslint/no-explicit-any': 'off',
			'@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
			'svelte/no-navigation-without-resolve': 'off',
			'svelte/require-each-key': 'warn',
			'svelte/no-at-html-tags': 'warn',
			'svelte/prefer-svelte-reactivity': 'warn',
			'tailwindcss/no-custom-classname': 'warn',
			'tailwindcss/no-contradicting-classname': 'error',
			'tailwindcss/enforces-negative-arbitrary-values': 'warn',
			'tailwindcss/enforces-shorthand': 'warn'
		}
	},
	{
		settings: {
			tailwindcss: {
				// Read the theme from app.css so token utilities like text-text-secondary are known
				config: new URL('./src/app.css', import.meta.url).pathname,
				whitelist: ['dot-grid', 'hide-scrollbar', 'card-hover', 'animate-fade-up', 'readme-content']
			}
		}
	},
	{
		ignores: ['node_modules/', '.svelte-kit/', 'build/', '.cache/', '.vercel/']
	}
);
