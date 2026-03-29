const STAGE = { width: 720, height: 420 };

const DEMO_EFFECTS = {
  'fireball-muzzle': '../../src/features/vfx/assets/effects/fireball-muzzle.json',
  'fireball-travel': '../../src/features/vfx/assets/effects/fireball-travel.json',
  'fireball-impact': '../../src/features/vfx/assets/effects/fireball-impact.json',
  'frostbolt-travel': '../../src/features/vfx/assets/effects/frostbolt-travel.json',
  'frostbolt-impact': '../../src/features/vfx/assets/effects/frostbolt-impact.json',
};

const STARTER_SEQUENCE = {
  id: 'fireball-cast',
  label: 'Fireball Cast',
  cues: [
    { id: 'muzzle', assetId: 'fireball-muzzle', atMs: 0, anchor: 'caster' },
    {
      id: 'travel',
      assetId: 'fireball-travel',
      atMs: 40,
      anchor: 'caster',
      targetAnchor: 'target',
    },
    { id: 'impact', assetId: 'fireball-impact', atMs: 1240, anchor: 'target' },
  ],
};

const SPRITE_MANIFEST_PATH = '../../src/features/vfx/assets/sprites/manifest.json';
const SPRITE_EDITOR_BASE_PATH = '../../src/features/vfx/assets/sprites';
const PREVIEW_BACKDROP = {
  top: '#1c1214',
  bottom: '#0d0b10',
  glow: '#df945c',
  grid: 'rgba(255, 227, 187, 0.08)',
  ground: 'rgba(255, 235, 211, 0.08)',
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
const PREVIEW_VIEWPORT_LIMITS = {
  minZoom: 0.5,
  maxZoom: 4,
  buttonStep: 0.25,
  wheelFactor: 1.12,
};
const SEQUENCE_SESSION_STORAGE_KEY = 'questing-together:vfx-sequence-composer-session:v1';
const SEQUENCE_SESSION_FILE_NAME = 'sequence-composer-session.json';
const SEQUENCE_SESSION_FETCH_PATH = `./${SEQUENCE_SESSION_FILE_NAME}`;
const HANDLE_DB_NAME = 'questing-together-vfx-editor';
const HANDLE_DB_VERSION = 1;
const HANDLE_STORE_NAME = 'file-system-handles';
const REPO_ROOT_HANDLE_KEY = 'repo-root';
const REPO_EDITOR_SEGMENTS = ['tools', 'vfx-editor'];
const REPO_EFFECTS_SEGMENTS = ['src', 'features', 'vfx', 'assets', 'effects'];
const REPO_SEQUENCES_SEGMENTS = ['src', 'features', 'vfx', 'assets', 'sequences'];
const REPO_RUNTIME_SEGMENTS = ['src', 'features', 'vfx', 'runtime'];
const SEQUENCE_REGISTRY_FILE = 'sequenceRegistry.ts';

const ui = {
  sequenceTitleLabel: document.getElementById('sequenceTitleLabel'),
  fileStatusLabel: document.getElementById('fileStatusLabel'),
  saveStatusLabel: document.getElementById('saveStatusLabel'),
  progressPercentLabel: document.getElementById('progressPercentLabel'),
  progressTimeLabel: document.getElementById('progressTimeLabel'),
  playPauseButton: document.getElementById('playPauseButton'),
  restartButton: document.getElementById('restartButton'),
  sequenceIdInput: document.getElementById('sequenceIdInput'),
  sequenceLabelInput: document.getElementById('sequenceLabelInput'),
  pendingAssetSelect: document.getElementById('pendingAssetSelect'),
  viewerStageFrame: document.getElementById('viewerStageFrame'),
  viewerDeviceSelect: document.getElementById('viewerDeviceSelect'),
  viewerSafeAreaToggleButton: document.getElementById('viewerSafeAreaToggleButton'),
  viewerZoomOutButton: document.getElementById('viewerZoomOutButton'),
  viewerZoomResetButton: document.getElementById('viewerZoomResetButton'),
  viewerZoomInButton: document.getElementById('viewerZoomInButton'),
  viewerStageViewportSurface: document.getElementById('viewerStageViewportSurface'),
  viewerStageSvg: document.getElementById('viewerStageSvg'),
  viewerSafeAreaOverlay: document.getElementById('viewerSafeAreaOverlay'),
  viewerSafeAreaTop: document.getElementById('viewerSafeAreaTop'),
  viewerSafeAreaRight: document.getElementById('viewerSafeAreaRight'),
  viewerSafeAreaBottom: document.getElementById('viewerSafeAreaBottom'),
  viewerSafeAreaLeft: document.getElementById('viewerSafeAreaLeft'),
  viewerSafeAreaGuide: document.getElementById('viewerSafeAreaGuide'),
  viewerResizeHandle: document.getElementById('viewerResizeHandle'),
  timelineRulerTrack: document.getElementById('timelineRulerTrack'),
  timelineRows: document.getElementById('timelineRows'),
  sequenceFileNameLabel: document.getElementById('sequenceFileNameLabel'),
  cueInspectorBody: document.getElementById('cueInspectorBody'),
  fallbackFileInput: document.getElementById('fallbackFileInput'),
};

const state = {
  effectMeta: {},
  spriteLibrary: {},
  sequence: normalizeSequence(STARTER_SEQUENCE),
  selectedCueId: 'muzzle',
  pendingAssetId: 'fireball-travel',
  fileHandle: null,
  fileName: '',
  playing: false,
  progressMs: 0,
  lastFrameTime: 0,
  activeCueDrag: null,
  activeAnchorDrag: null,
  activeViewerResize: null,
  previewDevice: createDefaultPreviewDevice(),
  previewViewport: createDefaultPreviewViewport(),
  viewerHeight: 396,
  instance: createPreviewInstance(),
  repoRootHandle: null,
  undoStack: [],
  redoStack: [],
  historyGestureSnapshot: null,
};

function createPreviewInstance() {
  return {
    x: 120,
    y: 308,
    targetX: 560,
    targetY: 120,
  };
}

function createDefaultPreviewDevice() {
  return {
    preset: 'free',
    showSafeArea: true,
  };
}

function createDefaultPreviewViewport() {
  return {
    zoom: 1,
    centerX: STAGE.width / 2,
    centerY: STAGE.height / 2,
  };
}

function createHistorySnapshot() {
  return {
    sequence: cloneData(state.sequence),
    selectedCueId: state.selectedCueId,
    pendingAssetId: state.pendingAssetId,
    fileName: state.fileName,
    previewDevice: cloneData(state.previewDevice),
    previewViewport: cloneData(state.previewViewport),
    viewerHeight: state.viewerHeight,
    instance: cloneData(state.instance),
  };
}

function applyHistorySnapshot(snapshot) {
  state.sequence = normalizeSequence(snapshot.sequence ?? STARTER_SEQUENCE);
  state.selectedCueId = typeof snapshot.selectedCueId === 'string' ? snapshot.selectedCueId : '';
  state.pendingAssetId =
    typeof snapshot.pendingAssetId === 'string' ? snapshot.pendingAssetId : state.pendingAssetId;
  state.fileName = typeof snapshot.fileName === 'string' ? snapshot.fileName : state.fileName;
  state.previewDevice = normalizePreviewDevice(snapshot.previewDevice);
  state.previewViewport = normalizePreviewViewport(snapshot.previewViewport);
  state.viewerHeight = Number.isFinite(Number(snapshot.viewerHeight))
    ? Number(snapshot.viewerHeight)
    : state.viewerHeight;
  state.instance = normalizeInstance(snapshot.instance);
  state.playing = false;
  state.progressMs = 0;
  state.lastFrameTime = 0;
  state.activeCueDrag = null;
  state.activeAnchorDrag = null;
  state.activeViewerResize = null;
  ensureSelection();
  render();
  schedulePersistSequenceSession();
}

function pushUndoCheckpoint() {
  state.undoStack.push(createHistorySnapshot());
  if (state.undoStack.length > 100) {
    state.undoStack.shift();
  }
  state.redoStack = [];
}

function beginHistoryGesture() {
  if (!state.historyGestureSnapshot) {
    state.historyGestureSnapshot = createHistorySnapshot();
  }
}

function endHistoryGesture() {
  if (!state.historyGestureSnapshot) {
    return;
  }

  state.undoStack.push(state.historyGestureSnapshot);
  if (state.undoStack.length > 100) {
    state.undoStack.shift();
  }
  state.redoStack = [];
  state.historyGestureSnapshot = null;
}

function undo() {
  const snapshot = state.undoStack.pop();
  if (!snapshot) {
    return;
  }

  state.redoStack.push(createHistorySnapshot());
  applyHistorySnapshot(snapshot);
}

function redo() {
  const snapshot = state.redoStack.pop();
  if (!snapshot) {
    return;
  }

  state.undoStack.push(createHistorySnapshot());
  applyHistorySnapshot(snapshot);
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

function slugify(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'sequence';
}

function titleCaseFromId(value) {
  return String(value)
    .split(/[-_]+/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getRegistryImportName(prefix, value, suffix = 'Data', usedNames = new Set()) {
  const camel = slugify(value).replace(/-([a-z0-9])/g, (_, char) => char.toUpperCase());
  const base = /^[a-zA-Z_$]/.test(camel)
    ? `${camel}${suffix}`
    : `${prefix}${camel.charAt(0).toUpperCase()}${camel.slice(1)}${suffix}`;
  let candidate = base;
  let index = 2;

  while (usedNames.has(candidate)) {
    candidate = `${base}${index}`;
    index += 1;
  }

  usedNames.add(candidate);
  return candidate;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatMs(value) {
  return `${Math.round(value)} ms`;
}

function setStatus(message, type = 'info') {
  ui.saveStatusLabel.textContent = message;
  ui.saveStatusLabel.style.color = type === 'error' ? '#ffb3b3' : '';
}

async function writeTextFile(directoryHandle, filename, contents) {
  const fileHandle = await directoryHandle.getFileHandle(filename, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(contents);
  await writable.close();
}

async function discoverRepoSequenceEntries(rootHandle) {
  const sequencesDirHandle = await getDirectoryHandle(rootHandle, REPO_SEQUENCES_SEGMENTS);
  const entries = [];

  for await (const handle of sequencesDirHandle.values()) {
    if (handle.kind !== 'file' || !handle.name.endsWith('.json')) {
      continue;
    }

    const file = await handle.getFile();
    const sequence = normalizeSequence(JSON.parse(await file.text()));
    entries.push({
      id: sequence.id,
      label: sequence.label ?? titleCaseFromId(sequence.id),
      filename: handle.name,
    });
  }

  return entries.sort((left, right) => left.id.localeCompare(right.id));
}

function buildSequenceRegistrySource(entries) {
  const usedNames = new Set();
  const imports = entries
    .map((entry) => {
      const importName = getRegistryImportName('sequence', entry.id, 'Data', usedNames);
      entry.importName = importName;
      return `import ${importName} from '@/features/vfx/assets/sequences/${entry.filename}';`;
    })
    .join('\n');

  const sequenceNames = entries.map((entry) => `  ${entry.importName},`).join('\n');

  return `import type { EffectSequence } from '@/features/vfx/types/sequences';\n${imports}\n\nconst effectSequences = [\n${sequenceNames}\n] as EffectSequence[];\n\nconst effectSequenceById = new Map(effectSequences.map((sequence) => [sequence.id, sequence]));\n\nexport function getEffectSequence(sequenceId: string) {\n  return effectSequenceById.get(sequenceId) ?? null;\n}\n\nexport function listEffectSequences() {\n  return effectSequences;\n}\n`;
}

async function regenerateSequenceRegistry(rootHandle) {
  const hasPermission = await ensureHandlePermission(rootHandle, true);
  if (!hasPermission) {
    throw new Error('Permission was not granted for the linked repo root.');
  }
  const runtimeDirHandle = await getDirectoryHandle(rootHandle, REPO_RUNTIME_SEGMENTS);
  const entries = await discoverRepoSequenceEntries(rootHandle);
  await writeTextFile(
    runtimeDirHandle,
    SEQUENCE_REGISTRY_FILE,
    buildSequenceRegistrySource(entries),
  );
  return entries;
}

let handleDatabasePromise = null;
let persistSessionTimer = null;
let persistSessionFilePromise = Promise.resolve();

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

async function getDirectoryHandle(rootHandle, segments) {
  let current = rootHandle;

  for (const segment of segments) {
    current = await current.getDirectoryHandle(segment, { create: true });
  }

  return current;
}

function normalizeInstance(rawInstance) {
  const defaults = createPreviewInstance();
  return {
    x: Number.isFinite(Number(rawInstance?.x)) ? Number(rawInstance.x) : defaults.x,
    y: Number.isFinite(Number(rawInstance?.y)) ? Number(rawInstance.y) : defaults.y,
    targetX: Number.isFinite(Number(rawInstance?.targetX)) ? Number(rawInstance.targetX) : defaults.targetX,
    targetY: Number.isFinite(Number(rawInstance?.targetY)) ? Number(rawInstance.targetY) : defaults.targetY,
  };
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

function buildPersistedSequenceSession() {
  return {
    sequence: cloneData(state.sequence),
    selectedCueId: state.selectedCueId,
    pendingAssetId: state.pendingAssetId,
    fileName: state.fileName,
    previewDevice: cloneData(state.previewDevice),
    previewViewport: cloneData(state.previewViewport),
    viewerHeight: state.viewerHeight,
    instance: cloneData(state.instance),
  };
}

function persistSequenceSessionToFileIfPossible() {
  if (!state.repoRootHandle) {
    return Promise.resolve(false);
  }

  const payload = `${JSON.stringify(buildPersistedSequenceSession(), null, 2)}\n`;

  persistSessionFilePromise = persistSessionFilePromise
    .catch(() => {})
    .then(async () => {
      const editorDirHandle = await getDirectoryHandle(state.repoRootHandle, REPO_EDITOR_SEGMENTS);
      await writeTextFile(editorDirHandle, SEQUENCE_SESSION_FILE_NAME, payload);
      return true;
    })
    .catch((error) => {
      console.warn('Could not persist sequence composer session file.', error);
      return false;
    });

  return persistSessionFilePromise;
}

function persistSequenceSessionNow() {
  try {
    window.localStorage.setItem(
      SEQUENCE_SESSION_STORAGE_KEY,
      JSON.stringify(buildPersistedSequenceSession()),
    );
  } catch (error) {
    console.warn('Could not persist sequence composer session.', error);
  }

  void persistSequenceSessionToFileIfPossible();
}

function schedulePersistSequenceSession() {
  if (persistSessionTimer != null) {
    window.clearTimeout(persistSessionTimer);
  }

  persistSessionTimer = window.setTimeout(() => {
    persistSessionTimer = null;
    persistSequenceSessionNow();
  }, 120);
}

function applyPersistedSequenceSession(persisted) {
  if (!persisted || typeof persisted !== 'object') {
    return false;
  }

  state.sequence = normalizeSequence(persisted.sequence ?? STARTER_SEQUENCE);
  state.selectedCueId =
    typeof persisted.selectedCueId === 'string' ? persisted.selectedCueId : state.sequence.cues[0]?.id ?? '';
  state.pendingAssetId =
    typeof persisted.pendingAssetId === 'string' ? persisted.pendingAssetId : state.pendingAssetId;
  state.fileHandle = null;
  state.fileName = typeof persisted.fileName === 'string' ? persisted.fileName : '';
  state.previewDevice = normalizePreviewDevice(persisted.previewDevice);
  state.previewViewport = normalizePreviewViewport(persisted.previewViewport);
  state.viewerHeight = Number.isFinite(Number(persisted.viewerHeight))
    ? Number(persisted.viewerHeight)
    : state.viewerHeight;
  state.instance = normalizeInstance(persisted.instance);
  state.playing = false;
  state.progressMs = 0;
  state.lastFrameTime = 0;
  state.activeCueDrag = null;
  state.activeAnchorDrag = null;
  state.activeViewerResize = null;
  ensureSelection();
  return true;
}

function restorePersistedSequenceSession() {
  try {
    const rawSession = window.localStorage.getItem(SEQUENCE_SESSION_STORAGE_KEY);
    if (!rawSession) return false;

    return applyPersistedSequenceSession(JSON.parse(rawSession));
  } catch (error) {
    console.warn('Could not restore sequence composer session.', error);
    return false;
  }
}

async function loadPersistedSequenceSessionFromFile() {
  try {
    const response = await fetch(SEQUENCE_SESSION_FETCH_PATH, { cache: 'no-store' });
    if (!response.ok) {
      return null;
    }

    const persisted = await response.json();
    return persisted && typeof persisted === 'object' ? persisted : null;
  } catch (error) {
    return null;
  }
}

async function restorePersistedSequenceSessionFromSources() {
  const fileSession = await loadPersistedSequenceSessionFromFile();
  if (fileSession) {
    try {
      window.localStorage.setItem(SEQUENCE_SESSION_STORAGE_KEY, JSON.stringify(fileSession));
    } catch (error) {
      console.warn('Could not mirror sequence session into local storage.', error);
    }
    return applyPersistedSequenceSession(fileSession) ? 'file' : null;
  }

  return restorePersistedSequenceSession() ? 'browser' : null;
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

    state.repoRootHandle = handle;
    return true;
  } catch (error) {
    console.warn('Could not restore the linked repo root for the sequence composer.', error);
    return false;
  }
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

function clampViewportOrigin(x, y, width, height) {
  return {
    x: clamp(x, STAGE.width - width, 0),
    y: clamp(y, STAGE.height - height, 0),
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
    !ui.viewerSafeAreaOverlay ||
    !ui.viewerSafeAreaTop ||
    !ui.viewerSafeAreaRight ||
    !ui.viewerSafeAreaBottom ||
    !ui.viewerSafeAreaLeft ||
    !ui.viewerSafeAreaGuide
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

  ui.viewerSafeAreaOverlay.hidden = !shouldShow;
  if (!shouldShow) {
    return;
  }

  const scaleX = width / preset.width;
  const scaleY = height / preset.height;
  const top = (safeArea.top ?? 0) * scaleY;
  const right = (safeArea.right ?? 0) * scaleX;
  const bottom = (safeArea.bottom ?? 0) * scaleY;
  const left = (safeArea.left ?? 0) * scaleX;

  ui.viewerSafeAreaTop.style.cssText = `top:0;left:0;right:0;height:${top}px;`;
  ui.viewerSafeAreaRight.style.cssText = `top:0;right:0;bottom:0;width:${right}px;`;
  ui.viewerSafeAreaBottom.style.cssText = `left:0;right:0;bottom:0;height:${bottom}px;`;
  ui.viewerSafeAreaLeft.style.cssText = `top:0;left:0;bottom:0;width:${left}px;`;
  ui.viewerSafeAreaGuide.style.cssText = `top:${top}px;right:${right}px;bottom:${bottom}px;left:${left}px;`;
}

function getMaxViewerHeight() {
  return Math.max(320, window.innerHeight - 280);
}

function applyViewerFrameSize() {
  if (!ui.viewerStageFrame) {
    return;
  }

  state.viewerHeight = clamp(state.viewerHeight, 260, getMaxViewerHeight());
  ui.viewerStageFrame.style.height = `${state.viewerHeight}px`;
}

function applyViewerViewportFrame() {
  const surface = ui.viewerStageViewportSurface;
  const frame = ui.viewerStageFrame;
  if (!surface || !frame) {
    return;
  }

  applyViewerFrameSize();

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

function getViewerContainerAspect() {
  const bounds = ui.viewerStageViewportSurface?.getBoundingClientRect();
  if (!bounds || bounds.width <= 0 || bounds.height <= 0) {
    return STAGE.width / STAGE.height;
  }

  return bounds.width / bounds.height;
}

function getViewportDimensionsForZoom(zoom) {
  const safeZoom = clamp(zoom, PREVIEW_VIEWPORT_LIMITS.minZoom, PREVIEW_VIEWPORT_LIMITS.maxZoom);
  const containerAspect = getViewerContainerAspect();
  const stageAspect = STAGE.width / STAGE.height;

  if (containerAspect >= stageAspect) {
    const height = STAGE.height / safeZoom;
    return { width: height * containerAspect, height };
  }

  const width = STAGE.width / safeZoom;
  return { width, height: width / containerAspect };
}

function getViewerViewport() {
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

function renderViewerViewportControls() {
  if (!ui.viewerZoomResetButton) {
    return;
  }

  const preset = PREVIEW_DEVICE_PRESETS[state.previewDevice.preset] ?? PREVIEW_DEVICE_PRESETS.free;
  ui.viewerZoomResetButton.textContent = `${Math.round(state.previewViewport.zoom * 100)}%`;
  ui.viewerDeviceSelect.value = state.previewDevice.preset;
  ui.viewerSafeAreaToggleButton.classList.toggle('is-active', state.previewDevice.showSafeArea);
  ui.viewerSafeAreaToggleButton.disabled = !preset.safeArea;
  ui.viewerSafeAreaToggleButton.textContent = 'Safe Area';
}

function setViewerZoom(nextZoom, focusClientX = null, focusClientY = null) {
  const zoom = clamp(nextZoom, PREVIEW_VIEWPORT_LIMITS.minZoom, PREVIEW_VIEWPORT_LIMITS.maxZoom);
  if (Math.abs(zoom - state.previewViewport.zoom) < 0.0001) {
    renderViewerViewportControls();
    return;
  }

  const previousViewport = getViewerViewport();
  const nextDimensions = getViewportDimensionsForZoom(zoom);
  let nextCenterX = state.previewViewport.centerX;
  let nextCenterY = state.previewViewport.centerY;

  if (Number.isFinite(focusClientX) && Number.isFinite(focusClientY)) {
    const bounds = ui.viewerStageSvg?.getBoundingClientRect();
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

  pushUndoCheckpoint();
  state.previewViewport.zoom = zoom;
  state.previewViewport.centerX = nextCenter.centerX;
  state.previewViewport.centerY = nextCenter.centerY;
  renderViewer();
  schedulePersistSequenceSession();
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
    state.spriteLibrary = buildSpriteLibraryFromManifest(entries);
  } catch (error) {
    console.error('Could not load sprite manifest', error);
    state.spriteLibrary = {};
  }
}

function getDefaultSpriteId() {
  return Object.keys(state.spriteLibrary)[0] ?? '';
}

function hasSpriteDefinition(spriteId) {
  return Boolean(spriteId && state.spriteLibrary[spriteId]);
}

function getSpriteDefinition(spriteId) {
  return state.spriteLibrary[spriteId] ?? state.spriteLibrary[getDefaultSpriteId()] ?? null;
}

function getSpritePreviewSrc(spriteId) {
  return getSpriteDefinition(spriteId)?.src ?? '';
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

function applyTrailStyleDefaults(layer) {
  const style = ['fill', 'ring', 'streak', 'diamond', 'arc', 'starburst', 'sprite'].includes(layer.style)
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
    layer.rotationDeg = Number.isFinite(Number(layer.rotationDeg)) ? Number(layer.rotationDeg) : -90;
  }

  if (style === 'starburst') {
    layer.innerRadius = Number.isFinite(Number(layer.innerRadius)) ? Number(layer.innerRadius) : 6;
    layer.outerRadius = Number.isFinite(Number(layer.outerRadius)) ? Number(layer.outerRadius) : 14;
    layer.points = Number.isFinite(Number(layer.points))
      ? Math.max(3, Math.round(Number(layer.points)))
      : 6;
    layer.rotationDeg = Number.isFinite(Number(layer.rotationDeg)) ? Number(layer.rotationDeg) : -90;
  }

  return layer;
}

function normalizeAsset(rawAsset) {
  const asset = cloneData(rawAsset ?? {});

  asset.id = typeof asset.id === 'string' ? asset.id : 'new-effect';
  asset.label = typeof asset.label === 'string' ? asset.label : titleCaseFromId(asset.id);
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

  asset.layers = asset.layers.map((rawLayer, index) => {
    const layer = cloneData(rawLayer ?? {});
    layer.id = typeof layer.id === 'string' ? layer.id : `layer-${index + 1}`;
    layer.type = ['orb', 'ring', 'trail', 'streak', 'diamond', 'arc', 'starburst', 'sprite'].includes(layer.type)
      ? layer.type
      : 'orb';
    layer.tracks = typeof layer.tracks === 'object' && layer.tracks ? layer.tracks : {};

    for (const trackName of Object.keys(layer.tracks)) {
      layer.tracks[trackName] = normalizeTrack(layer.tracks[trackName]);
    }

    if (layer.type === 'sprite') {
      layer.spriteId =
        typeof layer.spriteId === 'string' && hasSpriteDefinition(layer.spriteId)
          ? layer.spriteId
          : getDefaultSpriteId();
      layer.width = Number.isFinite(Number(layer.width)) ? Number(layer.width) : 36;
      layer.height = Number.isFinite(Number(layer.height)) ? Number(layer.height) : 36;
      layer.tintColor = typeof layer.tintColor === 'string' ? layer.tintColor : undefined;
      return layer;
    }

    layer.radius = Number.isFinite(Number(layer.radius)) ? Number(layer.radius) : 10;
    layer.color = typeof layer.color === 'string' ? layer.color : '#ffffff';

    if (layer.type === 'streak' || layer.type === 'diamond') {
      layer.width = Number.isFinite(Number(layer.width)) ? Number(layer.width) : 42;
      layer.height = Number.isFinite(Number(layer.height)) ? Number(layer.height) : 16;
      layer.rotationDeg = Number.isFinite(Number(layer.rotationDeg)) ? Number(layer.rotationDeg) : 0;
      return layer;
    }

    if (layer.type === 'arc') {
      layer.thickness = Number.isFinite(Number(layer.thickness)) ? Number(layer.thickness) : 4;
      layer.sweepDeg = Number.isFinite(Number(layer.sweepDeg)) ? Number(layer.sweepDeg) : 120;
      layer.rotationDeg = Number.isFinite(Number(layer.rotationDeg)) ? Number(layer.rotationDeg) : -90;
      return layer;
    }

    if (layer.type === 'starburst') {
      layer.innerRadius = Number.isFinite(Number(layer.innerRadius)) ? Number(layer.innerRadius) : 8;
      layer.outerRadius = Number.isFinite(Number(layer.outerRadius)) ? Number(layer.outerRadius) : 18;
      layer.points = Number.isFinite(Number(layer.points))
        ? Math.max(3, Math.round(Number(layer.points)))
        : 6;
      layer.rotationDeg = Number.isFinite(Number(layer.rotationDeg)) ? Number(layer.rotationDeg) : -90;
      return layer;
    }

    if (layer.type === 'orb') {
      layer.glowScale = Number.isFinite(Number(layer.glowScale)) ? Number(layer.glowScale) : undefined;
      layer.glowColor = typeof layer.glowColor === 'string' ? layer.glowColor : undefined;
    }

    if (layer.type === 'ring') {
      layer.thickness = Number.isFinite(Number(layer.thickness)) ? Number(layer.thickness) : 4;
    }

    if (layer.type === 'trail') {
      layer.thickness = Number.isFinite(Number(layer.thickness)) ? Number(layer.thickness) : undefined;
      layer.width = Number.isFinite(Number(layer.width)) ? Number(layer.width) : undefined;
      layer.height = Number.isFinite(Number(layer.height)) ? Number(layer.height) : undefined;
      layer.rotationDeg = Number.isFinite(Number(layer.rotationDeg)) ? Number(layer.rotationDeg) : undefined;
      layer.sweepDeg = Number.isFinite(Number(layer.sweepDeg)) ? Number(layer.sweepDeg) : undefined;
      layer.innerRadius = Number.isFinite(Number(layer.innerRadius)) ? Number(layer.innerRadius) : undefined;
      layer.outerRadius = Number.isFinite(Number(layer.outerRadius)) ? Number(layer.outerRadius) : undefined;
      layer.points = Number.isFinite(Number(layer.points))
        ? Math.max(3, Math.round(Number(layer.points)))
        : undefined;
      layer.tintColor = typeof layer.tintColor === 'string' ? layer.tintColor : undefined;
      applyTrailStyleDefaults(layer);
    }

    return layer;
  });

  return asset;
}

function normalizeSequence(rawSequence) {
  const sequence = cloneData(rawSequence ?? {});
  sequence.id = typeof sequence.id === 'string' ? sequence.id : 'new-sequence';
  sequence.label = typeof sequence.label === 'string' ? sequence.label : titleCaseFromId(sequence.id);
  sequence.cues = Array.isArray(sequence.cues) ? sequence.cues : [];
  sequence.cues = sequence.cues
    .map((cue, index) => ({
      id: typeof cue?.id === 'string' ? cue.id : `${sequence.id}-cue-${index + 1}`,
      assetId: typeof cue?.assetId === 'string' ? cue.assetId : '',
      atMs: Number.isFinite(Number(cue?.atMs)) ? Math.max(0, Number(cue.atMs)) : 0,
      durationMs: Number.isFinite(Number(cue?.durationMs)) ? Math.max(1, Number(cue.durationMs)) : undefined,
      anchor: ['caster', 'target', 'projectile'].includes(cue?.anchor) ? cue.anchor : 'caster',
      targetAnchor:
        typeof cue?.targetAnchor === 'string' &&
        ['caster', 'target', 'projectile'].includes(cue.targetAnchor)
          ? cue.targetAnchor
          : undefined,
      travelT: Number.isFinite(Number(cue?.travelT)) ? clamp01(Number(cue.travelT)) : undefined,
    }))
    .filter((cue) => cue.assetId);
  return sequence;
}

function getSelectedCue() {
  return state.sequence.cues.find((cue) => cue.id === state.selectedCueId) ?? null;
}

function getEffectDuration(assetId) {
  return state.effectMeta[assetId]?.durationMs ?? 320;
}

function getEffectLabel(assetId) {
  return state.effectMeta[assetId]?.label ?? titleCaseFromId(assetId);
}

function getEffectAsset(assetId) {
  return state.effectMeta[assetId]?.asset ?? null;
}

function getCueDuration(cue) {
  return Math.max(1, cue.durationMs ?? getEffectDuration(cue.assetId));
}

function getTimelineDuration() {
  if (!state.sequence.cues.length) {
    return 800;
  }

  return Math.max(
    800,
    state.sequence.cues.reduce(
      (maxDuration, cue) => Math.max(maxDuration, cue.atMs + getCueDuration(cue)),
      0,
    ) + 20,
  );
}

async function loadEffectAssets() {
  const repoEntries = await loadEffectAssetsFromRepoHandle();
  if (repoEntries.length > 0) {
    state.effectMeta = Object.fromEntries(repoEntries);
    return;
  }

  const fallbackEntries = await loadEffectAssetsFromFetch();
  state.effectMeta = Object.fromEntries(fallbackEntries);
}

async function loadEffectAssetsFromRepoHandle() {
  if (!state.repoRootHandle) {
    return [];
  }

  try {
    const hasPermission = await ensureHandlePermission(state.repoRootHandle, true);
    if (!hasPermission) {
      return [];
    }

    const effectsDirHandle = await getDirectoryHandle(state.repoRootHandle, REPO_EFFECTS_SEGMENTS);
    const entries = [];

    for await (const handle of effectsDirHandle.values()) {
      if (handle.kind !== 'file' || !handle.name.endsWith('.json')) {
        continue;
      }

      try {
        const file = await handle.getFile();
        const asset = normalizeAsset(JSON.parse(await file.text()));
        entries.push([
          asset.id,
          {
            label: asset.label ?? titleCaseFromId(asset.id),
            durationMs: asset.durationMs ?? 320,
            asset,
          },
        ]);
      } catch (error) {
        console.warn(`Could not load effect asset from ${handle.name}.`, error);
      }
    }

    return entries.sort((left, right) => left[1].label.localeCompare(right[1].label));
  } catch (error) {
    console.warn('Could not discover effect assets from the linked repo root.', error);
    return [];
  }
}

async function loadEffectAssetsFromFetch() {
  const entries = await Promise.all(
    Object.entries(DEMO_EFFECTS).map(async ([assetId, path]) => {
      try {
        const response = await fetch(path, { cache: 'no-store' });
        if (!response.ok) {
          throw new Error(String(response.status));
        }

        const asset = normalizeAsset(await response.json());
        return [
          assetId,
          {
            label: asset.label ?? titleCaseFromId(assetId),
            durationMs: asset.durationMs ?? 320,
            asset,
          },
        ];
      } catch (error) {
        return [
          assetId,
          {
            label: titleCaseFromId(assetId),
            durationMs: 320,
            asset: null,
          },
        ];
      }
    }),
  );

  return entries;
}

async function refreshEffectAssets({ rerender = true } = {}) {
  await loadEffectAssets();
  ensureSelection();

  if (rerender) {
    render();
  }
}

function ensureSelection() {
  if (!state.sequence.cues.some((cue) => cue.id === state.selectedCueId)) {
    state.selectedCueId = state.sequence.cues[0]?.id ?? '';
  }

  const effectIds = Object.keys(state.effectMeta);
  if (!effectIds.includes(state.pendingAssetId)) {
    state.pendingAssetId = effectIds[0] ?? '';
  }
}

function renderToolbar() {
  ui.sequenceTitleLabel.textContent = state.sequence.label;
  ui.sequenceIdInput.value = state.sequence.id;
  ui.sequenceLabelInput.value = state.sequence.label;
  ui.fileStatusLabel.textContent = state.fileName ? `Attached file: ${state.fileName}` : 'No sequence file attached';
  ui.sequenceFileNameLabel.textContent = state.fileName
    ? `Sequence file: ${state.fileName}`
    : 'Sequence is currently unsaved.';

  ui.pendingAssetSelect.innerHTML = Object.keys(state.effectMeta)
    .sort((left, right) => getEffectLabel(left).localeCompare(getEffectLabel(right)))
    .map(
      (assetId) => `
        <option value="${assetId}" ${state.pendingAssetId === assetId ? 'selected' : ''}>${escapeHtml(getEffectLabel(assetId))}</option>
      `,
    )
    .join('');
}

function renderRuler() {
  const durationMs = getTimelineDuration();
  const stepMs = durationMs <= 1200 ? 100 : durationMs <= 2800 ? 200 : 400;
  const marks = Array.from({ length: Math.ceil(durationMs / stepMs) + 1 }, (_, index) => index * stepMs);
  ui.timelineRulerTrack.dataset.timelineDuration = String(durationMs);
  ui.timelineRulerTrack.innerHTML = `
    ${marks
      .map(
        (mark) => `
          <div class="timeline-mark" style="left: ${(mark / durationMs) * 100}%;">
            <span>${formatMs(mark)}</span>
          </div>
        `,
      )
      .join('')}
    <div class="timeline-playhead"></div>
  `;
}

function renderRows() {
  const durationMs = getTimelineDuration();

  if (!state.sequence.cues.length) {
    ui.timelineRows.innerHTML =
      '<p class="empty-note">No cues yet. Add one effect and export the sequence when it feels right.</p>';
    return;
  }

  ui.timelineRows.innerHTML = state.sequence.cues
    .map((cue) => {
      const cueDuration = getCueDuration(cue);
      const leftPercent = (cue.atMs / durationMs) * 100;
      const widthPercent = Math.max(3, (cueDuration / durationMs) * 100);
      return `
        <div class="timeline-row ${cue.id === state.selectedCueId ? 'is-selected' : ''}" data-row-cue-id="${escapeHtml(cue.id)}">
          <button class="timeline-row-label" type="button" data-action="select-cue" data-cue-id="${escapeHtml(cue.id)}">
            <strong>${escapeHtml(cue.id)}</strong>
            <span>${escapeHtml(getEffectLabel(cue.assetId))}</span>
          </button>
          <div class="timeline-track" data-timeline-scrub="true" data-timeline-duration="${durationMs}">
            <div class="timeline-playhead"></div>
            <button
              class="timeline-cue ${cue.id === state.selectedCueId ? 'is-selected' : ''}"
              type="button"
              style="left: ${leftPercent}%; width: ${widthPercent}%;"
              data-action="cue-block"
              data-cue-id="${escapeHtml(cue.id)}"
            >
              <span class="timeline-cue-title">${escapeHtml(getEffectLabel(cue.assetId))}</span>
              <span class="timeline-cue-meta">${formatMs(cue.atMs)} - ${formatMs(cue.atMs + cueDuration)}</span>
              <span class="timeline-cue-resize" data-action="cue-resize" data-cue-id="${escapeHtml(cue.id)}"></span>
            </button>
          </div>
        </div>
      `;
    })
    .join('');
}

function renderCueInspector() {
  const cue = getSelectedCue();
  if (!cue) {
    ui.cueInspectorBody.innerHTML = '<p class="empty-note">Select a cue to edit its anchor and duration override.</p>';
    return;
  }

  ui.cueInspectorBody.innerHTML = `
    <div class="cue-meta">
      <strong>${escapeHtml(getEffectLabel(cue.assetId))}</strong>
      <span>Base duration: ${formatMs(getEffectDuration(cue.assetId))}</span>
    </div>

    <div class="cue-fields">
      <label class="field">
        <span class="field-label">Cue ID</span>
        <input class="field-input" type="text" value="${escapeHtml(cue.id)}" data-cue-field="id" />
      </label>

      <label class="field">
        <span class="field-label">Anchor</span>
        <select class="field-select" data-cue-field="anchor">
          <option value="caster" ${cue.anchor === 'caster' ? 'selected' : ''}>Caster</option>
          <option value="target" ${cue.anchor === 'target' ? 'selected' : ''}>Target</option>
          <option value="projectile" ${cue.anchor === 'projectile' ? 'selected' : ''}>Projectile</option>
        </select>
      </label>

      <label class="field">
        <span class="field-label">Target Anchor</span>
        <select class="field-select" data-cue-field="targetAnchor">
          <option value="" ${cue.targetAnchor ? '' : 'selected'}>None</option>
          <option value="caster" ${cue.targetAnchor === 'caster' ? 'selected' : ''}>Caster</option>
          <option value="target" ${cue.targetAnchor === 'target' ? 'selected' : ''}>Target</option>
          <option value="projectile" ${cue.targetAnchor === 'projectile' ? 'selected' : ''}>Projectile</option>
        </select>
      </label>

      <label class="field">
        <span class="field-label">Duration Override</span>
        <input class="field-input" type="number" min="1" step="10" value="${cue.durationMs ?? ''}" placeholder="${getEffectDuration(cue.assetId)}" data-cue-field="durationMs" />
      </label>
    </div>
  `;
}

function getTrackForSampling(asset, scope, trackName, layerId = '') {
  return scope === 'motion'
    ? asset.motion?.tracks?.[trackName]
    : asset.layers.find((layer) => layer.id === layerId)?.tracks?.[trackName];
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

function sampleLayerTrack(asset, layer, trackName, progress, fallback = 0) {
  return sampleTrack(getTrackForSampling(asset, 'layer', trackName, layer.id), progress, fallback);
}

function motionUsesTarget(mode) {
  return mode === 'line' || mode === 'path';
}

function sampleMotionPosition(asset, instance, progress) {
  if (motionUsesTarget(asset.motion?.mode) && instance.targetX != null && instance.targetY != null) {
    const travel = sampleTrack(getTrackForSampling(asset, 'motion', 'travel'), progress, progress);
    const base = {
      x: lerp(instance.x, instance.targetX, travel),
      y: lerp(instance.y, instance.targetY, travel),
    };

    if (asset.motion?.mode === 'path') {
      return {
        x: base.x + sampleTrack(getTrackForSampling(asset, 'motion', 'x'), progress, 0),
        y: base.y + sampleTrack(getTrackForSampling(asset, 'motion', 'y'), progress, 0),
      };
    }

    return base;
  }

  if (asset.motion?.mode === 'path') {
    return {
      x: instance.x + sampleTrack(getTrackForSampling(asset, 'motion', 'x'), progress, 0),
      y: instance.y + sampleTrack(getTrackForSampling(asset, 'motion', 'y'), progress, 0),
    };
  }

  return {
    x: instance.x,
    y: instance.y,
  };
}

function renderMotionGuide(asset, instance) {
  const motionMode = asset.motion?.mode ?? 'fixed';

  if (!motionUsesTarget(motionMode)) {
    return '';
  }

  const targetX = instance.targetX ?? instance.x;
  const targetY = instance.targetY ?? instance.y;

  if (motionMode === 'line') {
    return `
      <line
        x1="${instance.x}"
        y1="${instance.y}"
        x2="${targetX}"
        y2="${targetY}"
        stroke="rgba(255,255,255,0.14)"
        stroke-dasharray="10 8"
      ></line>
    `;
  }

  const samples = Array.from({ length: 25 }, (_, index) => {
    const t = index / 24;
    const point = sampleMotionPosition(asset, instance, t);
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

function renderOrb(asset, instance, layer, progress) {
  const base = sampleMotionPosition(asset, instance, progress);
  const x = base.x + sampleLayerTrack(asset, layer, 'x', progress, 0);
  const y = base.y + sampleLayerTrack(asset, layer, 'y', progress, 0);
  const scale = sampleLayerTrack(asset, layer, 'scale', progress, 1);
  const alpha = sampleLayerTrack(asset, layer, 'alpha', progress, 1);
  const glow = sampleLayerTrack(asset, layer, 'glow', progress, 0);
  const glowRadius = layer.radius * scale * (layer.glowScale ?? 2.3) * (1 + glow * 0.45);
  const coreRadius = Math.max(1, layer.radius * scale);
  const glowOpacity = Math.max(0, alpha * (0.18 + glow * 0.35));

  return `
    <circle cx="${x}" cy="${y}" r="${glowRadius}" fill="${escapeHtml(layer.glowColor ?? layer.color)}" opacity="${glowOpacity}"></circle>
    <circle cx="${x}" cy="${y}" r="${coreRadius}" fill="${escapeHtml(layer.color)}" opacity="${Math.max(0, alpha)}"></circle>
  `;
}

function renderRing(asset, instance, layer, progress) {
  const base = sampleMotionPosition(asset, instance, progress);
  const x = base.x + sampleLayerTrack(asset, layer, 'x', progress, 0);
  const y = base.y + sampleLayerTrack(asset, layer, 'y', progress, 0);
  const scale = sampleLayerTrack(asset, layer, 'scale', progress, 1);
  const alpha = sampleLayerTrack(asset, layer, 'alpha', progress, 1);

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

function renderStreak(asset, instance, layer, progress) {
  const base = sampleMotionPosition(asset, instance, progress);
  const x = base.x + sampleLayerTrack(asset, layer, 'x', progress, 0);
  const y = base.y + sampleLayerTrack(asset, layer, 'y', progress, 0);
  const scale = sampleLayerTrack(asset, layer, 'scale', progress, 1);
  const alpha = sampleLayerTrack(asset, layer, 'alpha', progress, 1);
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

function renderDiamond(asset, instance, layer, progress) {
  const base = sampleMotionPosition(asset, instance, progress);
  const cx = base.x + sampleLayerTrack(asset, layer, 'x', progress, 0);
  const cy = base.y + sampleLayerTrack(asset, layer, 'y', progress, 0);
  const scale = sampleLayerTrack(asset, layer, 'scale', progress, 1);
  const alpha = sampleLayerTrack(asset, layer, 'alpha', progress, 1);
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

function renderArc(asset, instance, layer, progress) {
  const base = sampleMotionPosition(asset, instance, progress);
  const cx = base.x + sampleLayerTrack(asset, layer, 'x', progress, 0);
  const cy = base.y + sampleLayerTrack(asset, layer, 'y', progress, 0);
  const scale = sampleLayerTrack(asset, layer, 'scale', progress, 1);
  const alpha = sampleLayerTrack(asset, layer, 'alpha', progress, 1);
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

function renderStarburst(asset, instance, layer, progress) {
  const base = sampleMotionPosition(asset, instance, progress);
  const cx = base.x + sampleLayerTrack(asset, layer, 'x', progress, 0);
  const cy = base.y + sampleLayerTrack(asset, layer, 'y', progress, 0);
  const scale = sampleLayerTrack(asset, layer, 'scale', progress, 1);
  const alpha = sampleLayerTrack(asset, layer, 'alpha', progress, 1);
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
    const resolvedMaskId =
      maskId || `sprite-mask-${Math.round(x)}-${Math.round(y)}-${Math.round(width)}-${Math.round(height)}`;
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

function renderSpriteLayer(asset, instance, layer, progress) {
  const base = sampleMotionPosition(asset, instance, progress);
  const x = base.x + sampleLayerTrack(asset, layer, 'x', progress, 0);
  const y = base.y + sampleLayerTrack(asset, layer, 'y', progress, 0);
  const scale = sampleLayerTrack(asset, layer, 'scale', progress, 1);
  const alpha = sampleLayerTrack(asset, layer, 'alpha', progress, 1);

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

function renderTrail(asset, instance, layer, progress) {
  const falloff = layer.falloff ?? 0.1;
  const trailStyle = layer.style ?? 'fill';
  let svg = '';

  for (let index = 0; index < layer.segments; index += 1) {
    const segmentProgress = Math.max(0, progress - index * layer.spacing);
    const base = sampleMotionPosition(asset, instance, segmentProgress);
    const x = base.x + sampleLayerTrack(asset, layer, 'x', segmentProgress, 0);
    const y = base.y + sampleLayerTrack(asset, layer, 'y', segmentProgress, 0);
    const scale = sampleLayerTrack(asset, layer, 'scale', segmentProgress, 1);
    const alpha = sampleLayerTrack(asset, layer, 'alpha', segmentProgress, 1);
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
      const angle = ((layer.rotationDeg ?? 0) * Math.PI) / 180;
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

function renderEffectShapes(asset, instance, progress) {
  return asset.layers
    .map((layer) => {
      if (layer.type === 'orb') return renderOrb(asset, instance, layer, progress);
      if (layer.type === 'ring') return renderRing(asset, instance, layer, progress);
      if (layer.type === 'streak') return renderStreak(asset, instance, layer, progress);
      if (layer.type === 'diamond') return renderDiamond(asset, instance, layer, progress);
      if (layer.type === 'arc') return renderArc(asset, instance, layer, progress);
      if (layer.type === 'starburst') return renderStarburst(asset, instance, layer, progress);
      if (layer.type === 'sprite') return renderSpriteLayer(asset, instance, layer, progress);
      return renderTrail(asset, instance, layer, progress);
    })
    .join('');
}

function resolveStaticAnchorPoint(anchor) {
  if (anchor === 'target') {
    return {
      x: state.instance.targetX ?? state.instance.x,
      y: state.instance.targetY ?? state.instance.y,
    };
  }

  return {
    x: state.instance.x,
    y: state.instance.y,
  };
}

function findProjectileCue(sequence) {
  return sequence.cues.find((cue) => cue.targetAnchor && getEffectAsset(cue.assetId)) ?? null;
}

function sampleProjectilePoint(sequence, cue) {
  const projectileCue = findProjectileCue(sequence);
  if (!projectileCue) {
    return resolveStaticAnchorPoint('target');
  }

  const projectileAsset = getEffectAsset(projectileCue.assetId);
  if (!projectileAsset) {
    return resolveStaticAnchorPoint('target');
  }

  const startPoint = resolveStaticAnchorPoint(projectileCue.anchor === 'target' ? 'target' : 'caster');
  const targetPoint = resolveStaticAnchorPoint(
    projectileCue.targetAnchor === 'caster' ? 'caster' : 'target',
  );
  const travelDurationMs = getCueDuration(projectileCue);
  const sampledTravelT =
    cue.travelT ?? clamp01((cue.atMs - projectileCue.atMs) / Math.max(1, travelDurationMs));

  return sampleMotionPosition(
    projectileAsset,
    {
      x: startPoint.x,
      y: startPoint.y,
      targetX: targetPoint.x,
      targetY: targetPoint.y,
    },
    sampledTravelT,
  );
}

function resolveSequenceAnchorPoint(sequence, cue, anchor) {
  if (anchor === 'projectile') {
    return sampleProjectilePoint(sequence, cue);
  }

  return resolveStaticAnchorPoint(anchor);
}

function buildCueInstance(sequence, cue) {
  const origin = resolveSequenceAnchorPoint(sequence, cue, cue.anchor);
  const instance = {
    x: origin.x,
    y: origin.y,
    durationMsOverride: cue.durationMs,
  };

  if (cue.targetAnchor) {
    const targetPoint = resolveSequenceAnchorPoint(sequence, cue, cue.targetAnchor);
    instance.targetX = targetPoint.x;
    instance.targetY = targetPoint.y;
  }

  return instance;
}

function renderViewer() {
  applyViewerViewportFrame();
  const viewport = getViewerViewport();
  const durationMs = getTimelineDuration();
  const currentTimeMs = clamp(state.progressMs, 0, durationMs);
  let motionGuide = '';
  let shapes = '';

  for (const cue of state.sequence.cues) {
    const cueAsset = getEffectAsset(cue.assetId);
    if (!cueAsset) {
      continue;
    }

    const localTimeMs = currentTimeMs - cue.atMs;
    if (localTimeMs < 0) {
      continue;
    }

    const cueDuration = getCueDuration(cue);
    if (!cueAsset.loop && localTimeMs > cueDuration) {
      continue;
    }

    const cueProgress = cueAsset.loop
      ? ((localTimeMs % cueDuration) + cueDuration) % cueDuration / cueDuration
      : clamp01(localTimeMs / cueDuration);
    const cueInstance = buildCueInstance(state.sequence, cue);
    shapes += renderEffectShapes(cueAsset, cueInstance, cueProgress);

    if (!motionGuide && cue.targetAnchor && motionUsesTarget(cueAsset.motion?.mode ?? 'fixed')) {
      motionGuide = renderMotionGuide(cueAsset, cueInstance);
    }
  }

  ui.viewerStageSvg.setAttribute(
    'viewBox',
    `${viewport.x} ${viewport.y} ${viewport.width} ${viewport.height}`,
  );
  renderViewerViewportControls();

  ui.viewerStageSvg.innerHTML = `
    <defs>
      <linearGradient id="sequence-stage-bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${escapeHtml(PREVIEW_BACKDROP.top)}"></stop>
        <stop offset="100%" stop-color="${escapeHtml(PREVIEW_BACKDROP.bottom)}"></stop>
      </linearGradient>
      <radialGradient id="sequence-stage-glow" cx="0.35" cy="0.2" r="0.8">
        <stop offset="0%" stop-color="${escapeHtml(PREVIEW_BACKDROP.glow)}"></stop>
        <stop offset="100%" stop-color="rgba(0, 0, 0, 0)"></stop>
      </radialGradient>
    </defs>

    <rect x="${viewport.x}" y="${viewport.y}" width="${viewport.width}" height="${viewport.height}" fill="url(#sequence-stage-bg)"></rect>
    <rect x="${viewport.x}" y="${viewport.y}" width="${viewport.width}" height="${viewport.height}" fill="url(#sequence-stage-glow)"></rect>
    <path
      d="M 0 352 Q 180 334 340 360 T ${STAGE.width} 350"
      fill="none"
      stroke="${escapeHtml(PREVIEW_BACKDROP.ground)}"
      stroke-width="2"
    ></path>
    <line
      x1="${viewport.x}"
      y1="320"
      x2="${viewport.x + viewport.width}"
      y2="320"
      stroke="${escapeHtml(PREVIEW_BACKDROP.grid)}"
      stroke-dasharray="6 10"
    ></line>

    ${motionGuide}
    ${shapes}

    <g data-preview-anchor="caster" style="cursor: grab;">
      <circle cx="${state.instance.x}" cy="${state.instance.y}" r="12" fill="#df945c"></circle>
      <circle cx="${state.instance.x}" cy="${state.instance.y}" r="22" fill="transparent" stroke="rgba(223, 148, 92, 0.42)"></circle>
    </g>

    <g data-preview-anchor="target" style="cursor: grab;">
      <circle cx="${state.instance.targetX}" cy="${state.instance.targetY}" r="12" fill="#8fd7ff"></circle>
      <circle cx="${state.instance.targetX}" cy="${state.instance.targetY}" r="22" fill="transparent" stroke="rgba(143, 215, 255, 0.42)"></circle>
    </g>
  `;
}

function syncPlaybackReadout() {
  const durationMs = getTimelineDuration();
  const clampedMs = clamp(state.progressMs, 0, durationMs);
  const progressPercent = Math.round((clampedMs / Math.max(1, durationMs)) * 100);
  ui.progressPercentLabel.textContent = `${progressPercent}%`;
  ui.progressTimeLabel.textContent = formatMs(clampedMs);
  document.querySelectorAll('.timeline-playhead').forEach((element) => {
    element.style.left = `${(clampedMs / Math.max(1, durationMs)) * 100}%`;
  });
}

function render() {
  ensureSelection();
  renderToolbar();
  renderRuler();
  renderRows();
  renderCueInspector();
  renderViewer();
  syncPlaybackReadout();
}

function createCue(assetId) {
  const lastCue = state.sequence.cues[state.sequence.cues.length - 1];
  const defaultStartMs = lastCue ? lastCue.atMs + getCueDuration(lastCue) + 40 : 0;
  const usedIds = new Set(state.sequence.cues.map((cue) => cue.id));
  let index = state.sequence.cues.length + 1;
  let cueId = `${assetId}-cue-${index}`;

  while (usedIds.has(cueId)) {
    index += 1;
    cueId = `${assetId}-cue-${index}`;
  }

  return {
    id: cueId,
    assetId,
    atMs: defaultStartMs,
    anchor: 'caster',
  };
}

function addCue() {
  pushUndoCheckpoint();
  const cue = createCue(state.pendingAssetId);
  state.sequence.cues.push(cue);
  state.selectedCueId = cue.id;
  render();
  schedulePersistSequenceSession();
}

function removeCue() {
  if (!state.selectedCueId) return;
  pushUndoCheckpoint();
  state.sequence.cues = state.sequence.cues.filter((cue) => cue.id !== state.selectedCueId);
  state.selectedCueId = state.sequence.cues[0]?.id ?? '';
  render();
  schedulePersistSequenceSession();
}

function updateCueField(field, rawValue) {
  const cue = getSelectedCue();
  if (!cue) return;
  pushUndoCheckpoint();

  if (field === 'durationMs') {
    if (rawValue === '') {
      delete cue.durationMs;
    } else {
      cue.durationMs = Math.max(1, Number(rawValue) || 1);
    }
  } else if (field === 'targetAnchor') {
    cue.targetAnchor = rawValue || undefined;
  } else {
    cue[field] = rawValue;
  }

  if (field === 'id') {
    state.selectedCueId = rawValue;
  }

  render();
  schedulePersistSequenceSession();
}

function updateSequenceField(field, value) {
  pushUndoCheckpoint();
  state.sequence[field] = value;
  renderToolbar();
  schedulePersistSequenceSession();
}

function newSequence() {
  pushUndoCheckpoint();
  state.sequence = normalizeSequence({
    id: 'new-sequence',
    label: 'New Sequence',
    cues: [],
  });
  state.fileHandle = null;
  state.fileName = '';
  state.progressMs = 0;
  state.selectedCueId = '';
  render();
  schedulePersistSequenceSession();
}

function stringifySequence() {
  return `${JSON.stringify(normalizeSequence(state.sequence), null, 2)}\n`;
}

async function openSequence() {
  try {
    if ('showOpenFilePicker' in window) {
      const [handle] = await window.showOpenFilePicker({
        excludeAcceptAllOption: false,
        multiple: false,
        types: [{ description: 'VFX Sequence JSON', accept: { 'application/json': ['.json'] } }],
      });
      const file = await handle.getFile();
      pushUndoCheckpoint();
      state.sequence = normalizeSequence(JSON.parse(await file.text()));
      state.fileHandle = handle;
      state.fileName = file.name;
      state.selectedCueId = state.sequence.cues[0]?.id ?? '';
      render();
      schedulePersistSequenceSession();
      setStatus(`Loaded ${file.name}.`, 'success');
      return;
    }

    ui.fallbackFileInput.click();
  } catch (error) {
    if (error?.name === 'AbortError') return;
    setStatus(`Could not open sequence: ${error.message}`, 'error');
  }
}

async function writeSequenceToHandle(handle) {
  const writable = await handle.createWritable();
  await writable.write(stringifySequence());
  await writable.close();
  state.fileHandle = handle;
  state.fileName = handle.name || `${state.sequence.id}.json`;
  renderToolbar();
  schedulePersistSequenceSession();

  if (state.repoRootHandle) {
    try {
      const entries = await regenerateSequenceRegistry(state.repoRootHandle);
      return {
        registryUpdated: entries.some((entry) => entry.id === state.sequence.id),
        registryError: null,
      };
    } catch (error) {
      return {
        registryUpdated: null,
        registryError: error.message,
      };
    }
  }

  return {
    registryUpdated: null,
    registryError: null,
  };
}

async function saveSequence() {
  try {
    if (state.fileHandle && 'createWritable' in state.fileHandle) {
      const result = await writeSequenceToHandle(state.fileHandle);
      setStatus(
        result.registryError
          ? `Saved ${state.fileName}, but could not refresh sequenceRegistry.ts: ${result.registryError}`
          : result.registryUpdated === false
          ? `Saved ${state.fileName}, but it is not inside src/features/vfx/assets/sequences so sequenceRegistry.ts was not updated.`
          : result.registryUpdated
            ? `Saved ${state.fileName} and refreshed sequenceRegistry.ts.`
            : `Saved ${state.fileName}.`,
        result.registryError || result.registryUpdated === false ? 'info' : 'success',
      );
      return;
    }

    await saveSequenceAs();
  } catch (error) {
    if (error?.name === 'AbortError') return;
    setStatus(`Could not save sequence: ${error.message}`, 'error');
  }
}

async function saveSequenceAs() {
  try {
    if ('showSaveFilePicker' in window) {
      const handle = await window.showSaveFilePicker({
        suggestedName: `${state.sequence.id || 'sequence'}.json`,
        types: [{ description: 'VFX Sequence JSON', accept: { 'application/json': ['.json'] } }],
      });
      const result = await writeSequenceToHandle(handle);
      setStatus(
        result.registryError
          ? `Saved ${state.fileName}, but could not refresh sequenceRegistry.ts: ${result.registryError}`
          : result.registryUpdated === false
          ? `Saved ${state.fileName}, but it is not inside src/features/vfx/assets/sequences so sequenceRegistry.ts was not updated.`
          : result.registryUpdated
            ? `Saved ${state.fileName} and refreshed sequenceRegistry.ts.`
            : `Saved ${state.fileName}.`,
        result.registryError || result.registryUpdated === false ? 'info' : 'success',
      );
      return;
    }

    exportSequence();
    setStatus('Direct save is not supported in this browser, so the sequence was downloaded instead.', 'info');
  } catch (error) {
    if (error?.name === 'AbortError') return;
    setStatus(`Could not save sequence: ${error.message}`, 'error');
  }
}

function exportSequence() {
  const blob = new Blob([stringifySequence()], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${state.sequence.id || 'sequence'}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function setPlayheadFromEvent(event) {
  const scrubSurface = event.target.closest('[data-timeline-scrub="true"]');
  if (!scrubSurface) {
    return false;
  }

  const bounds = scrubSurface.getBoundingClientRect();
  if (bounds.width <= 0) {
    return false;
  }

  const durationMs = Number(scrubSurface.dataset.timelineDuration) || getTimelineDuration();
  state.progressMs = clamp(((event.clientX - bounds.left) / bounds.width) * durationMs, 0, durationMs);
  state.playing = false;
  ui.playPauseButton.textContent = 'Play';
  syncPlaybackReadout();
  renderViewer();
  return true;
}

function moveCueToIndex(cueId, nextIndex) {
  const currentIndex = state.sequence.cues.findIndex((cue) => cue.id === cueId);
  if (currentIndex < 0 || currentIndex === nextIndex) return;

  const [cue] = state.sequence.cues.splice(currentIndex, 1);
  state.sequence.cues.splice(clamp(nextIndex, 0, state.sequence.cues.length), 0, cue);
}

function beginCueDrag(event, cueId, mode) {
  const cueElement = event.target.closest('[data-cue-id]');
  const track = cueElement?.closest('.timeline-track');
  if (!cueElement || !track) {
    return;
  }

  const cue = state.sequence.cues.find((item) => item.id === cueId);
  if (!cue) {
    return;
  }

  state.selectedCueId = cueId;
  beginHistoryGesture();
  state.activeCueDrag = {
    mode,
    cueId,
    startClientX: event.clientX,
    trackRect: track.getBoundingClientRect(),
    timelineDuration: Number(track.dataset.timelineDuration) || getTimelineDuration(),
    originAtMs: cue.atMs,
    originDurationMs: getCueDuration(cue),
  };
  render();
}

function updateCueDrag(clientX, clientY) {
  if (!state.activeCueDrag) return;

  const drag = state.activeCueDrag;
  const cue = state.sequence.cues.find((item) => item.id === drag.cueId);
  if (!cue || drag.trackRect.width <= 0) return;

  const deltaRatio = (clientX - drag.startClientX) / drag.trackRect.width;
  const deltaMs = Math.round((deltaRatio * drag.timelineDuration) / 10) * 10;

  if (drag.mode === 'move') {
    cue.atMs = clamp(drag.originAtMs + deltaMs, 0, Math.max(0, drag.timelineDuration - getCueDuration(cue)));
    const hoveredRow = document.elementFromPoint(clientX, clientY)?.closest('[data-row-cue-id]');
    if (hoveredRow) {
      const hoveredCueId = hoveredRow.dataset.rowCueId;
      if (hoveredCueId && hoveredCueId !== drag.cueId) {
        moveCueToIndex(drag.cueId, state.sequence.cues.findIndex((item) => item.id === hoveredCueId));
      }
    }
  } else {
    cue.durationMs = clamp(drag.originDurationMs + deltaMs, 60, Math.max(60, drag.timelineDuration - cue.atMs));
  }

  render();
}

function endCueDrag() {
  if (state.activeCueDrag) {
    endHistoryGesture();
    schedulePersistSequenceSession();
  }
  state.activeCueDrag = null;
}

function getStagePointFromClient(clientX, clientY) {
  const bounds = ui.viewerStageSvg.getBoundingClientRect();
  if (bounds.width <= 0 || bounds.height <= 0) {
    return null;
  }

  const viewport = getViewerViewport();
  const x = clamp(
    viewport.x + ((clientX - bounds.left) / bounds.width) * viewport.width,
    0,
    STAGE.width,
  );
  const y = clamp(
    viewport.y + ((clientY - bounds.top) / bounds.height) * viewport.height,
    0,
    STAGE.height,
  );
  return { x, y };
}

function beginAnchorDrag(event, anchor) {
  beginHistoryGesture();
  state.activeAnchorDrag = { anchor };
  const point = getStagePointFromClient(event.clientX, event.clientY);
  if (point) {
    updateAnchorPosition(anchor, point);
  }
  renderViewer();
}

function updateAnchorPosition(anchor, point) {
  if (anchor === 'target') {
    state.instance.targetX = point.x;
    state.instance.targetY = point.y;
    return;
  }

  state.instance.x = point.x;
  state.instance.y = point.y;
}

function updateAnchorDrag(clientX, clientY) {
  if (!state.activeAnchorDrag) return;
  const point = getStagePointFromClient(clientX, clientY);
  if (!point) return;
  updateAnchorPosition(state.activeAnchorDrag.anchor, point);
  renderViewer();
}

function endAnchorDrag() {
  if (state.activeAnchorDrag) {
    schedulePersistSequenceSession();
  }
  state.activeAnchorDrag = null;
}

function handleViewerWheel(event) {
  if (event.target instanceof Element && event.target.closest('.viewer-viewport-toolbar')) {
    return;
  }

  event.preventDefault();
  const direction = event.deltaY < 0 ? 1 : -1;
  const factor =
    direction > 0 ? PREVIEW_VIEWPORT_LIMITS.wheelFactor : 1 / PREVIEW_VIEWPORT_LIMITS.wheelFactor;
  setViewerZoom(state.previewViewport.zoom * factor, event.clientX, event.clientY);
}

function beginViewerResize(event) {
  beginHistoryGesture();
  state.activeViewerResize = {
    startClientY: event.clientY,
    originHeight: state.viewerHeight,
  };
}

function updateViewerResize(clientY) {
  if (!state.activeViewerResize) {
    return;
  }

  const deltaY = clientY - state.activeViewerResize.startClientY;
  state.viewerHeight = clamp(state.activeViewerResize.originHeight + deltaY, 260, getMaxViewerHeight());
  renderViewer();
}

function endViewerResize() {
  if (state.activeViewerResize) {
    endHistoryGesture();
    schedulePersistSequenceSession();
  }
  state.activeViewerResize = null;
}

function animationLoop(timestamp) {
  if (!state.lastFrameTime) {
    state.lastFrameTime = timestamp;
  }

  if (state.playing) {
    const deltaMs = timestamp - state.lastFrameTime;
    state.progressMs += deltaMs;

    const durationMs = getTimelineDuration();
    if (state.progressMs >= durationMs) {
      state.progressMs = durationMs;
      state.playing = false;
      ui.playPauseButton.textContent = 'Play';
    }

    syncPlaybackReadout();
    renderViewer();
  }

  state.lastFrameTime = timestamp;
  window.requestAnimationFrame(animationLoop);
}

function handleGlobalKeyDown(event) {
  if (!(event.metaKey || event.ctrlKey) || event.altKey) {
    return;
  }

  const target = event.target;
  if (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  ) {
    return;
  }

  const key = event.key.toLowerCase();
  if (key === 'z' && !event.shiftKey) {
    event.preventDefault();
    undo();
    return;
  }

  if ((key === 'z' && event.shiftKey) || key === 'y') {
    event.preventDefault();
    redo();
  }
}

function wireEvents() {
  ui.sequenceIdInput.addEventListener('change', (event) => {
    updateSequenceField('id', event.target.value);
  });
  ui.sequenceLabelInput.addEventListener('change', (event) => {
    updateSequenceField('label', event.target.value);
  });
  ui.pendingAssetSelect.addEventListener('change', (event) => {
    state.pendingAssetId = event.target.value;
    schedulePersistSequenceSession();
  });
  ui.viewerDeviceSelect?.addEventListener('change', (event) => {
    pushUndoCheckpoint();
    state.previewDevice = normalizePreviewDevice({
      ...state.previewDevice,
      preset: event.target.value,
    });
    renderViewer();
    schedulePersistSequenceSession();
  });
  ui.viewerSafeAreaToggleButton?.addEventListener('click', () => {
    const preset = PREVIEW_DEVICE_PRESETS[state.previewDevice.preset] ?? PREVIEW_DEVICE_PRESETS.free;
    if (!preset.safeArea) {
      return;
    }
    pushUndoCheckpoint();
    state.previewDevice.showSafeArea = !state.previewDevice.showSafeArea;
    renderViewer();
    schedulePersistSequenceSession();
  });
  ui.viewerZoomOutButton?.addEventListener('click', () => {
    setViewerZoom(state.previewViewport.zoom - PREVIEW_VIEWPORT_LIMITS.buttonStep);
  });
  ui.viewerZoomResetButton?.addEventListener('click', () => {
    pushUndoCheckpoint();
    state.previewViewport = createDefaultPreviewViewport();
    renderViewer();
    schedulePersistSequenceSession();
  });
  ui.viewerZoomInButton?.addEventListener('click', () => {
    setViewerZoom(state.previewViewport.zoom + PREVIEW_VIEWPORT_LIMITS.buttonStep);
  });
  ui.viewerResizeHandle?.addEventListener('pointerdown', (event) => {
    beginViewerResize(event);
    event.preventDefault();
  });

  document.addEventListener('click', (event) => {
    const actionButton = event.target.closest('[data-action]');
    if (!actionButton) {
      return;
    }

    const { action, cueId } = actionButton.dataset;
    const parentMenu = actionButton.closest('details');
    if (action === 'add-cue') {
      addCue();
    } else if (action === 'remove-cue') {
      removeCue();
    } else if (action === 'new-sequence') {
      newSequence();
    } else if (action === 'open-sequence') {
      void openSequence();
    } else if (action === 'save-sequence') {
      void saveSequence();
    } else if (action === 'save-sequence-as') {
      void saveSequenceAs();
    } else if (action === 'export-sequence') {
      exportSequence();
    } else if (action === 'select-cue' && cueId) {
      state.selectedCueId = cueId;
      render();
      schedulePersistSequenceSession();
    }

    if (parentMenu && action !== 'select-cue') {
      parentMenu.open = false;
    }
  });

  document.addEventListener('input', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) {
      return;
    }

    if (target.dataset.cueField === 'anchor' || target.dataset.cueField === 'targetAnchor') {
      updateCueField(target.dataset.cueField, target.value);
    }
  });

  document.addEventListener('change', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) {
      return;
    }

    if (target.dataset.cueField) {
      updateCueField(target.dataset.cueField, target.value);
    }
  });

  document.addEventListener('pointerdown', (event) => {
    const anchor = event.target.closest('[data-preview-anchor]');
    if (anchor) {
      beginAnchorDrag(event, anchor.dataset.previewAnchor);
      event.preventDefault();
      return;
    }

    const resizeHandle = event.target.closest('[data-action="cue-resize"]');
    if (resizeHandle) {
      beginCueDrag(event, resizeHandle.dataset.cueId, 'resize');
      event.preventDefault();
      return;
    }

    const cueBlock = event.target.closest('[data-action="cue-block"]');
    if (cueBlock) {
      beginCueDrag(event, cueBlock.dataset.cueId, 'move');
      event.preventDefault();
      return;
    }

    if (setPlayheadFromEvent(event)) {
      event.preventDefault();
    }
  });

  window.addEventListener('pointermove', (event) => {
    updateCueDrag(event.clientX, event.clientY);
    updateAnchorDrag(event.clientX, event.clientY);
    updateViewerResize(event.clientY);
  });
  window.addEventListener('pointerup', () => {
    endCueDrag();
    endAnchorDrag();
    endViewerResize();
  });
  ui.viewerStageFrame?.addEventListener('wheel', handleViewerWheel, { passive: false });
  window.addEventListener('resize', () => {
    applyViewerFrameSize();
    renderViewer();
  });
  window.addEventListener('focus', () => {
    void refreshEffectAssets();
  });
  window.addEventListener('beforeunload', persistSequenceSessionNow);
  window.addEventListener('keydown', handleGlobalKeyDown);

  ui.playPauseButton.addEventListener('click', () => {
    state.playing = !state.playing;
    state.lastFrameTime = 0;
    ui.playPauseButton.textContent = state.playing ? 'Pause' : 'Play';
  });
  ui.restartButton.addEventListener('click', () => {
    state.progressMs = 0;
    state.playing = false;
    ui.playPauseButton.textContent = 'Play';
    syncPlaybackReadout();
    renderViewer();
  });

  ui.fallbackFileInput.addEventListener('change', (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    file
      .text()
      .then((text) => {
        pushUndoCheckpoint();
        state.sequence = normalizeSequence(JSON.parse(text));
        state.fileHandle = null;
        state.fileName = file.name;
        state.selectedCueId = state.sequence.cues[0]?.id ?? '';
        render();
        schedulePersistSequenceSession();
      })
      .catch((error) => {
        setStatus(`Could not read ${file.name}: ${error.message}`, 'error');
      })
      .finally(() => {
        ui.fallbackFileInput.value = '';
      });
  });
}

async function init() {
  await loadSpriteManifest();
  await restoreLinkedRepoRootHandle();
  const restoredSessionSource = await restorePersistedSequenceSessionFromSources();
  await refreshEffectAssets({ rerender: false });
  ensureSelection();
  render();
  wireEvents();
  setStatus(
    restoredSessionSource === 'file'
      ? 'Restored the last sequence composer session from tools/vfx-editor/sequence-composer-session.json.'
      : restoredSessionSource === 'browser'
        ? 'Restored the last sequence composer session from this browser.'
        : 'Open or build a sequence, then export it as JSON.',
  );
  window.requestAnimationFrame(animationLoop);
}

init();
