import Link from 'next/link'
import { Button } from "@/components/ui/button"

export default function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/50 backdrop-blur-md">
      <div className="container mx-auto flex items-center justify-between p-4">
        <Link href="/" className="text-2xl font-bold text-[#1a2942]">
          Anok
        </Link>

        <Button className="bg-[#1a2942] text-white hover:bg-black transition-colors">
          Get Started
        </Button>
      </div>
    </header>
  )
}

