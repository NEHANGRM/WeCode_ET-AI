'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Shield, Activity, Mouse, ChevronDown } from 'lucide-react';

export default function LandingPage() {
  const router = useRouter();
  const [isLaunching, setIsLaunching] = useState(false);

  const handleLaunch = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsLaunching(true);
    // Wait for the full screen overlay and progress bar animation, then route
    setTimeout(() => {
      router.push('/dashboard');
    }, 2500);
  };

  return (
    <div className="relative min-h-screen bg-[#060608] text-white overflow-hidden flex flex-col font-sans selection:bg-indigo-500/30">

      {/* Full Screen Launch Overlay */}
      <AnimatePresence>
        {isLaunching && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#060608]"
          >
            {/* Zooming Shield Icon */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: [0.8, 1.2, 1.1], opacity: 1 }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              className="relative w-32 h-32 mb-12 flex items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-[0_0_80px_rgba(99,102,241,0.4)]"
            >
              <Shield className="w-16 h-16 text-white" />
              {/* Outer pulsing ring */}
              <motion.div
                animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
                className="absolute inset-0 rounded-3xl border-2 border-indigo-400"
              />
            </motion.div>

            {/* Loading Text */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="text-2xl font-light tracking-[0.2em] uppercase text-white mb-8"
            >
              WatchDog
            </motion.div>

            {/* Progress Bar */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="w-64 h-1.5 bg-white/10 rounded-full overflow-hidden"
            >
              <motion.div
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 1.8, ease: "easeInOut", delay: 0.6 }}
                className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 shadow-[0_0_10px_rgba(99,102,241,0.8)]"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        animate={isLaunching ? { scale: 1.1, opacity: 0, filter: "blur(10px)" } : { scale: 1, opacity: 1, filter: "blur(0px)" }}
        transition={{ duration: 1.2, ease: "easeInOut" }}
        className="relative flex-1 flex flex-col w-full h-full"
      >
        {/* Navbar (Floating Pill) */}
        <nav className="absolute top-6 left-1/2 -translate-x-1/2 w-[95%] max-w-6xl px-6 py-4 flex items-center justify-between z-20 rounded-full bg-white/5 border border-white/10 backdrop-blur-md shadow-2xl">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-indigo-400" />
            <div className="text-lg font-bold tracking-[0.15em] uppercase">
              watchdog
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={handleLaunch}
              className="hidden md:flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 text-sm font-medium border border-indigo-500/30 transition-all cursor-pointer shadow-[0_0_15px_rgba(99,102,241,0.2)]"
            >
              Launch Platform <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </nav>

        {/* 3D Glossy Objects & Glows */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">

          {/* Soft background ambient glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80vw] h-[80vh] bg-indigo-900/10 blur-[150px] rounded-full mix-blend-screen" />
          <div className="absolute top-[20%] left-[20%] w-[40vw] h-[40vw] bg-purple-900/10 blur-[120px] rounded-full mix-blend-screen" />

          {/* 3D Glossy Disc (Left) */}
          <motion.div
            animate={{
              rotate: [15, 35, 15],
              y: [0, -40, 20, 0],
              x: [0, 30, -10, 0]
            }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-[30%] -left-[5%] w-[45vw] h-[45vw] max-w-[500px] max-h-[500px]"
            style={{ perspective: "1000px" }}
          >
            <div className="w-full h-full rounded-full border border-white/10 backdrop-blur-3xl shadow-[inset_0_0_80px_rgba(255,255,255,0.05),_0_20px_40px_rgba(0,0,0,0.5)]"
              style={{
                transform: 'rotateX(60deg) rotateY(-20deg)',
                background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.1) 0%, rgba(138,88,252,0.15) 30%, rgba(16,185,129,0.05) 70%, transparent 100%)',
                boxShadow: 'inset 0 0 40px rgba(138,88,252,0.3), inset -10px -20px 60px rgba(16,185,129,0.2), 0 30px 60px rgba(0,0,0,0.6)'
              }}
            >
              {/* Inner rim glow */}
              <div className="absolute inset-0 rounded-full border-t border-l border-white/20" />
              <div className="absolute inset-0 rounded-full border-b border-r border-indigo-500/30" />
            </div>
          </motion.div>

          {/* 3D Glossy Ring (Right) */}
          <motion.div
            animate={{
              rotate: [-20, 0, -20],
              y: [0, 50, -20, 0],
              x: [0, -40, 20, 0]
            }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-[10%] -right-[5%] w-[40vw] h-[40vw] max-w-[450px] max-h-[450px]"
            style={{ perspective: "1000px" }}
          >
            {/* A hollow ring achieved with thick border */}
            <div className="w-full h-full rounded-full border-[40px] border-white/5 backdrop-blur-2xl shadow-[inset_0_0_40px_rgba(138,88,252,0.1),_0_20px_40px_rgba(0,0,0,0.5)]"
              style={{
                transform: 'rotateX(50deg) rotateY(20deg)',
                background: 'transparent',
                borderColor: 'rgba(255,255,255,0.02)',
                boxShadow: 'inset 0 0 30px rgba(236,72,153,0.2), inset -10px -20px 50px rgba(56,189,248,0.2), 0 0 0 1px rgba(255,255,255,0.1)'
              }}
            />
          </motion.div>

        </div>

        {/* Hero Content */}
        <main className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-4 w-full h-full min-h-[85vh]">

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="text-5xl md:text-7xl lg:text-[5.5rem] font-light tracking-tight mb-4 leading-[1.1]"
          >
            <span className="text-white">Autonomous Multi-Agent</span><br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-fuchsia-300 to-amber-200">
              SOC Incident Response
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.5, delay: 0.8, ease: "easeOut" }}
            className="text-base md:text-lg text-gray-400 max-w-[800px] mx-auto mt-6 mb-10 leading-relaxed font-light"
          >
            A self-correcting, cryptographically auditable multi-agent system. WatchDog eliminates alert fatigue by autonomously triaging, investigating, and remediating security threats in real-time.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.5, delay: 1.6, ease: "easeOut" }}
            className="flex flex-col sm:flex-row items-center justify-center gap-5"
          >
            <button
              onClick={handleLaunch}
              className="group flex items-center justify-center gap-2 px-6 py-2.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-200 rounded-full font-medium text-[15px] border border-indigo-500/30 transition-all backdrop-blur-sm shadow-[0_0_20px_rgba(99,102,241,0.15)] cursor-pointer"
            >
              Launch Platform
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
            <a
              href="https://github.com/NEHANGRM/WeCode_ET-AI"
              target="_blank"
              rel="noreferrer"
              className="group flex items-center justify-center gap-2 px-6 py-2.5 bg-transparent hover:bg-white/5 text-gray-300 rounded-full font-medium text-[15px] transition-all"
            >
              View Architecture
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform opacity-50 group-hover:opacity-100" />
            </a>
          </motion.div>

          {/* Scroll Indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.5, delay: 2.8 }}
            className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-gray-500 opacity-50 hover:opacity-100 transition-opacity cursor-pointer"
            onClick={() => window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })}
          >
            <div className="flex flex-col items-center animate-bounce">
              <Mouse className="w-5 h-5 mb-1" />
              <ChevronDown className="w-4 h-4" />
            </div>
            <span className="text-[10px] uppercase tracking-widest font-semibold">Scroll</span>
          </motion.div>

        </main>

        {/* Product & Simulation Details */}
        <section className="relative z-10 flex flex-col items-center px-6 py-24 w-full max-w-6xl mx-auto border-t border-white/5">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            className="w-full text-center mb-20"
          >
            <h2 className="text-3xl md:text-5xl font-light mb-6 tracking-tight text-white">How WatchDog Works</h2>
            <p className="text-gray-400 max-w-2xl mx-auto text-lg font-light leading-relaxed">
              Four specialized AI agents working in perfect sync to dissect, analyze, and neutralize threats faster than humanly possible.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 w-full mb-32">
            {[
              { title: '1. Watcher', desc: 'Ingests raw network signals and firewall logs in real-time, filtering out benign noise.', color: 'from-indigo-500 to-blue-500' },
              { title: '2. Investigator', desc: 'Enriches signals with AbuseIPDB, VirusTotal, and GreyNoise to build context.', color: 'from-blue-500 to-cyan-500' },
              { title: '3. Judge', desc: 'Scores threat confidence. Escalates ambiguous cases and auto-approves clear threats.', color: 'from-purple-500 to-indigo-500' },
              { title: '4. Responder', desc: 'Executes zero-trust actions like IP blocking, dynamically gated by strict policy constraints.', color: 'from-rose-500 to-orange-500' }
            ].map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="bg-white/5 border border-white/10 rounded-3xl p-8 text-left relative overflow-hidden group hover:bg-white/10 transition-colors backdrop-blur-sm"
              >
                <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${step.color} opacity-50`} />
                <h3 className="text-xl font-medium text-white mb-4 tracking-wide">{step.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed font-light">{step.desc}</p>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="w-full flex flex-col md:flex-row gap-8 items-center bg-gradient-to-br from-indigo-900/20 to-purple-900/20 border border-indigo-500/20 rounded-3xl p-10 backdrop-blur-md"
          >
            <div className="flex-1 text-left">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-rose-500/20 flex items-center justify-center border border-rose-500/30">
                  <Activity className="w-5 h-5 text-rose-400 animate-pulse" />
                </div>
                <h3 className="text-2xl font-light text-white">Live AIIMS Simulation</h3>
              </div>
              <p className="text-gray-300 font-light leading-relaxed mb-6 text-lg">
                Experience a live replay of a simulated ransomware attack based on the real-world AIIMS Delhi breach. Watch as our autonomous agents instantly triage the incoming malicious payloads, verify the attack vector, and physically sever the connection—all in under 60 seconds.
              </p>
              <button
                onClick={handleLaunch}
                className="flex items-center gap-2 text-indigo-300 font-medium hover:text-white transition-colors cursor-pointer"
              >
                Start Simulation <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        </section>

        {/* Bottom Logos Section (Scale style) */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.8 }}
          className="relative z-10 w-full pb-12 pt-8 flex flex-col items-center justify-center border-t border-white/5 bg-gradient-to-t from-black/50 to-transparent"
        >
          <p className="text-xs text-gray-500 mb-6 font-medium tracking-wide">
            Built by the WeCode Team
          </p>

          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16 opacity-60">
            <span className="text-xl font-light tracking-wide text-gray-300">Naren Moorthy S</span>
            <span className="text-xl font-light tracking-wide text-gray-300">Sarigasini M</span>
            <span className="text-xl font-light tracking-wide text-gray-300">Nehan G R M</span>
          </div>
        </motion.div>

      </motion.div>
    </div>
  );
}
