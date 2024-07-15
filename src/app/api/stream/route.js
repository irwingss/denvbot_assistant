import openai from '@/service/openai';
import { OPENAI_ASSISTANT_ID } from '@/config/env';

export async function POST(request) {
    const { message, thread_id } = await request.json();

    if (!message) {
        return new Response('Bad request', { status: 400 });
    }

    console.log('Received message:', message);
    console.log('Thread ID:', thread_id);

    const assistantId = OPENAI_ASSISTANT_ID;
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
                            instructions: `Eres un asistente cordial y cooperativo, diseñado para comunicarte al nivel de un experto en salud. Tu tarea es proporcionar información especializada sobre enfermedades metaxénicas, especialmente el dengue.
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

                    // ... resto del código para manejar la respuesta del asistente ...

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