/*
* This is a SvelteKit proxy to avoid CORS issues.
*/

import { json } from '@sveltejs/kit';
import { PUBLIC_SERVER_URL } from '$env/static/public';

/** @type {import('./$types').RequestHandler} */
export async function POST({ request }) {

    const data = await request.json();
    const response = await fetch(PUBLIC_SERVER_URL + "/aap/startCapture", {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    });

    const responseData = await response.json();
    return json(responseData)
}