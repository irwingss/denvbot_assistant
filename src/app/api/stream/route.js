import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

function cleanResponse(text) {
    // Elimina las referencias del tipo 【8:0†source】
    return text.replace(/【\d+(?::\d+)*†source】/g, '');
}

export async function POST(request) {
    const { message, thread_id } = await request.json();

    if (!message) {
        return new Response('Bad request', { status: 400 });
    }

    console.log('Received message:', message);
    console.log('Thread ID:', thread_id);

    const assistantId = process.env.OPENAI_ASSISTANT_ID;
    console.log('Using Assistant ID:', assistantId);

    let thread;
    if (!thread_id) {
        thread = await openai.beta.threads.create();
        console.log(`Created new thread with ID: ${thread.id}`);
    } else {
        thread = await openai.beta.threads.retrieve(thread_id);
        console.log(`Retrieved existing thread with ID: ${thread.id}`);
    }

    await openai.beta.threads.messages.create(thread.id, {
        role: 'user',
        content: message
    });

    return new Response(
        new ReadableStream({
            async start(controller) {
                controller.enqueue(JSON.stringify({ thread_id: thread.id, wait: true }));

                try {
                    console.log('Creating run...');
                    const run = await openai.beta.threads.runs.create(
                        thread.id,
                        { 
                            assistant_id: assistantId,
                            instructions: "Eres un asistente especializado en enfermedades metaxénicas, especialmente el dengue. Utiliza la información del vector store asociado para proporcionar respuestas precisas y detalladas. Si no encuentras información específica, indícalo claramente y proporciona la información más relevante disponible. No inventes información que no esté en tu base de conocimientos."
                        }
                    );
                    console.log(`Created run with ID: ${run.id}`);

                    let isCompleted = false;
                    while (!isCompleted) {
                        const runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
                        console.log(`Run status: ${runStatus.status}`);

                        if (runStatus.status === 'completed') {
                            isCompleted = true;
                            const messages = await openai.beta.threads.messages.list(thread.id);
                            const lastMessage = messages.data[0];
                            console.log('Full message object:', JSON.stringify(lastMessage, null, 2));
                            
                            if (lastMessage.content && lastMessage.content[0] && lastMessage.content[0].text) {
                                let messageText = lastMessage.content[0].text.value;
                                messageText = cleanResponse(messageText); // Limpiamos la respuesta
                                const formattedMessage = messageText.replace(/\\n/g, '\n');
                                console.log("Sending message:", formattedMessage);
                                
                                if (lastMessage.content[0].text.annotations) {
                                    console.log('Annotations:', JSON.stringify(lastMessage.content[0].text.annotations, null, 2));
                                }
                                
                                controller.enqueue(JSON.stringify({ message: formattedMessage, role: 'assistant' }));
                            } else {
                                console.error('Unexpected message format:', lastMessage);
                                controller.enqueue(JSON.stringify({ 
                                    message: "Lo siento, ha ocurrido un error inesperado en el formato del mensaje.", 
                                    role: 'assistant' 
                                }));
                            }
                        } else if (runStatus.status === 'requires_action') {
                            console.log('Run requires action:', JSON.stringify(runStatus.required_action, null, 2));
                        } else if (['queued', 'in_progress'].includes(runStatus.status)) {
                            await new Promise(resolve => setTimeout(resolve, 1000));
                        } else {
                            console.log(`Unexpected run status: ${runStatus.status}`);
                            isCompleted = true;
                            controller.enqueue(JSON.stringify({ 
                                message: "Lo siento, ha ocurrido un error inesperado.", 
                                role: 'assistant' 
                            }));
                        }
                    }
                } catch (error) {
                    console.error('Error in run process:', error);
                    controller.enqueue(JSON.stringify({ 
                        message: "Lo siento, ha ocurrido un error en el proceso.", 
                        role: 'assistant' 
                    }));
                } finally {
                    controller.close();
                }
            }
        }),
        { 
            status: 200, 
            headers: { 'Content-Type': 'text/event-stream' } 
        }
    );
}