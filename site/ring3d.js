import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

/**
 * MARCELY SEMIJOIAS -- HIGH JEWELRY 3D INTERACTIVE ENGINE (ring3d.js)
 * Cartier / Tiffany Studio Box PBR Lighting, Live Ouro 18k <-> Rodio Nobre Morph,
 * 57-Facet 5A Zirconia Optical Dispersion, 360-deg Inertia Orbit & 4 Inspection Presets.
 */

const GLB_URL = './assets/models/marcely_ring.glb';

const METAL_PALETTE = {
  gold: {
    color: new THREE.Color('#ECC46A'),
    keyColor: new THREE.Color('#FFF3DC'),
    rimColor: new THREE.Color('#DCE8F8'),
    dustColor: new THREE.Color('#F2D58A'),
    label: 'Ouro 18k (10 milésimos)',
    shortLabel: 'Ouro 18k',
  },
  rhodium: {
    color: new THREE.Color('#DCE3EC'),
    keyColor: new THREE.Color('#F5F8FD'),
    rimColor: new THREE.Color('#CFE0F5'),
    dustColor: new THREE.Color('#DFE8F4'),
    label: 'Ródio Nobre Hipoalergênico',
    shortLabel: 'Ródio Nobre',
  },
};

const CAMERA_PRESETS = {
  hero: {
    pos: new THREE.Vector3(0.0, 1.12, 4.72),
    lookAt: new THREE.Vector3(0.0, 0.04, 0.0),
    yaw: 0.48,
    pitch: 0.22,
    fov: 32,
    autoSpin: 0.24,
  },
  halo: {
    pos: new THREE.Vector3(0.0, 2.88, 2.18),
    lookAt: new THREE.Vector3(0.0, 0.48, 0.0),
    yaw: 0.16,
    pitch: 0.34,
    fov: 30,
    autoSpin: 0.14,
  },
  gallery: {
    pos: new THREE.Vector3(0.0, 0.48, 3.45),
    lookAt: new THREE.Vector3(0.0, 0.22, 0.0),
    yaw: 1.54,
    pitch: 0.06,
    fov: 29,
    autoSpin: 0.12,
  },
  pave: {
    pos: new THREE.Vector3(0.42, 0.96, 3.32),
    lookAt: new THREE.Vector3(0.14, 0.14, 0.0),
    yaw: -0.78,
    pitch: 0.24,
    fov: 29,
    autoSpin: 0.15,
  },
};

let sharedGlbPromise = null;
let activeController = null;

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function clamp01(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function loadSharedRingGLB() {
  if (!sharedGlbPromise) {
    sharedGlbPromise = new Promise((resolve, reject) => {
      const loader = new GLTFLoader();
      loader.load(
        GLB_URL,
        (gltf) => resolve(gltf),
        undefined,
        (err) => {
          sharedGlbPromise = null;
          reject(err);
        }
      );
    });
  }
  return sharedGlbPromise;
}

function createContactShadowMesh(width = 3.2, depth = 3.2) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, 256, 256);
    const g = ctx.createRadialGradient(128, 128, 12, 128, 128, 120);
    g.addColorStop(0.0, 'rgba(4, 3, 2, 0.68)');
    g.addColorStop(0.35, 'rgba(6, 5, 4, 0.42)');
    g.addColorStop(0.68, 'rgba(8, 6, 4, 0.14)');
    g.addColorStop(1.0, 'rgba(8, 6, 4, 0.0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const geo = new THREE.PlaneGeometry(width, depth);
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    opacity: 0.78,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI * 0.5;
  mesh.position.set(0, -1.18, 0);
  return mesh;
}

function createSparkleDustTexture() {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext('2d');
  if (ctx) {
    const g = ctx.createRadialGradient(32, 32, 1, 32, 32, 30);
    g.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
    g.addColorStop(0.28, 'rgba(255, 248, 224, 0.72)');
    g.addColorStop(0.65, 'rgba(240, 214, 152, 0.18)');
    g.addColorStop(1.0, 'rgba(240, 214, 152, 0.0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function isGemMaterial(matName, meshName) {
  const m = (matName || '').toLowerCase();
  const n = (meshName || '').toLowerCase();
  if (m.includes('zirconia') || m.includes('gem') || m.includes('diamond') || m.includes('crystal')) {
    return true;
  }
  if (!m.includes('gold') && !m.includes('metal') && !m.includes('rhodium')) {
    if (n.includes('zirconia') || n.includes('gem') || n.includes('diamond') || n.includes('stone')) {
      return true;
    }
  }
  return false;
}

function isMetalMaterial(matName, meshName) {
  const m = (matName || '').toLowerCase();
  const n = (meshName || '').toLowerCase();
  return (
    m.includes('gold') ||
    m.includes('metal') ||
    m.includes('rhodium') ||
    m.includes('rodio') ||
    n.includes('band') ||
    n.includes('shank') ||
    n.includes('prong') ||
    n.includes('gallery') ||
    n.includes('ring')
  );
}

function upgradeJewelryMaterial(sourceMat, meshName, metalColor, metalRegistry) {
  const matName = (sourceMat && sourceMat.name) || '';

  if (isGemMaterial(matName, meshName)) {
    return new THREE.MeshPhysicalMaterial({
      name: matName || 'Zirconia_5A_Gem',
      color: new THREE.Color(0xffffff),
      metalness: 0.08,
      roughness: 0.02,
      ior: 2.418,
      reflectivity: 1.0,
      transmission: 0.72,
      thickness: 0.6,
      clearcoat: 1.0,
      clearcoatRoughness: 0.0,
      envMapIntensity: 3.2,
      flatShading: true,
      specularIntensity: 1.0,
      specularColor: new THREE.Color(0xffffff),
    });
  }

  if (isMetalMaterial(matName, meshName) || sourceMat) {
    const upgraded = new THREE.MeshPhysicalMaterial({
      name: matName || 'Gold_18k_Metal',
      color: metalColor.clone(),
      metalness: 1.0,
      roughness: 0.11,
      clearcoat: 0.45,
      clearcoatRoughness: 0.05,
      envMapIntensity: 2.2,
      reflectivity: 1.0,
    });
    metalRegistry.push(upgraded);
    return upgraded;
  }

  return sourceMat;
}

export function createMarcelyRing3D({ canvas, stageEl } = {}) {
  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let activeMetal = 'gold';
  let activePreset = 'hero';
  let modelReady = false;
  let disposed = false;

  const fallbackApi = {
    setMetal(metal) {
      activeMetal = metal === 'rhodium' ? 'rhodium' : 'gold';
      syncDomControls(activeMetal, activePreset);
    },
    setPreset(preset) {
      if (CAMERA_PRESETS[preset]) activePreset = preset;
      syncDomControls(activeMetal, activePreset);
    },
    getMetal: () => activeMetal,
    getPreset: () => activePreset,
    forceSync() {},
    isReady: () => false,
    remount: () => mountMarcelyRing3D(),
    dispose() {},
  };

  if (!canvas) {
    return fallbackApi;
  }

  let renderer = null;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
  } catch (err) {
    console.warn('[MarcelyRing3D] WebGL unavailable:', err);
    return fallbackApi;
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();

  // Jewelry Studio Box Environment (PMREM + RoomEnvironment)
  const pmrem = new THREE.PMREMGenerator(renderer);
  const roomEnv = new RoomEnvironment();
  const envTex = pmrem.fromScene(roomEnv, 0.035).texture;
  roomEnv.dispose();
  pmrem.dispose();
  scene.environment = envTex;
  scene.environmentIntensity = 1.0;

  const camera = new THREE.PerspectiveCamera(32, 1.2, 0.1, 60);
  const currentCamPos = CAMERA_PRESETS.hero.pos.clone();
  const targetCamPos = CAMERA_PRESETS.hero.pos.clone();
  const currentLookAt = CAMERA_PRESETS.hero.lookAt.clone();
  const targetLookAt = CAMERA_PRESETS.hero.lookAt.clone();
  let currentFov = CAMERA_PRESETS.hero.fov;
  let targetFov = CAMERA_PRESETS.hero.fov;

  camera.position.copy(currentCamPos);
  camera.lookAt(currentLookAt);

  // 4 Calibrated Jewelry Studio Box Lights
  const keyLight = new THREE.DirectionalLight(0xfff3dc, 2.35);
  keyLight.position.set(4.2, 6.4, 5.2);
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(0xdce8f8, 1.95);
  rimLight.position.set(-4.5, 4.2, -4.8);
  scene.add(rimLight);

  const sparklePointLight = new THREE.PointLight(0xffffff, 3.8, 18, 1.45);
  sparklePointLight.position.set(0.65, 3.8, 2.1);
  scene.add(sparklePointLight);

  const fillLight = new THREE.DirectionalLight(0xf8ebd8, 0.95);
  fillLight.position.set(-4.6, 1.8, 3.8);
  scene.add(fillLight);

  const hemiLight = new THREE.HemisphereLight(0xfff9ee, 0x1d1610, 0.34);
  scene.add(hemiLight);

  // Ring hierarchy: orbitGroup -> modelHolder -> normalized GLB
  const orbitGroup = new THREE.Group();
  scene.add(orbitGroup);

  const modelHolder = new THREE.Group();
  orbitGroup.add(modelHolder);

  const contactShadow = createContactShadowMesh(3.25, 3.25);
  scene.add(contactShadow);

  // Subtle floating golden/crystalline microparticulates
  const DUST_COUNT = 46;
  const dustBasePositions = new Float32Array(DUST_COUNT * 3);
  const dustPositions = new Float32Array(DUST_COUNT * 3);
  const dustSeeds = new Float32Array(DUST_COUNT);

  for (let i = 0; i < DUST_COUNT; i++) {
    const theta = (i / DUST_COUNT) * Math.PI * 2 + (i % 7) * 0.43;
    const radius = 1.45 + ((i * 0.6180339) % 1) * 1.45;
    const y = (((i * 0.381966) % 1) - 0.5) * 2.2;
    const x = Math.cos(theta) * radius;
    const z = Math.sin(theta) * radius * 0.78;
    dustBasePositions[i * 3] = x;
    dustBasePositions[i * 3 + 1] = y;
    dustBasePositions[i * 3 + 2] = z;
    dustPositions[i * 3] = x;
    dustPositions[i * 3 + 1] = y;
    dustPositions[i * 3 + 2] = z;
    dustSeeds[i] = (i * 1.37) % (Math.PI * 2);
  }

  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
  const dustTex = createSparkleDustTexture();
  const dustMat = new THREE.PointsMaterial({
    size: 0.085,
    map: dustTex,
    color: METAL_PALETTE.gold.dustColor.clone(),
    transparent: true,
    opacity: 0.52,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
  });
  const dustPoints = new THREE.Points(dustGeo, dustMat);
  dustPoints.frustumCulled = false;
  scene.add(dustPoints);

  // Live Metal Interpolation State
  const metalRegistry = [];
  const currentMetalColor = METAL_PALETTE.gold.color.clone();
  const targetMetalColor = METAL_PALETTE.gold.color.clone();
  const currentKeyColor = METAL_PALETTE.gold.keyColor.clone();
  const targetKeyColor = METAL_PALETTE.gold.keyColor.clone();
  const currentRimColor = METAL_PALETTE.gold.rimColor.clone();
  const targetRimColor = METAL_PALETTE.gold.rimColor.clone();
  const currentDustColor = METAL_PALETTE.gold.dustColor.clone();
  const targetDustColor = METAL_PALETTE.gold.dustColor.clone();

  // Interactive Orbit + Scroll State
  const orbit = {
    dragging: false,
    pointerId: null,
    lastX: 0,
    lastY: 0,
    targetYaw: CAMERA_PRESETS.hero.yaw,
    currentYaw: CAMERA_PRESETS.hero.yaw,
    targetPitch: CAMERA_PRESETS.hero.pitch,
    currentPitch: CAMERA_PRESETS.hero.pitch,
    velYaw: 0,
    velPitch: 0,
    idleCooldown: 0,
    scrollTarget: 0,
    scrollCurrent: 0,
  };

  let isVisible = true;
  let isCompact = false;
  let rafId = null;

  const containerEl = stageEl || canvas.parentElement || canvas;

  function syncSize() {
    if (disposed) return;
    const rect = containerEl.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width || canvas.clientWidth || 640));
    const h = Math.max(1, Math.round(rect.height || canvas.clientHeight || 480));
    isCompact = w < 460;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
  }
  syncSize();

  let resizeObserver = null;
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => {
      syncSize();
      if (modelReady && isVisible) renderer.render(scene, camera);
    });
    resizeObserver.observe(containerEl);
  } else {
    window.addEventListener('resize', syncSize);
  }

  let intersectionObserver = null;
  if (typeof IntersectionObserver !== 'undefined') {
    intersectionObserver = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        isVisible = entry ? entry.isIntersecting : true;
      },
      { rootMargin: '120px 0px' }
    );
    intersectionObserver.observe(containerEl);
  }

  // First-fold scroll reaction
  function onScroll() {
    const foldHeight = Math.max(1, window.innerHeight || 900);
    orbit.scrollTarget = clamp01((window.scrollY || 0) / foldHeight);
  }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  // 360-degree drag interaction
  canvas.style.cursor = 'grab';
  canvas.style.touchAction = 'pan-y';

  function onPointerDown(e) {
    orbit.dragging = true;
    orbit.pointerId = e.pointerId;
    orbit.lastX = e.clientX;
    orbit.lastY = e.clientY;
    orbit.velYaw = 0;
    orbit.velPitch = 0;
    orbit.idleCooldown = 2.4;
    canvas.style.cursor = 'grabbing';
    if (canvas.setPointerCapture) {
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch (_err) {
        // Ignore capture failure on synthetic events
      }
    }
  }

  function onPointerMove(e) {
    if (!orbit.dragging || (orbit.pointerId !== null && e.pointerId !== orbit.pointerId)) return;
    const dx = e.clientX - orbit.lastX;
    const dy = e.clientY - orbit.lastY;
    orbit.lastX = e.clientX;
    orbit.lastY = e.clientY;

    const dYaw = dx * 0.0088;
    const dPitch = dy * 0.0062;
    orbit.targetYaw += dYaw;
    orbit.targetPitch = clamp(orbit.targetPitch + dPitch, -0.78, 1.05);
    orbit.velYaw = dYaw * 0.85;
    orbit.velPitch = dPitch * 0.5;
  }

  function onPointerUp(e) {
    if (!orbit.dragging) return;
    orbit.dragging = false;
    orbit.idleCooldown = 2.0;
    canvas.style.cursor = 'grab';
    if (orbit.pointerId !== null && canvas.releasePointerCapture) {
      try {
        canvas.releasePointerCapture(orbit.pointerId);
      } catch (_err) {
        // Ignore
      }
    }
    orbit.pointerId = null;
  }

  function onPointerLeave(e) {
    if (orbit.dragging && !canvas.hasPointerCapture?.(e.pointerId)) {
      onPointerUp(e);
    }
  }

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerUp);
  canvas.addEventListener('pointerleave', onPointerLeave);

  function updateSparkleDust(elapsed) {
    if (reducedMotion) return;
    const posAttr = dustGeo.attributes.position;
    for (let i = 0; i < DUST_COUNT; i++) {
      const s = dustSeeds[i];
      const bx = dustBasePositions[i * 3];
      const by = dustBasePositions[i * 3 + 1];
      const bz = dustBasePositions[i * 3 + 2];
      const driftAngle = elapsed * 0.12 + s;
      const x = bx + Math.sin(driftAngle) * 0.14;
      const y = by + Math.cos(elapsed * 0.28 + s * 1.7) * 0.16;
      const z = bz + Math.cos(driftAngle * 0.85) * 0.12;
      posAttr.setXYZ(i, x, y, z);
    }
    posAttr.needsUpdate = true;
    dustMat.opacity = 0.44 + Math.sin(elapsed * 1.4) * 0.1;
  }

  function applySceneTransforms(elapsed) {
    const presetCfg = CAMERA_PRESETS[activePreset] || CAMERA_PRESETS.hero;
    const bob = reducedMotion ? 0 : Math.sin(elapsed * 1.35) * 0.032;
    const scrollYaw = orbit.scrollCurrent * 0.48;
    const scrollLift = -orbit.scrollCurrent * 0.12;

    orbitGroup.position.set(0, bob + scrollLift, 0);
    orbitGroup.rotation.set(orbit.currentPitch, orbit.currentYaw + scrollYaw, 0);

    // Subtle sparkle point light orbit so facets catch specular glints smoothly
    if (!reducedMotion) {
      sparklePointLight.position.set(
        Math.cos(elapsed * 0.65) * 1.85,
        3.65 + Math.sin(elapsed * 0.9) * 0.35,
        2.15 + Math.sin(elapsed * 0.55) * 0.9
      );
    }

    // Distance framing adjustment for narrow mobile screens
    const distBoost = isCompact ? 1.16 : 1.0;
    camera.position.set(
      currentCamPos.x * distBoost,
      currentCamPos.y * (isCompact ? 1.08 : 1.0),
      currentCamPos.z * distBoost
    );
    camera.fov = currentFov + (isCompact ? 4 : 0);
    camera.lookAt(currentLookAt);
    camera.updateProjectionMatrix();

    // Soft breathing on contact shadow
    const shScale = 1.0 - bob * 0.85;
    contactShadow.scale.set(shScale, shScale, 1);
    contactShadow.material.opacity = clamp(0.76 - orbit.scrollCurrent * 0.2, 0.38, 0.82);

    // Subtle light intensity tweak for halo inspection
    sparklePointLight.intensity = activePreset === 'halo' ? 4.4 : 3.8;
    if (presetCfg === CAMERA_PRESETS.pave) {
      fillLight.intensity = 1.15;
    } else {
      fillLight.intensity = 0.95;
    }
  }

  // Load GLB & normalize geometry + upgrade materials
  loadSharedRingGLB()
    .then((gltf) => {
      if (disposed) return;

      const root = gltf.scene.clone(true);
      root.traverse((node) => {
        if (!node.isMesh) return;
        node.castShadow = false;
        node.receiveShadow = false;
        if (Array.isArray(node.material)) {
          node.material = node.material.map((m) =>
            upgradeJewelryMaterial(m, node.name, currentMetalColor, metalRegistry)
          );
        } else if (node.material) {
          node.material = upgradeJewelryMaterial(node.material, node.name, currentMetalColor, metalRegistry);
        }
      });

      // Normalize scale & center so ring fills the stage reliably
      const box = new THREE.Box3().setFromObject(root);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z, 0.0001);
      const normScale = 2.12 / maxDim;

      root.scale.setScalar(normScale);
      root.position.set(
        -center.x * normScale,
        -center.y * normScale,
        -center.z * normScale
      );

      modelHolder.add(root);

      // Ground contact shadow just below normalized bounding box
      const halfHeight = (size.y * normScale) * 0.5;
      contactShadow.position.y = -(halfHeight + 0.18);

      modelReady = true;
      applySceneTransforms(0);
      renderer.render(scene, camera);

      // Hide fallback poster smoothly
      const fallbackImg = document.getElementById('ringStageFallbackImg');
      if (fallbackImg) {
        fallbackImg.classList.add('is-loaded');
      }
      if (stageEl) {
        stageEl.classList.add('is-webgl-ready');
      }

      window.__marcelyRing3dReady = true;
    })
    .catch((err) => {
      console.warn('[MarcelyRing3D] GLB nao disponivel ou falha ao carregar:', err);
    });

  // Public Controls
  function setMetal(metal) {
    const key = String(metal || '').toLowerCase().includes('rhod') || String(metal || '').toLowerCase().includes('rodio')
      ? 'rhodium'
      : 'gold';
    activeMetal = key;
    const cfg = METAL_PALETTE[key];
    targetMetalColor.copy(cfg.color);
    targetKeyColor.copy(cfg.keyColor);
    targetRimColor.copy(cfg.rimColor);
    targetDustColor.copy(cfg.dustColor);
    syncDomControls(activeMetal, activePreset);
  }

  function setPreset(preset) {
    const key = CAMERA_PRESETS[preset] ? preset : 'hero';
    activePreset = key;
    const cfg = CAMERA_PRESETS[key];
    targetCamPos.copy(cfg.pos);
    targetLookAt.copy(cfg.lookAt);
    targetFov = cfg.fov;
    if (!orbit.dragging) {
      orbit.targetYaw = cfg.yaw;
      orbit.targetPitch = cfg.pitch;
      orbit.velYaw = 0;
      orbit.velPitch = 0;
      orbit.idleCooldown = 1.6;
    }
    syncDomControls(activeMetal, activePreset);
  }

  function forceSync() {
    syncSize();
    currentMetalColor.copy(targetMetalColor);
    currentKeyColor.copy(targetKeyColor);
    currentRimColor.copy(targetRimColor);
    currentDustColor.copy(targetDustColor);
    for (let i = 0; i < metalRegistry.length; i++) {
      metalRegistry[i].color.copy(currentMetalColor);
    }
    keyLight.color.copy(currentKeyColor);
    rimLight.color.copy(currentRimColor);
    dustMat.color.copy(currentDustColor);

    currentCamPos.copy(targetCamPos);
    currentLookAt.copy(targetLookAt);
    currentFov = targetFov;
    orbit.currentYaw = orbit.targetYaw;
    orbit.currentPitch = orbit.targetPitch;
    orbit.scrollCurrent = orbit.scrollTarget;

    if (modelReady) {
      applySceneTransforms(0);
      renderer.render(scene, camera);
    }
  }

  function dispose() {
    disposed = true;
    window.__marcelyRing3dReady = false;
    if (rafId !== null) cancelAnimationFrame(rafId);
    if (resizeObserver) resizeObserver.disconnect();
    else window.removeEventListener('resize', syncSize);
    if (intersectionObserver) intersectionObserver.disconnect();
    window.removeEventListener('scroll', onScroll);
    canvas.removeEventListener('pointerdown', onPointerDown);
    canvas.removeEventListener('pointermove', onPointerMove);
    canvas.removeEventListener('pointerup', onPointerUp);
    canvas.removeEventListener('pointercancel', onPointerUp);
    canvas.removeEventListener('pointerleave', onPointerLeave);
    envTex.dispose();
    dustGeo.dispose();
    dustMat.dispose();
    dustTex.dispose();
    renderer.dispose();
  }

  const clock = new THREE.Clock();
  let lastRenderAt = 0;
  let avgFrameMs = 16;

  function tick(now = 0) {
    if (disposed) return;
    rafId = requestAnimationFrame(tick);

    const dt = Math.min(0.05, clock.getDelta());
    const elapsed = clock.elapsedTime;
    const lerpK = reducedMotion ? 1.0 : Math.min(1, dt * 6.8);
    const colorK = reducedMotion ? 1.0 : Math.min(1, dt * 7.5);

    // Smooth color morph between Ouro 18k and Rodio Nobre
    currentMetalColor.lerp(targetMetalColor, colorK);
    currentKeyColor.lerp(targetKeyColor, colorK);
    currentRimColor.lerp(targetRimColor, colorK);
    currentDustColor.lerp(targetDustColor, colorK);

    for (let i = 0; i < metalRegistry.length; i++) {
      metalRegistry[i].color.copy(currentMetalColor);
    }
    keyLight.color.copy(currentKeyColor);
    rimLight.color.copy(currentRimColor);
    dustMat.color.copy(currentDustColor);

    // Camera preset interpolation
    currentCamPos.lerp(targetCamPos, lerpK);
    currentLookAt.lerp(targetLookAt, lerpK);
    currentFov += (targetFov - currentFov) * lerpK;

    // Orbit inertia & gentle idle auto-rotation
    if (!orbit.dragging) {
      if (Math.abs(orbit.velYaw) > 0.00015 || Math.abs(orbit.velPitch) > 0.00015) {
        orbit.targetYaw += orbit.velYaw;
        orbit.targetPitch = clamp(orbit.targetPitch + orbit.velPitch, -0.78, 1.05);
        const damp = Math.pow(0.04, dt);
        orbit.velYaw *= damp;
        orbit.velPitch *= damp;
      } else {
        orbit.velYaw = 0;
        orbit.velPitch = 0;
        if (orbit.idleCooldown > 0) {
          orbit.idleCooldown = Math.max(0, orbit.idleCooldown - dt);
        } else if (!reducedMotion) {
          const presetCfg = CAMERA_PRESETS[activePreset] || CAMERA_PRESETS.hero;
          orbit.targetYaw += presetCfg.autoSpin * dt;
        }
      }
    }

    const dragK = orbit.dragging ? Math.min(1, dt * 20) : lerpK;
    orbit.currentYaw += (orbit.targetYaw - orbit.currentYaw) * dragK;
    orbit.currentPitch += (orbit.targetPitch - orbit.currentPitch) * dragK;
    orbit.scrollCurrent += (orbit.scrollTarget - orbit.scrollCurrent) * Math.min(1, dt * 6.0);

    if (!modelReady || !isVisible || document.hidden) return;

    const minInterval = avgFrameMs > 52 ? 120 : 0;
    if (minInterval > 0 && now - lastRenderAt < minInterval) return;

    updateSparkleDust(elapsed);
    applySceneTransforms(elapsed);

    const t0 = performance.now();
    renderer.render(scene, camera);
    const renderMs = performance.now() - t0;
    avgFrameMs = avgFrameMs * 0.8 + renderMs * 0.2;
    lastRenderAt = now;
  }

  tick();

  return {
    setMetal,
    setPreset,
    getMetal: () => activeMetal,
    getPreset: () => activePreset,
    forceSync,
    isReady: () => modelReady,
    remount: () => mountMarcelyRing3D(),
    dispose,
  };
}

function syncDomControls(metal, preset) {
  const cfg = METAL_PALETTE[metal] || METAL_PALETTE.gold;

  document.querySelectorAll('[data-ring-metal]').forEach((btn) => {
    const isActive = btn.dataset.ringMetal === metal;
    btn.classList.toggle('is-active', isActive);
    btn.setAttribute('aria-checked', isActive ? 'true' : 'false');
  });

  document.querySelectorAll('[data-ring-preset]').forEach((btn) => {
    const isActive = btn.dataset.ringPreset === preset;
    btn.classList.toggle('is-active', isActive);
    btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  });

  const labelEl = document.getElementById('ringHeroMetalLabel');
  if (labelEl) {
    labelEl.textContent = cfg.label;
  }

  const fallbackImg = document.getElementById('ringStageFallbackImg');
  if (fallbackImg && !window.__marcelyRing3dReady) {
    const desired =
      metal === 'rhodium'
        ? './assets/img/ring-rhodium-cutout.png'
        : './assets/img/ring-gold-cutout.png';
    if (fallbackImg.getAttribute('src') !== desired) {
      fallbackImg.setAttribute('src', desired);
    }
  }
}

function bindHeroRingUi(api) {
  document.querySelectorAll('[data-ring-metal]').forEach((btn) => {
    if (btn.dataset.ringBound === 'true') return;
    btn.dataset.ringBound = 'true';
    btn.addEventListener('click', () => {
      api.setMetal(btn.dataset.ringMetal);
    });
  });

  document.querySelectorAll('[data-ring-preset]').forEach((btn) => {
    if (btn.dataset.ringBound === 'true') return;
    btn.dataset.ringBound = 'true';
    btn.addEventListener('click', () => {
      api.setPreset(btn.dataset.ringPreset);
    });
  });

  const waBtn = document.getElementById('heroRingWhatsappBtn');
  if (waBtn && waBtn.dataset.ringBound !== 'true') {
    waBtn.dataset.ringBound = 'true';
    waBtn.addEventListener('click', () => {
      const metalKey = api.getMetal();
      const cfg = METAL_PALETTE[metalKey] || METAL_PALETTE.gold;
      if (window.MarcelyApp && typeof window.MarcelyApp.openWhatsAppForProduct === 'function') {
        window.MarcelyApp.openWhatsAppForProduct('marcely_b69fa9a5a0ac', cfg.label, 'Aro 16', 1);
      }
    });
  }

  syncDomControls(api.getMetal(), api.getPreset());
}

export function mountMarcelyRing3D() {
  if (activeController && typeof activeController.dispose === 'function') {
    activeController.dispose();
    activeController = null;
  }

  const canvas = document.getElementById('marcelyRingCanvas');
  const stageEl = document.getElementById('ringHeroStage');
  if (!canvas) {
    return null;
  }

  window.__marcelyRing3dReady = false;
  const api = createMarcelyRing3D({ canvas, stageEl });
  activeController = api;
  window.__marcelyRing3D = api;
  bindHeroRingUi(api);
  return api;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    mountMarcelyRing3D();
  });
} else {
  mountMarcelyRing3D();
}
