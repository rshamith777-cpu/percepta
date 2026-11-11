'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function BotanicalLandingPage() {
  const [activeCategory, setActiveCategory] = useState<'all' | 'flora' | 'ferns' | 'medicinal'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecimenId, setSelectedSpecimenId] = useState<string | null>(null);
  const [savedFolio, setSavedFolio] = useState<string[]>(['specimen-01']);
  const [audioPlaying, setAudioPlaying] = useState(false);

  const specimenCards = [
    {
      id: 'specimen-01',
      title: 'PAPAVER RHOEAS',
      commonName: 'Corn Poppy & Field Anemone',
      family: 'Papaveraceae',
      category: 'flora',
      origin: 'Plate IX • Sussex Downs, 1954',
      badge: 'Vol. IV Specimen',
      clayType: 'sage', // #C4D1B8
      description: 'Annual herbaceous species with delicate scarlet petals and dark violet stamens. Hand-pressed in unbleached acid-free rag paper.',
      elevation: '120m — Chalk Escarpment',
      bloomPeriod: 'May — August',
      tag: 'HERBARIUM NO. 482',
      anatomy: [
        { label: 'Petals (4)', detail: 'Caducous, paper-thin, carmine scarlet with dark basal blotch.' },
        { label: 'Capsule', detail: 'Subglobose glaucous seed urn bearing a flat radiating stigmatic disc.' },
        { label: 'Foliage', detail: 'Deeply pinnatifid with bristly hispid hairs along the midrib.' }
      ]
    },
    {
      id: 'specimen-02',
      title: 'POLYPODIUM VULGARE',
      commonName: 'Common Polypody Fern',
      family: 'Polypodiaceae',
      category: 'ferns',
      origin: 'Plate XIV • Celtic Rain-Forest, 1951',
      badge: 'Sporangia Cluster',
      clayType: 'terracotta', // #E5A98C
      description: 'Winter-green epiphytic fern characterized by pinnatifid fronds and bright orange-yellow sori along the fertile pinnae.',
      elevation: '420m — Mossy Oak Bough',
      bloomPeriod: 'Autumnal Spores',
      tag: 'HERBARIUM NO. 119',
      anatomy: [
        { label: 'Fronds', detail: 'Oblong-lanceolate, pinnatifid, leathery texture resistant to winter frost.' },
        { label: 'Sori', detail: 'Large circular golden-yellow naked sporangia in two rows beneath pinnae.' },
        { label: 'Rhizome', detail: 'Creeping, sweet-tasting, densely covered in golden-brown chaffy scales.' }
      ]
    },
    {
      id: 'specimen-03',
      title: 'HYPERICUM PERFORATUM',
      commonName: "St. John's Amber Wort",
      family: 'Hypericaceae',
      category: 'medicinal',
      origin: 'Plate XXII • Mendip Hills, 1958',
      badge: 'Apothecary Index',
      clayType: 'butter', // #F2DC91
      description: 'Glandular golden blooms bearing pellucid dots across foliar margins. Yields an aromatic crimson resin when gently crushed.',
      elevation: '280m — Limestone Verge',
      bloomPeriod: 'Midsummer Solstice',
      tag: 'HERBARIUM NO. 734',
      anatomy: [
        { label: 'Corolla', detail: '5 bright golden-yellow petals dotted with black hypericin resin glands.' },
        { label: 'Stamens', detail: 'Numerous united at the base into three distinct bushy fascicles.' },
        { label: 'Leaves', detail: 'Opposite, sessile, perforated by translucent essential-oil reservoirs.' }
      ]
    },
    {
      id: 'specimen-04',
      title: 'CAMPANULA ROTUNDIFOLIA',
      commonName: 'Harebell & Bluebell of Scotland',
      family: 'Campanulaceae',
      category: 'flora',
      origin: 'Plate XXVII • Yorkshire Fells, 1952',
      badge: 'Wild Specimen',
      clayType: 'sage', // #C4D1B8
      description: 'Slender, wiry stems supporting nodding sky-blue bells. Endures wind-sheared sub-alpine moorlands with remarkable grace.',
      elevation: '610m — Heather Heath',
      bloomPeriod: 'July — September',
      tag: 'HERBARIUM NO. 903',
      anatomy: [
        { label: 'Campanulate Bell', detail: '5-lobed delicate azure corolla suspended on filiform pedicels.' },
        { label: 'Basal Leaves', detail: 'Cordate-rotundate with long petioles, withering prior to anthesis.' },
        { label: 'Cauline Foliage', detail: 'Narrowly linear, sessile, alternate along the wiry ascending stem.' }
      ]
    },
    {
      id: 'specimen-05',
      title: 'DIGITALIS PURPUREA',
      commonName: 'Woodland Foxglove',
      family: 'Plantaginaceae',
      category: 'medicinal',
      origin: 'Plate V • Forest of Dean, 1955',
      badge: 'Alkaloid Study',
      clayType: 'terracotta', // #E5A98C
      description: 'Towering biennial racemes with spotted thimble-shaped blossoms designed for bumblebee pollination corridors.',
      elevation: '190m — Clearings & Copse',
      bloomPeriod: 'June — July',
      tag: 'HERBARIUM NO. 312',
      anatomy: [
        { label: 'Tubular Throat', detail: 'Inflated campanulate corolla lined with maroon-spotted white rings.' },
        { label: 'Anthers', detail: 'Four didynamous stamens tucked safely along the dorsal corolla ceiling.' },
        { label: 'Basal Rosette', detail: 'Large ovate-lanceolate rugose leaves with prominent reticulate venation.' }
      ]
    },
    {
      id: 'specimen-06',
      title: 'ASPLENIUM SCOLOPENDRIUM',
      commonName: "Hart's Tongue Spleenwort",
      family: 'Aspleniaceae',
      category: 'ferns',
      origin: 'Plate XXXI • Wye Valley Gorges, 1956',
      badge: 'Calciphile Fern',
      clayType: 'butter', // #F2DC91
      description: 'Entire, strap-shaped leathery fronds rooted in shaded damp limestone fissures with linear diagonal sori.',
      elevation: '90m — Shaded Ravine',
      bloomPeriod: 'Perennial Fronds',
      tag: 'HERBARIUM NO. 651',
      anatomy: [
        { label: 'Lamina', detail: 'Simple, tongue-like, glossy dark green with cordate basal auricles.' },
        { label: 'Linear Sori', detail: 'Paired elongated sori resembling centipede legs along secondary veins.' },
        { label: 'Stipe', detail: 'Shaggy with purplish-brown iridescent ramenta scales at the base.' }
      ]
    }
  ];

  const activeSpecimen = specimenCards.find((s) => s.id === selectedSpecimenId) || null;

  const toggleFolio = (id: string) => {
    setSavedFolio((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const playNatureChime = () => {
    if (typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      setAudioPlaying(true);

      // Gentle wooden wind chime pentatonic tones (D5, F#5, A5, B5, D6)
      const freqs = [587.33, 739.99, 880.00, 987.77, 1174.66];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.12);

        gain.gain.setValueAtTime(0.001, now + idx * 0.12);
        gain.gain.linearRampToValueAtTime(0.08, now + idx * 0.12 + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.8);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.12);
        osc.stop(now + idx * 0.12 + 0.85);
      });

      setTimeout(() => setAudioPlaying(false), 1200);
    } catch {}
  };

  const filtered = specimenCards.filter((item) => {
    const matchesCat = activeCategory === 'all' || item.category === activeCategory;
    const matchesQuery =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.commonName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.family.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesQuery;
  });

  return (
    <div className="relative min-h-screen bg-[#F7F3EB] text-[#262D24] overflow-x-hidden selection:bg-[#E5A98C]/40 selection:text-[#262D24]">
      {/* ----------------------------------------------------------- */}
      {/* Organic Paper Grain Texture & Ambient Botanical Vignettes   */}
      {/* ----------------------------------------------------------- */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap');

        .font-editorial {
          font-family: 'Playfair Display', Georgia, serif;
        }
        .font-sans-geo {
          font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
        }

        /* 3D Tactile Claymorphism Utilities */
        .clay-sage {
          background-color: #C4D1B8;
          box-shadow: 
            14px 18px 30px rgba(38, 45, 36, 0.09),
            -8px -8px 20px rgba(255, 255, 255, 0.8),
            inset 3px 3px 6px rgba(255, 255, 255, 0.6),
            inset -3px -3px 8px rgba(38, 45, 36, 0.08);
        }
        .clay-terracotta {
          background-color: #E5A98C;
          box-shadow: 
            14px 18px 30px rgba(38, 45, 36, 0.09),
            -8px -8px 20px rgba(255, 255, 255, 0.8),
            inset 3px 3px 6px rgba(255, 255, 255, 0.6),
            inset -3px -3px 8px rgba(38, 45, 36, 0.08);
        }
        .clay-butter {
          background-color: #F2DC91;
          box-shadow: 
            14px 18px 30px rgba(38, 45, 36, 0.09),
            -8px -8px 20px rgba(255, 255, 255, 0.8),
            inset 3px 3px 6px rgba(255, 255, 255, 0.6),
            inset -3px -3px 8px rgba(38, 45, 36, 0.08);
        }
        .clay-cream {
          background-color: #FAF7F0;
          box-shadow: 
            12px 16px 26px rgba(38, 45, 36, 0.07),
            -6px -6px 16px rgba(255, 255, 255, 0.9),
            inset 2px 2px 5px rgba(255, 255, 255, 0.8),
            inset -2px -2px 6px rgba(38, 45, 36, 0.06);
        }
        .clay-pill-active {
          box-shadow: 
            inset 3px 3px 6px rgba(38, 45, 36, 0.15),
            inset -2px -2px 6px rgba(255, 255, 255, 0.6),
            0 2px 4px rgba(38, 45, 36, 0.04);
        }
        .clay-button {
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .clay-button:active {
          transform: translateY(2px) scale(0.98);
        }
      `}</style>

      {/* Decorative Vintage Botanical Line-Art & Watercolor Illustrations (Framing Margins) */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden opacity-35">
        {/* Top-Right Poppies & Wildflowers */}
        <svg className="absolute -top-12 -right-12 w-96 h-96 text-[#262D24]" viewBox="0 0 400 400" fill="none" stroke="currentColor">
          <path d="M350 40 C300 90, 280 160, 310 240 C340 320, 290 380, 240 390" strokeWidth="1.2" strokeLinecap="round" />
          <path d="M310 110 C270 100, 230 130, 240 180 C250 220, 290 220, 305 170 C310 140, 305 120, 310 110 Z" fill="#E5A98C" fillOpacity="0.25" strokeWidth="1" />
          <path d="M280 140 C275 145, 270 155, 272 165 C275 175, 285 175, 290 165" strokeWidth="0.8" />
          <circle cx="282" cy="155" r="5" fill="#262D24" fillOpacity="0.4" />
          <path d="M330 180 C360 170, 380 200, 370 230 C355 250, 325 240, 325 210 Z" fill="#C4D1B8" fillOpacity="0.3" strokeWidth="1" />
          {/* Fern Frond Accents */}
          <path d="M220 280 C260 270, 290 285, 330 300" strokeWidth="1" />
          <path d="M250 275 C265 260, 275 265, 260 278" strokeWidth="0.8" fill="#C4D1B8" fillOpacity="0.3" />
          <path d="M270 279 C285 265, 295 270, 280 283" strokeWidth="0.8" fill="#C4D1B8" fillOpacity="0.3" />
          <path d="M290 285 C305 272, 315 278, 300 290" strokeWidth="0.8" fill="#C4D1B8" fillOpacity="0.3" />
        </svg>

        {/* Bottom-Left Ferns & Grasses */}
        <svg className="absolute -bottom-16 -left-12 w-[28rem] h-[28rem] text-[#262D24]" viewBox="0 0 400 400" fill="none" stroke="currentColor">
          <path d="M40 380 C80 300, 110 220, 100 130 C90 60, 60 20, 30 10" strokeWidth="1.2" strokeLinecap="round" />
          <path d="M70 310 C100 295, 120 305, 95 325" strokeWidth="1" fill="#C4D1B8" fillOpacity="0.35" />
          <path d="M85 260 C115 240, 135 255, 110 275" strokeWidth="1" fill="#C4D1B8" fillOpacity="0.35" />
          <path d="M95 210 C125 185, 145 200, 120 220" strokeWidth="1" fill="#C4D1B8" fillOpacity="0.35" />
          <path d="M100 160 C125 140, 140 150, 118 170" strokeWidth="1" fill="#C4D1B8" fillOpacity="0.35" />
          <path d="M98 120 C118 105, 130 115, 110 130" strokeWidth="1" fill="#C4D1B8" fillOpacity="0.35" />
          {/* Wild Campanula Bell */}
          <path d="M130 350 C180 320, 190 270, 175 220" strokeWidth="1" strokeDasharray="3 3" />
          <path d="M175 220 C165 210, 185 190, 200 200 C210 215, 195 235, 175 220 Z" fill="#F2DC91" fillOpacity="0.4" strokeWidth="0.8" />
        </svg>

        {/* Subtle Paper Grain Dots */}
        <div className="absolute inset-0 bg-[radial-gradient(#262D24_0.75px,transparent_0.75px)] [background-size:20px_20px] opacity-10" />
      </div>

      {/* ----------------------------------------------------------- */}
      {/* Top Banner & Quick Navigation Switcher                      */}
      {/* ----------------------------------------------------------- */}
      <nav className="relative z-20 border-b border-[#262D24]/10 bg-[#FAF7F0]/70 backdrop-blur-md px-6 py-3">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-editorial text-xs font-semibold uppercase tracking-[0.22em] text-[#262D24]/70">
              The Royal Botanical Herbarium • Circa 1954
            </span>
            <span className="hidden sm:inline-block text-[11px] text-[#262D24]/40">•</span>
            <span className="hidden sm:inline-block text-[11px] font-sans-geo font-medium text-[#262D24]/60">
              Cabinet of Natural Curiosities
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={playNatureChime}
              className={`clay-cream clay-button rounded-full px-3 py-1 text-xs font-sans-geo font-semibold text-[#262D24] flex items-center gap-1.5 ${
                audioPlaying ? 'clay-terracotta' : ''
              }`}
              title="Play Acoustic Nature Chime"
            >
              <span>{audioPlaying ? '🎵 Harmonizing...' : '🔔 Field Chime'}</span>
            </button>
            <Link
              href="/"
              className="clay-cream clay-button rounded-full px-3.5 py-1 text-xs font-sans-geo font-semibold text-[#262D24] hover:text-[#262D24]/80 flex items-center gap-1.5"
            >
              <span>⚡ Switch to KriyaOS Cyber-HUD</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* ----------------------------------------------------------- */}
      {/* Asymmetrical Editorial Master Layout                        */}
      {/* ----------------------------------------------------------- */}
      <div className="relative z-10 mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* ========================================================= */}
          {/* LEFT EDITORIAL COLUMN (Brand Masthead, Index & Filters)   */}
          {/* ========================================================= */}
          <aside className="lg:col-span-4 space-y-6">
            {/* Masthead Card in Tactile Butter Yellow Clay */}
            <div className="clay-butter rounded-[2.5rem] p-7 text-[#262D24] relative overflow-hidden">
              <div className="flex items-center justify-between text-xs font-editorial tracking-[0.2em] uppercase opacity-75">
                <span>Fascicle XII</span>
                <span>Autumn Edition</span>
              </div>

              <h1 className="mt-4 font-editorial text-4xl sm:text-5xl font-bold tracking-tight uppercase leading-[0.95]">
                FLORA &amp; <br />
                FOLIA
              </h1>

              <p className="mt-3 text-xs font-sans-geo leading-relaxed opacity-85">
                A tactile digital archive of British &amp; Continental wild flora, ferns, and apothecary specimens. Catalogued with botanical fidelity and sculpted in tactile matte ceramic clay.
              </p>

              {/* Status Specimen Pill */}
              <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#FAF7F0]/80 px-4 py-1.5 text-[11px] font-sans-geo font-semibold text-[#262D24] shadow-sm">
                <span className="h-2 w-2 rounded-full bg-[#E5A98C] animate-pulse" />
                <span>384 Certified Dried Specimens Online</span>
              </div>

              {/* Botanical Seal Stamp */}
              <div className="mt-6 pt-5 border-t border-[#262D24]/15 flex items-center justify-between text-[10px] font-editorial tracking-wider uppercase opacity-70">
                <span>Linnaean Binomial Index</span>
                <span>Ref: 1954-BOT-UK</span>
              </div>
            </div>

            {/* Clay Search & Specimen Filter */}
            <div className="clay-cream rounded-[2.2rem] p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-editorial text-sm font-bold uppercase tracking-wider text-[#262D24]">
                  Index By Taxonomy
                </h3>
                <span className="text-[10px] font-sans-geo text-[#262D24]/60">{filtered.length} Matches</span>
              </div>

              {/* Tactile 3D Clay Search Bar */}
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search species, plate, or region..."
                  className="w-full rounded-full bg-[#F7F3EB] border border-[#262D24]/10 px-4 py-2.5 pl-10 text-xs font-sans-geo text-[#262D24] placeholder:text-[#262D24]/40 focus:outline-none focus:ring-2 focus:ring-[#C4D1B8] shadow-inner"
                />
                <span className="absolute left-3.5 top-2.5 text-xs text-[#262D24]/50">🔍</span>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-2.5 text-xs text-[#262D24]/50 hover:text-[#262D24]"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Clay Filter Pills */}
              <div className="flex flex-wrap gap-2 pt-1">
                {[
                  { key: 'all', label: 'All Foliage (6)' },
                  { key: 'flora', label: 'Wildflowers' },
                  { key: 'ferns', label: 'Filices & Ferns' },
                  { key: 'medicinal', label: 'Apothecary Herbs' },
                ].map((item) => {
                  const isActive = activeCategory === item.key;
                  return (
                    <button
                      key={item.key}
                      onClick={() => setActiveCategory(item.key as any)}
                      className={`clay-button rounded-full px-3.5 py-1.5 text-xs font-sans-geo font-semibold transition-all ${
                        isActive
                          ? 'clay-terracotta text-[#262D24] clay-pill-active'
                          : 'clay-cream text-[#262D24]/75 hover:text-[#262D24]'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Personal Collector's Herbarium Folio Tray */}
            <div className="clay-butter rounded-[2.2rem] p-6 text-[#262D24] space-y-3">
              <div className="flex items-center justify-between border-b border-[#262D24]/10 pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-base">📁</span>
                  <h3 className="font-editorial text-xs font-bold uppercase tracking-wider">
                    My Herbarium Folio
                  </h3>
                </div>
                <span className="rounded-full bg-[#FAF7F0]/80 px-2 py-0.5 text-[10px] font-sans-geo font-bold">
                  {savedFolio.length} Pressed
                </span>
              </div>
              <p className="text-xs font-sans-geo leading-relaxed opacity-85">
                Specimens bookmarked for letterpress reproduction or botanical examination.
              </p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {savedFolio.map((id) => {
                  const spec = specimenCards.find((s) => s.id === id);
                  return (
                    <button
                      key={id}
                      onClick={() => setSelectedSpecimenId(id)}
                      className="clay-cream clay-button rounded-full px-2.5 py-1 text-[10px] font-sans-geo font-semibold flex items-center gap-1"
                    >
                      <span>🌸</span>
                      <span>{spec?.title.split(' ')[0]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Curator's Field Diary Note (Terracotta Peach Clay) */}
            <div className="clay-terracotta rounded-[2.2rem] p-6 text-[#262D24] space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-base">🌿</span>
                <span className="font-editorial text-xs font-bold uppercase tracking-widest opacity-85">
                  Curator&rsquo;s Field Dispatch
                </span>
              </div>
              <p className="text-xs font-sans-geo leading-relaxed opacity-90">
                &ldquo;Specimens gathered under morning dew must be pressed between clean blotting card within ninety minutes to preserve the delicate carmine tint of field poppies.&rdquo;
              </p>
              <div className="pt-2 flex items-center justify-between text-[10px] font-editorial tracking-wider opacity-75">
                <span>E. Sinclair, F.L.S.</span>
                <span>Field Station Kew</span>
              </div>
            </div>

            {/* Botanical Print Requisition CTA Card */}
            <div className="clay-sage rounded-[2.2rem] p-6 text-[#262D24] space-y-3">
              <h3 className="font-editorial text-sm font-bold uppercase tracking-wider">
                Order Letterpress Folio
              </h3>
              <p className="text-xs font-sans-geo leading-relaxed opacity-85">
                Hand-printed on 240gsm cotton mould-made paper using original Victorian lead type and woodblocks.
              </p>
              <button
                onClick={() => alert('Archival catalog request logged. Sent to British Botanical Press dispatcher.')}
                className="w-full clay-button clay-terracotta rounded-full py-2.5 text-xs font-sans-geo font-bold uppercase tracking-wider text-[#262D24] shadow-md hover:opacity-95 cursor-pointer"
              >
                Request Archival Catalog →
              </button>
            </div>
          </aside>

          {/* ========================================================= */}
          {/* CENTER & RIGHT MODULAR CARD GRID (Asymmetrical Editorial) */}
          {/* ========================================================= */}
          <main className="lg:col-span-8 space-y-6">
            {/* Large Featured Editorial Hero Banner in Sage Green Clay */}
            <section className="clay-sage rounded-[2.5rem] p-7 sm:p-9 text-[#262D24] relative overflow-hidden">
              <div className="relative z-10 max-w-xl space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full bg-[#FAF7F0]/80 px-3 py-1 text-[10px] font-editorial uppercase tracking-widest text-[#262D24]">
                  <span>Featured Monograph</span>
                  <span>•</span>
                  <span>June 1954 Monograph</span>
                </div>

                <h2 className="font-editorial text-3xl sm:text-4xl font-extrabold uppercase tracking-tight leading-tight">
                  THE CORN POPPY OF THE CHALK DOWNS
                </h2>

                <p className="text-xs sm:text-sm font-sans-geo leading-relaxed opacity-90">
                  Observation on the resilience of Papaver Rhoeas across arable margins and limestone slopes. Featuring hand-tinted copperplate engravings and pollen grain microstructure studies.
                </p>

                <div className="pt-3 flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => setSelectedSpecimenId('specimen-01')}
                    className="clay-button clay-terracotta rounded-full px-5 py-2.5 text-xs font-sans-geo font-bold uppercase tracking-wider text-[#262D24] shadow-md cursor-pointer"
                  >
                    Inspect Herbarium Specimen 🔍
                  </button>
                  <button
                    onClick={() => setActiveCategory('ferns')}
                    className="clay-button clay-butter rounded-full px-4 py-2.5 text-xs font-sans-geo font-bold uppercase tracking-wider text-[#262D24] cursor-pointer"
                  >
                    View Fern Plates
                  </button>
                </div>
              </div>

              {/* Decorative Botanical Leaf Watermark */}
              <div className="absolute -bottom-10 -right-10 w-64 h-64 text-[#262D24]/10 pointer-events-none">
                <svg viewBox="0 0 200 200" fill="currentColor">
                  <path d="M100 0 C120 40, 160 80, 200 100 C160 120, 120 160, 100 200 C80 160, 40 120, 0 100 C40 80, 80 40, 100 0 Z" />
                </svg>
              </div>
            </section>

            {/* Section Header */}
            <div className="flex items-center justify-between px-2 pt-2">
              <div>
                <p className="font-editorial text-xs font-bold uppercase tracking-[0.2em] text-[#262D24]/60">
                  Archival Catalog
                </p>
                <h3 className="font-editorial text-xl font-bold uppercase text-[#262D24]">
                  Selected Herbarium Plates
                </h3>
              </div>
              <span className="clay-butter rounded-full px-3 py-1 text-xs font-sans-geo font-bold text-[#262D24]">
                Showing {filtered.length} Specimens
              </span>
            </div>

            {/* Modular Specimen Cards Grid (Asymmetrical Editorial Flow) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filtered.map((item) => {
                const isSelected = selectedSpecimenId === item.id;
                const isBookmarked = savedFolio.includes(item.id);

                // Clay style mapping
                const clayClass =
                  item.clayType === 'sage'
                    ? 'clay-sage'
                    : item.clayType === 'terracotta'
                    ? 'clay-terracotta'
                    : 'clay-butter';

                return (
                  <article
                    key={item.id}
                    className={`${clayClass} rounded-[2.3rem] p-6 text-[#262D24] flex flex-col justify-between transition-all duration-200 hover:-translate-y-1 relative overflow-hidden group ${
                      isSelected ? 'ring-4 ring-[#262D24]/30' : ''
                    }`}
                  >
                    <div>
                      {/* Top Plate Metadata */}
                      <div className="flex items-center justify-between text-[10px] font-editorial uppercase tracking-wider opacity-75 pb-2 border-b border-[#262D24]/10">
                        <span>{item.tag}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{item.origin.split('•')[0]}</span>
                          <button
                            onClick={() => toggleFolio(item.id)}
                            className="text-xs hover:scale-125 transition-transform"
                            title={isBookmarked ? 'Remove from Folio' : 'Save to Folio'}
                          >
                            {isBookmarked ? '🔖' : '📑'}
                          </button>
                        </div>
                      </div>

                      {/* Binomial Heading */}
                      <h4 className="mt-3 font-editorial text-xl font-extrabold tracking-tight uppercase leading-snug">
                        {item.title}
                      </h4>

                      {/* Vernacular Common Name & Family */}
                      <p className="text-xs font-sans-geo font-semibold text-[#262D24]/85">
                        {item.commonName} <span className="font-normal opacity-60">({item.family})</span>
                      </p>

                      {/* Description */}
                      <p className="mt-3 text-xs font-sans-geo leading-relaxed opacity-85">
                        {item.description}
                      </p>
                    </div>

                    {/* Bottom Metadata & Clay Action Pill */}
                    <div className="mt-6 pt-4 border-t border-[#262D24]/15 space-y-3">
                      <div className="grid grid-cols-2 gap-2 text-[10px] font-sans-geo opacity-75">
                        <div>
                          <span className="block text-[9px] uppercase tracking-wider text-[#262D24]/60">Habitat Elevation</span>
                          <span className="font-semibold">{item.elevation}</span>
                        </div>
                        <div>
                          <span className="block text-[9px] uppercase tracking-wider text-[#262D24]/60">Phenology</span>
                          <span className="font-semibold">{item.bloomPeriod}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="inline-flex rounded-full bg-[#FAF7F0]/80 px-2.5 py-0.5 text-[10px] font-editorial uppercase tracking-widest text-[#262D24]">
                          {item.badge}
                        </span>

                        <button
                          onClick={() => setSelectedSpecimenId(isSelected ? null : item.id)}
                          className="clay-button clay-cream rounded-full px-3.5 py-1 text-xs font-sans-geo font-bold text-[#262D24] hover:bg-white cursor-pointer"
                        >
                          {isSelected ? '✕ Close Plate' : 'Study Plate →'}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            {/* ========================================================= */}
            {/* INTERACTIVE SPECIMEN DISSECTION DRAWER / LIGHTBOX         */}
            {/* ========================================================= */}
            {activeSpecimen && (
              <div className="clay-cream rounded-[2.5rem] p-7 sm:p-8 border-2 border-[#262D24]/20 space-y-5 animate-in fade-in duration-300">
                <div className="flex items-center justify-between border-b border-[#262D24]/15 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🔬</span>
                    <div>
                      <span className="text-[10px] font-editorial uppercase tracking-[0.2em] text-[#262D24]/60">
                        Botanical Monograph Examination
                      </span>
                      <h3 className="font-editorial text-2xl font-bold uppercase text-[#262D24]">
                        {activeSpecimen.title}
                      </h3>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedSpecimenId(null)}
                    className="clay-button clay-terracotta rounded-full h-8 w-8 flex items-center justify-center text-xs font-bold"
                  >
                    ✕
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {activeSpecimen.anatomy.map((anat, idx) => (
                    <div key={idx} className="clay-sage rounded-2xl p-4 space-y-1">
                      <span className="font-editorial text-xs font-bold uppercase tracking-wider text-[#262D24]">
                        {anat.label}
                      </span>
                      <p className="text-xs font-sans-geo leading-relaxed opacity-90">
                        {anat.detail}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="p-4 rounded-2xl bg-[#F7F3EB] border border-[#262D24]/10 flex flex-wrap items-center justify-between gap-3 text-xs font-sans-geo">
                  <div>
                    <strong>Curatorial Archive:</strong> Stored in Cabinet 4, Drawer 12 at the Royal Herbarium.
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleFolio(activeSpecimen.id)}
                      className="clay-button clay-terracotta rounded-full px-4 py-1.5 font-bold"
                    >
                      {savedFolio.includes(activeSpecimen.id) ? '✓ In Your Folio' : '+ Add to Herbarium Folio'}
                    </button>
                    <button
                      onClick={playNatureChime}
                      className="clay-button clay-butter rounded-full px-3 py-1.5 font-bold"
                    >
                      🔔 Play Acoustic Chime
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Empty State Fallback */}
            {filtered.length === 0 && (
              <div className="clay-cream rounded-[2.5rem] p-12 text-center space-y-3">
                <span className="text-3xl">🥀</span>
                <h4 className="font-editorial text-lg font-bold uppercase text-[#262D24]">
                  No Archival Specimens Found
                </h4>
                <p className="text-xs font-sans-geo text-[#262D24]/70 max-w-sm mx-auto">
                  No plates matched &ldquo;{searchQuery}&rdquo;. Try browsing all classes or clear the search query.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setActiveCategory('all');
                  }}
                  className="clay-button clay-terracotta rounded-full px-4 py-2 text-xs font-sans-geo font-bold text-[#262D24] cursor-pointer"
                >
                  Reset Taxonomic Filter
                </button>
              </div>
            )}

            {/* Archival Preservation Method & Technical Colophon */}
            <section className="clay-cream rounded-[2.5rem] p-6 sm:p-7 text-[#262D24] space-y-3">
              <div className="flex items-center justify-between border-b border-[#262D24]/10 pb-3">
                <h4 className="font-editorial text-xs font-bold uppercase tracking-[0.2em] text-[#262D24]">
                  Conservation &amp; Preservation Standards
                </h4>
                <span className="text-[10px] font-sans-geo text-[#262D24]/60">British Standard 1954</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-sans-geo leading-relaxed opacity-85">
                <div>
                  <strong className="block text-[#262D24] font-semibold">1. Dehydration</strong>
                  Blotting sheets changed every 24 hours under 15kg distributed cedar press.
                </div>
                <div>
                  <strong className="block text-[#262D24] font-semibold">2. Mounting Gum</strong>
                  Pure natural gum arabic and linen strips; zero synthetic cellulose acetate.
                </div>
                <div>
                  <strong className="block text-[#262D24] font-semibold">3. Microclimate</strong>
                  Stored at 16°C and 45% relative humidity in camphor-lined oak drawers.
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>

      {/* ----------------------------------------------------------- */}
      {/* Editorial Colophon Footer                                   */}
      {/* ----------------------------------------------------------- */}
      <footer className="relative z-10 mt-12 border-t border-[#262D24]/15 bg-[#FAF7F0]/60 py-8 px-6 text-center text-xs font-editorial text-[#262D24]/70">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold uppercase tracking-widest text-[#262D24]">Flora &amp; Folia</span>
            <span>•</span>
            <span className="font-sans-geo text-[11px]">Botanical Clay-Editorial Aesthetic Landing Page</span>
          </div>
          <div className="flex items-center gap-4 text-[11px] font-sans-geo">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#C4D1B8]" /> Sage Green (#C4D1B8)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#E5A98C]" /> Terracotta Peach (#E5A98C)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#F2DC91]" /> Butter Yellow (#F2DC91)
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
