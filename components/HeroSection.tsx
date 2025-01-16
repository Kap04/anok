import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function HeroSection() {
  return (
    <section className="min-h-screen relative overflow-hidden gradient-bg">
      <div className="absolute inset-0 bg-black/30" />
      <div className="container mx-auto relative z-10 flex flex-col items-center justify-center min-h-screen text-center px-4">
        <h1 className="text-6xl md:text-7xl lg:text-8xl font-bold mb-6 text-white tracking-tight">
          Meet <span className="text-gradient">Anok</span>
        </h1>
        <p className="text-xl md:text-2xl mb-8 text-gray-300 max-w-2xl">
          Your AI coding companion, as elegant and sophisticated as its namesake
        </p>
        <Link href="/c">
        <Button size="lg" className="bg-[#2d7a8c] text-white hover:bg-[#1a2942] transition-colors">
          Experience the Future
        </Button>
        </Link>
      </div>
    </section>
  )
}

