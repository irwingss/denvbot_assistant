import OpenAI from 'openai';

export const maxDuration = 60; // Esto permite que la función se ejecute por un máximo de 60 segundos
export const dynamic = 'force-dynamic';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

function cleanResponse(text) {
    // Elimina las referencias del tipo 【8:0†source】
    return text.replace(/【\d+(?::\d+)*†source】/g, '');
}


export async function POST(request) {

    let { thread_id } = await request.json()

    if (!thread_id) {
        return new Response('Bad request', {
            status: 400,
        })
    }

    try {

        const response = await openai.beta.threads.del(thread_id)

        console.log(response)

        return new Response(JSON.stringify(response), {
            status: 200,
        })

    } catch(e) {

        console.log(e.message)

        return new Response(e.message, {
            status: 400,
        })
    }
    
}