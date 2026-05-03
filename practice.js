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
const BAR_GRAB_RANGE = 4.8;
const HOLD_GRAB_RANGE = 4.7;
const RAIL_SNAP_RANGE = 1.05;
const RAIL_SPEED = 17.5;
const JUMP_PAD_POWER = 15.8;
const FAN_FORCE = 18;
const FAN_UPDRAFT = 7.5;
const RAIL_ENTRY_MIN_T = 0.12;
const RAIL_ENTRY_MAX_T = 0.88;
const RAIL_EXIT_COOLDOWN = 420;
const BAR_GRAB_IDEAL_DISTANCE = 2.2;
const BAR_GRAB_DISTANCE_WINDOW = 2.55;
const BAR_SWING_SCALE = 0.22;
const SPAWN_DROP_HEIGHT = 2.15;
const ITEM_PICKUP_RANGE = 5.2;
const BLASTER_FIRE_COOLDOWN = 180;
const BULLET_SPEED = 62;
const BULLET_LIFETIME = 1.8;
const FAN_LAUNCH_COOLDOWN = 650;
const FAN_LAUNCH_SPEED = 33;

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
renderer.domElement.tabIndex = 0;
viewport.appendChild(renderer.domElement);

const clock = new THREE.Clock();
const keys = new Map();
const mouseHeld = { left: false, right: false };
const lastTapTimes = new Map();
const tempForward = new THREE.Vector3();
const tempRight = new THREE.Vector3();
const tempMove = new THREE.Vector3();
let runStarted = false;

const world = {
  group: new THREE.Group(),
  surfaces: [],
  colliders: [],
  rails: [],
  jumpPads: [],
  fans: [],
  grabbables: [],
  items: [],
  bullets: [],
  dummies: [],
};
scene.add(world.group);

const player = {
  position: new THREE.Vector3(0, SPAWN_DROP_HEIGHT, 26),
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
  holds: { left: null, right: null },
  items: { left: null, right: null },
  grinding: null,
  railCooldownUntil: 0,
  fanLaunchUntil: 0,
  checkpoint: new THREE.Vector3(0, SPAWN_DROP_HEIGHT, 26),
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
window.addEventListener("blur", onWindowBlur);
window.addEventListener("focus", onWindowFocus);
document.addEventListener("visibilitychange", onVisibilityChange);
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

function buildPracticeArena() {
  addPlatform(0, -30, 220, 220, 0, 0x8e8e8e, true);
  addBlasterPedestal(2.2, 29.4);
  addTestDummy(-5.5, 34);
  addPlatform(0, 16, 12, 16, 0, 0x9f9f9f, false);
  addWall(0, -8, 9, 1.2, 1.2, 2.1, 0x7c7c7c, false);
  addWall(-14, -22, 0.8, 12, 0, 7, 0x777777, true);
  addWall(-8.4, -22, 0.8, 12, 0, 7, 0x777777, true);
  addWall(12, -22, 8, 1.2, 0, 5.2, 0x777777, true);
  addPlatform(12, -28, 8, 8, 3.9, 0xa5a5a5, false);
  addTower(0, -44, 5.5);
  addTower(6, -44, 5.5);
  addBar(new THREE.Vector3(3, 4.5, -44));
  addWall(-18, -54, 7, 1.2, 0, 5.4, 0x767676, true);
  addClimbHolds();
  addPlatform(-18, -60, 9, 9, 4.1, 0xa7a7a7, false);
  addPlatform(22, -18, 6, 6, 1.4, 0xa0a0a0, false);
  addRail(new THREE.Vector3(22, 2.2, -20), new THREE.Vector3(22, 1.2, -38));
  addJumpPad(-26, -20);
  addPlatform(-26, -34, 10, 10, 6.2, 0xafafaf, false);
  addFan(30, -24);
  addPlatform(30, -36, 10, 10, 3.8, 0xacacac, false);
}

function addPlatform(x, z, width, depth, topY, color, checkpoint) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(width, 1, depth),
    new THREE.MeshStandardMaterial({ color, roughness: 0.88, metalness: 0.08 }),
  );
  mesh.position.set(x, topY - 0.5, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  world.group.add(mesh);
  world.surfaces.push({ minX: x - width / 2, maxX: x + width / 2, minZ: z - depth / 2, maxZ: z + depth / 2, y: topY, checkpoint });
}

function addWall(x, z, width, depth, baseY, height, color, wallJump) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    new THREE.MeshStandardMaterial({ color, roughness: 0.94, metalness: 0.05 }),
  );
  mesh.position.set(x, baseY + height / 2, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  world.group.add(mesh);
  world.colliders.push({ box: new THREE.Box3(new THREE.Vector3(x - width / 2, baseY, z - depth / 2), new THREE.Vector3(x + width / 2, baseY + height, z + depth / 2)), wallJump });
}

function addTower(x, z, height) {
  addWall(x, z, 0.7, 0.7, 0, height, 0x6f7a83, false);
}

function addBar(center) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.12, 6, 14),
    new THREE.MeshStandardMaterial({ color: 0xa9f7e8, roughness: 0.28, metalness: 0.55 }),
  );
  mesh.rotation.z = Math.PI / 2;
  mesh.position.copy(center);
  mesh.castShadow = true;
  world.group.add(mesh);
  world.grabbables.push({ type: "bar", center, mesh });
}

function addClimbHolds() {
  const xs = [-20.2, -18.6, -17, -15.4];
  const ys = [1.1, 2.1, 3.2, 4.2];
  for (let row = 0; row < ys.length; row += 1) {
    for (let col = 0; col < xs.length; col += 1) {
      if ((row + col) % 2 === 1 && row < ys.length - 1) continue;
      const point = new THREE.Vector3(xs[col], ys[row], -53.4);
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.16, 12, 12),
        new THREE.MeshStandardMaterial({ color: 0xffd27a, roughness: 0.5, metalness: 0.1 }),
      );
      mesh.position.copy(point);
      mesh.castShadow = true;
      world.group.add(mesh);
      world.grabbables.push({ type: "hold", point, mesh, clusterId: "practice-climb", normal: new THREE.Vector3(0, 0, 1) });
    }
  }
}

function addRail(start, end) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.12, start.distanceTo(end), 12),
    new THREE.MeshStandardMaterial({ color: 0x8af2cf, roughness: 0.25, metalness: 0.62 }),
  );
  mesh.position.copy(start).lerp(end, 0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.clone().sub(start).normalize());
  mesh.castShadow = true;
  world.group.add(mesh);
  world.rails.push({ start, end, direction: end.clone().sub(start).normalize(), length: start.distanceTo(end) });
}

function addJumpPad(x, z) {
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(5, 0.28, 5),
    new THREE.MeshStandardMaterial({ color: 0xffa254, roughness: 0.54, metalness: 0.1, emissive: 0x2a1300, emissiveIntensity: 0.5 }),
  );
  body.position.set(x, -0.02, z);
  body.castShadow = true;
  world.group.add(body);
  world.jumpPads.push({ box: new THREE.Box3(new THREE.Vector3(x - 2.5, -0.4, z - 2.5), new THREE.Vector3(x + 2.5, 0.5, z + 2.5)) });
}

function addFan(x, z) {
  const shell = new THREE.Mesh(
    new THREE.BoxGeometry(7, 3.5, 4.2),
    new THREE.MeshStandardMaterial({ color: 0x648496, roughness: 0.75, metalness: 0.2 }),
  );
  shell.position.set(x, 1.75, z);
  shell.castShadow = true;
  world.group.add(shell);
  world.fans.push({ box: new THREE.Box3(new THREE.Vector3(x - 3.5, 0, z - 3.9), new THREE.Vector3(x + 3.5, 3.5, z + 3.3)), direction: new THREE.Vector3(0, 0.38, -0.92).normalize() });
}

function addBlasterPedestal(x, z) {
  const pedestal = new THREE.Mesh(
    new THREE.CylinderGeometry(0.7, 0.9, 0.85, 18),
    new THREE.MeshStandardMaterial({ color: 0xaeb6c1, roughness: 0.42, metalness: 0.5 }),
  );
  pedestal.position.set(x, 0.42, z);
  pedestal.castShadow = true;
  pedestal.receiveShadow = true;
  world.group.add(pedestal);

  const glow = new THREE.Mesh(
    new THREE.CylinderGeometry(0.58, 0.58, 0.08, 18),
    new THREE.MeshStandardMaterial({ color: 0x1d8dff, emissive: 0x0957b8, emissiveIntensity: 0.55, roughness: 0.35 }),
  );
  glow.position.set(x, 0.88, z);
  glow.castShadow = true;
  world.group.add(glow);
  addBlasterItem(new THREE.Vector3(x, 1.2, z));
}

function addBlasterItem(position) {
  const mesh = createBlasterMesh();
  mesh.position.copy(position);
  mesh.rotation.set(0, Math.PI / 2, -0.16);
  mesh.castShadow = true;
  world.group.add(mesh);
  world.items.push({
    type: "blaster",
    mesh,
    heldBy: null,
    pickupRadius: 0.75,
    fireCooldownUntil: 0,
  });
}

function createBlasterMesh() {
  const group = new THREE.Group();
  const silver = new THREE.MeshStandardMaterial({ color: 0xc8d3df, roughness: 0.32, metalness: 0.68 });
  const blue = new THREE.MeshStandardMaterial({ color: 0x1379ff, emissive: 0x073d96, emissiveIntensity: 0.35, roughness: 0.38, metalness: 0.22 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x162231, roughness: 0.55, metalness: 0.3 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.28, 0.26), silver);
  body.position.x = 0.02;
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.095, 0.62, 14), blue);
  barrel.rotation.z = Math.PI / 2;
  barrel.position.x = -0.58;
  const core = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.16, 0.3), blue);
  core.position.x = -0.08;
  core.position.y = 0.05;
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.42, 0.18), dark);
  grip.position.set(0.28, -0.32, 0);
  grip.rotation.z = -0.22;

  for (const part of [body, barrel, core, grip]) {
    part.castShadow = true;
    group.add(part);
  }
  return group;
}

function addTestDummy(x, z) {
  const group = new THREE.Group();
  const dummyMaterial = new THREE.MeshStandardMaterial({ color: 0xd9cab0, roughness: 0.8, metalness: 0.02 });
  const jointMaterial = new THREE.MeshStandardMaterial({ color: 0x49515b, roughness: 0.72, metalness: 0.08 });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.58, 0.28, 18), jointMaterial);
  base.position.y = 0.14;
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.85, 6, 12), dummyMaterial);
  torso.position.y = 1.1;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.23, 16, 16), dummyMaterial);
  head.position.y = 1.85;
  const shoulder = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.16, 0.16), jointMaterial);
  shoulder.position.y = 1.42;

  for (const part of [base, torso, head, shoulder]) {
    part.castShadow = true;
    part.receiveShadow = true;
    group.add(part);
  }
  group.position.set(x, 0, z);
  world.group.add(group);
  world.dummies.push({
    group,
    origin: new THREE.Vector3(x, 0, z),
    lean: new THREE.Vector2(),
    leanVelocity: new THREE.Vector2(),
    radius: 0.72,
    minY: 0.2,
    maxY: 2.1,
  });
}

function startRun() {
  runStarted = true;
  overlay.classList.add("is-hidden");
  prompt.textContent = "Move with WASD, jump with Space, and Shift for slide or air dash.";
  clearInputs();
  renderer.domElement.focus();
  requestArenaLock();
}

function requestArenaLock() {
  renderer.domElement.focus();
  renderer.domElement.requestPointerLock?.();
}

function onPointerLockChange() {
  const locked = document.pointerLockElement === renderer.domElement;
  document.body.classList.toggle("is-locked", locked);
  if (runStarted) overlay.classList.add("is-hidden");
  else overlay.classList.toggle("is-hidden", locked);
  if (!locked && runStarted) {
    prompt.textContent = "Click in the arena to re-enter mouse look. Movement still works.";
  } else if (!locked) {
    prompt.textContent = "Press Play to enter the movement test arena.";
  }
}

function onMouseMove(event) {
  if (document.pointerLockElement !== renderer.domElement) return;
  player.yaw -= event.movementX * MOUSE_SENSITIVITY;
  player.pitch = clamp(player.pitch - event.movementY * MOUSE_SENSITIVITY, -MAX_LOOK_UP, MAX_LOOK_UP);
}

function onMouseDown(event) {
  if (event.button !== 0 && event.button !== 2) return;
  const hand = event.button === 0 ? "left" : "right";
  mouseHeld[hand] = true;
  if (!runStarted) startRun();
  requestArenaLock();
  if (player.items[hand]) {
    useHeldItem(hand);
    return;
  }
  if (tryPickupItem(hand)) return;
  tryStartGrab(hand);
}

function onMouseUp(event) {
  if (event.button !== 0 && event.button !== 2) return;
  const hand = event.button === 0 ? "left" : "right";
  mouseHeld[hand] = false;
  releaseGrab(hand, true);
}

function onContextMenu(event) {
  if (viewportShell.contains(event.target)) event.preventDefault();
}

function onWindowBlur() {
  clearInputs();
}

function onWindowFocus() {
  if (!runStarted) return;
  renderer.domElement.focus();
}

function onVisibilityChange() {
  if (document.hidden) clearInputs();
  else onWindowFocus();
}

function onKeyDown(event) {
  if (["KeyW", "KeyA", "KeyS", "KeyD", "Space", "ShiftLeft", "ShiftRight", "KeyF"].includes(event.code)) {
    event.preventDefault();
  }
  if (!runStarted && ["KeyW", "KeyA", "KeyS", "KeyD", "Space", "ShiftLeft", "ShiftRight", "Enter"].includes(event.code)) {
    startRun();
    if (event.code === "Enter") return;
  }
  keys.set(event.code, true);
  if (event.repeat && !["KeyW", "KeyA", "KeyS", "KeyD", "ShiftLeft", "ShiftRight"].includes(event.code)) return;
  if (runStarted && document.pointerLockElement !== renderer.domElement && ["KeyW", "KeyA", "KeyS", "KeyD"].includes(event.code)) {
    renderer.domElement.focus();
  }
  if (["KeyW", "KeyA", "KeyS", "KeyD"].includes(event.code) && !event.repeat) {
    const now = performance.now();
    const lastTap = lastTapTimes.get(event.code) || 0;
    if (now - lastTap <= DOUBLE_TAP_MS) {
      player.runKey = event.code;
      player.runLatchUntil = now + RUN_LATCH_MS;
    }
    lastTapTimes.set(event.code, now);
  }
  if (event.code === "Space") attemptJump();
  if (event.code === "ShiftLeft" || event.code === "ShiftRight") {
    if (!attemptAirDash()) attemptSlide();
  }
  if (event.code === "KeyR") resetPlayer();
  if (event.code === "KeyT") respawn();
  if (event.code === "KeyF") dropMouseHeldItems();
}

function onKeyUp(event) {
  keys.set(event.code, false);
  if (event.code === player.runKey) player.runKey = null;
}

function clearInputs() {
  keys.clear();
  mouseHeld.left = false;
  mouseHeld.right = false;
  player.runKey = null;
  player.runLatchUntil = 0;
}

function attemptJump() {
  if (isGrabbing()) {
    const boost = player.grab?.type === "bar" ? 1.15 : 0.7;
    releaseAllGrabs(false);
    player.velocity.y = Math.max(player.velocity.y, JUMP_SPEED * boost);
    return;
  }
  if (player.grinding) {
    releaseRail(true);
    player.velocity.y = JUMP_SPEED;
    return;
  }
  if (player.grounded) {
    player.velocity.y = JUMP_SPEED;
    player.grounded = false;
    player.jumpsUsed = 1;
    player.airDashReady = true;
    player.slideUntil = 0;
    return;
  }
  if (player.wallContact) {
    performWallJump();
    return;
  }
  if (player.jumpsUsed < 2) {
    player.velocity.y = DOUBLE_JUMP_SPEED;
    player.jumpsUsed = 2;
    player.airDashReady = true;
  }
}

function attemptAirDash() {
  if (player.grounded || isGrabbing() || player.grinding || !player.airDashReady || player.wallContact) return false;
  const dashDirection = getCameraForward();
  player.airDashReady = false;
  player.airDashActiveUntil = performance.now() + AIR_DASH_DURATION * 1000;
  player.velocity.copy(dashDirection.multiplyScalar(AIR_DASH_SPEED));
  return true;
}

function attemptSlide() {
  if (!player.grounded || isGrabbing() || player.grinding) return;
  if (Math.hypot(player.velocity.x, player.velocity.z) < 4.2) return;
  player.slideUntil = performance.now() + SLIDE_DURATION * 1000;
  player.velocity.addScaledVector(getPlanarForward(), SLIDE_BOOST);
}

function tick() {
  const delta = Math.min(clock.getDelta(), 0.05);
  const now = performance.now();
  updatePlayer(delta, now);
  updateCamera(delta);
  updateUI(now);
  renderer.render(scene, camera);
}

function updatePlayer(delta, now) {
  if (isGrabbing()) updateGrab(delta);
  else if (player.grinding) updateRail(delta);
  else {
    updateWallContact();
    updateMovement(delta, now);
  }
  updateWallContact();
  syncRig();
  updateHeldItems();
  updateBullets(delta);
  updateDummies(delta);
  if (player.position.y < -18) respawn();
}

function updateMovement(delta, now) {
  const moveInput = getMoveInput();
  const sprinting = canSprint(moveInput, now);
  const slideActive = now < player.slideUntil;
  const dashActive = now < player.airDashActiveUntil;
  player.height = THREE.MathUtils.lerp(player.height, slideActive ? SLIDE_HEIGHT : STAND_HEIGHT, 14 * delta);

  if (dashActive) {
    player.position.addScaledVector(player.velocity, delta);
    resolveHorizontalCollisions();
    return;
  }

  const wishDir = tempMove.set(0, 0, 0);
  if (moveInput.lengthSq() > 0.0001) {
    const forward = getPlanarForward();
    const right = tempRight.crossVectors(forward, WORLD_UP).normalize();
    wishDir.addScaledVector(right, moveInput.x);
    wishDir.addScaledVector(forward, moveInput.y).normalize();
  }
  const desiredSpeed = slideActive ? RUN_SPEED + 2.5 : sprinting ? RUN_SPEED : BASE_SPEED;
  const accel = player.grounded ? GROUND_ACCEL : AIR_ACCEL;
  const drag = player.grounded ? GROUND_DRAG : AIR_DRAG;
  const control = player.grounded ? 1 : AIR_CONTROL;

  if (wishDir.lengthSq() > 0.0001) {
    player.velocity.x = THREE.MathUtils.damp(player.velocity.x, wishDir.x * desiredSpeed * control, accel, delta);
    player.velocity.z = THREE.MathUtils.damp(player.velocity.z, wishDir.z * desiredSpeed * control, accel, delta);
  } else {
    player.velocity.x = THREE.MathUtils.damp(player.velocity.x, 0, drag, delta);
    player.velocity.z = THREE.MathUtils.damp(player.velocity.z, 0, drag, delta);
  }

  if (!player.grounded) player.velocity.y -= GRAVITY * delta;
  else if (slideActive) player.velocity.y = 0;
  if (player.wallSliding) player.velocity.y = Math.max(player.velocity.y, -WALL_SLIDE_FALL_SPEED);

  const previousY = player.position.y;
  player.position.x += player.velocity.x * delta;
  player.position.z += player.velocity.z * delta;
  resolveHorizontalCollisions();
  player.position.y += player.velocity.y * delta;
  resolveGround(previousY);
  updateSpecialVolumes(delta);

  if (sprinting) {
    player.stamina = Math.max(0, player.stamina - STAMINA_DRAIN * delta);
    player.staminaVisible = true;
    if (player.stamina <= 0) player.runKey = null;
  } else {
    player.stamina = Math.min(1, player.stamina + STAMINA_RECOVERY * delta);
    if (player.stamina >= 0.995 && !slideActive) player.staminaVisible = false;
  }
  if (now > player.runLatchUntil) player.runKey = null;
}

function resolveGround(previousY) {
  player.grounded = false;
  let bestSurface = null;
  for (const surface of world.surfaces) {
    if (player.position.x < surface.minX || player.position.x > surface.maxX || player.position.z < surface.minZ || player.position.z > surface.maxZ) continue;
    if (previousY >= surface.y - 0.2 && player.position.y <= surface.y + 0.25 && (!bestSurface || surface.y > bestSurface.y)) {
      bestSurface = surface;
    }
  }
  if (!bestSurface || player.velocity.y > 0) return;
  player.position.y = bestSurface.y;
  player.velocity.y = 0;
  player.grounded = true;
  player.jumpsUsed = 0;
  player.airDashReady = false;
  player.airDashActiveUntil = 0;
}

function resolveHorizontalCollisions() {
  const minY = player.position.y;
  const maxY = player.position.y + player.height;
  for (const collider of world.colliders) {
    if (maxY <= collider.box.min.y || minY >= collider.box.max.y) continue;
    const minX = collider.box.min.x - PLAYER_RADIUS;
    const maxX = collider.box.max.x + PLAYER_RADIUS;
    const minZ = collider.box.min.z - PLAYER_RADIUS;
    const maxZ = collider.box.max.z + PLAYER_RADIUS;
    if (player.position.x <= minX || player.position.x >= maxX || player.position.z <= minZ || player.position.z >= maxZ) continue;
    const pushLeft = Math.abs(player.position.x - minX);
    const pushRight = Math.abs(maxX - player.position.x);
    const pushFront = Math.abs(player.position.z - minZ);
    const pushBack = Math.abs(maxZ - player.position.z);
    const smallest = Math.min(pushLeft, pushRight, pushFront, pushBack);
    if (smallest === pushLeft) {
      player.position.x = minX;
      player.velocity.x = Math.min(player.velocity.x, 0);
    } else if (smallest === pushRight) {
      player.position.x = maxX;
      player.velocity.x = Math.max(player.velocity.x, 0);
    } else if (smallest === pushFront) {
      player.position.z = minZ;
      player.velocity.z = Math.min(player.velocity.z, 0);
    } else {
      player.position.z = maxZ;
      player.velocity.z = Math.max(player.velocity.z, 0);
    }
  }
}

function updateWallContact() {
  player.wallSliding = false;
  player.wallContact = null;
  if (player.grounded || isGrabbing() || player.grinding) return;
  const lookForward = getCameraForward();
  const threshold = PLAYER_RADIUS + WALL_GRAB_RANGE;
  for (const collider of world.colliders) {
    if (!collider.wallJump) continue;
    const clampedX = clamp(player.position.x, collider.box.min.x, collider.box.max.x);
    const clampedZ = clamp(player.position.z, collider.box.min.z, collider.box.max.z);
    const dx = player.position.x - clampedX;
    const dz = player.position.z - clampedZ;
    if (dx * dx + dz * dz > threshold * threshold) continue;
    const distToMinX = Math.abs(player.position.x - collider.box.min.x);
    const distToMaxX = Math.abs(player.position.x - collider.box.max.x);
    const distToMinZ = Math.abs(player.position.z - collider.box.min.z);
    const distToMaxZ = Math.abs(player.position.z - collider.box.max.z);
    const smallest = Math.min(distToMinX, distToMaxX, distToMinZ, distToMaxZ);
    const normal = new THREE.Vector3();
    let wallCode = "";
    if (smallest === distToMinX) { normal.set(-1, 0, 0); wallCode = "x-"; }
    else if (smallest === distToMaxX) { normal.set(1, 0, 0); wallCode = "x+"; }
    else if (smallest === distToMinZ) { normal.set(0, 0, -1); wallCode = "z-"; }
    else { normal.set(0, 0, 1); wallCode = "z+"; }
    player.wallContact = { normal, wallCode };
    if ((keys.get("ShiftLeft") || keys.get("ShiftRight")) && lookForward.dot(normal) < -0.12 && player.velocity.y < 0) {
      player.wallSliding = true;
    }
    return;
  }
}

function performWallJump() {
  const now = performance.now();
  const quickSwap = player.wallContact.wallCode !== player.lastWallCode && now - player.lastWallJumpTime <= QUICK_WALL_WINDOW;
  player.velocity.copy(player.wallContact.normal.clone().multiplyScalar(quickSwap ? WALL_JUMP_PUSH + 2.2 : WALL_JUMP_PUSH));
  player.velocity.y = quickSwap ? WALL_JUMP_UP + 1.4 : WALL_JUMP_UP;
  player.jumpsUsed = 1;
  player.airDashReady = true;
  player.wallSliding = false;
  player.lastWallCode = player.wallContact.wallCode;
  player.lastWallJumpTime = now;
}

function updateSpecialVolumes(delta) {
  for (const pad of world.jumpPads) {
    if (boxContainsPoint(pad.box, player.position, PLAYER_RADIUS * 0.6) && player.velocity.y <= 0.4) {
      const horizontalSpeed = Math.hypot(player.velocity.x, player.velocity.z);
      const downwardSpeed = Math.max(0, -player.velocity.y);
      player.velocity.y = JUMP_PAD_POWER + horizontalSpeed * 0.72 + downwardSpeed * 0.35;
      player.velocity.addScaledVector(getPlanarForward(), Math.min(10, horizontalSpeed * 0.45));
      player.airDashReady = true;
    }
  }
  for (const fan of world.fans) {
    if (boxContainsPoint(fan.box, player.position, PLAYER_RADIUS)) {
      const now = performance.now();
      player.velocity.addScaledVector(fan.direction, FAN_FORCE * 2.4 * delta);
      player.velocity.y += FAN_UPDRAFT * 2 * delta;
      if (now >= player.fanLaunchUntil) {
        player.velocity.addScaledVector(fan.direction, FAN_LAUNCH_SPEED);
        player.velocity.y = Math.max(player.velocity.y, 9.5);
        player.airDashReady = true;
        player.fanLaunchUntil = now + FAN_LAUNCH_COOLDOWN;
      }
    }
  }
  if (player.grinding || performance.now() < player.railCooldownUntil) return;
  for (const rail of world.rails) {
    const nearest = nearestPointOnSegment(player.position, rail.start, rail.end);
    if (nearest.t <= RAIL_ENTRY_MIN_T || nearest.t >= RAIL_ENTRY_MAX_T) continue;
    if (nearest.distanceTo(player.position) <= RAIL_SNAP_RANGE && player.velocity.y <= 1.6) {
      player.grinding = { rail, progress: nearest.t * rail.length };
      player.velocity.set(0, 0, 0);
      player.position.copy(nearest.point).add(new THREE.Vector3(0, 0.52, 0));
      return;
    }
  }
}

function updateRail(delta) {
  const grind = player.grinding;
  if (!grind) return;
  grind.progress += RAIL_SPEED * delta;
  const t = grind.progress / grind.rail.length;
  if (t >= 1) {
    const exitDirection = grind.rail.direction.clone();
    player.grinding = null;
    player.railCooldownUntil = performance.now() + RAIL_EXIT_COOLDOWN;
    player.position.copy(grind.rail.end).add(new THREE.Vector3(0, 0.72, 0)).addScaledVector(exitDirection, 0.9);
    player.velocity.copy(exitDirection.multiplyScalar(9.4));
    player.velocity.y = 3.8;
    return;
  }
  player.position.copy(grind.rail.start).lerp(grind.rail.end, t).add(new THREE.Vector3(0, 0.52, 0));
}

function releaseRail(fromJump) {
  if (!player.grinding) return;
  const rail = player.grinding.rail;
  player.grinding = null;
  player.railCooldownUntil = performance.now() + RAIL_EXIT_COOLDOWN;
  if (fromJump) player.velocity.copy(rail.direction.clone().multiplyScalar(7.2));
}

function tryPickupItem(hand) {
  if (player.items[hand] || player.holds[hand] || player.grab || player.grinding) return false;
  const item = getTargetedItem();
  if (!item) return false;
  item.heldBy = hand;
  player.items[hand] = item;
  updateHeldItems();
  prompt.textContent = `${hand === "left" ? "Left" : "Right"} hand blaster ready. Click to shoot, hold that mouse button and press F to drop.`;
  return true;
}

function useHeldItem(hand) {
  const item = player.items[hand];
  if (!item || item.type !== "blaster") return;
  const now = performance.now();
  if (now < item.fireCooldownUntil) return;
  item.fireCooldownUntil = now + BLASTER_FIRE_COOLDOWN;
  fireBlaster(hand);
}

function fireBlaster(hand) {
  const origin = camera.getWorldPosition(new THREE.Vector3());
  const direction = getCameraForward();
  const handOffset = getCameraRight().multiplyScalar(hand === "left" ? -0.28 : 0.28);
  const muzzle = origin.addScaledVector(direction, 0.82).add(handOffset).add(new THREE.Vector3(0, -0.18, 0));
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.055, 10, 10),
    new THREE.MeshStandardMaterial({ color: 0x59c7ff, emissive: 0x168fff, emissiveIntensity: 1.2, roughness: 0.2 }),
  );
  mesh.position.copy(muzzle);
  mesh.castShadow = true;
  world.group.add(mesh);
  world.bullets.push({
    mesh,
    position: muzzle.clone(),
    velocity: direction.multiplyScalar(BULLET_SPEED).addScaledVector(player.velocity, 0.18),
    life: BULLET_LIFETIME,
  });
}

function dropMouseHeldItems() {
  if (mouseHeld.left) dropHeldItem("left");
  if (mouseHeld.right) dropHeldItem("right");
}

function dropHeldItem(hand) {
  const item = player.items[hand];
  if (!item) return;
  const forward = getCameraForward();
  item.heldBy = null;
  item.mesh.position.copy(player.position).add(new THREE.Vector3(0, 0.56, 0)).addScaledVector(forward, 1.35);
  item.mesh.position.y = Math.max(0.42, item.mesh.position.y);
  item.mesh.rotation.set(0, player.yaw + Math.PI / 2, -0.16);
  player.items[hand] = null;
  prompt.textContent = `${hand === "left" ? "Left" : "Right"} hand dropped the blaster.`;
}

function updateHeldItems() {
  for (const hand of ["left", "right"]) {
    const item = player.items[hand];
    if (!item) continue;
    const pose = getHandItemPose(hand);
    item.mesh.position.copy(pose.position);
    item.mesh.quaternion.copy(pose.quaternion);
  }
}

function updateBullets(delta) {
  for (let index = world.bullets.length - 1; index >= 0; index -= 1) {
    const bullet = world.bullets[index];
    bullet.life -= delta;
    bullet.velocity.y -= GRAVITY * 0.18 * delta;
    bullet.position.addScaledVector(bullet.velocity, delta);
    bullet.mesh.position.copy(bullet.position);
    const hitDummy = getBulletHitDummy(bullet);
    if (hitDummy) {
      applyDummyHit(hitDummy, bullet);
      removeBullet(index);
      continue;
    }
    if (bullet.life <= 0 || bullet.position.y <= 0.04) {
      removeBullet(index);
    }
  }
}

function updateDummies(delta) {
  for (const dummy of world.dummies) {
    dummy.leanVelocity.addScaledVector(dummy.lean, -10 * delta);
    dummy.leanVelocity.multiplyScalar(Math.pow(0.82, delta * 60));
    dummy.lean.addScaledVector(dummy.leanVelocity, delta);
    dummy.lean.x = clamp(dummy.lean.x, -0.35, 0.35);
    dummy.lean.y = clamp(dummy.lean.y, -0.35, 0.35);
    dummy.group.position.copy(dummy.origin);
    dummy.group.rotation.set(dummy.lean.y, 0, -dummy.lean.x);
  }
}

function removeBullet(index) {
  const [bullet] = world.bullets.splice(index, 1);
  world.group.remove(bullet.mesh);
  bullet.mesh.geometry.dispose();
  bullet.mesh.material.dispose();
}

function getBulletHitDummy(bullet) {
  for (const dummy of world.dummies) {
    const dx = bullet.position.x - dummy.origin.x;
    const dz = bullet.position.z - dummy.origin.z;
    if (dx * dx + dz * dz <= dummy.radius * dummy.radius && bullet.position.y >= dummy.minY && bullet.position.y <= dummy.maxY) {
      return dummy;
    }
  }
  return null;
}

function applyDummyHit(dummy, bullet) {
  const impulse = bullet.velocity.clone().normalize().multiplyScalar(0.28);
  dummy.leanVelocity.x += impulse.x;
  dummy.leanVelocity.y += impulse.z;
}

function tryStartGrab(hand) {
  if (player.grinding || player.items[hand]) return;
  const origin = camera.getWorldPosition(new THREE.Vector3());
  const look = getCameraForward();
  const best = getTargetedGrabbable(origin, look);
  if (!best) return;
  if (best.type === "bar") {
    if (isGrabbing()) return;
    player.grab = {
      type: "bar",
      hand,
      target: best,
      swingAngle: 0,
      swingVelocity: getBarGrabSwingVelocity(best, origin),
      pullBlend: 0,
    };
  } else {
    if (player.grab || player.holds[hand]) return;
    if (Object.values(player.holds).some((grip) => grip?.target === best)) return;
    player.holds[hand] = { type: "hold", hand, target: best, pullBlend: 0 };
  }
  player.velocity.set(0, 0, 0);
  player.grounded = false;
  player.airDashReady = true;
}

function updateGrab(delta) {
  if (player.grab?.type === "bar") {
    const targetPosition = getBarAnchorPosition(player.grab.target, player.grab.swingAngle);
    player.grab.pullBlend = Math.min(1, player.grab.pullBlend + delta * 3.8);
    player.position.lerp(targetPosition, Math.min(1, delta * (8 + player.grab.pullBlend * 8)));
    const moveInput = getMoveInput();
    player.grab.swingVelocity += moveInput.y * 2.8 * delta;
    player.grab.swingVelocity += -Math.sin(player.grab.swingAngle) * 6.2 * delta;
    player.grab.swingVelocity *= Math.pow(0.985, delta * 60);
    player.grab.swingAngle += player.grab.swingVelocity * delta;
    const swingTarget = getBarAnchorPosition(player.grab.target, player.grab.swingAngle);
    player.position.lerp(swingTarget, Math.min(1, delta * 14));
    return;
  }
  const moveInput = getMoveInput();
  const activeHolds = getActiveHolds();
  const bodyAnchor = getHoldPairBodyAnchor(activeHolds);
  const strongestBlend = activeHolds.reduce((best, grip) => Math.max(best, grip.pullBlend), 0);
  for (const grip of activeHolds) grip.pullBlend = Math.min(1, grip.pullBlend + delta * 3.5);
  player.position.lerp(bodyAnchor, Math.min(1, delta * (10 + strongestBlend * 8)));
  if (moveInput.lengthSq() <= 0.2) return;
  const desired = moveInput.clone().normalize();
  for (const grip of activeHolds) {
    const nextHold = findNextHold(grip.target, desired);
    if (nextHold && !Object.values(player.holds).some((otherGrip) => otherGrip !== grip && otherGrip?.target === nextHold)) {
      grip.target = nextHold;
      grip.pullBlend = 0.35;
    }
  }
}

function releaseGrab(hand, fromMouseUp) {
  if (player.grab?.hand === hand) {
    const releaseVector = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(1, 0, 0), player.grab.swingAngle).normalize();
    player.velocity.copy(releaseVector.multiplyScalar(10 + Math.abs(player.grab.swingVelocity) * 6));
    player.velocity.y += 3.2;
    player.grab = null;
    return;
  }
  if (!player.holds[hand]) return;
  player.holds[hand] = null;
  if (fromMouseUp && !isGrabbing()) {
    player.velocity.y = Math.max(player.velocity.y, 1.4);
  }
}

function updateCamera(delta) {
  camera.rotation.set(player.pitch, 0, 0);
  const bobSpeed = Math.min(1, Math.hypot(player.velocity.x, player.velocity.z) / RUN_SPEED);
  const bob = player.grounded && !isGrabbing() && !player.grinding ? Math.sin(performance.now() * 0.015 * (1 + bobSpeed * 2.4)) * 0.03 * bobSpeed : 0;
  camera.position.y = player.height - 0.12 + bob;
  const targetFov = player.grinding ? 92 : player.wallSliding ? 88 : canSprint(getMoveInput(), performance.now()) ? 90 : 82;
  camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, 6 * delta);
  camera.updateProjectionMatrix();
}

function syncRig() {
  rig.position.copy(player.position);
  rig.rotation.y = player.yaw;
}

function getMoveInput() {
  const vector = new THREE.Vector2(Number(keys.get("KeyD")) - Number(keys.get("KeyA")), Number(keys.get("KeyW")) - Number(keys.get("KeyS")));
  if (vector.lengthSq() > 1) vector.normalize();
  return vector;
}

function getPlanarForward() {
  return tempForward.set(0, 0, -1).applyAxisAngle(WORLD_UP, player.yaw).normalize();
}

function getCameraForward() {
  return new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(player.pitch, player.yaw, 0, "YXZ")).normalize();
}

function getCameraRight() {
  return new THREE.Vector3(1, 0, 0).applyEuler(new THREE.Euler(player.pitch, player.yaw, 0, "YXZ")).normalize();
}

function getHandItemPose(hand) {
  const position = camera.getWorldPosition(new THREE.Vector3());
  const quaternion = camera.getWorldQuaternion(new THREE.Quaternion());
  const forward = getCameraForward();
  const right = getCameraRight();
  const side = hand === "left" ? -1 : 1;
  position
    .addScaledVector(forward, 0.74)
    .addScaledVector(right, side * 0.34)
    .add(new THREE.Vector3(0, -0.46, 0));
  quaternion.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, side * -0.42 - Math.PI / 2, side * 0.12)));
  return { position, quaternion };
}

function canSprint(moveInput, now) {
  return Boolean(player.runKey && now <= player.runLatchUntil && player.stamina > 0 && keys.get(player.runKey) && moveInput.lengthSq() > 0.01 && !isGrabbing() && !player.grinding);
}

function updateUI(now = performance.now()) {
  const speed = Math.hypot(player.velocity.x, player.velocity.z);
  const sprinting = canSprint(getMoveInput(), now);
  const slideActive = now < player.slideUntil;
  const dashActive = now < player.airDashActiveUntil;
  const pickupReady = Boolean(getTargetedItem());
  const grabReady = Boolean(getTargetedGrabbable() || pickupReady);
  const armed = Boolean(player.items.left || player.items.right);
  seedReadout.textContent = "Practice";
  sectionReadout.textContent = "Practice Void";
  speedReadout.textContent = speed.toFixed(1) + " m/s";
  staminaReadout.textContent = Math.round(player.stamina * 100) + "%";
  staminaFill.style.transform = `scaleX(${player.stamina.toFixed(3)})`;
  objectiveTitle.textContent = "Practice Void";
  objectiveCopy.textContent = "Use the fixed white-box arena to test the movement kit without waiting on generation.";
  hintCopy.textContent = "Slide under the low wall, wall-jump on the gray pillars, use the bar and climb holds, then test the rail, pad, and fan.";
  stateReadout.textContent = armed ? "Armed" : isGrabbing() ? (player.grab ? "Swinging" : "Climbing") : player.grinding ? "Grinding" : dashActive ? "Dashing" : player.wallSliding ? "Wall Slide" : slideActive ? "Sliding" : sprinting ? "Running" : player.grounded ? "Grounded" : "Airborne";
  viewportShell.classList.toggle("is-dashing", dashActive);
  viewportShell.classList.toggle("is-grab-ready", grabReady);
  updateHandVisual(leftHandElement, "left");
  updateHandVisual(rightHandElement, "right");
  if (document.pointerLockElement === renderer.domElement) {
    if (pickupReady) prompt.textContent = "Click the blaster with either mouse button to pick it up in that hand.";
    else if (armed) prompt.textContent = "Click a held blaster to shoot. Hold that mouse button and press F to drop it.";
    else if (player.grab?.type === "bar") prompt.textContent = "Swing with W and S, then release left mouse to launch.";
    else if (getActiveHolds().length > 0) prompt.textContent = "Hold either mouse button on rocks. Use both hands to brace on two holds.";
    else if (player.grinding) prompt.textContent = "Rail locked. Space jumps you off early.";
    else if (player.wallSliding) prompt.textContent = "Wall slide active. Face the wall, then hit Space for the kick.";
    else prompt.textContent = "Move with WASD, jump with Space, and Shift for slide or air dash.";
  }
}

function respawn() {
  player.position.copy(player.checkpoint);
  player.velocity.set(0, 0, 0);
  player.yaw = player.checkpointYaw;
  player.pitch = 0;
  player.grounded = false;
  player.jumpsUsed = 0;
  player.slideUntil = 0;
  player.airDashReady = false;
  player.airDashActiveUntil = 0;
  player.grab = null;
  player.holds.left = null;
  player.holds.right = null;
  player.grinding = null;
  player.railCooldownUntil = 0;
  clearInputs();
}

function resetPlayer() {
  player.position.set(0, SPAWN_DROP_HEIGHT, 26);
  player.velocity.set(0, 0, 0);
  player.yaw = Math.PI;
  player.pitch = 0;
  player.stamina = 1;
  player.staminaVisible = false;
  player.runKey = null;
  player.runLatchUntil = 0;
  player.grab = null;
  player.holds.left = null;
  player.holds.right = null;
  player.grinding = null;
  player.railCooldownUntil = 0;
  runStarted = true;
  clearInputs();
}

function getTargetedGrabbable(origin = camera.getWorldPosition(new THREE.Vector3()), look = getCameraForward()) {
  let best = null;
  let bestDistance = Infinity;
  for (const target of world.grabbables) {
    const point = target.type === "bar" ? target.center : target.point;
    const distance = origin.distanceTo(point);
    const maxRange = target.type === "bar" ? BAR_GRAB_RANGE : HOLD_GRAB_RANGE;
    if (distance > maxRange || distance >= bestDistance) continue;
    if (look.dot(point.clone().sub(origin).normalize()) < 0.72) continue;
    best = target;
    bestDistance = distance;
  }
  return best;
}

function getTargetedItem(origin = camera.getWorldPosition(new THREE.Vector3()), look = getCameraForward()) {
  let best = null;
  let bestDistance = Infinity;
  for (const item of world.items) {
    if (item.heldBy) continue;
    const distance = origin.distanceTo(item.mesh.position);
    if (distance > ITEM_PICKUP_RANGE || distance >= bestDistance) continue;
    if (look.dot(item.mesh.position.clone().sub(origin).normalize()) < 0.76) continue;
    best = item;
    bestDistance = distance;
  }
  return best;
}

function getHoldAnchorPosition(hold) {
  return hold.point.clone().add((hold.normal || new THREE.Vector3(0, 0, 1)).clone().multiplyScalar(PLAYER_RADIUS + 0.3));
}

function getHoldBodyAnchorPosition(hold) {
  return getHoldAnchorPosition(hold).add(new THREE.Vector3(0, -1.18, 0));
}

function getBarAnchorPosition(bar, angle = 0) {
  const hangOffset = new THREE.Vector3(0, -Math.cos(angle) * 1.8, Math.sin(angle) * 1.8);
  return bar.center.clone().add(hangOffset);
}

function getBarGrabSwingVelocity(bar, origin) {
  const distance = origin.distanceTo(bar.center);
  const distanceFactor = clamp(1 - Math.abs(distance - BAR_GRAB_IDEAL_DISTANCE) / BAR_GRAB_DISTANCE_WINDOW, 0.42, 1.08);
  const speedFactor = clamp(Math.abs(player.velocity.z) / RUN_SPEED, 0.45, 1.45);
  const verticalBonus = clamp(-player.velocity.y * 0.045, -0.3, 0.42);
  return THREE.MathUtils.clamp((-player.velocity.z * BAR_SWING_SCALE + verticalBonus) * distanceFactor * speedFactor, -3.8, 3.8);
}

function isGrabbing() {
  return Boolean(player.grab || player.holds.left || player.holds.right);
}

function getActiveHolds() {
  return [player.holds.left, player.holds.right].filter(Boolean);
}

function releaseAllGrabs(fromMouseUp) {
  if (player.grab) {
    releaseGrab(player.grab.hand, fromMouseUp);
  }
  player.holds.left = null;
  player.holds.right = null;
}

function getHoldPairBodyAnchor(holds) {
  if (holds.length === 0) return player.position.clone();
  const average = holds.reduce((sum, grip) => sum.add(getHoldAnchorPosition(grip.target)), new THREE.Vector3()).multiplyScalar(1 / holds.length);
  return average.add(new THREE.Vector3(0, holds.length > 1 ? -1.32 : -1.18, 0));
}

function findNextHold(hold, desired) {
  let nextHold = null;
  let bestScore = 0.3;
  for (const candidate of world.grabbables) {
    if (candidate.type !== "hold" || candidate.clusterId !== hold.clusterId || candidate === hold) continue;
    const offset = candidate.point.clone().sub(hold.point);
    if (offset.length() > 2.6) continue;
    const direction = new THREE.Vector2(offset.x, offset.y);
    if (direction.lengthSq() < 0.01) continue;
    const score = direction.normalize().dot(desired) - offset.length() * 0.08;
    if (score > bestScore) {
      nextHold = candidate;
      bestScore = score;
    }
  }
  return nextHold;
}

function updateHandVisual(element, hand) {
  if (!element) return;
  const grip = player.grab?.hand === hand ? player.grab : player.holds[hand];
  const item = player.items[hand];
  const engaged = Boolean(grip || item);
  element.classList.toggle("is-engaged", engaged);
  element.classList.toggle("is-holding-item", Boolean(item));
  if (!engaged) {
    element.style.setProperty("--hand-x", "0px");
    element.style.setProperty("--hand-y", "0px");
    return;
  }
  if (item) {
    element.style.setProperty("--hand-x", "0px");
    element.style.setProperty("--hand-y", "-8px");
    return;
  }
  const targetPoint = grip.type === "bar"
    ? grip.target.center.clone().add(new THREE.Vector3(hand === "left" ? -0.45 : 0.45, 0, 0))
    : grip.target.point.clone();
  const projected = targetPoint.project(camera);
  const targetScreenX = (projected.x * 0.5 + 0.5) * viewport.clientWidth;
  const targetScreenY = (-projected.y * 0.5 + 0.5) * viewport.clientHeight;
  const baseCenterX = hand === "left" ? 34 + 60 : viewport.clientWidth - 34 - 60;
  const baseCenterY = viewport.clientHeight - 18 - 75;
  element.style.setProperty("--hand-x", (targetScreenX - baseCenterX).toFixed(1) + "px");
  element.style.setProperty("--hand-y", (targetScreenY - baseCenterY).toFixed(1) + "px");
}

function nearestPointOnSegment(point, start, end) {
  const segment = end.clone().sub(start);
  const segmentLengthSq = segment.lengthSq();
  const t = segmentLengthSq === 0 ? 0 : clamp(point.clone().sub(start).dot(segment) / segmentLengthSq, 0, 1);
  return { point: start.clone().addScaledVector(segment, t), t, distanceTo(target) { return this.point.distanceTo(target); } };
}

function boxContainsPoint(box, point, pad = 0) {
  return point.x >= box.min.x - pad && point.x <= box.max.x + pad && point.y >= box.min.y - pad && point.y <= box.max.y + pad && point.z >= box.min.z - pad && point.z <= box.max.z + pad;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function resize() {
  const width = viewport.clientWidth;
  const height = viewport.clientHeight;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}
