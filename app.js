/* === 1. THREE.JS, PLANET DATA, AND EXPERIENCE ELEMENTS === */
import * as THREE from "three";
import { solarSystemData } from "./missionsData.js";

const experience = document.querySelector("#experience");
const canvas = document.querySelector("#solarCanvas");
const labelLayer = document.querySelector("#planetLabels");
const hotspotLayer = document.querySelector("#hotspotLayer");
const missionCard = document.querySelector("#missionCard");
const archivePanel = document.querySelector("#archivePanel");
const loadingState = document.querySelector("#loadingState");
const errorState = document.querySelector("#errorState");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* === 2. THREE.JS WORLD, CAMERA, AND CINEMATIC LIGHTING === */
const scene = new THREE.Scene();
scene.background = null;

const camera = new THREE.PerspectiveCamera(49, window.innerWidth / window.innerHeight, 0.1, 260);
camera.position.set(0, 0, 62);
camera.lookAt(0, 0, 0);

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "high-performance" });
} catch (error) {
  console.error("Could not initialize the solar system WebGL renderer.", error);
  errorState.hidden = false;
  loadingState.classList.add("is-hidden");
}

if (renderer) {
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
}

const ambientLight = new THREE.HemisphereLight(0xc9c3ff, 0x171323, 1.4);
scene.add(ambientLight);

const sunlight = new THREE.PointLight(0xffdfbd, 210, 210, 1.3);
sunlight.position.set(0, 0, 1.4);
scene.add(sunlight);

const fillLight = new THREE.DirectionalLight(0x747ce2, 0.5);
fillLight.position.set(-14, 17, 18);
scene.add(fillLight);

/* === 3. PLANETARY SURFACE TEXTURE GENERATION === */
/* Make deterministic, hand-painted map textures so the experience works without remote image assets. */
function createPlanetTexture(kind, baseColor, seed) {
  const width = 1024;
  const height = 512;
  const textureCanvas = document.createElement("canvas");
  textureCanvas.width = width;
  textureCanvas.height = height;
  const context = textureCanvas.getContext("2d");
  const random = createSeededRandom(seed);

  context.fillStyle = baseColor;
  context.fillRect(0, 0, width, height);

  if (kind === "earth") {
    paintEarthSurface(context, random, width, height);
  } else if (kind === "jupiter" || kind === "saturn" || kind === "venus" || kind === "ice") {
    paintStripedSurface(context, random, kind, width, height);
  } else {
    paintRockySurface(context, random, kind, width, height);
  }

  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer ? renderer.capabilities.getMaxAnisotropy() : 1;
  return texture;
}

/* Build a simple reproducible random generator for repeatable continent and crater layouts. */
function createSeededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

/* Paint stylized ocean, landmasses, and drifting cloud bands onto the Earth map. */
function paintEarthSurface(context, random, width, height) {
  const ocean = context.createLinearGradient(0, 0, width, height);
  ocean.addColorStop(0, "#205a91");
  ocean.addColorStop(.5, "#267fb0");
  ocean.addColorStop(1, "#153e70");
  context.fillStyle = ocean;
  context.fillRect(0, 0, width, height);

  for (let continent = 0; continent < 23; continent += 1) {
    const centerX = random() * width;
    const centerY = 35 + random() * (height - 70);
    const sizeX = 12 + random() * 78;
    const sizeY = 8 + random() * 37;
    context.beginPath();
    for (let point = 0; point <= 15; point += 1) {
      const angle = point / 15 * Math.PI * 2;
      const roughness = .62 + random() * .52;
      const x = centerX + Math.cos(angle) * sizeX * roughness;
      const y = centerY + Math.sin(angle) * sizeY * roughness;
      if (point === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.closePath();
    context.fillStyle = ["#4c9566", "#78a96d", "#a9a16c", "#597e56"][Math.floor(random() * 4)];
    context.fill();
    context.strokeStyle = "rgba(224, 214, 159, .25)";
    context.lineWidth = 2;
    context.stroke();
  }

  context.globalAlpha = .23;
  for (let cloud = 0; cloud < 180; cloud += 1) {
    context.beginPath();
    context.ellipse(random() * width, random() * height, 7 + random() * 50, 1 + random() * 5, random() * .2, 0, Math.PI * 2);
    context.fillStyle = "#ecf4e9";
    context.fill();
  }
  context.globalAlpha = 1;
}

/* Paint the atmospheric color bands and storm features on the giant and ice-giant planets. */
function paintStripedSurface(context, random, kind, width, height) {
  const bands = {
    jupiter: ["#e6c6a0", "#b97c61", "#f0d7b4", "#9d695a", "#d9ad86", "#f1dcb9"],
    saturn: ["#f1dfb8", "#c5a77e", "#ebd5a5", "#ac8969", "#e7d2ab"],
    venus: ["#edca85", "#bb8b55", "#f3d9a1", "#d2a66b", "#f0d39a"],
    ice: ["#a6dddd", "#70bfc9", "#c0e8e4", "#78bdce", "#a5d9de"]
  }[kind];
  let y = 0;
  while (y < height) {
    const bandHeight = 8 + random() * 36;
    context.fillStyle = bands[Math.floor(random() * bands.length)];
    context.fillRect(0, y, width, bandHeight + 1);
    if (random() > .35) {
      context.globalAlpha = .2 + random() * .25;
      context.fillStyle = "#fff0d4";
      context.fillRect(0, y + bandHeight * .42, width, 1 + random() * 5);
      context.globalAlpha = 1;
    }
    y += bandHeight;
  }

  if (kind === "jupiter") {
    context.save();
    context.translate(width * .72, height * .63);
    context.rotate(-.08);
    context.beginPath();
    context.ellipse(0, 0, 56, 23, 0, 0, Math.PI * 2);
    context.fillStyle = "#a85145";
    context.fill();
    context.beginPath();
    context.ellipse(-5, -4, 37, 10, 0, 0, Math.PI * 2);
    context.fillStyle = "rgba(239, 191, 157, .56)";
    context.fill();
    context.restore();
  }
}

/* Add crater rims, shadowed basins, and fine surface variation to rocky worlds. */
function paintRockySurface(context, random, kind, width, height) {
  const colors = kind === "mars"
    ? ["#d97d57", "#a94e3d", "#e99968", "#743b39", "#c4674c"]
    : ["#bba79a", "#756e70", "#d2bda5", "#655b63", "#a3958b"];
  for (let crater = 0; crater < 260; crater += 1) {
    const x = random() * width;
    const y = random() * height;
    const radius = 2 + random() * (kind === "mars" ? 22 : 36);
    const shade = context.createRadialGradient(x - radius * .22, y - radius * .26, 1, x, y, radius);
    shade.addColorStop(0, "rgba(27, 21, 28, .4)");
    shade.addColorStop(.72, colors[Math.floor(random() * colors.length)]);
    shade.addColorStop(1, "rgba(239, 196, 159, .3)");
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fillStyle = shade;
    context.fill();
  }
}

/* Create a radial glow texture used by the star and the solar corona. */
function createGlowTexture() {
  const glowCanvas = document.createElement("canvas");
  glowCanvas.width = 256;
  glowCanvas.height = 256;
  const context = glowCanvas.getContext("2d");
  const gradient = context.createRadialGradient(128, 128, 3, 128, 128, 128);
  gradient.addColorStop(0, "rgba(255, 247, 215, 1)");
  gradient.addColorStop(.14, "rgba(255, 195, 139, .83)");
  gradient.addColorStop(.36, "rgba(220, 130, 116, .35)");
  gradient.addColorStop(1, "rgba(115, 82, 191, 0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(glowCanvas);
}

/* === SATURN RING MAPS AND SOFT PLANETARY SHADOW === */
/* Make concentric color and alpha maps for a thin annulus instead of a tube-shaped torus. */
function createSaturnRingMaps() {
  const size = 512;
  const colorCanvas = document.createElement("canvas");
  const alphaCanvas = document.createElement("canvas");
  colorCanvas.width = size;
  colorCanvas.height = size;
  alphaCanvas.width = size;
  alphaCanvas.height = size;
  const colorContext = colorCanvas.getContext("2d");
  const alphaContext = alphaCanvas.getContext("2d");
  const colors = ["#d9c6a5", "#b9a17f", "#e7d8bd", "#9d876f", "#cbb696", "#f0e2c6"];
  const center = size / 2;

  colorContext.clearRect(0, 0, size, size);
  alphaContext.clearRect(0, 0, size, size);
  for (let radius = 119; radius < 256; radius += 1) {
    const band = Math.floor(radius / 4) % colors.length;
    const opacity = .24 + ((Math.sin(radius * .37) + 1) * .19) + (band % 2) * .14;
    colorContext.beginPath();
    colorContext.arc(center, center, radius, 0, Math.PI * 2);
    colorContext.strokeStyle = colors[band];
    colorContext.globalAlpha = Math.min(opacity + .18, .86);
    colorContext.lineWidth = 1.2 + ((radius * 7) % 4);
    colorContext.stroke();

    alphaContext.beginPath();
    alphaContext.arc(center, center, radius, 0, Math.PI * 2);
    const alpha = Math.round(Math.min(opacity + .12, .92) * 255);
    alphaContext.strokeStyle = `rgb(${alpha}, ${alpha}, ${alpha})`;
    alphaContext.lineWidth = 1.2 + ((radius * 7) % 4);
    alphaContext.stroke();
  }

  /* The Cassini Division appears as a broad, softly feathered gap in the middle rings. */
  const divisionRadius = size * .39;
  const division = colorContext.createRadialGradient(center, center, divisionRadius - 2, center, center, divisionRadius + 2);
  division.addColorStop(0, "rgba(12, 10, 18, .08)");
  division.addColorStop(.5, "rgba(7, 7, 13, .86)");
  division.addColorStop(1, "rgba(12, 10, 18, .08)");
  colorContext.beginPath();
  colorContext.arc(center, center, divisionRadius, 0, Math.PI * 2);
  colorContext.strokeStyle = division;
  colorContext.lineWidth = 4;
  colorContext.stroke();
  alphaContext.beginPath();
  alphaContext.arc(center, center, divisionRadius, 0, Math.PI * 2);
  alphaContext.strokeStyle = "rgb(24, 24, 24)";
  alphaContext.lineWidth = 4;
  alphaContext.stroke();
  colorContext.globalAlpha = 1;

  const colorMap = new THREE.CanvasTexture(colorCanvas);
  colorMap.colorSpace = THREE.SRGBColorSpace;
  colorMap.anisotropy = renderer ? renderer.capabilities.getMaxAnisotropy() : 1;
  const alphaMap = new THREE.CanvasTexture(alphaCanvas);
  alphaMap.anisotropy = renderer ? renderer.capabilities.getMaxAnisotropy() : 1;
  return { colorMap, alphaMap };
}

/* === 4. SOLAR SYSTEM STARFIELD AND WARP-LIGHT GEOMETRY === */
/* Create distant static star points and a second line buffer that stretches during camera travel. */
function createStarfield() {
  const starCount = 5600;
  const positions = new Float32Array(starCount * 3);
  for (let index = 0; index < starCount; index += 1) {
    positions[index * 3] = (Math.random() - .5) * 170;
    positions[index * 3 + 1] = (Math.random() - .5) * 105;
    positions[index * 3 + 2] = -18 - Math.random() * 105;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({ color: 0xcac1ff, size: .095, transparent: true, opacity: .8, sizeAttenuation: true, depthWrite: false });
  const points = new THREE.Points(geometry, material);
  scene.add(points);

  const streakCount = 850;
  const basePositions = new Float32Array(streakCount * 3);
  const streakPositions = new Float32Array(streakCount * 6);
  for (let index = 0; index < streakCount; index += 1) {
    const offset = index * 3;
    basePositions[offset] = (Math.random() - .5) * 145;
    basePositions[offset + 1] = (Math.random() - .5) * 86;
    basePositions[offset + 2] = -12 - Math.random() * 100;
  }

  const streakGeometry = new THREE.BufferGeometry();
  streakGeometry.setAttribute("position", new THREE.BufferAttribute(streakPositions, 3).setUsage(THREE.DynamicDrawUsage));
  const streakMaterial = new THREE.LineBasicMaterial({ color: 0xb9a0ff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const streaks = new THREE.LineSegments(streakGeometry, streakMaterial);
  streaks.frustumCulled = false;
  scene.add(streaks);
  return { points, streaks, streakGeometry, basePositions, streakPositions, streakCount };
}

const starfield = renderer ? createStarfield() : null;

/* === 5. SUN, ORBITAL PATHS, AND CLICKABLE PLANET MESHES === */
/* Build each mapped sphere, create its elliptical orbit, and attach stable data for raycasting. */
const solarBodies = [];
const pickableMeshes = [];
const orbitMaterials = [];
const planetLabels = new Map();
const planetPins = new Map();
const glowTexture = createGlowTexture();

function createSun() {
  const sunGroup = new THREE.Group();
  sunGroup.name = "Sun";
  sunGroup.position.set(0, 0, 0);

  const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffd18e, transparent: true, opacity: 1 });
  const sunMesh = new THREE.Mesh(new THREE.SphereGeometry(3.2, 64, 48), sunMaterial);
  sunMesh.userData.body = { name: "Sun", descriptor: "G2V STAR", distance: "THE HEART OF OUR SOLAR SYSTEM", missions: [] };
  sunGroup.add(sunMesh);
  pickableMeshes.push(sunMesh);

  const corona = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture, color: 0xffbd81, transparent: true, opacity: .82, depthWrite: false, blending: THREE.AdditiveBlending }));
  corona.scale.set(21, 21, 1);
  sunGroup.add(corona);

  const outerGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture, color: 0x9d79ff, transparent: true, opacity: .27, depthWrite: false, blending: THREE.AdditiveBlending }));
  outerGlow.scale.set(35, 35, 1);
  sunGroup.add(outerGlow);

  scene.add(sunGroup);
  solarBodies.push({ name: "Sun", group: sunGroup, mesh: sunMesh, radius: 3.2, data: sunMesh.userData.body, isSun: true });
}

/* Draw a subtle elliptical orbit line in the solar-system plane for one planet. */
function createOrbitPath(radius) {
  const points = [];
  for (let index = 0; index <= 240; index += 1) {
    const angle = index / 240 * Math.PI * 2;
    points.push(new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius * .58, -.16));
  }
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({ color: 0x8e7db7, transparent: true, opacity: .18, depthWrite: false });
  const orbit = new THREE.LineLoop(geometry, material);
  orbitMaterials.push(material);
  scene.add(orbit);
}

/* Construct a planet group from the catalog and register a DOM label and raycast target. */
function createPlanet(data, index) {
  createOrbitPath(data.orbit);

  const group = new THREE.Group();
  group.name = data.name;
  const angle = THREE.MathUtils.degToRad(data.angle);
  group.position.set(Math.cos(angle) * data.orbit, Math.sin(angle) * data.orbit * .58, .12 + index * .035);

  const texture = createPlanetTexture(data.texture, data.color, 210 + index * 71);
  const material = new THREE.MeshStandardMaterial({
    map: texture,
    roughness: data.texture === "ice" ? .48 : .91,
    metalness: .015,
    transparent: true,
    opacity: 1
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(data.radius, 64, 48), material);
  /* Apply the catalog scale to the globe without changing its orbital position or camera target. */
  const visualScale = data.visualScale || 1;
  mesh.scale.set(visualScale, visualScale, visualScale);
  mesh.userData.body = data;
  mesh.renderOrder = 0;
  group.add(mesh);

  if (data.hasRings) {
    const ringMaps = createSaturnRingMaps();
    const ringGeometry = new THREE.RingGeometry(data.radius * 1.17, data.radius * 2.32, 256, 1);
    const ringMaterial = new THREE.MeshStandardMaterial({
      map: ringMaps.colorMap,
      alphaMap: ringMaps.alphaMap,
      color: 0xe7d9bf,
      roughness: .92,
      metalness: .02,
      transparent: true,
      opacity: .91,
      alphaTest: .025,
      side: THREE.DoubleSide,
      depthTest: true,
      depthWrite: false
    });

    /* Shade a soft radial shadow opposite the Sun without disabling ring-to-planet depth tests. */
    const shadowUniforms = {
      direction: { value: new THREE.Vector2(1, 0) },
      radius: { value: data.radius },
      softness: { value: data.radius * .42 }
    };
    ringMaterial.onBeforeCompile = (shader) => {
      shader.uniforms.uRingShadowDirection = shadowUniforms.direction;
      shader.uniforms.uRingShadowRadius = shadowUniforms.radius;
      shader.uniforms.uRingShadowSoftness = shadowUniforms.softness;
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", "#include <common>\nvarying vec3 vRingPosition;")
        .replace("#include <begin_vertex>", "#include <begin_vertex>\nvRingPosition = position;");
      shader.fragmentShader = shader.fragmentShader
        .replace("#include <common>", "#include <common>\nvarying vec3 vRingPosition;\nuniform vec2 uRingShadowDirection;\nuniform float uRingShadowRadius;\nuniform float uRingShadowSoftness;")
        .replace("#include <opaque_fragment>", `
          float shadowAxis = dot(vRingPosition.xy, normalize(uRingShadowDirection));
          float shadowSide = abs(dot(vRingPosition.xy, vec2(-uRingShadowDirection.y, uRingShadowDirection.x)));
          float shadowWidth = uRingShadowRadius * 0.78;
          float shadowMask = (1.0 - smoothstep(shadowWidth, shadowWidth + uRingShadowSoftness, shadowSide))
            * smoothstep(0.0, uRingShadowRadius * 0.18, shadowAxis);
          outgoingLight *= mix(1.0, 0.3, shadowMask);
          #include <opaque_fragment>
        `);
    };
    ringMaterial.customProgramCacheKey = () => "saturn-annulus-shadow-v1";

    const rings = new THREE.Mesh(ringGeometry, ringMaterial);
    /* A shallow tilt keeps Saturn's silhouette elegant while preserving front/back depth occlusion. */
    rings.scale.set(visualScale, visualScale, visualScale);
    rings.rotation.set(.24, 0, -.035);
    rings.renderOrder = 1;
    rings.userData.shadowUniforms = shadowUniforms;
    group.add(rings);
    group.userData.ringMesh = rings;
  }

  scene.add(group);
  solarBodies.push({ name: data.name, group, mesh, radius: data.radius, data, isSun: false, index });
  pickableMeshes.push(mesh);
  createPlanetLabel(data, index);
  createPlanetPins(data, group);
}

/* Create the accessible HTML label that follows its planet using camera projection. */
function createPlanetLabel(data, index) {
  const label = document.createElement("button");
  label.className = "planet-label";
  label.type = "button";
  label.setAttribute("aria-label", `Travel to ${data.name}`);
  label.innerHTML = `${data.name.toUpperCase()}<small>${String(index + 1).padStart(2, "0")} &nbsp;·&nbsp; ${data.category}</small>`;
  label.dataset.planet = data.name;
  labelLayer.append(label);
  planetLabels.set(data.name, label);
}

/* Convert mission latitude and longitude into rotating 3D anchors on the planet sphere. */
function createPlanetPins(data, group) {
  if (!data.missions.length) return;
  const pins = [];
  data.missions.forEach((mission) => {
    const anchor = new THREE.Object3D();
    const latitude = THREE.MathUtils.degToRad(mission.latitude);
    const longitude = THREE.MathUtils.degToRad(mission.longitude);
    const anchorRadius = data.radius * (mission.altitude || 1.018) * (data.visualScale || 1);
    anchor.position.set(
      Math.cos(latitude) * Math.sin(longitude) * anchorRadius,
      Math.sin(latitude) * anchorRadius,
      Math.cos(latitude) * Math.cos(longitude) * anchorRadius
    );
    group.add(anchor);

    const button = document.createElement("button");
    button.className = "hotspot";
    button.type = "button";
    button.setAttribute("aria-label", `Open ${mission.title} mission details`);
    button.dataset.missionId = mission.id;
    button.innerHTML = `<span></span><b class="hotspot-tooltip">${mission.title}</b>`;
    button.hidden = true;
    button.addEventListener("click", () => openMissionCard(mission));
    hotspotLayer.append(button);
    pins.push({ anchor, button, mission });
  });
  planetPins.set(data.name, pins);
}

/* === 6. BUILD THE SYSTEM AFTER THE TEXTURE AND LIGHT HELPERS EXIST === */
createSun();
solarSystemData.forEach((planet, index) => createPlanet(planet, index));

/* === 7. STARFIELD WARP SPEED, PLANET FADE, AND CAMERA TRANSITIONS === */
/* Ease into the jump quickly, then glide to a smooth stop at the destination. */
function cinematicEase(progress) {
  if (progress < .34) {
    const acceleration = progress / .34;
    return .46 * acceleration * acceleration;
  }
  const deceleration = (progress - .34) / .66;
  return .46 + .54 * (1 - Math.pow(1 - deceleration, 3));
}

/* Animate camera, orbit opacity, planet visibility, and star streaks for inward or return travel. */
function beginTravel(direction, destination = null) {
  if (!renderer) return;
  const overviewPosition = new THREE.Vector3(0, 0, 62);
  const overviewTarget = new THREE.Vector3(0, 0, 0);
  const isEntering = direction === "in";
  const body = destination || activeBody;

  if (!isEntering) {
    solarBodies.forEach((item) => {
      item.group.visible = true;
      item.group.scale.setScalar(.2);
      setPlanetOpacity(item.group, .08);
    });
    orbitMaterials.forEach((material) => { material.opacity = .015; });
  }

  const startPosition = camera.position.clone();
  const startTarget = cameraTarget.clone();
  const endPosition = isEntering
    ? body.group.position.clone().add(new THREE.Vector3(0, 0, body.radius * 3.55))
    : overviewPosition;
  const endTarget = isEntering ? body.group.position.clone() : overviewTarget;
  const duration = prefersReducedMotion ? 580 : 2050;

  experience.classList.add("is-travelling");
  mode = "travelling";
  const destinationText = body.name.toUpperCase();
  document.querySelector("#warpDestination").textContent = destinationText;
  document.querySelector("#navLocation").textContent = isEntering ? `ROUTE TO ${destinationText}` : "RETURNING TO SOL";

  transition = {
    direction,
    body,
    startPosition,
    startTarget,
    endPosition,
    endTarget,
    startedAt: performance.now(),
    duration,
    lastProgress: 0
  };
}

/* Fade all transparent materials in a body group consistently through a warp transition. */
function setPlanetOpacity(group, opacity) {
  group.traverse((object) => {
    if (!object.material) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach((material) => {
      if ("opacity" in material) material.opacity = opacity;
    });
  });
}

/* Finish travel by restoring the appropriate display mode and disposing of transition classes. */
function finishTravel() {
  if (!transition) return;
  const direction = transition.direction;
  if (direction === "in") {
    solarBodies.forEach((body) => {
      const isSelected = body === activeBody;
      body.group.visible = isSelected;
      body.group.scale.setScalar(1);
      setPlanetOpacity(body.group, 1);
    });
    orbitMaterials.forEach((material) => { material.opacity = 0; });
    mode = "inspection";
    experience.classList.add("is-inspection");
    document.querySelector("#navLocation").textContent = `${activeBody.name.toUpperCase()} / SURFACE ARCHIVE`;
    document.querySelector("#hudInstruction b").textContent = "ROTATE TO INSPECT";
    document.querySelector("#hudInstruction small").textContent = "Select a glowing point to open its mission file";
    document.querySelector("#hudArtifactCount").textContent = `${activeBody.data.missions.length} SURFACE ARTIFACT${activeBody.data.missions.length === 1 ? "" : "S"}`;
    document.querySelector("#planetName").textContent = activeBody.name.toUpperCase();
    document.querySelector("#planetIndex").textContent = activeBody.isSun ? "SOL / G2V STAR" : `WORLD ${String(activeBody.index + 1).padStart(2, "0")} / ${activeBody.data.category}`;
    document.querySelector("#planetDescriptor").innerHTML = `${activeBody.data.descriptor} <span>·</span> ${activeBody.data.distance}`;
    showPlanetPins(activeBody.name);
  } else {
    solarBodies.forEach((body) => {
      body.group.visible = true;
      body.group.scale.setScalar(1);
      setPlanetOpacity(body.group, 1);
    });
    orbitMaterials.forEach((material) => { material.opacity = .18; });
    mode = "overview";
    experience.classList.remove("is-inspection");
    document.querySelector("#navLocation").textContent = "SOL SYSTEM";
    document.querySelector("#hudInstruction b").textContent = "SELECT A WORLD";
    document.querySelector("#hudInstruction small").textContent = "Click any planet to travel through space";
    document.querySelector("#hudArtifactCount").textContent = "47 KNOWN ARTIFACTS";
    hidePlanetPins();
  }

  transition = null;
  experience.classList.remove("is-travelling");
}

/* === 8. ORBITAL PIN VISIBILITY AND MISSION CARD CONTENT === */
/* Show only the active planet's DOM hotspots and reset any previously open mission file. */
function showPlanetPins(planetName) {
  hidePlanetPins();
  (planetPins.get(planetName) || []).forEach((pin) => { pin.button.hidden = false; });
}

/* Hide pins whenever returning to overview or changing planetary context. */
function hidePlanetPins() {
  planetPins.forEach((pins) => pins.forEach((pin) => { pin.button.hidden = true; }));
}

/* Fill and reveal the glass archive card for a clicked mission or artifact marker. */
function openMissionCard(mission) {
  document.querySelector("#missionStatus").textContent = mission.status;
  document.querySelector("#missionAgency").textContent = mission.agency;
  document.querySelector("#missionTitle").textContent = mission.title;
  document.querySelector("#missionYear").textContent = mission.year;
  document.querySelector("#missionType").textContent = mission.type;
  document.querySelector("#missionSummary").textContent = mission.summary;
  document.querySelector("#missionLocation").textContent = mission.location;
  document.querySelector("#missionTelemetry").textContent = mission.telemetry;
  document.querySelector("#missionId").textContent = `SL—${mission.id.slice(0, 3).toUpperCase()}`;
  missionCard.classList.add("is-open");
  missionCard.setAttribute("aria-hidden", "false");
}

/* Dismiss the mission file and return focus to the planet's hotspot controls. */
function closeMissionCard() {
  missionCard.classList.remove("is-open");
  missionCard.setAttribute("aria-hidden", "true");
}

/* Build archive entries from the same planet data used to create the 3D scene. */
function populateArchive() {
  const archiveWorlds = document.querySelector("#archiveWorlds");
  solarSystemData.forEach((planet, index) => {
    if (!planet.missions.length) return;
    const entry = document.createElement("button");
    entry.className = "archive-world";
    entry.type = "button";
    entry.innerHTML = `<strong>${planet.name}</strong><small>${String(index + 1).padStart(2, "0")} &nbsp;·&nbsp; ${planet.missions.length} ARCHIVED OBJECT${planet.missions.length === 1 ? "" : "S"}</small><b>ENTER ORBIT →</b>`;
    entry.addEventListener("click", () => {
      archivePanel.classList.remove("is-open");
      archivePanel.setAttribute("aria-hidden", "true");
      const body = solarBodies.find((item) => item.name === planet.name);
      if (body && mode === "overview") travelToBody(body);
    });
    archiveWorlds.append(entry);
  });
}

/* Open or dismiss the archive panel without affecting the WebGL solar system. */
function toggleArchive(open) {
  const shouldOpen = typeof open === "boolean" ? open : !archivePanel.classList.contains("is-open");
  archivePanel.classList.toggle("is-open", shouldOpen);
  archivePanel.setAttribute("aria-hidden", String(!shouldOpen));
}

/* === 9. PLANET RAYCASTING AND USER-DRIVEN INSPECTION === */
/* Travel from the full-system view toward a selected planet mesh. */
function travelToBody(body) {
  if (mode !== "overview" || !body) return;
  activeBody = body;
  closeMissionCard();
  document.querySelector("#planetDescriptor").textContent = `${body.data.descriptor} · ${body.data.distance}`;
  beginTravel("in", body);
}

/* Return the selected planet and camera to their original solar-system positions. */
function returnToSystem() {
  if (mode !== "inspection" || transition) return;
  closeMissionCard();
  archivePanel.classList.remove("is-open");
  archivePanel.setAttribute("aria-hidden", "true");
  beginTravel("out", activeBody);
}

/* Raycast the pointer against sphere meshes and highlight or select the nearest planet. */
function pickPlanet(clientX, clientY) {
  pointer.set((clientX / window.innerWidth) * 2 - 1, -(clientY / window.innerHeight) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(pickableMeshes, false);
  if (hits.length) return solarBodies.find((body) => body.mesh === hits[0].object) || null;
  return null;
}

/* Update the projected 2D pin position and dim locations that face away from light or camera. */
function updateHotspotProjection() {
  if (mode !== "inspection" || !activeBody || activeBody.isSun) return;
  const pins = planetPins.get(activeBody.name) || [];
  const center = activeBody.group.getWorldPosition(new THREE.Vector3());
  pins.forEach((pin) => {
    const worldPosition = pin.anchor.getWorldPosition(new THREE.Vector3());
    const surfaceNormal = worldPosition.clone().sub(center).normalize();
    const viewDirection = camera.position.clone().sub(worldPosition).normalize();
    const lightDirection = new THREE.Vector3().subVectors(new THREE.Vector3(0, 0, 0), worldPosition).normalize();
    const cameraFacing = surfaceNormal.dot(viewDirection);
    const sunFacing = surfaceNormal.dot(lightDirection);
    const projected = worldPosition.project(camera);
    const x = (projected.x * .5 + .5) * window.innerWidth;
    const y = (-projected.y * .5 + .5) * window.innerHeight;
    const visible = cameraFacing > -.02 && projected.z < 1 && x > -40 && x < window.innerWidth + 40 && y > -40 && y < window.innerHeight + 40;
    pin.button.style.left = `${x}px`;
    pin.button.style.top = `${y}px`;
    pin.button.hidden = !visible;
    pin.button.classList.toggle("is-dim", sunFacing < -.05);
  });
}

/* Keep Saturn's soft ring shadow aligned opposite the Sun as the tilted planet rotates. */
function updateSaturnRingShadow(body) {
  const rings = body.group.userData.ringMesh;
  const uniforms = rings && rings.userData.shadowUniforms;
  if (!uniforms) return;

  const planetPosition = body.group.getWorldPosition(new THREE.Vector3());
  const sunDirection = new THREE.Vector3().subVectors(sunlight.position, planetPosition).normalize();
  const ringRotation = rings.getWorldQuaternion(new THREE.Quaternion()).invert();
  sunDirection.applyQuaternion(ringRotation).multiplyScalar(-1);
  uniforms.direction.value.set(sunDirection.x, sunDirection.y).normalize();
}

/* Position each planet label at its projected screen point while in the overview. */
function updatePlanetLabelProjection() {
  if (mode !== "overview") return;
  solarBodies.forEach((body) => {
    const label = planetLabels.get(body.name);
    if (!label) return;
    const screenPosition = body.group.getWorldPosition(new THREE.Vector3()).project(camera);
    label.style.left = `${(screenPosition.x * .5 + .5) * window.innerWidth}px`;
    label.style.top = `${(-screenPosition.y * .5 + .5) * window.innerHeight}px`;
    label.classList.toggle("is-hot", hoveredBody === body);
    label.style.opacity = screenPosition.z > 1 ? "0" : hoveredBody === body ? "1" : ".82";
  });
}

/* === 10. POINTER GESTURES, ACCESSIBLE BUTTONS, AND ARCHIVE NAVIGATION === */
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const cameraTarget = new THREE.Vector3(0, 0, 0);
const clock = new THREE.Clock();
let activeBody = null;
let hoveredBody = null;
let transition = null;
let mode = "overview";
let pointerStart = null;
let lastDragPoint = null;

/* Distinguish a simple planet click from pointer dragging the close-up globe. */
canvas.addEventListener("pointerdown", (event) => {
  pointerStart = { x: event.clientX, y: event.clientY, id: event.pointerId };
  if (mode === "inspection") {
    lastDragPoint = { x: event.clientX, y: event.clientY };
    canvas.setPointerCapture(event.pointerId);
  }
});

/* Rotate the selected planet beneath the stationary camera while the user drags. */
canvas.addEventListener("pointermove", (event) => {
  if (mode === "inspection" && pointerStart && event.pointerId === pointerStart.id && lastDragPoint && activeBody && !transition) {
    const dx = event.clientX - lastDragPoint.x;
    const dy = event.clientY - lastDragPoint.y;
    activeBody.group.rotation.y += dx * .006;
    activeBody.group.rotation.x += dy * .004;
    activeBody.group.rotation.x = THREE.MathUtils.clamp(activeBody.group.rotation.x, -.75, .75);
    lastDragPoint = { x: event.clientX, y: event.clientY };
    return;
  }

  if (mode !== "overview" || transition) return;
  hoveredBody = pickPlanet(event.clientX, event.clientY);
  canvas.style.cursor = hoveredBody ? "pointer" : "grab";
});

/* On pointer release, select a planet only when the gesture did not rotate the globe. */
canvas.addEventListener("pointerup", (event) => {
  if (!pointerStart || event.pointerId !== pointerStart.id) return;
  const moved = Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y);
  if (mode === "overview" && moved < 7) {
    const body = pickPlanet(event.clientX, event.clientY);
    if (body) travelToBody(body);
  }
  pointerStart = null;
  lastDragPoint = null;
});

/* Allow keyboard users to focus planet name labels and enter the same planet travel flow. */
labelLayer.addEventListener("click", (event) => {
  const label = event.target.closest("[data-planet]");
  if (!label || mode !== "overview") return;
  travelToBody(solarBodies.find((body) => body.name === label.dataset.planet));
});

/* Connect the return, archive, card-close, and Escape-key controls to their view state. */
document.querySelector("#backButton").addEventListener("click", returnToSystem);
document.querySelector("#archiveButton").addEventListener("click", () => toggleArchive());
document.querySelector("#closeArchive").addEventListener("click", () => toggleArchive(false));
document.querySelector("#closeMissionCard").addEventListener("click", closeMissionCard);
document.querySelector(".brand").addEventListener("click", (event) => {
  event.preventDefault();
  if (mode === "inspection") returnToSystem();
  else toggleArchive(false);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeMissionCard();
    toggleArchive(false);
    if (mode === "inspection") returnToSystem();
  }
  if (event.key === "Enter" && document.activeElement.matches(".hotspot")) {
    document.activeElement.click();
  }
});

/* === 11. CINEMATIC FRAME LOOP: CAMERA, STARS, LABELS, AND ROTATION === */
/* Advance the eased hyperspace camera route and fade system objects according to warp intensity. */
function updateTravelFrame(now) {
  if (!transition) return;
  const elapsed = Math.min((now - transition.startedAt) / transition.duration, 1);
  const eased = cinematicEase(elapsed);
  const warpIntensity = Math.sin(elapsed * Math.PI) ** .72;
  transition.lastProgress = elapsed;
  camera.position.lerpVectors(transition.startPosition, transition.endPosition, eased);
  cameraTarget.lerpVectors(transition.startTarget, transition.endTarget, eased);
  camera.lookAt(cameraTarget);

  solarBodies.forEach((body) => {
    const targetBody = body === transition.body;
    if (transition.direction === "in") {
      const visibility = targetBody ? 1 : 1 - warpIntensity * .94;
      body.group.scale.setScalar(targetBody ? 1 + warpIntensity * .1 : 1 - warpIntensity * .24);
      setPlanetOpacity(body.group, visibility);
    } else {
      const visibility = targetBody ? 1 - eased * .93 : .08 + eased * .92;
      body.group.scale.setScalar(.2 + eased * .8);
      setPlanetOpacity(body.group, visibility);
    }
  });

  const orbitVisibility = transition.direction === "in" ? 1 - warpIntensity : eased;
  orbitMaterials.forEach((material) => { material.opacity = .18 * orbitVisibility; });
  updateWarpStreaks(warpIntensity);
  if (elapsed >= 1) finishTravel();
}

/* Stretch individual procedural stars into radial line streaks as the ship accelerates. */
function updateWarpStreaks(intensity) {
  if (!starfield) return;
  const { basePositions, streakPositions, streakGeometry, streaks, points, streakCount } = starfield;
  for (let index = 0; index < streakCount; index += 1) {
    const source = index * 3;
    const target = index * 6;
    const x = basePositions[source];
    const y = basePositions[source + 1];
    const z = basePositions[source + 2];
    const length = intensity * (8 + Math.hypot(x, y) * .28);
    const inverseLength = 1 / Math.max(Math.hypot(x, y, 35), 1);
    const dx = x * inverseLength * length;
    const dy = y * inverseLength * length;
    const dz = 35 * inverseLength * length;
    streakPositions[target] = x;
    streakPositions[target + 1] = y;
    streakPositions[target + 2] = z;
    streakPositions[target + 3] = x + dx;
    streakPositions[target + 4] = y + dy;
    streakPositions[target + 5] = z + dz;
  }
  starfield.streakGeometry.attributes.position.needsUpdate = true;
  starfield.streaks.material.opacity = intensity * .9;
  starfield.points.material.opacity = .8 - intensity * .56;
}

/* Render one smooth frame and keep all orbiting worlds and projected DOM points synchronized. */
function animate(now = performance.now()) {
  if (!renderer) return;
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), .05);

  solarBodies.forEach((body) => {
    if (body.isSun) return;
    body.group.rotation.y += body.data.rotation * delta;
    updateSaturnRingShadow(body);
  });

  if (transition) updateTravelFrame(now);
  if (mode === "inspection") updateHotspotProjection();
  else updatePlanetLabelProjection();
  renderer.render(scene, camera);
}

/* === 12. VIEWPORT RESIZE, STARTUP, AND FAIL-SAFE INITIALIZATION === */
/* Keep the perspective camera and device-scaled WebGL renderer fitted to the full browser viewport. */
function handleResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  if (renderer) {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
}

/* Populate the catalog and start rendering only when the WebGL renderer initialized successfully. */
function startExperience() {
  populateArchive();
  if (!renderer) return;
  loadingState.classList.add("is-hidden");
  requestAnimationFrame(animate);
}

window.addEventListener("resize", handleResize);
startExperience();
