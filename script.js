/* ===== THREE.JS 3D SCENE (OPTIMIZED, LAZY) ===== */
let THREE = null;

let scene, camera, renderer;
let spaceship, starField, planets = [];
let clock;
let is3DReady = false;
let isHeroVisible = true;
let animationId = null;

async function initThree() {
  try {
    if (!THREE) THREE = await import('three');
    const container = document.getElementById('three-container');
    if (!container) return;

    // Check for WebGL support
    const testCanvas = document.createElement('canvas');
    const gl = testCanvas.getContext('webgl2') || testCanvas.getContext('webgl');
    if (!gl) {
      console.warn('WebGL not supported, skipping 3D');
      hideFallback();
      return;
    }

    scene = new THREE.Scene();
    // No fog for performance

    camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200);
    camera.position.set(0, 1, 10);

    renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: true,
      powerPreference: 'default',
      preserveDrawingBuffer: false
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(1); // Cap at 1x for performance
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    // Minimal lighting - just ambient + one point
    const ambientLight = new THREE.AmbientLight(0x334466, 0.6);
    scene.add(ambientLight);

    const mainLight = new THREE.PointLight(0x00d4ff, 1.5, 60);
    mainLight.position.set(5, 8, 5);
    scene.add(mainLight);

    const rimLight = new THREE.PointLight(0xb44dff, 0.6, 40);
    rimLight.position.set(-5, 2, -5);
    scene.add(rimLight);

    // Lightweight starfield - 500 stars
    createStarField();

    // Simple spaceship
    createSpaceship();

    // Simple planets - 2 instead of 3, fewer vertices
    createPlanets();

    is3DReady = true;
    hideFallback();

    // Pause 3D when hero is not visible
    const heroObserver = new IntersectionObserver((entries) => {
      isHeroVisible = entries[0].isIntersecting;
    }, { threshold: 0 });
    const hero = document.getElementById('hero');
    if (hero) heroObserver.observe(hero);

    clock = new THREE.Clock();
    animate3D();

  } catch (e) {
    console.warn('Three.js init failed:', e);
    hideFallback();
  }
}

function hideFallback() {
  const fb = document.getElementById('threeFallback');
  if (fb) fb.classList.add('hidden');
}

function createStarField() {
  const starCount = 600;
  const positions = new Float32Array(starCount * 3);
  const colors = new Float32Array(starCount * 3);

  for (let i = 0; i < starCount; i++) {
    const i3 = i * 3;
    const radius = 15 + Math.random() * 60;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);

    positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    positions[i3 + 2] = radius * Math.cos(phi);

    const r = Math.random();
    colors[i3] = r < 0.7 ? 0.8 : r < 0.9 ? 0.7 : 1.0;
    colors[i3 + 1] = r < 0.7 ? 0.85 : r < 0.9 ? 0.5 : 0.7;
    colors[i3 + 2] = r < 0.7 ? 1.0 : r < 0.9 ? 1.0 : 0.8;
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const mat = new THREE.PointsMaterial({
    size: 0.12,
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  starField = new THREE.Points(geom, mat);
  scene.add(starField);
}

function createSpaceship() {
  spaceship = new THREE.Group();

  // Body - reduced segments
  const bodyGeom = new THREE.CylinderGeometry(0.3, 0.45, 2, 6);
  const bodyMat = new THREE.MeshBasicMaterial({ color: 0x667788 });
  const body = new THREE.Mesh(bodyGeom, bodyMat);
  body.rotation.x = Math.PI / 2;
  spaceship.add(body);

  // Nose
  const noseGeom = new THREE.ConeGeometry(0.3, 0.6, 6);
  const noseMat = new THREE.MeshBasicMaterial({ color: 0x99aabb });
  const nose = new THREE.Mesh(noseGeom, noseMat);
  nose.rotation.x = Math.PI / 2;
  nose.position.z = 1.3;
  spaceship.add(nose);

  // Cockpit
  const cockpitGeom = new THREE.SphereGeometry(0.2, 6, 6, 0, Math.PI * 2, 0, Math.PI / 2);
  const cockpitMat = new THREE.MeshBasicMaterial({ color: 0x4488cc });
  const cockpit = new THREE.Mesh(cockpitGeom, cockpitMat);
  cockpit.position.set(0, 0.15, 0.7);
  cockpit.rotation.x = Math.PI / 2;
  spaceship.add(cockpit);

  // Wings - thin boxes
  const wingGeom = new THREE.BoxGeometry(1, 0.04, 0.2);
  const wingMat = new THREE.MeshBasicMaterial({ color: 0x556677 });
  const leftWing = new THREE.Mesh(wingGeom, wingMat);
  leftWing.position.set(-0.5, 0, 0);
  leftWing.rotation.z = 0.3;
  spaceship.add(leftWing);

  const rightWing = new THREE.Mesh(wingGeom, wingMat);
  rightWing.position.set(0.5, 0, 0);
  rightWing.rotation.z = -0.3;
  spaceship.add(rightWing);

  // Engine glow - simple sphere
  const engineGeom = new THREE.SphereGeometry(0.12, 6, 6);
  const engineMat = new THREE.MeshBasicMaterial({ color: 0xff6b35 });
  const engine = new THREE.Mesh(engineGeom, engineMat);
  engine.position.set(0, 0, -1.2);
  spaceship.add(engine);

  // Flame
  const flameGeom = new THREE.CylinderGeometry(0.06, 0.15, 0.4, 6);
  const flameMat = new THREE.MeshBasicMaterial({ color: 0xff4da6 });
  const flame = new THREE.Mesh(flameGeom, flameMat);
  flame.position.set(0, 0, -1.5);
  spaceship.add(flame);

  spaceship.position.set(0, 0.5, 0);
  scene.add(spaceship);
}

function createPlanets() {
  // Planet 1
  const planet1Geom = new THREE.SphereGeometry(0.5, 8, 8);
  const planet1Mat = new THREE.MeshBasicMaterial({ color: 0x2244aa });
  const planet1 = new THREE.Mesh(planet1Geom, planet1Mat);
  planet1.position.set(4, 1, -2);
  planet1.userData = { orbitRadius: 4, orbitSpeed: 0.3, orbitOffset: 0, yOffset: 1 };
  planets.push(planet1);
  scene.add(planet1);

  // Planet 2 with ring
  const planet2Geom = new THREE.SphereGeometry(0.35, 8, 8);
  const planet2Mat = new THREE.MeshBasicMaterial({ color: 0xb44dff });
  const planet2 = new THREE.Mesh(planet2Geom, planet2Mat);
  planet2.position.set(-3, -0.5, 3);
  planet2.userData = { orbitRadius: 3, orbitSpeed: 0.2, orbitOffset: Math.PI, yOffset: -0.5 };
  planets.push(planet2);
  scene.add(planet2);

  // Ring
  const ringGeom = new THREE.RingGeometry(0.5, 0.7, 16);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xb44dff, transparent: true, opacity: 0.15, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(ringGeom, ringMat);
  ring.rotation.x = Math.PI / 2.5;
  planet2.add(ring);
}

function animate3D() {
  animationId = requestAnimationFrame(animate3D);

  // Pause if hero not visible, not ready, or disabled in settings
  if (!isHeroVisible || !is3DReady || window.__no3d) return;

  const elapsed = clock.getElapsedTime();

  if (starField) {
    starField.rotation.y = elapsed * 0.01;
  }

  if (spaceship) {
    spaceship.rotation.y = elapsed * 0.15;
    // Pulse engine
    const flame = spaceship.children[spaceship.children.length - 1];
    const engine = spaceship.children[spaceship.children.length - 2];
    if (flame && flame.material) flame.material.opacity = 0.5 + Math.sin(elapsed * 8) * 0.3;
    if (engine && engine.material) engine.material.opacity = 0.7 + Math.sin(elapsed * 8) * 0.2;
  }

  planets.forEach(planet => {
    const d = planet.userData;
    const angle = elapsed * d.orbitSpeed + d.orbitOffset;
    planet.position.x = Math.cos(angle) * d.orbitRadius;
    planet.position.z = Math.sin(angle) * d.orbitRadius;
    planet.position.y = d.yOffset + Math.sin(elapsed * 0.5 + d.orbitOffset) * 0.3;
    planet.rotation.y = elapsed * 0.3;
  });

  renderer.render(scene, camera);
}

/* ===== 2D PARTICLE CANVAS (OPTIMIZED) ===== */
const pCanvas = document.getElementById('particles');
const pCtx = pCanvas.getContext('2d');
let particles = [];
let particleAnimId = null;
let particlesRunning = false;

function startParticles() {
  if (!particlesRunning) animateParticles();
}

function resizeParticleCanvas() {
  pCanvas.width = window.innerWidth;
  pCanvas.height = window.innerHeight;
}

class Particle2D {
  constructor() { this.reset(); }
  reset() {
    this.x = Math.random() * pCanvas.width;
    this.y = pCanvas.height + Math.random() * 30;
    this.size = Math.random() * 1 + 0.2;
    this.speedY = -(Math.random() * 0.25 + 0.03);
    this.speedX = (Math.random() - 0.5) * 0.1;
    this.opacity = Math.random() * 0.25 + 0.03;
  }
  update() {
    this.y += this.speedY;
    this.x += this.speedX;
    if (this.y < -5 || this.opacity <= 0) this.reset();
  }
  draw() {
    pCtx.save();
    pCtx.globalAlpha = this.opacity;
    pCtx.fillStyle = '#22d3ee';
    pCtx.beginPath();
    pCtx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    pCtx.fill();
    pCtx.restore();
  }
}

function initParticles() {
  particles = [];
  const count = Math.min(40, Math.floor((pCanvas.width * pCanvas.height) / 25000));
  for (let i = 0; i < count; i++) particles.push(new Particle2D());
}

function animateParticles() {
  if (window.__noParticles) { particlesRunning = false; return; }
  particlesRunning = true;
  pCtx.clearRect(0, 0, pCanvas.width, pCanvas.height);
  for (let i = 0; i < particles.length; i++) {
    particles[i].update();
    particles[i].draw();
  }
  particleAnimId = requestAnimationFrame(animateParticles);
}

/* ===== INTERSECTION OBSERVER FOR 2D CANVAS ===== */
const pCanvasObserver = new IntersectionObserver((entries) => {
  if (entries[0].isIntersecting) {
    startParticles();
  } else {
    particlesRunning = false;
    cancelAnimationFrame(particleAnimId);
    pCtx.clearRect(0, 0, pCanvas.width, pCanvas.height);
  }
}, { threshold: 0 });

/* ===== LOADER (WITH FAILSAFE) ===== */
const loader = document.getElementById('loader');
const loaderBar = document.getElementById('loaderBar');
const loaderPct = document.getElementById('loaderPct');
const loaderLog = document.getElementById('loaderLog');
const loaderRingFg = document.getElementById('loaderRingFg');
const loaderTilt = document.getElementById('loaderTilt');
const loaderSys = document.getElementById('loaderSys');
let loaderDone = false;
let bootTarget = 6;
let bootProgress = 0;
const RING_C = 490.09;

// Scrolling boot log (keeps last 3 lines, older ones dimmed)
function bootLog(msg) {
  if (!loaderLog) return;
  const div = document.createElement('div');
  div.textContent = '› ' + msg;
  loaderLog.appendChild(div);
  while (loaderLog.children.length > 3) loaderLog.firstChild.remove();
  Array.from(loaderLog.children).forEach((c, i, arr) => c.classList.toggle('old', i < arr.length - 1));
}
// Real milestones raise the ceiling; the bar eases toward it
function milestone(p, msg) {
  if (p > bootTarget) bootTarget = Math.min(p, 100);
  if (msg) bootLog(msg);
}
function renderBoot() {
  if (loaderBar) loaderBar.style.width = bootProgress + '%';
  if (loaderPct) loaderPct.textContent = Math.floor(bootProgress);
  if (loaderRingFg) loaderRingFg.style.strokeDashoffset = RING_C * (1 - bootProgress / 100);
}
function bootTick() {
  if (loaderDone) return;
  // Always marches forward — never stalls, finishes as soon as work is done
  bootProgress += Math.max((bootTarget - bootProgress) * 0.07, 0.35);
  if (bootProgress >= 100 || (bootTarget >= 100 && bootProgress >= 99)) {
    bootProgress = 100;
    renderBoot();
    setTimeout(finishLoad, 300);
    return;
  }
  renderBoot();
  requestAnimationFrame(bootTick);
}

function finishLoad() {
  if (loaderDone) return;
  loaderDone = true;
  loader.classList.add('hidden');
  initCounters();
  typeRole();
}
// Never trap the visitor behind the loader, even if a CDN hangs
setTimeout(finishLoad, 6000);
// Interactive: click anywhere or press any key to skip the boot
loader.addEventListener('click', finishLoad);
document.addEventListener('keydown', () => { if (!loaderDone) finishLoad(); }, { once: false });

// Subtle mouse tilt on the boot emblem (throttled)
let tiltRaf = null;
document.addEventListener('mousemove', (e) => {
  if (loaderDone || !loaderTilt || tiltRaf) return;
  tiltRaf = requestAnimationFrame(() => {
    const mx = e.clientX / window.innerWidth - 0.5;
    const my = e.clientY / window.innerHeight - 0.5;
    loaderTilt.style.transform = `perspective(600px) rotateY(${mx * 10}deg) rotateX(${my * -10}deg)`;
    tiltRaf = null;
  });
});

function runLoader() {
  // Window 'load' fired = document + stylesheets + images are in
  milestone(56, 'Document ready.');
}

// Boot engine starts immediately at parse time (script is deferred,
// so the loader DOM already exists). Real events raise the ceiling.
if (loaderSys) {
  const nc = navigator.connection;
  loaderSys.textContent = `cores ${navigator.hardwareConcurrency || '?'} · dpr ${window.devicePixelRatio || 1} · net ${((nc && nc.effectiveType) || 'unknown')}`;
}
milestone(8, 'Mounting starfield...');
bootTick();
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(() => milestone(30, 'Fonts locked.'));
}

/* ===== TYPING EFFECT ===== */
const typedText = document.getElementById('typedText');
const roles = ['Sushant', 'Developer', 'Engineer'];
let roleIndex = 0;
let charIndex = 0;
let isDeleting = false;
let typingSpeed = 100;

function typeRole() {
  if (!typedText) return;
  const current = roles[roleIndex];
  if (isDeleting) {
    typedText.textContent = current.substring(0, charIndex - 1);
    charIndex--;
    typingSpeed = 40;
  } else {
    typedText.textContent = current.substring(0, charIndex + 1);
    charIndex++;
    typingSpeed = 80;
  }
  if (!isDeleting && charIndex === current.length) {
    typingSpeed = 2000;
    isDeleting = true;
  } else if (isDeleting && charIndex === 0) {
    isDeleting = false;
    roleIndex = (roleIndex + 1) % roles.length;
    typingSpeed = 500;
  }
  setTimeout(typeRole, typingSpeed);
}

/* ===== COUNTER ANIMATIONS ===== */
let countersInitialized = false;

function initCounters() {
  if (countersInitialized) return;
  countersInitialized = true;
  document.querySelectorAll('[data-target]').forEach(el => {
    const target = parseInt(el.dataset.target);
    animateCounter(el, target, 2000);
  });
}

function animateCounter(element, target, duration) {
  const startTime = performance.now();
  function update(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    element.textContent = Math.floor(eased * target);
    if (progress < 1) requestAnimationFrame(update);
    else element.textContent = target;
  }
  requestAnimationFrame(update);
}

/* ===== SCROLL REVEAL ===== */
function revealOnScroll() {
  document.querySelectorAll('.reveal').forEach(el => {
    if (el.getBoundingClientRect().top < window.innerHeight - 120) {
      el.classList.add('visible');
    }
  });
}

/* ===== ACTIVE NAV + DOTS + PROGRESS ===== */
function updateActiveNav() {
  const sections = ['about', 'skills', 'journey', 'projects', 'terminal', 'testimonials', 'logs', 'contact'];
  const navLinks = document.querySelectorAll('.nav-link');
  let current = '';
  sections.forEach(id => {
    const section = document.getElementById(id);
    if (section && section.getBoundingClientRect().top <= 180) current = id;
  });
  navLinks.forEach(link => {
    link.classList.remove('active');
    link.removeAttribute('aria-current');
    if (link.dataset.section === current) {
      link.classList.add('active');
      link.setAttribute('aria-current', 'true');
    }
  });
  document.querySelectorAll('.side-dot').forEach(dot => {
    const s = dot.dataset.section;
    dot.classList.toggle('active', s === current || (current === '' && s === 'hero' && window.scrollY < 200));
  });
  const h = document.documentElement;
  const max = h.scrollHeight - h.clientHeight;
  const bar = document.getElementById('scrollProgress');
  if (bar) bar.style.width = `${max > 0 ? (window.scrollY / max) * 100 : 0}%`;
}

/* ===== MOBILE MENU ===== */
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const mobileMenu = document.getElementById('mobileMenu');
mobileMenuBtn.addEventListener('click', () => {
  mobileMenu.classList.toggle('open');
  mobileMenuBtn.classList.toggle('active');
});
document.querySelectorAll('.mobile-nav-link, .nav-link').forEach(link => {
  link.addEventListener('click', () => {
    mobileMenu.classList.remove('open');
    mobileMenuBtn.classList.remove('active');
  });
});

/* ===== TABS ===== */
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    const tabEl = document.getElementById(`tab-${btn.dataset.tab}`);
    if (tabEl) tabEl.classList.add('active');
  });
});

/* ===== ACCORDION ===== */
document.querySelectorAll('.accordion-header').forEach(header => {
  header.addEventListener('click', () => {
    const item = header.parentElement;
    const isOpen = item.classList.contains('open');
    document.querySelectorAll('.accordion-item').forEach(i => i.classList.remove('open'));
    if (!isOpen) item.classList.add('open');
  });
});

/* ===== SKILL FILTERS ===== */
const filterBtns = document.querySelectorAll('.filter-btn');
const skillCards = document.querySelectorAll('.skill-card');
filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const filter = btn.dataset.filter;
    skillCards.forEach(card => {
      if (filter === 'all' || card.dataset.category === filter) {
        card.style.display = '';
      } else {
        card.style.display = 'none';
      }
    });
  });
});

/* ===== PROJECT MODAL ===== */
const projectModal = document.getElementById('projectModal');
const modalClose = document.getElementById('modalClose');
const modalIcon = document.getElementById('modalIcon');
const modalTitle = document.getElementById('modalTitle');
const modalDesc = document.getElementById('modalDesc');
const modalTags = document.getElementById('modalTags');

const projectData = {
  'ai-interview': { icon: '🤖', title: 'AI-Interview-Platform', desc: 'AI-powered interview platform supporting voice, chat, and video interviews with intelligent candidate analysis and automated scoring.', tags: ['TypeScript', 'WebRTC', 'AI/ML', 'React'], code: 'https://github.com/Sush1271/AI-Interview-Platform-' },
  'dope-lucy': { icon: '🎮', title: 'Dope-lucy', desc: 'QML interactive project with dynamic UI components and fluid animations.', tags: ['QML', 'Qt', 'JavaScript'], code: 'https://github.com/Sush1271/Dope-lucy' },
  'rentalx': { icon: '🚗', title: 'RentalX', desc: 'Full-stack car rental platform with vehicle browsing, booking, map integration, and authentication.', tags: ['PHP', 'MySQL', 'Maps API', 'Auth'], code: 'https://github.com/Sush1271/RentalX' },
  'saveit': { icon: '☁️', title: 'SaveIT', desc: 'Self-hosted cloud file storage platform inspired by Google Drive with real-time sync.', tags: ['TypeScript', 'Cloud', 'Real-time Sync'], code: 'https://github.com/Sush1271/SaveIT' }
};

document.querySelectorAll('.project-detail-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const data = projectData[btn.dataset.project];
    if (!data) return;
    modalIcon.textContent = data.icon;
    modalTitle.textContent = data.title;
    modalDesc.textContent = data.desc;
    modalTags.innerHTML = data.tags.map(t => `<span class="modal-tag">${t}</span>`).join('');
    const mf = projectModal.querySelector('.modal-footer');
    if (mf) mf.style.display = '';
    const codeBtn = document.getElementById('modalCode');
    if (codeBtn && data.code) codeBtn.href = data.code;
    const copyBtn = document.getElementById('modalCopy');
    if (copyBtn && data.code) copyBtn.dataset.copy = data.code;
    projectModal.classList.add('open');
    document.body.style.overflow = 'hidden';
  });
});

function closeModal() {
  projectModal.classList.remove('open');
  document.body.style.overflow = '';
}
modalClose.addEventListener('click', closeModal);
projectModal.addEventListener('click', (e) => { if (e.target === projectModal) closeModal(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

/* ===== TOOLTIP ===== */
const tooltipEl = document.getElementById('tooltip');
document.addEventListener('mouseover', (e) => {
  const tip = e.target.dataset.tooltip;
  if (tip) {
    tooltipEl.textContent = tip;
    tooltipEl.classList.add('visible');
    tooltipEl.style.left = `${e.clientX + 12}px`;
    tooltipEl.style.top = `${e.clientY - 35}px`;
  }
});
document.addEventListener('mousemove', (e) => {
  if (tooltipEl.classList.contains('visible')) {
    tooltipEl.style.left = `${e.clientX + 12}px`;
    tooltipEl.style.top = `${e.clientY - 35}px`;
  }
});
document.addEventListener('mouseout', (e) => {
  if (e.target.dataset.tooltip) tooltipEl.classList.remove('visible');
});

/* ===== PLACEHOLDER LINKS ===== */
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href="#"]');
  if (!a) return;
  e.preventDefault();
  showToast('Coming soon — find me on GitHub meanwhile', 'info', 'fa-hourglass-half');
});

/* ===== SCROLL TO TOP ===== */
const scrollTopBtn = document.getElementById('scrollTopBtn');
window.addEventListener('scroll', () => {
  scrollTopBtn.classList.toggle('visible', window.scrollY > 400);
  updateActiveNav();
});
scrollTopBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

/* ===== PARALLAX (throttled) ===== */
let parallaxRaf = null;
document.addEventListener('mousemove', (e) => {
  if (parallaxRaf) return;
  parallaxRaf = requestAnimationFrame(() => {
    const mx = e.clientX / window.innerWidth - 0.5;
    const my = e.clientY / window.innerHeight - 0.5;
    const heroContent = document.getElementById('heroContent');
    const heroVisual = document.querySelector('.hero-visual');
    if (heroContent) heroContent.style.transform = `translate(${mx * 6}px, ${my * 6}px)`;
    if (heroVisual) heroVisual.style.transform = `translate(${mx * -12}px, ${my * -12}px)`;
    parallaxRaf = null;
  });
});

/* ===== RESIZE ===== */
window.addEventListener('resize', () => {
  resizeParticleCanvas();
  if (renderer && camera) {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
});

/* ===== TOASTS ===== */
function showToast(msg, type = 'info', icon = null) {
  const box = document.getElementById('toasts');
  if (!box) return;
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  const ic = icon || (type === 'success' ? 'fa-circle-check' : type === 'error' ? 'fa-triangle-exclamation' : 'fa-circle-info');
  el.innerHTML = `<i class="fa-solid ${ic}"></i><span></span>`;
  el.querySelector('span').textContent = msg;
  box.appendChild(el);
  while (box.children.length > 3) box.firstChild.remove();
  setTimeout(() => {
    el.classList.add('out');
    setTimeout(() => el.remove(), 260);
  }, 3400);
}

/* ===== COPY TO CLIPBOARD ===== */
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (e) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
    ta.remove();
    return ok;
  }
}
document.addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-copy]');
  if (!btn) return;
  e.preventDefault();
  const ok = await copyText(btn.dataset.copy);
  showToast(ok ? `Copied: ${btn.dataset.copy}` : 'Copy failed — long-press to copy', ok ? 'success' : 'error', 'fa-copy');
});

/* ===== THEME + SETTINGS ===== */
const THEMES = ['nebula', 'solar', 'matrix'];
function applyTheme(name, announce = true) {
  if (!THEMES.includes(name)) name = 'nebula';
  document.documentElement.dataset.theme = name;
  try { localStorage.setItem('sush-theme', name); } catch (e) {}
  document.querySelectorAll('.theme-dot').forEach(d => d.classList.toggle('active', d.dataset.setTheme === name));
  if (announce) showToast(`Theme switched: ${name}`, 'info', 'fa-palette');
}
function cycleTheme() {
  const cur = document.documentElement.dataset.theme || 'nebula';
  applyTheme(THEMES[(THEMES.indexOf(cur) + 1) % THEMES.length]);
}
function setThree(on, silent = false) {
  window.__no3d = !on;
  const c = document.getElementById('three-container');
  if (c) c.style.display = on ? '' : 'none';
  try { localStorage.setItem('sush-3d', on ? 'on' : 'off'); } catch (e) {}
  if (!silent) showToast(on ? '3D scene enabled' : '3D scene disabled', 'info', 'fa-cube');
}
function setParticles(on, silent = false) {
  window.__noParticles = !on;
  const c = document.getElementById('particles');
  if (c) c.style.display = on ? '' : 'none';
  if (on) startParticles();
  try { localStorage.setItem('sush-particles', on ? 'on' : 'off'); } catch (e) {}
  if (!silent) showToast(on ? 'Particles enabled' : 'Particles disabled', 'info', 'fa-sparkles');
}
function setMotion(on, silent = false) {
  document.documentElement.classList.toggle('reduce-motion', on);
  try { localStorage.setItem('sush-motion', on ? 'on' : 'off'); } catch (e) {}
  if (!silent) showToast(on ? 'Reduce motion: on' : 'Reduce motion: off', 'info', 'fa-person-walking');
}
function loadPrefs() {
  let t = 'nebula', d3 = true, p = true, m = false;
  try {
    t = localStorage.getItem('sush-theme') || 'nebula';
    d3 = localStorage.getItem('sush-3d') !== 'off';
    p = localStorage.getItem('sush-particles') !== 'off';
    m = localStorage.getItem('sush-motion') === 'on';
  } catch (e) {}
  applyTheme(t, false);
  setThree(d3, true);
  setParticles(p, true);
  setMotion(m, true);
  const s3 = document.getElementById('set3d');
  const sp = document.getElementById('setParticles');
  const sm = document.getElementById('setMotion');
  if (s3) s3.checked = d3;
  if (sp) sp.checked = p;
  if (sm) sm.checked = m;
}

function openSettings() {
  document.getElementById('settingsOverlay').classList.add('open');
  document.getElementById('settingsPanel').classList.add('open');
}
function closeSettings() {
  document.getElementById('settingsOverlay').classList.remove('open');
  document.getElementById('settingsPanel').classList.remove('open');
}
document.getElementById('settingsBtn').addEventListener('click', openSettings);
document.getElementById('settingsClose').addEventListener('click', closeSettings);
document.getElementById('settingsOverlay').addEventListener('click', closeSettings);
document.getElementById('set3d').addEventListener('change', (e) => setThree(e.target.checked));
document.getElementById('setParticles').addEventListener('change', (e) => setParticles(e.target.checked));
document.getElementById('setMotion').addEventListener('change', (e) => setMotion(e.target.checked));
document.querySelectorAll('.theme-dot').forEach(d => d.addEventListener('click', () => applyTheme(d.dataset.setTheme)));
document.getElementById('settingsReset').addEventListener('click', () => {
  try { ['sush-theme', 'sush-3d', 'sush-particles', 'sush-motion'].forEach(k => localStorage.removeItem(k)); } catch (e) {}
  loadPrefs();
  showToast('Settings reset to defaults', 'success', 'fa-rotate-left');
});

/* ===== SCROLL HELPERS ===== */
function scrollToId(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: document.documentElement.classList.contains('reduce-motion') ? 'auto' : 'smooth', block: 'start' });
}
document.querySelectorAll('.side-dot').forEach(dot => {
  dot.addEventListener('click', () => scrollToId(dot.dataset.section));
});

/* ===== COMMAND PALETTE ===== */
const paletteOverlay = document.getElementById('paletteOverlay');
const paletteInput = document.getElementById('paletteInput');
const paletteList = document.getElementById('paletteList');
let palIndex = 0;
let palFiltered = [];

function sectionAction(id, label) {
  return { icon: 'fa-arrow-right', label: `Go to ${label}`, hint: 'navigate', run: () => scrollToId(id) };
}
const PALETTE_ACTIONS = [
  sectionAction('hero', 'Top'),
  sectionAction('about', 'About'),
  sectionAction('skills', 'Skills'),
  sectionAction('journey', 'Journey'),
  sectionAction('projects', 'Projects'),
  sectionAction('terminal', 'Terminal'),
  sectionAction('logs', 'Logs'),
  sectionAction('contact', 'Contact'),
  { icon: 'fa-terminal', label: 'Open terminal + run help', hint: 'terminal', run: () => { scrollToId('terminal'); setTimeout(() => runTermCommand('help'), 600); } },
  { icon: 'fa-palette', label: 'Theme: Nebula cyan', hint: 'theme', run: () => applyTheme('nebula') },
  { icon: 'fa-palette', label: 'Theme: Solar amber', hint: 'theme', run: () => applyTheme('solar') },
  { icon: 'fa-palette', label: 'Theme: Matrix green', hint: 'theme', run: () => applyTheme('matrix') },
  { icon: 'fa-cube', label: 'Toggle 3D scene', hint: 'display', run: () => { const on = !!window.__no3d; setThree(on); document.getElementById('set3d').checked = on; } },
  { icon: 'fa-sparkles', label: 'Toggle particles', hint: 'display', run: () => { const on = !!window.__noParticles; setParticles(on); document.getElementById('setParticles').checked = on; } },
  { icon: 'fa-copy', label: 'Copy email address', hint: 'contact', run: async () => { const ok = await copyText('hello@sush.fun'); showToast(ok ? 'Copied: hello@sush.fun' : 'Copy failed', ok ? 'success' : 'error', 'fa-copy'); } },
  { icon: 'fa-rocket', label: 'View project: AI-Interview-Platform', hint: 'project', run: () => openProjectModal('ai-interview') },
  { icon: 'fa-gamepad', label: 'View project: Dope-lucy', hint: 'project', run: () => openProjectModal('dope-lucy') },
  { icon: 'fa-car', label: 'View project: RentalX', hint: 'project', run: () => openProjectModal('rentalx') },
  { icon: 'fa-cloud', label: 'View project: SaveIT', hint: 'project', run: () => openProjectModal('saveit') },
  { icon: 'fa-book-open', label: 'Read log: RentalX lessons', hint: 'log', run: () => openLogModal('rentalx-lessons') },
  { icon: 'fa-book-open', label: 'Read log: Self-hosting SaveIT', hint: 'log', run: () => openLogModal('selfhost-saveit') },
  { icon: 'fa-book-open', label: 'Read log: WebRTC pitfalls', hint: 'log', run: () => openLogModal('webrtc-pitfalls') },
  { icon: 'fa-arrow-up', label: 'Back to top', hint: 'navigate', run: () => window.scrollTo({ top: 0, behavior: 'smooth' }) },
];
function openProjectModal(key) {
  const data = projectData[key];
  if (!data) return;
  modalIcon.textContent = data.icon;
  modalTitle.textContent = data.title;
  modalDesc.textContent = data.desc;
  modalTags.innerHTML = data.tags.map(t => `<span class="modal-tag">${t}</span>`).join('');
  const codeBtn = document.getElementById('modalCode');
  if (codeBtn && data.code) codeBtn.href = data.code;
  const copyBtn = document.getElementById('modalCopy');
  if (copyBtn && data.code) copyBtn.dataset.copy = data.code;
  const mf = projectModal.querySelector('.modal-footer');
  if (mf) mf.style.display = '';
  projectModal.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function openPalette() {
  paletteOverlay.classList.add('open');
  paletteInput.value = '';
  renderPalette('');
  setTimeout(() => paletteInput.focus(), 60);
}
function closePalette() {
  paletteOverlay.classList.remove('open');
}
function renderPalette(q) {
  const query = q.trim().toLowerCase();
  palFiltered = PALETTE_ACTIONS.filter(a => !query || a.label.toLowerCase().includes(query) || a.hint.includes(query)).slice(0, 9);
  palIndex = 0;
  paletteList.innerHTML = '';
  if (!palFiltered.length) {
    paletteList.innerHTML = '<div style="padding:1rem;text-align:center;color:#475569;font-size:0.82rem">No matching commands</div>';
    return;
  }
  palFiltered.forEach((a, i) => {
    const b = document.createElement('button');
    b.className = 'palette-item' + (i === 0 ? ' selected' : '');
    b.setAttribute('role', 'option');
    b.innerHTML = `<i class="fa-solid ${a.icon}"></i><span></span><small></small>`;
    b.querySelector('span').textContent = a.label;
    b.querySelector('small').textContent = a.hint;
    b.addEventListener('click', () => { closePalette(); a.run(); });
    b.addEventListener('mousemove', () => {
      palIndex = i;
      paletteList.querySelectorAll('.palette-item').forEach((el, j) => el.classList.toggle('selected', j === i));
    });
    paletteList.appendChild(b);
  });
}
function movePalette(dir) {
  if (!palFiltered.length) return;
  palIndex = (palIndex + dir + palFiltered.length) % palFiltered.length;
  paletteList.querySelectorAll('.palette-item').forEach((el, j) => {
    el.classList.toggle('selected', j === palIndex);
    if (j === palIndex) el.scrollIntoView({ block: 'nearest' });
  });
}
document.getElementById('paletteBtn').addEventListener('click', openPalette);
document.getElementById('openPaletteBtn').addEventListener('click', openPalette);
paletteInput.addEventListener('input', () => renderPalette(paletteInput.value));
paletteInput.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowDown') { e.preventDefault(); movePalette(1); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); movePalette(-1); }
  else if (e.key === 'Enter' && palFiltered[palIndex]) { closePalette(); palFiltered[palIndex].run(); }
});
paletteOverlay.addEventListener('click', (e) => { if (e.target === paletteOverlay) closePalette(); });

document.addEventListener('keydown', (e) => {
  const tag = (document.activeElement && document.activeElement.tagName) || '';
  const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(tag) || (document.activeElement && document.activeElement.isContentEditable);
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); paletteOverlay.classList.contains('open') ? closePalette() : openPalette(); return; }
  if (e.key === 'Escape') { closePalette(); closeSettings(); return; }
  if (typing) return;
  if (e.key === '/') { e.preventDefault(); scrollToId('projects'); setTimeout(() => { const s = document.getElementById('projectSearch'); if (s) s.focus(); }, 450); }
  else if (e.key.toLowerCase() === 't') { cycleTheme(); }
});

/* ===== PROJECT SEARCH + SORT ===== */
const projectSearch = document.getElementById('projectSearch');
const projectSort = document.getElementById('projectSort');
const projectCount = document.getElementById('projectCount');
function applyProjectFilter() {
  const q = (projectSearch.value || '').trim().toLowerCase();
  const cards = Array.from(document.querySelectorAll('#projects .project-card'));
  let visible = 0;
  cards.forEach(card => {
    const text = card.textContent.toLowerCase();
    const show = !q || text.includes(q);
    card.style.display = show ? '' : 'none';
    if (show) visible++;
  });
  if (projectSort.value === 'az') {
    const grid = document.querySelector('#projects .projects-grid');
    cards.sort((a, b) => a.querySelector('h3').textContent.localeCompare(b.querySelector('h3').textContent))
      .forEach(c => grid.appendChild(c));
  } else {
    const grid = document.querySelector('#projects .projects-grid');
    cards.sort((a, b) => (a.dataset.order || 0) - (b.dataset.order || 0))
      .forEach(c => grid.appendChild(c));
  }
  if (projectCount) projectCount.textContent = `${visible} of ${cards.length} shown`;
}
if (projectSearch) projectSearch.addEventListener('input', applyProjectFilter);
if (projectSort) projectSort.addEventListener('change', applyProjectFilter);

/* ===== TERMINAL ===== */
const termBody = document.getElementById('termBody');
const termInput = document.getElementById('termInput');
function termPrint(text, cls = '') {
  const div = document.createElement('div');
  if (cls) div.className = cls;
  div.textContent = text;
  termBody.appendChild(div);
  termBody.scrollTop = termBody.scrollHeight;
}
function runTermCommand(raw) {
  const cmd = raw.trim();
  if (!cmd) return;
  termPrint(`➜ ~ ${cmd}`, 't-in');
  const [base, ...rest] = cmd.toLowerCase().split(/\s+/);
  const arg = rest.join(' ');
  switch (base) {
    case 'help':
      termPrint('commands: about · skills · projects · contact · whoami · date · theme [nebula|solar|matrix] · clear', 't-ok');
      break;
    case 'about':
      termPrint('Sushant — Full Stack Developer on Arch Linux. React/Next.js, Node/Python, Docker/AWS.', '');
      break;
    case 'skills':
      termPrint('frontend: react next.js typescript tailwind · backend: node python go · devops: docker aws', '');
      break;
    case 'projects':
      termPrint('ai-interview · dope-lucy · rentalx · saveit — scroll to #projects or run: open <name>', '');
      break;
    case 'open': {
      const map = { 'ai-interview': 'ai-interview', ai: 'ai-interview', lucy: 'dope-lucy', dope: 'dope-lucy', rentalx: 'rentalx', rental: 'rentalx', saveit: 'saveit', save: 'saveit' };
      const key = map[arg];
      if (key) { termPrint(`opening ${key}...`, 't-ok'); openProjectModal(key); }
      else termPrint(`unknown project: ${arg || '(none)'}. try: open rentalx`, 't-warn');
      break;
    }
    case 'contact':
      termPrint('github.com/Sush1271 · sush.fun · hello@sush.fun', 't-ok');
      break;
    case 'whoami':
      termPrint('guest-explorer (but you can call yourself crew)', '');
      break;
    case 'date':
      termPrint(new Date().toString(), 't-dim');
      break;
    case 'theme':
      if (THEMES.includes(arg)) { applyTheme(arg); termPrint(`theme → ${arg}`, 't-ok'); }
      else termPrint(`usage: theme [${THEMES.join('|')}]`, 't-warn');
      break;
    case 'clear':
      termBody.innerHTML = '';
      break;
    case 'sudo':
      termPrint('nice try. this ship runs on trust, not root.', 't-warn');
      break;
    default:
      termPrint(`command not found: ${base} — try 'help'`, 't-warn');
  }
}
if (termInput) {
  termInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { runTermCommand(termInput.value); termInput.value = ''; }
  });
  document.querySelectorAll('.term-chip').forEach(ch => {
    ch.addEventListener('click', () => { runTermCommand(ch.dataset.term); termInput.focus(); });
  });
}
let termBooted = false;
const termObserver = new IntersectionObserver((entries) => {
  if (entries[0].isIntersecting && !termBooted) {
    termBooted = true;
    termPrint('sushOS v2.6 — ship systems nominal.', 't-ok');
    termPrint("type 'help' to explore. try: theme solar", 't-dim');
  }
}, { threshold: 0.3 });
if (document.getElementById('terminal')) termObserver.observe(document.getElementById('terminal'));
document.getElementById('openTerminalBtn').addEventListener('click', () => {
  scrollToId('terminal');
  setTimeout(() => termInput.focus(), 550);
});

/* ===== TESTIMONIAL SLIDER ===== */
const testiSlides = document.getElementById('testiSlides');
const testiDotsBox = document.getElementById('testiDots');
let testiIndex = 0;
let testiTimer = null;
function testiShow(i) {
  const n = testiSlides.children.length;
  testiIndex = (i + n) % n;
  testiSlides.style.transform = `translateX(-${testiIndex * 100}%)`;
  testiDotsBox.querySelectorAll('.testi-dot').forEach((d, j) => d.classList.toggle('active', j === testiIndex));
}
function testiAuto() {
  clearInterval(testiTimer);
  testiTimer = setInterval(() => testiShow(testiIndex + 1), 6500);
}
if (testiSlides) {
  Array.from(testiSlides.children).forEach((_, j) => {
    const d = document.createElement('button');
    d.className = 'testi-dot' + (j === 0 ? ' active' : '');
    d.setAttribute('aria-label', `Go to testimonial ${j + 1}`);
    d.addEventListener('click', () => { testiShow(j); testiAuto(); });
    testiDotsBox.appendChild(d);
  });
  document.getElementById('testiPrev').addEventListener('click', () => { testiShow(testiIndex - 1); testiAuto(); });
  document.getElementById('testiNext').addEventListener('click', () => { testiShow(testiIndex + 1); testiAuto(); });
  const wrap = testiSlides.closest('.testi-wrap');
  wrap.addEventListener('mouseenter', () => clearInterval(testiTimer));
  wrap.addEventListener('mouseleave', testiAuto);
  testiAuto();
}

/* ===== LOGS MODAL ===== */
const logData = {
  'rentalx-lessons': { icon: '🚗', title: 'Shipping RentalX: what PHP + Maps taught me', desc: 'Booking flows look simple until timezones, double-bookings and map quotas show up. The biggest lesson: validate on the server, never trust the client clock, and cache map tiles aggressively. I added idempotency keys to bookings after one user double-clicked their way into two cars. Demo day survived with zero crashes — and a checklist I still reuse on every full-stack project.', tags: ['Full-stack', 'PHP', 'Maps'] },
  'selfhost-saveit': { icon: '☁️', title: 'Self-hosting SaveIT on a budget VPS', desc: 'One $6 VPS, Docker Compose, Cloudflare tunnels and nightly encrypted backups. The stack: TypeScript API, object storage on disk with checksums, and a firewall rule that once locked me out at midnight (always keep a console session open). Total running cost stays under a coffee a month — self-hosting is a superpower for side projects.', tags: ['DevOps', 'Docker', 'Self-hosted'] },
  'webrtc-pitfalls': { icon: '🤖', title: 'AI interviews: 5 WebRTC pitfalls to avoid', desc: 'Echo cancellation, TURN servers for symmetric NATs, device permission UX, reconnect logic, and never trusting the happy path with real microphones. My rule now: test on hotel wifi, not fiber. The AI analysis layer was the easy part — reliable real-time media is where interviews are won or lost.', tags: ['AI', 'WebRTC', 'Realtime'] }
};
function openLogModal(key) {
  const data = logData[key];
  if (!data) return;
  modalIcon.textContent = data.icon;
  modalTitle.textContent = data.title;
  modalDesc.textContent = data.desc;
  modalTags.innerHTML = data.tags.map(t => `<span class="modal-tag">${t}</span>`).join('');
  const mf = projectModal.querySelector('.modal-footer');
  if (mf) mf.style.display = 'none';
  projectModal.classList.add('open');
  document.body.style.overflow = 'hidden';
}
document.querySelectorAll('.log-card').forEach(card => {
  const open = () => openLogModal(card.dataset.log);
  card.addEventListener('click', open);
  card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
});

/* ===== CONTACT FORM ===== */
const contactForm = document.getElementById('contactForm');
if (contactForm) {
  const setErr = (name, msg) => {
    const field = contactForm.querySelector(`[data-field="${name}"]`);
    field.classList.toggle('invalid', !!msg);
    field.querySelector('.form-err').textContent = msg || '';
  };
  contactForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('cfName').value.trim();
    const email = document.getElementById('cfEmail').value.trim();
    const message = document.getElementById('cfMsg').value.trim();
    let ok = true;
    if (name.length < 2) { setErr('name', 'Please enter your name'); ok = false; } else setErr('name', '');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setErr('email', 'Enter a valid email'); ok = false; } else setErr('email', '');
    if (message.length < 10) { setErr('message', 'Tell me a little more (10+ chars)'); ok = false; } else setErr('message', '');
    if (!ok) { showToast('Please fix the highlighted fields', 'error', 'fa-triangle-exclamation'); return; }
    const btn = document.getElementById('cfSend');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Transmitting...';
    setTimeout(() => {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Transmit message';
      contactForm.reset();
      showToast(`Message transmitted. Thanks ${name.split(' ')[0]} — I'll reply soon.`, 'success', 'fa-paper-plane');
    }, 900);
  });
  ['cfName', 'cfEmail', 'cfMsg'].forEach(id => {
    document.getElementById(id).addEventListener('input', (e) => {
      e.target.closest('.form-field').classList.remove('invalid');
    });
  });
}

/* ===== ARSENAL MARQUEE (DUAL TRACK, JS-DRIVEN) ===== */
const TECH_INFO = {
  'React': 'component UI library — my daily driver',
  'TypeScript': 'types that save me at 2am',
  'Next.js': 'React framework for production',
  'Node.js': 'APIs and microservices',
  'Tailwind': 'utility-first styling',
  'AWS': 'cloud home base',
  'Python': 'scripting, APIs and AI glue',
  'Docker': 'ships anywhere',
  'PostgreSQL': 'relational workhorse',
  'Go': 'fast, tiny binaries',
  'Linux': 'home turf — btw I use Arch',
  'AI/ML': 'current obsession',
};
// Clone each row's content for a seamless loop (clones stay out of tab order)
document.querySelectorAll('.marquee-track').forEach(track => {
  const orig = track.querySelector('span');
  if (!orig || track.querySelectorAll('span').length > 1) return;
  const clone = orig.cloneNode(true);
  clone.setAttribute('aria-hidden', 'true');
  clone.querySelectorAll('button').forEach(b => { b.tabIndex = -1; });
  track.appendChild(clone);
});
const marqueeTracks = Array.from(document.querySelectorAll('.marquee-track')).map(el => ({
  el, x: 0, ready: false, hover: false,
  dir: parseFloat(el.dataset.dir || '1'),
  speed: parseFloat(el.dataset.speed || '65'),
}));
let marqueeLast = 0;
let marqueesVisible = true;
function marqueeStep(t) {
  requestAnimationFrame(marqueeStep);
  if (!marqueeTracks.length) return;
  const calm = document.documentElement.classList.contains('reduce-motion');
  if (document.hidden || calm) { marqueeLast = t; return; }
  if (!marqueeLast) marqueeLast = t;
  const dt = Math.min((t - marqueeLast) / 1000, 0.05);
  marqueeLast = t;
  if (!marqueesVisible) return;
  marqueeTracks.forEach(m => {
    if (m.hover) return;
    const half = m.el.scrollWidth / 2;
    if (half <= 0) return;
    if (!m.ready) { m.ready = true; if (m.dir < 0) m.x = -half; }
    m.x += m.dir * m.speed * dt;
    if (m.dir > 0) { if (-m.x >= half) m.x += half; }
    else if (m.x >= 0) { m.x -= half; }
    m.el.style.transform = `translateX(${m.x}px)`;
  });
}
document.querySelectorAll('.marquee').forEach(box => {
  const track = marqueeTracks.find(m => m.el.parentElement === box);
  box.addEventListener('mouseenter', () => { if (track) track.hover = true; });
  box.addEventListener('mouseleave', () => { if (track) track.hover = false; });
});
const arsenalBox = document.querySelector('.arsenal');
if (arsenalBox) {
  new IntersectionObserver((entries) => { marqueesVisible = entries[0].isIntersecting; }, { threshold: 0 }).observe(arsenalBox);
}
if (marqueeTracks.length) requestAnimationFrame(marqueeStep);
document.addEventListener('click', (e) => {
  const t = e.target.closest('.tick');
  if (!t || t.tabIndex === -1) return;
  const name = t.dataset.tech;
  showToast(`${name} — ${TECH_INFO[name] || 'in the arsenal'}`, 'info', 'fa-microchip');
});

/* ===== PREFS BOOT ===== */
loadPrefs();
applyProjectFilter();

/* ===== INIT ===== */
window.addEventListener('load', () => {
  resizeParticleCanvas();
  initParticles();
  const pCanvasEl = document.getElementById('particles');
  if (pCanvasEl) pCanvasObserver.observe(pCanvasEl);
  startParticles();
  milestone(70, 'Particles seeded.');
  initThree().then(() => {
    const online = !!document.querySelector('#three-container canvas');
    milestone(86, online ? '3D engine online.' : '3D offline — 2D fallback.');
    milestone(100, 'All systems nominal. Welcome aboard.');
  });
  runLoader();
});

window.addEventListener('scroll', revealOnScroll);
setTimeout(revealOnScroll, 300);