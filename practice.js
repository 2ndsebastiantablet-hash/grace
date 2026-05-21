import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js";

const OLD_GAME_URL = "https://raw.githubusercontent.com/2ndsebastiantablet-hash/grace/bdaff36793c12608193a0a43988fb51456da015b/practice.js";
const PATCH_CONFIG_GZIP = "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";

const showStartupError = (error) => {
  console.error("Grace failed to start.", error);
  const viewport = document.getElementById("viewport");
  const prompt = document.getElementById("prompt");
  const message = error?.message || String(error);
  if (viewport) {
    viewport.innerHTML = '<div style="display:grid;place-items:center;width:100%;height:100%;background:linear-gradient(135deg,#102033,#29404f);color:#f2fbff;font:700 20px Trebuchet MS,sans-serif;text-align:center;padding:24px;box-sizing:border-box;">Grace hit a startup error instead of black-screening.<br><span style="font-size:14px;font-weight:500;opacity:.85;">Tell Codex: ' + message.replace(/[<>&]/g, (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[char])) + '</span></div>';
  }
  if (prompt) prompt.textContent = "Grace hit a startup error instead of black-screening.";
};

const inflateText = async (base64) => {
  const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
  if (typeof DecompressionStream !== "function") {
    throw new Error("This browser does not support DecompressionStream, which Grace needs to unpack the restored test arena.");
  }
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
  return await new Response(stream).text();
};

const extractCompressedSource = (wrapper) => {
  const match = wrapper.match(/const\s+compressed\s*=\s*([\s\S]*?);\s*\n/);
  if (!match) throw new Error("Could not find the old game source bundle.");
  return Function('"use strict"; return (' + match[1] + ');')();
};

const repairKnownBundleCorruption = (compressed) => {
  if (compressed.length !== 34117) return compressed;
  return compressed
    .replace("GwJJI+38c0nTDDcNdGkJMonONJ", "GwJJI+38c0nTDDcNdGkJqoMonONJ")
    .replace("D3CCNWyrDxbhBVUlHBY7ENDOnqZ", "D3CCNWyrDxbhBVUlHBY7bENDOnqZ");
};

const replaceBlock = (source, name, nextName, code) => {
  const start = source.indexOf('function ' + name + '(');
  if (start < 0) throw new Error('Could not patch ' + name + '.');
  const next = source.indexOf('function ' + nextName + '(', start + 1);
  if (next < 0) throw new Error('Could not find patch boundary after ' + name + '.');
  return source.slice(0, start) + code + "\n\n" + source.slice(next);
};

const patchOldGame = (source, config) => {
  source = source.replace(/^import\s+\*\s+as\s+THREE\s+from\s+["'][^"']+["'];\s*/, "");
  for (const [from, to] of config.sourceReplacements) {
    if (!source.includes(from)) throw new Error("Could not apply source replacement: " + from.slice(0, 60));
    source = source.replace(from, to);
  }
  for (const [name, patch] of Object.entries(config.blockPatches)) {
    source = replaceBlock(source, name, patch.next, patch.code);
  }
  return source;
};

try {
  const style = document.createElement("style");
  style.textContent = ".crosshair{opacity:1!important}";
  document.head.appendChild(style);
  const [configText, oldWrapper] = await Promise.all([
    inflateText(PATCH_CONFIG_GZIP),
    fetch(OLD_GAME_URL, { cache: "no-store" }).then((response) => {
      if (!response.ok) throw new Error("Could not download the restored old game source: " + response.status);
      return response.text();
    }),
  ]);
  const config = JSON.parse(configText);
  const compressed = repairKnownBundleCorruption(extractCompressedSource(oldWrapper));
  const oldSource = await inflateText(compressed);
  const patchedSource = patchOldGame(oldSource, config);
  new Function("THREE", patchedSource + "\n//# sourceURL=grace-restored-test-arena.js")(THREE);
} catch (error) {
  showStartupError(error);
}
