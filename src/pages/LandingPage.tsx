import Navbar from '../components/Navbar'
import Hero from '../components/Hero'
import DashboardPreview from '../components/DashboardPreview'
import LogosBar from '../components/LogosBar'
import Features from '../components/Features'
import AnalyticsSection from '../components/AnalyticsSection'
import SecuritySection from '../components/SecuritySection'
import Pricing from '../components/Pricing'
import Testimonials from '../components/Testimonials'
import CTA from '../components/CTA'
import Footer from '../components/Footer'

export default function LandingPage() {
  return (
    <div className="bg-base-950 min-h-screen">
      <Navbar />
      <Hero />
      <DashboardPreview />
      <LogosBar />
      <Features />
      <AnalyticsSection />
      <SecuritySection />
      <Pricing />
      <Testimonials />
      <CTA />
      <Footer />
    </div>
  )
}
