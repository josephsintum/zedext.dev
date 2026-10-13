/**
 * Code samples for theme previews, as tokens tagged with the theme color they use.
 * Kept short and comparable across languages so switching tabs compares the theme,
 * not the code.
 */

export type Role =
	| 'comment'
	| 'keyword'
	| 'function'
	| 'type'
	| 'variable'
	| 'string'
	| 'number'
	| 'punct'
	| 'fg';

export type Token = [text: string, role: Role];

export type SampleId = 'rust' | 'ts' | 'python' | 'go' | 'react';

export interface Sample {
	id: SampleId;
	/** File name shown in the editor tab */
	file: string;
	/** Language shown in the status bar */
	language: string;
	lines: Token[][];
}

const c = (t: string): Token => [t, 'comment'];
const k = (t: string): Token => [t, 'keyword'];
const f = (t: string): Token => [t, 'function'];
const ty = (t: string): Token => [t, 'type'];
const v = (t: string): Token => [t, 'variable'];
const s = (t: string): Token => [t, 'string'];
const n = (t: string): Token => [t, 'number'];
const p = (t: string): Token => [t, 'punct'];
const x = (t: string): Token => [t, 'fg'];

export const SAMPLES: Sample[] = [
	{
		id: 'rust',
		file: 'main.rs',
		language: 'Rust',
		lines: [
			[c('// Load settings, retrying a few times')],
			[
				k('fn '),
				f('load_config'),
				p('('),
				v('path'),
				p(': &'),
				ty('str'),
				p(') -> '),
				ty('Result'),
				p('<'),
				ty('Config'),
				p(', '),
				ty('Error'),
				p('> {')
			],
			[x('    '), k('let '), v('retries'), p(' = '), n('3'), p(';')],
			[
				x('    '),
				k('let '),
				v('text'),
				p(' = '),
				ty('fs'),
				p('::'),
				f('read_to_string'),
				p('('),
				v('path'),
				p(')?;')
			],
			[x('    '), k('let '), v('name'), p(' = '), s('"settings.json"'), p(';')],
			[
				x('    '),
				ty('Ok'),
				p('('),
				ty('Config'),
				p(' { '),
				v('text'),
				p(', '),
				v('retries'),
				p(', '),
				v('name'),
				p(' })')
			],
			[p('}')]
		]
	},
	{
		id: 'ts',
		file: 'app.ts',
		language: 'TypeScript',
		lines: [
			[c('// Fetch a user, giving up after a few seconds')],
			[
				k('export async function '),
				f('getUser'),
				p('('),
				v('id'),
				p(': '),
				ty('string'),
				p('): '),
				ty('Promise'),
				p('<'),
				ty('User'),
				p('> {')
			],
			[x('  '), k('const '), v('timeout'), p(' = '), n('5000'), p(';')],
			[
				x('  '),
				k('const '),
				v('res'),
				p(' = '),
				k('await '),
				f('fetch'),
				p('('),
				s('`/api/users/${id}`'),
				p(', { '),
				v('signal'),
				p(': '),
				ty('AbortSignal'),
				p('.'),
				f('timeout'),
				p('('),
				v('timeout'),
				p(') });')
			],
			[
				x('  '),
				k('if '),
				p('(!'),
				v('res'),
				p('.'),
				v('ok'),
				p(') '),
				k('throw new '),
				ty('Error'),
				p('('),
				s('"Request failed"'),
				p(');')
			],
			[
				x('  '),
				k('return '),
				p('('),
				k('await '),
				v('res'),
				p('.'),
				f('json'),
				p('()) '),
				k('as '),
				ty('User'),
				p(';')
			],
			[p('}')]
		]
	},
	{
		id: 'python',
		file: 'main.py',
		language: 'Python',
		lines: [
			[c('# Load settings, retrying a few times')],
			[
				k('def '),
				f('load_config'),
				p('('),
				v('path'),
				p(': '),
				ty('str'),
				p(') -> '),
				ty('Config'),
				p(':')
			],
			[x('    '), v('retries'), p(' = '), n('3')],
			[x('    '), k('with '), f('open'), p('('), v('path'), p(') '), k('as '), v('file'), p(':')],
			[x('        '), v('text'), p(' = '), v('file'), p('.'), f('read'), p('()')],
			[
				x('    '),
				k('return '),
				ty('Config'),
				p('('),
				v('text'),
				p('='),
				v('text'),
				p(', '),
				v('retries'),
				p('='),
				v('retries'),
				p(', '),
				v('name'),
				p('='),
				s('"settings.json"'),
				p(')')
			]
		]
	},
	{
		id: 'go',
		file: 'main.go',
		language: 'Go',
		lines: [
			[c('// LoadConfig reads settings, retrying a few times')],
			[
				k('func '),
				f('LoadConfig'),
				p('('),
				v('path '),
				ty('string'),
				p(') (*'),
				ty('Config'),
				p(', '),
				ty('error'),
				p(') {')
			],
			[x('\t'), v('retries'), p(' := '), n('3')],
			[
				x('\t'),
				v('text'),
				p(', '),
				v('err'),
				p(' := '),
				ty('os'),
				p('.'),
				f('ReadFile'),
				p('('),
				v('path'),
				p(')')
			],
			[x('\t'), k('if '), v('err'), p(' != '), k('nil'), p(' {')],
			[
				x('\t\t'),
				k('return '),
				k('nil'),
				p(', '),
				ty('fmt'),
				p('.'),
				f('Errorf'),
				p('('),
				s('"read %s: %w"'),
				p(', '),
				v('path'),
				p(', '),
				v('err'),
				p(')')
			],
			[x('\t'), p('}')],
			[
				x('\t'),
				k('return '),
				p('&'),
				ty('Config'),
				p('{'),
				v('Text'),
				p(': '),
				ty('string'),
				p('('),
				v('text'),
				p('), '),
				v('Retries'),
				p(': '),
				v('retries'),
				p('}, '),
				k('nil')
			],
			[p('}')]
		]
	},
	{
		id: 'react',
		file: 'App.tsx',
		language: 'TSX',
		lines: [
			[c('// A counter that starts at three')],
			[
				k('export function '),
				f('Counter'),
				p('({ '),
				v('label'),
				p(' }: { '),
				v('label'),
				p(': '),
				ty('string'),
				p(' }) {')
			],
			[
				x('  '),
				k('const '),
				p('['),
				v('count'),
				p(', '),
				v('setCount'),
				p('] = '),
				f('useState'),
				p('('),
				n('3'),
				p(');')
			],
			[x('  '), k('return '), p('(')],
			[
				x('    '),
				p('<'),
				ty('button'),
				x(' '),
				v('onClick'),
				p('={() => '),
				f('setCount'),
				p('('),
				v('count'),
				p(' + '),
				n('1'),
				p(')}>')
			],
			[x('      '), p('{'), v('label'), p('}'), x(': '), p('{'), v('count'), p('}')],
			[x('    '), p('</'), ty('button'), p('>')],
			[x('  '), p(');')],
			[p('}')]
		]
	}
];

export const DEFAULT_SAMPLE: SampleId = 'rust';
export const STORAGE_KEY = 'zedext:preview-language';

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

/** The sample to show; storage can be missing or blocked (private mode), which means Rust. */
export function readSampleChoice(storage: StorageLike | null): SampleId {
	try {
		const value = storage?.getItem(STORAGE_KEY);
		return SAMPLES.some((sample) => sample.id === value) ? (value as SampleId) : DEFAULT_SAMPLE;
	} catch {
		return DEFAULT_SAMPLE;
	}
}

export function writeSampleChoice(storage: StorageLike | null, id: SampleId): void {
	try {
		storage?.setItem(STORAGE_KEY, id);
	} catch {
		// Remembering the choice is a convenience; blocked storage just means it isn't kept
	}
}
