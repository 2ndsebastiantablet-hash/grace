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
  railCooldownUntil: 0,
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
window.addEventListener("blur", onWindowBlur);
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

function startRun() {
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
  overlay.classList.toggle("is-hidden", locked);
  if (!locked) {
    clearInputs();
    prompt.textContent = "Click in the arena to re-enter the run.";
  }
}

function onMouseMove(event) {
  if (document.pointerLockElement !== renderer.domElement) return;
  player.yaw -= event.movementX * MOUSE_SENSITIVITY;
  player.pitch = clamp(player.pitch - event.movementY * MOUSE_SENSITIVITY, -MAX_LOOK_UP, MAX_LOOK_UP);
}

function onMouseDown(event) {
  if (event.button !== 0 && event.button !== 2) return;
  requestArenaLock();
  tryStartGrab(event.button === 0 ? "left" : "right");
}

function onMouseUp(event) {
  if (event.button !== 0 && event.button !== 2) return;
  releaseGrab(event.button === 0 ? "left" : "right", true);
}

function onContextMenu(event) {
  if (viewportShell.contains(event.target)) event.preventDefault();
}

function onWindowBlur() {
  clearInputs();
}

function onKeyDown(event) {
  if (["KeyW", "KeyA", "KeyS", "KeyD", "Space", "ShiftLeft", "ShiftRight"].includes(event.code)) {
    event.preventDefault();
  }
  if (document.pointerLockElement !== renderer.domElement && (event.code === "Space" || event.code === "Enter")) {
    startRun();
    return;
  }
  if (event.repeat && event.code !== "Space") return;
  keys.set(event.code, true);
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
}

function onKeyUp(event) {
  keys.set(event.code, false);
  if (event.code === player.runKey) player.runKey = null;
}

function clearInputs() {
  keys.clear();
  player.runKey = null;
  player.runLatchUntil = 0;
}

function attemptJump() {
  if (player.grab) {
    const boost = player.grab.type === "bar" ? 1.15 : 0.7;
    releaseGrab(player.grab.hand, false);
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
  if (player.grounded || player.grab || player.grinding || !player.airDashReady || player.wallContact) return false;
  const dashDirection = getCameraForward();
  player.airDashReady = false;
  player.airDashActiveUntil = performance.now() + AIR_DASH_DURATION * 1000;
  player.velocity.copy(dashDirection.multiplyScalar(AIR_DASH_SPEED));
  return true;
}

function attemptSlide() {
  if (!player.grounded || player.grab || player.grinding) return;
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
  if (player.grab) updateGrab(delta);
  else if (player.grinding) updateRail(delta);
  else {
    updateWallContact();
    updateMovement(delta, now);
  }
  updateWallContact();
  syncRig();
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
  if (player.grounded || player.grab || player.grinding) return;
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
      player.velocity.y = JUMP_PAD_POWER;
      player.velocity.z -= 2;
      player.airDashReady = true;
    }
  }
  for (const fan of world.fans) {
    if (boxContainsPoint(fan.box, player.position, PLAYER_RADIUS)) {
      player.velocity.addScaledVector(fan.direction, FAN_FORCE * delta);
      player.velocity.y += FAN_UPDRAFT * delta;
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

function tryStartGrab(hand) {
  if (player.grab || player.grinding) return;
  const origin = camera.getWorldPosition(new THREE.Vector3());
  const look = getCameraForward();
  const best = getTargetedGrabbable(origin, look);
  if (!best) return;
  if (best.type === "bar") {
    player.grab = {
      type: "bar",
      hand,
      target: best,
      swingAngle: 0,
      swingVelocity: THREE.MathUtils.clamp(player.velocity.z * -0.05, -1.2, 1.2),
      pullBlend: 0,
    };
  } else {
    player.grab = { type: "hold", hand, target: best, pullBlend: 0 };
  }
  player.velocity.set(0, 0, 0);
  player.grounded = false;
  player.airDashReady = true;
}

function updateGrab(delta) {
  if (!player.grab) return;
  if (player.grab.type === "bar") {
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
  const hold = player.grab.target;
  player.grab.pullBlend = Math.min(1, player.grab.pullBlend + delta * 3.5);
  player.position.lerp(getHoldBodyAnchorPosition(hold), Math.min(1, delta * (10 + player.grab.pullBlend * 8)));
  if (moveInput.lengthSq() <= 0.2) return;
  const desired = moveInput.clone().normalize();
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
  if (nextHold) player.grab.target = nextHold;
}

function releaseGrab(hand, fromMouseUp) {
  if (!player.grab || player.grab.hand !== hand) return;
  if (player.grab.type === "bar") {
    const releaseVector = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(1, 0, 0), player.grab.swingAngle).normalize();
    player.velocity.copy(releaseVector.multiplyScalar(10 + Math.abs(player.grab.swingVelocity) * 6));
    player.velocity.y += 3.2;
  } else if (fromMouseUp) {
    player.velocity.y = Math.max(player.velocity.y, 1.4);
  }
  player.grab = null;
}

function updateCamera(delta) {
  camera.rotation.set(player.pitch, 0, 0);
  const bobSpeed = Math.min(1, Math.hypot(player.velocity.x, player.velocity.z) / RUN_SPEED);
  const bob = player.grounded && !player.grab && !player.grinding ? Math.sin(performance.now() * 0.015 * (1 + bobSpeed * 2.4)) * 0.03 * bobSpeed : 0;
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

function canSprint(moveInput, now) {
  return Boolean(player.runKey && now <= player.runLatchUntil && player.stamina > 0 && keys.get(player.runKey) && moveInput.lengthSq() > 0.01 && !player.grab && !player.grinding);
}

function updateUI(now = performance.now()) {
  const speed = Math.hypot(player.velocity.x, player.velocity.z);
  const sprinting = canSprint(getMoveInput(), now);
  const slideActive = now < player.slideUntil;
  const dashActive = now < player.airDashActiveUntil;
  const grabReady = Boolean(getTargetedGrabbable());
  seedReadout.textContent = "Practice";
  sectionReadout.textContent = "Practice Void";
  speedReadout.textContent = speed.toFixed(1) + " m/s";
  staminaReadout.textContent = Math.round(player.stamina * 100) + "%";
  staminaFill.style.transform = `scaleX(${player.stamina.toFixed(3)})`;
  objectiveTitle.textContent = "Practice Void";
  objectiveCopy.textContent = "Use the fixed white-box arena to test the movement kit without waiting on generation.";
  hintCopy.textContent = "Slide under the low wall, wall-jump on the gray pillars, use the bar and climb holds, then test the rail, pad, and fan.";
  stateReadout.textContent = player.grab ? (player.grab.type === "bar" ? "Swinging" : "Climbing") : player.grinding ? "Grinding" : dashActive ? "Dashing" : player.wallSliding ? "Wall Slide" : slideActive ? "Sliding" : sprinting ? "Running" : player.grounded ? "Grounded" : "Airborne";
  viewportShell.classList.toggle("is-dashing", dashActive);
  viewportShell.classList.toggle("is-grab-ready", grabReady);
  updateHandVisual(leftHandElement, "left");
  updateHandVisual(rightHandElement, "right");
  if (document.pointerLockElement === renderer.domElement) {
    if (player.grab?.type === "bar") prompt.textContent = "Swing with W and S, then release left mouse to launch.";
    else if (player.grab?.type === "hold") prompt.textContent = "Keep left mouse held and tap WASD to move between holds.";
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
  player.grinding = null;
  player.railCooldownUntil = 0;
  clearInputs();
}

function resetPlayer() {
  player.position.set(0, 0, 26);
  player.velocity.set(0, 0, 0);
  player.yaw = Math.PI;
  player.pitch = 0;
  player.stamina = 1;
  player.staminaVisible = false;
  player.runKey = null;
  player.runLatchUntil = 0;
  player.grab = null;
  player.grinding = null;
  player.railCooldownUntil = 0;
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

function updateHandVisual(element, hand) {
  if (!element) return;
  const engaged = player.grab?.hand === hand;
  element.classList.toggle("is-engaged", engaged);
  if (!engaged) {
    element.style.setProperty("--hand-x", "0px");
    element.style.setProperty("--hand-y", "0px");
    return;
  }
  const targetPoint = player.grab.type === "bar"
    ? player.grab.target.center.clone().add(new THREE.Vector3(hand === "left" ? -0.45 : 0.45, 0, 0))
    : player.grab.target.point.clone();
  const projected = targetPoint.project(camera);
  const handX = projected.x * viewport.clientWidth * 0.34;
  const handY = -projected.y * viewport.clientHeight * 0.34 - 80;
  element.style.setProperty("--hand-x", handX.toFixed(1) + "px");
  element.style.setProperty("--hand-y", handY.toFixed(1) + "px");
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
