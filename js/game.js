const ELEMENTS = [
  { key: "fire", label: "Fire" },
  { key: "ice", label: "Ice" },
  { key: "earth", label: "Earth" },
  { key: "wood", label: "Wood" },
  { key: "stone", label: "Stone" },
  { key: "metal", label: "Metal" },
];

function getHexSize() {
  return document.body.classList.contains("layout-mobile") ? 40 : 52;
}

let HEX_SIZE = getHexSize();

const PLATYPUS_IMG_SRC = "images/platypus.png";
const PLATYPUS_HTML = `<img class="platypus-icon" src="${PLATYPUS_IMG_SRC}" alt="Wise platypus" />`;

const boardEl = document.getElementById("board");
const boardRadius = 3;

const BOARD_STATE_STORAGE_KEY = "balanceOfPowerBoardState";

function loadBoardState() {
  const raw = sessionStorage.getItem(BOARD_STATE_STORAGE_KEY);
  if (!raw) return null;
  try {
    return new Map(JSON.parse(raw));
  } catch (err) {
    return null;
  }
}

const state = loadBoardState();

function hexKey(q, r) {
  return `${q},${r}`;
}

function axialToPixel(q, r) {
  const x = HEX_SIZE * 1.5 * q;
  const y = HEX_SIZE * Math.sqrt(3) * (r + q / 2);
  return { x, y };
}

function buildBoard() {
  boardEl.innerHTML = "";

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
  const minY = Math.min(...points.map((p) => p.y)) - (HEX_SIZE * Math.sqrt(3)) / 2;
  const maxX = Math.max(...points.map((p) => p.x)) + HEX_SIZE;
  const maxY = Math.max(...points.map((p) => p.y)) + (HEX_SIZE * Math.sqrt(3)) / 2;

  boardEl.style.width = `${maxX - minX}px`;
  boardEl.style.height = `${maxY - minY}px`;

  const hexW = HEX_SIZE * 2;
  const hexH = HEX_SIZE * Math.sqrt(3);

  coords.forEach(([q, r]) => {
    const { x, y } = axialToPixel(q, r);
    const hex = document.createElement("div");
    hex.className = q === 0 && r === 0 ? "hex hex-center" : "hex";
    hex.style.width = `${hexW}px`;
    hex.style.height = `${hexH}px`;
    hex.style.left = `${x - minX - hexW / 2}px`;
    hex.style.top = `${y - minY - hexH / 2}px`;

    if (q === 0 && r === 0) {
      hex.insertAdjacentHTML("beforeend", PLATYPUS_HTML);
    } else if (state) {
      const elKey = state.get(hexKey(q, r));
      if (elKey) {
        const tokenEl = document.createElement("div");
        tokenEl.className = `token-in-hex ${elKey}`;
        const el = ELEMENTS.find((e) => e.key === elKey);
        tokenEl.title = el ? el.label : elKey;
        hex.appendChild(tokenEl);
      }
    }

    boardEl.appendChild(hex);
  });
}

function applyLayoutHexSize() {
  const newSize = getHexSize();
  if (newSize !== HEX_SIZE) {
    HEX_SIZE = newSize;
    buildBoard();
  }
}

if (!state) {
  boardEl.innerHTML = "";
  const msg = document.createElement("p");
  msg.className = "hint";
  msg.style.textAlign = "center";
  msg.style.marginTop = "40px";
  msg.textContent = "No board found. Go back to setup and finish placing all field elements first.";
  boardEl.parentElement.appendChild(msg);
} else {
  buildBoard();
}
