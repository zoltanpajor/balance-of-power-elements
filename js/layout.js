// Lets the user force a Desktop or Mobile layout via the top-right selector,
// overriding whatever the device's actual screen size would normally pick.
const LAYOUT_STORAGE_KEY = "balanceOfPowerLayout";

function detectDefaultLayout() {
  return window.innerWidth < 700 ? "mobile" : "desktop";
}

let currentLayout = localStorage.getItem(LAYOUT_STORAGE_KEY) || detectDefaultLayout();
document.body.classList.add(`layout-${currentLayout}`);

function updateLayoutToggleUI() {
  const btn = document.getElementById("layoutToggle");
  if (!btn) return;
  if (currentLayout === "mobile") {
    btn.textContent = "📱";
    btn.title = "Mobile layout — tap to switch to Desktop";
  } else {
    btn.textContent = "🖥️";
    btn.title = "Desktop layout — tap to switch to Mobile";
  }
}

function setLayout(mode) {
  document.body.classList.remove("layout-desktop", "layout-mobile");
  document.body.classList.add(`layout-${mode}`);
  currentLayout = mode;
  localStorage.setItem(LAYOUT_STORAGE_KEY, mode);
  updateLayoutToggleUI();
  if (typeof applyLayoutHexSize === "function") applyLayoutHexSize();
}

function toggleLayout() {
  setLayout(currentLayout === "desktop" ? "mobile" : "desktop");
}

updateLayoutToggleUI();
document.getElementById("layoutToggle").addEventListener("click", toggleLayout);
