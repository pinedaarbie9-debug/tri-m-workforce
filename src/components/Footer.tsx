export default function Footer() {
  return (
    <footer className="border-t border-white/5 py-14">
      <div className="container-page grid md:grid-cols-4 gap-10">
        <div>
          <span className="font-display font-bold text-lg text-white">
            Tri-M<span className="text-brand-400">Workforce</span>
          </span>
          <p className="text-white/40 text-sm mt-3 leading-relaxed">
            Cloud-based workforce management for Tri-M Global Logistics & Trading Inc.
            Biometric field attendance, route compliance, and principal-ready analytics.
          </p>
        </div>

        <FooterCol title="Product" links={['Features', 'Pricing', 'Changelog', 'Roadmap']} />
        <FooterCol title="Company" links={['About', 'Blog', 'Careers', 'Contact']} />
        <FooterCol title="Legal" links={['Privacy Policy', 'Terms of Service', 'Security', 'PDPA Compliance']} />
      </div>

      <div className="container-page flex flex-col md:flex-row items-center justify-between gap-2 mt-12 pt-6 border-t border-white/5 text-white/30 text-xs">
        <span>© {new Date().getFullYear()} Tri-M Global Logistics & Trading Inc. All rights reserved.</span>
        <span>Built for Philippine merchandising agencies</span>
      </div>
    </footer>
  )
}

function FooterCol({ title, links }: { title: string; links: string[] }) {
  return (
    <div>
      <h4 className="text-white text-sm font-semibold mb-3">{title}</h4>
      <ul className="space-y-2">
        {links.map((l) => (
          <li key={l}>
            <a href="#" className="text-white/40 hover:text-white text-sm transition">
              {l}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
