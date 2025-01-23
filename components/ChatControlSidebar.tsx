"use client"

import { PanelRightIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { FileHandler } from "./FileHandler"
import { useRightSidebar } from "./ui/sidebar-provider"
import { cn } from "@/lib/utils"

const models = [
  { value: "mistral-tiny", label: "Mistral Tiny" },
  { value: "mistral-small", label: "Mistral Small" },
  { value: "mistral-medium", label: "Mistral Medium" },
  { value: "codestral-2405", label: "Codestral Latest" },
]

interface ChatControlSidebarProps {
  knowledgeBaseUrl: string
  setKnowledgeBaseUrl: (url: string) => void
  selectedModel: string
  setSelectedModel: (model: string) => void
  temperature: number
  setTemperature: (temp: number) => void
  systemPrompt: string
  setSystemPrompt: (prompt: string) => void
  sessionId: string | null
}

export function ChatControlSidebar({
  knowledgeBaseUrl,
  setKnowledgeBaseUrl,
  selectedModel,
  setSelectedModel,
  temperature,
  setTemperature,
  systemPrompt,
  setSystemPrompt,
  sessionId,
}: ChatControlSidebarProps) {
  const { isOpen, toggleSidebar } = useRightSidebar()

  return (
    <>
      <div
        className={cn(
          "fixed top-0 right-0 z-20 h-full w-80 bg-background border-l transition-transform duration-300",
          !isOpen && "translate-x-full",
        )}
      >
        <div className="p-6 space-y-6">
          <div>
            <Label htmlFor="knowledge-base">Knowledge Base</Label>
            <div className="flex mt-1.5">
              <Input
                id="knowledge-base"
                placeholder="Paste link here"
                value={knowledgeBaseUrl}
                onChange={(e) => setKnowledgeBaseUrl(e.target.value)}
                className="flex-grow border border-white"
              />
              <FileHandler
                sessionId={sessionId}
                onFileProcessed={() => {
                  // Optionally refresh or show success message
                }}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="model-selection">Model Selection</Label>
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger id="model-selection" className="w-full mt-1.5">
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent>
                {models.map((model) => (
                  <SelectItem key={model.value} value={model.value}>
                    {model.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="temperature">Temperature: {temperature}</Label>
            <Slider
              id="temperature"
              min={0}
              max={1}
              step={0.1}
              value={[temperature]}
              onValueChange={(value) => setTemperature(value[0])}
              className="mt-1.5"
            />
          </div>

          <div>
            <Label htmlFor="system-prompt">System Prompt</Label>
            <Textarea
              id="system-prompt"
              placeholder="Enter system prompt here"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              className="mt-1.5"
              rows={4}
            />
          </div>
        </div>
      </div>
      <Button onClick={toggleSidebar} variant="ghost" size="icon" className="fixed top-4 right-4 z-30">
        <PanelRightIcon className="h-4 w-4" />
      </Button>
    </>
  )
}

