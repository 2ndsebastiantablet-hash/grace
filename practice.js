import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js";

const WORLD_UP = new THREE.Vector3(0, 1, 0);
const PLAYER_RADIUS = 0.42;
const STAND_HEIGHT = 1.72;
const SLIDE_HEIGHT = 0.92;
const BASE_SPEED = 8.4;
const RUN_SPEED = 13.8;
const GROUND_ACCEL = 42;
const AIR_ACCEL = 16;
const GROUND_DRAG = 14;
const AIR_DRAG = 1.5;
const AIR_CONTROL = 0.5;
const GRAVITY = 24;
const JUMP_SPEED = 8.6;
const DOUBLE_JUMP_SPEED = 8.2;
const DOUBLE_TAP_MS = 250;
const RUN_LATCH_MS = 900;
const STAMINA_DRAIN = 0.36;
const STAMINA_RECOVERY = 0.24;
const SLIDE_DURATION = 0.36;
const SLIDE_BOOST = 5.5;
const WALL_GRAB_RANGE = 1;
const WALL_SLIDE_FALL_SPEED = 2.5;
const WALL_JUMP_PUSH = 7.8;
const WALL_JUMP_UP = 8.1;
const QUICK_WALL_WINDOW = 540;
const MAX_LOOK_UP = Math.PI * 0.47;
const MOUSE_SENSITIVITY = 0.0022;
const AIR_DASH_SPEED = 24;
const AIR_DASH_DURATION = 0.18;
const BAR_GRAB_RANGE = 2.8;
const HOLD_GRAB_RANGE = 3.1;
const RAIL_SNAP_RANGE = 1.05;
const RAIL_SPEED = 17.5;
const JUMP_PAD_POWER = 15.8;
const FAN_FORCE = 18;
const FAN_UPDRAFT = 7.5;

const viewport = document.getElementById("viewport");
const viewportShell = document.querySelector(".viewport-shell");
const overlay = document.getElementById("overlay");
const overlayPlayButton = document.getElementById("overlay-play-button");
const overlayCopy = document.getElementById("overlay-copy");
const prompt = document.getElementById("prompt");
const leftHandElement = document.getElementById("left-hand");
const rightHandElement = document.getElementById("right-hand");
const seedReadout = document.getElementById("seed-readout");
const sectionReadout = document.getElementById("section-readout");
const stateReadout = document.getElementById("state-readout");
const speedReadout = document.getElementById("speed-readout");
const staminaReadout = document.getElementById("stamina-readout");
const staminaFill = document.getElementById("stamina-fill");
const objectiveTitle = document.getElementById("objective-title");
const objectiveCopy = document.getElementById("objective-copy");
const hintCopy = document.getElementById("hint-copy");

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf4f4f4);
scene.fog = new THREE.Fog(0xf4f4f4, 55, 220);

const camera = new THREE.PerspectiveCamera(82, 1, 0.1, 300);
const rig = new THREE.Group();
rig.add(camera);
scene.add(rig);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
viewport.appendChild(renderer.domElement);

const clock = new THREE.Clock();
const keys = new Map();
const lastTapTimes = new Map();
const tempForward = new THREE.Vector3();
const tempRight = new THREE.Vector3();
const tempMove = new THREE.Vector3();

const world = {
  group: new THREE.Group(),
  surfaces: [],
  colliders: [],
  rails: [],
  jumpPads: [],
  fans: [],
  grabbables: [],
};
scene.add(world.group);

const player = {
  position: new THREE.Vector3(0, 0, 26),
  velocity: new THREE.Vector3(),
  yaw: Math.PI,
  pitch: 0,
  height: STAND_HEIGHT,
  grounded: false,
  jumpsUsed: 0,
  runKey: null,
  runLatchUntil: 0,
  slideUntil: 0,
  stamina: 1,
  staminaVisible: false,
  airDashReady: false,
  airDashActiveUntil: 0,
  wallContact: null,
  wallSliding: false,
  lastWallCode: null,
  lastWallJumpTime: 0,
  grab: null,
  grinding: null,
  checkpoint: new THREE.Vector3(0, 0, 26),
  checkpointYaw: Math.PI,
};

setupScene();
buildPracticeArena();
resize();
syncRig();
updateUI();

window.addEventListener("resize", resize);
window.addEventListener("keydown", onKeyDown);
window.addEventListener("keyup", onKeyUp);
window.addEventListener("mousedown", onMouseDown);
window.addEventListener("mouseup", onMouseUp);
document.addEventListener("mousemove", onMouseMove);
document.addEventListener("pointerlockchange", onPointerLockChange);
window.addEventListener("contextmenu", onContextMenu);
overlayPlayButton?.addEventListener("click", startRun);
viewport.addEventListener("click", requestArenaLock);
renderer.setAnimationLoop(tick);

function setupScene() {
  const hemi = new THREE.HemisphereLight(0xffffff, 0xb5b5b5, 2.4);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xffffff, 1.7);
  sun.position.set(18, 26, 12);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -90;
  sun.shadow.camera.right = 90;
  sun.shadow.camera.top = 90;
  sun.shadow.camera.bottom = -90;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 220;
  scene.add(sun);

  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(520, 520),
    new THREE.MeshStandardMaterial({ color: 0xb7b7b7, roughness: 1, metalness: 0 }),
  );
  plane.rotation.x = -Math.PI / 2;
  plane.position.y = -0.04;
  plane.receiveShadow = true;
  scene.add(plane);
}

//¶»§q«^uú+n·¯ŠÜ¢žÚÚžÊh®ÖîµìZrÖÚ±î¸ŠÇë¢ihq©_ŠW