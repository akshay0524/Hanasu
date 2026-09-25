import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import * as THREE from 'three';
import { FiArrowRight, FiMessageSquare, FiShield, FiZap, FiCpu, FiUsers, FiCornerDownRight } from 'react-icons/fi';

export default function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const screenCanvasRef = useRef(null);

  // Scroll and mouse state stored in refs to avoid React re-renders during animation
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

  const handleOpenChat = useCallback(() => {
    if (user) {
      navigate('/chat');
    } else {
      navigate('/login');
    }
  }, [user, navigate]);

  const scrollToProgress = (progress) => {
    if (!containerRef.current) return;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo({
      top: progress * max,
      behavior: 'smooth',
    });
  };

  useEffect(() => {
    // -------------------------------------------------------------
    // 1. SETUP THREE.JS SCENE & RENDERER
    // -------------------------------------------------------------
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

    // -------------------------------------------------------------
    // 2. LIGHTING (WARM HANASU AMBIENCE & METALLIC RIM GLOW)
    // -------------------------------------------------------------
    const ambientLight = new THREE.AmbientLight(0x221a14, 1.4);
    scene.add(ambientLight);

    // Warm key light
    const keyLight = new THREE.DirectionalLight(0xfff6ec, 2.8);
    keyLight.position.set(5, 8, 6);
    scene.add(keyLight);

    // Vibrant Hanasu Orange rim light (creates the iconic warm edge reflection)
    const orangeRimLight = new THREE.DirectionalLight(0xff6a00, 3.8);
    orangeRimLight.position.set(-6, -4, 4);
    scene.add(orangeRimLight);

    // Subtle Amber soft fill light
    const fillLight = new THREE.PointLight(0xffb000, 2.0, 18);
    fillLight.position.set(0, 2, -4);
    scene.add(fillLight);

    // -------------------------------------------------------------
    // 3. BACKGROUND DRIFTING PARTICLES (ATMOSPHERE)
    // -------------------------------------------------------------
    const particleCount = isMobile ? 60 : 120;
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

    // Particle texture (warm soft circle)
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

    // -------------------------------------------------------------
    // 4. PHONE SCREEN 2D CANVAS (LIVE HANASU CHAT INTERFACE)
    // -------------------------------------------------------------
    const screenCanvas = document.createElement('canvas');
    screenCanvas.width = 720;
    screenCanvas.height = 1500;
    screenCanvasRef.current = screenCanvas;
    const sctx = screenCanvas.getContext('2d');

    const screenTexture = new THREE.CanvasTexture(screenCanvas);
    screenTexture.generateMipmaps = true;
    screenTexture.minFilter = THREE.LinearMipmapLinearFilter;
    screenTexture.magFilter = THREE.LinearFilter;

    // Helper to render chat conversation onto canvas
    let lastRenderedProgress = -1;
    function drawScreen(progress) {
      // Avoid redrawing identical frames
      if (Math.abs(progress - lastRenderedProgress) < 0.005) return;
      lastRenderedProgress = progress;

      const w = 720;
      const h = 1500;

      // 1. Background (warm deep black)
      const bgGrad = sctx.createLinearGradient(0, 0, 0, h);
      bgGrad.addColorStop(0, '#14100D');
      bgGrad.addColorStop(0.3, '#0C0A08');
      bgGrad.addColorStop(1, '#090705');
      sctx.fillStyle = bgGrad;
      sctx.fillRect(0, 0, w, h);

      // Subtle ambient orange glow in top right of screen
      const glow = sctx.createRadialGradient(w - 80, 100, 10, w - 80, 100, 320);
      glow.addColorStop(0, 'rgba(255, 106, 0, 0.12)');
      glow.addColorStop(1, 'rgba(255, 106, 0, 0)');
      sctx.fillStyle = glow;
      sctx.fillRect(0, 0, w, h);

      // 2. Status Bar
      sctx.fillStyle = '#FFF7EA';
      sctx.font = '600 28px Inter, sans-serif';
      sctx.fillText('9:41', 54, 76);

      // Battery & Signal icons
      sctx.fillStyle = '#FFF7EA';
      sctx.fillRect(w - 110, 56, 44, 22);
      sctx.clearRect(w - 108, 58, 40, 18);
      sctx.fillStyle = '#FF6A00';
      sctx.fillRect(w - 106, 60, 30, 14); // battery level
      sctx.fillStyle = '#FFF7EA';
      sctx.fillRect(w - 64, 62, 3, 10); // battery tip

      // Dynamic Island Pill
      sctx.fillStyle = '#000000';
      sctx.beginPath();
      sctx.roundRect(w / 2 - 95, 48, 190, 48, 24);
      sctx.fill();

      // Camera lens reflection in pill
      sctx.fillStyle = '#111722';
      sctx.beginPath();
      sctx.arc(w / 2 + 50, 72, 9, 0, Math.PI * 2);
      sctx.fill();

      // 3. Hanasu Chat Header
      sctx.fillStyle = 'rgba(25, 21, 16, 0.85)';
      sctx.fillRect(0, 120, w, 150);

      // Header bottom border
      sctx.fillStyle = 'rgba(255, 177, 0, 0.18)';
      sctx.fillRect(0, 270, w, 1);

      // Partner Avatar (Akshay K)
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

      // Avatar online presence dot
      sctx.fillStyle = '#090705';
      sctx.beginPath();
      sctx.arc(120, 225, 14, 0, Math.PI * 2);
      sctx.fill();
      sctx.fillStyle = '#FF6A00';
      sctx.beginPath();
      sctx.arc(120, 225, 10, 0, Math.PI * 2);
      sctx.fill();

      // Partner name and status
      sctx.fillStyle = '#FFF7EA';
      sctx.font = '600 32px Inter, sans-serif';
      sctx.fillText('Akshay K', 150, 190);

      sctx.fillStyle = '#FFB000';
      sctx.font = '500 22px Inter, sans-serif';
      sctx.fillText('Online · In Hanasu', 150, 224);

      // Top brand badge
      sctx.fillStyle = '#FFD166';
      sctx.font = '700 20px "Space Grotesk", sans-serif';
      sctx.textAlign = 'right';
      sctx.fillText('HANASU · 話す', w - 48, 200);
      sctx.textAlign = 'left';

      // 4. Conversation Messages (reveal as user scrolls)
      // Normalized chat reveal progression between scroll progress 0.28 and 0.82
      const chatP = Math.max(0, Math.min(1, (progress - 0.25) / 0.5));

      // Date Pill
      sctx.fillStyle = 'rgba(255, 177, 0, 0.08)';
      sctx.beginPath();
      sctx.roundRect(w / 2 - 90, 310, 180, 42, 21);
      sctx.fill();
      sctx.fillStyle = '#B8AA98';
      sctx.font = '500 19px Inter, sans-serif';
      sctx.textAlign = 'center';
      sctx.fillText('Today · 9:41 AM', w / 2, 338);
      sctx.textAlign = 'left';

      // --- Message 1 (Partner) ---
      const m1Alpha = Math.min(1, chatP * 2.8);
      if (m1Alpha > 0.02) {
        sctx.save();
        sctx.globalAlpha = m1Alpha;
        const yOffset = (1 - m1Alpha) * 25;

        sctx.fillStyle = 'rgba(25, 21, 16, 0.95)';
        sctx.beginPath();
        sctx.roundRect(48, 380 + yOffset, 420, 100, [6, 24, 24, 24]);
        sctx.fill();
        sctx.strokeStyle = 'rgba(255, 177, 0, 0.2)';
        sctx.lineWidth = 1.5;
        sctx.stroke();

        sctx.fillStyle = '#FFF7EA';
        sctx.font = '400 28px Inter, sans-serif';
        sctx.fillText('Hey, are you free?', 76, 436 + yOffset);

        sctx.fillStyle = '#B8AA98';
        sctx.font = '400 18px Inter, sans-serif';
        sctx.fillText('9:41', 400, 464 + yOffset);
        sctx.restore();
      }

      // --- Message 2 (You) ---
      const m2Alpha = Math.max(0, Math.min(1, (chatP - 0.3) * 2.8));
      if (m2Alpha > 0.02) {
        sctx.save();
        sctx.globalAlpha = m2Alpha;
        const yOffset = (1 - m2Alpha) * 25;

        const bubbleGrad = sctx.createLinearGradient(w - 480, 510, w - 48, 610);
        bubbleGrad.addColorStop(0, '#FF6A00');
        bubbleGrad.addColorStop(1, '#FF8A00');
        sctx.fillStyle = bubbleGrad;
        sctx.beginPath();
        sctx.roundRect(w - 460, 510 + yOffset, 412, 100, [24, 6, 24, 24]);
        sctx.fill();

        sctx.fillStyle = '#090705';
        sctx.font = '600 28px Inter, sans-serif';
        sctx.fillText("Yeah, what's up?", w - 425, 566 + yOffset);

        sctx.fillStyle = 'rgba(9, 7, 5, 0.7)';
        sctx.font = '500 18px Inter, sans-serif';
        sctx.fillText('9:42 · Sent', w - 150, 594 + yOffset);
        sctx.restore();
      }

      // --- Message 3 (Partner) ---
      const m3Alpha = Math.max(0, Math.min(1, (chatP - 0.6) * 2.8));
      if (m3Alpha > 0.02) {
        sctx.save();
        sctx.globalAlpha = m3Alpha;
        const yOffset = (1 - m3Alpha) * 25;

        sctx.fillStyle = 'rgba(25, 21, 16, 0.95)';
        sctx.beginPath();
        sctx.roundRect(48, 640 + yOffset, 340, 100, [6, 24, 24, 24]);
        sctx.fill();
        sctx.strokeStyle = 'rgba(255, 177, 0, 0.3)';
        sctx.lineWidth = 1.5;
        sctx.stroke();

        sctx.fillStyle = '#FFF7EA';
        sctx.font = '400 28px Inter, sans-serif';
        sctx.fillText("Let's talk.", 76, 696 + yOffset);

        sctx.fillStyle = '#B8AA98';
        sctx.font = '400 18px Inter, sans-serif';
        sctx.fillText('9:42', 320, 724 + yOffset);
        sctx.restore();
      }

      // --- Message 4 (You - Live Sync) ---
      const m4Alpha = Math.max(0, Math.min(1, (chatP - 0.85) * 3.0));
      if (m4Alpha > 0.02) {
        sctx.save();
        sctx.globalAlpha = m4Alpha;
        const yOffset = (1 - m4Alpha) * 25;

        const m4Grad = sctx.createLinearGradient(w - 520, 770, w - 48, 870);
        m4Grad.addColorStop(0, '#FFB000');
        m4Grad.addColorStop(1, '#FF6A00');
        sctx.fillStyle = m4Grad;
        sctx.beginPath();
        sctx.roundRect(w - 480, 770 + yOffset, 432, 100, [24, 6, 24, 24]);
        sctx.fill();

        sctx.fillStyle = '#090705';
        sctx.font = '600 28px Inter, sans-serif';
        sctx.fillText('Always connected.', w - 445, 826 + yOffset);

        sctx.fillStyle = 'rgba(9, 7, 5, 0.7)';
        sctx.font = '500 18px Inter, sans-serif';
        sctx.fillText('9:43 · Just now', w - 170, 854 + yOffset);
        sctx.restore();
      }

      // 5. Floating Bottom Input Bar
      sctx.fillStyle = 'rgba(18, 16, 13, 0.95)';
      sctx.beginPath();
      sctx.roundRect(36, h - 180, w - 72, 92, 46);
      sctx.fill();
      sctx.strokeStyle = 'rgba(255, 177, 0, 0.28)';
      sctx.lineWidth = 1.5;
      sctx.stroke();

      sctx.fillStyle = '#B8AA98';
      sctx.font = '400 26px Inter, sans-serif';
      sctx.fillText('Start typing...', 80, h - 124);

      // Send Button Pill
      sctx.fillStyle = '#FF6A00';
      sctx.beginPath();
      sctx.arc(w - 82, h - 134, 32, 0, Math.PI * 2);
      sctx.fill();

      // Send Arrow in button
      sctx.strokeStyle = '#090705';
      sctx.lineWidth = 4;
      sctx.beginPath();
      sctx.moveTo(w - 92, h - 134);
      sctx.lineTo(w - 74, h - 134);
      sctx.moveTo(w - 80, h - 140);
      sctx.lineTo(w - 74, h - 134);
      sctx.lineTo(w - 80, h - 128);
      sctx.stroke();

      // Home bar
      sctx.fillStyle = '#FFF7EA';
      sctx.beginPath();
      sctx.roundRect(w / 2 - 100, h - 34, 200, 8, 4);
      sctx.fill();

      screenTexture.needsUpdate = true;
    }

    // Initial draw
    drawScreen(0);

    // -------------------------------------------------------------
    // 5. 3D SMARTPHONE GEOMETRY & MATERIALS
    // -------------------------------------------------------------
    const phoneGroup = new THREE.Group();
    scene.add(phoneGroup);

    // Phone dimensions
    const phoneW = 3.3;
    const phoneH = 6.8;
    const phoneD = 0.32;
    const cornerR = 0.44;

    // Body chassis shape (rounded rectangle)
    const phoneShape = new THREE.Shape();
    phoneShape.moveTo(-phoneW / 2 + cornerR, -phoneH / 2);
    phoneShape.lineTo(phoneW / 2 - cornerR, -phoneH / 2);
    phoneShape.absarc(phoneW / 2 - cornerR, -phoneH / 2 + cornerR, cornerR, -Math.PI / 2, 0, false);
    phoneShape.lineTo(phoneW / 2, phoneH / 2 - cornerR);
    phoneShape.absarc(phoneW / 2 - cornerR, phoneH / 2 - cornerR, cornerR, 0, Math.PI / 2, false);
    phoneShape.lineTo(-phoneW / 2 + cornerR, phoneH / 2);
    phoneShape.absarc(-phoneW / 2 + cornerR, phoneH / 2 - cornerR, cornerR, Math.PI / 2, Math.PI, false);
    phoneShape.lineTo(-phoneW / 2, -phoneH / 2 + cornerR);
    phoneShape.absarc(-phoneW / 2 + cornerR, -phoneH / 2 + cornerR, cornerR, Math.PI, Math.PI * 1.5, false);

    const extrudeSettings = {
      depth: phoneD,
      bevelEnabled: true,
      bevelSegments: 4,
      steps: 1,
      bevelSize: 0.05,
      bevelThickness: 0.05,
    };

    const chassisGeometry = new THREE.ExtrudeGeometry(phoneShape, extrudeSettings);
    chassisGeometry.center();

    // Dark titanium metallic frame material
    const frameMaterial = new THREE.MeshStandardMaterial({
      color: 0x161310,
      metalness: 0.92,
      roughness: 0.22,
    });
    const chassisMesh = new THREE.Mesh(chassisGeometry, frameMaterial);
    phoneGroup.add(chassisMesh);

    // Back Plate (matte dark glass)
    const backGeometry = new THREE.PlaneGeometry(phoneW - 0.1, phoneH - 0.1);
    const backMaterial = new THREE.MeshStandardMaterial({
      color: 0x0f0d0b,
      metalness: 0.4,
      roughness: 0.45,
    });
    const backMesh = new THREE.Mesh(backGeometry, backMaterial);
    backMesh.position.z = -phoneD / 2 - 0.055;
    backMesh.rotation.y = Math.PI;
    phoneGroup.add(backMesh);

    // Rear Camera Island (Top Left on back)
    const cameraIslandShape = new THREE.Shape();
    const ciW = 1.3, ciH = 1.35, ciR = 0.28;
    cameraIslandShape.moveTo(-ciW / 2 + ciR, -ciH / 2);
    cameraIslandShape.lineTo(ciW / 2 - ciR, -ciH / 2);
    cameraIslandShape.absarc(ciW / 2 - ciR, -ciH / 2 + ciR, ciR, -Math.PI / 2, 0, false);
    cameraIslandShape.lineTo(ciW / 2, ciH / 2 - ciR);
    cameraIslandShape.absarc(ciW / 2 - ciR, ciH / 2 - ciR, ciR, 0, Math.PI / 2, false);
    cameraIslandShape.lineTo(-ciW / 2 + ciR, ciH / 2);
    cameraIslandShape.absarc(-ciW / 2 + ciR, ciH / 2 - ciR, ciR, Math.PI / 2, Math.PI, false);
    cameraIslandShape.lineTo(-ciW / 2, -ciH / 2 + ciR);
    cameraIslandShape.absarc(-ciW / 2 + ciR, -ciH / 2 + ciR, ciR, Math.PI, Math.PI * 1.5, false);

    const ciExtrude = new THREE.ExtrudeGeometry(cameraIslandShape, {
      depth: 0.08,
      bevelEnabled: true,
      bevelSegments: 3,
      bevelSize: 0.02,
      bevelThickness: 0.02,
    });
    ciExtrude.center();
    const ciMaterial = new THREE.MeshStandardMaterial({
      color: 0x181512,
      metalness: 0.85,
      roughness: 0.28,
    });
    const cameraIsland = new THREE.Mesh(ciExtrude, ciMaterial);
    cameraIsland.position.set(-0.82, 2.25, -phoneD / 2 - 0.1);
    cameraIsland.rotation.y = Math.PI;
    phoneGroup.add(cameraIsland);

    // Camera lenses on the island
    const lensGeom = new THREE.CylinderGeometry(0.24, 0.24, 0.08, 24);
    const lensRingMaterial = new THREE.MeshStandardMaterial({
      color: 0x332c25,
      metalness: 0.95,
      roughness: 0.2,
    });
    const lensGlassMaterial = new THREE.MeshStandardMaterial({
      color: 0x050c18,
      metalness: 0.1,
      roughness: 0.05,
    });

    const lensPositions = [
      [-0.32, 0.32],
      [-0.32, -0.32],
      [0.32, 0],
    ];

    lensPositions.forEach(([lx, ly]) => {
      const ring = new THREE.Mesh(lensGeom, lensRingMaterial);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(lx, ly, -0.05);

      const glass = new THREE.Mesh(new THREE.CircleGeometry(0.19, 24), lensGlassMaterial);
      glass.position.set(0, -0.041, 0);
      glass.rotation.x = Math.PI / 2;
      ring.add(glass);

      cameraIsland.add(ring);
    });

    // Front Screen Plane with dynamic CanvasTexture
    const screenGeometry = new THREE.PlaneGeometry(phoneW - 0.22, phoneH - 0.32);
    const screenMaterial = new THREE.MeshBasicMaterial({
      map: screenTexture,
    });
    const screenMesh = new THREE.Mesh(screenGeometry, screenMaterial);
    screenMesh.position.z = phoneD / 2 + 0.052;
    phoneGroup.add(screenMesh);

    // Front Glass Reflection Layer
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

    // Side Buttons (Volume & Power)
    const btnGeom = new THREE.BoxGeometry(0.04, 0.45, 0.08);
    const btnMat = new THREE.MeshStandardMaterial({ color: 0x221d18, metalness: 0.9, roughness: 0.25 });
    
    // Volume Up / Down
    const volUp = new THREE.Mesh(btnGeom, btnMat);
    volUp.position.set(-phoneW / 2 - 0.06, 1.4, 0);
    phoneGroup.add(volUp);

    const volDown = new THREE.Mesh(btnGeom, btnMat);
    volDown.position.set(-phoneW / 2 - 0.06, 0.8, 0);
    phoneGroup.add(volDown);

    // Power Button
    const pwrBtn = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.7, 0.08), btnMat);
    pwrBtn.position.set(phoneW / 2 + 0.06, 1.1, 0);
    phoneGroup.add(pwrBtn);

    // -------------------------------------------------------------
    // 6. SCROLL INTERPOLATION & RESIZE LISTENERS
    // -------------------------------------------------------------
    let animationFrameId = null;
    let isRunning = true;
    let clock = new THREE.Clock();

    const handleScroll = () => {
      const scrollY = window.scrollY;
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const rawProgress = Math.max(0, Math.min(1, scrollY / maxScroll));
      scrollState.current.target = rawProgress;

      // Update active nav section index for UI indicators
      if (rawProgress < 0.22) {
        setActiveSection(0);
      } else if (rawProgress < 0.52) {
        setActiveSection(1);
      } else if (rawProgress < 0.78) {
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

    // Initial scroll sync
    handleScroll();

    // -------------------------------------------------------------
    // 7. SINGLE HIGH-PERFORMANCE ANIMATION LOOP
    // -------------------------------------------------------------
    const animate = () => {
      if (!isRunning) return;

      const delta = clock.getDelta();
      const time = clock.getElapsedTime();

      // Smooth scroll interpolation (lerp)
      const st = scrollState.current;
      st.current += (st.target - st.current) * 0.075;
      const p = st.current;

      // Smooth mouse interpolation
      const ms = mouseState.current;
      ms.x += (ms.targetX - ms.x) * 0.06;
      ms.y += (ms.targetY - ms.y) * 0.06;

      // Update phone screen canvas content based on scroll progress
      drawScreen(p);

      // --- CHOREOGRAPHY BASED ON SCROLL PROGRESS p (0.0 to 1.0) ---
      // Scale phone for mobile vs desktop
      const baseScale = isMobile ? 0.72 : 1.0;

      if (p < 0.22) {
        // PHASE 1: HERO (Phone peeking up and tilted from the right)
        const t = p / 0.22;
        const targetX = isMobile ? 0 : 2.2 + ms.x;
        const targetY = -2.8 + t * 1.5 - ms.y;
        const targetZ = -1.6 + t * 0.6;

        phoneGroup.position.set(targetX, targetY, targetZ);
        phoneGroup.rotation.set(0.42 - t * 0.15 + ms.y * 0.5, -0.58 + t * 0.2 + ms.x * 0.5, 0.18 - t * 0.08);
        phoneGroup.scale.setScalar(baseScale * (0.92 + t * 0.08));
      } else if (p < 0.52) {
        // PHASE 2: CONNECTION (Phone enters closer, turning toward the center)
        const t = (p - 0.22) / 0.3;
        const targetX = isMobile ? 0 : 2.2 - t * 1.2 + ms.x;
        const targetY = -1.3 + t * 1.3 - ms.y;
        const targetZ = -1.0 + t * 1.6;

        phoneGroup.position.set(targetX, targetY, targetZ);
        phoneGroup.rotation.set(0.27 - t * 0.22 + ms.y * 0.4, -0.38 + t * 0.32 + ms.x * 0.4, 0.1 - t * 0.08);
        phoneGroup.scale.setScalar(baseScale * (1.0 + t * 0.12));
      } else if (p < 0.78) {
        // PHASE 3: CONVERSATION & 3D PHONE CENTER-STAGE (Face directly front, messages animate)
        const t = (p - 0.52) / 0.26;
        const targetX = (isMobile ? 0 : 1.0 - t * 1.0) + ms.x;
        const targetY = 0.0 + Math.sin(time * 1.5) * 0.04 - ms.y;
        const targetZ = 0.6 + t * 0.6; // zoomed in close to highlight the chat

        phoneGroup.position.set(targetX, targetY, targetZ);
        // Subtle natural floating tilt
        phoneGroup.rotation.set(0.05 * (1 - t) + ms.y * 0.3, -0.06 * (1 - t) + ms.x * 0.3, 0.02 * (1 - t));
        phoneGroup.scale.setScalar(baseScale * 1.15);
      } else {
        // PHASE 4: ENTER HANASU / CLOSING (Phone settles softly, floating gracefully)
        const t = (p - 0.78) / 0.22;
        const targetX = (isMobile ? 0 : 1.8 * t) + ms.x;
        const targetY = -0.3 + Math.sin(time * 1.2) * 0.08 - ms.y;
        const targetZ = 1.2 - t * 1.8;

        phoneGroup.position.set(targetX, targetY, targetZ);
        phoneGroup.rotation.set(t * 0.18 + ms.y * 0.3, -t * 0.42 + ms.x * 0.3, t * 0.08);
        phoneGroup.scale.setScalar(baseScale * (1.15 - t * 0.25));
      }

      // Slowly drift background particles
      const pos = particleGeometry.attributes.position.array;
      for (let i = 0; i < particleCount; i++) {
        pos[i * 3 + 1] -= particleSpeeds[i] * delta * 0.8;
        if (pos[i * 3 + 1] < -8) {
          pos[i * 3 + 1] = 8;
        }
      }
      particleGeometry.attributes.position.needsUpdate = true;

      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };

    // Pause rendering when tab is hidden to save GPU & CPU
    const handleVisibilityChange = () => {
      if (document.hidden) {
        isRunning = false;
      } else {
        if (!isRunning) {
          isRunning = true;
          clock.start();
          animationFrameId = requestAnimationFrame(animate);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Start single render loop
    animationFrameId = requestAnimationFrame(animate);

    // -------------------------------------------------------------
    // 8. CLEANUP ON UNMOUNT (PREVENTS MEMORY LEAKS & DUPLICATE LOOPS)
    // -------------------------------------------------------------
    return () => {
      isRunning = false;
      if (animationFrameId) cancelAnimationFrame(animationFrameId);

      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      // Dispose Three.js resources
      chassisGeometry.dispose();
      frameMaterial.dispose();
      backGeometry.dispose();
      backMaterial.dispose();
      ciExtrude.dispose();
      ciMaterial.dispose();
      lensGeom.dispose();
      lensRingMaterial.dispose();
      lensGlassMaterial.dispose();
      screenGeometry.dispose();
      screenMaterial.dispose();
      screenTexture.dispose();
      glassGeometry.dispose();
      glassMaterial.dispose();
      btnGeom.dispose();
      btnMat.dispose();
      particleGeometry.dispose();
      particleMaterial.dispose();
      particleTexture.dispose();

      renderer.dispose();
    };
  }, []);

  return (
    <div ref={containerRef} className="relative w-full bg-[#090705] text-[#FFF7EA] overflow-x-hidden selection:bg-[#FF6A00] selection:text-[#090705]">
      {/* ------------------------------------------------------------- */}
      {/* FIXED THREE.JS 3D CANVAS (ALWAYS STAYS IN BACKGROUND) */}
      {/* ------------------------------------------------------------- */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 w-full h-full pointer-events-none z-0"
        aria-hidden="true"
      />

      {/* Subtle Warm Gradient Overlay at Top & Bottom */}
      <div className="fixed inset-0 pointer-events-none z-[1] bg-[radial-gradient(ellipse_at_top,_rgba(255,106,0,0.06)_0%,_transparent_60%)]" />
      <div className="fixed inset-0 pointer-events-none z-[1] bg-[radial-gradient(ellipse_at_bottom,_rgba(255,177,0,0.04)_0%,_transparent_50%)]" />

      {/* ------------------------------------------------------------- */}
      {/* MINIMAL FLOATING NAVIGATION — CLEAN, IMMERSIVE, NO BRAND MARK */}
      {/* ------------------------------------------------------------- */}
      <header className="fixed top-5 sm:top-6 right-5 sm:right-10 z-50 flex items-center pointer-events-auto">
        <nav className="flex items-center gap-1 sm:gap-2 p-1.5 sm:p-2 rounded-full bg-[#12100D]/80 backdrop-blur-xl border border-[var(--border-subtle)] shadow-[0_8px_32px_rgba(0,0,0,0.6)]">
          <button
            onClick={() => scrollToProgress(0)}
            className={`px-3.5 py-1.5 rounded-full text-xs uppercase tracking-widest font-medium transition-colors ${
              activeSection === 0 ? 'text-[#FFB000] bg-[rgba(255,176,0,0.12)]' : 'text-[var(--text-muted)] hover:text-[#FFF7EA]'
            } hidden sm:inline-block`}
          >
            Home
          </button>
          <button
            onClick={() => scrollToProgress(0.35)}
            className={`px-3.5 py-1.5 rounded-full text-xs uppercase tracking-widest font-medium transition-colors ${
              activeSection === 1 ? 'text-[#FFB000] bg-[rgba(255,176,0,0.12)]' : 'text-[var(--text-muted)] hover:text-[#FFF7EA]'
            } hidden sm:inline-block`}
          >
            Connection
          </button>
          <button
            onClick={() => scrollToProgress(0.65)}
            className={`px-3.5 py-1.5 rounded-full text-xs uppercase tracking-widest font-medium transition-colors ${
              activeSection === 2 ? 'text-[#FFB000] bg-[rgba(255,176,0,0.12)]' : 'text-[var(--text-muted)] hover:text-[#FFF7EA]'
            } hidden sm:inline-block`}
          >
            Experience
          </button>

          {/* Primary CTA */}
          <button
            onClick={handleOpenChat}
            className="px-5 py-2 rounded-full text-xs uppercase tracking-widest font-bold bg-[#FF6A00] text-[#090705] hover:bg-[#E05D00] shadow-[0_0_20px_rgba(255,106,0,0.35)] hover:shadow-[0_0_28px_rgba(255,106,0,0.6)] transition-all duration-300"
          >
            Open Chat
          </button>
        </nav>
      </header>

      {/* ------------------------------------------------------------- */}
      {/* SCROLL-DRIVEN STORY SECTIONS */}
      {/* ------------------------------------------------------------- */}
      <main className="relative z-10 w-full">
        {/* SECTION 1: HERO */}
        <section className="min-h-screen flex flex-col justify-center items-center text-center px-6 pt-12 pb-12 relative">
          <div className="max-w-3xl mx-auto flex flex-col items-center">
            {/* Minimal Sub-Badge */}
            <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full border border-[var(--border-subtle)] bg-[#12100D]/70 backdrop-blur-md mb-8 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-[#FF6A00] shadow-[0_0_8px_#FF6A00]"></span>
              <span className="text-[11px] font-mono tracking-widest uppercase text-[#D4C7B5]">
                Real-Time Communication
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
            onClick={() => scrollToProgress(0.35)}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 cursor-pointer text-[var(--text-muted)] hover:text-[#FFF7EA] transition-colors"
          >
            <span className="text-[10px] uppercase font-mono tracking-[0.25em]">Scroll to explore</span>
            <div className="w-[1px] h-8 bg-gradient-to-b from-[#FF6A00] to-transparent animate-pulse" />
          </div>
        </section>

        {/* SECTION 2: CONNECTION */}
        <section className="min-h-screen flex items-center px-6 sm:px-12 md:px-20 py-24 relative">
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
                <p className="text-xs text-[var(--text-muted)]">Sub-millisecond WebSocket message streaming.</p>
              </div>

              <div className="p-4 rounded-2xl border border-[var(--border-subtle)] bg-[#12100D]/60 backdrop-blur-md">
                <div className="flex items-center gap-2.5 text-[#FFB000] mb-1 font-semibold text-sm">
                  <FiShield size={16} />
                  <span>Private by Design</span>
                </div>
                <p className="text-xs text-[var(--text-muted)]">Authenticated sessions with verified identity.</p>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 3: THE 3D PHONE EXPERIENCE */}
        <section className="min-h-screen flex flex-col justify-between px-6 sm:px-12 md:px-20 py-24 relative pointer-events-none">
          {/* Top Stage Notice */}
          <div className="flex justify-between items-start w-full">
            <div className="max-w-md pointer-events-auto">
              <span className="text-xs font-mono font-bold tracking-[0.25em] text-[#FFB000] uppercase mb-2 block">
                02 / Real-Time Experience
              </span>
              <h3 className="text-2xl sm:text-4xl font-display font-bold text-[#FFF7EA]">
                Conversations that feel alive.
              </h3>
            </div>

            {/* Feature badge */}
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

          {/* Bottom Prompt */}
          <div className="w-full flex justify-center pb-8">
            <div className="px-5 py-2 rounded-full border border-[#FFB000]/30 bg-[#12100D]/80 backdrop-blur-xl text-xs font-mono text-[#FFB000] flex items-center gap-2">
              <FiMessageSquare />
              <span>Scroll to watch conversation unfold</span>
            </div>
          </div>
        </section>

        {/* SECTION 4: FINAL CTA & ENTER HANASU */}
        <section className="min-h-screen flex flex-col justify-center items-center text-center px-6 py-24 relative">
          <div className="max-w-2xl mx-auto flex flex-col items-center">
            <span className="text-xs font-mono font-bold tracking-[0.25em] text-[#FF6A00] uppercase mb-4 block">
              03 / Next Step
            </span>

            <h2 className="text-4xl sm:text-6xl md:text-7xl font-display font-bold text-[#FFF7EA] tracking-wide mb-6">
              Start talking.
            </h2>

            <p className="text-base sm:text-lg text-[var(--text-muted)] font-light max-w-lg mb-10 leading-relaxed">
              Step into a real-time sanctuary crafted for connection. Catch up with friends or start something new.
            </p>

            {/* Main Action Button */}
            <button
              onClick={handleOpenChat}
              className="inline-flex items-center gap-3 px-10 py-4 rounded-full bg-[#FF6A00] text-[#090705] font-bold text-sm uppercase tracking-[0.2em] hover:bg-[#E05D00] shadow-[0_0_30px_rgba(255,106,0,0.5)] hover:shadow-[0_0_45px_rgba(255,106,0,0.8)] hover:scale-105 transition-all duration-300 mb-8"
            >
              <span>Open Chat</span>
              <FiArrowRight size={18} />
            </button>

            <p className="text-xs text-[var(--text-muted)] font-mono">
              Works across modern browsers · Fast · Minimal · Encrypted
            </p>
          </div>

          {/* Minimal Editorial Footer */}
          <footer className="w-full max-w-6xl mx-auto border-t border-[var(--border-subtle)] pt-10 mt-20 flex flex-col sm:flex-row items-center justify-between text-xs text-[var(--text-muted)] font-mono gap-4">
            <div className="flex items-center gap-3">
              <span className="font-display font-bold text-[#FFF7EA] text-sm tracking-widest">HANASU</span>
              <span>— Conversations, with feeling.</span>
            </div>
            <div>© 2026 Hanasu. All rights reserved.</div>
          </footer>
        </section>
      </main>
    </div>
  );
}
