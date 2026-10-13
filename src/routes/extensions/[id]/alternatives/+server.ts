import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Alternatives pages were removed (the matching wasn't accurate enough); old links and
// indexed URLs land on the extension page instead
export const GET: RequestHandler = ({ params }) => {
	redirect(301, `/extensions/${params.id}`);
};
