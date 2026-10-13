import type { ParamMatcher } from '@sveltejs/kit';
import { categoryPageForSlug } from '$lib/categories.js';

export const match = ((param) => categoryPageForSlug(param) !== undefined) satisfies ParamMatcher;
