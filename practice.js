import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js";

const $ = (id) => document.getElementById(id);
const viewport = $("viewport");
const shell = document.querySelector(".viewport-shell");
const prompt = $("prompt");
const hands = { left: $("left-hand"), right: $("right-hand") };
const hudIds = ["seed-readout", "section-readout", "state-readout", "speed-readout", "stamina-readout", "objective-title", "objective-copy", "hint-copy"];
const hud = Object.fromEntries(hudIds.map((id) => [id, $(id)]));
const staminaFill = $("stamina-fill");

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf5f6f7);
scene.fog = new THREE.Fog(0xf5f6f7, 70, 210);
const camera = new THREE.PerspectiveCamera(82, 1, 0.1, 260);
const rig = new THREE.Group();
rig.add(camera);
scene.add(rig);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.domElement.tabIndex = 0;
viewport.appendChild(renderer.domElement);

const clock = new THREE.Clock();
const keys = new Map();
const mouse = { left: false, right: false };
const taps = new Map();
const tmp = new THREE.Vector3();
const world = { group: new THREE.Group(), colliders: [], grab: [], items: [], bullets: [], enemyBullets: [], enemies: [], ammo: [], buttons: [], effects: [], rails: [], pads: [], fans: [] };
scene.add(world.group);

const stats = {
  blaster: ["Blaster", 0x54c7ff, 0xd6e7f2, 20, 20, 190, 24, 1, 0.01, false],
  machinegun: ["Machine Gun", 0x20252c, 0xffd35a, 300, 300, 90, 10, 12, 0.07, true],
  shotgun: ["Shotgun", 0x7a4b2a, 0xb0c5cf, 12, 12, 760, 17, 8, 0.16, false],
  chainsaw: ["Chainsaw", 0xff8a25, 0x2b3036, 0, 0, 130, 18, 0, 0, false],
  knife: ["Knife", 0xdde9f0, 0x1d2630, 0, 0, 420, 32, 0, 0, false],
  railgun: ["Railgun", 0x222a68, 0x47f5ff, 8, 8, 2000, 55, 0, 0, false],
  axe: ["Axe", 0x5f3b22, 0xd7dce0, 0, 0, 760, 62, 0, 0, false],
};

const player = {
  pos: new THREE.Vector3(0, 2.4, 18),
  vel: new THREE.Vector3(),
  yaw: 0,
  pitch: 0,
  health: 100,
  stamina: 1,
  jumps: 0,
  grounded: false,
  crouch: false,
  runKey: null,
  runUntil: 0,
  slideUntil: 0,
  dashUntil: 0,
  dashReady: false,
  rail: null,
  hold: { left: null, right: null },
  item: { left: null, right: null },
  lastNoise: 0,
  knifeAnchorUntil: 0,
};

let healthText;
let ammoText;

try {
  setupHud();
  setupWorld();
  bindInput();
  resize();
  renderer.setAnimationLoop(tick);
  say("Click in the game for mouse look. Move with WASD, jump with Space, slide or air dash with Shift.");
} catch (error) {
  fail(error);
  box(0, -0.5, 0, 70, 1, 70, 0x999999, true);
  renderer.setAnimationLoop(tick);
}
window.addEventListener("error", (event) => fail(event.error || event.message));
window.addEventListener("unhandledrejection", (event) => fail(event.reason));

function fail(error) {
  console.error("Grace error:", error);
  say("Grace hit an error, but the fallback arena stayed alive instead of a black screen.");
}

function setupHud() {
  const style = document.createElement("style");
  style.textContent = ".combat-hud{position:absolute;left:0;right:0;bottom:26px;z-index:4;display:flex;justify-content:space-between;padding:0 34px;pointer-events:none;font-family:Bahnschrift,Trebuchet MS,sans-serif}.combat-pill{min-width:118px;padding:12px 16px;border-radius:18px;background:rgba(5,12,18,.72);border:1px solid rgba(255,255,255,.12);color:#eff8ff;font-size:1.7rem;font-weight:900}.heart-icon{color:#ff4f68;font-size:2rem}.ammo-pill{text-align:right;color:#9ee9ff}.ammo-pill.is-empty{color:#ff7a89}.viewport-shell.is-grab-ready .crosshair{border-color:#ff3d4d;box-shadow:0 0 14px rgba(255,61,77,.7)}";
  document.head.appendChild(style);
  const bar = document.createElement("div");
  bar.className = "combat-hud";
  bar.innerHTML = '<div class="combat-pill"><span class="heart-icon">&#9829;</span> <span id="health-readout">100</span></div><div id="ammo-readout" class="combat-pill ammo-pill">--</div>';
  shell.appendChild(bar);
  healthText = $("health-readout");
  ammoText = $("ammo-readout");
}

function setupWorld() {
  scene.add(new THREE.HemisphereLight(0xffffff, 0xb8bec7, 2.3));
  const sun = new THREE.DirectionalLight(0xffffff, 1.8);
  sun.position.set(18, 34, 16);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  scene.add(sun);
  box(0, -0.5, 0, 96, 1, 96, 0x9b9b9b, true);
  box(0, 1.6, -46, 96, 3.2, 1, 0x69737a);
  box(-48, 1.6, 0, 1, 3.2, 96, 0x69737a);
  box(48, 1.6, 0, 1, 3.2, 96, 0x69737a);
  box(0, 1.6, 46, 96, 3.2, 1, 0x69737a);
  spawner(0, 8.5);
  ["blaster", "machinegun", "shotgun", "chainsaw", "knife", "railgun", "axe"].forEach((type, i) => weapon(type, -15 + i * 5, 15));
  [[-13, 3], [7, 2], [21, -18], [-27, -24]].forEach(([x, z]) => ammo(x, z));
  box(-18, 2.7, -4, 8, 5.4, 1.2, 0x68747a, false, true);
  box(-11.5, 2.7, -4, 8, 5.4, 1.2, 0x68747a, false, true);
  box(18, 1.05, -5, 1.2, 2.1, 10, 0x6f777b);
  box(22, 3.7, -12, 9, 1, 9, 0x9ba5aa, true);
  pad(0, -33);
  fan(29, -10);
  rail(new THREE.Vector3(12, 2.2, -6), new THREE.Vector3(29, 1.4, -33));
  swingBar(1, 4.2, -20);
  climbWall(-29, -24);
  enemy("dummy", 10, -28);
}

function box(x, y, z, sx, sy, sz, color, floor = false, grab = false) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), new THREE.MeshStandardMaterial({ color, roughness: 0.84, metalness: 0.04 }));
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  world.group.add(mesh);
  world.colliders.push({ mesh, floor, box: new THREE.Box3().setFromObject(mesh) });
  if (grab) world.grab.push({ point: new THREE.Vector3(x, y + sy * 0.22, z + sz * 0.65), type: "wall" });
  return mesh;
}

function weapon(type, x, z) {
  box(x, 0.35, z, 1.8, 0.7, 1.8, 0x343d46);
  const s = stats[type];
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: s[1], roughness: 0.42, metalness: 0.22 });
  const hot = new THREE.MeshStandardMaterial({ color: s[2], roughness: 0.28, metalness: 0.35, emissive: type === "railgun" ? 0x0b6670 : 0x000000, emissiveIntensity: type === "railgun" ? 0.55 : 0 });
  if (["chainsaw", "knife", "axe"].includes(type)) {
    group.add(part(new THREE.BoxGeometry(type === "axe" ? 0.15 : 0.9, 0.16, type === "knife" ? 0.9 : 0.35), mat, 0, 0, 0));
    group.add(part(new THREE.BoxGeometry(type === "axe" ? 0.65 : 0.7, 0.12, type === "knife" ? 0.18 : 0.42), hot, type === "chainsaw" ? 0.5 : 0, 0, type === "axe" ? -0.55 : -0.45));
  } else {
    const len = type === "machinegun" || type === "railgun" ? 1.45 : type === "shotgun" ? 1.22 : 0.88;
    group.add(part(new THREE.BoxGeometry(0.24, 0.28, len), mat, 0, 0, 0));
    group.add(part(new THREE.CylinderGeometry(0.08, 0.08, 0.55, 12), hot, 0, 0.02, -len * 0.62, Math.PI / 2));
  }
  group.position.set(x, 1.15, z);
  group.rotation.y = Math.PI * 0.25;
  group.traverse((m) => { m.castShadow = true; });
  world.group.add(group);
  world.items.push({ type, label: s[0], mesh: group, ammo: s[3], max: s[4], last: -9999, charge: 0, twoHand: s[9], held: null, usesAmmo: s[4] > 0 });
  label(s[0], x, 2.15, z, 0xffffff, 0.78);
}

function part(geo, mat, x, y, z, rx = 0) {
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, z);
  mesh.rotation.x = rx;
  return mesh;
}

function spawner(x, z) {
  box(x, 2.45, z, 22, 4.9, 0.55, 0x27313a);
  label("ENEMY SPAWNER", x, 4.55, z + 0.45, 0x9ee9ff, 1.1);
  ["puncher", "shooter", "blaster", "machinegun", "shotgun", "chainsaw", "knife", "railgun", "axe"].forEach((type, i) => {
    const bx = x - 9.2 + i * 2.3;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.72, 0.18), new THREE.MeshStandardMaterial({ color: 0x40515d, emissive: 0x0a1f2d, emissiveIntensity: 0.22 }));
    mesh.position.set(bx, 2.45, z + 0.42);
    world.group.add(mesh);
    world.buttons.push({ type, point: mesh.position.clone(), mesh });
    label(type, bx, 3.05, z + 0.55, 0xffffff, 0.38);
  });
}

function label(text, x, y, z, color, scale = 1) {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 128;
  const g = c.getContext("2d");
  g.font = "700 44px Bahnschrift, Arial";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillStyle = `#${color.toString(16).padStart(6, "0")}`;
  g.strokeStyle = "rgba(0,0,0,.45)";
  g.lineWidth = 8;
  g.strokeText(text.toUpperCase(), 256, 64);
  g.fillText(text.toUpperCase(), 256, 64);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true }));
  s.position.set(x, y, z);
  s.scale.set(4.2 * scale, 1.05 * scale, 1);
  world.group.add(s);
}

function ammo(x, z) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.45, 0.75), new THREE.MeshStandardMaterial({ color: 0xffd85d, emissive: 0x7a4e00, emissiveIntensity: 0.25 }));
  mesh.position.set(x, 0.35, z);
  world.group.add(mesh);
  world.ammo.push(mesh);
}

function pad(x, z) {
  const mesh = box(x, 0.08, z, 3.4, 0.16, 3.4, 0x34e38a);
  mesh.material.emissive = new THREE.Color(0x0c5a30);
  mesh.material.emissiveIntensity = 0.35;
  world.pads.push(new THREE.Vector3(x, 0.15, z));
}

function fan(x, z) {
  const mesh = box(x, 1.3, z, 1.2, 2.6, 3.4, 0x4bc3ff);
  mesh.material.emissive = new THREE.Color(0x0b5d86);
  mesh.material.emissiveIntensity = 0.28;
  world.fans.push({ pos: new THREE.Vector3(x, 1.3, z), dir: new THREE.Vector3(-1, 0.15, 0).normalize() });
  label("FAN", x, 3.2, z, 0xffffff, 0.8);
}

function rail(start, end) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, start.distanceTo(end), 12), new THREE.MeshStandardMaterial({ color: 0xd9e4ea, metalness: 0.6, roughness: 0.2 }));
  mesh.position.copy(start.clone().lerp(end, 0.5));
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.clone().sub(start).normalize());
  world.group.add(mesh);
  world.rails.push({ start, end });
}

function swingBar(x, y, z) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 5.5, 16), new THREE.MeshStandardMaterial({ color: 0xffd37a, metalness: 0.45, roughness: 0.22 }));
  mesh.position.set(x, y, z);
  mesh.rotation.z = Math.PI / 2;
  world.group.add(mesh);
  world.grab.push({ point: new THREE.Vector3(x, y, z), type: "bar" });
  label("SWING BAR", x, y + 1, z, 0x101820, 0.72);
}

function climbWall(x, z) {
  box(x, 2.9, z, 8, 5.8, 0.7, 0x667178, false, true);
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) if ((r + c) % 2 || r === 3) {
    const p = new THREE.Vector3(x - 2.7 + c * 1.8, 1.1 + r * 1.05, z + 0.48);
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 12), new THREE.MeshStandardMaterial({ color: 0xffd27a }));
    mesh.position.copy(p);
    world.group.add(mesh);
    world.grab.push({ point: p, type: "hold" });
  }
}

function bindInput() {
  addEventListener("resize", resize);
  addEventListener("keydown", keyDown);
  addEventListener("keyup", (e) => keys.set(e.code, false));
  addEventListener("blur", clearInput);
  document.addEventListener("visibilitychange", () => { if (document.hidden) clearInput(); });
  document.addEventListener("mousemove", look);
  addEventListener("mousedown", mouseDown);
  addEventListener("mouseup", mouseUp);
  addEventListener("contextmenu", (e) => e.preventDefault());
  viewport.addEventListener("click", () => renderer.domElement.requestPointerLock?.());
}

function keyDown(e) {
  if (e.code === "CapsLock") {
    e.preventDefault();
    player.crouch = !player.crouch;
    return;
  }
  keys.set(e.code, true);
  if (e.code === "Space") jump();
  if (e.code.startsWith("Shift")) shift();
  if (e.code === "KeyR") refill();
  if (e.code === "KeyF") {
    if (mouse.left) drop("left");
    if (mouse.right) drop("right");
  }
  if (["KeyW", "KeyA", "KeyS", "KeyD"].includes(e.code)) {
    const now = performance.now();
    if (now - (taps.get(e.code) || -9999) < 260) {
      player.runKey = e.code;
      player.runUntil = now + 950;
    }
    taps.set(e.code, now);
  }
}

function look(e) {
  if (document.pointerLockElement !== renderer.domElement) return;
  player.yaw -= e.movementX * 0.0022;
  player.pitch = clamp(player.pitch - e.movementY * 0.0022, -1.47, 1.47);
}

function mouseDown(e) {
  const hand = e.button === 2 ? "right" : "left";
  mouse[hand] = true;
  renderer.domElement.requestPointerLock?.();
  const button = aimed(world.buttons, (b) => b.point, 8, 0.7);
  if (button) return spawn(button.type);
  const item = aimed(world.items.filter((i) => !i.held), (i) => i.mesh.position, 5.3, 0.74);
  if (item) return pickup(item, hand);
  if (player.item[hand]) return useWeapon(player.item[hand], hand);
  const grab = aimed(world.grab, (g) => g.point, 5.1, 0.68);
  if (grab && !player.item[hand]) player.hold[hand] = grab;
}

function mouseUp(e) {
  const hand = e.button === 2 ? "right" : "left";
  mouse[hand] = false;
  if (player.item[hand]?.type === "railgun") finishRailgun(player.item[hand]);
  if (player.hold[hand]?.type === "bar") {
    player.vel.copy(forward().multiplyScalar(12));
    player.vel.y = 4.8;
  }
  player.hold[hand] = null;
}

function jump() {
  if (player.hold.left || player.hold.right) {
    player.hold.left = null;
    player.hold.right = null;
    player.vel.y = 8.7;
    player.vel.addScaledVector(forward(), 5);
  } else if (player.grounded || player.rail) {
    player.rail = null;
    player.grounded = false;
    player.jumps = 1;
    player.vel.y = 8.7;
  } else if (player.jumps < 2) {
    player.jumps = 2;
    player.vel.y = 8.2;
  }
}

function shift() {
  const now = performance.now();
  if (!player.grounded && player.dashReady) {
    player.dashUntil = now + 170;
    player.vel.copy(cameraDir().multiplyScalar(25));
    player.dashReady = false;
  } else if (player.grounded) {
    player.slideUntil = now + 320;
    player.vel.copy(forward().multiplyScalar(16));
  }
}

function tick() {
  const dt = Math.min(clock.getDelta(), 0.033);
  try {
    move(dt);
    weapons();
    projectiles(dt);
    enemies(dt);
    pickups();
    effects(dt);
    drawHud();
    rig.position.copy(player.pos);
    rig.rotation.y = player.yaw;
    renderer.render(scene, camera);
  } catch (error) {
    fail(error);
  }
}

function move(dt) {
  const now = performance.now();
  if (player.knifeAnchorUntil > now) {
    player.vel.multiplyScalar(0.85);
    player.vel.y = 0;
  } else if (player.rail) {
    player.rail.t += dt * 0.55;
    player.pos.copy(player.rail.start.clone().lerp(player.rail.end, player.rail.t)).y += 0.35;
    if (player.rail.t >= 1) {
      player.vel.copy(player.rail.end.clone().sub(player.rail.start).normalize().multiplyScalar(10));
      player.vel.y = 3.5;
      player.rail = null;
    }
  } else if (player.hold.left || player.hold.right) {
    const holds = [player.hold.left, player.hold.right].filter(Boolean);
    const p = holds.reduce((v, h) => v.add(h.point), new THREE.Vector3()).multiplyScalar(1 / holds.length).add(new THREE.Vector3(0, -1.1, 0.45));
    player.pos.lerp(p, Math.min(1, dt * 12));
    player.vel.set(0, 0, 0);
  } else {
    const input = new THREE.Vector2(Number(keys.get("KeyD")) - Number(keys.get("KeyA")), Number(keys.get("KeyW")) - Number(keys.get("KeyS")));
    if (input.lengthSq() > 1) input.normalize();
    const sprint = !player.crouch && input.lengthSq() && player.runKey && keys.get(player.runKey) && now < player.runUntil && player.stamina > 0;
    const speed = player.crouch ? 4.8 : sprint ? 14 : 8.5;
    if (sprint) player.stamina = Math.max(0, player.stamina - 0.32 * dt);
    else player.stamina = Math.min(1, player.stamina + 0.22 * dt);
    if (now > player.dashUntil) {
      const want = forward().multiplyScalar(input.y).add(right().multiplyScalar(input.x));
      if (want.lengthSq()) {
        want.normalize().multiplyScalar(speed);
        const a = player.grounded ? 42 : 16;
        player.vel.x += (want.x - player.vel.x) * Math.min(1, a * dt / speed);
        player.vel.z += (want.z - player.vel.z) * Math.min(1, a * dt / speed);
      } else if (player.grounded) {
        player.vel.x -= player.vel.x * Math.min(1, 13 * dt);
        player.vel.z -= player.vel.z * Math.min(1, 13 * dt);
      }
      player.vel.y -= 24 * dt;
    }
    player.pos.addScaledVector(player.vel, dt);
    collide();
    padsFans();
    rails();
  }
  camera.position.y = THREE.MathUtils.lerp(camera.position.y, (player.crouch || now < player.slideUntil ? 1.08 : 1.72) - 0.1, dt * 12);
  camera.rotation.x = player.pitch;
  if (player.pos.y < -25) respawn();
}

function collide() {
  player.grounded = false;
  for (const c of world.colliders) {
    const b = c.box.setFromObject(c.mesh);
    if (c.floor && player.vel.y <= 0 && player.pos.x > b.min.x - 0.4 && player.pos.x < b.max.x + 0.4 && player.pos.z > b.min.z - 0.4 && player.pos.z < b.max.z + 0.4 && player.pos.y <= b.max.y + 0.35 && player.pos.y >= b.max.y - 1) {
      player.pos.y = b.max.y;
      player.vel.y = 0;
      player.grounded = true;
      player.jumps = 0;
      player.dashReady = true;
      continue;
    }
    if (b.containsPoint(player.pos)) {
      const dx = Math.min(Math.abs(player.pos.x - b.min.x), Math.abs(b.max.x - player.pos.x));
      const dz = Math.min(Math.abs(player.pos.z - b.min.z), Math.abs(b.max.z - player.pos.z));
      if (dx < dz) player.pos.x += player.pos.x > c.mesh.position.x ? 0.45 : -0.45;
      else player.pos.z += player.pos.z > c.mesh.position.z ? 0.45 : -0.45;
    }
  }
}

function padsFans() {
  for (const p of world.pads) if (player.pos.clone().setY(0).distanceTo(p.clone().setY(0)) < 2.1 && player.pos.y < 0.7 && player.vel.y <= 0) player.vel.y = 15 + Math.hypot(player.vel.x, player.vel.z) * 0.38;
  for (const f of world.fans) if (player.pos.distanceTo(f.pos) < 5.5) player.vel.addScaledVector(f.dir, 34 * 0.016);
}

function rails() {
  if (player.grounded) return;
  for (const r of world.rails) {
    const n = nearest(player.pos, r.start, r.end);
    if (n.d < 0.85 && n.t > 0.12 && n.t < 0.88) player.rail = { ...r, t: n.t };
  }
}

function pickup(item, hand) {
  if (item.twoHand) {
    if (player.item.left || player.item.right) return say("Machine gun needs both empty hands.");
    player.item.left = item;
    player.item.right = item;
  } else if (!player.item[hand]) player.item[hand] = item;
  else return;
  item.held = hand;
  item.mesh.visible = false;
  say(`Picked up ${item.label}.`);
}

function drop(hand) {
  const item = player.item[hand];
  if (!item) return;
  if (item.twoHand) {
    player.item.left = null;
    player.item.right = null;
  } else player.item[hand] = null;
  item.held = null;
  item.mesh.visible = true;
  item.mesh.position.copy(player.pos).addScaledVector(forward(), 1.5).setY(0.8);
}

function useWeapon(item, hand) {
  if (item.type === "railgun") {
    if (item.ammo <= 0) return say("Railgun is empty.");
    item.charge = performance.now();
    return say("Railgun charging. Hold for 3 seconds.");
  }
  fire(item, hand);
}

function fire(item, hand) {
  const now = performance.now();
  const s = stats[item.type];
  if (now - item.last < s[5]) return;
  item.last = now;
  const cost = item.type === "shotgun" ? 2 : item.usesAmmo ? 1 : 0;
  if (item.ammo < cost) return say(`${item.label} is empty. Pick up ammo.`);
  item.ammo -= cost;
  if (["chainsaw", "knife", "axe"].includes(item.type)) return melee(item);
  if (item.type === "shotgun") twoHandShot(item, hand);
  pellets(item.type, s[7], s[8], s[6]);
  noise(player.pos, item.type === "machinegun" ? 28 : 22);
}

function finishRailgun(item) {
  if (!item.charge) return;
  const charged = performance.now() - item.charge;
  item.charge = 0;
  if (charged < 3000) return say("Railgun charge cancelled.");
  if (performance.now() - item.last < 2000) return;
  item.last = performance.now();
  item.ammo--;
  railShot();
  noise(player.pos, 35);
}

function twoHandShot(item, hand) {
  const other = hand === "left" ? "right" : "left";
  if (player.item[other] && player.item[other] !== item) drop(other);
  player.item[other] = item;
  setTimeout(() => { if (player.item[other] === item && player.item[hand] === item) player.item[other] = null; }, 250);
}

function pellets(type, count, spread, damage, origin = camera.getWorldPosition(new THREE.Vector3()), dir = cameraDir(), enemyOwned = false) {
  for (let i = 0; i < count; i++) {
    const d = dir.clone();
    d.x += (Math.random() - 0.5) * spread;
    d.y += (Math.random() - 0.5) * spread;
    d.z += (Math.random() - 0.5) * spread;
    d.normalize();
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), new THREE.MeshBasicMaterial({ color: enemyOwned ? 0xff725c : stats[type][2] }));
    mesh.position.copy(origin).addScaledVector(d, 0.7);
    world.group.add(mesh);
    (enemyOwned ? world.enemyBullets : world.bullets).push({ mesh, vel: d.multiplyScalar(enemyOwned ? 24 : 66), life: enemyOwned ? 2.2 : 1.8, damage });
  }
}

function railShot() {
  const o = camera.getWorldPosition(new THREE.Vector3());
  const d = cameraDir();
  const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([o, o.clone().addScaledVector(d, 80)]), new THREE.LineBasicMaterial({ color: 0x5df7ff, transparent: true, opacity: 0.8 }));
  world.group.add(line);
  world.effects.push({ mesh: line, life: 0.18 });
  for (const e of [...world.enemies]) if (distanceToRay(e.pos.clone().add(new THREE.Vector3(0, 1.1, 0)), o, d) < 0.9) hurt(e, 55, d, false);
  say("Railgun slug pierced the lane.");
}

function melee(item) {
  const o = camera.getWorldPosition(new THREE.Vector3());
  const d = cameraDir();
  const range = item.type === "chainsaw" ? 2.9 : item.type === "axe" ? 2.45 : 2.15;
  const e = world.enemies.find((m) => m.pos.distanceTo(player.pos) < range && d.dot(m.pos.clone().sub(o).normalize()) > 0.72);
  if (!e && item.type === "knife" && player.vel.y < -2) {
    player.knifeAnchorUntil = performance.now() + 1100;
    return say("Knife stabbed into the wall like a temporary ledge.");
  }
  if (!e) return;
  const head = d.dot(e.pos.clone().add(new THREE.Vector3(0, 1.68, 0)).sub(o).normalize()) > 0.985;
  const behind = !e.aware && forward().dot(e.pos.clone().sub(player.pos).normalize()) > 0.25;
  const damage = item.type === "knife" && behind ? 999 : item.type === "axe" && head ? 999 : stats[item.type][6];
  hurt(e, damage, d, head || damage === 999);
  say(item.type === "knife" && behind ? "Stealth neck slit. Instant kill." : item.type === "axe" && head ? "Axe headshot. Instant kill." : `${item.label} hit.`);
  noise(player.pos, item.type === "knife" ? 7 : 18);
}

function weapons() {
  for (const hand of ["left", "right"]) {
    const item = player.item[hand];
    if (!item || (item.held !== hand && !item.twoHand)) continue;
    item.mesh.visible = true;
    item.mesh.position.copy(camera.getWorldPosition(new THREE.Vector3())).addScaledVector(cameraDir(), item.type === "chainsaw" && nearEnemy() < 3.2 ? 1.2 : 0.78).addScaledVector(right(), hand === "left" ? -0.35 : 0.35);
    item.mesh.position.y -= item.type === "machinegun" ? 0.5 : 0.44;
    item.mesh.quaternion.copy(camera.getWorldQuaternion(new THREE.Quaternion())).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -Math.PI / 2 + (hand === "left" ? 0.32 : -0.32), hand === "left" ? -0.12 : 0.12)));
  }
}

function projectiles(dt) {
  updateBulletList(world.bullets, dt, false);
  updateBulletList(world.enemyBullets, dt, true);
}

function updateBulletList(list, dt, enemyOwned) {
  for (let i = list.length - 1; i >= 0; i--) {
    const b = list[i];
    b.life -= dt;
    b.mesh.position.addScaledVector(b.vel, dt);
    if (enemyOwned && b.mesh.position.distanceTo(player.pos.clone().add(new THREE.Vector3(0, 1, 0))) < 0.65) {
      damagePlayer(b.damage, "You were shot.");
      remove(list, i);
    } else if (!enemyOwned) {
      const hit = hitEnemy(b.mesh.position);
      if (hit) {
        hurt(hit.enemy, b.damage * (hit.head ? 3.35 : 1), b.vel, hit.head);
        remove(list, i);
      } else if (b.life <= 0 || solid(b.mesh.position)) remove(list, i);
    } else if (b.life <= 0 || solid(b.mesh.position)) remove(list, i);
  }
}

function remove(list, i) {
  const [b] = list.splice(i, 1);
  world.group.remove(b.mesh);
}

function spawn(type) {
  enemy(type, -18 + Math.random() * 36, -19 - Math.random() * 18);
  say(`Spawned ${type}. Enemies need sight or sound before chasing.`);
}

function enemy(type, x, z) {
  const g = new THREE.Group();
  const color = type === "dummy" ? 0xb8c1c8 : type === "puncher" ? 0xffb36b : type === "shooter" ? 0x7fb7ff : stats[type]?.[1] || 0xd2d2d2;
  g.add(part(new THREE.CapsuleGeometry(0.42, 0.9, 6, 12), new THREE.MeshStandardMaterial({ color }), 0, 0.82, 0));
  g.add(part(new THREE.SphereGeometry(0.34, 18, 18), new THREE.MeshStandardMaterial({ color: 0xf1d7bd }), 0, 1.68, 0));
  g.add(hand(-0.62), hand(0.62), face());
  g.position.set(x, 0, z);
  world.group.add(g);
  world.enemies.push({ type, group: g, pos: g.position, vel: new THREE.Vector3(), health: 100, aware: false, alert: 0, last: 0, anim: Math.random() * 10 });
}

function hand(x) {
  const h = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0xf0c6a2 });
  h.add(part(new THREE.SphereGeometry(0.2, 12, 12), mat, 0, 0, 0));
  for (let i = 0; i < 4; i++) h.add(part(new THREE.SphereGeometry(0.055, 8, 8), mat, -0.13 + i * 0.085, -0.16, -0.05));
  h.position.set(x, 0.98, -0.05);
  return h;
}

function face() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d");
  g.fillStyle = "#111820";
  g.beginPath();
  g.arc(44, 48, 7, 0, Math.PI * 2);
  g.arc(84, 48, 7, 0, Math.PI * 2);
  g.fill();
  g.lineWidth = 7;
  g.beginPath();
  g.moveTo(42, 82);
  g.lineTo(86, 82);
  g.stroke();
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true }));
  s.position.set(0, 1.68, -0.335);
  s.scale.set(0.45, 0.45, 1);
  return s;
}

function enemies(dt) {
  const now = performance.now();
  for (const e of world.enemies) {
    e.anim += dt;
    const dist = e.pos.distanceTo(player.pos);
    if (e.type !== "dummy") {
      const sees = dist < 30 && (!player.crouch || dist < 8) && sight(e.pos.clone().add(new THREE.Vector3(0, 1.4, 0)), player.pos.clone().add(new THREE.Vector3(0, 1, 0)));
      const hears = now - player.lastNoise < 550 && dist < 20;
      if (sees || hears) {
        e.aware = true;
        e.alert = now + 5200;
      } else if (now > e.alert) e.aware = false;
    }
    if (e.aware || now < e.alert) {
      if (dist > 1.7) {
        const sp = ["chainsaw", "knife"].includes(e.type) ? 4.4 : ["puncher", "axe"].includes(e.type) ? 3.9 : 2.6;
        e.vel.lerp(player.pos.clone().sub(e.pos).setY(0).normalize().multiplyScalar(sp), dt * 3.2);
        e.pos.addScaledVector(e.vel, dt);
      }
      e.group.lookAt(player.pos.x, e.pos.y, player.pos.z);
      e.group.rotateY(Math.PI);
      enemyAttack(e, dist, now);
    }
    const swing = Math.sin(e.anim * (e.aware ? 8 : 2)) * 0.18;
    e.group.children[2].position.y = 0.98 + Math.abs(swing);
    e.group.children[3].position.y = 0.98 + Math.abs(swing + 0.6);
  }
}

function enemyAttack(e, dist, now) {
  const ranged = ["shooter", "blaster", "machinegun", "shotgun", "railgun"].includes(e.type);
  if (ranged && dist < 24 && now - e.last > (e.type === "machinegun" ? 420 : e.type === "shotgun" ? 1200 : e.type === "railgun" ? 2100 : 850)) {
    e.last = now;
    const kind = e.type === "machinegun" ? "machinegun" : e.type === "shotgun" ? "shotgun" : "blaster";
    pellets(kind, e.type === "machinegun" ? 5 : stats[kind][7], stats[kind][8] || 0.03, e.type === "railgun" ? 28 : 7, e.pos.clone().add(new THREE.Vector3(0, 1.25, 0)), player.pos.clone().add(new THREE.Vector3(0, 1, 0)).sub(e.pos.clone().add(new THREE.Vector3(0, 1.25, 0))).normalize(), true);
  } else if (!ranged && dist < 1.75 && now - e.last > 820) {
    e.last = now;
    damagePlayer(e.type === "chainsaw" ? 13 : e.type === "axe" ? 18 : 8, `${e.type} hit you.`);
  }
}

function hurt(e, amount, impulse, head) {
  e.health -= amount;
  e.aware = true;
  e.alert = performance.now() + 5200;
  if (impulse) e.pos.addScaledVector(impulse.clone().setY(0).normalize(), 0.15);
  if (e.health <= 0) {
    noise(e.pos, 18);
    world.group.remove(e.group);
    world.enemies.splice(world.enemies.indexOf(e), 1);
    say(head ? "Headshot kill." : "Enemy down.");
  } else if (head) say("Headshot. Huge damage.");
}

function pickups() {
  for (let i = world.ammo.length - 1; i >= 0; i--) {
    const a = world.ammo[i];
    a.rotation.y += 0.03;
    if (a.position.distanceTo(player.pos) < 1.45) {
      refill();
      world.group.remove(a);
      world.ammo.splice(i, 1);
      say("Ammo picked up.");
    }
  }
}

function refill() {
  for (const item of new Set([player.item.left, player.item.right].filter(Boolean))) if (item.usesAmmo) item.ammo = item.max;
}

function damagePlayer(amount, msg) {
  player.health = Math.max(0, player.health - amount);
  say(`${msg} Health: ${Math.round(player.health)}.`);
  if (player.health <= 0) respawn();
}

function effects(dt) {
  for (let i = world.effects.length - 1; i >= 0; i--) {
    const e = world.effects[i];
    e.life -= dt;
    if (e.mesh.material) e.mesh.material.opacity = Math.max(0, e.life / 0.18);
    if (e.life <= 0) {
      world.group.remove(e.mesh);
      world.effects.splice(i, 1);
    }
  }
}

function drawHud() {
  const gun = currentGun();
  if (healthText) healthText.textContent = Math.round(player.health);
  if (ammoText) {
    ammoText.textContent = gun ? `${gun.ammo}/${gun.max}${gun.type === "railgun" && gun.charge ? " " + Math.round(Math.min(1, (performance.now() - gun.charge) / 3000) * 100) + "%" : ""}` : "--";
    ammoText.classList.toggle("is-empty", Boolean(gun && gun.ammo <= 0));
  }
  set(hud["seed-readout"], "Test Arena");
  set(hud["section-readout"], "Test Play Area");
  set(hud["speed-readout"], Math.hypot(player.vel.x, player.vel.z).toFixed(1) + " m/s");
  set(hud["stamina-readout"], Math.round(player.stamina * 100) + "%");
  if (staminaFill) staminaFill.style.transform = `scaleX(${player.stamina.toFixed(3)})`;
  set(hud["objective-title"], "Grace Test Arena");
  set(hud["objective-copy"], "Pick up weapons, test parkour, and click wall buttons to spawn enemies.");
  set(hud["hint-copy"], "Caps Lock crouches. Crouching hides you from sight, but enemies still hear gunshots and deaths.");
  set(hud["state-readout"], player.rail ? "Grinding" : player.hold.left || player.hold.right ? "Grabbing" : performance.now() < player.dashUntil ? "Invisible Dash" : player.crouch ? "Crouching" : player.grounded ? "Grounded" : "Airborne");
  shell.classList.toggle("is-grab-ready", Boolean(aimed(world.grab, (g) => g.point, 5.1, 0.68) || aimed(world.items.filter((i) => !i.held), (i) => i.mesh.position, 5.3, 0.74) || aimed(world.buttons, (b) => b.point, 8, 0.7)));
  handUi("left");
  handUi("right");
}

function handUi(hand) {
  const el = hands[hand];
  if (!el) return;
  const on = Boolean(player.item[hand] || player.hold[hand]);
  el.classList.toggle("is-engaged", on);
  el.classList.toggle("is-holding-item", Boolean(player.item[hand]));
  el.style.setProperty("--hand-y", on ? "-12px" : "0px");
  el.style.setProperty("--hand-x", player.hold[hand] ? (hand === "left" ? "75px" : "-75px") : "0px");
}

function currentGun() {
  return player.item.right?.usesAmmo ? player.item.right : player.item.left?.usesAmmo ? player.item.left : null;
}

function hitEnemy(p) {
  for (const e of world.enemies) {
    if (p.distanceTo(e.pos.clone().add(new THREE.Vector3(0, 1.68, 0))) < 0.38) return { enemy: e, head: true };
    if (p.distanceTo(e.pos.clone().add(new THREE.Vector3(0, 0.95, 0))) < 0.65) return { enemy: e, head: false };
  }
  return null;
}

function aimed(list, point, range, dot) {
  const o = camera.getWorldPosition(new THREE.Vector3());
  const d = cameraDir();
  let best = null;
  let bd = Infinity;
  for (const it of list) {
    const p = point(it);
    const dist = o.distanceTo(p);
    if (dist < range && dist < bd && d.dot(p.clone().sub(o).normalize()) > dot) {
      best = it;
      bd = dist;
    }
  }
  return best;
}

function solid(p) {
  return world.colliders.some((c) => c.box.setFromObject(c.mesh).containsPoint(p));
}

function sight(a, b) {
  const d = b.clone().sub(a);
  const len = d.length();
  d.normalize();
  const ray = new THREE.Ray(a, d);
  for (const c of world.colliders) {
    if (c.floor) continue;
    const hit = ray.intersectBox(c.box.setFromObject(c.mesh), new THREE.Vector3());
    if (hit && hit.distanceTo(a) < len) return false;
  }
  return true;
}

function noise(pos, radius) {
  player.lastNoise = performance.now();
  for (const e of world.enemies) if (e.pos.distanceTo(pos) < radius) {
    e.aware = true;
    e.alert = performance.now() + 5200;
  }
}

function nearEnemy() {
  return world.enemies.reduce((best, e) => Math.min(best, e.pos.distanceTo(player.pos)), Infinity);
}

function distanceToRay(p, o, d) {
  const t = p.clone().sub(o).dot(d);
  return t < 0 ? Infinity : p.distanceTo(o.clone().addScaledVector(d, t));
}

function nearest(p, a, b) {
  const s = b.clone().sub(a);
  const t = clamp(p.clone().sub(a).dot(s) / s.lengthSq(), 0, 1);
  return { t, d: p.distanceTo(a.clone().addScaledVector(s, t)) };
}

function forward() {
  return new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), player.yaw).normalize();
}

function right() {
  return new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), player.yaw).normalize();
}

function cameraDir() {
  return new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(player.pitch, player.yaw, 0, "YXZ")).normalize();
}

function respawn() {
  player.pos.set(0, 2.4, 18);
  player.vel.set(0, 0, 0);
  player.health = 100;
  player.jumps = 0;
  player.rail = null;
  player.hold.left = null;
  player.hold.right = null;
  player.pitch = 0;
  say("Respawned in the test arena.");
}

function clearInput() {
  keys.clear();
  mouse.left = false;
  mouse.right = false;
  player.runKey = null;
}

function set(el, text) {
  if (el) el.textContent = text;
}

function say(text) {
  if (prompt) prompt.textContent = text;
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function resize() {
  const r = viewport.getBoundingClientRect();
  renderer.setSize(Math.max(1, r.width || innerWidth), Math.max(1, r.height || innerHeight), false);
  camera.aspect = renderer.domElement.width / renderer.domElement.height;
  camera.updateProjectionMatrix();
}
