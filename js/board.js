const ELEMENTS = [
  { key: "fire", label: "Fire", icon: "🔥" },
  { key: "ice", label: "Ice", icon: "🧊" },
  { key: "earth", label: "Earth", icon: "🧱" },
  { key: "wood", label: "Wood", icon: "🌳" },
  { key: "stone", label: "Stone", icon: "🪨" },
  { key: "metal", label: "Metal", icon: "⚙️" },
];

// Circumradius in px, flat-top hexes. Shrinks on small screens so the board
// fits without excessive scrolling.
function getHexSize() {
  if (window.innerWidth < 480) return 30;
  if (window.innerWidth < 700) return 40;
  return 52;
}

let HEX_SIZE = getHexSize();

// A photo of the wise platypus, watching over the center hex.
const PLATYPUS_IMG_SRC = "images/platypus.png";
const PLATYPUS_HTML = `<img class="platypus-icon" src="${PLATYPUS_IMG_SRC}" alt="Wise platypus" />`;

const boardEl = document.getElementById("board");
const paletteEl = document.getElementById("tokenPalette");
const radiusInput = document.getElementById("radiusInput");
const regenerateBtn = document.getElementById("regenerateBtn");
const clearBtn = document.getElementById("clearBtn");
const trashEl = document.getElementById("trash");
const dragTooltipEl = document.getElementById("dragTooltip");

let boardRadius = parseInt(radiusInput.value, 10);
// state[q,r] -> elementKey
let state = new Map();

const MAX_PER_ELEMENT = 6;

function hexKey(q, r) {
  return `${q},${r}`;
}

function countOnBoard(elKey) {
  let n = 0;
  for (const v of state.values()) if (v === elKey) n++;
  return n;
}

// Axial hex distance from the center (0,0).
function hexDistance(q, r) {
  return (Math.abs(q) + Math.abs(r) + Math.abs(q + r)) / 2;
}

const NEIGHBOR_DIRS = [
  [1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1],
];

function neighborCoords(q, r) {
  return NEIGHBOR_DIRS.map(([dq, dr]) => [q + dq, r + dr]);
}

// The 6 hexes directly touching the center.
const RING1_COORDS = neighborCoords(0, 0);

function isRing1Full(excludeKey) {
  return RING1_COORDS.every(([q, r]) => {
    const key = hexKey(q, r);
    return key !== excludeKey && state.has(key);
  });
}

function neighborSupportCount(q, r, excludeKey) {
  let n = 0;
  for (const [nq, nr] of neighborCoords(q, r)) {
    const nKey = hexKey(nq, nr);
    if (nKey === excludeKey) continue;
    if (state.has(nKey)) n++;
  }
  return n;
}

// Ring 1 (the 6 hexes touching the center) may hold at most one of each
// element, even if the matching hex isn't directly adjacent. Rings 2+ only
// forbid the same element from sitting on two neighboring hexes.
// Returns null when the placement is allowed, or a human-readable reason
// string when it's blocked.
function getPlacementBlockReason(q, r, elKey, excludeKey) {
  const el = ELEMENTS.find((e) => e.key === elKey);
  const label = el ? el.label : elKey;
  const dist = hexDistance(q, r);

  if (q === 0 && r === 0) {
    return "Field elements can't be placed on the center hex";
  }

  if (dist > 1) {
    if (!isRing1Full(excludeKey)) {
      return "Ring 1 must be completely filled (one of each element) before placing further out";
    }
    if (neighborSupportCount(q, r, excludeKey) < 2) {
      return "Field elements beyond ring 1 must neighbor at least 2 other field elements";
    }
  }

  if (dist === 1) {
    for (const [key, v] of state.entries()) {
      if (key === excludeKey) continue;
      const [kq, kr] = key.split(",").map(Number);
      if (hexDistance(kq, kr) === 1 && v === elKey) {
        return `Ring 1 already has a ${label} field element`;
      }
    }
  }

  for (const [nq, nr] of neighborCoords(q, r)) {
    const nKey = hexKey(nq, nr);
    if (nKey === excludeKey) continue;
    if (state.get(nKey) === elKey) {
      return `${label} can't neighbor another ${label} field element`;
    }
  }

  return null;
}

function canPlaceAt(q, r, elKey, excludeKey) {
  return getPlacementBlockReason(q, r, elKey, excludeKey) === null;
}

function updatePaletteAvailability() {
  ELEMENTS.forEach((el) => {
    const div = paletteEl.querySelector(`.token[data-key="${el.key}"]`);
    if (!div) return;
    const count = countOnBoard(el.key);
    const full = count >= MAX_PER_ELEMENT;
    div.classList.toggle("token-full", full);
    div.querySelector(".token-count").textContent = `${count}/${MAX_PER_ELEMENT}`;
  });
}

function buildPalette() {
  paletteEl.innerHTML = "";
  ELEMENTS.forEach((el) => {
    const div = document.createElement("div");
    div.className = `token ${el.key}`;
    div.dataset.key = el.key;
    div.title = el.label;
    div.textContent = el.icon;

    const count = document.createElement("span");
    count.className = "token-count";
    div.appendChild(count);

    div.addEventListener("pointerdown", (e) => {
      if (div.classList.contains("token-full")) return;
      startDrag(e, { source: "palette", elKey: el.key }, div);
    });
    paletteEl.appendChild(div);
  });
  updatePaletteAvailability();
}

function axialToPixel(q, r) {
  const x = HEX_SIZE * 1.5 * q;
  const y = HEX_SIZE * Math.sqrt(3) * (r + q / 2);
  return { x, y };
}

function buildBoard(preserveState) {
  boardEl.innerHTML = "";
  if (!preserveState) state.clear();

  const coords = [];
  for (let q = -boardRadius; q <= boardRadius; q++) {
    const r1 = Math.max(-boardRadius, -q - boardRadius);
    const r2 = Math.min(boardRadius, -q + boardRadius);
    for (let r = r1; r <= r2; r++) {
      coords.push([q, r]);
    }
  }

  const points = coords.map(([q, r]) => axialToPixel(q, r));
  const minX = Math.min(...points.map((p) => p.x)) - HEX_SIZE;
  const minY = Math.min(...points.map((p) => p.y)) - HEX_SIZE * Math.sqrt(3) / 2;
  const maxX = Math.max(...points.map((p) => p.x)) + HEX_SIZE;
  const maxY = Math.max(...points.map((p) => p.y)) + HEX_SIZE * Math.sqrt(3) / 2;

  boardEl.style.width = `${maxX - minX}px`;
  boardEl.style.height = `${maxY - minY}px`;

  const hexW = HEX_SIZE * 2;
  const hexH = HEX_SIZE * Math.sqrt(3);

  coords.forEach(([q, r]) => {
    const { x, y } = axialToPixel(q, r);
    const hex = document.createElement("div");
    hex.className = q === 0 && r === 0 ? "hex hex-center" : "hex";
    hex.dataset.q = q;
    hex.dataset.r = r;
    hex.style.width = `${hexW}px`;
    hex.style.height = `${hexH}px`;
    hex.style.left = `${x - minX - hexW / 2}px`;
    hex.style.top = `${y - minY - hexH / 2}px`;

    if (q === 0 && r === 0) hex.insertAdjacentHTML("beforeend", PLATYPUS_HTML);

    boardEl.appendChild(hex);
  });

  if (preserveState) {
    for (const key of state.keys()) {
      const [q, r] = key.split(",").map(Number);
      renderHex(q, r);
    }
    updatePaletteAvailability();
  }
}

let lastHexSize = HEX_SIZE;
let resizeDebounce = null;
window.addEventListener("resize", () => {
  clearTimeout(resizeDebounce);
  resizeDebounce = setTimeout(() => {
    const newSize = getHexSize();
    if (newSize !== lastHexSize) {
      lastHexSize = newSize;
      HEX_SIZE = newSize;
      buildBoard(true);
    }
  }, 150);
});

function placeToken(q, r, elKey) {
  state.set(hexKey(q, r), elKey);
  renderHex(q, r);
  updatePaletteAvailability();
}

function removeToken(q, r) {
  state.delete(hexKey(q, r));
  renderHex(q, r);
  updatePaletteAvailability();
}

function renderHex(q, r) {
  const hex = boardEl.querySelector(`.hex[data-q="${q}"][data-r="${r}"]`);
  if (!hex) return;
  const existing = hex.querySelector(".token-in-hex");
  if (existing) existing.remove();

  const elKey = state.get(hexKey(q, r));
  if (!elKey) return;

  const el = ELEMENTS.find((e) => e.key === elKey);
  const tokenEl = document.createElement("div");
  tokenEl.className = `token-in-hex ${elKey}`;
  tokenEl.textContent = el.icon;
  tokenEl.title = el.label;

  tokenEl.addEventListener("pointerdown", (e) =>
    startDrag(e, { source: "hex", elKey, fromQ: q, fromR: r }, tokenEl)
  );

  hex.appendChild(tokenEl);
}

// --- Pointer-based drag & drop (works with mouse, touch, and pen) ---

const CLICK_THRESHOLD = 6; // px of movement below which a pointerdown+up counts as a click, not a drag

function startDrag(e, payload, sourceEl) {
  if (e.button !== undefined && e.button !== 0) return;
  e.preventDefault();

  if (e.target.setPointerCapture) {
    try {
      e.target.setPointerCapture(e.pointerId);
    } catch (err) {
      // Ignore — capture is a robustness aid, not required for the drag to work.
    }
  }

  const startX = e.clientX;
  const startY = e.clientY;
  let moved = false;
  let ghost = null;

  function onMove(ev) {
    const dx = ev.clientX - startX;
    const dy = ev.clientY - startY;
    if (!moved && Math.hypot(dx, dy) > CLICK_THRESHOLD) {
      moved = true;
      ghost = sourceEl.cloneNode(true);
      ghost.classList.add("drag-ghost");
      ghost.style.position = "fixed";
      ghost.style.pointerEvents = "none";
      ghost.style.zIndex = "1000";
      ghost.style.opacity = "0.85";
      const rect = sourceEl.getBoundingClientRect();
      ghost.style.width = `${rect.width}px`;
      ghost.style.height = `${rect.height}px`;
      document.body.appendChild(ghost);
      sourceEl.style.visibility = "hidden";
      positionGhost(ev);
      document.querySelectorAll(".hex").forEach((h) => {
        if (!h.querySelector(".token-in-hex")) h.classList.add("droppable");
      });
    } else if (moved) {
      positionGhost(ev);
      updateHoverTargets(ev);
    }
  }

  function showDragTooltip(text, x, y) {
    dragTooltipEl.textContent = text;
    dragTooltipEl.style.display = "block";

    const margin = 8;
    const rect = dragTooltipEl.getBoundingClientRect();

    // Prefer showing the tooltip above the touch/cursor point so a finger
    // dragging the token doesn't cover the text.
    let left = x - rect.width / 2;
    let top = y - rect.height - 22;

    if (top < margin) top = y + 26;
    left = Math.max(margin, Math.min(left, window.innerWidth - rect.width - margin));

    dragTooltipEl.style.left = `${left}px`;
    dragTooltipEl.style.top = `${top}px`;
  }

  function positionGhost(ev) {
    const rect = sourceEl.getBoundingClientRect();
    ghost.style.left = `${ev.clientX - rect.width / 2}px`;
    ghost.style.top = `${ev.clientY - rect.height / 2}px`;
  }

  function updateHoverTargets(ev) {
    ghost.style.display = "none";
    const target = document.elementFromPoint(ev.clientX, ev.clientY);
    ghost.style.display = "";
    document.querySelectorAll(".hex.drag-over, .hex.drag-invalid").forEach((h) =>
      h.classList.remove("drag-over", "drag-invalid")
    );
    trashEl.classList.remove("drag-over");
    dragTooltipEl.style.display = "none";
    if (!target) return;
    const hex = target.closest(".hex");
    if (hex) {
      const tq = Number(hex.dataset.q);
      const tr = Number(hex.dataset.r);
      const isOwnOrigin = payload.source === "hex" && tq === payload.fromQ && tr === payload.fromR;
      const occupied = !!hex.querySelector(".token-in-hex") && !isOwnOrigin;
      const excludeKey = payload.source === "hex" ? hexKey(payload.fromQ, payload.fromR) : null;
      const reason = occupied ? "Field occupied" : getPlacementBlockReason(tq, tr, payload.elKey, excludeKey);
      hex.classList.add(reason ? "drag-invalid" : "drag-over");
      if (reason) {
        showDragTooltip(reason, ev.clientX, ev.clientY);
      }
    }
    if (target.closest("#trash")) trashEl.classList.add("drag-over");
  }

  function endDrag(ev) {
    document.removeEventListener("pointermove", onMove);
    document.removeEventListener("pointerup", onUp);

    document.querySelectorAll(".hex.droppable").forEach((h) => h.classList.remove("droppable"));
    document.querySelectorAll(".hex.drag-over, .hex.drag-invalid").forEach((h) =>
      h.classList.remove("drag-over", "drag-invalid")
    );
    trashEl.classList.remove("drag-over");
    dragTooltipEl.style.display = "none";

    if (ghost) ghost.remove();
    sourceEl.style.visibility = "";

    if (!moved) {
      if (payload.source === "hex") removeToken(payload.fromQ, payload.fromR);
      return;
    }

    ghost.style.display = "none";
    const target = document.elementFromPoint(ev.clientX, ev.clientY);
    if (!target) return;

    if (target.closest("#trash")) {
      if (payload.source === "hex") removeToken(payload.fromQ, payload.fromR);
      return;
    }

    const hexTarget = target.closest(".hex");
    if (!hexTarget) return;
    const tq = Number(hexTarget.dataset.q);
    const tr = Number(hexTarget.dataset.r);
    if (state.has(hexKey(tq, tr))) return; // occupied

    if (payload.source === "palette") {
      if (countOnBoard(payload.elKey) >= MAX_PER_ELEMENT) return;
      if (!canPlaceAt(tq, tr, payload.elKey, null)) return;
      placeToken(tq, tr, payload.elKey);
    } else {
      const fromKey = hexKey(payload.fromQ, payload.fromR);
      if (!canPlaceAt(tq, tr, payload.elKey, fromKey)) return;
      removeToken(payload.fromQ, payload.fromR);
      placeToken(tq, tr, payload.elKey);
    }
  }

  function onUp(ev) {
    endDrag(ev);
  }

  document.addEventListener("pointermove", onMove);
  document.addEventListener("pointerup", onUp);
}

regenerateBtn.addEventListener("click", () => {
  const val = parseInt(radiusInput.value, 10);
  boardRadius = Number.isFinite(val) && val > 0 ? val : 6;
  radiusInput.value = boardRadius;
  buildBoard();
});

clearBtn.addEventListener("click", () => {
  const keys = Array.from(state.keys());
  keys.forEach((key) => {
    const [q, r] = key.split(",").map(Number);
    removeToken(q, r);
  });
});

buildPalette();
buildBoard();
