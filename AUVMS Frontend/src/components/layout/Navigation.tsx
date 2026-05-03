import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/input";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
  SheetDescription,
} from "@/components/overlay";
import {
  Menu,
  X,
  ChevronDown,
  LogIn,
  Phone,
  Mail,
  MapPin,
  ExternalLink,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

/* ─── colours ─── */
const BLUE = "#0a2a66";
const ACCENT = "#f15a24";

interface NavChild {
  name: string;
  href: string;
  desc?: string;
}
interface NavItem {
  name: string;
  href?: string;
  children?: NavChild[];
}

const NAV: NavItem[] = [
  { name: "Home", href: "#home" },
  {
    name: "About Us",
    children: [
      { name: "About Aditya", href: "#about", desc: "Our story & heritage" },
      { name: "Vision & Mission", href: "#about", desc: "Purpose & direction" },
      { name: "Leadership", href: "#about", desc: "Management & Governors" },
      {
        name: "Infrastructure",
        href: "#about",
        desc: "Labs, libraries & more",
      },
      {
        name: "Accreditations",
        href: "#accreditations",
        desc: "NAAC, NIRF, NBA",
      },
    ],
  },
  {
    name: "Academics",
    children: [
      {
        name: "UG Programs",
        href: "#programs",
        desc: "B.Tech, BBA, B.Sc & more",
      },
      { name: "PG Programs", href: "#programs", desc: "M.Tech, MBA, M.Sc" },
      { name: "Ph.D Programs", href: "#programs", desc: "Doctoral research" },
      { name: "Departments", href: "#programs", desc: "All faculties" },
    ],
  },
  {
    name: "Admissions",
    children: [
      { name: "How to Apply", href: "#contact", desc: "Step-by-step guide" },
      { name: "Fee Structure", href: "#contact", desc: "Transparent pricing" },
      { name: "Scholarships", href: "#contact", desc: "Merit & need-based" },
    ],
  },
  { name: "Placements", href: "#placements" },
  { name: "Research", href: "#about" },
  { name: "Campus Life", href: "#campuslife" },
  { name: "Contact", href: "#contact" },
];

const TICKER = [
  "📢 Admissions Open 2025-26 — Apply Now!",
  "🏅 NAAC A+ Accredited University",
  "🎓 Record Placements — 95% Placement Rate",
  "🌍 International Tie-ups with 50+ Universities",
  "📚 New Programs — AI & Data Science, Cyber Security",
  "🏆 NIRF Ranked — Top Universities in India",
];

const SOCIALS = [
  { label: "Facebook", icon: "f", url: "#" },
  { label: "Instagram", icon: "◉", url: "#" },
  { label: "YouTube", icon: "▶", url: "#" },
  { label: "LinkedIn", icon: "in", url: "#" },
];

const Navigation = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeDD, setActiveDD] = useState<string | null>(null);
  const [mobileDD, setMobileDD] = useState<string | null>(null);
  const ddTimer = useRef<ReturnType<typeof setTimeout>>();
  const nav = useNavigate();

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const go = (href: string) => {
    document.querySelector(href)?.scrollIntoView({ behavior: "smooth" });
    setMobileOpen(false);
    setActiveDD(null);
  };

  const ddEnter = (n: string) => {
    clearTimeout(ddTimer.current);
    setActiveDD(n);
  };
  const ddLeave = () => {
    ddTimer.current = setTimeout(() => setActiveDD(null), 180);
  };

  return (
    <>
      {/* ─────────── TOP TICKER ─────────── */}
      <div
        className="relative overflow-hidden text-white text-[11px] sm:text-xs font-medium h-9 flex items-center z-[60]"
        style={{
          background: `linear-gradient(90deg, ${BLUE} 0%, #122e6e 50%, ${BLUE} 100%)`,
        }}
      >
        {/* "Latest" pill */}
        <div
          className="absolute left-0 top-0 bottom-0 z-10 flex items-center pl-3 pr-5"
          style={{
            background: `linear-gradient(90deg, ${BLUE} 70%, transparent)`,
          }}
        >
          <span className="bg-orange-500 text-white text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full">
            Live
          </span>
        </div>

        <div className="ticker-wrap ml-20 sm:ml-24">
          <div className="ticker-track">
            {[...TICKER, ...TICKER].map((t, i) => (
              <span
                key={i}
                className="ticker-item whitespace-nowrap px-8 text-white/85"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ─────────── CONTACT STRIP (lg+) ─────────── */}
      <div className="hidden lg:block bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 z-[55]">
        <div className="container mx-auto px-6 py-1.5 flex items-center justify-between">
          <div className="flex items-center gap-6 text-[11px] text-gray-500">
            <a
              href="tel:+919989776661"
              className="flex items-center gap-1.5 hover:text-gray-900 transition-colors"
            >
              <Phone className="h-3 w-3" /> +91 9989 776661
            </a>
            <a
              href="mailto:info@adityauniversity.in"
              className="flex items-center gap-1.5 hover:text-gray-900 transition-colors"
            >
              <Mail className="h-3 w-3" /> info@adityauniversity.in
            </a>
            <span className="flex items-center gap-1.5">
              <MapPin className="h-3 w-3" /> Surampalem, Kakinada, AP
            </span>
          </div>
          <div className="flex items-center gap-3">
            {SOCIALS.map((s) => (
              <a
                key={s.label}
                href={s.url}
                aria-label={s.label}
                className="h-6 w-6 rounded-full bg-gray-200/80 flex items-center justify-center text-[10px] font-bold text-gray-500 hover:bg-[#0a2a66] hover:text-white transition-all"
              >
                {s.icon}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* ─────────── MAIN NAVBAR ─────────── */}
      <header
        className={`sticky top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? "bg-white/[0.97] backdrop-blur-2xl shadow-[0_2px_24px_-4px_rgba(10,42,102,0.12)] border-b border-gray-100"
            : "bg-white shadow-sm"
        }`}
      >
        <div className="container mx-auto px-3 sm:px-4 lg:px-6">
          <div className="flex items-center justify-between h-[64px] md:h-[72px]">
            {/* ── Logo ── */}
            <a
              href="#home"
              onClick={(e) => {
                e.preventDefault();
                go("#home");
              }}
              className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-shrink-0 group"
            >
              <img
                src="/auslogo.png"
                alt="Aditya University"
                className="h-10 sm:h-11 lg:h-[52px] w-auto transition-transform group-hover:scale-105"
              />
              <div className="hidden sm:block min-w-0">
                <h1
                  className="font-extrabold text-[15px] md:text-[17px] leading-tight tracking-tight"
                  style={{ color: BLUE }}
                >
                  Aditya University
                </h1>
                <p className="text-[10px] md:text-[11px] text-gray-400 leading-tight font-medium tracking-wide">
                  Kakinada, Andhra Pradesh
                </p>
              </div>
            </a>

            {/* ── Desktop Nav ── */}
            <nav className="hidden lg:flex items-center">
              {NAV.map((item) =>
                item.children ? (
                  <div
                    key={item.name}
                    className="relative"
                    onMouseEnter={() => ddEnter(item.name)}
                    onMouseLeave={ddLeave}
                  >
                    <button
                      className={`flex items-center gap-1 px-3 xl:px-3.5 py-2 rounded-lg text-[13px] font-semibold transition-all duration-200
                        ${
                          activeDD === item.name
                            ? "text-[#0a2a66] bg-blue-50/80"
                            : "text-gray-600 hover:text-[#0a2a66] hover:bg-gray-50/80"
                        }`}
                    >
                      {item.name}
                      <ChevronDown
                        className={`h-3.5 w-3.5 transition-transform duration-300 ${activeDD === item.name ? "rotate-180" : ""}`}
                      />
                    </button>

                    {/* Mega-dropdown */}
                    <div
                      className={`absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-white rounded-2xl shadow-[0_20px_60px_-12px_rgba(10,42,102,0.18)] border border-gray-100/80 min-w-[280px] py-2 transition-all duration-300 origin-top ${
                        activeDD === item.name
                          ? "opacity-100 scale-100 translate-y-0 pointer-events-auto"
                          : "opacity-0 scale-95 -translate-y-2 pointer-events-none"
                      }`}
                      onMouseEnter={() => ddEnter(item.name)}
                      onMouseLeave={ddLeave}
                    >
                      <div className="px-4 py-2 border-b border-gray-50 mb-1">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                          {item.name}
                        </p>
                      </div>
                      {item.children.map((child) => (
                        <button
                          key={child.name}
                          onClick={() => go(child.href)}
                          className="w-full text-left px-4 py-2.5 flex items-start gap-3 hover:bg-gradient-to-r hover:from-blue-50/60 hover:to-transparent transition-all group/dd rounded-lg mx-1"
                          style={{ width: "calc(100% - 8px)" }}
                        >
                          <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover/dd:bg-blue-100 transition-colors">
                            <ExternalLink className="h-3.5 w-3.5 text-blue-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-800 group-hover/dd:text-[#0a2a66]">
                              {child.name}
                            </p>
                            {child.desc && (
                              <p className="text-[11px] text-gray-400 mt-0.5">
                                {child.desc}
                              </p>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <button
                    key={item.name}
                    onClick={() => go(item.href!)}
                    className="px-3 xl:px-3.5 py-2 rounded-lg text-[13px] font-semibold text-gray-600 hover:text-[#0a2a66] hover:bg-gray-50/80 transition-all duration-200"
                  >
                    {item.name}
                  </button>
                ),
              )}
            </nav>

            {/* ── Desktop CTA ── */}
            <div className="hidden lg:flex items-center gap-2.5 flex-shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => nav("/login")}
                className="font-semibold text-[13px] h-10 border-2 rounded-xl hover:bg-blue-50/50 transition-all"
                style={{ borderColor: BLUE, color: BLUE }}
              >
                <LogIn className="h-4 w-4 mr-1.5" />
                Login
              </Button>
              <Button
                size="sm"
                className="text-white font-bold text-[13px] h-10 px-6 rounded-xl shadow-[0_4px_16px_-2px_rgba(241,90,36,0.4)] hover:shadow-[0_6px_24px_-4px_rgba(241,90,36,0.5)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                style={{ backgroundColor: ACCENT }}
                onClick={() => nav("/visitor-form")}
              >
                Apply Now
              </Button>
            </div>

            {/* ── Mobile ── */}
            <div className="lg:hidden flex items-center gap-2">
              <Button
                size="sm"
                className="text-white text-xs font-bold h-9 px-4 rounded-xl shadow-md"
                style={{ backgroundColor: ACCENT }}
                onClick={() => nav("/visitor-form")}
              >
                Apply
              </Button>
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-10 w-10 p-0 rounded-xl hover:bg-gray-100"
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="right"
                  className="w-[300px] sm:w-[340px] px-0 py-0 border-l-0 shadow-2xl"
                >
                  <SheetTitle className="sr-only">Navigation</SheetTitle>
                  <SheetDescription className="sr-only">
                    Navigate Aditya University
                  </SheetDescription>
                  <div className="flex flex-col h-full bg-white">
                    {/* Mobile header */}
                    <div className="flex items-center justify-between px-5 py-4 border-b bg-gradient-to-r from-white to-gray-50">
                      <div className="flex items-center gap-2.5">
                        <img
                          src="/auslogo.png"
                          alt="Aditya"
                          className="h-9 w-auto"
                        />
                        <div>
                          <span
                            className="font-extrabold text-sm block"
                            style={{ color: BLUE }}
                          >
                            Aditya University
                          </span>
                          <span className="text-[10px] text-gray-400">
                            Kakinada, AP
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setMobileOpen(false)}
                        className="h-10 w-10 p-0 rounded-xl"
                      >
                        <X className="h-5 w-5" />
                      </Button>
                    </div>

                    {/* Mobile links */}
                    <nav className="flex-1 overflow-y-auto py-3">
                      {NAV.map((item) =>
                        item.children ? (
                          <div key={item.name}>
                            <button
                              onClick={() =>
                                setMobileDD(
                                  mobileDD === item.name ? null : item.name,
                                )
                              }
                              className="w-full flex items-center justify-between px-5 py-3.5 text-sm font-semibold text-gray-800 hover:bg-gray-50 transition-colors"
                            >
                              {item.name}
                              <ChevronDown
                                className={`h-4 w-4 text-gray-400 transition-transform duration-300 ${mobileDD === item.name ? "rotate-180 text-blue-600" : ""}`}
                              />
                            </button>
                            <div
                              className={`overflow-hidden transition-all duration-300 ${mobileDD === item.name ? "max-h-96" : "max-h-0"}`}
                            >
                              <div className="bg-gray-50/80 border-y border-gray-100 py-1">
                                {item.children.map((child) => (
                                  <button
                                    key={child.name}
                                    onClick={() => go(child.href)}
                                    className="w-full text-left px-8 py-2.5 text-sm text-gray-600 hover:text-[#0a2a66] hover:bg-blue-50/50 transition-colors"
                                  >
                                    {child.name}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <button
                            key={item.name}
                            onClick={() => go(item.href!)}
                            className="w-full text-left px-5 py-3.5 text-sm font-semibold text-gray-800 hover:bg-gray-50 transition-colors"
                          >
                            {item.name}
                          </button>
                        ),
                      )}
                    </nav>

                    {/* Mobile footer */}
                    <div className="border-t bg-gradient-to-r from-gray-50 to-white px-5 py-5 space-y-2.5">
                      <Button
                        variant="outline"
                        className="w-full h-11 font-semibold border-2 rounded-xl"
                        style={{ borderColor: BLUE, color: BLUE }}
                        onClick={() => {
                          nav("/login");
                          setMobileOpen(false);
                        }}
                      >
                        <LogIn className="h-4 w-4 mr-2" /> Login
                      </Button>
                      <Button
                        className="w-full h-11 text-white font-bold rounded-xl shadow-lg"
                        style={{ backgroundColor: ACCENT }}
                        onClick={() => {
                          nav("/visitor-form");
                          setMobileOpen(false);
                        }}
                      >
                        Apply Now
                      </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>
    </>
  );
};

export default Navigation;
