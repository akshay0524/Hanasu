import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import * as THREE from 'three';
import {
  FiArrowRight,
  FiMessageSquare,
  FiShield,
  FiZap,
  FiCpu,
  FiUsers,
  FiPhone,
  FiPhoneCall,
  FiPhoneOff,
  FiMic,
  FiMicOff,
  FiCheck,
  FiCheckCircle,
  FiCircle,
  FiVolume2,
  FiActivity,
  FiRefreshCw,
  FiGlobe,
  FiList,
  FiBookmark,
  FiTerminal,
  FiLayers,
  FiRadio,
  FiCode,
} from 'react-icons/fi';

export default function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const screenCanvasRef = useRef(null);

  // Scroll and mouse state stored in refs to avoid React re-renders during 3D animation
  const scrollState = useRef({
    current: 0,
    target: 0,
    maxScroll: 1,
  });

  const mouseState = useRef({
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
  });

  const [activeSection, setActiveSection] = useState(0);

  // ─── Interactive Showcase States ───────────────────────────────────────────
  // 1. AI Catch Me Up showcase tab
  const [activeAiTab, setActiveAiTab] = useState('summary'); // 'chat' | 'summary'
  const [isCatchingUp, setIsCatchingUp] = useState(false);

  // 2. AI Message Action selection
  const [selectedMessageAction, setSelectedMessageAction] = useState('task'); // 'task' | 'translate' | 'explain' | 'reply' | 'rephrase' | 'memory'

  // 3. Interactive Tasks checklist
  const [tasksList, setTasksList] = useState([
    { id: 1, text: 'Review project architecture before release', done: true, due: 'Today' },
    { id: 2, text: 'Send technical documentation to client', done: true, due: 'Today' },
    { id: 3, text: 'Schedule team sync for voice call testing', done: false, due: '10:00 AM' },
  ]);

  // 4. Voice Call Demo state
  const [callDemoStep, setCallDemoStep] = useState('connected'); // 'initiated' | 'ringing' | 'incoming' | 'connected'
  const [isCallMuted, setIsCallMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(32);

  const toggleTask = (id) => {
    setTasksList((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    );
  };

  const handleTriggerCatchMeUp = () => {
    setIsCatchingUp(true);
    setTimeout(() => {
      setIsCatchingUp(false);
      setActiveAiTab('summary');
    }, 600);
  };

  const handleOpenChat = useCallback(() => {
    if (user) {
      navigate('/chat');
    } else {
      navigate('/login');
    }
  }, [user, navigate]);

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const scrollToProgress = (progress) => {
    if (!containerRef.current) return;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo({
      top: progress * max,
      behavior: 'smooth',
    });
  };

  // ─── THREE.JS 3D BACKGROUND STAGE ──────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    let isMobile = width < 768;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x090705, 0.04);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0, 11);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });

    const dpr = Math.min(window.devicePixelRatio || 1, isMobile ? 1.25 : 1.5);
    renderer.setPixelRatio(dpr);
    renderer.setSize(width, height);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x221a14, 1.4);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xfff6ec, 2.8);
    keyLight.position.set(5, 8, 6);
    scene.add(keyLight);

    const orangeRimLight = new THREE.DirectionalLight(0xff6a00, 3.8);
    orangeRimLight.position.set(-6, -4, 4);
    scene.add(orangeRimLight);

    const fillLight = new THREE.PointLight(0xffb000, 2.0, 18);
    fillLight.position.set(0, 2, -4);
    scene.add(fillLight);

    // Background drifting particles
    const particleCount = isMobile ? 50 : 100;
    const particleGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleSpeeds = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      particlePositions[i * 3] = (Math.random() - 0.5) * 24;
      particlePositions[i * 3 + 1] = (Math.random() - 0.5) * 16;
      particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 12 - 2;
      particleSpeeds[i] = 0.2 + Math.random() * 0.4;
    }
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));

    const particleCanvas = document.createElement('canvas');
    particleCanvas.width = 32;
    particleCanvas.height = 32;
    const pctx = particleCanvas.getContext('2d');
    const grad = pctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, 'rgba(255, 176, 0, 0.9)');
    grad.addColorStop(0.4, 'rgba(255, 106, 0, 0.5)');
    grad.addColorStop(1, 'rgba(255, 106, 0, 0)');
    pctx.fillStyle = grad;
    pctx.fillRect(0, 0, 32, 32);

    const particleTexture = new THREE.CanvasTexture(particleCanvas);
    const particleMaterial = new THREE.PointsMaterial({
      size: isMobile ? 0.35 : 0.45,
      map: particleTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0.6,
    });
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    // Phone screen 2D canvas texture
    const screenCanvas = document.createElement('canvas');
    screenCanvas.width = 720;
    screenCanvas.height = 1500;
    screenCanvasRef.current = screenCanvas;
    const sctx = screenCanvas.getContext('2d');

    const screenTexture = new THREE.CanvasTexture(screenCanvas);
    screenTexture.generateMipmaps = true;
    screenTexture.minFilter = THREE.LinearMipmapLinearFilter;
    screenTexture.magFilter = THREE.LinearFilter;

    let lastRenderedProgress = -1;
    function drawScreen(progress) {
      if (Math.abs(progress - lastRenderedProgress) < 0.005) return;
      lastRenderedProgress = progress;

      const w = 720;
      const h = 1500;

      // Background
      const bgGrad = sctx.createLinearGradient(0, 0, 0, h);
      bgGrad.addColorStop(0, '#14100D');
      bgGrad.addColorStop(0.3, '#0C0A08');
      bgGrad.addColorStop(1, '#090705');
      sctx.fillStyle = bgGrad;
      sctx.fillRect(0, 0, w, h);

      // Ambient orange glow
      const glow = sctx.createRadialGradient(w - 80, 100, 10, w - 80, 100, 320);
      glow.addColorStop(0, 'rgba(255, 106, 0, 0.12)');
      glow.addColorStop(1, 'rgba(255, 106, 0, 0)');
      sctx.fillStyle = glow;
      sctx.fillRect(0, 0, w, h);

      // Status Bar
      sctx.fillStyle = '#FFF7EA';
      sctx.font = '600 28px Inter, sans-serif';
      sctx.fillText('9:41', 54, 76);

      // Battery & Signal
      sctx.fillStyle = '#FFF7EA';
      sctx.fillRect(w - 110, 56, 44, 22);
      sctx.clearRect(w - 108, 58, 40, 18);
      sctx.fillStyle = '#FF6A00';
      sctx.fillRect(w - 106, 60, 30, 14);
      sctx.fillStyle = '#FFF7EA';
      sctx.fillRect(w - 64, 62, 3, 10);

      // Dynamic Island Pill
      sctx.fillStyle = '#000000';
      sctx.beginPath();
      sctx.roundRect(w / 2 - 95, 48, 190, 48, 24);
      sctx.fill();

      // Header
      sctx.fillStyle = 'rgba(25, 21, 16, 0.85)';
      sctx.fillRect(0, 120, w, 150);
      sctx.fillStyle = 'rgba(255, 177, 0, 0.18)';
      sctx.fillRect(0, 270, w, 1);

      // Avatar
      const avGrad = sctx.createLinearGradient(48, 150, 128, 230);
      avGrad.addColorStop(0, '#FF6A00');
      avGrad.addColorStop(1, '#FFB000');
      sctx.fillStyle = avGrad;
      sctx.beginPath();
      sctx.arc(88, 195, 40, 0, Math.PI * 2);
      sctx.fill();

      sctx.fillStyle = '#090705';
      sctx.font = 'bold 36px Inter, sans-serif';
      sctx.textAlign = 'center';
      sctx.fillText('A', 88, 208);
      sctx.textAlign = 'left';

      // Title
      sctx.fillStyle = '#FFF7EA';
      sctx.font = 'bold 32px Inter, sans-serif';
      sctx.fillText('Akshay K', 152, 192);

      // Status
      sctx.fillStyle = '#22C55E';
      sctx.beginPath();
      sctx.arc(158, 222, 6, 0, Math.PI * 2);
      sctx.fill();
      sctx.fillStyle = '#A89F91';
      sctx.font = '500 22px Inter, sans-serif';
      sctx.fillText('Online · Real-time', 174, 229);

      // Messages
      const msgList = [
        { text: 'Hey! Are we still testing the voice pipeline?', sender: 'them', y: 350 },
        { text: 'Yes, WebRTC signaling is live and ready.', sender: 'me', y: 490 },
        { text: 'Awesome, launching Catch Me Up summary now ✨', sender: 'them', y: 630 },
      ];

      msgList.forEach((m) => {
        const isMe = m.sender === 'me';
        const msgW = 460;
        const msgH = 92;
        const msgX = isMe ? w - msgW - 48 : 48;

        sctx.fillStyle = isMe ? '#FF6A00' : '#1C1713';
        sctx.beginPath();
        sctx.roundRect(msgX, m.y, msgW, msgH, 24);
        sctx.fill();

        sctx.fillStyle = isMe ? '#090705' : '#FFF7EA';
        sctx.font = '500 25px Inter, sans-serif';
        sctx.fillText(m.text, msgX + 26, m.y + 55);
      });

      // Bottom input bar
      sctx.fillStyle = '#14100D';
      sctx.beginPath();
      sctx.roundRect(48, h - 140, w - 96, 84, 42);
      sctx.fill();

      sctx.fillStyle = '#7E6F5E';
      sctx.font = '500 24px Inter, sans-serif';
      sctx.fillText('Message Akshay K...', 88, h - 88);

      screenTexture.needsUpdate = true;
    }

    // 3D Phone Chassis
    const phoneW = 3.6;
    const phoneH = 7.4;
    const phoneD = 0.44;

    const phoneGroup = new THREE.Group();
    scene.add(phoneGroup);

    const chassisGeometry = new THREE.BoxGeometry(phoneW, phoneH, phoneD);
    const frameMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1612,
      metalness: 0.95,
      roughness: 0.18,
    });
    const chassis = new THREE.Mesh(chassisGeometry, frameMaterial);
    phoneGroup.add(chassis);

    // Back Panel
    const backGeometry = new THREE.PlaneGeometry(phoneW - 0.08, phoneH - 0.08);
    const backMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x110d0a,
      roughness: 0.45,
      metalness: 0.85,
      clearcoat: 0.7,
      clearcoatRoughness: 0.15,
    });
    const back = new THREE.Mesh(backGeometry, backMaterial);
    back.position.z = -phoneD / 2 - 0.005;
    back.rotation.y = Math.PI;
    phoneGroup.add(back);

    // Front Screen Plane
    const screenGeometry = new THREE.PlaneGeometry(phoneW - 0.22, phoneH - 0.32);
    const screenMaterial = new THREE.MeshBasicMaterial({ map: screenTexture });
    const screenMesh = new THREE.Mesh(screenGeometry, screenMaterial);
    screenMesh.position.z = phoneD / 2 + 0.052;
    phoneGroup.add(screenMesh);

    // Front Glass Reflection
    const glassGeometry = new THREE.PlaneGeometry(phoneW - 0.22, phoneH - 0.32);
    const glassMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transmission: 0.95,
      opacity: 0.95,
      transparent: true,
      roughness: 0.05,
      metalness: 0.1,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
    });
    const glassMesh = new THREE.Mesh(glassGeometry, glassMaterial);
    glassMesh.position.z = phoneD / 2 + 0.054;
    phoneGroup.add(glassMesh);

    // Scroll interpolation & animation loop
    let animationFrameId = null;
    let isRunning = true;
    let clock = new THREE.Clock();

    const handleScroll = () => {
      const scrollY = window.scrollY;
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const rawProgress = Math.max(0, Math.min(1, scrollY / maxScroll));
      scrollState.current.target = rawProgress;

      if (rawProgress < 0.15) {
        setActiveSection(0);
      } else if (rawProgress < 0.35) {
        setActiveSection(1);
      } else if (rawProgress < 0.6) {
        setActiveSection(2);
      } else {
        setActiveSection(3);
      }
    };

    const handleMouseMove = (e) => {
      mouseState.current.targetX = (e.clientX / window.innerWidth - 0.5) * 0.4;
      mouseState.current.targetY = (e.clientY / window.innerHeight - 0.5) * 0.4;
    };

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      isMobile = width < 768;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      const newDpr = Math.min(window.devicePixelRatio || 1, isMobile ? 1.25 : 1.5);
      renderer.setPixelRatio(newDpr);
      renderer.setSize(width, height);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('resize', handleResize);

    handleScroll();

    const animate = () => {
      if (!isRunning) return;

      const delta = clock.getDelta();
      const time = clock.getElapsedTime();

      const st = scrollState.current;
      st.current += (st.target - st.current) * 0.075;
      const p = st.current;

      const ms = mouseState.current;
      ms.x += (ms.targetX - ms.x) * 0.06;
      ms.y += (ms.targetY - ms.y) * 0.06;

      drawScreen(p);

      const baseScale = isMobile ? 0.7 : 1.0;

      if (p < 0.12) {
        // Hero stage: Phone peeks from right
        const t = p / 0.12;
        const targetX = isMobile ? 0 : 2.2 + ms.x;
        const targetY = -2.8 + t * 1.5 - ms.y;
        const targetZ = -1.6 + t * 0.6;

        phoneGroup.position.set(targetX, targetY, targetZ);
        phoneGroup.rotation.set(0.42 - t * 0.15 + ms.y * 0.5, -0.58 + t * 0.2 + ms.x * 0.5, 0.18 - t * 0.08);
        phoneGroup.scale.setScalar(baseScale * (0.92 + t * 0.08));
      } else if (p < 0.28) {
        // Connection stage
        const t = (p - 0.12) / 0.16;
        const targetX = isMobile ? 0 : 2.2 - t * 1.2 + ms.x;
        const targetY = -1.3 + t * 1.3 - ms.y;
        const targetZ = -1.0 + t * 1.6;

        phoneGroup.position.set(targetX, targetY, targetZ);
        phoneGroup.rotation.set(0.27 - t * 0.22 + ms.y * 0.4, -0.38 + t * 0.32 + ms.x * 0.4, 0.1 - t * 0.08);
        phoneGroup.scale.setScalar(baseScale * (1.0 + t * 0.12));
      } else if (p < 0.44) {
        // Real-Time Chat stage (centers)
        const t = (p - 0.28) / 0.16;
        const targetX = (isMobile ? 0 : 1.0 - t * 1.0) + ms.x;
        const targetY = 0.0 + Math.sin(time * 1.5) * 0.04 - ms.y;
        const targetZ = 0.6 + t * 0.4;

        phoneGroup.position.set(targetX, targetY, targetZ);
        phoneGroup.rotation.set(0.05 * (1 - t) + ms.y * 0.3, -0.06 * (1 - t) + ms.x * 0.3, 0.02 * (1 - t));
        phoneGroup.scale.setScalar(baseScale * 1.15);
      } else {
        // Background drift: Phone retreats smoothly to right background
        const t = Math.min(1, (p - 0.44) / 0.56);
        const targetX = (isMobile ? 0 : 2.6) + ms.x;
        const targetY = -0.4 + Math.sin(time * 1.0) * 0.08 - ms.y;
        const targetZ = -1.8 - t * 1.6;

        phoneGroup.position.set(targetX, targetY, targetZ);
        phoneGroup.rotation.set(0.18 + ms.y * 0.2, -0.44 + ms.x * 0.2, 0.06);
        phoneGroup.scale.setScalar(baseScale * 0.95);
      }

      // Drift background particles
      const pos = particleGeometry.attributes.position.array;
      for (let i = 0; i < particleCount; i++) {
        pos[i * 3 + 1] -= particleSpeeds[i] * delta * 0.8;
        if (pos[i * 3 + 1] < -8) pos[i * 3 + 1] = 8;
      }
      particleGeometry.attributes.position.needsUpdate = true;

      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      isRunning = false;
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      chassisGeometry.dispose();
      frameMaterial.dispose();
      backGeometry.dispose();
      backMaterial.dispose();
      screenGeometry.dispose();
      screenMaterial.dispose();
      screenTexture.dispose();
      glassGeometry.dispose();
      glassMaterial.dispose();
      particleGeometry.dispose();
      particleMaterial.dispose();
      particleTexture.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full bg-[#090705] text-[#FFF7EA] overflow-x-hidden selection:bg-[#FF6A00] selection:text-[#090705]"
    >
      {/* FIXED THREE.JS 3D CANVAS IN BACKGROUND */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 w-full h-full pointer-events-none z-0"
        aria-hidden="true"
      />

      {/* Warm Ambient Radial Overlays */}
      <div className="fixed inset-0 pointer-events-none z-[1] bg-[radial-gradient(ellipse_at_top,_rgba(255,106,0,0.07)_0%,_transparent_60%)]" />
      <div className="fixed inset-0 pointer-events-none z-[1] bg-[radial-gradient(ellipse_at_bottom,_rgba(255,177,0,0.05)_0%,_transparent_50%)]" />

      {/* ─── FLOATING NAVIGATION BAR ────────────────────────────────────────── */}
      <header className="fixed top-5 sm:top-6 inset-x-4 sm:inset-x-auto sm:right-10 z-50 flex items-center justify-end pointer-events-auto">
        <nav className="flex items-center gap-1 sm:gap-2 p-1.5 sm:p-2 rounded-full bg-[#12100D]/85 backdrop-blur-xl border border-[var(--border-subtle)] shadow-[0_8px_32px_rgba(0,0,0,0.6)]">
          <button
            onClick={() => scrollToProgress(0)}
            className={`px-3 py-1.5 rounded-full text-xs uppercase tracking-widest font-medium transition-colors ${
              activeSection === 0 ? 'text-[#FFB000] bg-[rgba(255,176,0,0.12)]' : 'text-[var(--text-muted)] hover:text-[#FFF7EA]'
            } hidden sm:inline-block`}
          >
            Overview
          </button>
          <button
            onClick={() => scrollToSection('ai-intelligence')}
            className="px-3 py-1.5 rounded-full text-xs uppercase tracking-widest font-medium text-[var(--text-muted)] hover:text-[#FFF7EA] hover:bg-[rgba(255,106,0,0.1)] transition-colors hidden sm:inline-block"
          >
            AI Intelligence
          </button>
          <button
            onClick={() => scrollToSection('voice-calling')}
            className="px-3 py-1.5 rounded-full text-xs uppercase tracking-widest font-medium text-[var(--text-muted)] hover:text-[#FFF7EA] hover:bg-[rgba(255,106,0,0.1)] transition-colors hidden sm:inline-block"
          >
            Voice Calls
          </button>
          <button
            onClick={() => scrollToSection('story')}
            className="px-3 py-1.5 rounded-full text-xs uppercase tracking-widest font-medium text-[var(--text-muted)] hover:text-[#FFF7EA] hover:bg-[rgba(255,106,0,0.1)] transition-colors hidden md:inline-block"
          >
            Story
          </button>

          {/* Primary CTA */}
          <button
            onClick={handleOpenChat}
            className="px-5 py-2 rounded-full text-xs uppercase tracking-widest font-bold bg-[#FF6A00] text-[#090705] hover:bg-[#E05D00] shadow-[0_0_20px_rgba(255,106,0,0.35)] hover:shadow-[0_0_28px_rgba(255,106,0,0.6)] transition-all duration-300 active:scale-95"
          >
            Open Chat
          </button>
        </nav>
      </header>

      {/* ─── MAIN SCROLL CONTENT ────────────────────────────────────────────── */}
      <main className="relative z-10 w-full">
        {/* ─── SECTION 1: HERO ──────────────────────────────────────────────── */}
        <section className="min-h-screen flex flex-col justify-center items-center text-center px-6 pt-16 pb-12 relative">
          <div className="max-w-3xl mx-auto flex flex-col items-center">
            {/* Minimal Sub-Badge */}
            <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full border border-[var(--border-subtle)] bg-[#12100D]/70 backdrop-blur-md mb-8 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-[#FF6A00] shadow-[0_0_8px_#FF6A00]"></span>
              <span className="text-[11px] font-mono tracking-widest uppercase text-[#D4C7B5]">
                Real-Time Messaging · AI Intelligence · Voice Calls
              </span>
            </div>

            {/* Giant Bold Hanasu Title */}
            <h1 className="text-6xl sm:text-8xl md:text-9xl font-display font-bold tracking-[0.14em] text-transparent bg-clip-text bg-gradient-to-b from-[#FFF7EA] via-[#F5EBDD] to-[#B8AA98] leading-none mb-6 drop-shadow-2xl">
              HANASU
            </h1>

            {/* Subtitle */}
            <p className="text-xl sm:text-2xl md:text-3xl font-light tracking-wide text-[#FFF7EA] mb-4">
              Talk freely. Stay connected.
            </p>

            {/* Tagline */}
            <p className="text-sm sm:text-base text-[var(--text-muted)] font-light max-w-lg mb-10 leading-relaxed">
              Conversations, with feeling. A cinematic space where words flow with warmth, presence, and zero friction.
            </p>

            {/* CTA Button */}
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <button
                onClick={handleOpenChat}
                className="inline-flex items-center gap-3 px-8 py-3.5 rounded-full bg-[#FF6A00] text-[#090705] font-bold text-xs uppercase tracking-widest hover:bg-[#E05D00] shadow-[0_0_24px_rgba(255,106,0,0.4)] hover:shadow-[0_0_36px_rgba(255,106,0,0.65)] hover:scale-105 transition-all duration-300"
              >
                <span>Enter Hanasu</span>
                <FiArrowRight size={15} />
              </button>
            </div>
          </div>

          {/* Scroll Down Cue */}
          <div
            onClick={() => scrollToSection('connection')}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 cursor-pointer text-[var(--text-muted)] hover:text-[#FFF7EA] transition-colors"
          >
            <span className="text-[10px] uppercase font-mono tracking-[0.25em]">Scroll to explore</span>
            <div className="w-[1px] h-8 bg-gradient-to-b from-[#FF6A00] to-transparent animate-pulse" />
          </div>
        </section>

        {/* ─── SECTION 2: CONNECTION ────────────────────────────────────────── */}
        <section id="connection" className="min-h-screen flex items-center px-6 sm:px-12 md:px-20 py-24 relative">
          <div className="max-w-xl">
            <span className="text-xs font-mono font-bold tracking-[0.25em] text-[#FFB000] uppercase mb-4 block">
              01 / Connection
            </span>
            <h2 className="text-3xl sm:text-5xl font-display font-bold text-[#FFF7EA] leading-tight mb-6">
              Every conversation starts somewhere.
            </h2>
            <p className="text-base text-[var(--text-muted)] leading-relaxed font-light mb-8">
              Distance dissolves when presence is shared. Whether chatting with friends across continents or brainstorming in private circles, Hanasu keeps every interaction instant and effortless.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl border border-[var(--border-subtle)] bg-[#12100D]/60 backdrop-blur-md">
                <div className="flex items-center gap-2.5 text-[#FF6A00] mb-1 font-semibold text-sm">
                  <FiZap size={16} />
                  <span>Instant Delivery</span>
                </div>
                <p className="text-xs text-[var(--text-muted)]">Sub-millisecond WebSocket message streaming with persistent read states.</p>
              </div>

              <div className="p-4 rounded-2xl border border-[var(--border-subtle)] bg-[#12100D]/60 backdrop-blur-md">
                <div className="flex items-center gap-2.5 text-[#FFB000] mb-1 font-semibold text-sm">
                  <FiShield size={16} />
                  <span>Private by Design</span>
                </div>
                <p className="text-xs text-[var(--text-muted)]">Authenticated sessions with verified identity and direct peer encryption.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ─── SECTION 3: 3D PHONE EXPERIENCE NOTICE ─────────────────────────── */}
        <section className="min-h-[70vh] flex flex-col justify-between px-6 sm:px-12 md:px-20 py-16 relative pointer-events-none">
          <div className="flex justify-between items-start w-full">
            <div className="max-w-md pointer-events-auto">
              <span className="text-xs font-mono font-bold tracking-[0.25em] text-[#FFB000] uppercase mb-2 block">
                02 / Real-Time Experience
              </span>
              <h3 className="text-2xl sm:text-4xl font-display font-bold text-[#FFF7EA]">
                Conversations that feel alive.
              </h3>
            </div>

            <div className="hidden md:flex flex-col gap-3 pointer-events-auto">
              <div className="px-4 py-2 rounded-full border border-[var(--border-subtle)] bg-[#12100D]/80 backdrop-blur-md text-xs font-mono text-[#D4C7B5] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span>Active Presence Sync</span>
              </div>
              <div className="px-4 py-2 rounded-full border border-[var(--border-subtle)] bg-[#12100D]/80 backdrop-blur-md text-xs font-mono text-[#D4C7B5] flex items-center gap-2">
                <FiCpu className="text-[#FF6A00]" />
                <span>AI Companion Ready</span>
              </div>
            </div>
          </div>

          <div className="w-full flex justify-center pb-8">
            <div className="px-5 py-2 rounded-full border border-[#FFB000]/30 bg-[#12100D]/80 backdrop-blur-xl text-xs font-mono text-[#FFB000] flex items-center gap-2">
              <FiMessageSquare />
              <span>Scroll to watch conversation unfold</span>
            </div>
          </div>
        </section>

        {/* ─── SECTION 4: THE STORY TRANSITION (CONNECTING AI + CALLING) ─────── */}
        <section id="story" className="py-24 px-6 sm:px-12 md:px-20 relative">
          <div className="max-w-5xl mx-auto text-center mb-16">
            <span className="text-xs font-mono font-bold tracking-[0.28em] text-[#FF6A00] uppercase mb-3 block">
              The Hanasu Philosophy
            </span>
            <h2 className="text-3xl sm:text-5xl md:text-6xl font-display font-bold text-[#FFF7EA] tracking-wide mb-5">
              From conversation to connection.
            </h2>
            <p className="text-base sm:text-lg text-[var(--text-muted)] font-light max-w-2xl mx-auto leading-relaxed">
              Hanasu is not just where messages live. It is where conversations transform into intelligence, decisions, and real-time voice connections.
            </p>
          </div>

          {/* Interactive Story Progression Chain */}
          <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4 relative">
            {[
              { step: '01', title: 'MESSAGE', desc: 'Text & files flow instantly', icon: <FiMessageSquare /> },
              { step: '02', title: 'AI UNDERSTANDS', desc: 'Thread context synthesized', icon: <FiCpu /> },
              { step: '03', title: 'TASK & MEMORY', desc: 'Conversations become action', icon: <FiCheckCircle /> },
              { step: '04', title: 'VOICE CALL', desc: 'Seamless 1-click audio bridge', icon: <FiPhoneCall /> },
              { step: '05', title: 'ACTION', desc: 'Nothing forgotten, ever', icon: <FiZap /> },
            ].map((s, idx) => (
              <div
                key={s.step}
                className="p-5 rounded-2xl border border-[var(--border-subtle)] bg-[#12100D]/80 backdrop-blur-md hover:border-[#FF6A00]/50 transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[11px] font-mono text-[#FF6A00] font-bold">{s.step}</span>
                    <span className="text-lg text-[var(--text-muted)] group-hover:text-[#FFB000] transition-colors">{s.icon}</span>
                  </div>
                  <h4 className="text-sm font-bold text-[#FFF7EA] tracking-wider mb-1">{s.title}</h4>
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-2 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ─── SECTION 5: AI INTELLIGENCE SUITE ("CATCH ME UP") ─────────────── */}
        <section id="ai-intelligence" className="py-24 px-6 sm:px-12 md:px-20 relative">
          <div className="max-w-6xl mx-auto">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#FF6A00]/30 bg-[#FF6A00]/10 text-xs font-mono font-semibold text-[#FFB000] mb-4">
                <span>✨</span>
                <span>Contextual Intelligence Suite</span>
              </div>
              <h2 className="text-3xl sm:text-5xl md:text-6xl font-display font-bold text-[#FFF7EA] tracking-wide mb-6">
                Your Conversations, Now Intelligent.
              </h2>
              <p className="text-base sm:text-lg text-[var(--text-muted)] font-light leading-relaxed">
                Hanasu doesn't just store your conversations. It understands them, summarizes them, and turns them into action.
              </p>
            </div>

            {/* Interactive Showcase Window */}
            <div className="rounded-3xl border border-[var(--border-subtle)] bg-[#12100D]/90 backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden">
              {/* Showcase Header with Live Toggles */}
              <div className="p-4 sm:p-5 border-b border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-4 bg-[#16120E]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#FF6A00] to-[#FFB000] flex items-center justify-center font-bold text-[#090705] text-sm shadow-md">
                    #S
                  </div>
                  <div>
                    <h3 className="font-bold text-sm sm:text-base text-[#FFF7EA] flex items-center gap-2">
                      <span>#study-group</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-normal">Active</span>
                    </h3>
                    <p className="text-xs text-[var(--text-muted)] font-mono">3 members · 14 new messages</p>
                  </div>
                </div>

                {/* View Switcher & "Catch Me Up" CTA Button */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveAiTab('chat')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      activeAiTab === 'chat'
                        ? 'bg-[var(--bg-active)] text-[#FFB000] border border-[#FF6A00]/40'
                        : 'text-[var(--text-muted)] hover:text-[#FFF7EA]'
                    }`}
                  >
                    Raw Chat
                  </button>

                  <button
                    onClick={handleTriggerCatchMeUp}
                    disabled={isCatchingUp}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#FF6A00] to-[#FF9000] text-[#090705] font-bold text-xs uppercase tracking-wider hover:opacity-95 shadow-[0_0_20px_rgba(255,106,0,0.4)] active:scale-95 transition-all"
                  >
                    <span>✨</span>
                    <span>{isCatchingUp ? 'Synthesizing...' : 'Catch Me Up'}</span>
                  </button>
                </div>
              </div>

              {/* Showcase Body (Chat vs AI Summary View) */}
              <div className="p-6 sm:p-8 min-h-[420px] flex items-center justify-center">
                {activeAiTab === 'chat' && (
                  <div className="w-full max-w-2xl space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#2A231C] border border-[var(--border-subtle)] flex items-center justify-center text-xs font-bold text-[#FFB000]">
                        K
                      </div>
                      <div className="flex-1">
                        <div className="flex items-baseline gap-2 mb-1">
                          <span className="text-xs font-bold text-[#FFF7EA]">Kenji</span>
                          <span className="text-[10px] text-[var(--text-muted)] font-mono">10:14 AM</span>
                        </div>
                        <div className="p-3.5 rounded-2xl rounded-tl-sm bg-[#1C1713] border border-[var(--border-subtle)] text-xs sm:text-sm text-[#D4C7B5]">
                          We need to finalize the API architecture before tomorrow morning's staging deployment.
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#2A231C] border border-[var(--border-subtle)] flex items-center justify-center text-xs font-bold text-[#FF6A00]">
                        A
                      </div>
                      <div className="flex-1">
                        <div className="flex items-baseline gap-2 mb-1">
                          <span className="text-xs font-bold text-[#FFF7EA]">Aoi</span>
                          <span className="text-[10px] text-[var(--text-muted)] font-mono">10:16 AM</span>
                        </div>
                        <div className="p-3.5 rounded-2xl rounded-tl-sm bg-[#1C1713] border border-[var(--border-subtle)] text-xs sm:text-sm text-[#D4C7B5]">
                          Agreed. Database migrations are tested and merged. Could someone verify the WebSocket reconnect logic?
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#FF6A00] flex items-center justify-center text-xs font-bold text-[#090705]">
                        You
                      </div>
                      <div className="flex-1">
                        <div className="flex items-baseline gap-2 mb-1">
                          <span className="text-xs font-bold text-[#FFB000]">Akshay K</span>
                          <span className="text-[10px] text-[var(--text-muted)] font-mono">10:18 AM</span>
                        </div>
                        <div className="p-3.5 rounded-2xl rounded-tl-sm bg-gradient-to-r from-[#FF6A00]/20 to-transparent border border-[#FF6A00]/30 text-xs sm:text-sm text-[#FFF7EA]">
                          I'll test the WebRTC voice calling pipeline tonight. Let's make sure the audio fallback is completely seamless!
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 text-center">
                      <p className="text-xs text-[var(--text-muted)] font-mono">
                        Click <span className="text-[#FF6A00] font-bold">"Catch Me Up"</span> above to see how Hanasu synthesizes this conversation.
                      </p>
                    </div>
                  </div>
                )}

                {activeAiTab === 'summary' && (
                  <div className="w-full max-w-3xl animate-in fade-in zoom-in-95 duration-300">
                    <div className="p-6 sm:p-7 rounded-2xl bg-gradient-to-b from-[#1C1713] to-[#12100D] border border-[#FF6A00]/30 shadow-2xl relative">
                      {/* Top Header */}
                      <div className="flex items-center justify-between pb-4 mb-5 border-b border-[var(--border-subtle)]">
                        <div className="flex items-center gap-2 text-xs font-mono text-[#FFB000] uppercase font-bold tracking-wider">
                          <span className="w-2 h-2 rounded-full bg-[#FF6A00] animate-ping" />
                          <span>Hanasu AI Synthesis Report</span>
                        </div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[11px] font-mono font-bold text-emerald-400">
                          <span>Sentiment: High Momentum</span>
                        </div>
                      </div>

                      {/* Executive Summary */}
                      <div className="mb-6">
                        <h4 className="text-xs font-mono uppercase tracking-widest text-[#FFB000] font-bold mb-2">
                          Executive Summary
                        </h4>
                        <p className="text-sm sm:text-base text-[#FFF7EA] leading-relaxed font-light">
                          The engineering team is aligned on tomorrow's staging release. Database migrations are verified, while active validation is assigned for WebSocket reconnection reliability and WebRTC voice audio fallbacks.
                        </p>
                      </div>

                      {/* Key Points & Action Items Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-[var(--border-subtle)]">
                        <div>
                          <h4 className="text-xs font-mono uppercase tracking-widest text-[#D4C7B5] font-bold mb-3 flex items-center gap-2">
                            <span>Key Points</span>
                          </h4>
                          <ul className="space-y-2 text-xs sm:text-sm text-[var(--text-muted)]">
                            <li className="flex items-start gap-2">
                              <span className="text-[#FF6A00] mt-0.5">•</span>
                              <span>Staging deployment scheduled for tomorrow morning</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-[#FF6A00] mt-0.5">•</span>
                              <span>Database schema migrations tested and merged</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-[#FF6A00] mt-0.5">•</span>
                              <span>WebRTC voice pipeline requires final end-to-end check</span>
                            </li>
                          </ul>
                        </div>

                        <div>
                          <h4 className="text-xs font-mono uppercase tracking-widest text-[#FFB000] font-bold mb-3 flex items-center gap-2">
                            <span>Extracted Action Items</span>
                          </h4>
                          <ul className="space-y-2 text-xs sm:text-sm text-[#FFF7EA]">
                            <li className="flex items-center gap-2">
                              <FiCheckCircle className="text-emerald-400 flex-shrink-0" />
                              <span>Finalize API architecture with Kenji</span>
                            </li>
                            <li className="flex items-center gap-2">
                              <FiCircle className="text-[#FFB000] flex-shrink-0" />
                              <span>Verify WebSocket reconnect handling</span>
                            </li>
                            <li className="flex items-center gap-2">
                              <FiCircle className="text-[#FFB000] flex-shrink-0" />
                              <span>Test WebRTC voice audio fallback tonight</span>
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ─── SECTION 6: AI MESSAGE ACTIONS (MESSAGE → AI → ACTION) ───────── */}
        <section className="py-24 px-6 sm:px-12 md:px-20 relative border-t border-[var(--border-subtle)]/40">
          <div className="max-w-6xl mx-auto">
            <div className="max-w-2xl mb-12">
              <span className="text-xs font-mono font-bold tracking-[0.25em] text-[#FFB000] uppercase mb-3 block">
                03 / Deep Message Understanding
              </span>
              <h2 className="text-3xl sm:text-5xl font-display font-bold text-[#FFF7EA] tracking-wide mb-4">
                Interact with every thought.
              </h2>
              <p className="text-base text-[var(--text-muted)] font-light leading-relaxed">
                Click any message to open the AI Action Sheet. Instantly extract tasks, translate across languages, generate thoughtful replies, or save to your memory vault.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Column: The Message and Action Sheet */}
              <div className="lg:col-span-7 space-y-5">
                {/* Target Message */}
                <div className="p-5 rounded-2xl bg-[#16120E] border border-[#FF6A00]/40 shadow-lg relative">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-[#FFB000]">Kenji</span>
                    <span className="text-[10px] font-mono text-[var(--text-muted)]">Active Message</span>
                  </div>
                  <p className="text-sm sm:text-base text-[#FFF7EA] font-medium leading-relaxed">
                    "Please review the API architecture before tomorrow's staging deployment."
                  </p>
                </div>

                {/* Interactive Action Sheet */}
                <div className="p-5 rounded-2xl bg-[#12100D]/90 border border-[var(--border-subtle)] backdrop-blur-md">
                  <div className="text-[11px] font-mono uppercase tracking-widest text-[var(--text-muted)] font-semibold mb-3">
                    Select AI Action to execute:
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {[
                      { key: 'task', label: 'Extract Task', icon: <FiCheck /> },
                      { key: 'translate', label: 'Translate', icon: <FiGlobe /> },
                      { key: 'explain', label: 'Explain', icon: <FiTerminal /> },
                      { key: 'reply', label: 'Generate Reply', icon: <FiMessageSquare /> },
                      { key: 'rephrase', label: 'Rephrase', icon: <FiRefreshCw /> },
                      { key: 'memory', label: 'Save Memory', icon: <FiBookmark /> },
                    ].map((act) => (
                      <button
                        key={act.key}
                        onClick={() => setSelectedMessageAction(act.key)}
                        className={`p-3 rounded-xl flex items-center gap-2.5 text-xs font-bold transition-all text-left ${
                          selectedMessageAction === act.key
                            ? 'bg-[#FF6A00] text-[#090705] shadow-[0_0_16px_rgba(255,106,0,0.4)] scale-[1.02]'
                            : 'bg-[#1A1511] text-[#D4C7B5] hover:bg-[#251E18] border border-[var(--border-subtle)]'
                        }`}
                      >
                        <span className="text-base">{act.icon}</span>
                        <span>{act.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column: Real-time Result Panel */}
              <div className="lg:col-span-5">
                <div className="p-6 rounded-2xl bg-gradient-to-b from-[#1C1713] to-[#12100D] border border-[var(--border-strong)] shadow-xl relative min-h-[290px] flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-3 mb-4 border-b border-[var(--border-subtle)]">
                      <span className="text-xs font-mono uppercase tracking-wider text-[#FFB000] font-bold">
                        AI Output Stream
                      </span>
                      <span className="text-[10px] font-mono text-emerald-400">Status: Resolved</span>
                    </div>

                    {selectedMessageAction === 'task' && (
                      <div className="space-y-3">
                        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                          <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 mb-1">
                            <FiCheckCircle />
                            <span>Action Item Created</span>
                          </div>
                          <p className="text-sm font-semibold text-[#FFF7EA]">Review API architecture</p>
                          <div className="flex items-center gap-3 mt-2 text-[11px] font-mono text-[var(--text-muted)]">
                            <span>Due: Tomorrow morning</span>
                            <span>•</span>
                            <span className="text-[#FFB000]">Priority: High</span>
                          </div>
                        </div>
                        <p className="text-xs text-[var(--text-muted)]">
                          Synced automatically to the conversation task vault.
                        </p>
                      </div>
                    )}

                    {selectedMessageAction === 'translate' && (
                      <div className="space-y-2">
                        <span className="text-[11px] font-mono text-[var(--text-muted)]">Japanese (日本語):</span>
                        <p className="text-base font-japanese text-[#FFB000] leading-relaxed p-3.5 rounded-xl bg-[#14100D] border border-[var(--border-subtle)]">
                          明日のステージングデプロイ前に、APIアーキテクチャを確認してください。
                        </p>
                        <p className="text-xs text-[var(--text-muted)] font-mono">Romaji: Ashita no sutējingu depuroi mae ni...</p>
                      </div>
                    )}

                    {selectedMessageAction === 'explain' && (
                      <div className="space-y-2">
                        <span className="text-[11px] font-mono text-[#FFB000]">Technical Context:</span>
                        <p className="text-xs sm:text-sm text-[#D4C7B5] leading-relaxed">
                          The sender is requesting a pre-flight architectural verification of API routes, data serialization, and authentication middlewares to avoid regressions in tomorrow's staging release.
                        </p>
                      </div>
                    )}

                    {selectedMessageAction === 'reply' && (
                      <div className="space-y-2">
                        <span className="text-[11px] font-mono text-[#FFB000]">Suggested Response Draft:</span>
                        <p className="text-xs sm:text-sm text-[#FFF7EA] p-3 rounded-xl bg-[#14100D] border border-[#FF6A00]/30 font-medium">
                          "I'm on it! Reviewing the endpoint contracts and auth middlewares now—will post notes in 30 minutes."
                        </p>
                      </div>
                    )}

                    {selectedMessageAction === 'rephrase' && (
                      <div className="space-y-2">
                        <span className="text-[11px] font-mono text-[#FFB000]">Executive Polished Tone:</span>
                        <p className="text-xs sm:text-sm text-[#FFF7EA] p-3 rounded-xl bg-[#14100D] border border-[var(--border-subtle)] italic">
                          "Could we conduct a thorough review of the API architectural specifications prior to tomorrow's scheduled staging rollout?"
                        </p>
                      </div>
                    )}

                    {selectedMessageAction === 'memory' && (
                      <div className="space-y-2">
                        <div className="p-3.5 rounded-xl bg-[#FFB000]/10 border border-[#FFB000]/30">
                          <span className="text-xs font-bold text-[#FFB000] block mb-1">🧠 Saved to Memories</span>
                          <p className="text-xs text-[#FFF7EA]">"Team conducts mandatory API architectural review 1 day prior to deployment."</p>
                        </div>
                        <p className="text-xs text-[var(--text-muted)]">Available to Hanasu Zen for future contextual recall.</p>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-[var(--border-subtle)] text-[11px] font-mono text-[var(--text-muted)] flex items-center justify-between">
                    <span>Model: Hanasu Intelligence Core</span>
                    <span className="text-[#FF6A00]">Zero Latency</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── SECTION 7: TASKS & MEMORIES VAULT ─────────────────────────────── */}
        <section className="py-24 px-6 sm:px-12 md:px-20 relative">
          <div className="max-w-6xl mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="text-xs font-mono font-bold tracking-[0.25em] text-[#FF6A00] uppercase mb-3 block">
                04 / Permanence
              </span>
              <h2 className="text-3xl sm:text-5xl font-display font-bold text-[#FFF7EA] tracking-wide mb-4">
                Conversations become memory.
              </h2>
              <p className="text-base text-[var(--text-muted)] font-light leading-relaxed">
                Critical commitments and valuable preferences should never vanish into an endless scroll history.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Card 1: TASKS */}
              <div className="p-7 rounded-3xl bg-[#12100D]/85 border border-[var(--border-subtle)] backdrop-blur-xl relative overflow-hidden group hover:border-[#FF6A00]/40 transition-all">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <span className="text-xs font-mono uppercase tracking-widest text-[#FF6A00] font-bold block mb-1">
                      Action Items
                    </span>
                    <h3 className="text-2xl font-display font-bold text-[#FFF7EA]">TASKS</h3>
                  </div>
                  <div className="p-3 rounded-2xl bg-[#FF6A00]/10 text-[#FF6A00] border border-[#FF6A00]/20">
                    <FiCheckCircle size={22} />
                  </div>
                </div>

                <p className="text-sm text-[var(--text-muted)] mb-6">
                  Turn conversations into action. Click to mark complete.
                </p>

                <div className="space-y-3">
                  {tasksList.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => toggleTask(task.id)}
                      className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                        task.done
                          ? 'bg-[#161310] border-[var(--border-subtle)] text-[var(--text-muted)] line-through'
                          : 'bg-[#1C1713] border-[#FF6A00]/30 text-[#FFF7EA] shadow-sm'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`text-base ${task.done ? 'text-emerald-400' : 'text-[#FFB000]'}`}>
                          {task.done ? <FiCheckCircle /> : <FiCircle />}
                        </span>
                        <span className="text-xs sm:text-sm font-medium">{task.text}</span>
                      </div>
                      <span className="text-[10px] font-mono text-[var(--text-muted)]">{task.due}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card 2: MEMORIES */}
              <div className="p-7 rounded-3xl bg-[#12100D]/85 border border-[var(--border-subtle)] backdrop-blur-xl relative overflow-hidden group hover:border-[#FFB000]/40 transition-all">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <span className="text-xs font-mono uppercase tracking-widest text-[#FFB000] font-bold block mb-1">
                      Context Vault
                    </span>
                    <h3 className="text-2xl font-display font-bold text-[#FFF7EA]">MEMORIES</h3>
                  </div>
                  <div className="p-3 rounded-2xl bg-[#FFB000]/10 text-[#FFB000] border border-[#FFB000]/20">
                    <FiBookmark size={22} />
                  </div>
                </div>

                <p className="text-sm text-[var(--text-muted)] mb-6">
                  Keep the things that matter. Automatically preserved across discussions.
                </p>

                <div className="space-y-3">
                  {[
                    { label: 'Project Deadline', value: 'Staging rollout scheduled for Friday 10:00 AM' },
                    { label: 'Team Preference', value: 'Prefers concise bullet points in morning standups' },
                    { label: 'Tech Stack', value: 'React 18 frontend with WebRTC peer-to-peer audio calling' },
                  ].map((mem, i) => (
                    <div key={i} className="p-3.5 rounded-xl bg-[#161310] border border-[var(--border-subtle)]">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-[#FFB000] font-semibold block mb-1">
                        {mem.label}
                      </span>
                      <p className="text-xs sm:text-sm text-[#D4C7B5] font-medium leading-relaxed">
                        "{mem.value}"
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── SECTION 8: HANASU ZEN COMPANION ──────────────────────────────── */}
        <section className="py-24 px-6 sm:px-12 md:px-20 relative">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
              {/* Left Column: Ambient Zen Description */}
              <div className="lg:col-span-5 space-y-6">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#FF6A00]/30 bg-[#FF6A00]/10 text-xs font-mono font-semibold text-[#FFB000]">
                  <span>話す</span>
                  <span>Companion Intelligence</span>
                </div>

                <h2 className="text-4xl sm:text-6xl font-display font-bold text-[#FFF7EA] tracking-wide leading-tight">
                  Meet Hanasu Zen.
                </h2>

                <p className="text-base text-[var(--text-muted)] font-light leading-relaxed">
                  Zen is not a detached generic chatbot. It is a quiet companion woven into the fabric of Hanasu—ready to summarize threads, reason through complex code, clarify technical designs, and translate languages with zero interruption.
                </p>

                <div className="space-y-3 text-xs sm:text-sm text-[#D4C7B5]">
                  <div className="flex items-center gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#FF6A00]" />
                    <span>Native Markdown & Code Block syntax support</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#FF6A00]" />
                    <span>Deep conversation thread context awareness</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#FF6A00]" />
                    <span>Real-time technical explanations & Japanese translation</span>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleOpenChat}
                    className="inline-flex items-center gap-3 px-7 py-3.5 rounded-full bg-[#FF6A00] text-[#090705] font-bold text-xs uppercase tracking-widest hover:bg-[#E05D00] shadow-[0_0_24px_rgba(255,106,0,0.35)] transition-all hover:scale-105 active:scale-95"
                  >
                    <span>Talk to Zen</span>
                    <FiArrowRight size={15} />
                  </button>
                </div>
              </div>

              {/* Right Column: Zen Interface Showcase with Floating Orb */}
              <div className="lg:col-span-7">
                <div className="p-6 sm:p-8 rounded-3xl bg-[#12100D]/90 border border-[#FF6A00]/30 backdrop-blur-2xl shadow-2xl relative">
                  {/* Floating Zen Kanji Orb */}
                  <div className="flex items-center gap-4 pb-5 mb-5 border-b border-[var(--border-subtle)]">
                    <div className="relative w-14 h-14 rounded-full bg-gradient-to-tr from-[#FF6A00] to-[#FFB000] flex items-center justify-center shadow-[0_0_25px_rgba(255,106,0,0.5)]">
                      <span className="text-xl font-japanese font-bold text-[#090705]">話す</span>
                      <div className="absolute inset-0 rounded-full border border-white/30 animate-ping opacity-30" />
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-[#FFF7EA]">Hanasu Zen Companion</h3>
                      <p className="text-xs text-[#FFB000] font-mono">1-on-1 Contextual Intelligence · Ready</p>
                    </div>
                  </div>

                  {/* Sample AI Conversation with Markdown Code Snippet */}
                  <div className="space-y-4 text-xs sm:text-sm">
                    <div className="p-3.5 rounded-2xl bg-[#1A1511] border border-[var(--border-subtle)] text-[#D4C7B5]">
                      <span className="text-[10px] font-mono text-[var(--text-muted)] block mb-1">User</span>
                      "Can you show me how the voice call signaling sequence executes?"
                    </div>

                    <div className="p-4 rounded-2xl bg-[#16120E] border border-[#FF6A00]/25 text-[#FFF7EA] space-y-3">
                      <span className="text-[10px] font-mono text-[#FF6A00] font-bold block">Hanasu Zen</span>
                      <p className="text-xs sm:text-sm text-[#D4C7B5] leading-relaxed">
                        Here is the deterministic WebRTC signaling flow implemented in Hanasu:
                      </p>

                      <div className="p-3 rounded-xl bg-[#0B0907] border border-[var(--border-subtle)] font-mono text-[11px] sm:text-xs overflow-x-auto text-[#FFB000]">
                        <pre>{`// 1. Caller initiates → Callee accepts
socket.emit('call:accept', { callId });

// 2. Caller receives acceptance → creates WebRTC offer
const offer = await pc.createOffer();
await pc.setLocalDescription(offer);
socket.emit('call:offer', { offer, targetId });`}</pre>
                      </div>

                      <p className="text-xs text-[var(--text-muted)]">
                        ICE candidate buffering ensures zero packet loss before remote descriptions are established.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── SECTION 9: REAL-TIME VOICE CALLING ───────────────────────────── */}
        <section id="voice-calling" className="py-24 px-6 sm:px-12 md:px-20 relative border-t border-[var(--border-subtle)]/40">
          <div className="max-w-6xl mx-auto">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-xs font-mono font-semibold text-emerald-400 mb-4">
                <FiPhoneCall />
                <span>WebRTC Voice Pipeline</span>
              </div>
              <h2 className="text-3xl sm:text-5xl md:text-6xl font-display font-bold text-[#FFF7EA] tracking-wide mb-5">
                Sometimes, a message isn't enough.
              </h2>
              <p className="text-base sm:text-lg text-[var(--text-muted)] font-light leading-relaxed">
                Move from text to voice instantly. Peer-to-peer audio with zero third-party delay.
              </p>
            </div>

            {/* Interactive Call Showcase Card */}
            <div className="max-w-md mx-auto">
              <div className="bg-[#12100D]/95 border border-[var(--border-strong)] rounded-3xl shadow-[0_25px_70px_rgba(0,0,0,0.8)] overflow-hidden backdrop-blur-2xl">
                {/* Call Header */}
                <div className="relative px-6 pt-8 pb-6 bg-gradient-to-b from-emerald-600/20 to-transparent text-center">
                  {/* Concentric pulsing rings */}
                  <div className="relative mx-auto w-24 h-24 mb-4">
                    <div className="absolute inset-0 rounded-full border-2 border-emerald-500/40 animate-ping" />
                    <div className="absolute inset-2 rounded-full border-2 border-emerald-500/20 animate-ping" style={{ animationDelay: '0.4s' }} />
                    <div className="relative w-full h-full rounded-full bg-gradient-to-tr from-[#FF6A00] to-[#FFB000] flex items-center justify-center font-bold text-[#090705] text-3xl shadow-xl border-2 border-emerald-500/60">
                      A
                    </div>
                  </div>

                  <h3 className="font-bold text-[#FFF7EA] text-lg mb-1">Akshay K</h3>
                  <div className="flex items-center justify-center gap-2">
                    <FiVolume2 size={14} className="text-emerald-400" />
                    <span className="text-xs text-emerald-400 font-mono font-bold">
                      {callDemoStep === 'connected' ? `Connected · 00:${callDuration}` : 'Ringing...'}
                    </span>
                  </div>

                  {/* Animated Waveform Visualizer */}
                  <div className="flex items-center justify-center gap-1.5 mt-5 h-8">
                    {[16, 28, 20, 32, 14, 24, 36, 18, 26, 30].map((h, i) => (
                      <span
                        key={i}
                        className="w-1 bg-emerald-400 rounded-full transition-all duration-300"
                        style={{
                          height: callDemoStep === 'connected' ? `${h}px` : '4px',
                          opacity: callDemoStep === 'connected' ? 0.9 : 0.3,
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* Call Controls */}
                <div className="px-6 pb-8 pt-2 flex items-center justify-center gap-6">
                  <button
                    onClick={() => setIsCallMuted((prev) => !prev)}
                    className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-lg ${
                      isCallMuted
                        ? 'bg-red-500/20 border-2 border-red-500/60 text-red-400'
                        : 'bg-[#1C1713] border border-[var(--border-subtle)] text-[#FFF7EA] hover:border-[#FF6A00]/50'
                    }`}
                    title={isCallMuted ? 'Unmute' : 'Mute'}
                  >
                    {isCallMuted ? <FiMicOff size={20} /> : <FiMic size={20} />}
                  </button>

                  <button
                    onClick={() => setCallDemoStep((prev) => (prev === 'connected' ? 'ringing' : 'connected'))}
                    className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-all shadow-xl shadow-red-500/30 active:scale-95"
                    title="End call"
                  >
                    <FiPhoneOff size={22} />
                  </button>
                </div>
              </div>

              {/* Call Flow Step Sequence Buttons */}
              <div className="mt-8 flex items-center justify-center gap-2">
                {[
                  { step: 'initiated', label: '1. Initiate' },
                  { step: 'ringing', label: '2. Ringing' },
                  { step: 'connected', label: '3. Connected' },
                ].map((st) => (
                  <button
                    key={st.step}
                    onClick={() => setCallDemoStep(st.step)}
                    className={`px-3 py-1.5 rounded-full text-xs font-mono font-semibold transition-all ${
                      callDemoStep === st.step
                        ? 'bg-[#FF6A00] text-[#090705] shadow-md'
                        : 'bg-[#14100D] border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[#FFF7EA]'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ─── SECTION 10: WEBRTC TECHNOLOGY STORY ──────────────────────────── */}
        <section className="py-20 px-6 sm:px-12 md:px-20 relative">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <span className="text-xs font-mono font-bold tracking-[0.25em] text-[#FFB000] uppercase mb-2 block">
                Engineering Architecture
              </span>
              <h3 className="text-2xl sm:text-4xl font-display font-bold text-[#FFF7EA]">
                Built on resilient real-time protocols.
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-[#12100D]/80 border border-[var(--border-subtle)]">
                <span className="text-xs font-mono font-bold text-[#FF6A00] block mb-2">01 / WebRTC Peer</span>
                <h4 className="text-sm font-bold text-[#FFF7EA] mb-1">Direct Media Stream</h4>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                  Encrypted peer-to-peer audio channels. Zero intermediary audio routing.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-[#12100D]/80 border border-[var(--border-subtle)]">
                <span className="text-xs font-mono font-bold text-[#FFB000] block mb-2">02 / Socket.IO</span>
                <h4 className="text-sm font-bold text-[#FFF7EA] mb-1">Signaling Engine</h4>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                  Millisecond relay coordination for offers, answers, and network candidate exchanges.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-[#12100D]/80 border border-[var(--border-subtle)]">
                <span className="text-xs font-mono font-bold text-emerald-400 block mb-2">03 / ICE Candidate</span>
                <h4 className="text-sm font-bold text-[#FFF7EA] mb-1">Buffered Discovery</h4>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                  Candidate buffering guarantees handshake resolution even across restrictive NATs.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-[#12100D]/80 border border-[var(--border-subtle)]">
                <span className="text-xs font-mono font-bold text-[#FF6A00] block mb-2">04 / Web Audio API</span>
                <h4 className="text-sm font-bold text-[#FFF7EA] mb-1">Native Synthesizer</h4>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                  Zero external mp3 assets. In-browser dual-tone audio generation.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ─── SECTION 11: FINAL CTA & EDITORIAL FOOTER ─────────────────────── */}
        <section className="min-h-[80vh] flex flex-col justify-center items-center text-center px-6 py-24 relative border-t border-[var(--border-subtle)]/50">
          <div className="max-w-2xl mx-auto flex flex-col items-center">
            <span className="text-xs font-mono font-bold tracking-[0.25em] text-[#FF6A00] uppercase mb-4 block">
              Enter The Sanctuary
            </span>

            <h2 className="text-4xl sm:text-6xl md:text-7xl font-display font-bold text-[#FFF7EA] tracking-wide mb-6">
              Start talking.
            </h2>

            <p className="text-base sm:text-lg text-[var(--text-muted)] font-light max-w-lg mb-10 leading-relaxed">
              Step into a serene space crafted for meaningful human communication—supercharged by contextual intelligence.
            </p>

            <button
              onClick={handleOpenChat}
              className="inline-flex items-center gap-3 px-10 py-4 rounded-full bg-[#FF6A00] text-[#090705] font-bold text-sm uppercase tracking-[0.2em] hover:bg-[#E05D00] shadow-[0_0_30px_rgba(255,106,0,0.5)] hover:shadow-[0_0_45px_rgba(255,106,0,0.8)] hover:scale-105 transition-all duration-300 mb-8"
            >
              <span>Open Chat</span>
              <FiArrowRight size={18} />
            </button>

            <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-[var(--text-muted)] font-mono">
              <span className="px-3 py-1 rounded-full bg-[#14100D] border border-[var(--border-subtle)]">Real-Time Chat</span>
              <span className="px-3 py-1 rounded-full bg-[#14100D] border border-[var(--border-subtle)]">Group Channels</span>
              <span className="px-3 py-1 rounded-full bg-[#14100D] border border-[var(--border-subtle)]">AI Intelligence</span>
              <span className="px-3 py-1 rounded-full bg-[#14100D] border border-[var(--border-subtle)]">Tasks & Memories</span>
              <span className="px-3 py-1 rounded-full bg-[#14100D] border border-[var(--border-subtle)]">WebRTC Voice Calling</span>
            </div>
          </div>

          <footer className="w-full max-w-6xl mx-auto border-t border-[var(--border-subtle)] pt-10 mt-20 flex flex-col sm:flex-row items-center justify-between text-xs text-[var(--text-muted)] font-mono gap-4">
            <div className="flex items-center gap-3">
              <span className="font-display font-bold text-[#FFF7EA] text-sm tracking-widest">HANASU (話す)</span>
              <span>— Conversations, with feeling.</span>
            </div>
            <div>© 2026 Hanasu. All rights reserved.</div>
          </footer>
        </section>
      </main>
    </div>
  );
}
