"use client"

import { Plus, PanelLeftIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useLeftSidebar } from "./ui/sidebar-provider"
import { cn } from "@/lib/utils"

interface ChatSession {
  id: string
  title: string
}

interface ChatSidebarProps {
  sessions: ChatSession[]
  currentSession: string | null
  setCurrentSession: (id: string) => void
  createNewSession: () => void
  deleteSession: (id: string, e: React.MouseEvent) => void
}

export function ChatSidebar({
  sessions,
  currentSession,
  setCurrentSession,
  createNewSession,
  deleteSession,
}: ChatSidebarProps) {
  const { isOpen, toggleSidebar } = useLeftSidebar()

  return (
    <>
      <div
        className={cn(
          "fixed top-0 left-0 z-20 h-full w-64 bg-background border-r transition-transform duration-300",
          !isOpen && "-translate-x-full",
        )}
      >
        <div className="flex flex-col h-full">
          <Button onClick={createNewSession} variant="outline" size="sm" className="m-4 border-[#2d7a8c]">
            <Plus className="w-4 h-4 mr-2" />
            New Chat
          </Button>
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-2">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className={cn(
                    "group flex items-center justify-between p-2 rounded-md hover:bg-accent cursor-pointer",
                    currentSession === session.id && "bg-accent",
                  )}
                  onClick={() => setCurrentSession(session.id)}
                >
                  <span className="truncate">{session.title}</span>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteSession(session.id, e)
                    }}
                    variant="ghost"
                    size="sm"
                    className="hidden group-hover:flex hover:bg-red-500/20 hover:text-red-400 h-6 w-6 p-0"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M3 6h18" />
                      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                    </svg>
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>
      <Button onClick={toggleSidebar} variant="ghost" size="icon" className="fixed top-4 left-4 z-30">
        <PanelLeftIcon className="h-4 w-4" />
      </Button>
    </>
  )
}

