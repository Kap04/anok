// app/api/chat/route.ts
import { Mistral } from '@mistralai/mistralai';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createEmbeddings } from '@/utils/fileProcessing';

const mistral = new Mistral({apiKey: process.env.NEXT_PUBLIC_MISTRAL_API_KEY ?? ''});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY!
);

type Message = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

async function findRelevantContent(query: string, sessionId: string) {
  const queryEmbedding = await createEmbeddings(query);
  
  const { data: relevantContent } = await supabase
    .rpc('match_embeddings', {
      query_embedding: queryEmbedding,
      match_threshold: 0.7,
      match_count: 5,
      session_id: sessionId
    });
    
  return relevantContent || [];
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const body = await request.json();
  let { message, sessionId, model, temperature, systemPrompt } = body;

  model = model || 'mistral-tiny';
  temperature = temperature ?? 0.7;
  
  if (!message || !sessionId) {
    return new Response(JSON.stringify({ error: 'Message and sessionId are required' }), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Create a readable stream
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Get relevant context from embeddings
        const relevantContent = await findRelevantContent(message, sessionId);
        const context = relevantContent.map((c: any) => c.content).join('\n');

        const { data: userData } = await supabase
          .from('users')
          .select('id')
          .eq('clerk_id', userId)
          .single();

        if (!userData) {
          controller.error('User not found');
          return;
        }

        const messages: Message[] = [];
        if (systemPrompt?.trim()) {
          messages.push({ role: "system", content: systemPrompt });
        }
        if (context) {
          messages.push({ 
            role: "system", 
            content: `Relevant context:\n${context}\n\nAnswer based on this context and also obey ${systemPrompt}` 
          });
        }
        messages.push({ role: "user", content: message });

        let fullResponse = '';
        const streamResult = await mistral.chat.stream({
          model: model,
          messages: messages,
          temperature: temperature,
        });

        for await (const chunk of streamResult) {
          const streamText = chunk.data.choices[0].delta.content;
          if (typeof streamText === 'string') {
            fullResponse += streamText;
            controller.enqueue(encoder.encode(streamText));
          }
        }

        // Save chat history after streaming
        const chatData = {
          session_id: sessionId,
          user_id: userData.id,
          user_message: message,
          ai_response: fullResponse,
          model: model,
          temperature: temperature,
          timestamp: new Date().toISOString(),
          ...(systemPrompt?.trim() && { system_prompt: systemPrompt })
        };

        await supabase
          .from('chats')
          .insert(chatData);

        controller.close();
      } catch (error) {
        console.error('Chat API Error:', error);
        controller.error(error);
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain',
      'Transfer-Encoding': 'chunked'
    }
  });
}