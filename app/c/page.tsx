//app/c/page.tsx  ( chat page ) 

"use client"

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SendHorizontal, Bot, User } from 'lucide-react';
import { useUser } from "@clerk/nextjs";
import { supabase } from '@/lib/supabase';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChatControlSidebar } from '@/components/ChatControlSidebar';
import { ChatSidebar } from '@/components/ChatSessionSidebar';
import { LeftSidebarProvider, RightSidebarProvider } from '@/components/ui/sidebar-provider';


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


  const [knowledgeBaseUrl, setKnowledgeBaseUrl] = useState('');
  const [selectedModel, setSelectedModel] = useState('mistral-tiny');
  const [temperature, setTemperature] = useState(0.7);
  const [systemPrompt, setSystemPrompt] = useState('');

  const [lastRequestTime, setLastRequestTime] = useState<number>(0);

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

  const deleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the session selection
    if (!user?.id || !confirm('Are you sure you want to delete this chat?')) return;

    try {
      const { error } = await supabase
        .from('chat_sessions')
        .delete()
        .eq('id', sessionId);

      if (error) throw error;

      // Update local state
      setSessions(prev => prev.filter(session => session.id !== sessionId));

      // If the deleted session was the current session, switch to the most recent one
      if (currentSession === sessionId) {
        const remainingSessions = sessions.filter(session => session.id !== sessionId);
        setCurrentSession(remainingSessions.length > 0 ? remainingSessions[0].id : null);
        setChatHistory([]);
      }
    } catch (error) {
      console.error('Error deleting session:', error);
      alert('Failed to delete chat session');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !currentSession || !user?.id) return;
  
    const userMessage = input.trim();
    setIsLoading(true);
    setInput('');
  
    try {
      const requestBody = {
        message: userMessage,
        sessionId: currentSession,
        model: selectedModel || 'mistral-tiny',
        temperature: temperature ?? 0.7,
        ...(systemPrompt?.trim() && { systemPrompt }),
      };
  
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
  
      const tempChatId = crypto.randomUUID();
      const newChat = {
        id: tempChatId,
        session_id: currentSession,
        user_message: userMessage,
        ai_response: '',
        timestamp: new Date().toISOString()
      };
  
      setChatHistory(prev => [newChat, ...prev]);
  
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';
      while (true) {
        const result = await reader?.read();
        if (!result) break;
        const { done, value } = result;
        if (done) break;

        const chunk = decoder.decode(value);
        fullResponse += chunk;
  
        setChatHistory(prev => 
          prev.map(chat => 
            chat.id === tempChatId 
              ? { ...chat, ai_response: fullResponse } 
              : chat
          )
        );
      }
    } catch (error) {
      console.error('Error:', error);
      alert(error instanceof Error ? error.message : 'Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };





  return (
    <LeftSidebarProvider>
      <RightSidebarProvider>
        <div className="min-h-screen gradient-bg flex justify-center">
          <ChatSidebar
            sessions={sessions}
            currentSession={currentSession}
            setCurrentSession={setCurrentSession}
            createNewSession={createNewSession}
            deleteSession={deleteSession}
          />

          <main className="w-3/5 h-screen">
            <div className="h-full flex flex-col bg-transparent backdrop-blur-md rounded-lg ">
              <ScrollArea className="flex-1 p-4">{/* Chat history content */}
                <div className="space-y-4">
                  {chatHistory.slice().reverse().map((chat) => (
                    <div key={chat.id} className="space-y-2 max-w-full">
                      {/* User Message */}
                      <div className="flex items-start gap-2">
                        <User className="w-6 h-6 mt-1 text-[#2d7a8c] flex-shrink-0" />
                        <div className="flex-1 bg-[#1a2942] rounded-lg p-3 text-white break-words min-w-0">
                          <div className="break-words">{chat.user_message}</div>
                        </div>
                      </div>

                      {/* AI Response */}
                      <div className="flex items-start gap-2">
                        <Bot className="w-6 h-6 mt-1 text-[#2d7a8c] flex-shrink-0" />
                        <div className="flex-1 bg-[#1a2942] rounded-lg p-3 break-words text-white min-w-0">
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

              <div className="p-4 border-t border-[#2d7a8c]/30">
                <form onSubmit={handleSubmit} className="flex gap-2">
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
          </main>

          <ChatControlSidebar
            knowledgeBaseUrl={knowledgeBaseUrl}
            setKnowledgeBaseUrl={setKnowledgeBaseUrl}
            selectedModel={selectedModel}
            setSelectedModel={setSelectedModel}
            temperature={temperature}
            setTemperature={setTemperature}
            systemPrompt={systemPrompt}
            setSystemPrompt={setSystemPrompt}
            sessionId={currentSession}
          />
        </div>
      </RightSidebarProvider>
    </LeftSidebarProvider>
  )
}

export default ChatInterface