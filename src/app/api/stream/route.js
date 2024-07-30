import OpenAI from 'openai';

export const maxDuration = 60; 
export const dynamic = 'force-dynamic';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

function cleanResponse(text) {
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

    const encoder = new TextEncoder();

    return new Response(
        new ReadableStream({
            async start(controller) {
                controller.enqueue(encoder.encode(JSON.stringify({ thread_id: thread.id, wait: true }) + '\n'));

                try {
                    console.log('Creating run...');
                    const run = await openai.beta.threads.runs.create(
                        thread.id,
                        { 
                            assistant_id: assistantId,
                            instructions: `"Eres un asistente cordial y cooperativo, diseñado para comunicarte al nivel de un experto en salud. Tu tarea es proporcionar información especializada sobre enfermedades metaxénicas, especialmente el dengue.
                                            <INSTRUCCIONES>:

                                            Saludo Inicial:

                                            Al recibir un saludo como "Hola", responde amablemente:
                                            "¡Hola! Bienvenido a DENVBot, el chatbot de la Dirección General de Intervenciones Estratégicas en Salud Pública (DGIESP-MINSA). 🤓 ¡Conversemos para reforzar tus conocimientos sobre el tratamiento y manejo del Dengue! 👩‍⚕️🧑‍⚕️ ¿Cómo te llamas?"

                                            Captura de Nombre:

                                            Recoge el primer <NOMBRE>. Una vez capturado, responde siempre:
                                            "Encantado, <NOMBRE>. ¿Qué información buscas sobre el dengue?"
                                            Si no obtienes el <NOMBRE>, procede directamente a responder la pregunta del usuario.

                                            Consulta de Documentos:

                                            Consulta primero haciendo File search para brindar las respuestas. Usa el comando <consulta_documentos> para verificar si hay información pertinente en los PDFs. Si no encuentras información pertinente, utiliza tu conocimiento.

                                            Respuestas Basadas en Evidencia:

                                            Tus respuestas deben ser fieles a los documentos, de File Search concisas y basadas en evidencia. Razona tus respuestas basándote en los datos de los PDF cuando sea necesario.

                                            Enfoque en el Dengue:

                                            Mantén la conversación enfocada en el dengue o enfermedades metaxénicas. Incluye siempre una pregunta al final de tus respuestas para mantener el diálogo.
                                            Usa listas con viñetas para claridad cuando sea apropiado.
                                            Formatea las respuestas de manera amable, destacando información importante.

                                            Cálculos y Solicitud de Información Adicional:

                                            Realiza cálculos solicitados y pide información adicional si es necesario.

                                            Despedida:

                                            Si el usuario se despide o ya no requiere el chat, responde:
                                            "¡De nada! Desde el MINSA ha sido un placer ayudarte. Si en el futuro tienes más preguntas o necesitas más información, no dudes en contactarnos. ¡Que tengas un excelente día! 🙂"`
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
                                messageText = cleanResponse(messageText);
                                const formattedMessage = messageText.replace(/\\n/g, '\n');
                                console.log("Sending message:", formattedMessage);
                                
                                if (lastMessage.content[0].text.annotations) {
                                    console.log('Annotations:', JSON.stringify(lastMessage.content[0].text.annotations, null, 2));
                                }
                                
                                // Dividimos el mensaje en chunks más pequeños para streaming
                                const chunkSize = 100; // Ajusta este valor según sea necesario
                                for (let i = 0; i < formattedMessage.length; i += chunkSize) {
                                    const chunk = formattedMessage.slice(i, i + chunkSize);
                                    controller.enqueue(encoder.encode(JSON.stringify({ message: chunk, role: 'assistant' }) + '\n'));
                                    // Pequeña pausa para simular typing
                                    await new Promise(resolve => setTimeout(resolve, 50));
                                }
                            } else {
                                console.error('Unexpected message format:', lastMessage);
                                controller.enqueue(encoder.encode(JSON.stringify({ 
                                    message: "Lo siento, ha ocurrido un error inesperado en el formato del mensaje.", 
                                    role: 'assistant' 
                                }) + '\n'));
                            }
                        } else if (runStatus.status === 'requires_action') {
                            console.log('Run requires action:', JSON.stringify(runStatus.required_action, null, 2));
                        } else if (['queued', 'in_progress'].includes(runStatus.status)) {
                            controller.enqueue(encoder.encode(JSON.stringify({ wait: true }) + '\n'));
                            await new Promise(resolve => setTimeout(resolve, 1000));
                        } else {
                            console.log(`Unexpected run status: ${runStatus.status}`);
                            isCompleted = true;
                            controller.enqueue(encoder.encode(JSON.stringify({ 
                                message: "Lo siento, ha ocurrido un error inesperado.", 
                                role: 'assistant' 
                            }) + '\n'));
                        }
                    }
                } catch (error) {
                    console.error('Error in run process:', error);
                    controller.enqueue(encoder.encode(JSON.stringify({ 
                        message: "Lo siento, ha ocurrido un error en el proceso.", 
                        role: 'assistant' 
                    }) + '\n'));
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