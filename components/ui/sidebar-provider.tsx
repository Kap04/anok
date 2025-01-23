"use client"

import * as React from "react"

type SidebarContext = {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  toggleSidebar: () => void
}

export const LeftSidebarContext = React.createContext<SidebarContext | undefined>(undefined)
export const RightSidebarContext = React.createContext<SidebarContext | undefined>(undefined)

export function useLeftSidebar() {
  const context = React.useContext(LeftSidebarContext)
  if (!context) {
    throw new Error("useLeftSidebar must be used within a LeftSidebarProvider")
  }
  return context
}

export function useRightSidebar() {
  const context = React.useContext(RightSidebarContext)
  if (!context) {
    throw new Error("useRightSidebar must be used within a RightSidebarProvider")
  }
  return context
}

interface SidebarProviderProps {
  children: React.ReactNode
  defaultOpen?: boolean
}

export function LeftSidebarProvider({ children, defaultOpen = true }: SidebarProviderProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen)

  const toggleSidebar = React.useCallback(() => {
    setIsOpen((prev) => !prev)
  }, [])

  return (
    <LeftSidebarContext.Provider value={{ isOpen, setIsOpen, toggleSidebar }}>{children}</LeftSidebarContext.Provider>
  )
}

export function RightSidebarProvider({ children, defaultOpen = true }: SidebarProviderProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen)

  const toggleSidebar = React.useCallback(() => {
    setIsOpen((prev) => !prev)
  }, [])

  return (
    <RightSidebarContext.Provider value={{ isOpen, setIsOpen, toggleSidebar }}>{children}</RightSidebarContext.Provider>
  )
}

