const partners = [
  'Apex Field Marketing',
  'ProMerch Solutions',
  'Bloom Sales & Merch',
  'NovaBrands PH',
  'Pacific Retail Force',
  'Metro Trade Mktg'
]

export default function LogosBar() {
  return (
    <section className="py-16 text-center border-y border-white/5">
      <div className="container-page">
        <p className="text-xs uppercase tracking-widest text-white/40 mb-8">
          Trusted by merchandising agencies and principals nationwide
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-4 text-white/40 font-semibold">
          {partners.map((p) => (
            <span key={p}>{p}</span>
          ))}
        </div>
      </div>
    </section>
  )
}
