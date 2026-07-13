import { Navbar } from './components/navbar'
import { Hero } from './components/hero'
import { Solutions } from './components/solutions'
import { Footer } from './components/footer'

export function LandingPage() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Solutions />
      </main>
      <Footer />
    </>
  )
}
