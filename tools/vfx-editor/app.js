const STAGE = { width: 720, height: 420 };

const DEMO_EFFECTS = {
  'fireball-travel': '../../src/features/vfx/assets/effects/fireball-travel.json',
  'fireball-impact': '../../src/features/vfx/assets/effects/fireball-impact.json',
  'frostbolt-travel': '../../src/features/vfx/assets/effects/frostbolt-travel.json',
  'frostbolt-impact': '../../src/features/vfx/assets/effects/frostbolt-impact.json',
};

const TRACK_LABELS = {
  scale: 'Scale over lifetime',
  alpha: 'Opacity over lifetime',
  glow: 'Glow over lifetime',
  x: 'Offset X over lifetime',
  y: 'Offset Y over lifetime',
  travel: 'Travel over lifetime',
};

const TRACKS_BY_LAYER_TYPE = {
  orb: ['scale', 'alpha', 'glow', 'x', 'y'],
  ring: ['scale', 'alpha', 'x', 'y'],
  trail: ['scale', 'alpha', 'x', 'y'],
  streak: ['scale', 'alpha', 'x', 'y'],
  diamond: ['scale', 'alpha', 'x', 'y'],
  arc: ['scale', 'alpha', 'x', 'y'],
  starburst: ['scale', 'alpha', 'x', 'y'],
  sprite: ['scale', 'alpha', 'x', 'y'],
};

const LAYER_TYPE_OPTIONS = [
  { value: 'orb', label: 'Orb' },
  { value: 'ring', label: 'Ring' },
  { value: 'trail', label: 'Trail' },
  { value: 'streak', label: 'Streak' },
  { value: 'diamond', label: 'Diamond' },
  { value: 'arc', label: 'Arc' },
  { value: 'starburst', label: 'Starburst' },
  { value: 'sprite', label: 'Sprite' },
];

const TRAIL_STYLE_OPTIONS = [
  { value: 'fill', label: 'Filled Circles' },
  { value: 'ring', label: 'Outlined Circles' },
  { value: 'streak', label: 'Streaks' },
  { value: 'diamond', label: 'Diamonds' },
  { value: 'arc', label: 'Arcs' },
  { value: 'starburst', label: 'Starbursts' },
  { value: 'sprite', label: 'Sprites' },
];

const SPRITE_MANIFEST_PATH = '../../src/features/vfx/assets/sprites/manifest.json';
const SPRITE_EDITOR_BASE_PATH = '../../src/features/vfx/assets/sprites';
const REPO_SPRITES_SEGMENTS = ['src', 'features', 'vfx', 'assets', 'sprites'];
const REPO_RUNTIME_SEGMENTS = ['src', 'features', 'vfx', 'runtime'];
const REPO_EDITOR_SEGMENTS = ['tools', 'vfx-editor'];
const SPRITE_REGISTRY_FILE = 'spriteRegistry.ts';
const EDITOR_SESSION_STORAGE_KEY = 'questing-together:vfx-editor-session:v1';
const EDITOR_SESSION_FILE_NAME = 'editor-session.json';
const EDITOR_SESSION_FETCH_PATH = `./${EDITOR_SESSION_FILE_NAME}`;
const HANDLE_DB_NAME = 'questing-together-vfx-editor';
const HANDLE_DB_VERSION = 1;
const HANDLE_STORE_NAME = 'file-system-handles';
const REPO_ROOT_HANDLE_KEY = 'repo-root';
const RECENT_FILES_LIMIT = 8;
const PANEL_RESIZE_LIMITS = {
  previewMin: 460,
  sidebarMin: 620,
  layersMin: 280,
  inspectorMin: 320,
};
const PREVIEW_VIEWPORT_LIMITS = {
  minZoom: 0.5,
  maxZoom: 4,
  buttonStep: 0.25,
  wheelFactor: 1.12,
};

let spriteLibrary = {};

function createDefaultPreviewBackground() {
  return {
    preset: 'ember',
    ...cloneData(PREVIEW_BACKDROPS.ember),
  };
}

function createDefaultPreviewViewport() {
  return {
    zoom: 1,
    centerX: STAGE.width / 2,
    centerY: STAGE.height / 2,
  };
}

function createDefaultPreviewDevice() {
  return {
    preset: 'free',
    showSafeArea: true,
  };
}

function createDefaultCollapsedPanels() {
  return {
    assetMotion: false,
    layersStack: false,
    layerProperties: false,
    layerCurves: false,
    jsonPanel: false,
  };
}

const PREVIEW_BACKDROPS = {
  ember: {
    label: 'Ember Cavern',
    top: '#1c1214',
    bottom: '#0d0b10',
    glow: '#df945c',
    grid: 'rgba(255, 227, 187, 0.08)',
    ground: 'rgba(255, 235, 211, 0.08)',
  },
  frost: {
    label: 'Frozen Hall',
    top: '#0f1822',
    bottom: '#091017',
    glow: '#8fd7ff',
    grid: 'rgba(207, 238, 255, 0.09)',
    ground: 'rgba(201, 240, 255, 0.08)',
  },
  arcane: {
    label: 'Arcane Chamber',
    top: '#1a1630',
    bottom: '#0f0d1b',
    glow: '#9e8bff',
    grid: 'rgba(228, 217, 255, 0.08)',
    ground: 'rgba(219, 204, 255, 0.07)',
  },
  poison: {
    label: 'Poison Bog',
    top: '#132116',
    bottom: '#0d140d',
    glow: '#7ad96b',
    grid: 'rgba(215, 255, 196, 0.08)',
    ground: 'rgba(222, 255, 203, 0.07)',
  },
  void: {
    label: 'Void Rift',
    top: '#141018',
    bottom: '#040407',
    glow: '#ff6fb2',
    grid: 'rgba(255, 223, 241, 0.08)',
    ground: 'rgba(255, 221, 240, 0.06)',
  },
  custom: {
    label: 'Custom',
    top: '#181017',
    bottom: '#0e0b10',
    glow: '#df945c',
    grid: 'rgba(255,255,255,0.08)',
    ground: 'rgba(255,255,255,0.04)',
  },
};

const PREVIEW_DEVICE_PRESETS = {
  free: {
    label: 'Free',
    width: null,
    height: null,
    safeArea: null,
  },
  phoneTall: {
    label: 'Phone Tall',
    width: 393,
    height: 852,
    safeArea: { top: 59, right: 0, bottom: 34, left: 0 },
  },
  phoneCompact: {
    label: 'Phone Compact',
    width: 375,
    height: 667,
    safeArea: { top: 20, right: 0, bottom: 0, left: 0 },
  },
  tabletPortrait: {
    label: 'Tablet Portrait',
    width: 820,
    height: 1180,
    safeArea: { top: 24, right: 0, bottom: 20, left: 0 },
  },
  tabletLandscape: {
    label: 'Tablet Landscape',
    width: 1180,
    height: 820,
    safeArea: { top: 24, right: 0, bottom: 20, left: 0 },
  },
};

const CURVE_PRESETS = {
  linear: { label: 'Linear', x1: 0.333, y1: 0.333, x2: 0.667, y2: 0.667 },
  easeInQuad: { label: 'Ease In Quad', x1: 0.55, y1: 0.085, x2: 0.68, y2: 0.53 },
  easeOutQuad: { label: 'Ease Out Quad', x1: 0.25, y1: 0.46, x2: 0.45, y2: 0.94 },
  easeInOutQuad: { label: 'Ease In Out Quad', x1: 0.455, y1: 0.03, x2: 0.515, y2: 0.955 },
  easeInCubic: { label: 'Ease In Cubic', x1: 0.55, y1: 0.055, x2: 0.675, y2: 0.19 },
  easeOutCubic: { label: 'Ease Out Cubic', x1: 0.215, y1: 0.61, x2: 0.355, y2: 1 },
  easeInOutCubic: { label: 'Ease In Out Cubic', x1: 0.645, y1: 0.045, x2: 0.355, y2: 1 },
  easeInQuart: { label: 'Ease In Quart', x1: 0.895, y1: 0.03, x2: 0.685, y2: 0.22 },
  easeOutQuart: { label: 'Ease Out Quart', x1: 0.165, y1: 0.84, x2: 0.44, y2: 1 },
  easeInOutSine: { label: 'Ease In Out Sine', x1: 0.445, y1: 0.05, x2: 0.55, y2: 0.95 },
};

const CURVE_EDITOR = {
  width: 320,
  height: 190,
  padX: 22,
  padY: 18,
  bakeSamplesPerSegment: 16,
};

const ui = {
  appShell: document.getElementById('appShell'),
  workspaceGrid: document.getElementById('workspaceGrid'),
  sidebarGrid: document.getElementById('sidebarGrid'),
  assetPanel: document.getElementById('assetPanel'),
  layersPanel: document.getElementById('layersPanel'),
  layerInspectorPanel: document.getElementById('layerInspectorPanel'),
  previewResizeHandle: document.getElementById('previewResizeHandle'),
  layersResizeHandle: document.getElementById('layersResizeHandle'),
  stageFrame: document.getElementById('stageFrame'),
  stageViewportSurface: document.getElementById('stageViewportSurface'),
  stageSvg: document.getElementById('stageSvg'),
  safeAreaOverlay: document.getElementById('safeAreaOverlay'),
  safeAreaTop: document.getElementById('safeAreaTop'),
  safeAreaRight: document.getElementById('safeAreaRight'),
  safeAreaBottom: document.getElementById('safeAreaBottom'),
  safeAreaLeft: document.getElementById('safeAreaLeft'),
  safeAreaGuide: document.getElementById('safeAreaGuide'),
  previewDeviceSelect: document.getElementById('previewDeviceSelect'),
  safeAreaToggleButton: document.getElementById('safeAreaToggleButton'),
  zoomOutButton: document.getElementById('zoomOutButton'),
  zoomResetButton: document.getElementById('zoomResetButton'),
  zoomInButton: document.getElementById('zoomInButton'),
  effectTitleLabel: document.getElementById('effectTitleLabel'),
  fileStatusLabel: document.getElementById('fileStatusLabel'),
  saveStatusLabel: document.getElementById('saveStatusLabel'),
  fileMenu: document.getElementById('fileMenu'),
  editorMenu: document.getElementById('editorMenu'),
  fileMenuContent: document.getElementById('fileMenuContent'),
  editorMenuContent: document.getElementById('editorMenuContent'),
  progressPercentLabel: document.getElementById('progressPercentLabel'),
  progressTimeLabel: document.getElementById('progressTimeLabel'),
  progressSlider: document.getElementById('progressSlider'),
  panelJson: document.querySelector('.panel-json'),
  jsonEditor: document.getElementById('jsonEditor'),
  jsonStatusLabel: document.getElementById('jsonStatusLabel'),
  jsonCollapseButton: document.getElementById('jsonCollapseButton'),
  togglePlaybackButton: document.getElementById('togglePlaybackButton'),
  restartPlaybackButton: document.getElementById('restartPlaybackButton'),
  resetTemplateButton: document.getElementById('resetTemplateButton'),
  applyJsonButton: document.getElementById('applyJsonButton'),
  fallbackFileInput: document.getElementById('fallbackFileInput'),
};

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function cloneData(value) {
  return JSON.parse(JSON.stringify(value));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function clamp01(value) {
  return clamp(value, 0, 1);
}

function lerp(start, end, amount) {
  return start + (end - start) * amount;
}

function stringifyAsset(asset) {
  return `${JSON.stringify(asset, null, 2)}\n`;
}

function slugify(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'sprite';
}

function titleCaseFromId(value) {
  return String(value)
    .split(/[-_]+/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getSpriteImportName(spriteId) {
  const camel = slugify(spriteId).replace(/-([a-z0-9])/g, (_, char) => char.toUpperCase());
  const safe = /^[a-zA-Z_$]/.test(camel) ? camel : `sprite${camel.charAt(0).toUpperCase()}${camel.slice(1)}`;
  return `${safe}Sprite`;
}

function parseColorToRgba(color) {
  if (typeof color !== 'string') return null;

  const value = color.trim();
  if (!value) return null;

  if (value.startsWith('#')) {
    const hex = value.slice(1);
    if (hex.length === 3 || hex.length === 4) {
      const expanded = hex
        .split('')
        .map((part) => part + part)
        .join('');
      const red = Number.parseInt(expanded.slice(0, 2), 16);
      const green = Number.parseInt(expanded.slice(2, 4), 16);
      const blue = Number.parseInt(expanded.slice(4, 6), 16);
      const alpha =
        expanded.length === 8 ? Number.parseInt(expanded.slice(6, 8), 16) / 255 : 1;
      return { red, green, blue, alpha };
    }

    if (hex.length === 6 || hex.length === 8) {
      const red = Number.parseInt(hex.slice(0, 2), 16);
      const green = Number.parseInt(hex.slice(2, 4), 16);
      const blue = Number.parseInt(hex.slice(4, 6), 16);
      const alpha = hex.length === 8 ? Number.parseInt(hex.slice(6, 8), 16) / 255 : 1;
      return { red, green, blue, alpha };
    }
  }

  const rgbMatch = value.match(
    /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/i,
  );

  if (rgbMatch) {
    return {
      red: clamp(Number(rgbMatch[1]), 0, 255),
      green: clamp(Number(rgbMatch[2]), 0, 255),
      blue: clamp(Number(rgbMatch[3]), 0, 255),
      alpha: rgbMatch[4] == null ? 1 : clamp(Number(rgbMatch[4]), 0, 1),
    };
  }

  return null;
}

function rgbaToHex({ red, green, blue }) {
  const toHex = (channel) => Math.round(channel).toString(16).padStart(2, '0');
  return `#${toHex(red)}${toHex(green)}${toHex(blue)}`;
}

function getColorInputValue(color, fallback = '#ffffff') {
  const parsed = parseColorToRgba(color);
  return parsed ? rgbaToHex(parsed) : fallback;
}

function mergePickedHexWithSource(sourceColor, pickedHex) {
  const parsedSource = parseColorToRgba(sourceColor);
  const parsedPicked = parseColorToRgba(pickedHex);
  if (!parsedPicked) return sourceColor;

  if (parsedSource && parsedSource.alpha < 1) {
    return `rgba(${Math.round(parsedPicked.red)}, ${Math.round(parsedPicked.green)}, ${Math.round(parsedPicked.blue)}, ${Number(parsedSource.alpha.toFixed(3))})`;
  }

  return pickedHex;
}

function renderColorField({ label, value, field, datasetName, fallback = '#ffffff' }) {
  return `
    <label class="field">
      <span class="field-label">${escapeHtml(label)}</span>
      <div class="color-input-row">
        <span class="swatch" style="background: ${escapeHtml(value || fallback)};"></span>
        <input
          class="field-color"
          type="color"
          value="${escapeHtml(getColorInputValue(value, fallback))}"
          data-${datasetName}="${field}"
          data-color-picker="true"
        />
        <input
          class="field-input"
          type="text"
          value="${escapeHtml(value ?? '')}"
          data-${datasetName}="${field}"
        />
      </div>
      <span class="section-note">Accepts CSS color strings like <code>#ff8844</code>, <code>#ff8844cc</code>, <code>rgb(...)</code>, or <code>rgba(...)</code>.</span>
    </label>
  `;
}

function getDefaultSpriteId() {
  return Object.keys(spriteLibrary)[0] ?? '';
}

function hasSpriteDefinition(spriteId) {
  return Boolean(spriteId && spriteLibrary[spriteId]);
}

function getSpriteDefinition(spriteId) {
  return spriteLibrary[spriteId] ?? spriteLibrary[getDefaultSpriteId()] ?? null;
}

function getSpritePreviewSrc(spriteId) {
  return getSpriteDefinition(spriteId)?.src ?? '';
}

function getTrailStyleLabel(style) {
  return TRAIL_STYLE_OPTIONS.find((option) => option.value === style)?.label ?? 'Filled Circles';
}

function getTrailStyleCardLabel(style) {
  if (!style || style === 'fill') {
    return 'trail';
  }

  return `trail (${style})`;
}

function applyTrailStyleDefaults(layer) {
  const style = TRAIL_STYLE_OPTIONS.some((option) => option.value === layer.style)
    ? layer.style
    : 'fill';
  layer.style = style;
  layer.radius = Number.isFinite(Number(layer.radius)) ? Number(layer.radius) : 12;
  layer.segments = Number.isFinite(Number(layer.segments)) ? Math.max(1, Math.round(Number(layer.segments))) : 6;
  layer.spacing = Number.isFinite(Number(layer.spacing)) ? Number(layer.spacing) : 0.06;
  layer.falloff = Number.isFinite(Number(layer.falloff)) ? Number(layer.falloff) : 0.1;

  if (style === 'ring') {
    layer.thickness = Number.isFinite(Number(layer.thickness)) ? Number(layer.thickness) : 2.5;
  }

  if (style === 'sprite') {
    layer.spriteId =
      typeof layer.spriteId === 'string' && hasSpriteDefinition(layer.spriteId)
        ? layer.spriteId
        : getDefaultSpriteId();
    layer.width = Number.isFinite(Number(layer.width)) ? Number(layer.width) : layer.radius * 2;
    layer.height = Number.isFinite(Number(layer.height)) ? Number(layer.height) : layer.radius * 2;
    layer.tintColor = typeof layer.tintColor === 'string' ? layer.tintColor : undefined;
  }

  if (style === 'streak' || style === 'diamond') {
    layer.width = Number.isFinite(Number(layer.width))
      ? Number(layer.width)
      : style === 'streak'
        ? 36
        : 24;
    layer.height = Number.isFinite(Number(layer.height))
      ? Number(layer.height)
      : style === 'streak'
        ? 10
        : 28;
    layer.rotationDeg = Number.isFinite(Number(layer.rotationDeg))
      ? Number(layer.rotationDeg)
      : style === 'streak'
        ? -24
        : 0;
  }

  if (style === 'arc') {
    layer.radius = Number.isFinite(Number(layer.radius)) ? Number(layer.radius) : 16;
    layer.thickness = Number.isFinite(Number(layer.thickness)) ? Number(layer.thickness) : 3;
    layer.sweepDeg = Number.isFinite(Number(layer.sweepDeg)) ? Number(layer.sweepDeg) : 130;
    layer.rotationDeg = Number.isFinite(Number(layer.rotationDeg))
      ? Number(layer.rotationDeg)
      : -90;
  }

  if (style === 'starburst') {
    layer.innerRadius = Number.isFinite(Number(layer.innerRadius)) ? Number(layer.innerRadius) : 6;
    layer.outerRadius = Number.isFinite(Number(layer.outerRadius)) ? Number(layer.outerRadius) : 14;
    layer.points = Number.isFinite(Number(layer.points))
      ? Math.max(3, Math.round(Number(layer.points)))
      : 6;
    layer.rotationDeg = Number.isFinite(Number(layer.rotationDeg))
      ? Number(layer.rotationDeg)
      : -90;
  }

  return layer;
}

function getLayerCardSwatchStyle(layer) {
  if (layer.type === 'sprite' || (layer.type === 'trail' && layer.style === 'sprite')) {
    const href = getSpritePreviewSrc(layer.spriteId);
    return href
      ? `background-color: rgba(143, 215, 255, 0.16); background-image: url('${escapeHtml(href)}'); background-size: cover; background-position: center;`
      : 'background: rgba(143, 215, 255, 0.22);';
  }

  return `background: ${escapeHtml(layer.color)};`;
}

function renderSpriteField({ label = 'Sprite Asset', value, field, datasetName }) {
  const selectedId = hasSpriteDefinition(value) ? value : getDefaultSpriteId();

  return `
    <label class="field">
      <span class="field-label">${escapeHtml(label)}</span>
      <select class="field-select" data-${datasetName}="${field}">
        ${Object.entries(spriteLibrary)
          .map(
            ([spriteId, sprite]) => `
          <option value="${spriteId}" ${spriteId === selectedId ? 'selected' : ''}>${escapeHtml(sprite.label)}</option>
        `,
          )
          .join('')}
      </select>
      <span class="section-note">Sprites resolve by <code>spriteId</code> so the game and editor can load the same asset with alpha.</span>
    </label>
  `;
}

function renderTintField({ value, field = 'tintColor', datasetName = 'layer-field' }) {
  return `
    <label class="field">
      <span class="field-label">Tint Color</span>
      <div class="color-input-row">
        <span class="swatch" style="background: ${escapeHtml(value || '#ffffff')};"></span>
        <input
          class="field-color"
          type="color"
          value="${escapeHtml(getColorInputValue(value, '#ffffff'))}"
          data-${datasetName}="${field}"
          data-color-picker="true"
        />
        <input
          class="field-input"
          type="text"
          value="${escapeHtml(value ?? '')}"
          placeholder="leave empty for original sprite colors"
          data-${datasetName}="${field}"
        />
      </div>
      <span class="section-note">Optional. Uses the sprite alpha as a mask and fills it with this color.</span>
    </label>
  `;
}

function renderToolbarColorField({ label, value, field, fallback = '#ffffff' }) {
  return `
    <label class="menu-compact-field">
      <span class="field-label">${escapeHtml(label)}</span>
      <div class="menu-color-row">
        <input
          class="field-color"
          type="color"
          value="${escapeHtml(getColorInputValue(value, fallback))}"
          data-preview-field="${field}"
          data-color-picker="true"
        />
        <input
          class="field-input"
          type="text"
          value="${escapeHtml(value ?? '')}"
          data-preview-field="${field}"
        />
      </div>
    </label>
  `;
}

function buildSpriteLibraryFromManifest(entries) {
  return Object.fromEntries(
    entries.map((entry) => [
      entry.id,
      {
        label: entry.label,
        src: `${SPRITE_EDITOR_BASE_PATH}/${entry.filename}`,
        filename: entry.filename,
      },
    ]),
  );
}

async function loadSpriteManifest() {
  try {
    const response = await fetch(SPRITE_MANIFEST_PATH, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    const manifest = await response.json();
    const entries = Array.isArray(manifest?.sprites) ? manifest.sprites : [];
    spriteLibrary = buildSpriteLibraryFromManifest(entries);
    return entries;
  } catch (error) {
    console.error('Could not load sprite manifest', error);
    spriteLibrary = {};
    return [];
  }
}

async function getDirectoryHandle(rootHandle, segments) {
  let current = rootHandle;

  for (const segment of segments) {
    current = await current.getDirectoryHandle(segment, { create: true });
  }

  return current;
}

async function validateRepoRootHandle(rootHandle) {
  try {
    await getDirectoryHandle(rootHandle, REPO_EDITOR_SEGMENTS);
    await getDirectoryHandle(rootHandle, ['src', 'features', 'vfx']);
    return true;
  } catch (error) {
    return false;
  }
}

async function writeTextFile(directoryHandle, filename, contents) {
  const fileHandle = await directoryHandle.getFileHandle(filename, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(contents);
  await writable.close();
}

async function writeBinaryFile(directoryHandle, filename, contents) {
  const fileHandle = await directoryHandle.getFileHandle(filename, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(contents);
  await writable.close();
}

let handleDatabasePromise = null;

function openHandleDatabase() {
  if (!('indexedDB' in window)) {
    return Promise.resolve(null);
  }

  if (!handleDatabasePromise) {
    handleDatabasePromise = new Promise((resolve, reject) => {
      const request = window.indexedDB.open(HANDLE_DB_NAME, HANDLE_DB_VERSION);

      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(HANDLE_STORE_NAME)) {
          database.createObjectStore(HANDLE_STORE_NAME);
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () =>
        reject(request.error ?? new Error('Could not open the handle database.'));
    });
  }

  return handleDatabasePromise;
}

async function writeStoredHandle(key, handle) {
  const database = await openHandleDatabase();
  if (!database) return false;

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(HANDLE_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(HANDLE_STORE_NAME);
    const request = store.put(handle, key);
    request.onsuccess = () => resolve(true);
    request.onerror = () =>
      reject(request.error ?? new Error(`Could not persist the handle "${key}".`));
  });
}

async function readStoredHandle(key) {
  const database = await openHandleDatabase();
  if (!database) return null;

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(HANDLE_STORE_NAME, 'readonly');
    const store = transaction.objectStore(HANDLE_STORE_NAME);
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () =>
      reject(request.error ?? new Error(`Could not read the handle "${key}".`));
  });
}

async function deleteStoredHandle(key) {
  const database = await openHandleDatabase();
  if (!database) return false;

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(HANDLE_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(HANDLE_STORE_NAME);
    const request = store.delete(key);
    request.onsuccess = () => resolve(true);
    request.onerror = () =>
      reject(request.error ?? new Error(`Could not delete the handle "${key}".`));
  });
}

async function ensureHandlePermission(handle, writable = false) {
  if (!handle || typeof handle.queryPermission !== 'function') {
    return true;
  }

  const options = writable ? { mode: 'readwrite' } : { mode: 'read' };
  const current = await handle.queryPermission(options);
  if (current === 'granted') {
    return true;
  }

  const requested = await handle.requestPermission(options);
  return requested === 'granted';
}

function buildSpriteRegistrySource(entries) {
  const imports = entries
    .map((entry) => {
      const importName = getSpriteImportName(entry.id);
      return `import ${importName} from '@/features/vfx/assets/sprites/${entry.filename}';`;
    })
    .join('\n');

  const spriteObjects = entries
    .map((entry) => {
      const importName = getSpriteImportName(entry.id);
      return `  {\n    id: '${entry.id}',\n    label: '${entry.label.replaceAll("'", "\\'")}',\n    source: ${importName},\n    editorSrc: '../../src/features/vfx/assets/sprites/${entry.filename}',\n  },`;
    })
    .join('\n');

  return `import type { ImageSourcePropType } from 'react-native';\n${imports}\n\nexport type VfxSpriteDefinition = {\n  id: string;\n  label: string;\n  source: ImageSourcePropType;\n  editorSrc: string;\n};\n\nconst vfxSprites: VfxSpriteDefinition[] = [\n${spriteObjects}\n];\n\nconst vfxSpriteById = new Map(vfxSprites.map((sprite) => [sprite.id, sprite]));\n\nexport function getVfxSprite(spriteId: string) {\n  return vfxSpriteById.get(spriteId) ?? null;\n}\n\nexport function getVfxSpriteSource(spriteId: string) {\n  return getVfxSprite(spriteId)?.source ?? null;\n}\n\nexport function listVfxSprites() {\n  return vfxSprites.map(({ id, label, editorSrc }) => ({ id, label, editorSrc }));\n}\n`;
}

async function importSprite() {
  try {
    if (!('showOpenFilePicker' in window) || !('showDirectoryPicker' in window)) {
      setSaveStatus('Sprite import requires Chrome, Arc, or Edge with File System Access support.', 'error');
      return;
    }

    const [imageHandle] = await window.showOpenFilePicker({
      excludeAcceptAllOption: false,
      multiple: false,
      types: [
        {
          description: 'Sprite Images',
          accept: {
            'image/png': ['.png'],
            'image/webp': ['.webp'],
            'image/jpeg': ['.jpg', '.jpeg'],
          },
        },
      ],
    });

    if (!imageHandle) return;

    const imageFile = await imageHandle.getFile();
    const repoRootHandle =
      state.repoRootHandle ?? (await window.showDirectoryPicker({ mode: 'readwrite' }));
    const isValidRoot = await validateRepoRootHandle(repoRootHandle);
    if (!isValidRoot) {
      setSaveStatus('Choose the repo root folder: /Users/xavierlaborie/Documents/questing-together', 'error');
      return;
    }
    state.repoRootHandle = repoRootHandle;

    const extensionMatch = imageFile.name.match(/\.([a-z0-9]+)$/i);
    const extension = extensionMatch ? `.${extensionMatch[1].toLowerCase()}` : '.png';
    const suggestedId = slugify(imageFile.name.replace(/\.[^.]+$/, ''));
    const spriteId = slugify(window.prompt('Sprite ID', suggestedId) ?? suggestedId);
    if (!spriteId) return;
    const spriteLabel = (window.prompt('Sprite label', titleCaseFromId(spriteId)) ?? '').trim() || titleCaseFromId(spriteId);
    const filename = `${spriteId}${extension}`;

    const spritesDirHandle = await getDirectoryHandle(repoRootHandle, REPO_SPRITES_SEGMENTS);
    const runtimeDirHandle = await getDirectoryHandle(repoRootHandle, REPO_RUNTIME_SEGMENTS);
    const manifestHandle = await spritesDirHandle.getFileHandle('manifest.json', { create: true });
    const manifestFile = await manifestHandle.getFile();
    const manifestText = await manifestFile.text();
    const manifest = manifestText.trim() ? JSON.parse(manifestText) : { sprites: [] };
    const spriteEntries = Array.isArray(manifest.sprites) ? manifest.sprites.slice() : [];
    const fileBuffer = await imageFile.arrayBuffer();

    await writeBinaryFile(spritesDirHandle, filename, fileBuffer);

    const existingIndex = spriteEntries.findIndex((entry) => entry.id === spriteId);
    const nextEntry = { id: spriteId, label: spriteLabel, filename };
    if (existingIndex >= 0) {
      spriteEntries[existingIndex] = nextEntry;
    } else {
      spriteEntries.push(nextEntry);
    }

    spriteEntries.sort((left, right) => left.id.localeCompare(right.id));
    await writeTextFile(
      spritesDirHandle,
      'manifest.json',
      `${JSON.stringify({ sprites: spriteEntries }, null, 2)}\n`,
    );
    await writeTextFile(runtimeDirHandle, SPRITE_REGISTRY_FILE, buildSpriteRegistrySource(spriteEntries));

    spriteLibrary = buildSpriteLibraryFromManifest(spriteEntries);
    renderPanels();
    renderPreview();
    setSaveStatus(`Imported sprite "${spriteId}" and regenerated the runtime sprite registry. Reload the app if Metro does not pick it up immediately.`, 'success');
  } catch (error) {
    if (error?.name === 'AbortError') return;
    setSaveStatus(`Could not import sprite: ${error.message}`, 'error');
  }
}

function createStarterAsset() {
  return {
    id: 'fireball-travel',
    label: 'Fireball Travel',
    durationMs: 320,
    motion: {
      mode: 'line',
      tracks: {
        travel: [
          { at: 0, value: 0 },
          { at: 0.72, value: 0.78 },
          { at: 1, value: 1 },
        ],
      },
    },
    layers: [
      {
        id: 'trail',
        type: 'trail',
        radius: 14,
        segments: 8,
        spacing: 0.055,
        falloff: 0.08,
        color: 'rgba(255, 140, 60, 0.72)',
        tracks: {
          scale: [
            { at: 0, value: 0.65 },
            { at: 0.5, value: 0.9 },
            { at: 1, value: 1.05 },
          ],
          alpha: [
            { at: 0, value: 0.25 },
            { at: 0.12, value: 0.9 },
            { at: 1, value: 0.35 },
          ],
        },
      },
      {
        id: 'glow',
        type: 'orb',
        radius: 16,
        color: 'rgba(255, 171, 72, 0.4)',
        glowColor: 'rgba(255, 111, 23, 0.35)',
        glowScale: 2.8,
        tracks: {
          scale: [
            { at: 0, value: 0.7 },
            { at: 0.4, value: 0.95 },
            { at: 1, value: 1.1 },
          ],
          alpha: [
            { at: 0, value: 0.4 },
            { at: 0.15, value: 1 },
            { at: 1, value: 0.85 },
          ],
          glow: [
            { at: 0, value: 0.4 },
            { at: 0.45, value: 1 },
            { at: 1, value: 0.7 },
          ],
        },
      },
      {
        id: 'core',
        type: 'orb',
        radius: 8,
        color: '#fff1c9',
        glowColor: 'rgba(255, 214, 133, 0.65)',
        glowScale: 1.9,
        tracks: {
          scale: [
            { at: 0, value: 0.8 },
            { at: 0.55, value: 1 },
            { at: 1, value: 0.92 },
          ],
          alpha: [
            { at: 0, value: 0.35 },
            { at: 0.12, value: 1 },
            { at: 1, value: 1 },
          ],
          glow: [
            { at: 0, value: 0.2 },
            { at: 0.5, value: 0.85 },
            { at: 1, value: 0.55 },
          ],
        },
      },
    ],
  };
}

function createInstance() {
  return {
    x: 120,
    y: 308,
    targetX: 560,
    targetY: 120,
  };
}

function ensureMotion(asset) {
  if (!asset.motion) {
    asset.motion = { mode: 'fixed' };
  }

  if (!['fixed', 'line', 'path'].includes(asset.motion.mode)) {
    asset.motion.mode = 'fixed';
  }

  if (asset.motion.mode === 'line' || asset.motion.mode === 'path') {
    asset.motion.tracks ??= {};
  }
}

function normalizeTrack(track) {
  if (!Array.isArray(track)) return [];

  return track.map((keyframe) => ({
    at: Number.isFinite(Number(keyframe?.at)) ? Number(keyframe.at) : 0,
    value: Number.isFinite(Number(keyframe?.value)) ? Number(keyframe.value) : 0,
  }));
}

function normalizeAsset(rawAsset) {
  const asset = cloneData(rawAsset ?? {});

  asset.id = typeof asset.id === 'string' ? asset.id : 'new-effect';
  asset.label = typeof asset.label === 'string' ? asset.label : 'New Effect';
  asset.durationMs = Number.isFinite(Number(asset.durationMs)) ? Number(asset.durationMs) : 320;
  asset.loop = Boolean(asset.loop);
  asset.layers = Array.isArray(asset.layers) ? asset.layers : [];

  ensureMotion(asset);

  if (asset.motion?.tracks) {
    for (const trackName of ['travel', 'x', 'y']) {
      if (asset.motion.tracks[trackName]) {
        asset.motion.tracks[trackName] = normalizeTrack(asset.motion.tracks[trackName]);
      }
    }
  }

  asset.layers = asset.layers.map((layer, index) => {
    const nextLayer = cloneData(layer);
    nextLayer.id = typeof nextLayer.id === 'string' ? nextLayer.id : `layer-${index + 1}`;
    nextLayer.type = ['orb', 'ring', 'trail', 'streak', 'diamond', 'arc', 'starburst', 'sprite'].includes(nextLayer.type)
      ? nextLayer.type
      : 'orb';
    nextLayer.tracks = typeof nextLayer.tracks === 'object' && nextLayer.tracks ? nextLayer.tracks : {};

    for (const trackName of Object.keys(nextLayer.tracks)) {
      nextLayer.tracks[trackName] = normalizeTrack(nextLayer.tracks[trackName]);
    }

    if (nextLayer.type === 'sprite') {
      nextLayer.spriteId =
        typeof nextLayer.spriteId === 'string' && hasSpriteDefinition(nextLayer.spriteId)
          ? nextLayer.spriteId
          : getDefaultSpriteId();
      nextLayer.width = Number.isFinite(Number(nextLayer.width)) ? Number(nextLayer.width) : 36;
      nextLayer.height = Number.isFinite(Number(nextLayer.height)) ? Number(nextLayer.height) : 36;
      nextLayer.tintColor =
        typeof nextLayer.tintColor === 'string' ? nextLayer.tintColor : undefined;
      return nextLayer;
    }

    nextLayer.radius = Number.isFinite(Number(nextLayer.radius)) ? Number(nextLayer.radius) : 10;
    nextLayer.color = typeof nextLayer.color === 'string' ? nextLayer.color : '#ffffff';

    if (nextLayer.type === 'streak' || nextLayer.type === 'diamond') {
      nextLayer.width = Number.isFinite(Number(nextLayer.width)) ? Number(nextLayer.width) : 42;
      nextLayer.height = Number.isFinite(Number(nextLayer.height)) ? Number(nextLayer.height) : 16;
      nextLayer.rotationDeg = Number.isFinite(Number(nextLayer.rotationDeg))
        ? Number(nextLayer.rotationDeg)
        : 0;
      return nextLayer;
    }

    if (nextLayer.type === 'arc') {
      nextLayer.thickness = Number.isFinite(Number(nextLayer.thickness))
        ? Number(nextLayer.thickness)
        : 4;
      nextLayer.sweepDeg = Number.isFinite(Number(nextLayer.sweepDeg))
        ? Number(nextLayer.sweepDeg)
        : 120;
      nextLayer.rotationDeg = Number.isFinite(Number(nextLayer.rotationDeg))
        ? Number(nextLayer.rotationDeg)
        : -90;
      return nextLayer;
    }

    if (nextLayer.type === 'starburst') {
      nextLayer.innerRadius = Number.isFinite(Number(nextLayer.innerRadius))
        ? Number(nextLayer.innerRadius)
        : 8;
      nextLayer.outerRadius = Number.isFinite(Number(nextLayer.outerRadius))
        ? Number(nextLayer.outerRadius)
        : 18;
      nextLayer.points = Number.isFinite(Number(nextLayer.points))
        ? Math.max(3, Math.round(Number(nextLayer.points)))
        : 6;
      nextLayer.rotationDeg = Number.isFinite(Number(nextLayer.rotationDeg))
        ? Number(nextLayer.rotationDeg)
        : -90;
      return nextLayer;
    }

    if (nextLayer.type === 'orb') {
      nextLayer.glowScale = Number.isFinite(Number(nextLayer.glowScale))
        ? Number(nextLayer.glowScale)
        : undefined;
      nextLayer.glowColor =
        typeof nextLayer.glowColor === 'string' ? nextLayer.glowColor : undefined;
    }

    if (nextLayer.type === 'ring') {
      nextLayer.thickness = Number.isFinite(Number(nextLayer.thickness))
        ? Number(nextLayer.thickness)
        : 4;
    }

    if (nextLayer.type === 'trail') {
      nextLayer.thickness = Number.isFinite(Number(nextLayer.thickness))
        ? Number(nextLayer.thickness)
        : undefined;
      nextLayer.width = Number.isFinite(Number(nextLayer.width)) ? Number(nextLayer.width) : undefined;
      nextLayer.height = Number.isFinite(Number(nextLayer.height))
        ? Number(nextLayer.height)
        : undefined;
      nextLayer.rotationDeg = Number.isFinite(Number(nextLayer.rotationDeg))
        ? Number(nextLayer.rotationDeg)
        : undefined;
      nextLayer.sweepDeg = Number.isFinite(Number(nextLayer.sweepDeg))
        ? Number(nextLayer.sweepDeg)
        : undefined;
      nextLayer.innerRadius = Number.isFinite(Number(nextLayer.innerRadius))
        ? Number(nextLayer.innerRadius)
        : undefined;
      nextLayer.outerRadius = Number.isFinite(Number(nextLayer.outerRadius))
        ? Number(nextLayer.outerRadius)
        : undefined;
      nextLayer.points = Number.isFinite(Number(nextLayer.points))
        ? Math.max(3, Math.round(Number(nextLayer.points)))
        : undefined;
      nextLayer.tintColor =
        typeof nextLayer.tintColor === 'string' ? nextLayer.tintColor : undefined;
      applyTrailStyleDefaults(nextLayer);
    }

    return nextLayer;
  });

  return asset;
}

const state = {
  asset: normalizeAsset(createStarterAsset()),
  instance: createInstance(),
  repoRootHandle: null,
  recentFiles: [],
  pendingLayerType: 'orb',
  layoutSizes: normalizeLayoutSizes(null),
  selectedLayerId: 'trail',
  selectedLayerTrack: 'scale',
  progress: 0,
  playing: true,
  dragTarget: null,
  fileHandle: null,
  fileName: '',
  jsonDraft: '',
  jsonDirty: false,
  lastFrameTime: 0,
  curveStates: {},
  curveEditorModes: {},
  activeCurveDrag: null,
  previewBackground: createDefaultPreviewBackground(),
  previewDevice: createDefaultPreviewDevice(),
  previewViewport: createDefaultPreviewViewport(),
  collapsedPanels: createDefaultCollapsedPanels(),
  undoStack: [],
  redoStack: [],
  pendingHistorySnapshot: null,
  isRestoringHistory: false,
  activePanelResize: null,
  activeViewportPan: null,
};

state.jsonDraft = stringifyAsset(state.asset);

function clearCurveEditors() {
  state.curveStates = {};
  state.curveEditorModes = {};
  state.activeCurveDrag = null;
}

function applyLayoutSizes() {
  const handleSize =
    Number.parseFloat(getComputedStyle(ui.appShell).getPropertyValue('--resize-handle-size')) || 10;
  const workspaceWidth = ui.workspaceGrid?.getBoundingClientRect().width ?? 0;
  const sidebarWidth = ui.sidebarGrid?.getBoundingClientRect().width ?? 0;

  if (workspaceWidth > 0) {
    const previewMax = Math.max(
      PANEL_RESIZE_LIMITS.previewMin,
      workspaceWidth - handleSize - PANEL_RESIZE_LIMITS.sidebarMin,
    );
    state.layoutSizes.previewPanelWidth = clamp(
      state.layoutSizes.previewPanelWidth,
      PANEL_RESIZE_LIMITS.previewMin,
      previewMax,
    );
  }

  if (sidebarWidth > 0) {
    const layersMax = Math.max(
      PANEL_RESIZE_LIMITS.layersMin,
      sidebarWidth - handleSize - PANEL_RESIZE_LIMITS.inspectorMin,
    );
    state.layoutSizes.layersPanelWidth = clamp(
      state.layoutSizes.layersPanelWidth,
      PANEL_RESIZE_LIMITS.layersMin,
      layersMax,
    );
  }

  ui.appShell?.style.setProperty(
    '--preview-panel-width',
    `${Math.round(state.layoutSizes.previewPanelWidth)}px`,
  );
  ui.appShell?.style.setProperty(
    '--layers-panel-width',
    `${Math.round(state.layoutSizes.layersPanelWidth)}px`,
  );
}

function clampViewportOrigin(x, y, width, height) {
  return {
    x: clamp(x, Math.min(0, STAGE.width - width), Math.max(0, STAGE.width - width)),
    y: clamp(y, Math.min(0, STAGE.height - height), Math.max(0, STAGE.height - height)),
  };
}

function clampPreviewViewportCenter(centerX, centerY, width, height) {
  const origin = clampViewportOrigin(centerX - width / 2, centerY - height / 2, width, height);
  return {
    centerX: origin.x + width / 2,
    centerY: origin.y + height / 2,
  };
}

function applySafeAreaOverlay(width, height) {
  if (
    !ui.safeAreaOverlay ||
    !ui.safeAreaTop ||
    !ui.safeAreaRight ||
    !ui.safeAreaBottom ||
    !ui.safeAreaLeft ||
    !ui.safeAreaGuide
  ) {
    return;
  }

  const preset = PREVIEW_DEVICE_PRESETS[state.previewDevice.preset] ?? PREVIEW_DEVICE_PRESETS.free;
  const safeArea = preset.safeArea;
  const shouldShow =
    Boolean(safeArea) &&
    state.previewDevice.showSafeArea &&
    width > 0 &&
    height > 0 &&
    preset.width &&
    preset.height;

  ui.safeAreaOverlay.hidden = !shouldShow;
  if (!shouldShow) {
    return;
  }

  const scaleX = width / preset.width;
  const scaleY = height / preset.height;
  const top = (safeArea.top ?? 0) * scaleY;
  const right = (safeArea.right ?? 0) * scaleX;
  const bottom = (safeArea.bottom ?? 0) * scaleY;
  const left = (safeArea.left ?? 0) * scaleX;

  ui.safeAreaTop.style.cssText = `top:0;left:0;right:0;height:${top}px;`;
  ui.safeAreaRight.style.cssText = `top:0;right:0;bottom:0;width:${right}px;`;
  ui.safeAreaBottom.style.cssText = `left:0;right:0;bottom:0;height:${bottom}px;`;
  ui.safeAreaLeft.style.cssText = `top:0;left:0;bottom:0;width:${left}px;`;
  ui.safeAreaGuide.style.cssText = `top:${top}px;right:${right}px;bottom:${bottom}px;left:${left}px;`;
}

function applyStageViewportFrame() {
  const surface = ui.stageViewportSurface;
  const frame = ui.stageFrame;
  if (!surface || !frame) {
    return;
  }

  const preset = PREVIEW_DEVICE_PRESETS[state.previewDevice.preset] ?? PREVIEW_DEVICE_PRESETS.free;
  const frameBounds = frame.getBoundingClientRect();
  const padding = 18;
  const availableWidth = Math.max(0, frameBounds.width - padding * 2);
  const availableHeight = Math.max(0, frameBounds.height - padding * 2);

  let width = availableWidth;
  let height = availableHeight;

  if (preset.width && preset.height) {
    width = availableWidth;
    height = (width * preset.height) / preset.width;

    if (height > availableHeight) {
      height = availableHeight;
      width = (height * preset.width) / preset.height;
    }
  }

  surface.style.width = `${Math.max(0, width)}px`;
  surface.style.height = `${Math.max(0, height)}px`;
  surface.classList.toggle('is-device-framed', Boolean(preset.width && preset.height));
  applySafeAreaOverlay(width, height);
}

function getStageContainerAspect() {
  const bounds = ui.stageViewportSurface?.getBoundingClientRect();
  if (!bounds || bounds.width <= 0 || bounds.height <= 0) {
    return STAGE.width / STAGE.height;
  }

  return bounds.width / bounds.height;
}

function getViewportDimensionsForZoom(zoom) {
  const safeZoom = clamp(zoom, PREVIEW_VIEWPORT_LIMITS.minZoom, PREVIEW_VIEWPORT_LIMITS.maxZoom);
  const containerAspect = getStageContainerAspect();
  const stageAspect = STAGE.width / STAGE.height;

  if (containerAspect >= stageAspect) {
    const height = STAGE.height / safeZoom;
    return { width: height * containerAspect, height };
  }

  const width = STAGE.width / safeZoom;
  return { width, height: width / containerAspect };
}

function normalizePreviewViewport(rawViewport) {
  const zoom = clamp(
    Number.isFinite(Number(rawViewport?.zoom)) ? Number(rawViewport.zoom) : 1,
    PREVIEW_VIEWPORT_LIMITS.minZoom,
    PREVIEW_VIEWPORT_LIMITS.maxZoom,
  );
  const dimensions = getViewportDimensionsForZoom(zoom);
  const center = clampPreviewViewportCenter(
    Number.isFinite(Number(rawViewport?.centerX)) ? Number(rawViewport.centerX) : STAGE.width / 2,
    Number.isFinite(Number(rawViewport?.centerY)) ? Number(rawViewport.centerY) : STAGE.height / 2,
    dimensions.width,
    dimensions.height,
  );

  return {
    zoom,
    centerX: center.centerX,
    centerY: center.centerY,
  };
}

function getStageViewport() {
  const dimensions = getViewportDimensionsForZoom(state.previewViewport.zoom);
  const center = clampPreviewViewportCenter(
    state.previewViewport.centerX,
    state.previewViewport.centerY,
    dimensions.width,
    dimensions.height,
  );

  state.previewViewport.centerX = center.centerX;
  state.previewViewport.centerY = center.centerY;

  return {
    x: center.centerX - dimensions.width / 2,
    y: center.centerY - dimensions.height / 2,
    width: dimensions.width,
    height: dimensions.height,
  };
}

function renderPreviewViewportControls() {
  if (!ui.zoomResetButton) return;
  const preset = PREVIEW_DEVICE_PRESETS[state.previewDevice.preset] ?? PREVIEW_DEVICE_PRESETS.free;

  ui.zoomResetButton.textContent = `${Math.round(state.previewViewport.zoom * 100)}%`;
  if (ui.previewDeviceSelect) {
    ui.previewDeviceSelect.value = state.previewDevice.preset;
  }
  if (ui.safeAreaToggleButton) {
    ui.safeAreaToggleButton.classList.toggle('is-active', state.previewDevice.showSafeArea);
    ui.safeAreaToggleButton.disabled = !preset.safeArea;
    ui.safeAreaToggleButton.textContent = 'Safe Area';
  }
  ui.stageFrame?.classList.toggle('is-pannable', state.previewViewport.zoom > 1.001);
  ui.stageFrame?.classList.toggle('is-panning', Boolean(state.activeViewportPan));
}

function setPreviewZoom(nextZoom, focusClientX = null, focusClientY = null) {
  const zoom = clamp(nextZoom, PREVIEW_VIEWPORT_LIMITS.minZoom, PREVIEW_VIEWPORT_LIMITS.maxZoom);
  if (Math.abs(zoom - state.previewViewport.zoom) < 0.0001) {
    renderPreviewViewportControls();
    return;
  }

  const previousViewport = getStageViewport();
  const nextDimensions = getViewportDimensionsForZoom(zoom);
  let nextCenterX = state.previewViewport.centerX;
  let nextCenterY = state.previewViewport.centerY;

  if (Number.isFinite(focusClientX) && Number.isFinite(focusClientY)) {
    const bounds = ui.stageSvg?.getBoundingClientRect();
    if (bounds && bounds.width > 0 && bounds.height > 0) {
      const normalizedX = clamp01((focusClientX - bounds.left) / bounds.width);
      const normalizedY = clamp01((focusClientY - bounds.top) / bounds.height);
      const focusX = previousViewport.x + previousViewport.width * normalizedX;
      const focusY = previousViewport.y + previousViewport.height * normalizedY;
      const nextOrigin = clampViewportOrigin(
        focusX - nextDimensions.width * normalizedX,
        focusY - nextDimensions.height * normalizedY,
        nextDimensions.width,
        nextDimensions.height,
      );
      nextCenterX = nextOrigin.x + nextDimensions.width / 2;
      nextCenterY = nextOrigin.y + nextDimensions.height / 2;
    }
  }

  const nextCenter = clampPreviewViewportCenter(
    nextCenterX,
    nextCenterY,
    nextDimensions.width,
    nextDimensions.height,
  );

  state.previewViewport.zoom = zoom;
  state.previewViewport.centerX = nextCenter.centerX;
  state.previewViewport.centerY = nextCenter.centerY;
  renderPreview();
  schedulePersistEditorSession();
}

function beginPanelResize(type) {
  state.activePanelResize = { type };
  ui.appShell?.classList.add('is-resizing');
}

function updatePanelResize(clientX) {
  if (!state.activePanelResize) return;

  if (state.activePanelResize.type === 'preview') {
    const bounds = ui.workspaceGrid?.getBoundingClientRect();
    if (!bounds) return;
    const maxWidth =
      bounds.width - Number.parseFloat(getComputedStyle(ui.appShell).getPropertyValue('--resize-handle-size')) - PANEL_RESIZE_LIMITS.sidebarMin;
    state.layoutSizes.previewPanelWidth = clamp(
      clientX - bounds.left,
      PANEL_RESIZE_LIMITS.previewMin,
      Math.max(PANEL_RESIZE_LIMITS.previewMin, maxWidth),
    );
    applyLayoutSizes();
    renderPreview();
    schedulePersistEditorSession();
    return;
  }

  if (state.activePanelResize.type === 'layers') {
    const bounds = ui.sidebarGrid?.getBoundingClientRect();
    if (!bounds) return;
    const maxWidth =
      bounds.width - Number.parseFloat(getComputedStyle(ui.appShell).getPropertyValue('--resize-handle-size')) - PANEL_RESIZE_LIMITS.inspectorMin;
    state.layoutSizes.layersPanelWidth = clamp(
      clientX - bounds.left,
      PANEL_RESIZE_LIMITS.layersMin,
      Math.max(PANEL_RESIZE_LIMITS.layersMin, maxWidth),
    );
    applyLayoutSizes();
    renderPreview();
    schedulePersistEditorSession();
  }
}

function endPanelResize() {
  if (!state.activePanelResize) return;
  state.activePanelResize = null;
  ui.appShell?.classList.remove('is-resizing');
}

function normalizePreviewBackground(rawBackground) {
  const presetId =
    typeof rawBackground?.preset === 'string' && PREVIEW_BACKDROPS[rawBackground.preset]
      ? rawBackground.preset
      : 'ember';
  const preset = PREVIEW_BACKDROPS[presetId];

  return {
    preset: presetId,
    top: typeof rawBackground?.top === 'string' ? rawBackground.top : preset.top,
    bottom: typeof rawBackground?.bottom === 'string' ? rawBackground.bottom : preset.bottom,
    glow: typeof rawBackground?.glow === 'string' ? rawBackground.glow : preset.glow,
    grid: typeof rawBackground?.grid === 'string' ? rawBackground.grid : preset.grid,
    ground: typeof rawBackground?.ground === 'string' ? rawBackground.ground : preset.ground,
  };
}

function normalizePreviewDevice(rawDevice) {
  return {
    preset:
      typeof rawDevice?.preset === 'string' && PREVIEW_DEVICE_PRESETS[rawDevice.preset]
        ? rawDevice.preset
        : 'free',
    showSafeArea:
      typeof rawDevice?.showSafeArea === 'boolean'
        ? rawDevice.showSafeArea
        : createDefaultPreviewDevice().showSafeArea,
  };
}

function normalizeInstance(rawInstance) {
  const defaults = createInstance();
  return {
    x: Number.isFinite(Number(rawInstance?.x)) ? Number(rawInstance.x) : defaults.x,
    y: Number.isFinite(Number(rawInstance?.y)) ? Number(rawInstance.y) : defaults.y,
    targetX: Number.isFinite(Number(rawInstance?.targetX))
      ? Number(rawInstance.targetX)
      : defaults.targetX,
    targetY: Number.isFinite(Number(rawInstance?.targetY))
      ? Number(rawInstance.targetY)
      : defaults.targetY,
  };
}

function sanitizeRecentFiles(rawRecentFiles) {
  if (!Array.isArray(rawRecentFiles)) {
    return [];
  }

  return rawRecentFiles
    .map((item) => ({
      id: typeof item?.id === 'string' ? item.id : '',
      name: typeof item?.name === 'string' ? item.name : 'Unknown File',
      lastOpenedAt: Number.isFinite(Number(item?.lastOpenedAt)) ? Number(item.lastOpenedAt) : 0,
    }))
    .filter((item) => item.id)
    .sort((left, right) => right.lastOpenedAt - left.lastOpenedAt)
    .slice(0, RECENT_FILES_LIMIT);
}

function normalizeLayoutSizes(rawLayoutSizes) {
  return {
    previewPanelWidth: Number.isFinite(Number(rawLayoutSizes?.previewPanelWidth))
      ? Number(rawLayoutSizes.previewPanelWidth)
      : 780,
    layersPanelWidth: Number.isFinite(Number(rawLayoutSizes?.layersPanelWidth))
      ? Number(rawLayoutSizes.layersPanelWidth)
      : 420,
  };
}

function normalizeCurveStates(rawCurveStates) {
  if (!rawCurveStates || typeof rawCurveStates !== 'object') {
    return {};
  }

  return Object.fromEntries(
    Object.entries(rawCurveStates).map(([key, curveState]) => [
      key,
      refreshCurveState({
        points: Array.isArray(curveState?.points) ? cloneData(curveState.points) : [],
        baked: Array.isArray(curveState?.baked) ? cloneData(curveState.baked) : [],
        modified: Boolean(curveState?.modified),
        rangeMin: curveState?.rangeMin,
        rangeMax: curveState?.rangeMax,
      }),
    ]),
  );
}

function buildPersistedEditorSession() {
  return {
    asset: cloneData(state.asset),
    instance: cloneData(state.instance),
    recentFiles: cloneData(state.recentFiles),
    pendingLayerType: state.pendingLayerType,
    layoutSizes: cloneData(state.layoutSizes),
    selectedLayerId: state.selectedLayerId,
    selectedLayerTrack: state.selectedLayerTrack,
    curveStates: cloneData(state.curveStates),
    curveEditorModes: cloneData(state.curveEditorModes),
    previewBackground: cloneData(state.previewBackground),
    previewDevice: cloneData(state.previewDevice),
    previewViewport: cloneData(state.previewViewport),
    collapsedPanels: cloneData(state.collapsedPanels),
    fileName: state.fileName,
    jsonDraft: state.jsonDraft,
    jsonDirty: state.jsonDirty,
  };
}

let persistEditorSessionTimer = null;
let persistEditorSessionFilePromise = Promise.resolve();

function persistEditorSessionNow() {
  try {
    window.localStorage.setItem(
      EDITOR_SESSION_STORAGE_KEY,
      JSON.stringify(buildPersistedEditorSession()),
    );
  } catch (error) {
    console.warn('Could not persist VFX editor session.', error);
  }

  void persistEditorSessionToFileIfPossible();
}

function persistEditorSessionToFileIfPossible() {
  if (!state.repoRootHandle) {
    return Promise.resolve(false);
  }

  const payload = `${JSON.stringify(buildPersistedEditorSession(), null, 2)}\n`;

  persistEditorSessionFilePromise = persistEditorSessionFilePromise
    .catch(() => {})
    .then(async () => {
      const editorDirHandle = await getDirectoryHandle(state.repoRootHandle, REPO_EDITOR_SEGMENTS);
      await writeTextFile(editorDirHandle, EDITOR_SESSION_FILE_NAME, payload);
      return true;
    })
    .catch((error) => {
      console.warn('Could not persist VFX editor session file.', error);
      return false;
    });

  return persistEditorSessionFilePromise;
}

function schedulePersistEditorSession() {
  if (persistEditorSessionTimer != null) {
    window.clearTimeout(persistEditorSessionTimer);
  }

  persistEditorSessionTimer = window.setTimeout(() => {
    persistEditorSessionTimer = null;
    persistEditorSessionNow();
  }, 120);
}

function restorePersistedEditorSession() {
  try {
    const rawSession = window.localStorage.getItem(EDITOR_SESSION_STORAGE_KEY);
    if (!rawSession) return false;

    const persisted = JSON.parse(rawSession);
    return applyPersistedEditorSession(persisted);
  } catch (error) {
    console.warn('Could not restore VFX editor session.', error);
    return false;
  }
}

async function loadPersistedEditorSessionFromFile() {
  try {
    const response = await fetch(EDITOR_SESSION_FETCH_PATH, { cache: 'no-store' });
    if (!response.ok) {
      return null;
    }

    const persisted = await response.json();
    return persisted && typeof persisted === 'object' ? persisted : null;
  } catch (error) {
    return null;
  }
}

function applyPersistedEditorSession(persisted) {
  if (!persisted || typeof persisted !== 'object') {
    return false;
  }

  state.asset = normalizeAsset(persisted.asset ?? createStarterAsset());
  state.instance = normalizeInstance(persisted.instance);
  state.recentFiles = sanitizeRecentFiles(persisted.recentFiles);
  state.pendingLayerType =
    typeof persisted.pendingLayerType === 'string' &&
    LAYER_TYPE_OPTIONS.some((option) => option.value === persisted.pendingLayerType)
      ? persisted.pendingLayerType
      : 'orb';
  state.layoutSizes = normalizeLayoutSizes(persisted.layoutSizes);
  state.selectedLayerId =
    typeof persisted.selectedLayerId === 'string' ? persisted.selectedLayerId : 'trail';
  state.selectedLayerTrack =
    typeof persisted.selectedLayerTrack === 'string' ? persisted.selectedLayerTrack : 'scale';
  state.curveStates = normalizeCurveStates(persisted.curveStates);
  state.curveEditorModes =
    persisted.curveEditorModes && typeof persisted.curveEditorModes === 'object'
      ? cloneData(persisted.curveEditorModes)
      : {};
  state.previewBackground = normalizePreviewBackground(persisted.previewBackground);
  state.previewDevice = normalizePreviewDevice(persisted.previewDevice);
  state.previewViewport = normalizePreviewViewport(persisted.previewViewport);
  state.collapsedPanels = {
    ...createDefaultCollapsedPanels(),
    ...(persisted.collapsedPanels ?? {}),
  };
  state.fileHandle = null;
  state.fileName = typeof persisted.fileName === 'string' ? persisted.fileName : '';
  state.jsonDraft =
    typeof persisted.jsonDraft === 'string'
      ? persisted.jsonDraft
      : stringifyAsset(buildExportAsset());
  state.jsonDirty = Boolean(persisted.jsonDirty && typeof persisted.jsonDraft === 'string');
  state.progress = 0;
  state.playing = true;
  state.lastFrameTime = 0;
  state.repoRootHandle = null;
  state.dragTarget = null;
  state.activeCurveDrag = null;
  state.activePanelResize = null;
  clearHistory();
  ensureSelection();
  return true;
}

async function restorePersistedEditorSessionFromSources() {
  const fileSession = await loadPersistedEditorSessionFromFile();
  if (fileSession) {
    try {
      window.localStorage.setItem(EDITOR_SESSION_STORAGE_KEY, JSON.stringify(fileSession));
    } catch (error) {
      console.warn('Could not mirror file session into local storage.', error);
    }
    return applyPersistedEditorSession(fileSession) ? 'file' : null;
  }

  return restorePersistedEditorSession() ? 'browser' : null;
}

async function restoreLinkedRepoRootHandle() {
  try {
    const handle = await readStoredHandle(REPO_ROOT_HANDLE_KEY);
    if (!handle) {
      return false;
    }

    const hasPermission = await ensureHandlePermission(handle, true);
    if (!hasPermission) {
      return false;
    }

    const isValidRoot = await validateRepoRootHandle(handle);
    if (!isValidRoot) {
      await deleteStoredHandle(REPO_ROOT_HANDLE_KEY);
      return false;
    }

    state.repoRootHandle = handle;
    return true;
  } catch (error) {
    console.warn('Could not restore the linked repo root.', error);
    return false;
  }
}

async function linkRepoRoot() {
  try {
    if (!('showDirectoryPicker' in window)) {
      setSaveStatus('Link Repo Root requires Chrome, Arc, or Edge with File System Access support.', 'error');
      return;
    }

    setSaveStatus('Choose the repo root folder in the browser picker.', 'info');
    const rootHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
    const isValidRoot = await validateRepoRootHandle(rootHandle);
    if (!isValidRoot) {
      setSaveStatus('Choose the repo root folder: /Users/xavierlaborie/Documents/questing-together', 'error');
      return;
    }

    state.repoRootHandle = rootHandle;
    await writeStoredHandle(REPO_ROOT_HANDLE_KEY, rootHandle);
    await persistEditorSessionToFileIfPossible();
    renderToolbarMenus();
    setSaveStatus('Linked repo root. Editor session will now autosave to tools/vfx-editor/editor-session.json.', 'success');
  } catch (error) {
    if (error?.name === 'AbortError') return;
    setSaveStatus(`Could not link repo root: ${error.message}`, 'error');
  }
}

function isPanelCollapsed(panelKey) {
  return Boolean(state.collapsedPanels[panelKey]);
}

function togglePanelCollapse(panelKey) {
  state.collapsedPanels[panelKey] = !isPanelCollapsed(panelKey);
}

function renderCollapsibleSection({
  panelKey,
  kicker,
  title,
  note = '',
  body,
  className = 'subpanel',
}) {
  const collapsed = isPanelCollapsed(panelKey);
  return `
    <div class="${className} ${collapsed ? 'is-collapsed' : ''}">
      <div class="subpanel-heading">
        <div class="subpanel-copy">
          <p class="panel-kicker">${escapeHtml(kicker)}</p>
          <h3>${escapeHtml(title)}</h3>
          ${note ? `<div class="subpanel-note">${note}</div>` : ''}
        </div>
        <div class="collapse-actions">
          <button
            class="stack-button stack-button-compact icon-toggle-button"
            data-action="toggle-collapse"
            data-panel-key="${panelKey}"
            aria-label="${collapsed ? 'Expand section' : 'Collapse section'}"
            title="${collapsed ? 'Expand section' : 'Collapse section'}"
          >
            ${collapsed ? '▸' : '▾'}
          </button>
        </div>
      </div>
      ${collapsed ? '' : body}
    </div>
  `;
}

function renderStaticPanelState() {
  const jsonPanel = ui.panelJson;
  const jsonBody = document.getElementById('jsonPanelBody');
  const jsonToggleButton = document.getElementById('jsonCollapseButton');
  if (!jsonPanel || !jsonBody || !jsonToggleButton) return;

  const collapsed = isPanelCollapsed('jsonPanel');
  jsonPanel.classList.toggle('is-hidden', collapsed);
  ui.appShell?.classList.toggle('is-json-hidden', collapsed);
  jsonBody.hidden = collapsed;
  jsonToggleButton.textContent = collapsed ? '▸' : '▾';
  jsonToggleButton.setAttribute('aria-label', collapsed ? 'Show JSON panel' : 'Hide JSON panel');
  jsonToggleButton.setAttribute('title', collapsed ? 'Show JSON panel' : 'Hide JSON panel');
  renderToolbarMenus();
  renderPreview();
  schedulePersistEditorSession();
}

function createHistorySnapshot() {
  return {
    asset: cloneData(state.asset),
    instance: cloneData(state.instance),
    selectedLayerId: state.selectedLayerId,
    selectedLayerTrack: state.selectedLayerTrack,
    curveStates: cloneData(state.curveStates),
    curveEditorModes: cloneData(state.curveEditorModes),
    previewBackground: cloneData(state.previewBackground),
  };
}

function getHistorySignature(snapshot) {
  return JSON.stringify(snapshot);
}

function clearHistory() {
  state.undoStack = [];
  state.redoStack = [];
  state.pendingHistorySnapshot = null;
}

function pushUndoCheckpoint(snapshot = createHistorySnapshot()) {
  if (state.isRestoringHistory) return;

  const signature = getHistorySignature(snapshot);
  const previous = state.undoStack[state.undoStack.length - 1];

  if (previous && getHistorySignature(previous) === signature) {
    return;
  }

  state.undoStack.push(snapshot);
  if (state.undoStack.length > 200) {
    state.undoStack.shift();
  }
  state.redoStack = [];
}

function beginHistoryGesture() {
  if (state.pendingHistorySnapshot) return;
  state.pendingHistorySnapshot = createHistorySnapshot();
}

function endHistoryGesture() {
  if (!state.pendingHistorySnapshot) return;

  const before = state.pendingHistorySnapshot;
  state.pendingHistorySnapshot = null;

  if (getHistorySignature(before) !== getHistorySignature(createHistorySnapshot())) {
    pushUndoCheckpoint(before);
  }
}

function restoreHistorySnapshot(snapshot) {
  state.isRestoringHistory = true;
  state.asset = normalizeAsset(snapshot.asset);
  state.instance = cloneData(snapshot.instance);
  state.selectedLayerId = snapshot.selectedLayerId;
  state.selectedLayerTrack = snapshot.selectedLayerTrack;
  state.curveStates = cloneData(snapshot.curveStates ?? {});
  state.curveEditorModes = cloneData(snapshot.curveEditorModes ?? {});
  state.previewBackground = normalizePreviewBackground(snapshot.previewBackground);
  ensureSelection();
  syncJsonFromAsset();
  renderPanels();
  renderPreview();
  state.isRestoringHistory = false;
}

function undoHistory() {
  if (state.pendingHistorySnapshot) {
    endHistoryGesture();
  }

  const snapshot = state.undoStack.pop();
  if (!snapshot) {
    setSaveStatus('Nothing to undo.', 'info');
    return;
  }

  state.redoStack.push(createHistorySnapshot());
  restoreHistorySnapshot(snapshot);
  setSaveStatus('Undo applied.', 'success');
}

function redoHistory() {
  const snapshot = state.redoStack.pop();
  if (!snapshot) {
    setSaveStatus('Nothing to redo.', 'info');
    return;
  }

  state.undoStack.push(createHistorySnapshot());
  restoreHistorySnapshot(snapshot);
  setSaveStatus('Redo applied.', 'success');
}

function getCurveDefaultValue(trackName) {
  return ['scale', 'alpha'].includes(trackName) ? 1 : 0;
}

function getCurveStateKey(scope, trackName, layerId = state.selectedLayerId) {
  return scope === 'motion' ? `motion:${trackName}` : `layer:${layerId}:${trackName}`;
}

function parseCurveStateKey(key) {
  const [scope, identifier, trackName] = key.split(':');

  if (scope === 'motion') {
    return { scope, trackName: identifier, layerId: null };
  }

  return { scope, layerId: identifier, trackName };
}

function getRawTrack(scope, trackName, layerId = state.selectedLayerId) {
  if (scope === 'motion') {
    return cloneData(state.asset.motion?.tracks?.[trackName] ?? []);
  }

  const layer = state.asset.layers.find((item) => item.id === layerId);
  return cloneData(layer?.tracks?.[trackName] ?? []);
}

function sanitizeCurvePoints(points) {
  const sorted = points
    .map((point) => ({
      at: Number.isFinite(Number(point.at)) ? Number(point.at) : 0,
      value: Number.isFinite(Number(point.value)) ? Number(point.value) : 0,
      inX: Number.isFinite(Number(point.inX)) ? Number(point.inX) : Number(point.at),
      inY: Number.isFinite(Number(point.inY)) ? Number(point.inY) : Number(point.value),
      outX: Number.isFinite(Number(point.outX)) ? Number(point.outX) : Number(point.at),
      outY: Number.isFinite(Number(point.outY)) ? Number(point.outY) : Number(point.value),
    }))
    .sort((left, right) => left.at - right.at);

  if (sorted.length === 0) {
    return [];
  }

  for (let index = 0; index < sorted.length; index += 1) {
    const point = sorted[index];
    const previous = sorted[index - 1];
    const next = sorted[index + 1];
    const minAt = previous ? previous.at + 0.001 : 0;
    const maxAt = next ? next.at - 0.001 : 1;

    point.at = clamp(point.at, minAt, maxAt >= minAt ? maxAt : minAt);

    if (previous) {
      point.inX = clamp(point.inX, previous.at, point.at);
    } else {
      point.inX = point.at;
      point.inY = point.value;
    }

    if (next) {
      point.outX = clamp(point.outX, point.at, next.at);
    } else {
      point.outX = point.at;
      point.outY = point.value;
    }
  }

  return sorted;
}

function sanitizeCurveRange(rangeMin, rangeMax) {
  const min = Number.isFinite(Number(rangeMin)) ? Number(rangeMin) : -1;
  const max = Number.isFinite(Number(rangeMax)) ? Number(rangeMax) : 1;

  if (min === max) {
    return {
      min: min - 0.001,
      max: max + 0.001,
    };
  }

  return min < max ? { min, max } : { min: max, max: min };
}

function clampCurvePointValues(points, range) {
  for (const point of points) {
    point.value = clamp(point.value, range.min, range.max);
    point.inY = clamp(point.inY, range.min, range.max);
    point.outY = clamp(point.outY, range.min, range.max);
  }

  return points;
}

function cubicBezier(p0, p1, p2, p3, t) {
  const oneMinusT = 1 - t;
  return (
    oneMinusT ** 3 * p0 +
    3 * oneMinusT ** 2 * t * p1 +
    3 * oneMinusT * t ** 2 * p2 +
    t ** 3 * p3
  );
}

function buildCurveStateFromTrack(track, trackName) {
  const normalizedTrack = normalizeTrack(track);
  const points =
    normalizedTrack.length >= 2
      ? normalizedTrack
      : [
          { at: 0, value: normalizedTrack[0]?.value ?? getCurveDefaultValue(trackName) },
          { at: 1, value: normalizedTrack[0]?.value ?? getCurveDefaultValue(trackName) },
        ];

  const curvePoints = points.map((point, index) => {
    const previous = points[index - 1];
    const next = points[index + 1];
    const previousDistance = previous ? (point.at - previous.at) / 3 : 0;
    const nextDistance = next ? (next.at - point.at) / 3 : 0;
    const slope =
      previous && next
        ? (next.value - previous.value) / Math.max(0.001, next.at - previous.at)
        : next
          ? (next.value - point.value) / Math.max(0.001, next.at - point.at)
          : previous
            ? (point.value - previous.value) / Math.max(0.001, point.at - previous.at)
            : 0;

    return {
      at: point.at,
      value: point.value,
      inX: previous ? point.at - previousDistance : point.at,
      inY: previous ? point.value - slope * previousDistance : point.value,
      outX: next ? point.at + nextDistance : point.at,
      outY: next ? point.value + slope * nextDistance : point.value,
    };
  });

  const autoRange = getAutoCurveValueRangeFromPoints(curvePoints);

  return {
    points: clampCurvePointValues(sanitizeCurvePoints(curvePoints), autoRange),
    baked: [],
    modified: false,
    rangeMin: autoRange.min,
    rangeMax: autoRange.max,
  };
}

function bakeCurveState(curveState) {
  const range = sanitizeCurveRange(curveState.rangeMin, curveState.rangeMax);
  const points = clampCurvePointValues(sanitizeCurvePoints(curveState.points), range);

  if (points.length === 0) {
    return [];
  }

  if (points.length === 1) {
    return [{ at: clamp01(points[0].at), value: points[0].value }];
  }

  const samples = [];

  for (let index = 0; index < points.length - 1; index += 1) {
    const start = points[index];
    const end = points[index + 1];

    for (let sampleIndex = 0; sampleIndex <= CURVE_EDITOR.bakeSamplesPerSegment; sampleIndex += 1) {
      if (index > 0 && sampleIndex === 0) {
        continue;
      }

      const t = sampleIndex / CURVE_EDITOR.bakeSamplesPerSegment;
      samples.push({
        at: clamp01(cubicBezier(start.at, start.outX, end.inX, end.at, t)),
        value: clamp(
          cubicBezier(start.value, start.outY, end.inY, end.value, t),
          range.min,
          range.max,
        ),
      });
    }
  }

  samples.sort((left, right) => left.at - right.at);

  const baked = [];
  for (const sample of samples) {
    const previous = baked[baked.length - 1];
    if (!previous || Math.abs(previous.at - sample.at) > 0.0005) {
      baked.push(sample);
    } else {
      previous.at = sample.at;
      previous.value = sample.value;
    }
  }

  baked[0] = {
    at: clamp01(points[0].at),
    value: clamp(points[0].value, range.min, range.max),
  };
  baked[baked.length - 1] = {
    at: clamp01(points[points.length - 1].at),
    value: clamp(points[points.length - 1].value, range.min, range.max),
  };

  return baked;
}

function refreshCurveState(curveState) {
  const range = sanitizeCurveRange(curveState.rangeMin, curveState.rangeMax);
  curveState.rangeMin = range.min;
  curveState.rangeMax = range.max;
  curveState.points = clampCurvePointValues(sanitizeCurvePoints(curveState.points), range);
  curveState.baked = bakeCurveState(curveState);
  return curveState;
}

function ensureCurveState(scope, trackName, layerId = state.selectedLayerId) {
  const key = getCurveStateKey(scope, trackName, layerId);

  if (!state.curveStates[key]) {
    state.curveStates[key] = refreshCurveState(
      buildCurveStateFromTrack(getRawTrack(scope, trackName, layerId), trackName),
    );
  }

  return state.curveStates[key];
}

function hasCurveState(scope, trackName, layerId = state.selectedLayerId) {
  return Boolean(state.curveStates[getCurveStateKey(scope, trackName, layerId)]);
}

function getCurveEditorMode(scope, trackName, layerId = state.selectedLayerId) {
  return state.curveEditorModes[getCurveStateKey(scope, trackName, layerId)] ?? 'list';
}

function setCurveEditorMode(scope, trackName, mode, layerId = state.selectedLayerId) {
  if (mode === 'curve') {
    ensureCurveState(scope, trackName, layerId);
  }

  state.curveEditorModes[getCurveStateKey(scope, trackName, layerId)] = mode;
}

function applyCurvePreset(scope, trackName, presetId) {
  const preset = CURVE_PRESETS[presetId];
  if (!preset) return;

  pushUndoCheckpoint();

  const curveState = ensureCurveState(scope, trackName);
  const range = getCurveValueRange(curveState);
  const existingPoints = curveState.points;
  const startPoint = existingPoints[0] ?? { at: 0, value: getCurveDefaultValue(trackName) };
  const endPoint =
    existingPoints[existingPoints.length - 1] ?? { at: 1, value: getCurveDefaultValue(trackName) };
  const startAt = startPoint.at;
  const endAt = endPoint.at > startAt ? endPoint.at : startAt + 0.001;
  const startValue = clamp(startPoint.value, range.min, range.max);
  const endValue = clamp(endPoint.value, range.min, range.max);

  curveState.points = [
    {
      at: startAt,
      value: startValue,
      inX: startAt,
      inY: startValue,
      outX: lerp(startAt, endAt, preset.x1),
      outY: clamp(lerp(startValue, endValue, preset.y1), range.min, range.max),
    },
    {
      at: endAt,
      value: endValue,
      inX: lerp(startAt, endAt, preset.x2),
      inY: clamp(lerp(startValue, endValue, preset.y2), range.min, range.max),
      outX: endAt,
      outY: endValue,
    },
  ];

  curveState.modified = true;
  refreshCurveState(curveState);
  setCurveEditorMode(scope, trackName, 'curve');
  syncJsonFromAsset();
  renderPreview();
  rerenderCurveOwner(scope);
}

function getTrackEditorPoints(scope, trackName, layerId = state.selectedLayerId) {
  if (hasCurveState(scope, trackName, layerId)) {
    return cloneData(
      state.curveStates[getCurveStateKey(scope, trackName, layerId)].points.map((point) => ({
        at: point.at,
        value: point.value,
      })),
    );
  }

  return getRawTrack(scope, trackName, layerId);
}

function getTrackForSampling(scope, trackName, layerId = state.selectedLayerId) {
  if (hasCurveState(scope, trackName, layerId)) {
    const curveState = state.curveStates[getCurveStateKey(scope, trackName, layerId)];
    if (curveState.modified) {
      return curveState.baked;
    }
  }

  return scope === 'motion'
    ? state.asset.motion?.tracks?.[trackName]
    : state.asset.layers.find((layer) => layer.id === layerId)?.tracks?.[trackName];
}

function buildExportAsset() {
  const exported = cloneData(state.asset);

  for (const [key, curveState] of Object.entries(state.curveStates)) {
    if (!curveState.modified) {
      continue;
    }

    const bakedTrack = bakeCurveState(curveState);
    const parsed = parseCurveStateKey(key);

    if (parsed.scope === 'motion') {
      ensureMotion(exported);
      exported.motion.tracks ??= {};

      if (bakedTrack.length > 0) {
        exported.motion.tracks[parsed.trackName] = bakedTrack;
      } else {
        delete exported.motion.tracks[parsed.trackName];
      }

      continue;
    }

    const layer = exported.layers.find((item) => item.id === parsed.layerId);
    if (!layer) continue;

    layer.tracks ??= {};

    if (bakedTrack.length > 0) {
      layer.tracks[parsed.trackName] = bakedTrack;
    } else {
      delete layer.tracks[parsed.trackName];
    }
  }

  return normalizeAsset(exported);
}

function getAutoCurveValueRangeFromPoints(points) {
  const values = points.flatMap((point) => [point.value, point.inY, point.outY]);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);

  if (minValue === maxValue) {
    const pad = Math.max(0.5, Math.abs(minValue) * 0.2 || 0.5);
    return { min: minValue - pad, max: maxValue + pad };
  }

  const padding = (maxValue - minValue) * 0.16;
  return {
    min: minValue - padding,
    max: maxValue + padding,
  };
}

function getCurveValueRange(curveState) {
  if (
    Number.isFinite(Number(curveState.rangeMin)) &&
    Number.isFinite(Number(curveState.rangeMax)) &&
    Number(curveState.rangeMin) < Number(curveState.rangeMax)
  ) {
    return {
      min: Number(curveState.rangeMin),
      max: Number(curveState.rangeMax),
    };
  }

  return getAutoCurveValueRangeFromPoints(curveState.points);
}

function curvePointToScreen(at, value, range) {
  const usableWidth = CURVE_EDITOR.width - CURVE_EDITOR.padX * 2;
  const usableHeight = CURVE_EDITOR.height - CURVE_EDITOR.padY * 2;
  return {
    x: CURVE_EDITOR.padX + clamp01(at) * usableWidth,
    y:
      CURVE_EDITOR.padY +
      (1 - (value - range.min) / Math.max(0.001, range.max - range.min)) * usableHeight,
  };
}

function screenToCurvePoint(localX, localY, range) {
  const usableWidth = CURVE_EDITOR.width - CURVE_EDITOR.padX * 2;
  const usableHeight = CURVE_EDITOR.height - CURVE_EDITOR.padY * 2;
  return {
    at: clamp01((localX - CURVE_EDITOR.padX) / usableWidth),
    value:
      range.min +
      (1 - clamp01((localY - CURVE_EDITOR.padY) / usableHeight)) *
        Math.max(0.001, range.max - range.min),
  };
}

function getSelectedLayerIndex() {
  return state.asset.layers.findIndex((layer) => layer.id === state.selectedLayerId);
}

function getSelectedLayer() {
  return state.asset.layers.find((layer) => layer.id === state.selectedLayerId) ?? null;
}

function ensureSelection() {
  const selectedLayer = getSelectedLayer();
  if (!selectedLayer && state.asset.layers.length > 0) {
    state.selectedLayerId = state.asset.layers[0].id;
  }

  const activeLayer = getSelectedLayer();
  if (!activeLayer) {
    state.selectedLayerTrack = 'scale';
    return;
  }

  const validTracks = TRACKS_BY_LAYER_TYPE[activeLayer.type];
  if (!validTracks.includes(state.selectedLayerTrack)) {
    state.selectedLayerTrack = validTracks[0];
  }
}

function setSaveStatus(message, type = 'info') {
  ui.saveStatusLabel.textContent = message;
  ui.saveStatusLabel.className =
    type === 'error' ? 'error-text' : type === 'success' ? 'success-text' : '';
}

function setJsonStatus(message, type = 'info') {
  ui.jsonStatusLabel.textContent = message;
  ui.jsonStatusLabel.className =
    type === 'error' ? 'error-text' : type === 'success' ? 'success-text' : '';
}

function syncJsonFromAsset() {
  state.jsonDraft = stringifyAsset(buildExportAsset());
  state.jsonDirty = false;
  ui.jsonEditor.value = state.jsonDraft;
  setJsonStatus('JSON is synced with the visual editor.');
  schedulePersistEditorSession();
}

function commitAsset(nextAsset, options = {}) {
  state.asset = normalizeAsset(nextAsset);
  ensureSelection();

  if (options.resetProgress) {
    state.progress = 0;
  }

  if (options.syncJson !== false) {
    syncJsonFromAsset();
  }

  ui.effectTitleLabel.textContent = `${state.asset.label} Preview`;
  renderPreview();

  if (options.renderPanels) {
    renderPanels();
  }

  schedulePersistEditorSession();
}

function sampleTrack(track, progress, fallback = 0) {
  if (!track || track.length === 0) return fallback;

  const t = clamp01(progress);

  if (t <= track[0].at) {
    return track[0].value;
  }

  const lastKey = track[track.length - 1];
  if (t >= lastKey.at) {
    return lastKey.value;
  }

  for (let index = 1; index < track.length; index += 1) {
    const previous = track[index - 1];
    const current = track[index];

    if (t > current.at) {
      continue;
    }

    const span = current.at - previous.at;
    if (span <= 0) return current.value;

    return lerp(previous.value, current.value, (t - previous.at) / span);
  }

  return lastKey.value;
}

function sampleLayerTrack(layer, name, progress, fallback = 0) {
  return sampleTrack(getTrackForSampling('layer', name, layer.id), progress, fallback);
}

function motionUsesTarget(mode) {
  return mode === 'line' || mode === 'path';
}

function sampleMotionPosition(asset, instance, progress) {
  if (motionUsesTarget(asset.motion?.mode) && instance.targetX != null && instance.targetY != null) {
    const travel = sampleTrack(getTrackForSampling('motion', 'travel'), progress, progress);
    const base = {
      x: lerp(instance.x, instance.targetX, travel),
      y: lerp(instance.y, instance.targetY, travel),
    };

    if (asset.motion?.mode === 'path') {
      return {
        x: base.x + sampleTrack(getTrackForSampling('motion', 'x'), progress, 0),
        y: base.y + sampleTrack(getTrackForSampling('motion', 'y'), progress, 0),
      };
    }

    return base;
  }

  if (asset.motion?.mode === 'path') {
    return {
      x: instance.x + sampleTrack(getTrackForSampling('motion', 'x'), progress, 0),
      y: instance.y + sampleTrack(getTrackForSampling('motion', 'y'), progress, 0),
    };
  }

  return {
    x: instance.x,
    y: instance.y,
  };
}

function renderMotionGuide() {
  const motionMode = state.asset.motion?.mode ?? 'fixed';

  if (!motionUsesTarget(motionMode)) {
    return '';
  }

  const targetX = state.instance.targetX ?? state.instance.x;
  const targetY = state.instance.targetY ?? state.instance.y;

  if (motionMode === 'line') {
    return `
      <line
        x1="${state.instance.x}"
        y1="${state.instance.y}"
        x2="${targetX}"
        y2="${targetY}"
        stroke="rgba(255,255,255,0.14)"
        stroke-dasharray="10 8"
      ></line>
    `;
  }

  const samples = Array.from({ length: 25 }, (_, index) => {
    const t = index / 24;
    const point = sampleMotionPosition(state.asset, state.instance, t);
    return `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`;
  }).join(' ');

  return `
    <path
      d="${samples}"
      fill="none"
      stroke="rgba(255,255,255,0.18)"
      stroke-width="2"
      stroke-dasharray="10 8"
      stroke-linecap="round"
      stroke-linejoin="round"
    ></path>
  `;
}

function renderOrb(layer, progress) {
  const base = sampleMotionPosition(state.asset, state.instance, progress);
  const x = base.x + sampleLayerTrack(layer, 'x', progress, 0);
  const y = base.y + sampleLayerTrack(layer, 'y', progress, 0);
  const scale = sampleLayerTrack(layer, 'scale', progress, 1);
  const alpha = sampleLayerTrack(layer, 'alpha', progress, 1);
  const glow = sampleLayerTrack(layer, 'glow', progress, 0);
  const glowRadius = layer.radius * scale * (layer.glowScale ?? 2.3) * (1 + glow * 0.45);
  const coreRadius = Math.max(1, layer.radius * scale);
  const glowOpacity = Math.max(0, alpha * (0.18 + glow * 0.35));

  return `
    <circle cx="${x}" cy="${y}" r="${glowRadius}" fill="${escapeHtml(layer.glowColor ?? layer.color)}" opacity="${glowOpacity}"></circle>
    <circle cx="${x}" cy="${y}" r="${coreRadius}" fill="${escapeHtml(layer.color)}" opacity="${Math.max(0, alpha)}"></circle>
  `;
}

function renderRing(layer, progress) {
  const base = sampleMotionPosition(state.asset, state.instance, progress);
  const x = base.x + sampleLayerTrack(layer, 'x', progress, 0);
  const y = base.y + sampleLayerTrack(layer, 'y', progress, 0);
  const scale = sampleLayerTrack(layer, 'scale', progress, 1);
  const alpha = sampleLayerTrack(layer, 'alpha', progress, 1);

  return `
    <circle
      cx="${x}"
      cy="${y}"
      r="${Math.max(0.5, layer.radius * scale)}"
      fill="transparent"
      stroke="${escapeHtml(layer.color)}"
      stroke-width="${Math.max(1, layer.thickness * scale)}"
      opacity="${Math.max(0, alpha)}"
    ></circle>
  `;
}

function renderStreak(layer, progress) {
  const base = sampleMotionPosition(state.asset, state.instance, progress);
  const x = base.x + sampleLayerTrack(layer, 'x', progress, 0);
  const y = base.y + sampleLayerTrack(layer, 'y', progress, 0);
  const scale = sampleLayerTrack(layer, 'scale', progress, 1);
  const alpha = sampleLayerTrack(layer, 'alpha', progress, 1);
  const width = Math.max(1, layer.width * scale);
  const height = Math.max(1, layer.height * scale);

  return `
    <rect
      x="${x - width / 2}"
      y="${y - height / 2}"
      width="${width}"
      height="${height}"
      rx="${height / 2}"
      ry="${height / 2}"
      fill="${escapeHtml(layer.color)}"
      opacity="${Math.max(0, alpha)}"
      transform="rotate(${layer.rotationDeg ?? 0} ${x} ${y})"
    ></rect>
  `;
}

function renderDiamond(layer, progress) {
  const base = sampleMotionPosition(state.asset, state.instance, progress);
  const cx = base.x + sampleLayerTrack(layer, 'x', progress, 0);
  const cy = base.y + sampleLayerTrack(layer, 'y', progress, 0);
  const scale = sampleLayerTrack(layer, 'scale', progress, 1);
  const alpha = sampleLayerTrack(layer, 'alpha', progress, 1);
  const halfWidth = Math.max(1, (layer.width * scale) / 2);
  const halfHeight = Math.max(1, (layer.height * scale) / 2);
  const angle = ((layer.rotationDeg ?? 0) * Math.PI) / 180;
  const rotatePoint = (x, y) => ({
    x: x * Math.cos(angle) - y * Math.sin(angle),
    y: x * Math.sin(angle) + y * Math.cos(angle),
  });
  const points = [
    rotatePoint(0, -halfHeight),
    rotatePoint(halfWidth, 0),
    rotatePoint(0, halfHeight),
    rotatePoint(-halfWidth, 0),
  ]
    .map((point) => `${cx + point.x},${cy + point.y}`)
    .join(' ');

  return `
    <polygon
      points="${points}"
      fill="${escapeHtml(layer.color)}"
      opacity="${Math.max(0, alpha)}"
    ></polygon>
  `;
}

function renderArc(layer, progress) {
  const base = sampleMotionPosition(state.asset, state.instance, progress);
  const cx = base.x + sampleLayerTrack(layer, 'x', progress, 0);
  const cy = base.y + sampleLayerTrack(layer, 'y', progress, 0);
  const scale = sampleLayerTrack(layer, 'scale', progress, 1);
  const alpha = sampleLayerTrack(layer, 'alpha', progress, 1);
  const radius = Math.max(1, layer.radius * scale);
  const startAngle = (layer.rotationDeg ?? -90) - layer.sweepDeg / 2;
  const endAngle = startAngle + layer.sweepDeg;
  const toPoint = (angleDeg) => {
    const angle = (angleDeg * Math.PI) / 180;
    return {
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    };
  };
  const start = toPoint(startAngle);
  const end = toPoint(endAngle);
  const largeArcFlag = layer.sweepDeg > 180 ? 1 : 0;
  const d = `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;

  return `
    <path
      d="${d}"
      fill="transparent"
      stroke="${escapeHtml(layer.color)}"
      stroke-width="${Math.max(1, layer.thickness * scale)}"
      stroke-linecap="round"
      opacity="${Math.max(0, alpha)}"
    ></path>
  `;
}

function renderStarburst(layer, progress) {
  const base = sampleMotionPosition(state.asset, state.instance, progress);
  const cx = base.x + sampleLayerTrack(layer, 'x', progress, 0);
  const cy = base.y + sampleLayerTrack(layer, 'y', progress, 0);
  const scale = sampleLayerTrack(layer, 'scale', progress, 1);
  const alpha = sampleLayerTrack(layer, 'alpha', progress, 1);
  const innerRadius = Math.max(0.5, layer.innerRadius * scale);
  const outerRadius = Math.max(innerRadius + 0.5, layer.outerRadius * scale);
  const pointCount = Math.max(3, Math.round(layer.points));
  const rotation = ((layer.rotationDeg ?? -90) * Math.PI) / 180;
  const points = Array.from({ length: pointCount * 2 }, (_, index) => {
    const radius = index % 2 === 0 ? outerRadius : innerRadius;
    const angle = rotation + (Math.PI * index) / pointCount;
    return `${cx + radius * Math.cos(angle)},${cy + radius * Math.sin(angle)}`;
  }).join(' ');

  return `
    <polygon
      points="${points}"
      fill="${escapeHtml(layer.color)}"
      opacity="${Math.max(0, alpha)}"
    ></polygon>
  `;
}

function renderSpriteNode(spriteId, x, y, width, height, opacity, tintColor = '', maskId = '') {
  const href = getSpritePreviewSrc(spriteId);
  if (!href) return '';

  if (tintColor) {
    const resolvedMaskId = maskId || `sprite-mask-${Math.round(x)}-${Math.round(y)}-${Math.round(width)}-${Math.round(height)}`;
    return `
      <defs>
        <mask id="${escapeHtml(resolvedMaskId)}" maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse">
          <image
            href="${escapeHtml(href)}"
            x="${x - width / 2}"
            y="${y - height / 2}"
            width="${width}"
            height="${height}"
            preserveAspectRatio="xMidYMid meet"
          ></image>
        </mask>
      </defs>
      <rect
        x="${x - width / 2}"
        y="${y - height / 2}"
        width="${width}"
        height="${height}"
        fill="${escapeHtml(tintColor)}"
        opacity="${opacity}"
        mask="url(#${escapeHtml(resolvedMaskId)})"
      ></rect>
    `;
  }

  return `
    <image
      href="${escapeHtml(href)}"
      x="${x - width / 2}"
      y="${y - height / 2}"
      width="${width}"
      height="${height}"
      opacity="${opacity}"
      preserveAspectRatio="xMidYMid meet"
    ></image>
  `;
}

function renderSpriteLayer(layer, progress) {
  const base = sampleMotionPosition(state.asset, state.instance, progress);
  const x = base.x + sampleLayerTrack(layer, 'x', progress, 0);
  const y = base.y + sampleLayerTrack(layer, 'y', progress, 0);
  const scale = sampleLayerTrack(layer, 'scale', progress, 1);
  const alpha = sampleLayerTrack(layer, 'alpha', progress, 1);

  return renderSpriteNode(
    layer.spriteId,
    x,
    y,
    Math.max(1, layer.width * scale),
    Math.max(1, layer.height * scale),
    Math.max(0, alpha),
    layer.tintColor,
    `sprite-layer-mask-${escapeHtml(layer.id)}`,
  );
}

function renderTrail(layer, progress) {
  const falloff = layer.falloff ?? 0.1;
  const trailStyle = layer.style ?? 'fill';
  let svg = '';

  for (let index = 0; index < layer.segments; index += 1) {
    const segmentProgress = Math.max(0, progress - index * layer.spacing);
    const base = sampleMotionPosition(state.asset, state.instance, segmentProgress);
    const x = base.x + sampleLayerTrack(layer, 'x', segmentProgress, 0);
    const y = base.y + sampleLayerTrack(layer, 'y', segmentProgress, 0);
    const scale = sampleLayerTrack(layer, 'scale', segmentProgress, 1);
    const alpha = sampleLayerTrack(layer, 'alpha', segmentProgress, 1);
    const sizeFactor = Math.max(0.1, 1 - index * falloff);
    const radius = Math.max(1, layer.radius * scale * sizeFactor);
    const opacity = Math.max(0, alpha * (0.65 - index * (falloff * 0.9)));

    if (trailStyle === 'ring') {
      svg += `
        <circle
          cx="${x}"
          cy="${y}"
          r="${radius}"
          fill="transparent"
          stroke="${escapeHtml(layer.color)}"
          stroke-width="${Math.max(1, (layer.thickness ?? 2.5) * scale * sizeFactor)}"
          opacity="${opacity}"
        ></circle>
      `;
      continue;
    }

    if (trailStyle === 'sprite') {
      svg += renderSpriteNode(
        layer.spriteId,
        x,
        y,
        Math.max(1, (layer.width ?? layer.radius * 2) * scale * sizeFactor),
        Math.max(1, (layer.height ?? layer.radius * 2) * scale * sizeFactor),
        opacity,
        layer.tintColor,
        `trail-sprite-mask-${escapeHtml(layer.id)}-${index}`,
      );
      continue;
    }

    if (trailStyle === 'streak') {
      const width = Math.max(1, (layer.width ?? 36) * scale * sizeFactor);
      const height = Math.max(1, (layer.height ?? 10) * scale * sizeFactor);
      svg += `
        <rect
          x="${x - width / 2}"
          y="${y - height / 2}"
          width="${width}"
          height="${height}"
          rx="${height / 2}"
          ry="${height / 2}"
          fill="${escapeHtml(layer.color)}"
          opacity="${opacity}"
          transform="rotate(${layer.rotationDeg ?? -24} ${x} ${y})"
        ></rect>
      `;
      continue;
    }

    if (trailStyle === 'diamond') {
      const halfWidth = Math.max(1, ((layer.width ?? 24) * scale * sizeFactor) / 2);
      const halfHeight = Math.max(1, ((layer.height ?? 28) * scale * sizeFactor) / 2);
      const angle = (((layer.rotationDeg ?? 0) * Math.PI) / 180);
      const rotatePoint = (offsetX, offsetY) => ({
        x: offsetX * Math.cos(angle) - offsetY * Math.sin(angle),
        y: offsetX * Math.sin(angle) + offsetY * Math.cos(angle),
      });
      const points = [
        rotatePoint(0, -halfHeight),
        rotatePoint(halfWidth, 0),
        rotatePoint(0, halfHeight),
        rotatePoint(-halfWidth, 0),
      ]
        .map((point) => `${x + point.x},${y + point.y}`)
        .join(' ');
      svg += `
        <polygon
          points="${points}"
          fill="${escapeHtml(layer.color)}"
          opacity="${opacity}"
        ></polygon>
      `;
      continue;
    }

    if (trailStyle === 'arc') {
      const arcRadius = Math.max(1, (layer.radius ?? 12) * scale * sizeFactor);
      const sweepDeg = layer.sweepDeg ?? 130;
      const startAngle = (layer.rotationDeg ?? -90) - sweepDeg / 2;
      const endAngle = startAngle + sweepDeg;
      const toPoint = (angleDeg) => {
        const angle = (angleDeg * Math.PI) / 180;
        return {
          x: x + arcRadius * Math.cos(angle),
          y: y + arcRadius * Math.sin(angle),
        };
      };
      const start = toPoint(startAngle);
      const end = toPoint(endAngle);
      svg += `
        <path
          d="M ${start.x} ${start.y} A ${arcRadius} ${arcRadius} 0 ${sweepDeg > 180 ? 1 : 0} 1 ${end.x} ${end.y}"
          fill="transparent"
          stroke="${escapeHtml(layer.color)}"
          stroke-width="${Math.max(1, (layer.thickness ?? 3) * scale * sizeFactor)}"
          stroke-linecap="round"
          opacity="${opacity}"
        ></path>
      `;
      continue;
    }

    if (trailStyle === 'starburst') {
      const innerRadius = Math.max(0.5, (layer.innerRadius ?? 6) * scale * sizeFactor);
      const outerRadius = Math.max(innerRadius + 0.5, (layer.outerRadius ?? 14) * scale * sizeFactor);
      const pointCount = Math.max(3, Math.round(layer.points ?? 6));
      const rotation = ((layer.rotationDeg ?? -90) * Math.PI) / 180;
      const points = Array.from({ length: pointCount * 2 }, (_, pointIndex) => {
        const pointRadius = pointIndex % 2 === 0 ? outerRadius : innerRadius;
        const angle = rotation + (Math.PI * pointIndex) / pointCount;
        return `${x + pointRadius * Math.cos(angle)},${y + pointRadius * Math.sin(angle)}`;
      }).join(' ');
      svg += `
        <polygon
          points="${points}"
          fill="${escapeHtml(layer.color)}"
          opacity="${opacity}"
        ></polygon>
      `;
      continue;
    }

    svg += `
      <circle
        cx="${x}"
        cy="${y}"
        r="${radius}"
        fill="${escapeHtml(layer.color)}"
        opacity="${opacity}"
      ></circle>
    `;
  }

  return svg;
}

function renderPreview() {
  const backdrop = state.previewBackground;
  applyStageViewportFrame();
  const viewport = getStageViewport();
  const shapes = state.asset.layers
    .map((layer) => {
      if (layer.type === 'orb') return renderOrb(layer, state.progress);
      if (layer.type === 'ring') return renderRing(layer, state.progress);
      if (layer.type === 'streak') return renderStreak(layer, state.progress);
      if (layer.type === 'diamond') return renderDiamond(layer, state.progress);
      if (layer.type === 'arc') return renderArc(layer, state.progress);
      if (layer.type === 'starburst') return renderStarburst(layer, state.progress);
      if (layer.type === 'sprite') return renderSpriteLayer(layer, state.progress);
      return renderTrail(layer, state.progress);
    })
    .join('');

  const motionMode = state.asset.motion?.mode ?? 'fixed';
  const showTarget = motionUsesTarget(motionMode);
  const targetX = state.instance.targetX ?? state.instance.x;
  const targetY = state.instance.targetY ?? state.instance.y;

  ui.stageSvg.setAttribute('viewBox', `${viewport.x} ${viewport.y} ${viewport.width} ${viewport.height}`);
  renderPreviewViewportControls();

  ui.stageSvg.innerHTML = `
    <defs>
      <linearGradient id="stage-bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${escapeHtml(backdrop.top)}"></stop>
        <stop offset="100%" stop-color="${escapeHtml(backdrop.bottom)}"></stop>
      </linearGradient>
      <radialGradient id="warm-glow" cx="0.35" cy="0.2" r="0.8">
        <stop offset="0%" stop-color="${escapeHtml(backdrop.glow)}"></stop>
        <stop offset="100%" stop-color="rgba(0, 0, 0, 0)"></stop>
      </radialGradient>
    </defs>

    <rect x="${viewport.x}" y="${viewport.y}" width="${viewport.width}" height="${viewport.height}" fill="url(#stage-bg)"></rect>
    <rect x="${viewport.x}" y="${viewport.y}" width="${viewport.width}" height="${viewport.height}" fill="url(#warm-glow)"></rect>
    <path
      d="M 0 352 Q 180 334 340 360 T 720 350"
      fill="none"
      stroke="${escapeHtml(backdrop.ground)}"
      stroke-width="2"
    ></path>
    <line
      x1="${viewport.x}"
      y1="320"
      x2="${viewport.x + viewport.width}"
      y2="320"
      stroke="${escapeHtml(backdrop.grid)}"
      stroke-dasharray="6 10"
    ></line>

    ${renderMotionGuide()}

    ${shapes}

    <g data-anchor="start" style="cursor: grab;">
      <circle cx="${state.instance.x}" cy="${state.instance.y}" r="12" fill="#df945c"></circle>
      <circle
        cx="${state.instance.x}"
        cy="${state.instance.y}"
        r="22"
        fill="transparent"
        stroke="rgba(223, 148, 92, 0.42)"
      ></circle>
      <text
        x="${state.instance.x - 26}"
        y="${state.instance.y - 28}"
        fill="rgba(245,234,216,0.78)"
        font-size="14"
      >Spawn</text>
    </g>

    ${
      showTarget
        ? `
      <g data-anchor="target" style="cursor: grab;">
        <circle cx="${targetX}" cy="${targetY}" r="12" fill="#8fd7ff"></circle>
        <circle
          cx="${targetX}"
          cy="${targetY}"
          r="22"
          fill="transparent"
          stroke="rgba(143, 215, 255, 0.42)"
        ></circle>
        <text
          x="${targetX - 20}"
          y="${targetY - 28}"
          fill="rgba(245,234,216,0.78)"
          font-size="14"
        >Target</text>
      </g>
    `
        : ''
    }
  `;

  ui.progressSlider.value = String(state.progress);
  ui.progressPercentLabel.textContent = `${Math.round(state.progress * 100)}%`;
  ui.progressTimeLabel.textContent = `${Math.round(state.progress * state.asset.durationMs)} ms`;
}

function renderBezierCurveEditor(scope, trackName) {
  const curveState = ensureCurveState(scope, trackName);
  const range = getCurveValueRange(curveState);
  const horizontalGuides = Array.from({ length: 5 }, (_, index) => {
    const t = index / 4;
    const y = CURVE_EDITOR.padY + t * (CURVE_EDITOR.height - CURVE_EDITOR.padY * 2);
    const value = (range.max - (range.max - range.min) * t).toFixed(2);
    return `
      <line x1="${CURVE_EDITOR.padX}" y1="${y}" x2="${CURVE_EDITOR.width - CURVE_EDITOR.padX}" y2="${y}" stroke="rgba(255,255,255,0.07)" stroke-dasharray="4 6"></line>
      <text x="6" y="${y + 4}" fill="rgba(245,234,216,0.48)" font-size="11">${value}</text>
    `;
  }).join('');

  const verticalGuides = Array.from({ length: 5 }, (_, index) => {
    const t = index / 4;
    const x = CURVE_EDITOR.padX + t * (CURVE_EDITOR.width - CURVE_EDITOR.padX * 2);
    return `
      <line x1="${x}" y1="${CURVE_EDITOR.padY}" x2="${x}" y2="${CURVE_EDITOR.height - CURVE_EDITOR.padY}" stroke="rgba(255,255,255,0.05)" stroke-dasharray="4 6"></line>
      <text x="${x - 8}" y="${CURVE_EDITOR.height - 2}" fill="rgba(245,234,216,0.48)" font-size="11">${t.toFixed(2)}</text>
    `;
  }).join('');

  const segmentPath = curveState.points
    .map((point, index) => {
      const anchor = curvePointToScreen(point.at, point.value, range);

      if (index === 0) {
        return `M ${anchor.x} ${anchor.y}`;
      }

      const previous = curveState.points[index - 1];
      const previousOut = curvePointToScreen(previous.outX, previous.outY, range);
      const currentIn = curvePointToScreen(point.inX, point.inY, range);
      return `C ${previousOut.x} ${previousOut.y}, ${currentIn.x} ${currentIn.y}, ${anchor.x} ${anchor.y}`;
    })
    .join(' ');

  const handleLines = curveState.points
    .map((point, index) => {
      const anchor = curvePointToScreen(point.at, point.value, range);
      const handles = [];

      if (index > 0) {
        const inPoint = curvePointToScreen(point.inX, point.inY, range);
        handles.push(
          `<line x1="${anchor.x}" y1="${anchor.y}" x2="${inPoint.x}" y2="${inPoint.y}" stroke="rgba(143,215,255,0.32)" stroke-width="1.5"></line>`,
          `<circle cx="${inPoint.x}" cy="${inPoint.y}" r="5" fill="#8fd7ff" data-action="curve-handle" data-handle-type="in" data-curve-scope="${scope}" data-track-name="${trackName}" data-point-index="${index}"></circle>`,
        );
      }

      if (index < curveState.points.length - 1) {
        const outPoint = curvePointToScreen(point.outX, point.outY, range);
        handles.push(
          `<line x1="${anchor.x}" y1="${anchor.y}" x2="${outPoint.x}" y2="${outPoint.y}" stroke="rgba(223,148,92,0.34)" stroke-width="1.5"></line>`,
          `<circle cx="${outPoint.x}" cy="${outPoint.y}" r="5" fill="#df945c" data-action="curve-handle" data-handle-type="out" data-curve-scope="${scope}" data-track-name="${trackName}" data-point-index="${index}"></circle>`,
        );
      }

      return handles.join('');
    })
    .join('');

  const anchors = curveState.points
    .map((point, index) => {
      const anchor = curvePointToScreen(point.at, point.value, range);
      return `
        <circle
          cx="${anchor.x}"
          cy="${anchor.y}"
          r="7"
          fill="#f5ead8"
          stroke="#0e0b10"
          stroke-width="2"
          data-action="curve-handle"
          data-handle-type="anchor"
          data-curve-scope="${scope}"
          data-track-name="${trackName}"
          data-point-index="${index}"
        ></circle>
      `;
    })
    .join('');

  return `
    <div class="curve-viewport">
      <div class="curve-preset-row">
        <span class="field-label">Common Presets</span>
        <select
          class="field-select curve-preset-select"
          data-curve-preset-select="true"
          data-curve-scope="${scope}"
          data-track-name="${trackName}"
        >
          <option value="">Preset Curve...</option>
          ${Object.entries(CURVE_PRESETS)
            .map(
              ([presetId, preset]) => `
            <option value="${presetId}">${escapeHtml(preset.label)}</option>
          `,
            )
            .join('')}
        </select>
      </div>

      <div class="curve-range-row">
        <label class="field curve-range-field">
          <span class="field-label">Range Min</span>
          <input
            class="field-input"
            type="number"
            step="0.01"
            value="${range.min}"
            data-curve-scope="${scope}"
            data-track-name="${trackName}"
            data-range-field="min"
          />
        </label>

        <label class="field curve-range-field">
          <span class="field-label">Range Max</span>
          <input
            class="field-input"
            type="number"
            step="0.01"
            value="${range.max}"
            data-curve-scope="${scope}"
            data-track-name="${trackName}"
            data-range-field="max"
          />
        </label>
      </div>

      <svg
        class="curve-canvas"
        viewBox="0 0 ${CURVE_EDITOR.width} ${CURVE_EDITOR.height}"
        data-curve-canvas="true"
        data-curve-scope="${scope}"
        data-track-name="${trackName}"
      >
        <rect x="0" y="0" width="${CURVE_EDITOR.width}" height="${CURVE_EDITOR.height}" rx="16" fill="rgba(10,9,12,0.94)"></rect>
        ${horizontalGuides}
        ${verticalGuides}
        <path d="${segmentPath}" fill="none" stroke="#f6b26b" stroke-width="3"></path>
        ${handleLines}
        ${anchors}
      </svg>
      <p class="section-note">
        Curve mode uses weighted tangents. Once you edit the graph, the result is baked into linear runtime keys for preview and export.
      </p>
    </div>
  `;
}

function renderCurveEditor(scope, trackName) {
  const mode = getCurveEditorMode(scope, trackName);
  const track = getTrackEditorPoints(scope, trackName);

  return `
    <div class="curve-editor">
      <div class="curve-header">
        <div>
          <p class="panel-kicker">${escapeHtml(TRACK_LABELS[trackName])}</p>
          <p class="section-note">Key times are normalized from 0 to 1 across the full effect lifetime.</p>
        </div>
        <div class="curve-actions">
          <button class="stack-button ${mode === 'list' ? 'is-selected' : ''}" data-action="set-editor-mode" data-editor-mode="list" data-curve-scope="${scope}" data-track-name="${trackName}">Keyframe List</button>
          <button class="stack-button ${mode === 'curve' ? 'is-selected' : ''}" data-action="set-editor-mode" data-editor-mode="curve" data-curve-scope="${scope}" data-track-name="${trackName}">Bezier Curve</button>
          <button class="stack-button" data-action="add-keyframe" data-curve-scope="${scope}" data-track-name="${trackName}">Add Key</button>
          <button class="stack-button" data-action="sort-keyframes" data-curve-scope="${scope}" data-track-name="${trackName}">Sort Keys</button>
          <button class="stack-button" data-action="clear-keyframes" data-curve-scope="${scope}" data-track-name="${trackName}">Clear</button>
        </div>
      </div>

      ${
        mode === 'curve'
          ? renderBezierCurveEditor(scope, trackName)
          : `
        <div class="curve-table">
          ${
            track.length
              ? track
                  .map(
                    (keyframe, index) => `
                <div class="curve-row">
                  <label class="field">
                    <span class="field-label">Time</span>
                    <input
                      class="field-input"
                      type="number"
                      step="0.01"
                      min="0"
                      max="1"
                      value="${keyframe.at}"
                      data-curve-scope="${scope}"
                      data-track-name="${trackName}"
                      data-key-index="${index}"
                      data-key-field="at"
                    />
                  </label>

                  <label class="field">
                    <span class="field-label">Value</span>
                    <input
                      class="field-input"
                      type="number"
                      step="0.01"
                      value="${keyframe.value}"
                      data-curve-scope="${scope}"
                      data-track-name="${trackName}"
                      data-key-index="${index}"
                      data-key-field="value"
                    />
                  </label>

                  <button
                    class="icon-button"
                    title="Remove keyframe"
                    data-action="remove-keyframe"
                    data-curve-scope="${scope}"
                    data-track-name="${trackName}"
                    data-key-index="${index}"
                  >×</button>
                </div>
              `,
                  )
                  .join('')
              : '<p class="empty-note">No keyframes yet. Leave it empty for the runtime default, or add keys for a custom curve over lifetime.</p>'
          }
        </div>
      `
      }
    </div>
  `;
}

function renderAssetPanel() {
  const motionMode = state.asset.motion?.mode ?? 'fixed';
  const isLineMotion = motionMode === 'line';
  const isPathMotion = motionMode === 'path';

  ui.assetPanel.innerHTML = `
    <div class="field-grid">
      <label class="field">
        <span class="field-label">Effect ID</span>
        <input class="field-input" type="text" value="${escapeHtml(state.asset.id)}" data-asset-field="id" />
      </label>

      <label class="field">
        <span class="field-label">Display Label</span>
        <input class="field-input" type="text" value="${escapeHtml(state.asset.label)}" data-asset-field="label" />
      </label>

      <div class="field-grid two-up">
        <label class="field">
          <span class="field-label">Duration (ms)</span>
          <input class="field-input" type="number" min="1" value="${state.asset.durationMs}" data-asset-field="durationMs" />
        </label>

        <label class="field">
          <span class="field-label">Motion Mode</span>
          <select class="field-select" data-motion-field="mode">
            <option value="fixed" ${motionMode === 'fixed' ? 'selected' : ''}>Fixed</option>
            <option value="line" ${isLineMotion ? 'selected' : ''}>Line</option>
            <option value="path" ${isPathMotion ? 'selected' : ''}>Path</option>
          </select>
        </label>
      </div>

      <label class="field-checkbox">
        <input type="checkbox" ${state.asset.loop ? 'checked' : ''} data-asset-field="loop" />
        <span class="field-label">Loop playback in preview</span>
      </label>
    </div>

    ${renderCollapsibleSection({
      panelKey: 'assetMotion',
      kicker: 'Motion',
      title: 'Motion Over Lifetime',
      note:
        '<span class="section-note">Move the Spawn and Target anchors directly in the preview stage when you need to reposition the effect.</span>',
      body: `
      ${
        motionMode === 'fixed'
          ? '<p class="empty-note">Motion curves are disabled while Motion Mode is set to Fixed.</p>'
          : `
            <div class="curve-stack">
              ${renderCurveEditor('motion', 'travel')}
              ${
                isPathMotion
                  ? `
                    ${renderCurveEditor('motion', 'x')}
                    ${renderCurveEditor('motion', 'y')}
                    <p class="section-note">
                      <strong>Path</strong> mode keeps the spawn-to-target travel and adds root <strong>Offset X</strong> and <strong>Offset Y</strong> on top.
                    </p>
                  `
                  : ''
              }
            </div>
          `
      }
    `,
    })}
  `;
  schedulePersistEditorSession();
}

function renderLayersPanel() {
  ui.layersPanel.innerHTML = `
    <div class="layer-toolbar">
      <div class="button-row">
        <label class="field layer-add-field">
          <span class="field-label">Add Layer</span>
          <select class="field-select" data-layers-field="pendingLayerType">
            ${LAYER_TYPE_OPTIONS.map(
              (option) => `
              <option value="${option.value}" ${state.pendingLayerType === option.value ? 'selected' : ''}>${escapeHtml(option.label)}</option>
            `,
            ).join('')}
          </select>
        </label>
        <button class="chip-button" data-action="add-layer">Add Layer</button>
      </div>

      <div class="button-row">
        <button class="chip-button" data-action="duplicate-layer">Duplicate</button>
        <button class="chip-button" data-action="move-layer" data-direction="-1">Up</button>
        <button class="chip-button" data-action="move-layer" data-direction="1">Down</button>
        <button class="chip-button" data-action="remove-layer">Delete</button>
      </div>
    </div>

    ${
      isPanelCollapsed('layersStack')
        ? `
      <div class="layer-toolbar layer-collapse-row">
        <span class="section-note">Layer stack is collapsed.</span>
        <button
          class="stack-button stack-button-compact icon-toggle-button"
          data-action="toggle-collapse"
          data-panel-key="layersStack"
          aria-label="Expand layer stack"
          title="Expand layer stack"
        >▸</button>
      </div>
    `
        : ''
    }

    <div class="layer-stack">
      ${
        isPanelCollapsed('layersStack')
          ? ''
          : `
      ${
        state.asset.layers.length
          ? state.asset.layers
              .map(
                (layer) => `
            <button class="layer-card ${layer.id === state.selectedLayerId ? 'is-selected' : ''}" data-action="select-layer" data-layer-id="${escapeHtml(layer.id)}">
              <div class="layer-card-header">
                <strong>${escapeHtml(layer.id)}</strong>
                <span class="swatch" style="${getLayerCardSwatchStyle(layer)}"></span>
              </div>
              <div class="layer-card-header">
                <span class="layer-type">${escapeHtml(layer.type === 'trail' ? getTrailStyleCardLabel(layer.style) : layer.type)}</span>
                <span class="section-note">${layer.tracks ? Object.keys(layer.tracks).length : 0} curve set${layer.tracks && Object.keys(layer.tracks).length === 1 ? '' : 's'}</span>
              </div>
            </button>
          `,
              )
              .join('')
          : '<p class="empty-note">No layers yet. Pick a type from Add Layer, then build the stack from there.</p>'
      }
      `
      }
    </div>
  `;
  schedulePersistEditorSession();
}

function renderTrailInspectorFields(layer, trailStyle) {
  return `
    <label class="field">
      <span class="field-label">Trail Style</span>
      <select class="field-select" data-layer-field="style">
        ${TRAIL_STYLE_OPTIONS.map(
          (option) => `
          <option value="${option.value}" ${trailStyle === option.value ? 'selected' : ''}>${escapeHtml(option.label)}</option>
        `,
        ).join('')}
      </select>
    </label>

    ${
      trailStyle === 'sprite'
        ? renderSpriteField({
            value: layer.spriteId,
            field: 'spriteId',
            datasetName: 'layer-field',
          })
        : renderColorField({
            label: 'Base Color',
            value: layer.color,
            field: 'color',
            datasetName: 'layer-field',
            fallback: '#ffffff',
          })
    }

    ${
      trailStyle === 'sprite'
        ? renderTintField({
            value: layer.tintColor ?? '',
            field: 'tintColor',
            datasetName: 'layer-field',
          })
        : ''
    }

    <div class="field-grid two-up">
      <label class="field">
        <span class="field-label">Segments</span>
        <input class="field-input" type="number" step="1" min="1" value="${layer.segments}" data-layer-field="segments" />
      </label>

      <label class="field">
        <span class="field-label">Spacing</span>
        <input class="field-input" type="number" step="0.01" value="${layer.spacing}" data-layer-field="spacing" />
      </label>

      <label class="field">
        <span class="field-label">Falloff</span>
        <input class="field-input" type="number" step="0.01" value="${layer.falloff ?? 0.1}" data-layer-field="falloff" />
      </label>
    </div>

    ${
      trailStyle === 'fill' || trailStyle === 'ring'
        ? `
      <div class="field-grid two-up">
        <label class="field">
          <span class="field-label">Radius</span>
          <input class="field-input" type="number" step="0.1" value="${layer.radius}" data-layer-field="radius" />
        </label>

        ${
          trailStyle === 'ring'
            ? `
          <label class="field">
            <span class="field-label">Thickness</span>
            <input class="field-input" type="number" step="0.1" value="${layer.thickness ?? 2.5}" data-layer-field="thickness" />
          </label>
        `
            : ''
        }
      </div>
    `
        : ''
    }

    ${
      trailStyle === 'sprite'
        ? `
      <div class="field-grid two-up">
        <label class="field">
          <span class="field-label">Sprite Width</span>
          <input class="field-input" type="number" step="0.1" value="${layer.width ?? layer.radius * 2}" data-layer-field="width" />
        </label>

        <label class="field">
          <span class="field-label">Sprite Height</span>
          <input class="field-input" type="number" step="0.1" value="${layer.height ?? layer.radius * 2}" data-layer-field="height" />
        </label>
      </div>
    `
        : ''
    }

    ${
      trailStyle === 'streak' || trailStyle === 'diamond'
        ? `
      <div class="field-grid two-up">
        <label class="field">
          <span class="field-label">Width</span>
          <input class="field-input" type="number" step="0.1" value="${layer.width ?? (trailStyle === 'streak' ? 36 : 24)}" data-layer-field="width" />
        </label>

        <label class="field">
          <span class="field-label">Height</span>
          <input class="field-input" type="number" step="0.1" value="${layer.height ?? (trailStyle === 'streak' ? 10 : 28)}" data-layer-field="height" />
        </label>

        <label class="field">
          <span class="field-label">Rotation</span>
          <input class="field-input" type="number" step="1" value="${layer.rotationDeg ?? (trailStyle === 'streak' ? -24 : 0)}" data-layer-field="rotationDeg" />
        </label>
      </div>
    `
        : ''
    }

    ${
      trailStyle === 'arc'
        ? `
      <div class="field-grid two-up">
        <label class="field">
          <span class="field-label">Radius</span>
          <input class="field-input" type="number" step="0.1" value="${layer.radius}" data-layer-field="radius" />
        </label>

        <label class="field">
          <span class="field-label">Thickness</span>
          <input class="field-input" type="number" step="0.1" value="${layer.thickness ?? 3}" data-layer-field="thickness" />
        </label>

        <label class="field">
          <span class="field-label">Sweep Degrees</span>
          <input class="field-input" type="number" step="1" value="${layer.sweepDeg ?? 130}" data-layer-field="sweepDeg" />
        </label>

        <label class="field">
          <span class="field-label">Rotation</span>
          <input class="field-input" type="number" step="1" value="${layer.rotationDeg ?? -90}" data-layer-field="rotationDeg" />
        </label>
      </div>
    `
        : ''
    }

    ${
      trailStyle === 'starburst'
        ? `
      <div class="field-grid two-up">
        <label class="field">
          <span class="field-label">Inner Radius</span>
          <input class="field-input" type="number" step="0.1" value="${layer.innerRadius ?? 6}" data-layer-field="innerRadius" />
        </label>

        <label class="field">
          <span class="field-label">Outer Radius</span>
          <input class="field-input" type="number" step="0.1" value="${layer.outerRadius ?? 14}" data-layer-field="outerRadius" />
        </label>

        <label class="field">
          <span class="field-label">Points</span>
          <input class="field-input" type="number" step="1" min="3" value="${layer.points ?? 6}" data-layer-field="points" />
        </label>

        <label class="field">
          <span class="field-label">Rotation</span>
          <input class="field-input" type="number" step="1" value="${layer.rotationDeg ?? -90}" data-layer-field="rotationDeg" />
        </label>
      </div>
    `
        : ''
    }

    <p class="section-note">Trail style can reuse the existing primitive shapes while still following the effect motion.</p>
  `;
}

function renderLayerInspector() {
  const layer = getSelectedLayer();

  if (!layer) {
    ui.layerInspectorPanel.innerHTML =
      '<p class="empty-note">Select a layer to edit its properties and curves over lifetime.</p>';
    schedulePersistEditorSession();
    return;
  }

  const validTracks = TRACKS_BY_LAYER_TYPE[layer.type];
  const selectedTrack = validTracks.includes(state.selectedLayerTrack)
    ? state.selectedLayerTrack
    : validTracks[0];
  const trailStyle = layer.type === 'trail' ? layer.style ?? 'fill' : null;

  ui.layerInspectorPanel.innerHTML = `
    ${renderCollapsibleSection({
      panelKey: 'layerProperties',
      kicker: 'Selected Layer',
      title: layer.id,
      note: `<span class="layer-type">${escapeHtml(layer.type === 'trail' ? getTrailStyleLabel(trailStyle) : layer.type)}</span>`,
      className: 'inspector-block',
      body: `
      <div class="field-grid">
        <label class="field">
          <span class="field-label">Layer ID</span>
          <input class="field-input" type="text" value="${escapeHtml(layer.id)}" data-layer-field="id" />
        </label>

        <label class="field">
          <span class="field-label">Primitive Shape</span>
          <select class="field-select" data-layer-field="type">
            ${LAYER_TYPE_OPTIONS.map(
              (option) => `
              <option value="${option.value}" ${layer.type === option.value ? 'selected' : ''}>${escapeHtml(option.label)}</option>
            `,
            ).join('')}
          </select>
        </label>

        ${
          layer.type === 'trail'
            ? ''
            : layer.type === 'sprite'
            ? renderSpriteField({
                value: layer.spriteId,
                field: 'spriteId',
                datasetName: 'layer-field',
              })
              : renderColorField({
                  label: 'Base Color',
                  value: layer.color,
                  field: 'color',
                  datasetName: 'layer-field',
                  fallback: '#ffffff',
                })
        }

        ${
          layer.type === 'sprite'
            ? renderTintField({
                value: layer.tintColor ?? '',
                field: 'tintColor',
                datasetName: 'layer-field',
              })
            : ''
        }

        ${
          layer.type === 'sprite'
            ? `
          <div class="field-grid two-up">
            <label class="field">
              <span class="field-label">Width</span>
              <input class="field-input" type="number" step="0.1" value="${layer.width}" data-layer-field="width" />
            </label>

            <label class="field">
              <span class="field-label">Height</span>
              <input class="field-input" type="number" step="0.1" value="${layer.height}" data-layer-field="height" />
            </label>
          </div>
        `
            : layer.type === 'streak' || layer.type === 'diamond'
              ? `
          <div class="field-grid two-up">
            <label class="field">
              <span class="field-label">Width</span>
              <input class="field-input" type="number" step="0.1" value="${layer.width}" data-layer-field="width" />
            </label>

            <label class="field">
              <span class="field-label">Height</span>
              <input class="field-input" type="number" step="0.1" value="${layer.height}" data-layer-field="height" />
            </label>

            <label class="field">
              <span class="field-label">Rotation</span>
              <input class="field-input" type="number" step="1" value="${layer.rotationDeg ?? 0}" data-layer-field="rotationDeg" />
            </label>
          </div>
        `
              : layer.type === 'arc'
                ? `
          <div class="field-grid two-up">
            <label class="field">
              <span class="field-label">Radius</span>
              <input class="field-input" type="number" step="0.1" value="${layer.radius}" data-layer-field="radius" />
            </label>

            <label class="field">
              <span class="field-label">Thickness</span>
              <input class="field-input" type="number" step="0.1" value="${layer.thickness}" data-layer-field="thickness" />
            </label>

            <label class="field">
              <span class="field-label">Sweep Degrees</span>
              <input class="field-input" type="number" step="1" value="${layer.sweepDeg}" data-layer-field="sweepDeg" />
            </label>

            <label class="field">
              <span class="field-label">Rotation</span>
              <input class="field-input" type="number" step="1" value="${layer.rotationDeg ?? -90}" data-layer-field="rotationDeg" />
            </label>
          </div>
        `
                : layer.type === 'starburst'
                  ? `
          <div class="field-grid two-up">
            <label class="field">
              <span class="field-label">Inner Radius</span>
              <input class="field-input" type="number" step="0.1" value="${layer.innerRadius}" data-layer-field="innerRadius" />
            </label>

            <label class="field">
              <span class="field-label">Outer Radius</span>
              <input class="field-input" type="number" step="0.1" value="${layer.outerRadius}" data-layer-field="outerRadius" />
            </label>

            <label class="field">
              <span class="field-label">Points</span>
              <input class="field-input" type="number" step="1" min="3" value="${layer.points}" data-layer-field="points" />
            </label>

            <label class="field">
              <span class="field-label">Rotation</span>
              <input class="field-input" type="number" step="1" value="${layer.rotationDeg ?? -90}" data-layer-field="rotationDeg" />
            </label>
          </div>
        `
                : layer.type === 'trail'
                  ? renderTrailInspectorFields(layer, trailStyle)
            : `
          <div class="field-grid two-up">
            <label class="field">
              <span class="field-label">Radius</span>
              <input class="field-input" type="number" step="0.1" value="${layer.radius}" data-layer-field="radius" />
            </label>

            ${
              layer.type === 'ring'
                ? `
              <label class="field">
                <span class="field-label">Thickness</span>
                <input class="field-input" type="number" step="0.1" value="${layer.thickness}" data-layer-field="thickness" />
              </label>
            `
                : layer.type === 'orb'
                  ? `
              <label class="field">
                <span class="field-label">Glow Scale</span>
                <input class="field-input" type="number" step="0.1" value="${layer.glowScale ?? 2.3}" data-layer-field="glowScale" />
              </label>
            `
                  : `
              <label class="field">
                <span class="field-label">Segments</span>
                <input class="field-input" type="number" step="1" min="1" value="${layer.segments}" data-layer-field="segments" />
              </label>
            `
            }
          </div>
        `
        }

        ${
          layer.type === 'orb'
            ? `
          ${renderColorField({
            label: 'Glow Color',
            value: layer.glowColor ?? '',
            field: 'glowColor',
            datasetName: 'layer-field',
            fallback: getColorInputValue(layer.color, '#ffffff'),
          })}
        `
            : ''
        }

        ${
          ''
        }
      </div>
    `,
    })}

    ${renderCollapsibleSection({
      panelKey: 'layerCurves',
      kicker: 'Curves',
      title: 'Properties Over Lifetime',
      className: 'inspector-block',
      body: `
      <div class="track-pills">
        ${validTracks
          .map(
            (trackName) => `
          <button class="track-pill ${trackName === selectedTrack ? 'is-active' : ''}" data-action="select-track" data-track-name="${trackName}">
            ${escapeHtml(TRACK_LABELS[trackName])}
          </button>
        `,
          )
          .join('')}
      </div>

      ${renderCurveEditor('layer', selectedTrack)}
    `,
    })}
  `;
  schedulePersistEditorSession();
}

function renderToolbarMenus() {
  const backdrop = state.previewBackground;
  const recentFiles = state.recentFiles;
  const repoLinked = Boolean(state.repoRootHandle);
  const jsonHidden = isPanelCollapsed('jsonPanel');

  ui.fileMenuContent.innerHTML = `
    <div class="menu-grid">
      <section class="menu-section">
        <p class="menu-section-title">Project Files</p>
        <div class="menu-button-stack">
          <button class="menu-action" type="button" data-toolbar-action="open-file">Open .json</button>
          <button class="menu-action" type="button" data-toolbar-action="save-file">Save</button>
          <button class="menu-action" type="button" data-toolbar-action="save-file-as">Save As...</button>
          <button class="menu-action" type="button" data-toolbar-action="export-json">Export .json</button>
        </div>
        <p class="menu-section-note">
          ${state.fileName ? `Current file: <strong>${escapeHtml(state.fileName)}</strong>` : 'No file is attached yet. Save will prompt for a location if needed.'}
        </p>
      </section>

      <section class="menu-section">
        <p class="menu-section-title">Open Recent</p>
        ${
          recentFiles.length
            ? `
          <div class="menu-recent-list">
            ${recentFiles
              .map(
                (item) => `
              <button class="menu-recent-item" type="button" data-toolbar-action="open-recent" data-recent-file-id="${escapeHtml(item.id)}">
                <span class="menu-recent-name">${escapeHtml(item.name)}</span>
                <span class="menu-recent-meta">${new Date(item.lastOpenedAt).toLocaleString()}</span>
              </button>
            `,
              )
              .join('')}
          </div>
        `
            : '<p class="menu-section-note">No recent local JSON files yet.</p>'
        }
      </section>

      <section class="menu-section">
        <p class="menu-section-title">Quick Load Examples</p>
        <div class="menu-button-stack">
          ${Object.entries(DEMO_EFFECTS)
            .map(
              ([effectId]) => `
            <button class="menu-action" type="button" data-toolbar-action="load-demo" data-demo-effect="${escapeHtml(effectId)}">${escapeHtml(titleCaseFromId(effectId))}</button>
          `,
            )
            .join('')}
        </div>
      </section>
    </div>
  `;

  ui.editorMenuContent.innerHTML = `
    <div class="menu-grid">
      <section class="menu-section">
        <p class="menu-section-title">Workspace</p>
        <div class="menu-button-stack">
          <button class="menu-action" type="button" data-toolbar-action="link-repo-root">${repoLinked ? 'Relink Repo Root' : 'Link Repo Root for Autosave'}</button>
          <button class="menu-action" type="button" data-toolbar-action="import-sprite">Import Sprite</button>
          <button class="menu-action" type="button" data-toolbar-action="toggle-json-panel">${jsonHidden ? 'Show JSON Debug Panel' : 'Hide JSON Debug Panel'}</button>
        </div>
        <p class="menu-section-note">
          ${repoLinked ? 'Repo root is linked for editor autosave and sprite import.' : 'Link the repo root once so editor-session.json autosaves into tools/vfx-editor.'}
        </p>
      </section>

      <section class="menu-section">
        <p class="menu-section-title">Preview Environment</p>
        <div class="menu-field-grid">
          <label class="menu-compact-field">
            <span class="field-label">Backdrop Preset</span>
            <select class="field-select" data-preview-field="preset">
              ${Object.entries(PREVIEW_BACKDROPS)
                .map(
                  ([presetId, preset]) => `
                <option value="${presetId}" ${backdrop.preset === presetId ? 'selected' : ''}>${escapeHtml(preset.label)}</option>
              `,
                )
                .join('')}
            </select>
          </label>

          ${renderToolbarColorField({
            label: 'Top Color',
            value: backdrop.top,
            field: 'top',
            fallback: '#181017',
          })}

          ${renderToolbarColorField({
            label: 'Bottom Color',
            value: backdrop.bottom,
            field: 'bottom',
            fallback: '#0e0b10',
          })}

          ${renderToolbarColorField({
            label: 'Ambient Glow',
            value: backdrop.glow,
            field: 'glow',
            fallback: '#df945c',
          })}
        </div>
        <p class="menu-section-note">Editor-only preview controls. They do not affect exported runtime JSON.</p>
      </section>
    </div>
  `;
}

function closeToolbarMenus() {
  ui.fileMenu.open = false;
  ui.editorMenu.open = false;
}

function renderPanels() {
  renderToolbarMenus();
  renderAssetPanel();
  renderLayersPanel();
  renderLayerInspector();
  renderStaticPanelState();
  ui.effectTitleLabel.textContent = `${state.asset.label} Preview`;
  ui.fileStatusLabel.textContent = state.fileName
    ? state.fileHandle
      ? `Attached file: ${state.fileName}`
      : `Loaded source: ${state.fileName}`
    : 'No local file attached';
}

function createLayer(type) {
  const baseName = `${type}`;
  const usedIds = new Set(state.asset.layers.map((layer) => layer.id));
  let suffix = state.asset.layers.length + 1;
  let id = `${baseName}-${suffix}`;

  while (usedIds.has(id)) {
    suffix += 1;
    id = `${baseName}-${suffix}`;
  }

  if (type === 'orb') {
    return {
      id,
      type: 'orb',
      radius: 10,
      color: '#fff1c9',
      glowColor: 'rgba(255, 214, 133, 0.6)',
      glowScale: 2,
      tracks: {
        scale: [{ at: 0, value: 1 }],
        alpha: [{ at: 0, value: 1 }],
      },
    };
  }

  if (type === 'ring') {
    return {
      id,
      type: 'ring',
      radius: 16,
      thickness: 4,
      color: '#ffd27a',
      tracks: {
        scale: [{ at: 0, value: 1 }],
        alpha: [{ at: 0, value: 1 }],
      },
    };
  }

  if (type === 'streak') {
    return {
      id,
      type: 'streak',
      width: 48,
      height: 12,
      rotationDeg: -24,
      color: '#ffd27a',
      tracks: {
        scale: [{ at: 0, value: 1 }],
        alpha: [{ at: 0, value: 1 }],
      },
    };
  }

  if (type === 'diamond') {
    return {
      id,
      type: 'diamond',
      width: 24,
      height: 36,
      rotationDeg: 0,
      color: '#9ee7ff',
      tracks: {
        scale: [{ at: 0, value: 1 }],
        alpha: [{ at: 0, value: 1 }],
      },
    };
  }

  if (type === 'arc') {
    return {
      id,
      type: 'arc',
      radius: 22,
      thickness: 5,
      sweepDeg: 130,
      rotationDeg: -90,
      color: '#ffcf88',
      tracks: {
        scale: [{ at: 0, value: 1 }],
        alpha: [{ at: 0, value: 1 }],
      },
    };
  }

  if (type === 'starburst') {
    return {
      id,
      type: 'starburst',
      innerRadius: 8,
      outerRadius: 20,
      points: 6,
      rotationDeg: -90,
      color: '#fff1c9',
      tracks: {
        scale: [{ at: 0, value: 1 }],
        alpha: [{ at: 0, value: 1 }],
      },
    };
  }

  if (type === 'sprite') {
    return {
      id,
      type: 'sprite',
      spriteId: getDefaultSpriteId(),
      width: 42,
      height: 42,
      tintColor: '',
      tracks: {
        scale: [{ at: 0, value: 1 }],
        alpha: [{ at: 0, value: 1 }],
      },
    };
  }

  return {
    id,
    type: 'trail',
    radius: 12,
    segments: 6,
    spacing: 0.06,
    falloff: 0.1,
    style: 'fill',
    color: 'rgba(255, 140, 60, 0.66)',
    tracks: {
      scale: [{ at: 0, value: 1 }],
      alpha: [{ at: 0, value: 1 }],
    },
  };
}

function createConvertedLayer(sourceLayer, nextType) {
  const converted = createLayer(nextType);
  converted.id = sourceLayer.id;
  converted.tracks = cloneData(sourceLayer.tracks ?? {});

  if ('color' in converted) {
    converted.color =
      sourceLayer.color ?? sourceLayer.glowColor ?? sourceLayer.tintColor ?? converted.color;
  }

  if (nextType === 'orb') {
    converted.radius = sourceLayer.radius ?? sourceLayer.outerRadius ?? converted.radius;
    converted.glowColor = sourceLayer.glowColor ?? sourceLayer.color ?? converted.glowColor;
    converted.glowScale = sourceLayer.glowScale ?? converted.glowScale;
    return converted;
  }

  if (nextType === 'ring') {
    converted.radius = sourceLayer.radius ?? sourceLayer.outerRadius ?? converted.radius;
    converted.thickness = sourceLayer.thickness ?? converted.thickness;
    return converted;
  }

  if (nextType === 'trail') {
    converted.style = sourceLayer.type === 'trail' ? sourceLayer.style ?? 'fill' : 'fill';
    converted.radius = sourceLayer.radius ?? sourceLayer.outerRadius ?? converted.radius;
    converted.color = sourceLayer.color ?? sourceLayer.tintColor ?? converted.color;
    converted.spriteId = sourceLayer.spriteId ?? converted.spriteId;
    converted.tintColor = sourceLayer.tintColor ?? converted.tintColor;
    converted.width = sourceLayer.width ?? converted.width;
    converted.height = sourceLayer.height ?? converted.height;
    converted.rotationDeg = sourceLayer.rotationDeg ?? converted.rotationDeg;
    converted.thickness = sourceLayer.thickness ?? converted.thickness;
    converted.sweepDeg = sourceLayer.sweepDeg ?? converted.sweepDeg;
    converted.innerRadius = sourceLayer.innerRadius ?? converted.innerRadius;
    converted.outerRadius = sourceLayer.outerRadius ?? converted.outerRadius;
    converted.points = sourceLayer.points ?? converted.points;
    converted.segments = sourceLayer.segments ?? converted.segments;
    converted.spacing = sourceLayer.spacing ?? converted.spacing;
    converted.falloff = sourceLayer.falloff ?? converted.falloff;
    applyTrailStyleDefaults(converted);
    return converted;
  }

  if (nextType === 'streak' || nextType === 'diamond') {
    converted.width =
      sourceLayer.width ??
      (sourceLayer.radius ? sourceLayer.radius * 2 : undefined) ??
      converted.width;
    converted.height =
      sourceLayer.height ??
      (sourceLayer.radius ? sourceLayer.radius * 1.2 : undefined) ??
      converted.height;
    converted.rotationDeg = sourceLayer.rotationDeg ?? converted.rotationDeg;
    return converted;
  }

  if (nextType === 'arc') {
    converted.radius = sourceLayer.radius ?? sourceLayer.outerRadius ?? converted.radius;
    converted.thickness = sourceLayer.thickness ?? converted.thickness;
    converted.sweepDeg = sourceLayer.sweepDeg ?? converted.sweepDeg;
    converted.rotationDeg = sourceLayer.rotationDeg ?? converted.rotationDeg;
    return converted;
  }

  if (nextType === 'starburst') {
    converted.innerRadius =
      sourceLayer.innerRadius ??
      (sourceLayer.radius ? Math.max(1, sourceLayer.radius * 0.55) : undefined) ??
      converted.innerRadius;
    converted.outerRadius =
      sourceLayer.outerRadius ?? sourceLayer.radius ?? converted.outerRadius;
    converted.points = sourceLayer.points ?? converted.points;
    converted.rotationDeg = sourceLayer.rotationDeg ?? converted.rotationDeg;
    return converted;
  }

  if (nextType === 'sprite') {
    converted.spriteId = sourceLayer.spriteId ?? getDefaultSpriteId();
    converted.tintColor =
      sourceLayer.tintColor ?? sourceLayer.color ?? sourceLayer.glowColor ?? converted.tintColor;
    converted.width =
      sourceLayer.width ??
      (sourceLayer.radius ? sourceLayer.radius * 2 : undefined) ??
      converted.width;
    converted.height =
      sourceLayer.height ??
      (sourceLayer.radius ? sourceLayer.radius * 2 : undefined) ??
      converted.height;
  }

  return converted;
}

function updateAssetField(field, rawValue) {
  pushUndoCheckpoint();
  const nextAsset = cloneData(state.asset);

  if (field === 'durationMs') {
    nextAsset.durationMs = Math.max(1, Number(rawValue) || 1);
  } else if (field === 'loop') {
    nextAsset.loop = Boolean(rawValue);
  } else {
    nextAsset[field] = rawValue;
  }

  commitAsset(nextAsset);
}

function updatePreviewField(field, rawValue, fromColorPicker = false) {
  pushUndoCheckpoint();
  if (field === 'preset') {
    const preset = PREVIEW_BACKDROPS[rawValue] ?? PREVIEW_BACKDROPS.custom;
    state.previewBackground = {
      preset: rawValue,
      ...cloneData(preset),
    };
    renderToolbarMenus();
    renderPreview();
    schedulePersistEditorSession();
    return;
  }

  const currentValue = state.previewBackground[field];
  state.previewBackground[field] = fromColorPicker
    ? mergePickedHexWithSource(currentValue, rawValue)
    : rawValue;
  state.previewBackground.preset = 'custom';
  renderToolbarMenus();
  renderPreview();
  schedulePersistEditorSession();
}

function updateMotionField(field, rawValue) {
  pushUndoCheckpoint();
  const nextAsset = cloneData(state.asset);
  ensureMotion(nextAsset);
  nextAsset.motion[field] = rawValue;
  commitAsset(nextAsset, { renderPanels: true });
}

function updateSelectedLayerField(field, rawValue, fromColorPicker = false) {
  pushUndoCheckpoint();
  const layerIndex = getSelectedLayerIndex();
  if (layerIndex < 0) return;

  const nextAsset = cloneData(state.asset);
  let layer = nextAsset.layers[layerIndex];

  if (field === 'type') {
    if (!LAYER_TYPE_OPTIONS.some((option) => option.value === rawValue)) {
      return;
    }

    nextAsset.layers[layerIndex] = createConvertedLayer(layer, rawValue);
    commitAsset(nextAsset, { renderPanels: true });
    return;
  }

  layer = nextAsset.layers[layerIndex];

  if (['radius', 'glowScale', 'thickness', 'spacing', 'falloff', 'width', 'height', 'rotationDeg', 'sweepDeg', 'innerRadius', 'outerRadius'].includes(field)) {
    if (rawValue === '') {
      delete layer[field];
    } else {
      layer[field] = Number(rawValue);
    }
  } else if (field === 'segments' || field === 'points') {
    layer[field] = Math.max(field === 'points' ? 3 : 1, Math.round(Number(rawValue) || 1));
  } else if (field === 'color' || field === 'glowColor' || field === 'tintColor') {
    const currentValue =
      layer[field] ?? (field === 'glowColor' ? layer.color : '#ffffff');
    layer[field] = fromColorPicker ? mergePickedHexWithSource(currentValue, rawValue) : rawValue;
  } else if (field === 'style') {
    layer.style = rawValue;
    applyTrailStyleDefaults(layer);
  } else if (field === 'spriteId') {
    layer.spriteId = hasSpriteDefinition(rawValue) ? rawValue : getDefaultSpriteId();
  } else {
    layer[field] = rawValue;
  }

  if (field === 'id') {
    clearCurveEditors();
    state.selectedLayerId = rawValue;
    commitAsset(nextAsset, { renderPanels: true });
    return;
  }

  if (field === 'style' || field === 'spriteId') {
    commitAsset(nextAsset, { renderPanels: true });
    return;
  }

  commitAsset(nextAsset);

  if (field === 'color') {
    renderLayersPanel();
  }
}

function getCurveTrack(scope, trackName) {
  if (scope === 'motion') {
    return cloneData(state.asset.motion?.tracks?.[trackName] ?? []);
  }

  const layer = getSelectedLayer();
  return cloneData(layer?.tracks?.[trackName] ?? []);
}

function setRawTrack(scope, trackName, nextTrack, { rerenderPanels = false } = {}) {
  pushUndoCheckpoint();
  const normalizedTrack = normalizeTrack(nextTrack);
  const nextAsset = cloneData(state.asset);

  if (scope === 'motion') {
    ensureMotion(nextAsset);
    nextAsset.motion.tracks ??= {};

    if (normalizedTrack.length > 0) {
      nextAsset.motion.tracks[trackName] = normalizedTrack;
    } else {
      delete nextAsset.motion.tracks[trackName];
    }
  } else {
    const layerIndex = getSelectedLayerIndex();
    if (layerIndex < 0) return;
    const layer = nextAsset.layers[layerIndex];
    layer.tracks ??= {};

    if (normalizedTrack.length > 0) {
      layer.tracks[trackName] = normalizedTrack;
    } else {
      delete layer.tracks[trackName];
    }
  }

  commitAsset(nextAsset, { renderPanels: rerenderPanels });
}

function setCurveValueRange(scope, trackName, bound, rawValue) {
  pushUndoCheckpoint();
  const curveState = ensureCurveState(scope, trackName);
  const numericValue = Number(rawValue);
  if (!Number.isFinite(numericValue)) return;

  if (bound === 'min') {
    curveState.rangeMin = numericValue;
    if (numericValue >= curveState.rangeMax) {
      curveState.rangeMax = numericValue + 0.001;
    }
  } else {
    curveState.rangeMax = numericValue;
    if (numericValue <= curveState.rangeMin) {
      curveState.rangeMin = numericValue - 0.001;
    }
  }

  curveState.modified = true;
  refreshCurveState(curveState);
  syncJsonFromAsset();
  renderPreview();
  rerenderCurveOwner(scope);
}

function addKeyframe(scope, trackName) {
  if (hasCurveState(scope, trackName)) {
    pushUndoCheckpoint();
    const curveState = ensureCurveState(scope, trackName);
    const points = curveState.points;
    const last = points[points.length - 1];
    const nextAt = last ? clamp01(last.at + 0.1) : 0;
    const range = getCurveValueRange(curveState);
    const nextValue = clamp(
      last ? last.value : getCurveDefaultValue(trackName),
      range.min,
      range.max,
    );
    points.push({
      at: nextAt,
      value: nextValue,
      inX: nextAt,
      inY: nextValue,
      outX: nextAt,
      outY: nextValue,
    });
    curveState.modified = true;
    refreshCurveState(curveState);
    syncJsonFromAsset();
    renderPreview();
    renderPanels();
    return;
  }

  const track = getCurveTrack(scope, trackName);
  const last = track[track.length - 1];
  const nextAt = last ? clamp01(last.at + 0.1) : 0;
  const nextValue = last ? last.value : ['scale', 'alpha'].includes(trackName) ? 1 : 0;
  track.push({ at: nextAt, value: nextValue });
  setRawTrack(scope, trackName, track, { rerenderPanels: true });
}

function removeKeyframe(scope, trackName, index) {
  if (hasCurveState(scope, trackName)) {
    pushUndoCheckpoint();
    const curveState = ensureCurveState(scope, trackName);
    curveState.points.splice(index, 1);

    if (curveState.points.length === 0) {
      delete state.curveStates[getCurveStateKey(scope, trackName)];
      state.curveEditorModes[getCurveStateKey(scope, trackName)] = 'list';
    } else {
      curveState.modified = true;
      refreshCurveState(curveState);
    }

    syncJsonFromAsset();
    renderPreview();
    renderPanels();
    return;
  }

  const track = getCurveTrack(scope, trackName);
  track.splice(index, 1);
  setRawTrack(scope, trackName, track, { rerenderPanels: true });
}

function sortKeyframes(scope, trackName) {
  if (hasCurveState(scope, trackName)) {
    pushUndoCheckpoint();
    const curveState = ensureCurveState(scope, trackName);
    curveState.points.sort((left, right) => left.at - right.at);
    curveState.modified = true;
    refreshCurveState(curveState);
    syncJsonFromAsset();
    renderPreview();
    renderPanels();
    return;
  }

  const track = getCurveTrack(scope, trackName).sort((left, right) => left.at - right.at);
  setRawTrack(scope, trackName, track, { rerenderPanels: true });
}

function clearKeyframes(scope, trackName) {
  delete state.curveStates[getCurveStateKey(scope, trackName)];
  state.curveEditorModes[getCurveStateKey(scope, trackName)] = 'list';
  setRawTrack(scope, trackName, [], { rerenderPanels: true });
}

function updateKeyframe(scope, trackName, index, field, rawValue) {
  if (hasCurveState(scope, trackName)) {
    pushUndoCheckpoint();
    const curveState = ensureCurveState(scope, trackName);
    const point = curveState.points[index];
    if (!point) return;
    const range = getCurveValueRange(curveState);

    const numericValue = Number(rawValue);
    const nextValue = Number.isFinite(numericValue) ? numericValue : 0;

    if (field === 'at') {
      const previous = curveState.points[index - 1];
      const next = curveState.points[index + 1];
      const clampedAt = clamp(nextValue, previous ? previous.at + 0.001 : 0, next ? next.at - 0.001 : 1);
      const deltaAt = clampedAt - point.at;
      point.at = clampedAt;
      point.inX += deltaAt;
      point.outX += deltaAt;
    } else {
      const clampedValue = clamp(nextValue, range.min, range.max);
      const deltaValue = clampedValue - point.value;
      point.value = clampedValue;
      point.inY += deltaValue;
      point.outY += deltaValue;
    }

    curveState.modified = true;
    refreshCurveState(curveState);
    syncJsonFromAsset();
    renderPreview();
    return;
  }

  const track = getCurveTrack(scope, trackName);
  if (!track[index]) return;

  const nextValue = Number(rawValue);
  track[index][field] = Number.isFinite(nextValue) ? nextValue : 0;
  setRawTrack(scope, trackName, track);
}

function selectLayer(layerId) {
  state.selectedLayerId = layerId;
  ensureSelection();
  renderLayersPanel();
  renderLayerInspector();
}

function duplicateSelectedLayer() {
  pushUndoCheckpoint();
  const layerIndex = getSelectedLayerIndex();
  if (layerIndex < 0) return;

  const nextAsset = cloneData(state.asset);
  const source = cloneData(nextAsset.layers[layerIndex]);
  const usedIds = new Set(nextAsset.layers.map((layer) => layer.id));
  let suffix = 2;
  let nextId = `${source.id}-copy`;

  while (usedIds.has(nextId)) {
    nextId = `${source.id}-copy-${suffix}`;
    suffix += 1;
  }

  source.id = nextId;
  nextAsset.layers.splice(layerIndex + 1, 0, source);
  state.selectedLayerId = source.id;
  commitAsset(nextAsset, { renderPanels: true });
}

function removeSelectedLayer() {
  pushUndoCheckpoint();
  const layerIndex = getSelectedLayerIndex();
  if (layerIndex < 0) return;

  const nextAsset = cloneData(state.asset);
  nextAsset.layers.splice(layerIndex, 1);
  state.selectedLayerId = nextAsset.layers[layerIndex]?.id ?? nextAsset.layers[layerIndex - 1]?.id ?? '';
  commitAsset(nextAsset, { renderPanels: true });
}

function moveSelectedLayer(direction) {
  pushUndoCheckpoint();
  const layerIndex = getSelectedLayerIndex();
  if (layerIndex < 0) return;

  const nextIndex = layerIndex + direction;
  if (nextIndex < 0 || nextIndex >= state.asset.layers.length) return;

  const nextAsset = cloneData(state.asset);
  const [layer] = nextAsset.layers.splice(layerIndex, 1);
  nextAsset.layers.splice(nextIndex, 0, layer);
  state.selectedLayerId = layer.id;
  commitAsset(nextAsset, { renderPanels: true });
}

function addLayer(type) {
  pushUndoCheckpoint();
  const nextAsset = cloneData(state.asset);
  const layer = createLayer(type);
  nextAsset.layers.push(layer);
  state.selectedLayerId = layer.id;
  state.selectedLayerTrack = TRACKS_BY_LAYER_TYPE[type][0];
  commitAsset(nextAsset, { renderPanels: true });
}

function loadAssetFromObject(asset, { fileHandle = null, fileName = '' } = {}) {
  state.fileHandle = fileHandle;
  state.fileName = fileName;
  state.progress = 0;
  state.playing = true;
  state.lastFrameTime = 0;
  clearCurveEditors();
  clearHistory();
  ui.togglePlaybackButton.textContent = 'Pause';
  commitAsset(asset, { renderPanels: true, resetProgress: true });
  setSaveStatus(
    fileName
      ? `Loaded ${fileName}. You can now save directly back to that file.`
      : 'Loaded effect. Save directly if a local file is attached, or download JSON.',
    'success',
  );
}

function getRecentFileKey(fileName) {
  return `recent-file:${slugify(fileName)}`;
}

async function rememberRecentFile(handle, fileName) {
  if (!handle || !fileName) return;

  const key = getRecentFileKey(fileName);

  try {
    await writeStoredHandle(key, handle);
  } catch (error) {
    console.warn('Could not store recent file handle.', error);
  }

  state.recentFiles = sanitizeRecentFiles([
    { id: key, name: fileName, lastOpenedAt: Date.now() },
    ...state.recentFiles.filter((item) => item.id !== key),
  ]);
  renderToolbarMenus();
  schedulePersistEditorSession();
}

async function openEffectFromHandle(handle) {
  const hasPermission = await ensureHandlePermission(handle, true);
  if (!hasPermission) {
    throw new Error('Permission was not granted for that file.');
  }

  const file = await handle.getFile();
  const text = await file.text();
  const asset = JSON.parse(text);
  loadAssetFromObject(asset, { fileHandle: handle, fileName: file.name });
  await rememberRecentFile(handle, file.name);
}

async function loadDemoEffect(effectId) {
  const path = DEMO_EFFECTS[effectId];
  if (!path) return;

  try {
    const response = await fetch(path);
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    const asset = await response.json();
    loadAssetFromObject(asset, { fileName: `${effectId}.json` });
  } catch (error) {
    setSaveStatus(
      `Could not load ${effectId} from the repo. Serve the repo root with http.server and open /tools/vfx-editor/.`,
      'error',
    );
    console.error(error);
  }
}

async function openEffectFile() {
  try {
    if ('showOpenFilePicker' in window) {
      const [handle] = await window.showOpenFilePicker({
        excludeAcceptAllOption: false,
        multiple: false,
        types: [
          {
            description: 'VFX JSON',
            accept: { 'application/json': ['.json'] },
          },
        ],
      });

      await openEffectFromHandle(handle);
      return;
    }

    ui.fallbackFileInput.click();
  } catch (error) {
    if (error?.name === 'AbortError') return;
    setSaveStatus(`Could not open file: ${error.message}`, 'error');
  }
}

async function loadRecentFile(recentFileId) {
  try {
    const handle = await readStoredHandle(recentFileId);
    if (!handle) {
      state.recentFiles = state.recentFiles.filter((item) => item.id !== recentFileId);
      renderToolbarMenus();
      schedulePersistEditorSession();
      setSaveStatus('That recent file is no longer available. Open it again manually.', 'error');
      return;
    }

    await openEffectFromHandle(handle);
  } catch (error) {
    setSaveStatus(`Could not open recent file: ${error.message}`, 'error');
  }
}

async function writeEffectToHandle(handle, suggestedFileName = '') {
  flushActiveEditorField();
  const exportedAsset = buildExportAsset();
  const writable = await handle.createWritable();
  await writable.write(stringifyAsset(exportedAsset));
  await writable.close();
  state.asset = normalizeAsset(exportedAsset);
  ensureSelection();
  syncJsonFromAsset();
  ui.effectTitleLabel.textContent = `${state.asset.label} Preview`;
  renderPreview();
  state.fileHandle = handle;
  state.fileName = handle.name || suggestedFileName || state.fileName || `${state.asset.id || 'effect'}.json`;
  renderPanels();
  await rememberRecentFile(handle, state.fileName);
}

async function saveToAttachedFile() {
  try {
    if (state.fileHandle && 'createWritable' in state.fileHandle) {
      await writeEffectToHandle(state.fileHandle, state.fileName);
      setSaveStatus(`Saved directly to ${state.fileName}.`, 'success');
      return;
    }

    await saveAsFile();
  } catch (error) {
    if (error?.name === 'AbortError') return;
    setSaveStatus(`Could not save file: ${error.message}`, 'error');
  }
}

async function saveAsFile() {
  try {
    if ('showSaveFilePicker' in window) {
      const handle = await window.showSaveFilePicker({
        suggestedName: `${state.asset.id || 'effect'}.json`,
        types: [
          {
            description: 'VFX JSON',
            accept: { 'application/json': ['.json'] },
          },
        ],
      });

      await writeEffectToHandle(handle, `${state.asset.id || 'effect'}.json`);
      setSaveStatus(`Saved directly to ${state.fileName}.`, 'success');
      return;
    }

    downloadJson();
    setSaveStatus('Direct save is not supported in this browser, so the file was downloaded instead.', 'info');
  } catch (error) {
    if (error?.name === 'AbortError') return;
    setSaveStatus(`Could not save file: ${error.message}`, 'error');
  }
}

function downloadJson() {
  flushActiveEditorField();
  const blob = new Blob([stringifyAsset(buildExportAsset())], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${state.asset.id || 'effect'}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function copyJson() {
  try {
    flushActiveEditorField();
    await navigator.clipboard.writeText(stringifyAsset(buildExportAsset()));
    setSaveStatus('JSON copied to the clipboard.', 'success');
  } catch (error) {
    setSaveStatus(`Could not copy JSON: ${error.message}`, 'error');
  }
}

function applyRawJson() {
  try {
    const asset = JSON.parse(ui.jsonEditor.value);
    state.fileHandle = state.fileHandle ?? null;
    clearCurveEditors();
    loadAssetFromObject(asset, {
      fileHandle: state.fileHandle,
      fileName: state.fileName,
    });
    setJsonStatus('Raw JSON applied to the visual editor.', 'success');
  } catch (error) {
    setJsonStatus(`Could not apply JSON: ${error.message}`, 'error');
  }
}

function flushActiveEditorField() {
  const activeElement = document.activeElement;
  if (
    !(
      activeElement instanceof HTMLInputElement ||
      activeElement instanceof HTMLTextAreaElement ||
      activeElement instanceof HTMLSelectElement
    )
  ) {
    return;
  }

  if (
    !activeElement.closest('#assetPanel, #layerInspectorPanel, #layersPanel, #jsonPanelBody')
  ) {
    return;
  }

  activeElement.blur();
}

function updateInstanceField(field, rawValue) {
  pushUndoCheckpoint();
  const nextValue = Number(rawValue);
  state.instance[field] = Number.isFinite(nextValue) ? nextValue : 0;
  renderPreview();
  renderAssetPanel();
}

function handleAssetPanelInput(event) {
  const target = event.target;
  if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) return;

  if (target.dataset.curvePresetSelect === 'true') {
    if (target.value) {
      applyCurvePreset(target.dataset.curveScope, target.dataset.trackName, target.value);
    }
    return;
  }

  if (target.dataset.assetField) {
    const field = target.dataset.assetField;
    const value = target.type === 'checkbox' ? target.checked : target.value;
    updateAssetField(field, value);
    return;
  }

  if (target.dataset.previewField) {
    updatePreviewField(
      target.dataset.previewField,
      target.value,
      target.dataset.colorPicker === 'true',
    );
    return;
  }

  if (target.dataset.motionField) {
    updateMotionField(target.dataset.motionField, target.value);
    return;
  }

  if (target.dataset.anchorField) {
    updateInstanceField(target.dataset.anchorField, target.value);
    return;
  }

  if (target.dataset.rangeField && target.dataset.curveScope && target.dataset.trackName) {
    if (event.type !== 'change') {
      return;
    }
    setCurveValueRange(
      target.dataset.curveScope,
      target.dataset.trackName,
      target.dataset.rangeField,
      target.value,
    );
    return;
  }

  if (target.dataset.curveScope && target.dataset.trackName && target.dataset.keyIndex != null) {
    updateKeyframe(
      target.dataset.curveScope,
      target.dataset.trackName,
      Number(target.dataset.keyIndex),
      target.dataset.keyField,
      target.value,
    );
  }
}

function handleAssetPanelClick(event) {
  const button = event.target.closest('[data-action]');
  if (!button) return;

  const { action, curveScope, trackName } = button.dataset;

  if (action === 'toggle-collapse') {
    togglePanelCollapse(button.dataset.panelKey);
    renderAssetPanel();
  } else if (action === 'set-editor-mode') {
    setCurveEditorMode(curveScope, trackName, button.dataset.editorMode);
    renderAssetPanel();
  } else if (action === 'apply-curve-preset') {
    applyCurvePreset(curveScope, trackName, button.dataset.presetId);
  } else if (action === 'add-keyframe') {
    addKeyframe(curveScope, trackName);
  } else if (action === 'remove-keyframe') {
    removeKeyframe(curveScope, trackName, Number(button.dataset.keyIndex));
  } else if (action === 'sort-keyframes') {
    sortKeyframes(curveScope, trackName);
  } else if (action === 'clear-keyframes') {
    clearKeyframes(curveScope, trackName);
  }
}

function handleLayersPanelClick(event) {
  const button = event.target.closest('button');
  if (!button) return;

  const { action, layerType, layerId, direction } = button.dataset;

  if (action === 'toggle-collapse') {
    togglePanelCollapse(button.dataset.panelKey);
    renderLayersPanel();
  } else if (action === 'add-layer') {
    addLayer(layerType || state.pendingLayerType);
  } else if (action === 'duplicate-layer') {
    duplicateSelectedLayer();
  } else if (action === 'remove-layer') {
    removeSelectedLayer();
  } else if (action === 'move-layer') {
    moveSelectedLayer(Number(direction));
  } else if (action === 'select-layer') {
    selectLayer(layerId);
  }
}

function handleLayersPanelInput(event) {
  const target = event.target;
  if (!(target instanceof HTMLSelectElement)) return;

  if (target.dataset.layersField === 'pendingLayerType') {
    state.pendingLayerType = LAYER_TYPE_OPTIONS.some((option) => option.value === target.value)
      ? target.value
      : 'orb';
    schedulePersistEditorSession();
  }
}

function handleLayerInspectorInput(event) {
  const target = event.target;
  if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) return;

  if (target.dataset.curvePresetSelect === 'true') {
    if (target.value) {
      applyCurvePreset(target.dataset.curveScope, target.dataset.trackName, target.value);
    }
    return;
  }

  if (target.dataset.layerField) {
    if (target.dataset.layerField === 'id' && event.type !== 'change') {
      return;
    }
    updateSelectedLayerField(
      target.dataset.layerField,
      target.value,
      target.dataset.colorPicker === 'true',
    );
    return;
  }

  if (target.dataset.rangeField && target.dataset.curveScope && target.dataset.trackName) {
    if (event.type !== 'change') {
      return;
    }
    setCurveValueRange(
      target.dataset.curveScope,
      target.dataset.trackName,
      target.dataset.rangeField,
      target.value,
    );
    return;
  }

  if (target.dataset.curveScope && target.dataset.trackName && target.dataset.keyIndex != null) {
    updateKeyframe(
      target.dataset.curveScope,
      target.dataset.trackName,
      Number(target.dataset.keyIndex),
      target.dataset.keyField,
      target.value,
    );
  }
}

function handleLayerInspectorClick(event) {
  const button = event.target.closest('[data-action]');
  if (!button) return;

  const { action, curveScope, trackName } = button.dataset;

  if (action === 'toggle-collapse') {
    togglePanelCollapse(button.dataset.panelKey);
    renderLayerInspector();
  } else if (action === 'select-track') {
    state.selectedLayerTrack = trackName;
    renderLayerInspector();
  } else if (action === 'set-editor-mode') {
    setCurveEditorMode(curveScope, trackName, button.dataset.editorMode);
    renderLayerInspector();
  } else if (action === 'apply-curve-preset') {
    applyCurvePreset(curveScope, trackName, button.dataset.presetId);
  } else if (action === 'add-keyframe') {
    addKeyframe(curveScope, trackName);
  } else if (action === 'remove-keyframe') {
    removeKeyframe(curveScope, trackName, Number(button.dataset.keyIndex));
  } else if (action === 'sort-keyframes') {
    sortKeyframes(curveScope, trackName);
  } else if (action === 'clear-keyframes') {
    clearKeyframes(curveScope, trackName);
  }
}

function handleToolbarMenuInput(event) {
  const target = event.target;
  if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) return;

  if (target.dataset.previewField) {
    updatePreviewField(
      target.dataset.previewField,
      target.value,
      target.dataset.colorPicker === 'true',
    );
  }
}

function handleToolbarMenuClick(event) {
  const button = event.target.closest('[data-toolbar-action]');
  if (!button) return;

  const { toolbarAction, recentFileId, demoEffect } = button.dataset;

  if (toolbarAction === 'open-file') {
    closeToolbarMenus();
    void openEffectFile();
  } else if (toolbarAction === 'save-file') {
    closeToolbarMenus();
    void saveToAttachedFile();
  } else if (toolbarAction === 'save-file-as') {
    closeToolbarMenus();
    void saveAsFile();
  } else if (toolbarAction === 'export-json') {
    closeToolbarMenus();
    downloadJson();
    setSaveStatus(`Exported ${state.asset.id || 'effect'}.json.`, 'success');
  } else if (toolbarAction === 'link-repo-root') {
    closeToolbarMenus();
    void linkRepoRoot();
  } else if (toolbarAction === 'import-sprite') {
    closeToolbarMenus();
    void importSprite();
  } else if (toolbarAction === 'toggle-json-panel') {
    closeToolbarMenus();
    togglePanelCollapse('jsonPanel');
    renderStaticPanelState();
  } else if (toolbarAction === 'open-recent' && recentFileId) {
    closeToolbarMenus();
    void loadRecentFile(recentFileId);
  } else if (toolbarAction === 'load-demo' && demoEffect) {
    closeToolbarMenus();
    void loadDemoEffect(demoEffect);
  }
}

function handleFallbackFileChange(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  file
    .text()
    .then((text) => {
      const asset = JSON.parse(text);
      loadAssetFromObject(asset, { fileName: file.name });
    })
    .catch((error) => {
      setSaveStatus(`Could not read ${file.name}: ${error.message}`, 'error');
    })
    .finally(() => {
      ui.fallbackFileInput.value = '';
    });
}

function getSvgPoint(clientX, clientY) {
  const bounds = ui.stageSvg.getBoundingClientRect();
  if (bounds.width <= 0 || bounds.height <= 0) {
    return { x: 0, y: 0 };
  }
  const viewport = getStageViewport();
  return {
    x: clamp(
      viewport.x + ((clientX - bounds.left) / bounds.width) * viewport.width,
      0,
      STAGE.width,
    ),
    y: clamp(
      viewport.y + ((clientY - bounds.top) / bounds.height) * viewport.height,
      0,
      STAGE.height,
    ),
  };
}

function handleStageWheel(event) {
  if (event.target instanceof Element && event.target.closest('.stage-viewport-toolbar')) {
    return;
  }
  event.preventDefault();
  const direction = event.deltaY < 0 ? 1 : -1;
  const factor =
    direction > 0 ? PREVIEW_VIEWPORT_LIMITS.wheelFactor : 1 / PREVIEW_VIEWPORT_LIMITS.wheelFactor;
  setPreviewZoom(state.previewViewport.zoom * factor, event.clientX, event.clientY);
}

function beginViewportPan(event) {
  if (state.previewViewport.zoom <= 1.001) {
    return false;
  }

  state.activeViewportPan = {
    pointerId: event.pointerId,
    lastClientX: event.clientX,
    lastClientY: event.clientY,
  };
  renderPreviewViewportControls();
  return true;
}

function updateViewportPan(clientX, clientY) {
  if (!state.activeViewportPan) return;

  const bounds = ui.stageSvg.getBoundingClientRect();
  if (bounds.width <= 0 || bounds.height <= 0) {
    return;
  }

  const viewport = getStageViewport();
  const deltaX = clientX - state.activeViewportPan.lastClientX;
  const deltaY = clientY - state.activeViewportPan.lastClientY;
  const nextCenter = clampPreviewViewportCenter(
    state.previewViewport.centerX - (deltaX / bounds.width) * viewport.width,
    state.previewViewport.centerY - (deltaY / bounds.height) * viewport.height,
    viewport.width,
    viewport.height,
  );

  state.previewViewport.centerX = nextCenter.centerX;
  state.previewViewport.centerY = nextCenter.centerY;
  state.activeViewportPan.lastClientX = clientX;
  state.activeViewportPan.lastClientY = clientY;
  renderPreview();
}

function endViewportPan() {
  if (!state.activeViewportPan) return;
  state.activeViewportPan = null;
  renderPreviewViewportControls();
  schedulePersistEditorSession();
}

function handleStagePointerDown(event) {
  if ((event.metaKey || event.ctrlKey) && event.button === 0) {
    if (beginViewportPan(event)) {
      event.preventDefault();
      return;
    }
  }

  const anchor = event.target.closest('[data-anchor]');
  if (!anchor) return;

  beginHistoryGesture();
  state.dragTarget = anchor.dataset.anchor;
}

function handleStagePointerMove(event) {
  if (state.activeViewportPan) {
    updateViewportPan(event.clientX, event.clientY);
    return;
  }

  if (!state.dragTarget) return;

  const point = getSvgPoint(event.clientX, event.clientY);

  if (state.dragTarget === 'start') {
    state.instance.x = point.x;
    state.instance.y = point.y;
  } else if (state.dragTarget === 'target') {
    state.instance.targetX = point.x;
    state.instance.targetY = point.y;
  }

  renderPreview();
  renderAssetPanel();
}

function handleStagePointerUp() {
  endViewportPan();
  endHistoryGesture();
  state.dragTarget = null;
}

function getCurveCanvas(scope, trackName) {
  return document.querySelector(
    `[data-curve-canvas="true"][data-curve-scope="${scope}"][data-track-name="${trackName}"]`,
  );
}

function rerenderCurveOwner(scope) {
  if (scope === 'motion') {
    renderAssetPanel();
  } else {
    renderLayerInspector();
  }
}

function getCurveCanvasPoint(clientX, clientY, canvas, range) {
  const bounds = canvas.getBoundingClientRect();
  const localX = ((clientX - bounds.left) / bounds.width) * CURVE_EDITOR.width;
  const localY = ((clientY - bounds.top) / bounds.height) * CURVE_EDITOR.height;
  return screenToCurvePoint(localX, localY, range);
}

function beginCurveDrag(button) {
  beginHistoryGesture();
  state.activeCurveDrag = {
    scope: button.dataset.curveScope,
    trackName: button.dataset.trackName,
    handleType: button.dataset.handleType,
    pointIndex: Number(button.dataset.pointIndex),
  };
}

function updateCurveDrag(clientX, clientY) {
  if (!state.activeCurveDrag) return;

  const { scope, trackName, handleType, pointIndex } = state.activeCurveDrag;
  const curveState = ensureCurveState(scope, trackName);
  const canvas = getCurveCanvas(scope, trackName);
  if (!canvas) return;

  const range = getCurveValueRange(curveState);
  const targetPoint = getCurveCanvasPoint(clientX, clientY, canvas, range);
  const point = curveState.points[pointIndex];
  if (!point) return;

  const previous = curveState.points[pointIndex - 1];
  const next = curveState.points[pointIndex + 1];

  if (handleType === 'anchor') {
    const newAt = clamp(targetPoint.at, previous ? previous.at + 0.001 : 0, next ? next.at - 0.001 : 1);
    const deltaAt = newAt - point.at;
    const deltaValue = targetPoint.value - point.value;

    point.at = newAt;
    point.value = targetPoint.value;
    point.inX += deltaAt;
    point.inY += deltaValue;
    point.outX += deltaAt;
    point.outY += deltaValue;
  } else if (handleType === 'in') {
    point.inX = clamp(targetPoint.at, previous ? previous.at : point.at, point.at);
    point.inY = targetPoint.value;
  } else if (handleType === 'out') {
    point.outX = clamp(targetPoint.at, point.at, next ? next.at : point.at);
    point.outY = targetPoint.value;
  }

  curveState.modified = true;
  refreshCurveState(curveState);
  syncJsonFromAsset();
  renderPreview();
  rerenderCurveOwner(scope);
}

function endCurveDrag() {
  endHistoryGesture();
  state.activeCurveDrag = null;
}

function handleCurvePointerDown(event) {
  const handle = event.target.closest('[data-action="curve-handle"]');
  if (!handle) return;

  beginCurveDrag(handle);
  event.preventDefault();
}

function handleGlobalKeyDown(event) {
  const isMac = navigator.platform.toUpperCase().includes('MAC');
  const primaryModifier = isMac ? event.metaKey : event.ctrlKey;

  if (!primaryModifier || event.altKey) {
    return;
  }

  const key = event.key.toLowerCase();

  if (key === 'z') {
    event.preventDefault();
    if (event.shiftKey) {
      redoHistory();
    } else {
      undoHistory();
    }
    return;
  }

  if (key === 'y' && !isMac) {
    event.preventDefault();
    redoHistory();
  }
}

function syncJsonEditorFromState() {
  if (state.jsonDirty) {
    ui.jsonEditor.value = state.jsonDraft;
    setJsonStatus('Restored unapplied raw JSON draft from the previous session.');
    return;
  }

  syncJsonFromAsset();
}

function resetTemplate() {
  state.fileHandle = null;
  state.fileName = '';
  state.instance = createInstance();
  state.selectedLayerId = 'trail';
  state.selectedLayerTrack = 'scale';
  state.progress = 0;
  state.playing = true;
  state.lastFrameTime = 0;
  clearCurveEditors();
  clearHistory();
  ui.togglePlaybackButton.textContent = 'Pause';
  commitAsset(createStarterAsset(), { renderPanels: true, resetProgress: true });
  setSaveStatus('Reset to the built-in fireball travel template.', 'success');
}

function animationLoop(timestamp) {
  if (!state.lastFrameTime) {
    state.lastFrameTime = timestamp;
  }

  if (state.playing) {
    const deltaMs = timestamp - state.lastFrameTime;
    const durationMs = Math.max(1, Number(state.asset.durationMs) || 1);
    let nextProgress = state.progress + deltaMs / durationMs;

    if (state.asset.loop) {
      nextProgress %= 1;
    } else if (nextProgress >= 1) {
      nextProgress = 1;
      state.playing = false;
      ui.togglePlaybackButton.textContent = 'Play';
    }

    state.progress = clamp01(nextProgress);
    renderPreview();
  }

  state.lastFrameTime = timestamp;
  window.requestAnimationFrame(animationLoop);
}

function wireEvents() {
  ui.previewResizeHandle.addEventListener('pointerdown', (event) => {
    beginPanelResize('preview');
    event.preventDefault();
  });
  ui.layersResizeHandle.addEventListener('pointerdown', (event) => {
    beginPanelResize('layers');
    event.preventDefault();
  });

  ui.fileMenuContent.addEventListener('click', handleToolbarMenuClick);
  ui.editorMenuContent.addEventListener('click', handleToolbarMenuClick);
  ui.editorMenuContent.addEventListener('input', handleToolbarMenuInput);
  ui.editorMenuContent.addEventListener('change', handleToolbarMenuInput);
  ui.fileMenu.addEventListener('toggle', () => {
    if (ui.fileMenu.open) {
      ui.editorMenu.open = false;
    }
  });
  ui.editorMenu.addEventListener('toggle', () => {
    if (ui.editorMenu.open) {
      ui.fileMenu.open = false;
    }
  });
  ui.jsonCollapseButton.addEventListener('click', () => {
    togglePanelCollapse('jsonPanel');
    renderStaticPanelState();
  });
  ui.applyJsonButton.addEventListener('click', applyRawJson);
  ui.fallbackFileInput.addEventListener('change', handleFallbackFileChange);

  ui.togglePlaybackButton.addEventListener('click', () => {
    state.playing = !state.playing;
    state.lastFrameTime = 0;
    ui.togglePlaybackButton.textContent = state.playing ? 'Pause' : 'Play';
  });

  ui.restartPlaybackButton.addEventListener('click', () => {
    state.progress = 0;
    state.playing = true;
    state.lastFrameTime = 0;
    ui.togglePlaybackButton.textContent = 'Pause';
    renderPreview();
  });

  ui.resetTemplateButton.addEventListener('click', resetTemplate);
  ui.previewDeviceSelect?.addEventListener('change', (event) => {
    state.previewDevice.preset = normalizePreviewDevice({ preset: event.target.value }).preset;
    renderPreview();
    schedulePersistEditorSession();
  });
  ui.safeAreaToggleButton?.addEventListener('click', () => {
    const preset = PREVIEW_DEVICE_PRESETS[state.previewDevice.preset] ?? PREVIEW_DEVICE_PRESETS.free;
    if (!preset.safeArea) {
      return;
    }
    state.previewDevice.showSafeArea = !state.previewDevice.showSafeArea;
    renderPreview();
    schedulePersistEditorSession();
  });
  ui.zoomOutButton?.addEventListener('click', () => {
    setPreviewZoom(state.previewViewport.zoom - PREVIEW_VIEWPORT_LIMITS.buttonStep);
  });
  ui.zoomResetButton?.addEventListener('click', () => {
    state.previewViewport = createDefaultPreviewViewport();
    renderPreview();
    schedulePersistEditorSession();
  });
  ui.zoomInButton?.addEventListener('click', () => {
    setPreviewZoom(state.previewViewport.zoom + PREVIEW_VIEWPORT_LIMITS.buttonStep);
  });

  ui.progressSlider.addEventListener('input', (event) => {
    state.progress = clamp01(Number(event.target.value));
    state.playing = false;
    ui.togglePlaybackButton.textContent = 'Play';
    renderPreview();
  });

  ui.jsonEditor.addEventListener('input', () => {
    state.jsonDraft = ui.jsonEditor.value;
    state.jsonDirty = true;
    setJsonStatus('Raw JSON has local edits. Click "Apply Raw JSON" to load it into the visual editor.');
    schedulePersistEditorSession();
  });

  ui.assetPanel.addEventListener('input', handleAssetPanelInput);
  ui.assetPanel.addEventListener('change', handleAssetPanelInput);
  ui.assetPanel.addEventListener('click', handleAssetPanelClick);
  ui.assetPanel.addEventListener('pointerdown', handleCurvePointerDown);

  ui.layersPanel.addEventListener('click', handleLayersPanelClick);
  ui.layersPanel.addEventListener('input', handleLayersPanelInput);
  ui.layersPanel.addEventListener('change', handleLayersPanelInput);

  ui.layerInspectorPanel.addEventListener('input', handleLayerInspectorInput);
  ui.layerInspectorPanel.addEventListener('change', handleLayerInspectorInput);
  ui.layerInspectorPanel.addEventListener('click', handleLayerInspectorClick);
  ui.layerInspectorPanel.addEventListener('pointerdown', handleCurvePointerDown);

  ui.stageSvg.addEventListener('pointerdown', handleStagePointerDown);
  ui.stageSvg.addEventListener('pointermove', handleStagePointerMove);
  ui.stageSvg.addEventListener('pointerup', handleStagePointerUp);
  ui.stageSvg.addEventListener('pointerleave', handleStagePointerUp);
  ui.stageFrame?.addEventListener('wheel', handleStageWheel, { passive: false });
  window.addEventListener('pointerup', handleStagePointerUp);
  window.addEventListener('pointermove', (event) => {
    updatePanelResize(event.clientX);
    updateCurveDrag(event.clientX, event.clientY);
  });
  window.addEventListener('pointerup', endCurveDrag);
  window.addEventListener('pointerup', endPanelResize);
  window.addEventListener('resize', () => {
    applyLayoutSizes();
    renderPreview();
  });
  window.addEventListener('keydown', handleGlobalKeyDown);
  window.addEventListener('pointerdown', (event) => {
    if (!(event.target instanceof Node)) return;
    if (ui.fileMenu.contains(event.target) || ui.editorMenu.contains(event.target)) {
      return;
    }
    closeToolbarMenus();
  });
  window.addEventListener('beforeunload', persistEditorSessionNow);
}

async function init() {
  await loadSpriteManifest();
  await restoreLinkedRepoRootHandle();
  const restoredSessionSource = await restorePersistedEditorSessionFromSources();
  applyLayoutSizes();
  renderPanels();
  renderPreview();
  syncJsonEditorFromState();
  setSaveStatus(
    restoredSessionSource === 'file'
      ? 'Restored the last editor session from tools/vfx-editor/editor-session.json.'
      : restoredSessionSource === 'browser'
        ? 'Restored the last editor session from this browser.'
      : 'Open an effect JSON or quick-load one from the repo.',
  );
  ui.togglePlaybackButton.textContent = 'Pause';
  wireEvents();
  window.requestAnimationFrame(animationLoop);
}

init();
