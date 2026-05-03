import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  Award,
  BookOpen,
  Building,
  Calendar,
  CheckCircle,
  Clock,
  Globe,
  GraduationCap,
  Layers,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Play,
  Quote,
  Shield,
  Sparkles,
  Star,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import Navigation from "@/components/layout/Navigation";
import { Button, Input, Textarea } from "@/components/input";

/* ─── brand tokens ─── */
const BLUE = "#0a2a66";
const L_BLUE = "#0a4d9b";
const ACCENT = "#f15a24";
const GOLD = "#f59e0b";

/* ─── animated counter ─── */
function useCounter(target: number, dur = 2000, go = false) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!go) return;
    let cur = 0;
    const step = Math.ceil(target / (dur / 16));
    const id = setInterval(() => {
      cur += step;
      if (cur >= target) {
        setV(target);
        clearInterval(id);
      } else setV(cur);
    }, 16);
    return () => clearInterval(id);
  }, [target, dur, go]);
  return v;
}

/* ─── section visibility ─── */
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setSeen(true);
          obs.disconnect();
        }
      },
      { threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, seen };
}

/* ─────────────────────────────────────────────────────── */

const Landing = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    purpose: "",
  });

  /* ── hero slides ── */
  const slides = useMemo(
    () => [
      {
        title: "Welcome to\nAditya University",
        sub: "Embark on a transformative journey where academics, research, and community thrive together.",
        img: "https://adityauniversity.in/static/media/aboutaditya.060da51267a14f39b38a.webp",
        badge: "NAAC A+  ·  NIRF Ranked",
      },
      {
        title: "World-Class\nInfrastructure",
        sub: "State-of-the-art laboratories, smart classrooms, and a lush green campus spanning 100+ acres.",
        img: "https://adityauniversity.in/static/media/infrastructure.434e4ffc42192b11f7bf.webp",
        badge: "100+ Acre Campus",
      },
      {
        title: "Placements\nthat Propel",
        sub: "Dedicated Career Excellence Center delivering record-breaking placements and global internships.",
        img: "https://adityauniversity.in/static/media/placements.b50367a12684414833a6.webp",
        badge: "2025 Placements",
      },
    ],
    [],
  );

  const [slide, setSlide] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval>>();
  const resetTimer = useCallback(() => {
    clearInterval(timer.current);
    timer.current = setInterval(
      () => setSlide((p) => (p + 1) % slides.length),
      6000,
    );
  }, [slides.length]);
  useEffect(() => {
    resetTimer();
    return () => clearInterval(timer.current);
  }, [resetTimer]);

  /* ── stats ── */
  const statsVis = useInView(0.35);
  const c1 = useCounter(50000, 2200, statsVis.seen);
  const c2 = useCounter(500, 1600, statsVis.seen);
  const c3 = useCounter(100, 1300, statsVis.seen);
  const c4 = useCounter(95, 1500, statsVis.seen);
  const stats = [
    {
      v: c1,
      s: "+",
      l: "Students & Alumni",
      icon: <Users className="h-6 w-6" />,
    },
    {
      v: c2,
      s: "+",
      l: "Faculty Experts",
      icon: <BookOpen className="h-6 w-6" />,
    },
    {
      v: c3,
      s: "+",
      l: "Programs Offered",
      icon: <GraduationCap className="h-6 w-6" />,
    },
    {
      v: c4,
      s: "%",
      l: "Placement Rate",
      icon: <Trophy className="h-6 w-6" />,
    },
  ];

  /* ── sections in-view ── */
  const aboutVis = useInView();
  const progVis = useInView();
  const vmsVis = useInView();
  const placeVis = useInView();
  const campusVis = useInView();
  const testiVis = useInView();
  const accredVis = useInView();
  const contactVis = useInView();

  /* ── programs ── */
  const programs = [
    {
      title: "Undergraduate",
      desc: "Industry-aligned UG degrees with immersive learning, internships, and global exposure.",
      icon: <GraduationCap className="h-7 w-7" />,
      count: "40+",
    },
    {
      title: "Postgraduate",
      desc: "Future-focused PG pathways with cutting-edge research and industry mentorship.",
      icon: <BookOpen className="h-7 w-7" />,
      count: "30+",
    },
    {
      title: "Doctoral (Ph.D)",
      desc: "Mentored Ph.D programs across interdisciplinary domains and funded research.",
      icon: <Award className="h-7 w-7" />,
      count: "20+",
    },
    {
      title: "Corporate & Executive",
      desc: "Executive diplomas and corporate-ready programs for working professionals.",
      icon: <Building className="h-7 w-7" />,
      count: "10+",
    },
  ];

  /* ── VMS features ── */
  const features = [
    {
      icon: <Calendar className="h-6 w-6" />,
      title: "Smart Scheduling",
      desc: "Book campus visits, faculty meets, and facility tours in minutes.",
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: "Secure QR Access",
      desc: "QR-based entry, multi-level approvals, and digital check-ins.",
    },
    {
      icon: <Users className="h-6 w-6" />,
      title: "Staff Dashboard",
      desc: "Unified portal for staff to approve, reschedule, and track visits.",
    },
    {
      icon: <Zap className="h-6 w-6" />,
      title: "Instant Notifications",
      desc: "Real-time SMS, email, and push alerts for every stakeholder.",
    },
    {
      icon: <CheckCircle className="h-6 w-6" />,
      title: "Smart Automations",
      desc: "Auto-workflows for recurring visitors, vendors, and events.",
    },
    {
      icon: <Globe className="h-6 w-6" />,
      title: "Mobile Optimized",
      desc: "Responsive experience across phones, tablets, and kiosks.",
    },
  ];

  /* ── placements ── */
  const placementImgs = [
    "https://adityauniversity.in/adtppu//banners_info/attachment-1758529545634.webp",
    "https://adityauniversity.in/adtppu//banners_info/attachment-1758529583079.webp",
    "https://adityauniversity.in/adtppu//banners_info/attachment-1760696860921.webp",
    "https://adityauniversity.in/adtppu//banners_info/attachment-1760697081485.webp",
    "https://adityauniversity.in/adtppu//banners_info/attachment-1758529638687.webp",
    "https://adityauniversity.in/adtppu//banners_info/attachment-1760697154899.webp",
  ];

  const recruiterLogos = [
    "https://upload.wikimedia.org/wikipedia/commons/2/2f/Google_2015_logo.svg",
    "https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg",
    "https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg",
    "https://upload.wikimedia.org/wikipedia/commons/thumb/9/95/Infosys_logo.svg/1280px-Infosys_logo.svg.png",
    "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b1/Tata_Consultancy_Services_Logo.svg/1280px-Tata_Consultancy_Services_Logo.svg.png",
    "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/Wipro_Primary_Logo_Color_RGB.svg/1280px-Wipro_Primary_Logo_Color_RGB.svg.png",
    "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Accenture.svg/1280px-Accenture.svg.png",
    "https://upload.wikimedia.org/wikipedia/commons/thumb/5/50/Oracle_logo.svg/1280px-Oracle_logo.svg.png",
  ];

  /* ── campus life ── */
  const clubs = [
    {
      title: "Abhinaya Club",
      img: "https://adityauniversity.in/static/media/abhinayaclub.672434e0b4d877bb3254.webp",
      desc: "Dance, drama & performing arts",
    },
    {
      title: "Sports in Action",
      img: "https://adityauniversity.in/static/media/sports.2d779f14c6f8a6154d01.webp",
      desc: "Cricket, tennis, athletics & more",
    },
    {
      title: "Inclusive Ecosystem",
      img: "https://adityauniversity.in/static/media/inclusive.348508bd7edd7e40a23f.webp",
      desc: "Community engagement & diversity",
    },
    {
      title: "Spiritual Harmony",
      img: "https://adityauniversity.in/static/media/harmony.3e6905947681129ebdef.webp",
      desc: "Yoga, meditation & mindfulness",
    },
  ];

  /* ── testimonials ── */
  const testimonials = [
    {
      name: "M. Durga Prasanna",
      dept: "ECE — Class of 2024",
      txt: "Life at Aditya is warm and supportive. Faculty and management care deeply about growth and skill building. I got placed at a top MNC.",
      avatar:
        "https://adityauniversity.in/static/media/prasanna.f489263db7c0be151803.webp",
    },
    {
      name: "M. Sarath Chandra",
      dept: "CSE — Class of 2024",
      txt: "Hands-on hackathons and mentoring helped me step into a global role with confidence. The campus is vibrant 24×7.",
      avatar:
        "https://adityauniversity.in/static/media/prasad.aa133cf84da56aabe956.webp",
    },
    {
      name: "M. Sri Durga Kalyan",
      dept: "Petroleum — Class of 2023",
      txt: "A fine balance of academics and co-curriculars pushed my ideas from research to reality. Aditya gave me amazing opportunities.",
      avatar:
        "https://adityauniversity.in/static/media/sarath.d674a553566f5d5fa737.webp",
    },
  ];

  /* ── accreditations ── */
  const accreditations = [
    "https://adityauniversity.in/static/media/naac.c2dc2d03caf809852f0a.webp",
    "https://adityauniversity.in/static/media/nirf.1af8f46d238bc95c8302.webp",
    "https://adityauniversity.in/static/media/nba.2bf5bfa2ab6994b6befc.webp",
    "https://adityauniversity.in/static/media/thumbnail_Impact%20Ranking.5815c1583851b78de771.webp",
    "https://adityauniversity.in/static/media/thumbnail_QS.8a4ed54d7b6e1d0440ce.webp",
    "https://adityauniversity.in/static/media/week.d90bd6a20bbaa768e1ea.webp",
  ];

  const scrollContact = () =>
    document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" });

  /* ═══════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════ */
  return (
    <div
      id="main-content"
      className="min-h-screen bg-white text-gray-900 overflow-x-hidden"
    >
      <Navigation />

      {/* ═══════ HERO ═══════ */}
      <section
        id="home"
        className="relative h-[90vh] min-h-[560px] max-h-[860px] overflow-hidden"
      >
        {/* Video */}
        <div className="absolute inset-0">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="h-full w-full object-cover scale-[1.02]"
            poster={slides[0].img}
          >
            <source
              src="https://www.adityauniversity.in/static/media/Website.8f1642f918abf244cddf.mp4"
              type="video/mp4"
            />
          </video>
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(160deg, rgba(10,42,102,0.88) 0%, rgba(10,42,102,0.72) 40%, rgba(241,90,36,0.45) 100%)",
            }}
          />
          {/* subtle noise overlay */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
            }}
          />
        </div>

        {/* Content */}
        <div className="relative z-20 h-full flex items-center">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              {/* badge */}
              <div className="anim-fade-up inline-flex items-center gap-2.5 rounded-full bg-white/10 backdrop-blur-md px-5 py-2 text-sm font-semibold border border-white/20 text-white mb-6">
                <Sparkles className="h-4 w-4 text-amber-300" />
                <span className="tracking-wide">{slides[slide].badge}</span>
              </div>

              {/* title */}
              <h1
                key={`t-${slide}`}
                className="anim-hero-title text-4xl sm:text-5xl lg:text-[3.75rem] xl:text-7xl font-black leading-[1.05] tracking-tight text-white whitespace-pre-line mb-5"
              >
                {slides[slide].title}
              </h1>

              {/* subtitle */}
              <p
                key={`s-${slide}`}
                className="anim-hero-sub text-lg sm:text-xl text-white/85 max-w-2xl leading-relaxed mb-8"
              >
                {slides[slide].sub}
              </p>

              {/* CTA */}
              <div
                className="anim-fade-up flex flex-wrap gap-4"
                style={{ animationDelay: "0.5s" }}
              >
                <Button
                  size="lg"
                  onClick={() => navigate("/visitor-form")}
                  className="text-white text-base px-8 h-13 rounded-xl font-bold shadow-[0_8px_32px_-6px_rgba(241,90,36,0.5)] hover:shadow-[0_12px_40px_-8px_rgba(241,90,36,0.6)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                  style={{ backgroundColor: ACCENT }}
                >
                  Plan a Campus Visit
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button
                  size="lg"
                  variant="secondary"
                  onClick={() => navigate("/login")}
                  className="bg-white/10 backdrop-blur-md border-2 border-white/30 text-white hover:bg-white/20 text-base px-8 h-13 rounded-xl font-bold transition-all duration-200"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Login / Apply
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Slide indicators */}
        <div className="absolute bottom-8 inset-x-0 flex justify-center gap-3 z-30">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                setSlide(i);
                resetTimer();
              }}
              className={`h-1.5 rounded-full transition-all duration-500 ${i === slide ? "w-12 bg-white shadow-lg" : "w-3 bg-white/40 hover:bg-white/60"}`}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>

        {/* Bottom gradient fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0a2a66] to-transparent z-[15]" />
      </section>

      {/* ═══════ STATS ═══════ */}
      <section
        ref={statsVis.ref}
        className="relative -mt-1"
        style={{
          background: `linear-gradient(180deg, ${BLUE} 0%, #0d3578 100%)`,
        }}
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-0">
            {stats.map((s, i) => (
              <div
                key={s.l}
                className={`text-center text-white relative ${i < 3 ? "md:border-r md:border-white/10" : ""}`}
              >
                <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-white/10 mb-3 text-amber-300">
                  {s.icon}
                </div>
                <div className="text-3xl sm:text-4xl lg:text-5xl font-black tabular-nums tracking-tight">
                  {s.v.toLocaleString()}
                  <span className="text-amber-300">{s.s}</span>
                </div>
                <div className="text-sm text-white/60 font-medium mt-1">
                  {s.l}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ ABOUT ═══════ */}
      <section
        id="about"
        ref={aboutVis.ref}
        className={`py-20 sm:py-24 lg:py-28 bg-white section-anim ${aboutVis.seen ? "section-visible" : ""}`}
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 grid gap-14 lg:grid-cols-2 items-center">
          <div className="space-y-6">
            <span
              className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-widest"
              style={{ backgroundColor: "#e8f0fe", color: L_BLUE }}
            >
              <Building className="h-3.5 w-3.5" /> About Aditya University
            </span>
            <h2
              className="text-3xl sm:text-4xl lg:text-[2.75rem] font-black leading-tight"
              style={{ color: BLUE }}
            >
              Empowering Minds.
              <br />
              <span style={{ color: ACCENT }}>Shaping Global Futures.</span>
            </h2>
            <p className="text-gray-500 text-base sm:text-lg leading-relaxed">
              A vibrant campus spanning diverse disciplines, global
              collaborations, and industry-driven curricula. Aditya University
              blends rigorous academics with innovation, entrepreneurship, and
              community impact&nbsp;— nurturing leaders since 1998.
            </p>
            <div className="grid sm:grid-cols-2 gap-4 pt-1">
              {[
                {
                  icon: <Award className="h-5 w-5" />,
                  c: ACCENT,
                  title: "NAAC A+ Accredited",
                  desc: "Recognized for academic quality.",
                },
                {
                  icon: <Star className="h-5 w-5" />,
                  c: L_BLUE,
                  title: "Innovation First",
                  desc: "CoEs, research labs, startup hub.",
                },
                {
                  icon: <Globe className="h-5 w-5" />,
                  c: L_BLUE,
                  title: "Global Exposure",
                  desc: "International exchanges & pathways.",
                },
                {
                  icon: <Users className="h-5 w-5" />,
                  c: ACCENT,
                  title: "Student-First",
                  desc: "Wellness, sports, and vibrant clubs.",
                },
              ].map((f) => (
                <div
                  key={f.title}
                  className="flex items-start gap-3 p-4 rounded-2xl bg-gray-50/80 hover:bg-white hover:shadow-md border border-transparent hover:border-gray-100 transition-all duration-300 group"
                >
                  <div
                    className="mt-0.5 flex-shrink-0 transition-transform group-hover:scale-110"
                    style={{ color: f.c }}
                  >
                    {f.icon}
                  </div>
                  <div>
                    <div className="font-bold text-sm text-gray-900">
                      {f.title}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <Button
              onClick={scrollContact}
              className="text-white mt-3 h-11 px-7 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all"
              style={{ backgroundColor: ACCENT }}
            >
              Learn More <ArrowUpRight className="ml-2 h-4 w-4" />
            </Button>
          </div>

          {/* Image stack */}
          <div className="relative">
            <div className="rounded-3xl overflow-hidden shadow-[0_20px_60px_-12px_rgba(10,42,102,0.2)] ring-1 ring-gray-100">
              <img
                src="https://adityauniversity.in/static/media/faculty.120163edbe788bc2a8a3.webp"
                alt="Campus"
                className="w-full h-auto object-cover"
              />
            </div>
            <div className="absolute -left-4 -bottom-4 sm:-left-6 sm:-bottom-6 bg-white rounded-2xl p-4 sm:p-5 shadow-xl ring-1 ring-gray-100">
              <div className="flex items-center gap-3">
                <div
                  className="h-12 w-12 rounded-xl flex items-center justify-center"
                  style={{
                    background: "linear-gradient(135deg, #e8f0fe, #d0e0fd)",
                  }}
                >
                  <BookOpen className="h-6 w-6" style={{ color: L_BLUE }} />
                </div>
                <div>
                  <div className="font-black text-lg" style={{ color: BLUE }}>
                    25+ Years
                  </div>
                  <p className="text-[11px] text-gray-400 font-medium">
                    Of Academic Excellence
                  </p>
                </div>
              </div>
            </div>
            <div className="absolute -right-2 top-6 sm:-right-4 sm:top-8 bg-white rounded-2xl p-3 sm:p-4 shadow-xl ring-1 ring-gray-100 anim-float">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5" style={{ color: GOLD }} />
                <span className="font-black text-sm" style={{ color: BLUE }}>
                  NIRF Ranked
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ PROGRAMS ═══════ */}
      <section
        id="programs"
        ref={progVis.ref}
        className={`py-20 sm:py-24 section-anim ${progVis.seen ? "section-visible" : ""}`}
        style={{
          background: "linear-gradient(180deg, #f8fafd 0%, #eef3fa 100%)",
        }}
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <p
              className="text-xs font-black uppercase tracking-[0.2em] mb-3"
              style={{ color: ACCENT }}
            >
              Academic Programs
            </p>
            <h2
              className="text-3xl sm:text-4xl lg:text-[2.75rem] font-black"
              style={{ color: BLUE }}
            >
              Future-Ready Education
            </h2>
            <p className="text-gray-500 text-base sm:text-lg mt-3">
              From Engineering to Liberal Arts — programs built with industry
              partnerships and global exposure.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {programs.map((p, i) => (
              <div
                key={p.title}
                className="group bg-white rounded-3xl p-6 shadow-sm hover:shadow-xl border border-gray-100 hover:border-blue-100 hover:-translate-y-1.5 transition-all duration-400"
                style={{ animationDelay: `${i * 0.08}s` }}
              >
                <div
                  className="h-14 w-14 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300"
                  style={{
                    background: "linear-gradient(135deg, #e8f0fe, #d0e0fd)",
                    color: L_BLUE,
                  }}
                >
                  {p.icon}
                </div>
                <div
                  className="text-[10px] font-black uppercase tracking-[0.15em] mb-1.5"
                  style={{ color: ACCENT }}
                >
                  {p.count} Programs
                </div>
                <h3 className="text-lg font-bold mb-2" style={{ color: BLUE }}>
                  {p.title}
                </h3>
                <p className="text-sm text-gray-400 mb-5 leading-relaxed">
                  {p.desc}
                </p>
                <button
                  onClick={scrollContact}
                  className="inline-flex items-center text-sm font-bold gap-1.5 group-hover:gap-2.5 transition-all"
                  style={{ color: ACCENT }}
                >
                  Explore <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ VMS FEATURES ═══════ */}
      <section
        id="appointments"
        ref={vmsVis.ref}
        className={`py-20 sm:py-24 bg-white section-anim ${vmsVis.seen ? "section-visible" : ""}`}
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <div
              className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-widest mb-4"
              style={{ background: "#fff3ee", color: ACCENT }}
            >
              <Layers className="h-3.5 w-3.5" /> Visitor Management
            </div>
            <h2
              className="text-3xl sm:text-4xl font-black"
              style={{ color: BLUE }}
            >
              Smart Campus Access System
            </h2>
            <p className="text-gray-500 text-base sm:text-lg mt-3">
              One platform for visitors, dignitaries, recruiters & parents.
              Instant approvals, QR passes, and live tracking.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <div
                key={f.title}
                className="group relative bg-gradient-to-br from-gray-50 to-white rounded-3xl p-6 border border-gray-100 hover:border-blue-100 hover:shadow-xl transition-all duration-300"
                style={{ animationDelay: `${i * 0.06}s` }}
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-blue-50/50 to-transparent rounded-3xl" />
                <div className="relative">
                  <div
                    className="h-12 w-12 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"
                    style={{
                      background: "linear-gradient(135deg, #e8f0fe, #d0e0fd)",
                      color: L_BLUE,
                    }}
                  >
                    {f.icon}
                  </div>
                  <h3
                    className="text-base font-bold mb-1.5"
                    style={{ color: BLUE }}
                  >
                    {f.title}
                  </h3>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    {f.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Button
              size="lg"
              onClick={() => navigate("/visitor-form")}
              className="text-white h-13 px-10 rounded-xl font-bold shadow-[0_8px_30px_-6px_rgba(241,90,36,0.4)] hover:shadow-[0_12px_36px_-8px_rgba(241,90,36,0.5)] hover:scale-[1.02] transition-all"
              style={{ backgroundColor: ACCENT }}
            >
              Book a Campus Visit <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* ═══════ PLACEMENTS ═══════ */}
      <section
        id="placements"
        ref={placeVis.ref}
        className={`py-20 sm:py-24 section-anim ${placeVis.seen ? "section-visible" : ""}`}
        style={{
          background: "linear-gradient(180deg, #f8fafd 0%, #eef3fa 100%)",
        }}
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 mb-10">
            <div>
              <p
                className="text-xs font-black uppercase tracking-[0.2em]"
                style={{ color: ACCENT }}
              >
                2025 Placements & Internships
              </p>
              <h2
                className="text-3xl sm:text-4xl font-black mt-2"
                style={{ color: BLUE }}
              >
                Success Stories on Repeat
              </h2>
            </div>
            <Button
              variant="outline"
              className="font-bold border-2 rounded-xl hover:bg-blue-50/50 transition-all"
              style={{ borderColor: BLUE, color: BLUE }}
              onClick={() => navigate("/login")}
            >
              Placement Portal <ArrowUpRight className="ml-2 h-4 w-4" />
            </Button>
          </div>

          {/* Scroller */}
          <div className="rounded-3xl bg-white shadow-lg border border-gray-100 overflow-hidden mb-12">
            <div className="flex overflow-x-auto gap-0 scrollbar-hide snap-x snap-mandatory py-2">
              {[...placementImgs, ...placementImgs].map((src, i) => (
                <div
                  key={`p-${i}`}
                  className="w-52 sm:w-60 md:w-72 shrink-0 p-3 md:p-4 snap-start"
                >
                  <div className="overflow-hidden rounded-2xl border bg-white shadow-sm hover:shadow-lg transition-all duration-300 group">
                    <img
                      src={src}
                      alt="Placement"
                      className="h-40 sm:h-44 w-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recruiter marquee */}
          <div className="space-y-5">
            <h3 className="text-center text-sm font-bold uppercase tracking-widest text-gray-400">
              Our Top Recruiters
            </h3>
            <div className="relative overflow-hidden py-6 rounded-2xl bg-white border border-gray-100 shadow-sm">
              <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-white to-transparent z-10" />
              <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-white to-transparent z-10" />
              <div className="logo-marquee-track flex items-center gap-14">
                {[...recruiterLogos, ...recruiterLogos, ...recruiterLogos].map(
                  (src, i) => (
                    <img
                      key={i}
                      src={src}
                      alt="Recruiter"
                      className="h-7 sm:h-9 w-auto object-contain grayscale hover:grayscale-0 opacity-40 hover:opacity-100 transition-all duration-300 flex-shrink-0"
                      loading="lazy"
                    />
                  ),
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ CAMPUS LIFE ═══════ */}
      <section
        id="campuslife"
        ref={campusVis.ref}
        className={`py-20 sm:py-24 bg-white section-anim ${campusVis.seen ? "section-visible" : ""}`}
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 mb-10">
            <div>
              <p
                className="text-xs font-black uppercase tracking-[0.2em]"
                style={{ color: ACCENT }}
              >
                Campus Life
              </p>
              <h2
                className="text-3xl sm:text-4xl font-black mt-2"
                style={{ color: BLUE }}
              >
                Clubs, Sports & Culture
              </h2>
            </div>
            <Button
              className="text-white font-bold rounded-xl shadow-lg"
              style={{ backgroundColor: ACCENT }}
              onClick={() => navigate("/visitor-form")}
            >
              Plan a Tour <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {clubs.map((c) => (
              <div
                key={c.title}
                className="group rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-400 border border-gray-100 hover:-translate-y-1.5 bg-white"
              >
                <div className="h-52 overflow-hidden relative">
                  <img
                    src={c.img}
                    alt={c.title}
                    className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-700"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
                <div className="p-5">
                  <h3 className="text-lg font-bold" style={{ color: BLUE }}>
                    {c.title}
                  </h3>
                  <p className="text-sm text-gray-400 mt-1">{c.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ TESTIMONIALS ═══════ */}
      <section
        ref={testiVis.ref}
        className={`py-20 sm:py-24 section-anim ${testiVis.seen ? "section-visible" : ""}`}
        style={{
          background: "linear-gradient(180deg, #f8fafd 0%, #eef3fa 100%)",
        }}
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <p
              className="text-xs font-black uppercase tracking-[0.2em] mb-3"
              style={{ color: ACCENT }}
            >
              Student Voices
            </p>
            <h2
              className="text-3xl sm:text-4xl font-black"
              style={{ color: BLUE }}
            >
              What Our Students Say
            </h2>
            <p className="text-gray-500 mt-3">
              A community celebrating ambition, curiosity, and collaboration.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <div
                key={t.name}
                className="relative bg-white rounded-3xl p-7 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 group"
              >
                <Quote className="absolute top-5 right-5 h-8 w-8 text-gray-100 group-hover:text-blue-100 transition-colors" />
                <div className="flex items-center gap-4 mb-5">
                  <img
                    src={t.avatar}
                    alt={t.name}
                    className="h-14 w-14 rounded-2xl object-cover ring-2 ring-gray-100"
                    loading="lazy"
                  />
                  <div>
                    <div
                      className="font-bold text-base"
                      style={{ color: BLUE }}
                    >
                      {t.name}
                    </div>
                    <div className="text-[11px] text-gray-400 font-medium">
                      {t.dept}
                    </div>
                  </div>
                </div>
                <div className="flex gap-0.5 mb-4">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className="h-4 w-4 fill-amber-400 text-amber-400"
                    />
                  ))}
                </div>
                <p className="text-sm text-gray-500 leading-relaxed italic">
                  "{t.txt}"
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ ACCREDITATIONS ═══════ */}
      <section
        id="accreditations"
        ref={accredVis.ref}
        className={`py-16 sm:py-20 bg-white border-y border-gray-100 section-anim ${accredVis.seen ? "section-visible" : ""}`}
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-10">
            <div>
              <p
                className="text-xs font-black uppercase tracking-[0.2em]"
                style={{ color: ACCENT }}
              >
                Rankings & Accreditations
              </p>
              <h3
                className="text-2xl sm:text-3xl font-black mt-1.5"
                style={{ color: BLUE }}
              >
                Recognized by Top National Bodies
              </h3>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={scrollContact}
              className="border-2 font-bold rounded-xl hover:bg-blue-50/50"
              style={{ borderColor: BLUE, color: BLUE }}
            >
              Request Brochure
            </Button>
          </div>
          <div className="flex flex-wrap gap-4 sm:gap-5">
            {accreditations.map((src) => (
              <div
                key={src}
                className="flex h-20 sm:h-24 w-32 sm:w-40 items-center justify-center rounded-2xl bg-gray-50/80 p-3 border border-gray-100 hover:shadow-lg hover:bg-white hover:-translate-y-0.5 transition-all duration-300"
              >
                <img
                  src={src}
                  alt="Accreditation"
                  className="h-full object-contain"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ CONTACT ═══════ */}
      <section
        id="contact"
        ref={contactVis.ref}
        className={`py-20 sm:py-24 section-anim ${contactVis.seen ? "section-visible" : ""}`}
        style={{
          background: "linear-gradient(180deg, #f8fafd 0%, #eef3fa 100%)",
        }}
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 grid gap-12 lg:grid-cols-2">
          <div className="space-y-6">
            <span
              className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-widest"
              style={{ backgroundColor: "#e8f0fe", color: L_BLUE }}
            >
              <Phone className="h-3.5 w-3.5" /> Get in Touch
            </span>
            <h2
              className="text-3xl sm:text-4xl font-black"
              style={{ color: BLUE }}
            >
              Visit, Collaborate,
              <br />
              <span style={{ color: ACCENT }}>or Recruit.</span>
            </h2>
            <p className="text-gray-500 text-base sm:text-lg">
              Tell us about your visit. The visitor desk will confirm
              availability and share a QR pass.
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                {
                  icon: <MapPin className="h-5 w-5" />,
                  title: "Campus",
                  desc: "Aditya Nagar, Surampalem, Kakinada District, AP",
                },
                {
                  icon: <Mail className="h-5 w-5" />,
                  title: "Email",
                  desc: "info@adityauniversity.in",
                },
                {
                  icon: <Phone className="h-5 w-5" />,
                  title: "Phone",
                  desc: "+91 9989 776661",
                },
                {
                  icon: <Clock className="h-5 w-5" />,
                  title: "Hours",
                  desc: "Mon – Sat, 9 AM – 6 PM",
                },
              ].map((c) => (
                <div
                  key={c.title}
                  className="flex items-start gap-3 rounded-2xl bg-white p-4 border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div
                    className="mt-0.5 flex-shrink-0"
                    style={{ color: L_BLUE }}
                  >
                    {c.icon}
                  </div>
                  <div>
                    <div className="font-bold text-sm" style={{ color: BLUE }}>
                      {c.title}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{c.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm h-52">
              <iframe
                title="Map"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3819.8!2d82.23!3d17.0!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3a37a4aaad0c0001%3A0x0!2sAditya+University!5e0!3m2!1sen!2sin!4v1000000000000"
                className="w-full h-full border-0"
                loading="lazy"
              />
            </div>
          </div>

          {/* Form */}
          <div className="bg-white rounded-3xl p-7 sm:p-9 shadow-xl border border-gray-100 h-fit ring-1 ring-gray-50">
            <h3 className="text-2xl font-black mb-1" style={{ color: BLUE }}>
              Plan Your Visit
            </h3>
            <p className="text-sm text-gray-400 mb-7">
              Share your details; we'll schedule the perfect slot.
            </p>
            <form
              className="space-y-5"
              onSubmit={(e) => {
                e.preventDefault();
              }}
            >
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label
                    className="text-xs font-bold text-gray-600 block mb-1.5 uppercase tracking-wider"
                    htmlFor="c-name"
                  >
                    Full Name
                  </label>
                  <Input
                    id="c-name"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Your name"
                    className="h-11 rounded-xl"
                  />
                </div>
                <div>
                  <label
                    className="text-xs font-bold text-gray-600 block mb-1.5 uppercase tracking-wider"
                    htmlFor="c-email"
                  >
                    Email
                  </label>
                  <Input
                    id="c-email"
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                    placeholder="you@example.com"
                    className="h-11 rounded-xl"
                  />
                </div>
              </div>
              <div>
                <label
                  className="text-xs font-bold text-gray-600 block mb-1.5 uppercase tracking-wider"
                  htmlFor="c-phone"
                >
                  Phone
                </label>
                <Input
                  id="c-phone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+91 98765 43210"
                  className="h-11 rounded-xl"
                />
              </div>
              <div>
                <label
                  className="text-xs font-bold text-gray-600 block mb-1.5 uppercase tracking-wider"
                  htmlFor="c-purpose"
                >
                  Purpose of Visit
                </label>
                <Textarea
                  id="c-purpose"
                  rows={4}
                  required
                  value={form.purpose}
                  onChange={(e) =>
                    setForm({ ...form, purpose: e.target.value })
                  }
                  placeholder="Campus tour, recruitment, collaboration…"
                  className="resize-none rounded-xl"
                />
              </div>
              <Button
                type="submit"
                className="w-full text-white h-12 text-base font-bold rounded-xl shadow-[0_6px_24px_-4px_rgba(241,90,36,0.4)] hover:shadow-[0_8px_30px_-6px_rgba(241,90,36,0.5)] transition-all"
                style={{ backgroundColor: ACCENT }}
              >
                Send Request <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      </section>

      {/* ═══════ FOOTER ═══════ */}
      <footer
        style={{
          background: `linear-gradient(180deg, ${BLUE} 0%, #061b44 100%)`,
        }}
        className="text-white"
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <img
                  src="/auslogo.png"
                  alt="Aditya"
                  className="h-12 w-auto brightness-0 invert"
                />
                <div>
                  <div className="text-lg font-black">Aditya University</div>
                  <p className="text-[11px] text-white/40 font-medium">
                    Surampalem, Andhra Pradesh
                  </p>
                </div>
              </div>
              <p className="text-sm text-white/50 leading-relaxed">
                Education, research, and innovation for a changing world.
                Nurturing leaders since 1998.
              </p>
              <div className="flex gap-2.5 pt-1">
                {["F", "◉", "▶", "in"].map((c, i) => (
                  <a
                    key={i}
                    href="#"
                    className="h-9 w-9 rounded-xl bg-white/8 flex items-center justify-center text-xs font-bold text-white/50 hover:bg-white/15 hover:text-white transition-all"
                  >
                    {c}
                  </a>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-black text-xs uppercase tracking-[0.2em] mb-5 text-amber-400">
                Quick Links
              </h4>
              <ul className="space-y-3 text-sm text-white/50">
                {[
                  "Home|#home",
                  "About|#about",
                  "Academics|#programs",
                  "Placements|#placements",
                  "Admissions|#contact",
                  "Contact|#contact",
                ].map((l) => {
                  const [label, href] = l.split("|");
                  return (
                    <li key={label}>
                      <a
                        href={href}
                        className="hover:text-white transition-colors"
                      >
                        {label}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
            <div>
              <h4 className="font-black text-xs uppercase tracking-[0.2em] mb-5 text-amber-400">
                Programs
              </h4>
              <ul className="space-y-3 text-sm text-white/50">
                <li>UG Programs (B.Tech, BBA, B.Sc…)</li>
                <li>PG Programs (M.Tech, MBA, M.Sc…)</li>
                <li>Ph.D Programs</li>
                <li>Corporate & Executive Diplomas</li>
                <li>Certificate Courses</li>
              </ul>
            </div>
            <div>
              <h4 className="font-black text-xs uppercase tracking-[0.2em] mb-5 text-amber-400">
                Contact
              </h4>
              <ul className="space-y-3 text-sm text-white/50">
                <li className="flex items-start gap-2.5">
                  <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0 text-white/30" />
                  Aditya Nagar, Surampalem, Kakinada, AP – 533437
                </li>
                <li className="flex items-center gap-2.5">
                  <Phone className="h-4 w-4 flex-shrink-0 text-white/30" />
                  +91 9989 776661
                </li>
                <li className="flex items-center gap-2.5">
                  <Mail className="h-4 w-4 flex-shrink-0 text-white/30" />
                  info@adityauniversity.in
                </li>
                <li className="flex items-center gap-2.5">
                  <Clock className="h-4 w-4 flex-shrink-0 text-white/30" />
                  Mon – Sat, 9 AM – 6 PM
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div className="border-t border-white/8">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-white/30">
            <p>
              © {new Date().getFullYear()} Aditya University. All rights
              reserved.
            </p>
            <div className="flex gap-5">
              <a href="#" className="hover:text-white/60 transition-colors">
                Privacy Policy
              </a>
              <a href="#" className="hover:text-white/60 transition-colors">
                Terms of Service
              </a>
              <a href="#" className="hover:text-white/60 transition-colors">
                Visitor Management Suite
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* WhatsApp FAB */}
      <a
        href="https://wa.me/919989776661"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-2xl bg-green-500 flex items-center justify-center text-white shadow-[0_6px_24px_-4px_rgba(34,197,94,0.5)] hover:bg-green-600 hover:scale-110 hover:shadow-[0_8px_30px_-6px_rgba(34,197,94,0.6)] active:scale-95 transition-all"
        aria-label="Chat on WhatsApp"
      >
        <MessageCircle className="h-7 w-7" />
      </a>
    </div>
  );
};

export default Landing;
