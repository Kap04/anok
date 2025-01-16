//app/c/page.tsx

"use client"

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SendHorizontal, Bot, User, Plus } from 'lucide-react';
import { useUser } from "@clerk/nextjs";
import { supabase } from '@/lib/supabase';


import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';




interface ChatMessage {
  id: string;
  user_message: string;
  ai_response: string;
  timestamp: string;
}

interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  last_message_at: string;
}

const ChatInterface: React.FC = () => {
  const [input, setInput] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSession, setCurrentSession] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useUser();


  // Sync Clerk user with Supabase
  useEffect(() => {
    const syncUser = async () => {
      if (!user?.id) return;

      try {
        // Check if user exists in Supabase
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('clerk_id', user.id)
          .single();

        if (!existingUser) {
          // Create new user in Supabase
          const { data: newUser, error } = await supabase
            .from('users')
            .insert({
              clerk_id: user.id,
              email: user.emailAddresses[0].emailAddress,
              created_at: new Date().toISOString()
            })
            .select()
            .single();

          if (error) throw error;
        }
      } catch (error) {
        console.error('Error syncing user:', error);
      }
    };

    syncUser();
  }, [user]);

  // Fetch sessions whenever user changes
  useEffect(() => {
    if (user?.id) {
      fetchSessions();
    }
  }, [user?.id]);

  // Fetch chat history when current session changes
  useEffect(() => {
    if (currentSession) {
      fetchChatHistory(currentSession);
    }
  }, [currentSession]);

  const fetchSessions = async () => {
    if (!user?.id) return;

    try {
      // First get the Supabase user id
      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('clerk_id', user.id)
        .single();

      if (!userData) return;

      const { data, error } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('user_id', userData.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setSessions(data || []);
      if (data && data.length > 0 && !currentSession) {
        setCurrentSession(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
    }
  };

  const fetchChatHistory = async (sessionId: string) => {
    try {
      const { data, error } = await supabase
        .from('chats')
        .select('*')
        .eq('session_id', sessionId)
        .order('timestamp', { ascending: false });

      if (error) throw error;
      setChatHistory(data || []);
    } catch (error) {
      console.error('Error fetching chat history:', error);
    }
  };

  const createNewSession = async () => {
    if (!user?.id) return;

    try {
      // Get Supabase user id
      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('clerk_id', user.id)
        .single();

      if (!userData) return;

      const { count } = await supabase
        .from('chat_sessions')
        .select('*', { count: 'exact' })
        .eq('user_id', userData.id);

      const sessionNumber = (count || 0) + 1;

      const { data: newSession, error } = await supabase
        .from('chat_sessions')
        .insert({
          title: `Chat ${sessionNumber}`,
          user_id: userData.id,
          created_at: new Date().toISOString(),
          last_message_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      if (newSession) {
        setSessions(prev => [newSession, ...prev]);
        setCurrentSession(newSession.id);
        setChatHistory([]);
      }
    } catch (error) {
      console.error('Error creating new session:', error);
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !currentSession || !user?.id) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input,
          sessionId: currentSession
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send message');
      }

      const newChat = {
        id: crypto.randomUUID(),
        session_id: currentSession,
        user_message: input,
        ai_response: data.ai_response,
        timestamp: new Date().toISOString()
      };

      setChatHistory(prev => [newChat, ...prev]);
      setInput('');

      setTimeout(() => {
        const chatContainer = document.querySelector('.scroll-area-viewport');
        if (chatContainer) {
          chatContainer.scrollTop = chatContainer.scrollHeight;
        }
      }, 100);

    } catch (error) {
      console.error('Error:', error);
      alert(error instanceof Error ? error.message : 'Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  // Rest of your JSX remains the same
  return (
    <div className="min-h-screen gradient-bg grid grid-cols-8">
      {/* Left Sidebar */}
      <div className="col-span-2 border-r border-[#2d7a8c]/30 bg-black/30 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="text-white font-semibold">Chats</div>
          <Button
            onClick={createNewSession}
            variant="outline"
            size="sm"
            className="border-[#2d7a8c]"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <ScrollArea className="h-[calc(100vh-8rem)]">
          {sessions.map((session) => (
            <div
              key={session.id}
              onClick={() => setCurrentSession(session.id)}
              className={`p-3 rounded-lg mb-2 cursor-pointer ${currentSession === session.id
                  ? 'bg-[#2d7a8c] text-white'
                  : 'bg-[#1a2942] text-gray-300 hover:bg-[#2d7a8c]/50'
                }`}
            >
              {session.title}
            </div>
          ))}
        </ScrollArea>
      </div>

      {/* Chat Section */}
      <div className="col-span-4 bg-black/20 h-screen overflow-hidden">
  <div className="h-full flex flex-col bg-black/30 backdrop-blur-md rounded-lg border border-[#2d7a8c]/30">
    <div className="flex-1 p-6 flex flex-col overflow-hidden">
      <ScrollArea className="flex-1 -mr-6 pr-6">
        <div className="space-y-4">
          {chatHistory.map((chat) => (
            <div key={chat.id} className="space-y-2 max-w-full">
              {/* User Message */}
              <div className="flex items-start gap-2">
                <User className="w-6 h-6 mt-1 text-[#2d7a8c] flex-shrink-0" />
                <div className="flex-1 bg-[#1a2942] rounded-lg p-3 text-white min-w-0">
                  <div className="break-words">{chat.user_message}</div>
                </div>
              </div>

              {/* AI Response */}
              <div className="flex items-start gap-2">
                <Bot className="w-6 h-6 mt-1 text-[#2d7a8c] flex-shrink-0" />
                <div className="flex-1 bg-[#1a2942] rounded-lg p-3 text-white min-w-0">
                  <div className="prose prose-invert max-w-none">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        code: ({ node, inline, className, children, ...props }) => {
                          const match = /language-(\w+)/.exec(className || '');
                          const codeContent = String(children).trim();
                          const isMultiLine = codeContent.includes('\n');

                          return !inline && isMultiLine ? (
                            <div className="bg-gray-950 border-black border rounded-md">
                              <div className="flex text-gray-200 bg-gray-950 border-b border-zinc-600 px-4 py-2 text-xs font-sans justify-between rounded-t-md">
                                <span>{match && match[1] ? match[1] : 'code'}</span>
                                <button
                                  onClick={() => navigator.clipboard.writeText(codeContent)}
                                  className="hover:text-gray-100"
                                >
                                  Copy code
                                </button>
                              </div>
                              <div className="overflow-x-auto">
                                <pre className="p-4 text-zinc-300">
                                  <code className={className} {...props}>
                                    {children}
                                  </code>
                                </pre>
                              </div>
                            </div>
                          ) : (
                            <code className="font-semibold text-white rounded px-1 py-0.5" {...props}>
                              {children}
                            </code>
                          );
                        },
                      }}
                    >
                      {chat.ai_response}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask your coding question..."
          className="flex-1 bg-[#1a2942] text-white border-[#2d7a8c] placeholder-gray-400"
          disabled={isLoading || !currentSession}
        />
        <Button
          type="submit"
          disabled={isLoading || !currentSession}
          className="bg-[#2d7a8c] text-white hover:bg-[#1a2942]"
        >
          <SendHorizontal className="w-4 h-4 mr-2" />
          Send
        </Button>
      </form>
    </div>
  </div>
</div>

      {/* Right Sidebar */}
      <div className="col-span-2 border-l border-[#2d7a8c]/30 bg-black/30 p-4">
        {/* Right panel content */}
      </div>
    </div>
  );

};

export default ChatInterface;