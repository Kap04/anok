import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Code, Zap, Book } from 'lucide-react'

const features = [
  {
    icon: <Code className="h-6 w-6 text-[#2d7a8c]" />,
    title: "Intelligent Code Completion",
    description: "Experience seamless code suggestions that adapt to your style."
  },
  {
    icon: <Zap className="h-6 w-6 text-[#2d7a8c]" />,
    title: "Real-time Error Detection",
    description: "Catch and fix errors instantly with sophisticated error detection."
  },
  {
    icon: <Book className="h-6 w-6 text-[#2d7a8c]" />,
    title: "Contextual Documentation",
    description: "Access elegant documentation that evolves with your needs."
  }
]

export default function FeaturesSection() {
  return (
    <section className="min-h-screen flex items-center justify-center bg-black">
      <div className="container mx-auto py-20">
        <h2 className="text-4xl font-bold mb-12 text-center text-gradient">Distinctive Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="bg-[#1a2942] border-[#2d7a8c] hover:bg-[#2d7a8c] transition-all duration-300">
              <CardHeader>
                <div className="mb-4">{feature.icon}</div>
                <CardTitle className="text-white">{feature.title}</CardTitle>
                <CardDescription className="text-gray-300">{feature.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}

