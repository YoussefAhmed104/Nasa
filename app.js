/* === 1. THREE.JS, PLANET DATA, AND EXPERIENCE ELEMENTS === */
import * as THREE from "three";
import { moonData, solarSystemData } from "./missionsData.js";

const experience = document.querySelector("#experience");
const canvas = document.querySelector("#solarCanvas");
const labelLayer = document.querySelector("#planetLabels");
const hotspotLayer = document.querySelector("#hotspotLayer");
const missionCard = document.querySelector("#missionCard");
const archivePanel = document.querySelector("#archivePanel");
const loadingState = document.querySelector("#loadingState");
const errorState = document.querySelector("#errorState");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
/* Global orbital pace; raise this multiplier to make the cinematic system revolve slightly faster. */
const ORBIT_SPEED = 0.14;

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
  const reliefCanvas = kind === "mars" ? document.createElement("canvas") : null;
  if (reliefCanvas) {
    reliefCanvas.width = width;
    reliefCanvas.height = height;
    const reliefContext = reliefCanvas.getContext("2d");
    reliefContext.fillStyle = "#808080";
    reliefContext.fillRect(0, 0, width, height);
  }

  context.fillStyle = baseColor;
  context.fillRect(0, 0, width, height);

  if (kind === "earth") {
    paintEarthSurface(context, random, width, height);
  } else if (kind === "mercury") {
    paintMercurySurface(context, random, width, height);
  } else if (kind === "mars") {
    paintMarsSurface(context, reliefCanvas.getContext("2d"), random, width, height);
  } else if (kind === "neptune") {
    paintNeptuneSurface(context, random, width, height);
  } else if (kind === "moon") {
    paintMoonSurface(context, random, width, height);
  } else if (kind === "jupiter" || kind === "saturn" || kind === "venus" || kind === "ice") {
    paintStripedSurface(context, random, kind, width, height);
  } else {
    paintRockySurface(context, random, kind, width, height);
  }

  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer ? renderer.capabilities.getMaxAnisotropy() : 1;
  if (reliefCanvas) {
    const bumpMap = new THREE.CanvasTexture(reliefCanvas);
    bumpMap.colorSpace = THREE.NoColorSpace;
    bumpMap.anisotropy = texture.anisotropy;
    texture.userData.bumpMap = bumpMap;
  }
  return texture;
}

/* Derive a neutral grayscale bump map from the deterministic Mercury albedo canvas. */
function createMercuryBumpMap(colorCanvas) {
  const bumpCanvas = document.createElement("canvas");
  bumpCanvas.width = colorCanvas.width;
  bumpCanvas.height = colorCanvas.height;
  const source = colorCanvas.getContext("2d").getImageData(0, 0, colorCanvas.width, colorCanvas.height);
  const bumpContext = bumpCanvas.getContext("2d");
  const bumpPixels = bumpContext.createImageData(colorCanvas.width, colorCanvas.height);

  for (let pixel = 0; pixel < source.data.length; pixel += 4) {
    const luminance = Math.round(source.data[pixel] * .299 + source.data[pixel + 1] * .587 + source.data[pixel + 2] * .114);
    bumpPixels.data[pixel] = luminance;
    bumpPixels.data[pixel + 1] = luminance;
    bumpPixels.data[pixel + 2] = luminance;
    bumpPixels.data[pixel + 3] = 255;
  }

  bumpContext.putImageData(bumpPixels, 0, 0);
  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.anisotropy = renderer ? renderer.capabilities.getMaxAnisotropy() : 1;
  return bumpMap;
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

/* Paint Mercury's warm regolith, dark basalt plains, dense impact craters, and bright ejecta rays. */
function paintMercurySurface(context, random, width, height) {
  const regolith = context.createLinearGradient(0, 0, width, height);
  regolith.addColorStop(0, "#82796f");
  regolith.addColorStop(.24, "#a99a88");
  regolith.addColorStop(.52, "#716d68");
  regolith.addColorStop(.76, "#b09c85");
  regolith.addColorStop(1, "#77716a");
  context.fillStyle = regolith;
  context.fillRect(0, 0, width, height);

  /* Broad, muted mare-like plains distinguish Mercury from the Moon without hard-edged blotches. */
  for (let plain = 0; plain < 30; plain += 1) {
    const x = random() * width;
    const y = height * (.08 + random() * .84);
    const radiusX = 25 + random() * 95;
    const radiusY = 8 + random() * 29;
    const gradient = context.createRadialGradient(0, 0, radiusX * .12, 0, 0, radiusX);
    gradient.addColorStop(0, plain % 2 ? "rgba(60, 59, 57, .3)" : "rgba(139, 101, 75, .28)");
    gradient.addColorStop(.68, plain % 2 ? "rgba(75, 70, 65, .18)" : "rgba(154, 119, 89, .14)");
    gradient.addColorStop(1, "rgba(110, 93, 79, 0)");
    context.save();
    context.translate(x, y);
    context.rotate((random() - .5) * .22);
    context.scale(1, radiusY / radiusX);
    context.beginPath();
    context.arc(0, 0, radiusX, 0, Math.PI * 2);
    context.fillStyle = gradient;
    context.fill();
    context.restore();
  }

  /* Dense, softly rim-lit craters create high-relief texture without pitch-black artifacts. */
  for (let crater = 0; crater < 520; crater += 1) {
    const x = random() * width;
    const y = height * (.035 + random() * .93);
    const radius = 1.5 + Math.pow(random(), 2.2) * 23;
    const shade = context.createRadialGradient(
      x - radius * .2, y - radius * .24, radius * .08,
      x, y, radius
    );
    shade.addColorStop(0, "rgba(48, 47, 46, .22)");
    shade.addColorStop(.64, "rgba(77, 70, 64, .1)");
    shade.addColorStop(.84, "rgba(221, 204, 179, .3)");
    shade.addColorStop(1, "rgba(151, 129, 106, 0)");
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fillStyle = shade;
    context.fill();
  }

  /* Bright, narrow ejecta spokes around selected impact basins mimic Mercury's ray craters. */
  for (let crater = 0; crater < 13; crater += 1) {
    const x = random() * width;
    const y = height * (.12 + random() * .76);
    const radius = 4 + random() * 8;
    const rayCount = 8 + Math.floor(random() * 10);
    context.save();
    context.translate(x, y);
    context.rotate(random() * Math.PI);
    context.strokeStyle = "rgba(239, 222, 196, .34)";
    context.lineWidth = .7 + random() * .8;
    for (let ray = 0; ray < rayCount; ray += 1) {
      const angle = ray / rayCount * Math.PI * 2 + (random() - .5) * .16;
      const length = radius * (2.8 + random() * 4.5);
      context.beginPath();
      context.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
      context.lineTo(Math.cos(angle) * length, Math.sin(angle) * length);
      context.stroke();
    }

    const craterGlow = context.createRadialGradient(0, 0, 1, 0, 0, radius * 1.8);
    craterGlow.addColorStop(0, "rgba(227, 213, 192, .78)");
    craterGlow.addColorStop(.55, "rgba(180, 160, 137, .38)");
    craterGlow.addColorStop(1, "rgba(115, 98, 82, 0)");
    context.beginPath();
    context.arc(0, 0, radius * 1.8, 0, Math.PI * 2);
    context.fillStyle = craterGlow;
    context.fill();
    context.restore();
  }
}

/* Paint Martian albedo and a matching height field for cratered highlands, volcanic shields, channels, and canyons. */
function paintMarsSurface(context, reliefContext, random, width, height) {
  const rust = context.createLinearGradient(0, 0, width * .82, height);
  rust.addColorStop(0, "#9d4937");
  rust.addColorStop(.24, "#c66b4b");
  rust.addColorStop(.5, "#a9533c");
  rust.addColorStop(.76, "#d27a53");
  rust.addColorStop(1, "#914536");
  context.fillStyle = rust;
  context.fillRect(0, 0, width, height);
  reliefContext.fillStyle = "#808080";
  reliefContext.fillRect(0, 0, width, height);

  /* Shared elliptical gradients layer gradual highland/plains boundaries into both color and relief maps. */
  const paintField = (target, x, y, radiusX, radiusY, rotation, stops) => {
    target.save();
    target.translate(x, y);
    target.rotate(rotation);
    target.scale(1, radiusY / radiusX);
    const gradient = target.createRadialGradient(0, 0, radiusX * .04, 0, 0, radiusX);
    stops.forEach(([position, color]) => gradient.addColorStop(position, color));
    target.beginPath();
    target.arc(0, 0, radiusX, 0, Math.PI * 2);
    target.fillStyle = gradient;
    target.fill();
    target.restore();
  };

  /* Iron-oxide dust seas blend with darker basaltic highlands through wide, feathered albedo provinces. */
  for (let province = 0; province < 34; province += 1) {
    const x = random() * width;
    const y = height * (.12 + random() * .76);
    const radiusX = 35 + random() * 105;
    const radiusY = 12 + random() * 38;
    const rotation = (random() - .5) * .24;
    const dark = province % 2 === 0;
    paintField(context, x, y, radiusX, radiusY, rotation, [
      [0, dark ? "rgba(71, 48, 43, .24)" : "rgba(229, 164, 119, .25)"],
      [.56, dark ? "rgba(91, 53, 44, .16)" : "rgba(215, 143, 101, .16)"],
      [1, "rgba(150, 73, 52, 0)"]
    ]);
    paintField(reliefContext, x, y, radiusX, radiusY, rotation, [
      [0, dark ? "rgb(117, 117, 117)" : "rgb(139, 139, 139)"],
      [.72, dark ? "rgb(124, 124, 124)" : "rgb(135, 135, 135)"],
      [1, "rgb(128, 128, 128)"]
    ]);
  }

  /* Shield volcanoes use raised flanks and a depressed caldera rather than flat circular symbols. */
  const volcanoes = [
    [.31, .37, 45, 24],
    [.39, .42, 31, 19],
    [.48, .43, 28, 17],
    [.72, .62, 24, 16]
  ];
  volcanoes.forEach(([u, v, radiusX, radiusY]) => {
    const x = u * width;
    const y = v * height;
    paintField(context, x, y, radiusX * 2.8, radiusY * 2.8, -.08, [
      [0, "rgba(91, 48, 41, .34)"],
      [.48, "rgba(132, 70, 50, .2)"],
      [.8, "rgba(220, 147, 103, .32)"],
      [1, "rgba(137, 65, 48, 0)"]
    ]);
    paintField(reliefContext, x, y, radiusX * 2.8, radiusY * 2.8, -.08, [
      [0, "rgb(111, 111, 111)"],
      [.48, "rgb(153, 153, 153)"],
      [.78, "rgb(145, 145, 145)"],
      [1, "rgb(128, 128, 128)"]
    ]);
    context.beginPath();
    context.ellipse(x, y, radiusX * .34, radiusY * .34, -.08, 0, Math.PI * 2);
    context.strokeStyle = "rgba(79, 52, 44, .2)";
    context.lineWidth = .7;
    context.stroke();
    reliefContext.beginPath();
    reliefContext.ellipse(x, y, radiusX * .34, radiusY * .34, -.08, 0, Math.PI * 2);
    reliefContext.strokeStyle = "rgb(101, 101, 101)";
    reliefContext.lineWidth = 1.5;
    reliefContext.stroke();
  });

  /* Distinct highlands have eroded ridges; shallow relief contrast preserves a seamless transition to plains. */
  for (let ridge = 0; ridge < 42; ridge += 1) {
    const x = random() * width;
    const y = height * (.14 + random() * .72);
    const length = 18 + random() * 95;
    const bend = (random() - .5) * 20;
    [context, reliefContext].forEach((target, targetIndex) => {
      target.beginPath();
      target.moveTo(x - length, y + bend);
      target.quadraticCurveTo(x, y - bend * 1.5, x + length, y);
      target.strokeStyle = targetIndex === 0 ? "rgba(237, 177, 130, .2)" : "rgb(139, 139, 139)";
      target.lineWidth = targetIndex === 0 ? 1 + random() * 2 : 2 + random() * 2;
      target.lineCap = "round";
      target.stroke();
    });
  }

  /* Crater bowls are height depressions bordered by raised rims; albedo shadows stay soft and non-black. */
  const paintCrater = (x, y, radius, rayCrater = false) => {
    const craterColor = context.createRadialGradient(
      x - radius * .22, y - radius * .24, radius * .08,
      x, y, radius * 1.2
    );
    craterColor.addColorStop(0, rayCrater ? "rgba(83, 58, 49, .25)" : "rgba(74, 49, 43, .2)");
    craterColor.addColorStop(.56, "rgba(104, 61, 48, .14)");
    craterColor.addColorStop(.78, "rgba(226, 164, 121, .27)");
    craterColor.addColorStop(.91, "rgba(116, 67, 51, .12)");
    craterColor.addColorStop(1, "rgba(137, 71, 51, 0)");
    context.beginPath();
    context.arc(x, y, radius * 1.2, 0, Math.PI * 2);
    context.fillStyle = craterColor;
    context.fill();

    const craterHeight = reliefContext.createRadialGradient(x, y, radius * .08, x, y, radius * 1.2);
    craterHeight.addColorStop(0, "rgb(91, 91, 91)");
    craterHeight.addColorStop(.58, "rgb(103, 103, 103)");
    craterHeight.addColorStop(.76, "rgb(185, 185, 185)");
    craterHeight.addColorStop(.87, "rgb(158, 158, 158)");
    craterHeight.addColorStop(1, "rgb(128, 128, 128)");
    reliefContext.beginPath();
    reliefContext.arc(x, y, radius * 1.2, 0, Math.PI * 2);
    reliefContext.fillStyle = craterHeight;
    reliefContext.fill();

    if (rayCrater) {
      const rayCount = 6 + Math.floor(random() * 5);
      context.save();
      context.translate(x, y);
      context.strokeStyle = "rgba(235, 194, 158, .18)";
      context.lineWidth = .45 + radius * .012;
      for (let ray = 0; ray < rayCount; ray += 1) {
        const angle = ray / rayCount * Math.PI * 2 + (random() - .5) * .14;
        const length = radius * (1.7 + random() * 1.8);
        context.beginPath();
        context.moveTo(Math.cos(angle) * radius * .9, Math.sin(angle) * radius * .9);
        context.lineTo(Math.cos(angle) * length, Math.sin(angle) * length);
        context.stroke();
      }
      context.restore();
    }
  };

  for (let crater = 0; crater < 390; crater += 1) {
    const x = random() * width;
    const y = height * (.035 + random() * .93);
    const radius = 1.5 + Math.pow(random(), 2.1) * 17;
    paintCrater(x, y, radius);
  }
  for (let crater = 0; crater < 7; crater += 1) {
    paintCrater(random() * width, height * (.08 + random() * .84), 7 + random() * 9, true);
  }

  /* Ancient fluvial channels trace meandering lowlands with subtly raised banks in the relief map. */
  for (let channel = 0; channel < 4; channel += 1) {
    const startX = random() * width;
    const centerY = height * (.2 + random() * .6);
    const span = 100 + random() * 240;
    const points = [];
    let verticalDrift = 0;
    for (let step = 0; step <= 12; step += 1) {
      const x = startX + span * step / 12;
      verticalDrift = THREE.MathUtils.clamp(verticalDrift + (random() - .5) * 9, -28, 28);
      const y = centerY + verticalDrift;
      points.push([x, y]);
    }
    [context, reliefContext].forEach((target, targetIndex) => {
      target.beginPath();
      target.moveTo(points[0][0], points[0][1]);
      for (let point = 1; point < points.length - 1; point += 1) {
        const midX = (points[point][0] + points[point + 1][0]) * .5;
        const midY = (points[point][1] + points[point + 1][1]) * .5;
        target.quadraticCurveTo(points[point][0], points[point][1], midX, midY);
      }
      target.strokeStyle = targetIndex === 0 ? "rgba(100, 54, 43, .27)" : "rgb(109, 109, 109)";
      target.lineWidth = targetIndex === 0 ? 2 : 3.5;
      target.lineCap = "round";
      target.stroke();
      if (targetIndex === 0) {
        target.strokeStyle = "rgba(230, 160, 113, .2)";
        target.lineWidth = .7;
        target.stroke();
      }
    });
  }

  /* Valles Marineris is a long, gently winding rift with elevated canyon walls and a recessed floor. */
  const canyonY = height * .53;
  const canyonPath = (target, widthScale, color) => {
    target.beginPath();
    target.moveTo(width * .12, canyonY + 5);
    target.bezierCurveTo(width * .3, canyonY - 19, width * .38, canyonY + 15, width * .53, canyonY - 4);
    target.bezierCurveTo(width * .68, canyonY - 24, width * .78, canyonY + 13, width * .9, canyonY - 5);
    target.strokeStyle = color;
    target.lineWidth = widthScale;
    target.lineCap = "round";
    target.stroke();
  };
  canyonPath(context, 7, "rgba(83, 45, 39, .24)");
  canyonPath(context, 2.5, "rgba(61, 42, 39, .16)");
  canyonPath(context, 1, "rgba(226, 150, 107, .16)");
  canyonPath(reliefContext, 18, "rgb(148, 148, 148)");
  canyonPath(reliefContext, 8, "rgb(96, 96, 96)");
  canyonPath(reliefContext, 1.5, "rgb(164, 164, 164)");

  /* Thin, irregular polar deposits fade into high-latitude dust instead of forming hard white bands. */
  [-1, 1].forEach((pole) => {
    const capHeight = height * .045;
    const edge = [];
    for (let x = 0; x <= width; x += 16) {
      const waviness = Math.sin(x * .018 + pole) * 5 + Math.sin(x * .047) * 2;
      edge.push([x, pole < 0 ? capHeight + waviness : height - capHeight + waviness]);
    }
    [context, reliefContext].forEach((target, targetIndex) => {
      const cap = target.createLinearGradient(0, pole < 0 ? 0 : height, 0, pole < 0 ? capHeight * 1.8 : height - capHeight * 1.8);
      cap.addColorStop(0, targetIndex === 0 ? "rgba(246, 228, 204, .86)" : "rgb(151, 151, 151)");
      cap.addColorStop(.58, targetIndex === 0 ? "rgba(232, 214, 193, .72)" : "rgb(144, 144, 144)");
      cap.addColorStop(1, targetIndex === 0 ? "rgba(227, 203, 180, 0)" : "rgb(128, 128, 128)");
      target.beginPath();
      if (pole < 0) {
        target.moveTo(0, 0);
        target.lineTo(width, 0);
        edge.slice().reverse().forEach(([x, y]) => target.lineTo(x, y));
      } else {
        target.moveTo(0, height);
        target.lineTo(width, height);
        edge.slice().reverse().forEach(([x, y]) => target.lineTo(x, y));
      }
      target.closePath();
      target.fillStyle = cap;
      target.fill();
    });
  });
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

/* Paint Neptune with softly blended azure bands and high-altitude streaks, avoiding harsh dark blotches. */
function paintNeptuneSurface(context, random, width, height) {
  const ocean = context.createLinearGradient(0, 0, width * .18, height);
  ocean.addColorStop(0, "#10378f");
  ocean.addColorStop(.28, "#245dcc");
  ocean.addColorStop(.54, "#164ab6");
  ocean.addColorStop(.78, "#2a66d0");
  ocean.addColorStop(1, "#113783");
  context.fillStyle = ocean;
  context.fillRect(0, 0, width, height);

  for (let band = 0; band < 18; band += 1) {
    const y = band * (height / 18) + (random() - .5) * 13;
    const bandGradient = context.createLinearGradient(0, y - 18, 0, y + 22);
    bandGradient.addColorStop(0, "rgba(71, 139, 232, 0)");
    bandGradient.addColorStop(.45, band % 3 === 0 ? "rgba(112, 174, 245, .2)" : "rgba(80, 146, 226, .12)");
    bandGradient.addColorStop(1, "rgba(22, 70, 168, 0)");
    context.fillStyle = bandGradient;
    context.fillRect(0, y - 18, width, 40);
  }

  context.globalAlpha = .18;
  for (let streak = 0; streak < 230; streak += 1) {
    const x = random() * width;
    const y = random() * height;
    context.beginPath();
    context.ellipse(x, y, 8 + random() * 76, .6 + random() * 2.2, (random() - .5) * .09, 0, Math.PI * 2);
    context.strokeStyle = streak % 4 === 0 ? "#d9efff" : "#75b5f5";
    context.lineWidth = .5 + random() * 1.3;
    context.stroke();
  }
  context.globalAlpha = 1;
}

/* Paint lunar maria and gently shaded crater relief in soft gray tones without pitch-black texture spots. */
function paintMoonSurface(context, random, width, height) {
  const lunarBase = context.createLinearGradient(0, 0, width, height);
  lunarBase.addColorStop(0, "#b5b5b2");
  lunarBase.addColorStop(.52, "#989a9d");
  lunarBase.addColorStop(1, "#c1bfba");
  context.fillStyle = lunarBase;
  context.fillRect(0, 0, width, height);

  const maria = [[.2, .34, .12, .17], [.46, .55, .16, .12], [.72, .3, .11, .13], [.84, .68, .14, .11]];
  maria.forEach(([x, y, radiusX, radiusY]) => {
    const centerX = x * width;
    const centerY = y * height;
    context.save();
    context.translate(centerX, centerY);
    context.scale(1, radiusY / radiusX);
    const gradient = context.createRadialGradient(0, 0, 2, 0, 0, radiusX * width);
    gradient.addColorStop(0, "rgba(82, 86, 93, .3)");
    gradient.addColorStop(.72, "rgba(112, 115, 120, .2)");
    gradient.addColorStop(1, "rgba(127, 129, 133, 0)");
    context.beginPath();
    context.arc(0, 0, radiusX * width, 0, Math.PI * 2);
    context.fillStyle = gradient;
    context.fill();
    context.restore();
  });

  for (let crater = 0; crater < 360; crater += 1) {
    const x = random() * width;
    const y = random() * height;
    const radius = 2 + random() * 21;
    const craterShade = context.createRadialGradient(x - radius * .2, y - radius * .24, 1, x, y, radius);
    craterShade.addColorStop(0, "rgba(77, 80, 86, .16)");
    craterShade.addColorStop(.68, "rgba(127, 129, 132, .09)");
    craterShade.addColorStop(.9, "rgba(222, 220, 215, .28)");
    craterShade.addColorStop(1, "rgba(133, 135, 137, .04)");
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fillStyle = craterShade;
    context.fill();
  }
}

/* Add crater rims, shadowed basins, and fine surface variation to rocky worlds. */
function paintRockySurface(context, random, kind, width, height) {
  const colors = ["#bba79a", "#8d8580", "#d2bda5", "#827872", "#a3958b"];
  const shadowColor = kind === "mars" ? "rgba(27, 21, 28, .4)" : "rgba(46, 44, 49, .24)";
  for (let crater = 0; crater < 260; crater += 1) {
    const x = random() * width;
    const y = random() * height;
    const radius = 2 + random() * (kind === "mars" ? 22 : 36);
    const shade = context.createRadialGradient(x - radius * .22, y - radius * .26, 1, x, y, radius);
    shade.addColorStop(0, shadowColor);
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
  for (let radius = 205; radius < 256; radius += 1) {
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
  const divisionRadius = size * .9;
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

/* === 4. LIVING PARALLAX STARFIELD AND WARP-LIGHT GEOMETRY === */
/* Create three animated depth layers and a separate line buffer that stretches during camera travel. */
function createStarfield() {
  const layers = [
    { count: 2600, depth: [-22, -52], driftX: .0007, driftY: .00025, size: [.45, 1.15] },
    { count: 1900, depth: [-54, -91], driftX: -.00035, driftY: .00055, size: [.34, .9] },
    { count: 1300, depth: [-94, -138], driftX: .00018, driftY: -.00022, size: [.28, .72] }
  ].map((layer, layerIndex) => {
    const positions = new Float32Array(layer.count * 3);
    const phases = new Float32Array(layer.count);
    const speeds = new Float32Array(layer.count);
    const sizes = new Float32Array(layer.count);
    for (let index = 0; index < layer.count; index += 1) {
      const offset = index * 3;
      positions[offset] = (Math.random() - .5) * 170;
      positions[offset + 1] = (Math.random() - .5) * 105;
      positions[offset + 2] = layer.depth[0] + Math.random() * (layer.depth[1] - layer.depth[0]);
      phases[index] = Math.random() * Math.PI * 2;
      speeds[index] = .45 + Math.random() * 1.8;
      sizes[index] = layer.size[0] + Math.random() * (layer.size[1] - layer.size[0]);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));
    geometry.setAttribute("aSpeed", new THREE.BufferAttribute(speeds, 1));
    geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: .82 },
        uColor: { value: new THREE.Color(layerIndex === 1 ? 0xb9c9ff : 0xd1c4ff) }
      },
      vertexShader: `
        attribute float aPhase;
        attribute float aSpeed;
        attribute float aSize;
        uniform float uTime;
        varying float vTwinkle;
        void main() {
          vTwinkle = 0.72 + 0.28 * sin(uTime * aSpeed + aPhase);
          vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * (180.0 / max(1.0, -viewPosition.z)) * (0.82 + vTwinkle * 0.42);
          gl_Position = projectionMatrix * viewPosition;
        }
      `,
      fragmentShader: `
        uniform float uOpacity;
        uniform vec3 uColor;
        varying float vTwinkle;
        void main() {
          float radius = length(gl_PointCoord - vec2(0.5));
          float softEdge = 1.0 - smoothstep(0.08, 0.5, radius);
          gl_FragColor = vec4(uColor * (0.7 + vTwinkle * 0.3), softEdge * vTwinkle * uOpacity);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false
    });
    const points = new THREE.Points(geometry, material);
    points.rotationSpeedX = layer.driftX;
    points.rotationSpeedY = layer.driftY;
    points.frustumCulled = false;
    scene.add(points);
    return { points, material };
  });

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
  return { layers, streaks, streakGeometry, basePositions, streakPositions, streakCount };
}

const starfield = renderer ? createStarfield() : null;

/* === 5. SUN, ORBITAL PATHS, AND CLICKABLE PLANET MESHES === */
/* Build each mapped sphere, create its elliptical orbit, and attach stable data for raycasting. */
const solarBodies = [];
const moonSystems = [];
const pickableMeshes = [];
const orbitMaterials = [];
const planetLabels = new Map();
const planetPins = new Map();
const glowTexture = createGlowTexture();
let earthBody = null;
let moonBody = null;

function createSun() {
  const sunGroup = new THREE.Group();
  sunGroup.name = "Sun";
  sunGroup.position.set(0, 0, 0);

  // the sun color
  const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffea9f, transparent: true, opacity: 1 });
  const sunMesh = new THREE.Mesh(new THREE.SphereGeometry(3.2, 64, 48), sunMaterial);
  sunMesh.userData.body = { name: "Sun", descriptor: "G2V STAR", distance: "THE HEART OF OUR SOLAR SYSTEM", missions: [] };
  sunGroup.add(sunMesh);
  pickableMeshes.push(sunMesh);

  const corona = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture, color: 0xffaa33, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending }));
  corona.scale.set(22, 22, 1);
  sunGroup.add(corona);

  const outerGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture, color: 0xffcc66, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending }));
  outerGlow.scale.set(38, 38, 1);
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

/* Add the Moon on a face-on orbital plane with only its real 5.14-degree ecliptic inclination. */
function createEarthMoon(earth, group) {
  const moonRoot = new THREE.Group();
  const orbitRadius = earth.radius * 1.35;
  const moonRadius = earth.radius * .24;
  moonRoot.position.copy(group.position);

  const orbitPlane = new THREE.Group();
  /* The orbit geometry is drawn in XY; a small X rotation adds the lunar inclination, not a vertical orbit. */
  orbitPlane.rotation.set(THREE.MathUtils.degToRad(5.14), 0, 0);
  moonRoot.add(orbitPlane);

  const orbitPoints = [];
  for (let index = 0; index <= 128; index += 1) {
    const angle = index / 128 * Math.PI * 2;
    orbitPoints.push(new THREE.Vector3(Math.cos(angle) * orbitRadius, Math.sin(angle) * orbitRadius * .94, 0));
  }
  const orbitGeometry = new THREE.BufferGeometry().setFromPoints(orbitPoints);
  const orbitMaterial = new THREE.LineBasicMaterial({ color: 0xb9a9e3, transparent: true, opacity: .32, depthWrite: false });
  const orbitLine = new THREE.LineLoop(orbitGeometry, orbitMaterial);
  orbitPlane.add(orbitLine);

  const orbitPivot = new THREE.Group();
  /* Keep the orbital pivot level with no added pitch or roll beyond the plane's 5.14-degree inclination. */
  orbitPivot.rotation.set(0, 0, 0);
  orbitPlane.add(orbitPivot);

  const moonSpinGroup = new THREE.Group();
  moonSpinGroup.position.x = orbitRadius;
  orbitPivot.add(moonSpinGroup);

  const moonSurfaceData = { ...moonData, radius: moonRadius };
  const moonTexture = createPlanetTexture("moon", "#a9aaad", 1287);
  const moonMaterial = new THREE.MeshStandardMaterial({ map: moonTexture, color: 0xe0dedc, roughness: .98, metalness: 0, transparent: true, depthWrite: false });
  const moonMesh = new THREE.Mesh(new THREE.SphereGeometry(moonRadius, 48, 36), moonMaterial);
  moonSpinGroup.add(moonMesh);

  scene.add(moonRoot);
  createPlanetLabel(moonSurfaceData, solarSystemData.length);
  createPlanetPins(moonSurfaceData, moonMesh);
  pickableMeshes.push(moonMesh);
  moonSystems.push({ root: moonRoot, orbit: orbitPivot, moon: moonMesh, orbitLine, orbitSpeed: .075, axialSpeed: .055 });
  return {
    name: moonSurfaceData.name,
    group: moonSpinGroup,
    mesh: moonMesh,
    radius: moonRadius,
    data: moonSurfaceData,
    index: solarSystemData.length,
    isMoon: true,
    root: moonRoot,
    orbitLine,
    earthGroup: group
  };
}

/* Construct a planet group from the catalog and register a DOM label and raycast target. */
function createPlanet(data, index) {
  createOrbitPath(data.orbit);

  const group = new THREE.Group();
  group.name = data.name;
  const angle = THREE.MathUtils.degToRad(data.angle);
  group.position.set(Math.cos(angle) * data.orbit, Math.sin(angle) * data.orbit * .58, .12 + index * .035);

  const texture = createPlanetTexture(data.texture, data.color, 210 + index * 71);
  /* Mercury and Mars use relief maps: Mercury derives one from albedo, Mars paints one with its geology. */
  const bumpMap = data.texture === "mercury"
    ? createMercuryBumpMap(texture.image)
    : texture.userData.bumpMap || null;
  const material = new THREE.MeshStandardMaterial({
    map: texture,
    bumpMap,
    bumpScale: data.texture === "mars" ? .055 : data.texture === "mercury" ? .075 : 0,
    color: 0xffffff,
    roughness: data.texture === "mars" ? .96 : data.texture === "mercury" ? 1 : data.texture === "ice" ? .48 : .91,
    metalness: data.texture === "mars" || data.texture === "mercury" ? 0 : .015,
    transparent: true,
    opacity: 1
  });
  /* Mercury has no atmosphere: this crisp direct-light terminator offsets the scene's ambient fill. */
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(data.radius, 64, 48), material);
  mesh.userData.body = data;
  mesh.renderOrder = 0;
  /* Saturn's globe spins independently so its ring plane keeps a stable axial tilt. */
  const spinGroup = data.hasRings ? new THREE.Group() : group;
  if (data.hasRings) group.add(spinGroup);
  spinGroup.add(mesh);
  if (data.texture === "mercury") {
    const terminator = createMercuryTerminator(data.radius);
    spinGroup.add(terminator);
    group.userData.terminator = terminator;
  } else if (data.texture === "mars") {
    /* A faint limb-only haze suggests Mars' thin dusty atmosphere without veiling surface relief. */
    const atmosphere = createMarsAtmosphere(data.radius);
    spinGroup.add(atmosphere);
    group.userData.atmosphere = atmosphere;
  }

  if (data.hasRings) {
    const ringMaps = createSaturnRingMaps();
    /* Explicit compact radii keep the annulus outside Saturn while preserving its full catalog radius. */
    const ringGeometry = new THREE.RingGeometry(data.radius * 1.2, data.radius * 1.5, 256, 1);
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
    /* Keep this separate child at unit scale so the ring radii stay exact and the globe is untouched. */
    rings.scale.set(1, 1, 1);
    /* Reset all ring axes explicitly: 30 degrees of X tilt and a 15-degree in-plane diagonal roll. */
    rings.rotation.set(Math.PI / 6, 0, Math.PI / 12);
    rings.updateMatrix();
    rings.renderOrder = 1;
    rings.userData.shadowUniforms = shadowUniforms;
    group.add(rings);
    group.userData.ringMesh = rings;
  }

  scene.add(group);
  const body = {
    name: data.name,
    group,
    spinGroup,
    mesh,
    radius: data.radius,
    data,
    isSun: false,
    index,
    orbitAngle: angle,
    orbitSpeed: ORBIT_SPEED * .1 * Math.pow(8 / data.orbit, 1.5)
  };
  solarBodies.push(body);
  pickableMeshes.push(mesh);
  createPlanetLabel(data, index);
  createPlanetPins(data, spinGroup);
  if (data.name === "Earth") {
    earthBody = body;
    moonBody = createEarthMoon(data, group);
  }
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
    const anchorRadius = data.radius * (mission.altitude || 1.018);
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

/* Resolve a planet or nested Moon mesh to its current world-space camera target. */
function getBodyWorldPosition(body) {
  return body.group.getWorldPosition(new THREE.Vector3());
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
    if (moonBody) {
      moonBody.root.visible = true;
      setPlanetOpacity(moonBody.group, direction === "earth" ? 1 : .08);
    }
    orbitMaterials.forEach((material) => { material.opacity = .015; });
  }

  const startPosition = camera.position.clone();
  const startTarget = cameraTarget.clone();
  const bodyPosition = getBodyWorldPosition(body);
  const earthPosition = earthBody ? getBodyWorldPosition(earthBody) : overviewTarget;
  const endPosition = isEntering
    ? bodyPosition.clone().add(new THREE.Vector3(0, 0, body.radius * 3.55))
    : direction === "earth"
      ? earthPosition.clone().add(new THREE.Vector3(0, 0, earthBody.radius * 3.55))
      : overviewPosition;
  const endTarget = isEntering ? bodyPosition : direction === "earth" ? earthPosition : overviewTarget;
  const duration = prefersReducedMotion ? 580 : 2050;

  experience.classList.add("is-travelling");
  mode = "travelling";
  const destinationText = body.name.toUpperCase();
  document.querySelector("#warpDestination").textContent = destinationText;
  document.querySelector("#navLocation").textContent = isEntering
    ? `ROUTE TO ${destinationText}`
    : direction === "earth" ? "RETURNING TO EARTH" : "RETURNING TO SOL";

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
      if (material.uniforms && material.uniforms.uOpacity) material.uniforms.uOpacity.value = opacity;
    });
  });
}

/* Update the selected-world HUD and its context-sensitive return button. */
function setInspectionInterface(body) {
  document.querySelector("#navLocation").textContent = `${body.name.toUpperCase()} / SURFACE ARCHIVE`;
  document.querySelector("#hudInstruction b").textContent = "ROTATE TO INSPECT";
  document.querySelector("#hudInstruction small").textContent = "Select a glowing point to open its mission file";
  document.querySelector("#hudArtifactCount").textContent = `${body.data.missions.length} SURFACE ARTIFACT${body.data.missions.length === 1 ? "" : "S"}`;
  document.querySelector("#planetName").textContent = body.name.toUpperCase();
  document.querySelector("#planetIndex").textContent = body.isMoon
    ? "EARTH SYSTEM / NATURAL SATELLITE"
    : body.isSun ? "SOL / G2V STAR" : `WORLD ${String(body.index + 1).padStart(2, "0")} / ${body.data.category}`;
  document.querySelector("#planetDescriptor").innerHTML = `${body.data.descriptor} <span>·</span> ${body.data.distance}`;
  const backButton = document.querySelector("#backButton");
  backButton.innerHTML = `<span aria-hidden="true">←</span> ${body.isMoon ? "BACK TO EARTH" : "SOLAR SYSTEM"}`;
  backButton.setAttribute("aria-label", body.isMoon ? "Back to Earth" : "Back to Solar System");
  showPlanetPins(body.name);
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
    if (moonBody) {
      moonBody.root.visible = activeBody.isMoon || activeBody.name === "Earth";
      moonBody.group.visible = true;
      moonBody.group.scale.setScalar(1);
      setPlanetOpacity(moonBody.root, 1);
      moonBody.orbitLine.visible = !activeBody.isMoon;
      moonBody.orbitLine.material.opacity = .32;
    }
    mode = "inspection";
    experience.classList.add("is-inspection");
    setInspectionInterface(activeBody);
  } else if (direction === "earth") {
    solarBodies.forEach((body) => {
      const isEarth = body === earthBody;
      body.group.visible = isEarth;
      body.group.scale.setScalar(1);
      setPlanetOpacity(body.group, 1);
    });
    moonBody.root.visible = true;
    moonBody.group.visible = true;
    moonBody.group.scale.setScalar(1);
    setPlanetOpacity(moonBody.root, 1);
    moonBody.orbitLine.visible = true;
    moonBody.orbitLine.material.opacity = .32;
    orbitMaterials.forEach((material) => { material.opacity = 0; });
    activeBody = earthBody;
    mode = "inspection";
    experience.classList.add("is-inspection");
    setInspectionInterface(activeBody);
  } else {
    solarBodies.forEach((body) => {
      body.group.visible = true;
      body.group.scale.setScalar(1);
      setPlanetOpacity(body.group, 1);
    });
    if (moonBody) {
      moonBody.root.visible = true;
      moonBody.group.visible = true;
      moonBody.group.scale.setScalar(1);
      setPlanetOpacity(moonBody.root, 1);
      moonBody.orbitLine.visible = true;
      moonBody.orbitLine.material.opacity = .32;
    }
    orbitMaterials.forEach((material) => { material.opacity = .18; });
    mode = "overview";
    experience.classList.remove("is-inspection");
    document.querySelector("#navLocation").textContent = "SOL SYSTEM";
    document.querySelector("#hudInstruction b").textContent = "SELECT A WORLD";
    document.querySelector("#hudInstruction small").textContent = "Click a planet or its Moon to travel through space";
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
  if (missionCard.contains(document.activeElement)) document.activeElement.blur();
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
  const fromEarthInspection = mode === "inspection" && activeBody === earthBody && body === moonBody;
  if ((mode !== "overview" && !fromEarthInspection) || !body) return;
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
  beginTravel(activeBody.isMoon ? "earth" : "out", activeBody);
}

/* Raycast the pointer against sphere meshes and highlight or select the nearest planet. */
function pickPlanet(clientX, clientY) {
  pointer.set((clientX / window.innerWidth) * 2 - 1, -(clientY / window.innerHeight) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(pickableMeshes, false);
  const hit = hits.find((intersection) => {
    const body = solarBodies.find((item) => item.mesh === intersection.object)
      || (moonBody && moonBody.mesh === intersection.object ? moonBody : null);
    if (mode === "overview") return Boolean(body);
    return mode === "inspection" && activeBody === earthBody && (body === earthBody || body === moonBody);
  });
  if (!hit) return null;
  return solarBodies.find((body) => body.mesh === hit.object)
    || (moonBody && moonBody.mesh === hit.object ? moonBody : null);
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

/* Add a thin shader overlay that suppresses ambient fill on Mercury's unlit hemisphere. */
function createMercuryTerminator(radius) {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uLightDirection: { value: new THREE.Vector3(0, 0, 1) },
      uOpacity: { value: 1 }
    },
    vertexShader: `
      varying vec3 vWorldNormal;
      void main() {
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uLightDirection;
      uniform float uOpacity;
      varying vec3 vWorldNormal;
      void main() {
        float sunFacing = dot(normalize(vWorldNormal), normalize(uLightDirection));
        float nightSide = 1.0 - smoothstep(-0.025, 0.045, sunFacing);
        gl_FragColor = vec4(vec3(0.002, 0.002, 0.003), nightSide * 0.97 * uOpacity);
      }
    `,
    transparent: true,
    depthTest: true,
    depthWrite: false,
    toneMapped: false
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.001, 64, 48), material);
  mesh.renderOrder = 1;
  return mesh;
}

/* Keep the terminator aligned to direct sunlight as Mercury rotates and moves around the Sun. */
function updateMercuryTerminator(body) {
  const terminator = body.group.userData.terminator;
  if (!terminator) return;
  const planetPosition = body.group.getWorldPosition(new THREE.Vector3());
  terminator.material.uniforms.uLightDirection.value
    .subVectors(sunlight.position, planetPosition)
    .normalize();
}

/* Render a very thin orange atmospheric limb glow with a Fresnel response. */
function createMarsAtmosphere(radius) {
  const material = new THREE.ShaderMaterial({
    uniforms: { uOpacity: { value: 1 } },
    vertexShader: `
      varying vec3 vWorldNormal;
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: `
      uniform float uOpacity;
      varying vec3 vWorldNormal;
      varying vec3 vWorldPosition;
      void main() {
        vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
        float limb = 1.0 - max(dot(normalize(vWorldNormal), viewDirection), 0.0);
        float haze = pow(limb, 2.4) * 0.18 * uOpacity;
        gl_FragColor = vec4(vec3(0.78, 0.29, 0.12), haze);
      }
    `,
    transparent: true,
    depthTest: true,
    depthWrite: false,
    side: THREE.FrontSide,
    toneMapped: false
  });
  const atmosphere = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.022, 64, 48), material);
  atmosphere.renderOrder = 2;
  return atmosphere;
}

/* Position each planet label at its projected screen point while in the overview. */
function updatePlanetLabelProjection() {
  if (mode !== "overview") return;
  const labelBodies = moonBody ? [...solarBodies, moonBody] : solarBodies;
  labelBodies.forEach((body) => {
    const label = planetLabels.get(body.name);
    if (!label) return;
    const screenPosition = body.group.getWorldPosition(new THREE.Vector3()).project(camera);
    label.style.left = `${(screenPosition.x * .5 + .5) * window.innerWidth}px`;
    label.style.top = `${(-screenPosition.y * .5 + .5) * window.innerHeight}px`;
    label.classList.toggle("is-hot", hoveredBody === body);
    const visible = screenPosition.z > -1 && screenPosition.z < 1;
    label.style.opacity = !visible ? "0" : hoveredBody === body ? "1" : ".82";
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
    const spinGroup = activeBody.spinGroup || activeBody.group;
    spinGroup.rotation.y += dx * .006;
    spinGroup.rotation.x += dy * .004;
    spinGroup.rotation.x = THREE.MathUtils.clamp(spinGroup.rotation.x, -.75, .75);
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
  } else if (mode === "inspection" && activeBody === earthBody && moved < 7) {
    const body = pickPlanet(event.clientX, event.clientY);
    if (body === moonBody) travelToBody(moonBody);
  }
  pointerStart = null;
  lastDragPoint = null;
});

/* Allow keyboard users to focus planet name labels and enter the same planet travel flow. */
labelLayer.addEventListener("click", (event) => {
  const label = event.target.closest("[data-planet]");
  if (!label || mode !== "overview") return;
  const body = solarBodies.find((item) => item.name === label.dataset.planet)
    || (moonBody && moonBody.name === label.dataset.planet ? moonBody : null);
  travelToBody(body);
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
    if (transition.direction === "in") {
      const targetBody = body === transition.body;
      const visibility = targetBody ? 1 : 1 - warpIntensity * .94;
      body.group.scale.setScalar(targetBody ? 1 + warpIntensity * .1 : 1 - warpIntensity * .24);
      setPlanetOpacity(body.group, visibility);
    } else {
      const returningToEarth = transition.direction === "earth";
      const sourceBody = !returningToEarth && body === transition.body;
      const visibility = sourceBody ? 1 - eased * .93 : .08 + eased * .92;
      body.group.scale.setScalar(.2 + eased * .8);
      setPlanetOpacity(body.group, visibility);
    }
  });

  if (moonBody) {
    moonBody.root.visible = true;
    if (transition.direction === "in") {
      const moonIsTarget = transition.body === moonBody;
      const earthIsTarget = transition.body === earthBody;
      const opacity = moonIsTarget || earthIsTarget ? 1 : 1 - warpIntensity * .94;
      moonBody.group.scale.setScalar(moonIsTarget ? 1 + warpIntensity * .1 : 1);
      setPlanetOpacity(moonBody.root, opacity);
      moonBody.orbitLine.material.opacity = .32 * (1 - warpIntensity);
    } else if (transition.direction === "earth") {
      setPlanetOpacity(moonBody.root, 1 - eased * .93);
      moonBody.orbitLine.material.opacity = .32 * (1 - eased);
    } else {
      setPlanetOpacity(moonBody.root, .08 + eased * .92);
      moonBody.orbitLine.material.opacity = .32 * eased;
    }
  }

  const orbitVisibility = transition.direction === "in" ? 1 - warpIntensity : eased;
  orbitMaterials.forEach((material) => { material.opacity = .18 * orbitVisibility; });
  updateWarpStreaks(warpIntensity);
  if (elapsed >= 1) finishTravel();
}

/* Stretch individual procedural stars into radial line streaks as the ship accelerates. */
function updateWarpStreaks(intensity) {
  if (!starfield) return;
  const { basePositions, streakPositions, streakGeometry, streaks, streakCount } = starfield;
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
  starfield.layers.forEach(({ material }) => {
    material.uniforms.uOpacity.value = .82 - intensity * .56;
  });
}

/* Render one smooth frame and keep all orbiting worlds and projected DOM points synchronized. */
function animate(now = performance.now()) {
  if (!renderer) return;
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), .05);

  /* Animate depth-layer parallax and shader-driven star twinkle without interrupting warp streaks. */
  if (starfield) {
    starfield.layers.forEach(({ points, material }) => {
      material.uniforms.uTime.value += delta;
      points.rotation.x += points.rotationSpeedX * delta;
      points.rotation.y += points.rotationSpeedY * delta;
    });
  }

  solarBodies.forEach((body) => {
    if (body.isSun) return;
    body.spinGroup.rotation.y += body.data.rotation * delta;
    updateSaturnRingShadow(body);
    updateMercuryTerminator(body);
  });

  /* Advance each elliptical orbit by its Kepler-like angular speed, then place the planet on its path.
     Speed scales as distance^-3/2, so inner worlds move faster and distant worlds drift more slowly.
     Pause orbital positions outside overview to keep the selected world's warp target and camera stable. */
  if (mode === "overview" && !transition) {
    solarBodies.forEach((body) => {
      if (body.isSun) return;
      body.orbitAngle = (body.orbitAngle + body.orbitSpeed * delta) % (Math.PI * 2);
      body.group.position.x = Math.cos(body.orbitAngle) * body.data.orbit;
      body.group.position.y = Math.sin(body.orbitAngle) * body.data.orbit * .58;
    });
  }

  /* Keep the independent lunar system centered on Earth and animate its orbit and axial spin. */
  if (moonBody && earthBody) {
    moonBody.root.position.copy(earthBody.group.position);
    const moonIsFocused = activeBody === moonBody && (mode === "inspection" || (transition && transition.body === moonBody));
    if (!moonIsFocused) {
      moonSystems.forEach((system) => { system.orbit.rotation.z += system.orbitSpeed * delta; });
    }
    moonSystems.forEach((system) => { system.moon.rotation.y += system.axialSpeed * delta; });
  }

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
