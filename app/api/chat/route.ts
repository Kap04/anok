// app/api/chat/route.ts
import { Mistral } from '@mistralai/mistralai';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createEmbeddings } from '@/utils/fileProcessing';

const mistral = new Mistral({ apiKey: process.env.NEXT_PUBLIC_MISTRAL_API_KEY ?? '' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY!
);

type Message = {
  role: 'system' | 'user' | 'assistant';
  content: string;
  prefix?: boolean;
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
  let {
    message,
    sessionId,
    model = 'mistral-tiny',
    temperature = 0.7,
    systemPrompt,
    prefixKey
  } = body;

  const relevantContent = await findRelevantContent(message, sessionId);
  if (relevantContent.length > 0) {
    systemPrompt = `Relevant Context: ${relevantContent.map((content: { text: string }) => content.text).join('\n')}\n\n${systemPrompt || ''}`;
  }

  if (!message || !sessionId) {
    return new Response(JSON.stringify({ error: 'Message and sessionId are required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Predefined prefixes for different models and contexts
  // Predefined prefixes for different models and contexts
  const PREFIXES: Record<string, string> = {
    'mistral-tiny': 'Helpful Assistant: ',
    'mistral-small': 'you are david goggins, user wants a goggins quote: ',
    'mistral-medium': 'Comprehensive Analysis: ',
    'mistral-large': 'Advanced Reasoning Assistant: ',
    'code-assistant': 'Coding Expert: ',
    'creative-writing': 'Creative Writing Assistant: ',
    'technical-documentation': 'Technical Documentation Expert: '
  };

  // Create a readable stream
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Determine prefix - use prefixKey if it exists, otherwise use model
        const prefix = PREFIXES[model] || '';

        const messages: Message[] = [];

        // Add system prompt if exists
        if (systemPrompt?.trim()) {
          messages.push({
            role: "system",
            content: systemPrompt
          });
        }

        // Prepare user message with prefix
        const userMessage: Message = {
          role: "user",
          content: prefix + message
        };
        messages.push(userMessage);

        const streamResult = await mistral.chat.stream({
          model: model,
          messages: messages,
          temperature: temperature,
        });

        let fullResponse = '';
        for await (const chunk of streamResult) {
          const streamText = chunk.data.choices[0].delta.content;

          if (typeof streamText === 'string') {
            // Remove prefix only from the very first chunk
            const processedText = fullResponse.length === 0 && prefix
              ? streamText.replace(prefix, '')
              : streamText;

            fullResponse += processedText;

            controller.enqueue(encoder.encode(processedText));
          }
        }
        //console.log('Full Response:', fullResponse);  

        controller.close();
      } catch (error) {
        console.error('Streaming Error:', error);
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