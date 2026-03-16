// made by Roman

const isDev = false; // run the level editor by changing this line from "false" to "true"
// level editor keyboard shortcuts
// W, A, S, D, Q, E -> move place brush
// R -> rotate the place brush
// ] -> place block
// [ -> remove block
// space -> switch the active world
// M -> switch between editing and playing

const gameTitle = "An Introduction You Can Walk Through"; // have fun lol

// ===== Global UI layout & typography handles (edit these numbers) =====
const menuTextSizes = {
  desktopTitle: 46,
  desktopSubtitle: 18,
  desktopBody: 15,
  mobileTitle: 34,
  mobileSubtitle: 16,
  mobileBody: 12
};

const menuLayout = {
  desktopTitleY: 140,
  desktopSubtitleY: 200,
  desktopBodyY: 650,
  desktopFirstButtonY: 350,
  desktopButtonSpacing: 52,
  mobileTitleY: 90,
  mobileSubtitleY: 125,
  mobileBodyY: 155,
  mobileFirstButtonY: 215,
  mobileButtonSpacing: 44
};

// Button style handles
const menuButtonStyle = {
  textSize: 18,
  width: 200
};

const settingsButtonStyle = {
  textSize: 14,
  width: 260
};

const tabButtonStyle = {
  textSize: 13,
  width: 110,
  yDesktop: 64,
  yMobile: 42
};

const backButtonStyle = {
  // ✳ Back button layout — EDIT these numbers if you want to move/resize it
  desktop: {
    large: { x: 140, y: 70, textSize: 30 },                 // main menu (bigger)
    small: { x: 90,  y: tabButtonStyle.yDesktop, textSize: tabButtonStyle.textSize }  // settings / sections / controls
  },
  mobile: {
    large: { x: 74, y: 40, textSize: 26 },
    small: { x: 60, y: tabButtonStyle.yMobile, textSize: tabButtonStyle.textSize }
  }
};

// UI helper: temporary forced button width (used by level select / settings / menu)
let uiForcedButtonW = null;

/* ================================
   LIFE SECTIONS (12 levels)
   Short labels for menu + in-game UI
   ================================ */
const lifeSections = [
  "Origins",
  "Horizon",
  "Light",
  "Realtime",
  "Systems",
  "Research",
  "VR Sense",
  "Bio Loop",
  "Teaching",
  "Mentor",
  "Play Lab",
  "Now"
];

function sectionLabel(i) {
  // In-game label format
  return (i + 1) + " - " + lifeSections[i];
}

const palettes = {

  // Main look: ink + parchment + tar wood
  "graphite": [
    [0, 0, 0],          // absolute black
    [255, 255, 255],    // pure white
    [255, 255, 255],
    [0, 0, 0],
    [200, 30, 30]       // sharp red accent
  ],


  // Warm torchlight / wood interior
  "classic": [
    [10, 8, 6],         // soot black
    [222, 186, 132],    // warm lantern light
    [222, 186, 132],
    [32, 22, 14],       // burnt wood
    [168, 112, 48]      // gold trim
  ],

  // Night exterior / jungle shadow
  "inverted": [
    [4, 6, 10],         // night blue-black
    [196, 210, 190],    // moonlit leaf
    [196, 210, 190],
    [12, 20, 16],       // deep foliage shadow
    [72, 96, 64]        // moss accent
  ],

  // Sickly smoke + bone (from yellow cloud)
  "gameboy": [
    [8, 10, 6],         // poisoned black
    [214, 198, 112],    // sulfur smoke
    [214, 198, 112],
    [26, 24, 12],       // burnt residue
    [148, 132, 48]      // toxic yellow
  ],

  // Pirate red banners + skin tones
  "strawberry": [
    [12, 8, 10],        // blood shadow
    [196, 54, 42],      // pirate red
    [196, 54, 42],
    [36, 12, 12],       // dried blood
    [238, 182, 148]     // skin highlight
  ],

  // Jungle + rot + wood
  "forest": [
    [6, 10, 8],         // jungle night
    [132, 168, 112],    // leaf green
    [132, 168, 112],
    [22, 36, 26],       // wet bark
    [96, 120, 72]       // moss
  ],

  // Cannon + coat + menace
  "crimson": [
    [6, 6, 6],          // absolute black
    [148, 24, 18],      // deep pirate red
    [148, 24, 18],
    [32, 10, 10],       // shadowed cloth
    [96, 96, 96]        // steel highlight
  ],

  // Flags, iconography, stylized accents
  "pride": [
    [8, 8, 8],          // ink
    [220, 220, 220],    // bone white
    [220, 220, 220],
    [18, 18, 18],       // charcoal
    [180, 48, 48]       // emblem red
  ],

  // Old machinery / telescope / brass
  "retro": [
    [4, 6, 6],          // oil black
    [182, 142, 68],     // aged brass
    [182, 142, 68],
    [28, 22, 12],       // rusted wood
    [92, 72, 28]        // dark bronze
  ]
};

let palette;

const settings = JSON.parse(localStorage.getItem("gameSettings")) || {
  general: {
    allowCameraRotation: false,
    FPSindicator: false,
    minimalUI: false,
    sceneScale: mobileCheck() ? 100 : 125, // size of a block in pixels i think
    runMobile: mobileCheck()
  },
  graphics: {
    palette: "graphite",
    doAA: false,
    doAC: true,
    doHQ: true,
    frameScale: mobileCheck() ? 2 : 1, // 60 or 30 target fps
  }
};

let canvas;
let player, worldL, worldR;

let gameScene = "menu";
let largeScreen = false;
let cameraAngle = -Math.PI / 4;
let cameraRotationGoal = 0;
let currentLevelName = "Untitled";
let UIinterest = 0;
let mouseWasPressed = false;
let shakeTimeout = 0;

// ----- Intro black fade overlay -----
const introDurationMs = 9000;
let introOverlay = {
  active: false,
  startMs: 0
};

const screenMinorWorldSize = 0.07; // how much of the screen shows the de-selected world
let screenDivide = screenMinorWorldSize; // where the line is that divides the worlds; from 0: full left, to 1: full right

let divideKeyFrames = [{
  time: 0,
  value: screenDivide
}]; // list of key frames to move the screen divide

let leftSelected = false; // is the left world selected?
let pauseReasons = {}; // controls is the game is updated

let gameData; // the p5Zip instance holding the game assets

const blockModels = {};
const blockNames = [];
let blockProperties;
let gameFont;

const playerModels = [];
let playerBop; // the heights that the play bobs in the run cycle

let logMode = "alert"; // meathod used to log error; alert, print, none

/* ================================
   CV NARRATIVE OVERLAY (Roman)
   - Shows an intro text at level start
   - Shows an outro text when goal is reached
   - Fades in/out and can pause gameplay while showing
   ================================ */

const cvNarratives = [
  {
    // Level 0 — Origins
    intro: "I began with physical space. Walls, light, terrain. Architecture taught me how bodies move before pixels did.",
    outro: "Before games, there were plans and sections. I learned to design feeling before explanation."
  },
  {
    // Level 1 — Landscape & Space
    intro: "Landscape architecture shifted my scale outward. Horizon, circulation, atmosphere.",
    outro: "Design stopped being an object. It became a system you move through."
  },
  {
    // Level 2 — Visualization
    intro: "Visualization became the bridge. Cinema 4D. Materials. Light carrying meaning.",
    outro: "Mood is engineered. Color, contrast, and timing shape emotion before narrative."
  },
  {
    // Level 3 — Digital Worlds
    intro: "Static images weren’t enough. I wanted worlds that respond.",
    outro: "Interaction changed everything. Space was no longer fixed. It could listen."
  },
  {
    // Level 4 — Unity & Systems
    intro: "Unity became my workshop. Shaders, pipelines, constraints.",
    outro: "I design for readability. If a player hesitates, the environment failed."
  },
  {
    // Level 5 — Research Shift
    intro: "Research entered quietly. Light intensity. Color perception. Attention.",
    outro: "I stopped asking what looks good, and started asking what changes behavior."
  },
  {
    // Level 6 — VR & Perception
    intro: "Virtual reality removed shortcuts. Depth, motion, comfort had consequences.",
    outro: "In VR, mistakes are physical. Design requires care, not spectacle."
  },
  {
    // Level 7 — Biofeedback
    intro: "Biofeedback pushed further. Heart rate. Breath. Systems reacting to the body.",
    outro: "Interaction became a loop. The environment reflects you back."
  },
  {
    // Level 8 — Teaching
    intro: "Teaching followed naturally. Workshops, critique, patient debugging.",
    outro: "Explaining design sharpened my thinking. Clarity is the real skill."
  },
  {
    // Level 9 — Mentorship
    intro: "As a TA, I guide students through animation, narrative, and technical systems.",
    outro: "My role is not answers. It’s helping others ship coherent worlds."
  },
  {
    // Level 10 — Research + Play
    intro: "My work now sits between research and play. Games as experiments.",
    outro: "The systems feel intuitive. The measurements are not."
  },
  {
    // Level 11 — Present
    intro: "This is where I am now. Building environments that respond and reveal.",
    outro: "If you reached here, you already understand. Space tells stories."
  }
];


// Overlay state
let narrativeOverlay = {
  active: false,
  text: "",
  startMs: 0,
  durationMs: 0,
  fadeMs: 550,
  blocksGameplay: false
};

/* ================================
   NARRATIVE UI HANDLERS (Roman)
   Tweak these values any time:
   ================================ */
/* ================================
   UI TEXT COLOR MODE (for Space swap)
   - You asked for simple behavior:
     Press Space -> after 1s text turns WHITE
     Press Space again -> after 1s text turns BLACK
   ================================ */
/* ================================
   PER-SECTION TEXT POSITIONS (EDIT ME)
   One entry per section (0..11).
   - xFrac/yFrac are fractions of screen (0..1)
   - boxWFrac controls wrap width as a fraction of screen width
   ================================ */
const narrativePositions = [
  // 0 — ORIGINS
  { intro: { xFrac: 0.9, yFrac: 0.50, boxWFrac: 0.26 }, outro: { xFrac: 0.70, yFrac: 0.3, boxWFrac: 0.26 } },

  // 1 — HORIZON
  { intro: { xFrac: 0.90, yFrac: 0.50, boxWFrac: 0.26 }, outro: { xFrac: 0.40, yFrac: 0.30, boxWFrac: 0.26 } },

  // 2 — LIGHT
  { intro: { xFrac: 0.60, yFrac: 0.80, boxWFrac: 0.26 }, outro: { xFrac: 0.90, yFrac: 0.30, boxWFrac: 0.26 } },

  // 3 — REALTIME
  { intro: { xFrac: 0.60, yFrac: 0.80, boxWFrac: 0.26 }, outro: { xFrac: 0.60, yFrac: 0.80, boxWFrac: 0.26 } },

  // 4 — SYSTEMS
  { intro: { xFrac: 0.40, yFrac: 0.30, boxWFrac: 0.26 }, outro: { xFrac: 0.90, yFrac: 0.30, boxWFrac: 0.26 } },

  // 5 — RESEARCH
  { intro: { xFrac: 0.40, yFrac: 0.80, boxWFrac: 0.28 }, outro: { xFrac: 0.90, yFrac: 0.30, boxWFrac: 0.28 } },

  // 6 — VR SENSE
  { intro: { xFrac: 0.40, yFrac: 0.80, boxWFrac: 0.28 }, outro: { xFrac: 0.90, yFrac: 0.30, boxWFrac: 0.28 } },

  // 7 — BIO LOOP
  { intro: { xFrac: 0.90, yFrac: 0.90, boxWFrac: 0.28 }, outro: { xFrac: 0.40, yFrac: 0.30, boxWFrac: 0.28 } },

  // 8 — TEACHING
  { intro: { xFrac: 0.60, yFrac: 0.20, boxWFrac: 0.28 }, outro: { xFrac: 0.70, yFrac: 0.80, boxWFrac: 0.28 } },

  // 9 — MENTOR
  { intro: { xFrac: 0.70, yFrac: 0.30, boxWFrac: 0.28 }, outro: { xFrac: 0.70, yFrac: 0.50, boxWFrac: 0.28 } },

  // 10 — PLAY LAB
  { intro: { xFrac: 0.70, yFrac: 0.50, boxWFrac: 0.30 }, outro: { xFrac: 0.70, yFrac: 0.50, boxWFrac: 0.30 } },

  // 11 — NOW
  { intro: { xFrac: 0.70, yFrac: 0.50, boxWFrac: 0.30 }, outro: { xFrac: 0.70, yFrac: 0.50, boxWFrac: 0.30 } }
];

// Example: move a specific section's outro lower
// narrativePositions[0].outro = { x: 0.74, y: 0.60 };

const sectionTitleUI = {
  x: 32,      // px from left
  yFromBottom: 44, // px from bottom
  size: 32
};

const narrativeUI = {
  // text look
  textSize: 18,
  textLeading: 24,
  // layout (right-middle)
  xMargin: 220,
  yFrac: 0.5,          // 0 = top, 0.5 = middle, 1 = bottom
  boxWFrac: 0.22,      // narrower = more lines (more compact paragraph)

  // timing
  introDelayMs: 3000,
  introDurationMs: 6200,

  outroDelayMs: 1000,
  outroDurationMs: 6200,

  // fades
  textFadeMs: 650,

  // level transition (fade to black -> load -> fade from black)
  afterOutroToTransitionMs: 350,
  fadeToBlackMs: 900,
  blackHoldMs: 200,
  fadeFromBlackMs: 650
};

// Goal transition flag (prevents double-trigger without freezing gameplay)
let goalTransitioning = false;

// Screen fade transition overlay
let levelTransition = {
  active: false,
  phase: "none",      // "toBlack" | "hold" | "fromBlack"
  startMs: 0,
  alpha: 0,
  nextLevelQueued: false
};

function startLevelTransition() {
  if (levelTransition.active) return;
  levelTransition.active = true;
  levelTransition.phase = "toBlack";
  levelTransition.startMs = millis();
  levelTransition.alpha = 0;
  levelTransition.nextLevelQueued = false;
}

/* ================================
   SHUTTER WIPE (Space key)
   Two black curtains close to center, swap, then open.
   ================================ */
const shutter = {
  active: false,
  phase: "idle", // "closing" -> "opening"
  startMs: 0,
  closeMs: 260,
  openMs: 260,
  swapped: false
};

function startShutterSwap() {
  if (shutter.active) return;
  shutter.active = true;
  shutter.phase = "closing";
  shutter.startMs = millis();
  shutter.swapped = false;
}

function updateShutter() {
  if (!shutter.active) return;

  const now = millis();
  if (shutter.phase === "closing") {
    const t = (now - shutter.startMs) / shutter.closeMs;
    if (t >= 1 && !shutter.swapped) {
      // swap worlds at full black
      switchDivide(!leftSelected);
      shutter.swapped = true;
      shutter.phase = "opening";
      shutter.startMs = now;
    }
  } else if (shutter.phase === "opening") {
    const t = (now - shutter.startMs) / shutter.openMs;
    if (t >= 1) {
      shutter.active = false;
      shutter.phase = "idle";
    }
  }
}

function drawShutterOverlay() {
  if (!shutter.active) return;

  const now = millis();
  let p = 0;

  if (shutter.phase === "closing") {
    p = constrain((now - shutter.startMs) / shutter.closeMs, 0, 1);
  } else if (shutter.phase === "opening") {
    p = 1 - constrain((now - shutter.startMs) / shutter.openMs, 0, 1);
  }

  // two rectangles closing to center
  const halfW = width * 0.5 * p;

  push();
  noStroke();
  fill(0);
  rectMode(CORNER);
  rect(0, 0, halfW, height);
  rect(width - halfW, 0, halfW, height);
  pop();
}

function drawLevelTransitionOverlay() {
  if (!levelTransition.active) return;

  const t = millis() - levelTransition.startMs;

  if (levelTransition.phase === "toBlack") {
    const p = constrain(t / narrativeUI.fadeToBlackMs, 0, 1);
    levelTransition.alpha = p;

    // when fully black, load next level once
    if (p >= 1 && !levelTransition.nextLevelQueued) {
      levelTransition.nextLevelQueued = true;
      levelTransition.phase = "hold";
      levelTransition.startMs = millis();

      // load the next level while screen is black
      nextLevel();
    }
  } else if (levelTransition.phase === "hold") {
    levelTransition.alpha = 1;
    if (t >= narrativeUI.blackHoldMs) {
      levelTransition.phase = "fromBlack";
      levelTransition.startMs = millis();
    }
  } else if (levelTransition.phase === "fromBlack") {
    const p = constrain(t / narrativeUI.fadeFromBlackMs, 0, 1);
    levelTransition.alpha = 1 - p;

    if (p >= 1) {
      levelTransition.active = false;
      levelTransition.phase = "none";
      levelTransition.alpha = 0;
      // allow future goal triggers
      goalTransitioning = false;
    }
  }

  // Draw black mask on top of everything
  push();
  noStroke();
  fill(0, 255 * levelTransition.alpha);
  rect(0, 0, width, height);
  pop();
}

// Intro fade overlay
function drawIntroOverlay() {
  if (!introOverlay.active) return;

  const t = millis() - introOverlay.startMs;
  const p = constrain(t / introDurationMs, 0, 1);
  const alpha = 255 * (1 - p);

  push();
  noStroke();
  fill(0, alpha);
  rectMode(CORNER);
  rect(0, 0, width, height);
  pop();

  if (p >= 1) {
    introOverlay.active = false;
  }
}

function showNarrative(text, durationMs, kind) {
  narrativeOverlay.active = true;
  narrativeOverlay.text = text;
  narrativeOverlay.startMs = millis();
  narrativeOverlay.durationMs = durationMs;
  narrativeOverlay.fadeMs = narrativeUI.fadeMs;
  narrativeOverlay.kind = kind || "intro"; // "intro" or "outro"
}

function hideNarrative() {
  narrativeOverlay.active = false;
  narrativeOverlay.text = "";
  narrativeOverlay.startMs = 0;
  narrativeOverlay.durationMs = 0;
  narrativeOverlay.blocksGameplay = false;
  delete pauseReasons["narrative"];
}

// Called by world.js when a level is loaded
function narrativeOnLevelLoaded(levelNumber) {
  const entry = cvNarratives[levelNumber];
  if (!entry) return;

  // new level loaded, allow goal trigger again
  goalTransitioning = false;

  // wait before showing intro (does not block gameplay)
  setTimeout(() => {
    showNarrative(entry.intro, narrativeUI.introDurationMs, "intro");
  }, narrativeUI.introDelayMs);
}

// Called by player.js when goal is reached
function onPlayerReachedGoal() {
  const entry = cvNarratives[currentLevel] || {};

  // prevent double-trigger without freezing gameplay
  if (goalTransitioning) return;
  goalTransitioning = true;

  // wait after reaching the goal, then show outro
  setTimeout(() => {
    showNarrative(entry.outro || "", narrativeUI.outroDurationMs, "outro");

    // after outro finishes, wait a beat, then fade to black and load next level
    setTimeout(() => {
      hideNarrative();
      startLevelTransition();
    }, narrativeUI.outroDurationMs + narrativeUI.afterOutroToTransitionMs);

  }, narrativeUI.outroDelayMs);
}

function drawNarrativeOverlay() {
  if (!narrativeOverlay.active) return;

  const t = millis() - narrativeOverlay.startMs;
  const d = narrativeOverlay.durationMs;
  const f = narrativeOverlay.fadeMs;

  let a = 1;
  if (t < f) a = t / f;
  else if (t > d - f) a = Math.max(0, (d - t) / f);

  if (t >= d) {
    hideNarrative();
    return;
  }

  push();

  textAlign(RIGHT, CENTER);
  textWrap(WORD);
  textSize(narrativeUI.textSize);
  textLeading(narrativeUI.textLeading);
  noStroke();

  const sec = constrain(currentLevel || 0, 0, 11);
  const kind = narrativeOverlay.kind || "intro";

  const pos = (narrativePositions[sec] && narrativePositions[sec][kind]) ? narrativePositions[sec][kind] : null;

  const boxW = width * (pos && pos.boxWFrac != null ? pos.boxWFrac : narrativeUI.boxWFrac);
  const boxH = 400;

  const x = width * (pos && pos.xFrac != null ? pos.xFrac : 0.74);
  const y = height * (pos && pos.yFrac != null ? pos.yFrac : 0.50);

  const textCol = leftSelected ? 255 : 0;
  fill(textCol, 255 * a);
  text(narrativeOverlay.text, x - boxW, y - boxH / 2, boxW, boxH);

  pop();
}

// dev vars
const devPlaceLocation = { // where is the level editer placing a block
  x: 0,
  y: 0,
  z: 0,
  r: 0
};
let editMode = isDev; // is the level editor editing or playing the game
let devLastSelected = null;
let devPlaneImage; // image used to add a floor grid on the level editor

// dom ui for level editor
let devPlaceSelect;
let levelDisplay;
let aLevelInput;
let bLevelInput;
let startingHeightInput;

function preload() {
  gameData = new p5Zip("gameData.zip", "assets");

  blockProperties = gameData.getJSON("blockProperties.json", (blockProperties) => {
    for (const name in blockProperties) {
      blockModels[name] = gameData.getModel(`${name}.obj`);
      blockNames.push(name);
    }
  });

  for (let i = 0; i < 12; i++) {
    playerModels[i] = gameData.getModel(`player${i}.obj`);
  }
  playerBop = gameData.getJSON("playerBop.json");

  if (isDev) {
    devPlaneImage = gameData.getImage("devPlane.png");
  }

  gameFont = gameData.getFont("AtkinsonHyperlegible-Regular.ttf");
}

function setup() {
  canvas = createCanvas(windowWidth, windowHeight, WEBGL);

  worldL = new World(width, height, 0, 1);

  worldR = new World(width, height, 2, 3);
  worldR.altWorld = worldL; // makes worldR draw worldL past the screen divide

  player = new Character();

  // Desktop safety: don't let 'mobile controls' hijack mouse clicks.
  if (!mobileCheck()) settings.general.runMobile = false;

  if (isDev) {
    // build dev ui
    devPlaceSelect = createSelect().position(5, 10);
    for (const name of blockNames) {
      devPlaceSelect.option(name);
    }
    levelDisplay = createDiv().position(5, 35).style("background-color", "white").style("color", "black");
    createButton("Next Level").position(5, 60).mousePressed(nextLevel);
    createButton("Previous Level").position(5, 85).mousePressed(previousLevel);
    createButton("Add Level At End").position(5, 110).mousePressed(createLevelLocally);
    createButton("Remove Last Level").position(5, 135).mousePressed(removeLastLevelLocally);
    createButton("Clear Level").position(5, 160).mousePressed(() => createLevelLocally(currentLevel));
    createButton("Copy Side To Other").position(90, 160).mousePressed(() => {
      if (leftSelected) {
        worldR.setBlocks(JSON.parse(JSON.stringify(worldL.blocks)));
      } else {
        worldL.setBlocks(JSON.parse(JSON.stringify(worldR.blocks)));
      }
    });
    aLevelInput = createInput("0", "number").attribute("placeholder", "Level A").position(5, 185).size(80);
    bLevelInput = createInput("0", "number").attribute("placeholder", "Level B").position(100, 185).size(80);
    createButton("Switch Levels").position(195, 185).mousePressed(
      () => switchLevelsLocally(Number(aLevelInput.value()) || 0, Number(bLevelInput.value()) || 0));
    startingHeightInput = createInput("", "number").attribute("placeholder", "Player Start Altitude").changed(() => {
      autoSave();
      player.resetPosition(Number(startingHeightInput.value()));
    }).position(5, 210);
    levelNameInput = createInput("", "text").attribute("placeholder", "Level name").changed(autoSave).position(5, 235);
    createButton("Download Levels").position(5, 260).mousePressed(saveLocalLevelsToZip);

    settings.graphics.doAC = false; // stops the floor grid from bugging out
    gameScene = "game";
    loadLevel(0);
  } else {
    // normal player: start on menu and fade in from black
    gameScene = "menu";
    introOverlay.active = true;
    introOverlay.startMs = millis();
  }

  setupLevels();

  settings.graphics.palette = settings.graphics.palette ?? "graphite";
  textFont(gameFont);
}

function windowResized() {
  resizeCanvas(window.innerWidth, window.innerHeight);
  if (!worldR || !worldL) return;
  worldR.resize(window.innerWidth, window.innerHeight);
  worldL.resize(window.innerWidth, window.innerHeight);
}

function draw() {
  palette = palettes[settings.graphics.palette];

  translate(width / -2, height / -2);
  largeScreen = (width > 1000 && height > 680);

  push();
  switch (gameScene) {
    case "menu":
      drawMenuScene();
      break;
    case "levelSelect":
      drawLevelSelectScene();
      break;
    case "settings":
      drawGeneralSettingsScene();
      break;
    case "graphicsSettings":
      drawGraphicsSettingsScene();
      break;
    case "controls":
      drawControlsScene();
      break;
    case "winScreen":
      drawWinScene();
      break;
    default:
    case "game":
      drawGameScene();
      break;
  }
  pop();

  // Intro fade overlay on top of everything
  drawIntroOverlay();

  mouseWasPressed = false;
}

// ===== UI helpers to match website button style =====

function uiButtonMetrics(size) {
  // Central place to tweak button proportions
  if (size === true) return { textPx: 32, padX: 22, padY: 14 };
  if (size === false) return { textPx: 22, padX: 18, padY: 12 };
  return { textPx: size, padX: Math.max(14, size * 0.5), padY: Math.max(8, size * 0.35) };
}

function drawMenuScene() {
  drawMenuBackground();

  textAlign(CENTER, CENTER);
  rectMode(CENTER);
  noStroke();

  if (largeScreen) {
    // -------- Desktop layout --------
    // Title
    textSize(menuTextSizes.desktopTitle);
    fill(240);
    text(gameTitle, width / 2, menuLayout.desktopTitleY);

    // Subtitle
    textSize(menuTextSizes.desktopSubtitle);
    fill(220);
    text("A playable way to know my work and how I think about space", width / 2, menuLayout.desktopSubtitleY);

    // Body copy (portfolio blurb)
    textSize(menuTextSizes.desktopBody);
    fill(200);
    text(
      "This small walking game turns my portfolio into a space you can inhabit.\n" +
      "Each chapter you unlock is a different layer of my practice: environments, research,\n" +
      "biofeedback systems, and the teaching that ties them together.",
      width / 2,
      menuLayout.desktopBodyY
    );

    // Main menu buttons
    uiForcedButtonW = menuButtonStyle.width;
    const firstY = menuLayout.desktopFirstButtonY;
    const gapY = menuLayout.desktopButtonSpacing;

    drawButton("Start",    width / 2, firstY + 0 * gapY, menuButtonStyle.textSize, () => {
      loadLevel(0);
      gameScene = "game";
      fullscreen();
    });
    drawButton("Sections", width / 2, firstY + 1 * gapY, menuButtonStyle.textSize, () => gameScene = "levelSelect");
    drawButton("Settings", width / 2, firstY + 2 * gapY, menuButtonStyle.textSize, () => gameScene = "settings");
    drawButton("Controls", width / 2, firstY + 3 * gapY, menuButtonStyle.textSize, () => gameScene = "controls");
  } else {
    // -------- Mobile / small viewport layout --------
    textSize(menuTextSizes.mobileTitle);
    fill(240);
    text(gameTitle, width / 2, menuLayout.mobileTitleY);

    textSize(menuTextSizes.mobileSubtitle);
    fill(220);
    text("A playable way to know my work and how I think about space", width / 2, menuLayout.mobileSubtitleY);

    textSize(menuTextSizes.mobileBody);
    fill(200);
    text(
      "Walk through my work instead of scrolling a static page.\n" +
      "Each chapter you unlock adds another layer of environments,\n" +
      "research, biofeedback systems, and teaching.",
      width / 2,
      menuLayout.mobileBodyY
    );

    uiForcedButtonW = menuButtonStyle.width;
    const firstY = menuLayout.mobileFirstButtonY;
    const gapY = menuLayout.mobileButtonSpacing;

    drawButton("Start",    width / 2, firstY + 0 * gapY, menuButtonStyle.textSize, () => {
      loadLevel(0);
      gameScene = "game";
      fullscreen();
    });
    drawButton("Sections", width / 2, firstY + 1 * gapY, menuButtonStyle.textSize, () => gameScene = "levelSelect");
    drawButton("Settings", width / 2, firstY + 2 * gapY, menuButtonStyle.textSize, () => gameScene = "settings");
    drawButton("Controls", width / 2, firstY + 3 * gapY, menuButtonStyle.textSize, () => gameScene = "controls");
  }
}

function drawLevelSelectScene() {
  drawMenuBackground();
  drawEscapeButton(true);

  // Guidance text
  push();
  textAlign(CENTER, TOP);
  noStroke();
  fill(255);
  textSize(largeScreen ? 22 : 16);
  text("Choose a chapter of my journey", width / 2, largeScreen ? 120 : 70);
  textSize(largeScreen ? 14 : 12);
  fill(200);
  text("Each section is a different part of my work and life.", width / 2, (largeScreen ? 150 : 92));
  uiForcedButtonW = null;
  pop();

  const progress = getLevelProgress();
  const total = levelCount;

  // Layout: 4 columns on desktop, 3 on mobile
  const rowSize = settings.general.runMobile ? 3 : 4;

  // Use the same button style as Settings
  const btnSize = settingsButtonStyle.textSize;
  const buttonW = settingsButtonStyle.width;

  uiForcedButtonW = buttonW;

  const xSpacing = buttonW + (largeScreen ? 60 : 40);
  const ySpacing = largeScreen ? 80 : 70;
  const startY = largeScreen ? 230 : 150;

  for (let i = 0; i < total; i++) {
    const col = i % rowSize;
    const row = Math.floor(i / rowSize);

    const x = (col - rowSize / 2 + 0.5) * xSpacing;
    const y = startY + row * ySpacing;

    let callback = (() => {
      loadLevel(i);
      gameScene = "game";
    }).bind(i);

    if (i > progress) callback = null;

    drawButton(lifeSections[i], width / 2 + x, y, btnSize, callback);
  }

  uiForcedButtonW = null;
}

function drawGeneralSettingsScene() {
  drawSettingsSceneCommon();

  const tabY = largeScreen ? tabButtonStyle.yDesktop : tabButtonStyle.yMobile;

  // Top tabs: Back is drawn in drawSettingsSceneCommon; here we draw General / Graphics
  if (largeScreen) {
    drawButton("General", 260, tabY, tabButtonStyle.textSize, null);
    drawButton("Graphics", 430, tabY, tabButtonStyle.textSize, () => gameScene = "graphicsSettings");
  } else {
    drawButton("General", 170, tabY, tabButtonStyle.textSize, null);
    drawButton("Graphics", 305, tabY, tabButtonStyle.textSize, () => gameScene = "graphicsSettings");
  }

  const sceneScale = settings.general.sceneScale;
  let nextSceneScale;
  switch (sceneScale) {
    case 60:  nextSceneScale = 100; break;
    case 100: nextSceneScale = 125; break;
    case 125: nextSceneScale = 180; break;
    case 180: nextSceneScale = 60;  break;
  }

  // Center-column general settings
  if (largeScreen) {
    drawSettingsToggleButton("Camera Rotation:", 150, settings.general, "allowCameraRotation");
    drawSettingsToggleButton("FPS Indicator:",   220, settings.general, "FPSindicator");
    drawSettingsToggleButton("Minimal UI:",      290, settings.general, "minimalUI");
    drawSettingsButton      ("Scene Scale: " + sceneScale, 360, settings.general, "sceneScale", nextSceneScale);
    drawSettingsToggleButton("Run for Mobile:",  430, settings.general, "runMobile");
    drawButton("Reset Progress", width / 2, 500, settingsButtonStyle.textSize, confirmResetProgress);
  } else {
    drawSettingsToggleButton("Camera Rotation:", 100, settings.general, "allowCameraRotation");
    drawSettingsToggleButton("FPS Indicator:",   155, settings.general, "FPSindicator");
    drawSettingsToggleButton("Minimal UI:",      210, settings.general, "minimalUI");
    drawSettingsButton      ("Scene Scale: " + sceneScale, 265, settings.general, "sceneScale", nextSceneScale);
    drawSettingsToggleButton("Run for Mobile:",  320, settings.general, "runMobile");
    drawButton("Reset Progress", width / 2, 375, settingsButtonStyle.textSize, confirmResetProgress);
  }
}

function confirmResetProgress() {
  if (confirm("Are you sure you want to reset all progress?") === true) {
    localStorage.removeItem("levelProgress");
  }
}

function drawGraphicsSettingsScene() {
  drawSettingsSceneCommon();

  const tabY = largeScreen ? tabButtonStyle.yDesktop : tabButtonStyle.yMobile;

  if (largeScreen) {
    drawButton("General", 260, tabY, tabButtonStyle.textSize, () => gameScene = "settings");
    drawButton("Graphics", 430, tabY, tabButtonStyle.textSize, null);
  } else {
    drawButton("General", 170, tabY, tabButtonStyle.textSize, () => gameScene = "settings");
    drawButton("Graphics", 305, tabY, tabButtonStyle.textSize, null);
  }

  const frameScale = settings.graphics.frameScale;
  let frameScaleRate, nextFrameScale;
  switch (frameScale) {
    case 1: frameScaleRate = 60; nextFrameScale = 2; break;
    case 2: frameScaleRate = 30; nextFrameScale = 3; break;
    case 3: frameScaleRate = 20; nextFrameScale = 1; break;
  }

  const pal = settings.graphics.palette;
  const paletteNames = Array.from(Object.keys(palettes));
  const nextPalette = paletteNames[(paletteNames.indexOf(pal) + 1) % paletteNames.length];
  const paletteDisplayName = pal.slice(0, 1).toUpperCase() + pal.slice(1);

  if (largeScreen) {
    drawSettingsToggleButton("Anti Aliasing:",      150, settings.graphics, "doAA");
    drawSettingsToggleButton("Ambient Occlusion:",  220, settings.graphics, "doAC");
    drawSettingsToggleButton("Quality Shaders:",    290, settings.graphics, "doHQ");
    drawSettingsButton      ("Target FPS: " + frameScaleRate, 360, settings.graphics, "frameScale", nextFrameScale);
    drawSettingsButton      ("Palette: " + paletteDisplayName, 430, settings.graphics, "palette", nextPalette);
  } else {
    drawSettingsToggleButton("Anti Aliasing:",      100, settings.graphics, "doAA");
    drawSettingsToggleButton("Ambient Occlusion:",  155, settings.graphics, "doAC");
    drawSettingsToggleButton("Quality Shaders:",    210, settings.graphics, "doHQ");
    drawSettingsButton      ("Target FPS: " + frameScaleRate, 265, settings.graphics, "frameScale", nextFrameScale);
    drawSettingsButton      ("Palette: " + paletteDisplayName, 320, settings.graphics, "palette", nextPalette);
  }
}

function drawSettingsSceneCommon() {
  drawMenuBackground();
  // Top tab row (Back / General / Graphics) uses the same width
  uiForcedButtonW = tabButtonStyle.width;
  drawEscapeButton(true);
}

function drawSettingsToggleButton(str, y, settingsMenu, attribute) {
  const nextValue = !settingsMenu[attribute];
  str += settingsMenu[attribute] ? " On" : " Off";
  drawSettingsButton(str, y, settingsMenu, attribute, nextValue);
}

function drawSettingsButton(str, y, settingsMenu, attribute, nextValue) {
  // Center column buttons
  uiForcedButtonW = settingsButtonStyle.width;
  drawButton(str, width / 2, y, settingsButtonStyle.textSize, () => {
    settingsMenu[attribute] = nextValue;
    localStorage.setItem("gameSettings", JSON.stringify(settings));
  });
}

function drawControlsScene() {
  drawMenuBackground();
  drawEscapeButton(true);

  // Title + subtitle to mirror other menus
  textAlign(CENTER, TOP);
  noStroke();
  fill(255);
  textSize(largeScreen ? 22 : 16);
  text("Controls", width / 2, largeScreen ? 120 : 70);
  textSize(largeScreen ? 14 : 12);
  fill(200);
  text("How to move through this space.", width / 2, largeScreen ? 150 : 92);

  let lines;

  if (settings.general.runMobile) {
    lines = [
      "Walk: Press and hold",
      "Swap Worlds: Shake"
    ];

    if (settings.general.allowCameraRotation) {
      lines.push("No rotation on mobile");
    }
  } else {
    lines = [
      "Walk: WASD or arrows",
      "Swap Worlds: Space",
      "Main Menu: M"
    ];

    if (settings.general.allowCameraRotation) {
      lines.push("Rotate Camera: R");
    }
  }

  // Buttons centered, same style as Settings options
  uiForcedButtonW = settingsButtonStyle.width;

  const firstY = largeScreen ? 230 : 160;
  const gapY = largeScreen ? 60 : 48;

  for (let i = 0; i < lines.length; i++) {
    drawButton(lines[i], width / 2, firstY + i * gapY, settingsButtonStyle.textSize, null);
  }

  uiForcedButtonW = null;
}

function drawWinScene() {
  drawMenuBackground();
  drawEscapeButton(true);

  textAlign(CENTER, CENTER);
  fill(255);
  noStroke();

  if (largeScreen) {
    textSize(220);
    text("You Win!", width / 2, 300);
  } else {
    textSize(120);
    text("You Win!", width / 2, 200);
  }
}

function drawMenuBackground() {
  frameRate(60);
  background(0); // fully black
}

function drawEscapeButton(forceSmall = false) {
  // Unified Back button for all menus.
  // Uses backButtonStyle above; change those numbers if you want a different position/size.
  const mode = largeScreen ? backButtonStyle.desktop : backButtonStyle.mobile;
  const variant = forceSmall ? mode.small : mode.large;
  drawButton("Back", variant.x, variant.y, variant.textSize, () => gameScene = "menu");
}

// NEW BUTTON STYLE: website-like (white outline, transparent, subtle hover)
function drawButton(str, x, y, size, callback = null) {
  push();

  const label = String(str).toUpperCase();
  const { textPx, padX, padY } = uiButtonMetrics(size);

  textAlign(CENTER, CENTER);
  textSize(textPx);

  const textW = textWidth(label);
  const buttonWidth = (uiForcedButtonW != null) ? uiForcedButtonW : (textW + padX * 2);
  const buttonHeight = textPx + padY * 1.6;

  const hover =
    mouseX > x - buttonWidth / 2 && mouseX < x + buttonWidth / 2 &&
    mouseY > y - buttonHeight / 2 && mouseY < y + buttonHeight / 2;

  const disabled = (callback == null);

  rectMode(CENTER);
  noStroke();

  // subtle drop shadow (down-right)
  fill(0, 0, 0, disabled ? 40 : 90);
  rect(x + 3, y + 3, buttonWidth, buttonHeight, 18);

  // subtle highlight (up-left)
  fill(255, 255, 255, disabled ? 10 : 22);
  rect(x - 2, y - 2, buttonWidth, buttonHeight, 18);

  // main surface
  fill(255, 255, 255, disabled ? 6 : (hover ? 14 : 10));
  rect(x, y, buttonWidth, buttonHeight, 18);

  // thin outline (luxury crisp)
  noFill();
  stroke(255, disabled ? 55 : 155);
  strokeWeight(1);
  rect(x, y, buttonWidth, buttonHeight, 18);

  // Text
  noStroke();
  fill(255, disabled ? 80 : 255);
  text(label, x, y + 1);

  // Click
  if (!disabled && hover && mouseWasPressed) callback();

  pop();
}

function drawGameScene() {
  updateShutter();

  frameRate(60 / settings.graphics.frameScale);

  if (isDev) {
    levelDisplay.elt.innerHTML = `<b>[ Level: ${String(currentLevel)} ]`;
    if (devLastSelected !== devPlaceSelect.value()) {
      devLastSelected = devPlaceSelect.value();
      devPlaceSelect.elt.blur(); // deselect for a better user experience
    }
  }

  for (let i = 0; i < settings.graphics.frameScale; i++) {
    if (isGameRunning()) {
      update();
    }
  }

  worldL.draw(leftSelected, player.position);
  worldR.draw(!leftSelected, player.position);

  image(worldR.outImage, 0, 0, width, height);

  if (!isDev) {
    if (!settings.general.minimalUI || UIinterest > 0) {
      textAlign(LEFT, TOP);
      const secIndex = constrain((typeof currentLevel === "number" ? currentLevel : 0), 0, 11);
      currentLevelName = sectionLabel(secIndex);
      textSize(32);
      noStroke();
      const alpha = Math.min(255, (settings.general.minimalUI ? UIinterest : 100) * 15);

      // Space-swap text mode: black normally, white 1s after swapping
      fill(255, alpha);

      const titleY = height - sectionTitleUI.yFromBottom;
      textSize(sectionTitleUI.size);
      text(currentLevelName, sectionTitleUI.x, titleY);
      if (player.oKeys > 0) text("O keys: " + player.oKeys, sectionTitleUI.x, titleY - 40);
      if (player.xKeys > 0) {
        const yy = (player.oKeys > 0) ? 96 : 64;
        text("X keys: " + player.xKeys, 32, yy);
      }
    }
  }
  drawNarrativeOverlay();
  drawShutterOverlay();
  drawLevelTransitionOverlay();

  if (settings.general.FPSindicator) {
    textAlign(RIGHT, TOP);
    textSize(32);
    fill(255);
    text(String(Math.floor(frameRate())) + " FPS", width - 32, 32);
  }
}

function isGameRunning() {
  return Object.keys(pauseReasons).length <= 0;
}

function update() {
  const cameraRotation = cameraRotationGoal * 0.1 * settings.graphics.frameScale;
  cameraAngle += cameraRotation;
  cameraRotationGoal -= cameraRotation;
  UIinterest -= settings.graphics.frameScale;
  shakeTimeout -= settings.graphics.frameScale;

  if (!editMode) {
    player.update(leftSelected ? worldL : worldR);
  }

  updateScreenDivide();
}

function updateScreenDivide() { // animate the screen divide with key frames
  const frame = frameCount;

  if (divideKeyFrames.length === 1) {
    screenDivide = divideKeyFrames[0].value;
    divideKeyFrames[0].time = frame;
  } else {
    const keyFrameTime = divideKeyFrames[1].time - divideKeyFrames[0].time;
    const timeAfterKeyFrameStart = frame - divideKeyFrames[0].time;
    const keyFrameProgess = constrain(timeAfterKeyFrameStart / keyFrameTime, 0, 1);
    screenDivide = divideKeyFrames[0].value + (divideKeyFrames[1].value - divideKeyFrames[0].value) * keyFrameProgess;
    if (keyFrameProgess === 1) {
      divideKeyFrames.shift();
    }
  }
}

function addDivideKeyFrames(timeTell, value) {
  divideKeyFrames.push({
    time: divideKeyFrames[divideKeyFrames.length - 1].time + (timeTell / settings.graphics.frameScale),
    value: value
  });
}

function forceDivideKeyFrames(timeTell, value) {
  divideKeyFrames = [{
    time: frameCount,
    value: screenDivide
  }];
  addDivideKeyFrames(timeTell, value);
}

function switchDivide(onLeft, force = false) {
  if (onLeft === leftSelected) return;

  player.runKeyCollisions(onLeft ? worldL : worldR, false);

  const newWorldCollisionSize = player.runWallCollision(onLeft ? worldL.blocks : worldR.blocks, true);

  if (newWorldCollisionSize < 0.05 || force) { // pervent bugging into other worlds geometry
    leftSelected = onLeft;
    forceDivideKeyFrames(25, leftSelected ? 1 - screenMinorWorldSize : screenMinorWorldSize);
  } else {
    forceDivideKeyFrames(12, 0.5);
    addDivideKeyFrames(20, leftSelected ? 0.48 : 0.52);
    addDivideKeyFrames(25, leftSelected ? 1 - screenMinorWorldSize : screenMinorWorldSize);
  }
}

function mouseReleased() {
  if (!settings.general.runMobile)
    mouseWasPressed = true;
}

function touchEnded() {
  if (settings.general.runMobile) {
    mouseWasPressed = true;
    if (typeof DeviceMotionEvent.requestPermission === "function")
      DeviceMotionEvent.requestPermission();
  }
}

function deviceShaken() {
  if (settings.general.runMobile && shakeTimeout < 0) {
    key = " ";
    keyPressed();
    shakeTimeout = 20;
  }
}

function keyPressed() {
  if (gameScene !== "game") return;

  if (!isDev) {
    if (key === " ") {
      startShutterSwap();
    }
    if (key === "r" && settings.general.allowCameraRotation) {
      cameraRotationGoal += HALF_PI;
    }
    if (key === "m") {
      gameScene = "menu";
    }
  } else {
    screenDivide = leftSelected ? 1 - screenMinorWorldSize : screenMinorWorldSize;
    const editWorld = leftSelected ? worldL : worldR;
    if (editMode) {
      if (key === "w") {
        devPlaceLocation.x--;
      } else if (key === "s") {
        devPlaceLocation.x++;
      } else if (key === "a") {
        devPlaceLocation.z++;
      } else if (key === "d") {
        devPlaceLocation.z--;
      } else if (key === "q") {
        devPlaceLocation.y--;
      } else if (key === "e") {
        devPlaceLocation.y++;
      } else if (key === "r") {
        devPlaceLocation.r += HALF_PI;
        devPlaceLocation.r %= TWO_PI;
      } else if (key === "]") {
        editWorld.setBlock(devPlaceLocation.x, devPlaceLocation.y, devPlaceLocation.z, devPlaceSelect.value(), devPlaceLocation.r);
      } else if (key === "[") {
        world.deleteBlock(devPlaceLocation.x, devPlaceLocation.y, devPlaceLocation.z);
      }
    }
    if (key === " ") switchDivide(!leftSelected, editMode);
    else if (key === "m") editMode = !editMode;
  }
  autoSave();
}

function autoSave() {
  if (!isDev || !editMode) return;
  saveCurrentLevelLocally();
}

function logMessage(str) {
  if (logMode === "alert") {
    if (!confirm(str)) logMode = "print";
  } else if (logMode === "print") {
    console.log(str);
  }
}

// thanks to detectmobilebrowsers.com
function mobileCheck() {
  let check = false;
  (function (a) {
    if (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino|android|ipad|playbook|silk/i.test(a) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0, 4))) check = true;
  })(navigator.userAgent || navigator.vendor || window.opera);
  return check;
}
