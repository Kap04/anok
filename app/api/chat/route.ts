// app/api/chat/route.ts
import { Mistral } from '@mistralai/mistralai';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

const mistral = new Mistral({apiKey: process.env.MISTRAL_API_KEY ?? ''});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY!
);

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { message, sessionId } = body;

    if (!message || !sessionId) {
      return NextResponse.json({ error: 'Missing message or sessionId' }, { status: 400 });
    }

    // Get Supabase user id
    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_id', userId)
      .single();

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const mistralResponse = await mistral.chat.complete({
      model: "codestral-latest",
      messages: [{ role: "user", content: message }],
      maxTokens: 500
    });

    if (!mistralResponse?.choices?.[0]?.message?.content) {
      throw new Error('Invalid response from Mistral API');
    }

    const aiResponse = mistralResponse.choices[0].message.content;

    const { data, error } = await supabase
      .from('chats')
      .insert({
        session_id: sessionId,
        user_id: userData.id,  // Add user_id to the chat record
        user_message: message,
        ai_response: aiResponse,
        timestamp: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);

  } catch (error) {
    console.error('Chat API Error:', error);
    return NextResponse.json({ error: 'Error processing chat' }, { status: 500 });
  }
}