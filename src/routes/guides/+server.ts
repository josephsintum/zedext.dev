import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/** The guides are listed on the homepage */
export const GET: RequestHandler = () => {
	throw redirect(301, '/#guides');
};
