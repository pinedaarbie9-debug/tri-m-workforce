import { Link } from 'react-router-dom'

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 bg-base-950/90 backdrop-blur border-b border-white/5">
      <div className="container-page flex items-center justify-between h-16">
        <Link to="/" className="flex items-center gap-2 group">
          <span className="w-8 h-8 rounded-lg bg-brand-gradient flex items-center justify-center text-sm group-hover:scale-110 transition-transform">
            🛰️
          </span>
          <span className="font-display font-bold text-lg text-white">
            Tri-M<span className="text-brand-400">Workforce</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-sm text-white/70">
          {['features', 'analytics', 'pricing', 'customers'].map((id) => (
            <a
              key={id}
              href={`#${id}`}
              className="relative hover:text-white transition-colors after:content-[''] after:absolute after:left-0 after:-bottom-1 after:h-[1.5px] after:w-0 after:bg-brand-400 after:transition-all hover:after:w-full capitalize"
            >
              {id}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <Link to="/login" className="text-sm text-white/70 hover:text-white transition">
            Sign in
          </Link>
          <Link
            to="/login"
            className="text-sm font-semibold bg-brand-500 hover:bg-brand-600 hover:scale-105 hover:shadow-lg hover:shadow-brand-500/30 text-white px-4 py-2 rounded-lg transition"
          >
            Get started free
          </Link>
        </div>
      </div>
    </header>
  )
}
