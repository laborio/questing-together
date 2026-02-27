import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import Ajv, { ErrorObject } from 'ajv';
import dagre from '@dagrejs/dagre';
import ReactFlow, {
  BaseEdge,
  Background,
  Controls,
  EdgeLabelRenderer,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  SelectionMode,
  type Connection,
  type EdgeProps,
  type Edge,
  type Node,
  type NodeProps,
  type ReactFlowInstance,
  getSmoothStepPath,
  useEdgesState,
  useNodesState
} from 'reactflow';
import 'reactflow/dist/style.css';

import type { Scene, SceneAction, SceneActionOutcome, SceneStep, StoryData, TagCondition, TagRoute } from './types';

const HISTORY_LIMIT = 50;

type StatusMessage = {
  text: string;
  type: 'info' | 'error' | 'success';
};

const ajv = new Ajv({ allErrors: true, allowUnionTypes: true });

type TaggedEdgeData = {
  optionId: string;
  route: TagRoute;
};

const OPTION_IDS = ['A', 'B', 'C'] as const;
const ROLE_OPTIONS = ['warrior', 'sage', 'ranger', 'any'] as const;
const COMBAT_OPTION_LABELS: Record<(typeof OPTION_IDS)[number], string> = {
  A: 'Win',
  B: 'Lose',
  C: 'Run',
};

type SceneNodeData = {
  id: string;
  title: string;
  typeLabel: string;
  isEnding?: boolean;
  optionIds: ReadonlyArray<(typeof OPTION_IDS)[number]>;
  onTitleChange?: (sceneId: string, nextTitle: string) => void;
};

function SceneNode({ data }: NodeProps<SceneNodeData>) {
  const [draftTitle, setDraftTitle] = useState(data.title);

  useEffect(() => {
    setDraftTitle(data.title);
  }, [data.title]);

  const commitTitle = () => {
    const trimmed = draftTitle.trim();
    if (!trimmed || trimmed === data.title) {
      setDraftTitle(data.title);
      return;
    }
    data.onTitleChange?.(data.id, trimmed);
  };

  return (
    <div className="scene-node">
      <Handle type="target" position={Position.Left} className="scene-handle-target" />
      <div className="scene-node-meta">
        <span className="scene-node-id">{data.id}</span>
        <span className="scene-node-type">{data.typeLabel}</span>
      </div>
      <input
        className="scene-node-input"
        value={draftTitle}
        onChange={(event) => setDraftTitle(event.target.value)}
        onBlur={commitTitle}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            commitTitle();
          }
        }}
      />
      <div className="scene-node-outputs">
        {data.optionIds.map((optionId) => (
          <div key={optionId} className="scene-node-output">
            <span className="scene-node-output-label">{optionId}</span>
            <Handle
              type="source"
              position={Position.Right}
              id={`option-${optionId}`}
              className="scene-handle-source"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function deepClone<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

function formatConditionLines(condition?: TagCondition): string[] {
  if (!condition) return [];
  const lines: string[] = [];
  if (condition.all?.length) lines.push(`all: ${condition.all.join(', ')}`);
  if (condition.any?.length) lines.push(`any: ${condition.any.join(', ')}`);
  if (condition.none?.length) lines.push(`none: ${condition.none.join(', ')}`);
  return lines;
}

function isCombatSceneEditor(scene: Scene | null | undefined): boolean {
  return Boolean(scene) && (scene?.mode === 'combat' || Boolean(scene?.combat));
}

function formatSceneOptionLabel(optionId: (typeof OPTION_IDS)[number], scene: Scene | null | undefined): string {
  if (!isCombatSceneEditor(scene)) return `Option ${optionId}`;
  return `${COMBAT_OPTION_LABELS[optionId]} (${optionId})`;
}

function TaggedEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  markerEnd
}: EdgeProps<TaggedEdgeData>) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition
  });

  const optionId = data?.optionId ?? '?';
  const route = data?.route;
  const globalLines = formatConditionLines(route?.ifGlobal);
  const sceneLines = formatConditionLines(route?.ifScene);
  const actionLines = formatConditionLines(route?.ifActions);
  const hasConditions = globalLines.length > 0 || sceneLines.length > 0 || actionLines.length > 0;
  const shortLabel = hasConditions ? `${optionId}⋯` : optionId;

  return (
    <>
      <BaseEdge id={id} path={edgePath} style={{ stroke: 'var(--edge)' }} markerEnd={markerEnd} />
      <EdgeLabelRenderer>
        <div
          className="edge-label"
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`
          }}
        >
          <div className="edge-pill">{shortLabel}</div>
          <div className="edge-tooltip">
            <div className="edge-tooltip-title">Option {optionId}</div>
            {!hasConditions && <div className="edge-tooltip-body">No tag conditions.</div>}
            {globalLines.length > 0 && (
              <div className="edge-tooltip-section">
                <div className="edge-tooltip-label">Global</div>
                {globalLines.map((line) => (
                  <div key={`g-${line}`} className="edge-tooltip-body">
                    {line}
                  </div>
                ))}
              </div>
            )}
            {sceneLines.length > 0 && (
              <div className="edge-tooltip-section">
                <div className="edge-tooltip-label">Scene</div>
                {sceneLines.map((line) => (
                  <div key={`s-${line}`} className="edge-tooltip-body">
                    {line}
                  </div>
                ))}
              </div>
            )}
            {actionLines.length > 0 && (
              <div className="edge-tooltip-section">
                <div className="edge-tooltip-label">Actions</div>
                {actionLines.map((line) => (
                  <div key={`a-${line}`} className="edge-tooltip-body">
                    {line}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

function getNodeStyle(scene: Scene, isSelected: boolean): CSSProperties {
  return {
    padding: 12,
    borderRadius: 12,
    border: scene.isEnding ? '2px solid var(--node-ending-border)' : '1px solid var(--node-border)',
    background: scene.isEnding ? 'var(--node-ending-bg)' : 'var(--node-bg)',
    color: 'var(--text)',
    fontWeight: scene.isEnding ? 700 : 600,
    boxShadow: isSelected ? '0 0 0 3px var(--node-selected)' : undefined
  };
}

function getSceneTypeLabel(scene: Scene): string {
  if (scene.isEnding) return 'Ending';
  if (scene.mode === 'combat') return 'Combat';
  if (scene.mode === 'timed') return 'Timed';
  return 'Story';
}

function getScenePosition(scene: Scene): { x: number; y: number } | null {
  const meta = scene.meta as Record<string, unknown> | undefined;
  const graph = meta?.graph as Record<string, unknown> | undefined;
  const position = graph?.position as { x?: number; y?: number } | undefined;
  if (!position || typeof position.x !== 'number' || typeof position.y !== 'number') return null;
  return { x: position.x, y: position.y };
}

function buildGraph(
  story: StoryData,
  selectedSceneId: string | null,
  onTitleChange: ((sceneId: string, nextTitle: string) => void) | undefined
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = story.scenes.map((scene, index) => {
    const savedPosition = getScenePosition(scene);
    return {
      id: scene.id,
      type: 'scene',
      data: {
        id: scene.id,
        title: scene.title || scene.id,
        typeLabel: getSceneTypeLabel(scene),
        isEnding: scene.isEnding,
        optionIds: scene.isEnding ? [] : OPTION_IDS,
        onTitleChange
      },
      position: savedPosition ?? { x: 0, y: index * 80 },
      style: getNodeStyle(scene, selectedSceneId === scene.id)
    };
  });

  const edges: Edge[] = [];

  story.scenes.forEach((scene) => {
    scene.options.forEach((option, optionIndex) => {
      option.next.forEach((route, routeIndex) => {
        if (!route.to) return;
        edges.push({
          id: `${scene.id}-${option.id}-${optionIndex}-${routeIndex}-${route.to}`,
          source: scene.id,
          target: route.to,
          type: 'tagged',
          data: {
            optionId: option.id,
            route
          },
          markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--edge)' }
        });
      });
    });
  });

  const hasManualLayout = story.scenes.some((scene) => getScenePosition(scene));
  if (hasManualLayout) {
    return { nodes, edges };
  }

  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({ rankdir: 'LR', nodesep: 40, ranksep: 80 });

  nodes.forEach((node) => {
    graph.setNode(node.id, { width: 220, height: 90 });
  });

  edges.forEach((edge) => {
    graph.setEdge(edge.source, edge.target);
  });

  dagre.layout(graph);

  const layoutedNodes = nodes.map((node) => {
    const layout = graph.node(node.id);
    return {
      ...node,
      position: {
        x: layout.x - 110,
        y: layout.y - 45
      }
    };
  });

  return { nodes: layoutedNodes, edges };
}

function getSceneSummary(scene: Scene | null): string {
  if (!scene) return 'No scene selected.';
  return `${scene.options.length} options, ${scene.steps.length} steps, ${scene.evidence.length} evidence`;
}

function renderTagSet(tags?: { global?: string[]; scene?: string[] }) {
  if (!tags || (!tags.global?.length && !tags.scene?.length)) return null;
  return (
    <div className="impact-row">
      {tags.global?.length ? (
        <span className="impact-pill">Global tags: {tags.global.join(', ')}</span>
      ) : null}
      {tags.scene?.length ? (
        <span className="impact-pill">Scene tags: {tags.scene.join(', ')}</span>
      ) : null}
    </div>
  );
}

function renderRoute(route: TagRoute, index: number) {
  const globalLines = formatConditionLines(route.ifGlobal);
  const sceneLines = formatConditionLines(route.ifScene);
  const actionLines = formatConditionLines(route.ifActions);
  return (
    <div key={`route-${index}`} className="impact-route">
      <div className="impact-route-head">
        <span className="impact-pill">to: {route.to ?? 'END'}</span>
      </div>
      {(globalLines.length > 0 || sceneLines.length > 0 || actionLines.length > 0) && (
        <div className="impact-route-conditions">
          {globalLines.length > 0 && (
            <div className="impact-route-block">
              <div className="impact-route-label">Global</div>
              {globalLines.map((line) => (
                <div key={`g-${line}`} className="impact-route-line">
                  {line}
                </div>
              ))}
            </div>
          )}
          {sceneLines.length > 0 && (
            <div className="impact-route-block">
              <div className="impact-route-label">Scene</div>
              {sceneLines.map((line) => (
                <div key={`s-${line}`} className="impact-route-line">
                  {line}
                </div>
              ))}
            </div>
          )}
          {actionLines.length > 0 && (
            <div className="impact-route-block">
              <div className="impact-route-label">Actions</div>
              {actionLines.map((line) => (
                <div key={`a-${line}`} className="impact-route-line">
                  {line}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TagInput({
  label,
  tags,
  suggestions,
  onChange,
  placeholder,
  listId
}: {
  label: string;
  tags: string[];
  suggestions: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  listId?: string;
}) {
  const [draft, setDraft] = useState('');
  const dataListId = listId ?? `tags-${label}`;

  const addTag = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    if (tags.includes(trimmed)) return;
    onChange([...tags, trimmed]);
    setDraft('');
  };

  return (
    <div className="tag-input">
      <label>{label}</label>
      <div className="tag-row">
        {tags.map((tag) => (
          <span key={tag} className="tag-chip">
            {tag}
            <button className="tag-chip-remove" onClick={() => onChange(tags.filter((t) => t !== tag))}>
              ×
            </button>
          </span>
        ))}
      </div>
      <input
        list={dataListId}
        value={draft}
        placeholder={placeholder ?? 'Add tag'}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            addTag(draft);
          }
        }}
        onBlur={() => addTag(draft)}
      />
      <datalist id={dataListId}>
        {suggestions.map((tag) => (
          <option key={tag} value={tag} />
        ))}
      </datalist>
    </div>
  );
}

function TagConditionEditor({
  label,
  condition,
  suggestions,
  onChange,
  idPrefix
}: {
  label: string;
  condition?: TagCondition;
  suggestions: string[];
  onChange: (next: TagCondition | undefined) => void;
  idPrefix?: string;
}) {
  const current = condition ?? {};
  const prefix = idPrefix ?? label.replace(/\s+/g, '-').toLowerCase();
  const update = (key: keyof TagCondition, nextTags: string[]) => {
    const next: TagCondition = { ...current, [key]: nextTags.length ? nextTags : undefined };
    if (!next.all && !next.any && !next.none) {
      onChange(undefined);
      return;
    }
    onChange(next);
  };

  return (
    <div className="condition-editor">
      <div className="condition-title">{label}</div>
      <TagInput
        label="all"
        tags={current.all ?? []}
        suggestions={suggestions}
        listId={`${prefix}-all`}
        onChange={(tags) => update('all', tags)}
      />
      <TagInput
        label="any"
        tags={current.any ?? []}
        suggestions={suggestions}
        listId={`${prefix}-any`}
        onChange={(tags) => update('any', tags)}
      />
      <TagInput
        label="none"
        tags={current.none ?? []}
        suggestions={suggestions}
        listId={`${prefix}-none`}
        onChange={(tags) => update('none', tags)}
      />
    </div>
  );
}

function MultiSelect({
  label,
  options,
  selected,
  onChange
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <div className="multi-select">
      <div className="multi-select-label">{label}</div>
      <div className="multi-select-grid">
        {options.map((option) => {
          const isChecked = selected.includes(option);
          return (
            <label key={option} className="multi-select-item">
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => {
                  if (isChecked) {
                    onChange(selected.filter((value) => value !== option));
                  } else {
                    onChange([...selected, option]);
                  }
                }}
              />
              <span>{option}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

function DialogueEditor({
  lines,
  onChange
}: {
  lines: { speaker: string; text: string; aside?: string; narration?: string }[];
  onChange: (next: { speaker: string; text: string; aside?: string; narration?: string }[]) => void;
}) {
  return (
    <div className="dialogue-editor">
      {lines.map((line, index) => (
        <div key={`${line.speaker}-${index}`} className="dialogue-row">
          <input
            value={line.speaker}
            placeholder="Speaker"
            onChange={(event) => {
              const next = [...lines];
              next[index] = { ...next[index], speaker: event.target.value };
              onChange(next);
            }}
          />
          <input
            value={line.aside ?? ''}
            placeholder="Aside (optional)"
            onChange={(event) => {
              const next = [...lines];
              next[index] = { ...next[index], aside: event.target.value || undefined };
              onChange(next);
            }}
          />
          <input
            value={line.text}
            placeholder="Dialogue line"
            onChange={(event) => {
              const next = [...lines];
              next[index] = { ...next[index], text: event.target.value };
              onChange(next);
            }}
          />
          <input
            value={line.narration ?? ''}
            placeholder="Narration (optional)"
            onChange={(event) => {
              const next = [...lines];
              next[index] = { ...next[index], narration: event.target.value || undefined };
              onChange(next);
            }}
          />
          <button className="secondary" onClick={() => onChange(lines.filter((_, i) => i !== index))}>
            Remove
          </button>
        </div>
      ))}
      <button
        className="secondary"
        onClick={() => onChange([...lines, { speaker: '', text: '', aside: '', narration: '' }])}
      >
        Add dialogue line
      </button>
    </div>
  );
}

function validateReferences(story: StoryData): string[] {
  const errors: string[] = [];
  const sceneIds = new Set(story.scenes.map((scene) => scene.id));

  if (!sceneIds.has(story.startSceneId)) {
    errors.push(`startSceneId (${story.startSceneId}) does not match any scene id`);
  }

  story.scenes.forEach((scene, sceneIndex) => {
    const evidenceIds = new Set(scene.evidence.map((evidence) => evidence.id));
    const actionIds = new Set<string>();

    scene.steps.forEach((step, stepIndex) => {
      step.actions.forEach((action) => actionIds.add(action.id));

      step.actions.forEach((action) => {
        if (!step.outcomes[action.id]) {
          errors.push(`scenes[${sceneIndex}].steps[${stepIndex}].outcomes missing ${action.id}`);
        }
      });

      Object.entries(step.outcomes).forEach(([actionId, outcome]) => {
        if (outcome.evidenceIds) {
          outcome.evidenceIds.forEach((evidenceId) => {
            if (!evidenceIds.has(evidenceId)) {
              errors.push(`scene ${scene.id} outcome ${actionId} references missing evidence ${evidenceId}`);
            }
          });
        }
        if (outcome.disableActionIds) {
          outcome.disableActionIds.forEach((disabledId) => {
            if (!actionIds.has(disabledId)) {
              errors.push(`scene ${scene.id} outcome ${actionId} disables missing action ${disabledId}`);
            }
          });
        }
      });
    });

    const optionIds = new Set(scene.options.map((option) => option.id));
    const defaultCount = scene.options.filter((option) => option.defaultVisible).length;
    if (defaultCount !== 1) {
      errors.push(`scene ${scene.id} must have exactly one defaultVisible option`);
    }

    Object.keys(scene.outcomeByOption).forEach((optionId) => {
      if (!optionIds.has(optionId as 'A' | 'B' | 'C')) {
        errors.push(`scene ${scene.id} outcomeByOption has unknown option ${optionId}`);
      }
    });

    optionIds.forEach((optionId) => {
      if (!scene.outcomeByOption[optionId]) {
        errors.push(`scene ${scene.id} outcomeByOption missing ${optionId}`);
      }
    });

    scene.options.forEach((option) => {
      option.next.forEach((route) => {
        if (route.to && !sceneIds.has(route.to)) {
          errors.push(`scene ${scene.id} option ${option.id} routes to missing scene ${route.to}`);
        }
        if (route.ifActions) {
          const actionRefs = [
            ...(route.ifActions.all ?? []),
            ...(route.ifActions.any ?? []),
            ...(route.ifActions.none ?? []),
          ];
          actionRefs.forEach((actionId) => {
            if (!actionIds.has(actionId)) {
              errors.push(`scene ${scene.id} option ${option.id} references missing action ${actionId} in ifActions`);
            }
          });
        }
      });
    });
  });

  return errors;
}

function collectTagLibrary(story: StoryData): string[] {
  const tags = new Set<string>();
  story.scenes.forEach((scene) => {
    scene.options.forEach((option) => {
      option.tagsAdded?.global?.forEach((tag) => tags.add(tag));
      option.tagsAdded?.scene?.forEach((tag) => tags.add(tag));
      option.next.forEach((route) => {
        route.ifGlobal?.all?.forEach((tag) => tags.add(tag));
        route.ifGlobal?.any?.forEach((tag) => tags.add(tag));
        route.ifGlobal?.none?.forEach((tag) => tags.add(tag));
        route.ifScene?.all?.forEach((tag) => tags.add(tag));
        route.ifScene?.any?.forEach((tag) => tags.add(tag));
        route.ifScene?.none?.forEach((tag) => tags.add(tag));
      });
    });
    scene.steps.forEach((step) => {
      Object.values(step.outcomes).forEach((outcome) => {
        outcome.tagsAdded?.global?.forEach((tag) => tags.add(tag));
        outcome.tagsAdded?.scene?.forEach((tag) => tags.add(tag));
      });
    });
  });
  return Array.from(tags).sort();
}

function collectActionIds(scene: Scene | null): string[] {
  if (!scene) return [];
  const ids = new Set<string>();
  scene.steps.forEach((step) => {
    step.actions.forEach((action) => ids.add(action.id));
  });
  return Array.from(ids).sort();
}

function collectEvidenceIds(scene: Scene | null): string[] {
  if (!scene) return [];
  return scene.evidence.map((evidence) => evidence.id);
}

function getUniqueId(existing: Set<string>, prefix: string): string {
  let index = 1;
  while (existing.has(`${prefix}${index}`)) {
    index += 1;
  }
  return `${prefix}${index}`;
}

function createDefaultOptions(): Scene['options'] {
  return OPTION_IDS.map((optionId, index) => ({
    id: optionId,
    text: optionId === 'A' ? 'Choix par defaut.' : `Choix ${optionId}.`,
    defaultVisible: optionId === 'A',
    next: []
  }));
}

function createDefaultOutcomes(): Scene['outcomeByOption'] {
  return {
    A: { text: 'La suite se dessine.' },
    B: { text: 'La suite se dessine.' },
    C: { text: 'La suite se dessine.' }
  };
}

function createActionId(scene: Scene, role: string): string {
  const existing = new Set(collectActionIds(scene));
  return getUniqueId(existing, `${scene.id}_${role}_`);
}

function createStoryStep(sceneId: string): SceneStep {
  const actions: SceneAction[] = [
    {
      id: `${sceneId}_warrior_1`,
      role: 'warrior',
      buttonText: 'Action du guerrier.',
      text: 'Action du guerrier.',
      stage: 'agit avec prudence.',
    },
    {
      id: `${sceneId}_sage_1`,
      role: 'sage',
      buttonText: 'Action du sage.',
      text: 'Action du sage.',
      stage: 'observe et decide.',
    },
    {
      id: `${sceneId}_ranger_1`,
      role: 'ranger',
      buttonText: 'Action du ranger.',
      text: 'Action du ranger.',
      stage: 'se deplace en silence.',
    },
  ];

  const outcomes: Record<string, SceneActionOutcome> = {};
  actions.forEach((action) => {
    outcomes[action.id] = {
      narration: 'Le groupe enregistre ce choix.'
    };
  });

  return {
    id: `${sceneId}_step1`,
    actions,
    outcomes
  };
}

function createSceneTemplate(sceneId: string, type: 'story' | 'combat' | 'timed' | 'ending'): Scene {
  const base: Scene = {
    id: sceneId,
    title: 'Nouvelle scene',
    canonicalTruth: 'Verite interne a definir.',
    intro: 'Une nouvelle scene commence. Votre groupe observe.',
    evidence: [],
    steps: [],
    options: createDefaultOptions(),
    unlockRules: [],
    outcomeByOption: createDefaultOutcomes()
  };

  if (type === 'combat') {
    base.mode = 'combat';
    base.combat = { enemyName: 'Adversaire', enemyHp: 20, enemyAttack: 6, allowRun: true };
    base.steps = [];
    return base;
  }

  if (type === 'timed') {
    base.mode = 'timed';
    base.timed = {
      kind: 'rest',
      durationSeconds: 3600,
      allowEarly: true,
      statusText: 'Le groupe attend.',
      restWaitingText: 'Le groupe attend....',
    };
    base.steps = [createStoryStep(sceneId)];
    return base;
  }

  if (type === 'ending') {
    base.isEnding = true;
    base.steps = [createStoryStep(sceneId)];
    return base;
  }

  base.steps = [createStoryStep(sceneId)];
  return base;
}

function parseOptionId(handleId?: string | null): string | null {
  if (!handleId) return null;
  if (handleId.startsWith('option-')) {
    return handleId.replace('option-', '');
  }
  return null;
}

export default function App() {
  const [story, setStory] = useState<StoryData | null>(null);
  const [schema, setSchema] = useState<Record<string, unknown> | null>(null);
  const [validatorErrors, setValidatorErrors] = useState<string[]>([]);
  const [status, setStatus] = useState<StatusMessage | null>(null);
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [sceneJsonDraft, setSceneJsonDraft] = useState('');
  const [sceneJsonDirty, setSceneJsonDirty] = useState(false);
  const [storyJsonDraft, setStoryJsonDraft] = useState('');
  const [storyJsonDirty, setStoryJsonDirty] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [editorMode, setEditorMode] = useState<'backbone' | 'detailed'>('detailed');
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [newSceneType, setNewSceneType] = useState<'story' | 'combat' | 'timed' | 'ending'>('story');
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  const historyRef = useRef<StoryData[]>([]);
  const historyIndexRef = useRef(-1);
  const validatorRef = useRef<((data: unknown) => boolean) | null>(null);
  const reactFlowRef = useRef<ReactFlowInstance | null>(null);
  const connectingRef = useRef<{ sourceId: string; optionId: string } | null>(null);

  const selectedScene = useMemo(() => {
    if (!story || !selectedSceneId) return null;
    return story.scenes.find((scene) => scene.id === selectedSceneId) ?? null;
  }, [story, selectedSceneId]);

  const sceneMap = useMemo(() => {
    if (!story) return new Map<string, Scene>();
    return new Map(story.scenes.map((scene) => [scene.id, scene]));
  }, [story]);

  const tagLibrary = useMemo(() => (story ? collectTagLibrary(story) : []), [story]);
  const actionIdLibrary = useMemo(() => collectActionIds(selectedScene), [selectedScene]);
  const evidenceIdLibrary = useMemo(() => collectEvidenceIds(selectedScene), [selectedScene]);

  const updateValidation = useCallback(
    (nextStory: StoryData) => {
      const errors: string[] = [];
      if (validatorRef.current) {
        const isValid = validatorRef.current(nextStory);
        if (!isValid) {
          const ajvErrors = (validatorRef.current as unknown as { errors?: ErrorObject[] }).errors ?? [];
          ajvErrors.forEach((err) => {
            errors.push(`${err.instancePath || '(root)'} ${err.message ?? 'invalid'}`);
          });
        }
      }
      errors.push(...validateReferences(nextStory));
      setValidatorErrors(errors);
    },
    [setValidatorErrors]
  );

  const commitStory = useCallback(
    (nextStory: StoryData, { replaceHistory = false } = {}) => {
      setStory(nextStory);
      setIsDirty(true);

      if (!replaceHistory) {
        const history = historyRef.current.slice(0, historyIndexRef.current + 1);
        history.push(deepClone(nextStory));
        if (history.length > HISTORY_LIMIT) {
          history.shift();
        }
        historyRef.current = history;
        historyIndexRef.current = history.length - 1;
      }

      if (!storyJsonDirty) {
        setStoryJsonDraft(JSON.stringify(nextStory, null, 2));
      }

      updateValidation(nextStory);
    },
    [storyJsonDirty, updateValidation]
  );

  const updateStory = useCallback(
    (updater: (current: StoryData) => StoryData, { replaceHistory = false } = {}) => {
      if (!story) return;
      const nextStory = updater(story);
      commitStory(nextStory, { replaceHistory });
    },
    [commitStory, story]
  );

  const handleNodeTitleChange = useCallback(
    (sceneId: string, nextTitle: string) => {
      updateStory(
        (current) => {
          const next = deepClone(current);
          const scene = next.scenes.find((item) => item.id === sceneId);
          if (!scene) return current;
          scene.title = nextTitle;
          return next;
        },
        { replaceHistory: false }
      );
    },
    [updateStory]
  );

  const updateSelectedScene = useCallback(
    (
      updater: (scene: Scene, story: StoryData) => void,
      { replaceHistory = true }: { replaceHistory?: boolean } = {}
    ) => {
      if (!selectedSceneId) return;
      updateStory(
        (current) => {
          const next = deepClone(current);
          const scene = next.scenes.find((item) => item.id === selectedSceneId);
          if (!scene) return current;
          updater(scene, next);
          return next;
        },
        { replaceHistory }
      );
    },
    [selectedSceneId, updateStory]
  );

  const renameEvidenceId = useCallback(
    (scene: Scene, previousId: string, nextId: string) => {
      scene.evidence = scene.evidence.map((evidence) =>
        evidence.id === previousId ? { ...evidence, id: nextId } : evidence
      );
      scene.unlockRules = scene.unlockRules.map((rule) => ({
        ...rule,
        evidenceIds: rule.evidenceIds.map((id) => (id === previousId ? nextId : id))
      }));
      scene.steps.forEach((step) => {
        Object.values(step.outcomes).forEach((outcome) => {
          if (!outcome.evidenceIds) return;
          outcome.evidenceIds = outcome.evidenceIds.map((id) => (id === previousId ? nextId : id));
        });
      });
    },
    []
  );

  const renameActionId = useCallback(
    (scene: Scene, previousId: string, nextId: string) => {
      scene.steps.forEach((step) => {
        step.actions = step.actions.map((action) =>
          action.id === previousId ? { ...action, id: nextId } : action
        );
        if (step.outcomes[previousId]) {
          step.outcomes[nextId] = step.outcomes[previousId];
          delete step.outcomes[previousId];
        }
      });

      scene.steps.forEach((step) => {
        Object.values(step.outcomes).forEach((outcome) => {
          if (!outcome.disableActionIds) return;
          outcome.disableActionIds = outcome.disableActionIds.map((id) => (id === previousId ? nextId : id));
        });
      });

      scene.options.forEach((option) => {
        option.next.forEach((route) => {
          if (!route.ifActions) return;
          if (route.ifActions.all) {
            route.ifActions.all = route.ifActions.all.map((id) => (id === previousId ? nextId : id));
          }
          if (route.ifActions.any) {
            route.ifActions.any = route.ifActions.any.map((id) => (id === previousId ? nextId : id));
          }
          if (route.ifActions.none) {
            route.ifActions.none = route.ifActions.none.map((id) => (id === previousId ? nextId : id));
          }
        });
      });
    },
    []
  );

  const removeEvidenceId = useCallback((scene: Scene, evidenceId: string) => {
    scene.evidence = scene.evidence.filter((item) => item.id !== evidenceId);
    scene.unlockRules = scene.unlockRules
      .map((rule) => ({ ...rule, evidenceIds: rule.evidenceIds.filter((id) => id !== evidenceId) }))
      .filter((rule) => rule.evidenceIds.length > 0);
    scene.steps.forEach((step) => {
      Object.values(step.outcomes).forEach((outcome) => {
        if (!outcome.evidenceIds) return;
        outcome.evidenceIds = outcome.evidenceIds.filter((id) => id !== evidenceId);
      });
    });
  }, []);

  const removeActionId = useCallback((scene: Scene, actionId: string) => {
    scene.steps.forEach((step) => {
      step.actions = step.actions.filter((action) => action.id !== actionId);
      if (step.outcomes[actionId]) {
        delete step.outcomes[actionId];
      }
    });
    scene.steps.forEach((step) => {
      Object.values(step.outcomes).forEach((outcome) => {
        if (!outcome.disableActionIds) return;
        outcome.disableActionIds = outcome.disableActionIds.filter((id) => id !== actionId);
      });
    });
    scene.options.forEach((option) => {
      option.next.forEach((route) => {
        if (!route.ifActions) return;
        if (route.ifActions.all) {
          route.ifActions.all = route.ifActions.all.filter((id) => id !== actionId);
        }
        if (route.ifActions.any) {
          route.ifActions.any = route.ifActions.any.filter((id) => id !== actionId);
        }
        if (route.ifActions.none) {
          route.ifActions.none = route.ifActions.none.filter((id) => id !== actionId);
        }
      });
    });
  }, []);

  const loadStory = useCallback(async () => {
    try {
      setStatus({ text: 'Loading story...', type: 'info' });
      const response = await fetch('/api/story');
      if (!response.ok) throw new Error('Failed to load story');
      const data = (await response.json()) as StoryData;
      setStory(data);
      setSelectedSceneId(data.startSceneId);
      setStoryJsonDraft(JSON.stringify(data, null, 2));
      setStoryJsonDirty(false);
      historyRef.current = [deepClone(data)];
      historyIndexRef.current = 0;
      setIsDirty(false);
      updateValidation(data);
      setStatus({ text: 'Story loaded.', type: 'success' });
    } catch (error) {
      setStatus({ text: 'Failed to load story.', type: 'error' });
    }
  }, [updateValidation]);

  const loadSchema = useCallback(async () => {
    try {
      const response = await fetch('/api/schema');
      if (!response.ok) throw new Error('Failed to load schema');
      const data = (await response.json()) as Record<string, unknown>;
      setSchema(data);
      validatorRef.current = ajv.compile(data);
    } catch (error) {
      setSchema(null);
      validatorRef.current = null;
      setStatus({ text: 'Failed to load schema.', type: 'error' });
    }
  }, []);

  useEffect(() => {
    void loadSchema();
    void loadStory();
  }, [loadSchema, loadStory]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    if (story) {
      updateValidation(story);
    }
  }, [story, schema, updateValidation]);

  useEffect(() => {
    if (!selectedScene) return;
    const nextJson = JSON.stringify(selectedScene, null, 2);
    setSceneJsonDraft(nextJson);
    setSceneJsonDirty(false);
  }, [selectedScene]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      const isUndo = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z';
      if (!isUndo) return;

      const target = event.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA'].includes(target.tagName)) {
        return;
      }

      event.preventDefault();
      if (historyIndexRef.current > 0) {
        historyIndexRef.current -= 1;
        const nextStory = historyRef.current[historyIndexRef.current];
        if (nextStory) {
          setStory(deepClone(nextStory));
          setIsDirty(true);
          if (!storyJsonDirty) {
            setStoryJsonDraft(JSON.stringify(nextStory, null, 2));
          }
          updateValidation(nextStory);
        }
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [storyJsonDirty, updateValidation]);

  useEffect(() => {
    if (!story) return;
    const graph = buildGraph(story, selectedSceneId, handleNodeTitleChange);
    setNodes(graph.nodes);
    setEdges(graph.edges);
  }, [handleNodeTitleChange, story, selectedSceneId, setNodes, setEdges]);

  const handleNodesChange = useCallback(
    (changes: Parameters<typeof onNodesChange>[0]) => {
      onNodesChange(changes);
      if (!story) return;
      const positionChanges = changes.filter(
        (change) => change.type === 'position' && 'position' in change && !change.dragging
      ) as Array<{ id: string; position: { x: number; y: number } }>;
      if (!positionChanges.length) return;

      updateStory(
        (current) => ({
          ...current,
          scenes: current.scenes.map((scene) => {
            const change = positionChanges.find((item) => item.id === scene.id);
            if (!change) return scene;
            const meta = { ...(scene.meta as Record<string, unknown> | undefined) };
            const graph = { ...(meta.graph as Record<string, unknown> | undefined) };
            graph.position = { x: change.position.x, y: change.position.y };
            meta.graph = graph;
            return { ...scene, meta };
          })
        }),
        { replaceHistory: true }
      );
    },
    [onNodesChange, story, updateStory]
  );

  useEffect(() => {
    if (!story) return;
    setNodes((prevNodes) =>
      prevNodes.map((node) => {
        const scene = sceneMap.get(node.id);
        if (!scene) return node;
        return {
          ...node,
          style: getNodeStyle(scene, selectedSceneId === node.id)
        };
      })
    );
  }, [sceneMap, selectedSceneId, setNodes, story]);

  const addScene = (type: 'story' | 'combat' | 'timed' | 'ending', position?: { x: number; y: number }) => {
    if (!story) return;
    const existingIds = new Set(story.scenes.map((scene) => scene.id));
    const newId = getUniqueId(existingIds, 'scene_');
    const newScene = createSceneTemplate(newId, type);
    if (position) {
      newScene.meta = { ...(newScene.meta as Record<string, unknown> | undefined), graph: { position } };
    }
    const nextStory: StoryData = {
      ...story,
      scenes: [...story.scenes, newScene]
    };
    commitStory(nextStory);
    setSelectedSceneId(newId);
    setStatus({ text: `Scene ${newId} created.`, type: 'success' });
  };

  const duplicateScene = () => {
    if (!story || !selectedScene) return;
    const existingIds = new Set(story.scenes.map((scene) => scene.id));
    const newId = getUniqueId(existingIds, `${selectedScene.id}_copy_`);
    const copy = deepClone(selectedScene);
    copy.id = newId;
    copy.title = `${selectedScene.title} (copie)`;
    if (copy.meta && typeof copy.meta === 'object') {
      const meta = { ...(copy.meta as Record<string, unknown>) };
      const graph = { ...(meta.graph as Record<string, unknown>) };
      const position = graph.position as { x?: number; y?: number } | undefined;
      if (position && typeof position.x === 'number' && typeof position.y === 'number') {
        graph.position = { x: position.x + 60, y: position.y + 60 };
      }
      meta.graph = graph;
      copy.meta = meta;
    }
    const nextStory: StoryData = { ...story, scenes: [...story.scenes, copy] };
    commitStory(nextStory);
    setSelectedSceneId(newId);
    setStatus({ text: `Scene ${newId} duplicated.`, type: 'success' });
  };

  const deleteScene = () => {
    if (!story || !selectedScene) return;
    const inbound = story.scenes.some((scene) =>
      scene.options.some((option) => option.next.some((route) => route.to === selectedScene.id))
    );
    if (inbound) {
      const confirm = window.confirm(
        'This scene has incoming links. Delete it and remove those links?'
      );
      if (!confirm) return;
    }

    const nextStory: StoryData = {
      ...story,
      scenes: story.scenes
        .filter((scene) => scene.id !== selectedScene.id)
        .map((scene) => ({
          ...scene,
          options: scene.options.map((option) => ({
            ...option,
            next: option.next.filter((route) => route.to !== selectedScene.id)
          }))
        })),
      startSceneId: story.startSceneId === selectedScene.id ? story.scenes[0]?.id ?? '' : story.startSceneId
    };

    commitStory(nextStory);
    setSelectedSceneId(nextStory.startSceneId || nextStory.scenes[0]?.id || null);
    setStatus({ text: `Scene ${selectedScene.id} deleted.`, type: 'success' });
  };

  const deleteScenes = (sceneIds: string[]) => {
    if (!story || sceneIds.length === 0) return;
    const confirmDelete = window.confirm(`Delete ${sceneIds.length} scene(s) and remove their links?`);
    if (!confirmDelete) return;

    const nextStory: StoryData = {
      ...story,
      scenes: story.scenes
        .filter((scene) => !sceneIds.includes(scene.id))
        .map((scene) => ({
          ...scene,
          options: scene.options.map((option) => ({
            ...option,
            next: option.next.filter((route) => !route.to || !sceneIds.includes(route.to))
          }))
        }))
    };

    if (!nextStory.scenes.find((scene) => scene.id === nextStory.startSceneId)) {
      nextStory.startSceneId = nextStory.scenes[0]?.id ?? '';
    }

    commitStory(nextStory);
    setSelectedSceneId(nextStory.startSceneId || nextStory.scenes[0]?.id || null);
    setSelectedNodeIds([]);
    setContextMenu(null);
    setStatus({ text: `Deleted ${sceneIds.length} scene(s).`, type: 'success' });
  };

  const updateSceneType = (sceneId: string, type: 'story' | 'combat' | 'timed' | 'ending') => {
    updateStory(
      (current) => {
        const next = deepClone(current);
        const scene = next.scenes.find((item) => item.id === sceneId);
        if (!scene) return current;

        if (type === 'ending') {
          scene.isEnding = true;
          scene.mode = 'story';
        } else {
          scene.isEnding = false;
          scene.mode = type;
        }

        if (type === 'combat') {
          scene.combat = scene.combat ?? { enemyName: 'Adversaire', enemyHp: 20, enemyAttack: 6, allowRun: true };
          scene.timed = undefined;
          scene.steps = [];
        } else if (type === 'timed') {
          scene.timed = scene.timed ?? {
            kind: 'rest',
            durationSeconds: 3600,
            allowEarly: true,
            statusText: 'Le groupe attend.',
            restWaitingText: 'Le groupe attend....',
          };
          scene.combat = undefined;
          if (!scene.steps.length) {
            scene.steps = [createStoryStep(scene.id)];
          }
        } else {
          scene.combat = undefined;
          scene.timed = undefined;
          if (!scene.steps.length) {
            scene.steps = [createStoryStep(scene.id)];
          }
        }

        return next;
      },
      { replaceHistory: false }
    );
  };

  const handleConnectStart = useCallback(
    (_: React.MouseEvent | React.TouchEvent, params: { nodeId?: string | null; handleId?: string | null; handleType?: string }) => {
      if (!params.nodeId || params.handleType !== 'source') return;
      const optionId = parseOptionId(params.handleId);
      if (!optionId) return;
      connectingRef.current = { sourceId: params.nodeId, optionId };
    },
    []
  );

  const handleConnect = useCallback(
    (connection: Connection) => {
      if (!story || !connection.source || !connection.target) return;
      const optionId = parseOptionId(connection.sourceHandle);
      if (!optionId) return;

      updateStory((current) => {
        const next = deepClone(current);
        const sourceScene = next.scenes.find((scene) => scene.id === connection.source);
        if (!sourceScene) return current;
        const option = sourceScene.options.find((opt) => opt.id === optionId);
        if (!option) return current;

        const newRoute: TagRoute = { to: connection.target };
        if (option.next.length > 0) {
          const shouldAppend = window.confirm(`Option ${optionId} already has routes. Add another route?`);
          if (shouldAppend) {
            option.next.push(newRoute);
          } else {
            option.next = [newRoute];
          }
        } else {
          option.next.push(newRoute);
        }
        return next;
      });
    },
    [story, updateStory]
  );

  const handleConnectEnd = useCallback(
    (event: MouseEvent | TouchEvent) => {
      if (!story || !connectingRef.current) return;
      const target = event.target as HTMLElement | null;
      const pane = target?.closest('.react-flow__pane');
      if (!pane) {
        connectingRef.current = null;
        return;
      }

      const confirmNew = window.confirm('Create a new scene and connect this option?');
      if (!confirmNew) {
        connectingRef.current = null;
        return;
      }

      const point =
        'touches' in event && event.touches.length > 0
          ? { x: event.touches[0].clientX, y: event.touches[0].clientY }
          : { x: (event as MouseEvent).clientX, y: (event as MouseEvent).clientY };

      const position = reactFlowRef.current?.screenToFlowPosition(point) ?? { x: 0, y: 0 };
      const newId = getUniqueId(new Set(story.scenes.map((scene) => scene.id)), 'scene_');
      const newScene = createSceneTemplate(newId, newSceneType);
      newScene.meta = { ...(newScene.meta as Record<string, unknown> | undefined), graph: { position } };

      updateStory((current) => {
        const next = deepClone(current);
        next.scenes.push(newScene);
        const sourceScene = next.scenes.find((scene) => scene.id === connectingRef.current?.sourceId);
        const option = sourceScene?.options.find((opt) => opt.id === connectingRef.current?.optionId);
        if (option) {
          option.next.push({ to: newId });
        }
        return next;
      });
      setSelectedSceneId(newId);
      connectingRef.current = null;
    },
    [newSceneType, story, updateStory]
  );

  const applySceneJson = () => {
    if (!story || !selectedScene) return;
    try {
      const parsed = JSON.parse(sceneJsonDraft) as Scene;
      if (!parsed.id || parsed.id !== selectedScene.id) {
        setStatus({ text: 'Scene JSON must keep the same scene id.', type: 'error' });
        return;
      }
      const nextStory: StoryData = {
        ...story,
        scenes: story.scenes.map((scene) => (scene.id === selectedScene.id ? parsed : scene))
      };
      commitStory(nextStory);
      setSceneJsonDirty(false);
      setStatus({ text: 'Scene JSON applied.', type: 'success' });
    } catch (error) {
      setStatus({ text: 'Scene JSON is invalid.', type: 'error' });
    }
  };

  const applyStoryJson = () => {
    try {
      const parsed = JSON.parse(storyJsonDraft) as StoryData;
      commitStory(parsed);
      setStoryJsonDirty(false);
      setStatus({ text: 'Story JSON applied.', type: 'success' });
    } catch (error) {
      setStatus({ text: 'Story JSON is invalid.', type: 'error' });
    }
  };

  const saveStory = async () => {
    if (!story) return;
    try {
      const response = await fetch('/api/story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(story)
      });
      if (!response.ok) throw new Error('Failed to save');
      setIsDirty(false);
      setStatus({ text: 'Saved to story-data.json.', type: 'success' });
    } catch (error) {
      setStatus({ text: 'Failed to save story.', type: 'error' });
    }
  };

  const reloadStory = async () => {
    await loadStory();
    setStatus({ text: 'Reloaded story from disk.', type: 'success' });
  };

  const endingsCount = story?.scenes.filter((scene) => scene.isEnding).length ?? 0;
  const scenesCount = story?.scenes.length ?? 0;
  const isBackboneMode = editorMode === 'backbone';
  const selectedSceneType = selectedScene ? (selectedScene.isEnding ? 'ending' : selectedScene.mode ?? 'story') : 'story';
  const selectedSceneIsEnding = Boolean(selectedScene?.isEnding);
  const edgeTypes = useMemo(() => ({ tagged: TaggedEdge }), []);
  const nodeTypes = useMemo(() => ({ scene: SceneNode }), []);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Story Visualizer + Editor</h1>
        <p>Inspect branches, edit scenes, and save directly to story-data.json.</p>
        <div className="row">
          <button className="secondary" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? 'Switch to light' : 'Switch to dark'}
          </button>
        </div>
        <div className="mode-switch">
          <button
            className={isBackboneMode ? '' : 'secondary'}
            onClick={() => setEditorMode('backbone')}
            type="button"
          >
            Backbone
          </button>
          <button
            className={isBackboneMode ? 'secondary' : ''}
            onClick={() => setEditorMode('detailed')}
            type="button"
          >
            Detailed
          </button>
        </div>
        <div className="small mode-switch-hint">
          {isBackboneMode
            ? 'Backbone mode focuses on scene graph structure and route links.'
            : 'Detailed mode includes full writing fields, actions, evidence, and route conditions.'}
        </div>
      </header>
      <div className="content">
        <section className="panel">
          <div className="panel-section">
            <h2>Branch Map</h2>
            <div className="scene-meta">
              <span className="badge">{scenesCount} scenes</span>
              <span className="badge">{endingsCount} endings</span>
              {schema && <span className="pill">Schema loaded</span>}
              {!schema && <span className="pill">Schema missing</span>}
            </div>
          </div>
          <div className="panel-section">
            <label>Start scene</label>
            <select
              value={story?.startSceneId ?? ''}
              onChange={(event) => {
                const value = event.target.value;
                updateStory((current) => ({ ...current, startSceneId: value }), { replaceHistory: false });
              }}
            >
              {story?.scenes.map((scene) => (
                <option key={scene.id} value={scene.id}>
                  {scene.id} — {scene.title}
                </option>
              ))}
            </select>
          </div>
          <div className="panel-section">
            <label>New scene</label>
            <div className="row">
              <select value={newSceneType} onChange={(event) => setNewSceneType(event.target.value as typeof newSceneType)}>
                <option value="story">Story scene</option>
                <option value="combat">Combat scene</option>
                <option value="timed">Timed scene</option>
                <option value="ending">Ending</option>
              </select>
              <button onClick={() => addScene(newSceneType)}>Add Scene</button>
            </div>
          </div>
          <div className="graph-wrap">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              fitView
              nodesDraggable
              nodesConnectable
              selectionOnDrag
              selectionMode={SelectionMode.Partial}
              onNodeClick={(_, node) => setSelectedSceneId(node.id)}
              onNodesChange={handleNodesChange}
              onEdgesChange={onEdgesChange}
              onSelectionChange={(selection) => {
                const nextSelected = selection.nodes.map((node) => node.id);
                setSelectedNodeIds(nextSelected);
              }}
              onConnectStart={handleConnectStart}
              onConnect={handleConnect}
              onConnectEnd={handleConnectEnd}
              onPaneClick={() => setContextMenu(null)}
              onPaneContextMenu={(event) => {
                event.preventDefault();
                setContextMenu({ x: event.clientX, y: event.clientY });
              }}
              onNodeContextMenu={(event, node) => {
                event.preventDefault();
                setSelectedNodeIds((prev) => (prev.includes(node.id) ? prev : [node.id]));
                setContextMenu({ x: event.clientX, y: event.clientY });
              }}
              onInit={(instance) => {
                reactFlowRef.current = instance;
              }}
              edgeTypes={edgeTypes}
              nodeTypes={nodeTypes}
            >
              <Background color="var(--flow-bg)" gap={20} />
              <MiniMap
                nodeColor={(node) =>
                  story?.scenes.find((scene) => scene.id === node.id)?.isEnding ? 'var(--minimap-ending)' : 'var(--minimap-node)'
                }
                nodeStrokeWidth={3}
              />
              <Controls />
            </ReactFlow>
            {contextMenu ? (
              <div className="graph-context-menu" style={{ top: contextMenu.y, left: contextMenu.x }}>
                <div className="graph-context-title">{selectedNodeIds.length || 0} selected</div>
                <button
                  className="danger"
                  disabled={selectedNodeIds.length === 0}
                  onClick={() => deleteScenes(selectedNodeIds)}
                >
                  Delete selected
                </button>
              </div>
            ) : null}
          </div>
          <div className="panel-section">
            <div className="small">
              {isBackboneMode
                ? 'Backbone mode: focus on scene types, option labels, and links between nodes.'
                : 'Edge pills: A/B/C = option id. Hover a pill to see tag conditions.'}
            </div>
            <div className="row">
              <button onClick={saveStory} disabled={!story || validatorErrors.length > 0}>
                Save to story-data.json
              </button>
              <button className="secondary" onClick={reloadStory}>
                Reload from disk
              </button>
              {!isBackboneMode ? (
                <button className="secondary" onClick={applyStoryJson} disabled={!storyJsonDirty}>
                  Apply Story JSON
                </button>
              ) : null}
            </div>
            <div className="status">{isDirty ? 'Unsaved changes.' : 'All changes saved.'}</div>
            {status && <div className={`status ${status.type}`}>{status.text}</div>}
            {validatorErrors.length > 0 && (
              <div className="panel-section">
                <div className="status error">Validation errors:</div>
                <ul className="error-list">
                  {validatorErrors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
        <section className="panel">
          <div className="panel-section">
            <h2>Selected Scene</h2>
            <div className="scene-meta">
              {selectedScene ? <span className="badge">{selectedScene.id}</span> : <span className="badge">None</span>}
              <span>{getSceneSummary(selectedScene)}</span>
            </div>
            <div className="row">
              {selectedScene ? <button onClick={duplicateScene}>Duplicate Scene</button> : null}
              {selectedScene ? (
                <button className="danger" onClick={deleteScene}>
                  Delete Scene
                </button>
              ) : null}
            </div>
          </div>
          {!isBackboneMode && story?.combat && selectedScene?.mode === 'combat' ? (
            <div className="panel-section">
              <h2>Combat Defaults</h2>
              <div className="editor-grid">
                <label>Party HP</label>
                <input
                  type="number"
                  value={story.combat.partyHp}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    updateStory(
                      (current) => {
                        const next = deepClone(current);
                        if (!next.combat) return current;
                        next.combat.partyHp = Number.isFinite(value) ? value : next.combat.partyHp;
                        return next;
                      },
                      { replaceHistory: true }
                    );
                  }}
                />
              </div>
              {story.combat.actions.map((action, index) => (
                <div key={action.id} className="editor-card">
                  <div className="row">
                    <input
                      className="inline-input"
                      value={action.id}
                      onChange={(event) => {
                        const nextId = event.target.value.trim();
                        if (!nextId) return;
                        updateStory(
                          (current) => {
                            const next = deepClone(current);
                            if (!next.combat) return current;
                            if (next.combat.actions.some((item, idx) => idx !== index && item.id === nextId)) {
                              return current;
                            }
                            next.combat.actions[index].id = nextId;
                            return next;
                          },
                          { replaceHistory: true }
                        );
                      }}
                      placeholder="Combat action id"
                    />
                    <select
                      value={action.role}
                      onChange={(event) => {
                        const role = event.target.value;
                        updateStory(
                          (current) => {
                            const next = deepClone(current);
                            if (!next.combat) return current;
                            next.combat.actions[index].role = role;
                            return next;
                          },
                          { replaceHistory: true }
                        );
                      }}
                    >
                      {!ROLE_OPTIONS.includes(action.role as (typeof ROLE_OPTIONS)[number]) ? (
                        <option value={action.role}>{action.role}</option>
                      ) : null}
                      {ROLE_OPTIONS.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                    <button
                      className="secondary"
                      onClick={() => {
                        updateStory(
                          (current) => {
                            const next = deepClone(current);
                            if (!next.combat) return current;
                            const existingIds = new Set(next.combat.actions.map((item) => item.id));
                            const newId = getUniqueId(existingIds, 'combat_action_');
                            next.combat.actions.splice(index + 1, 0, {
                              ...deepClone(action),
                              id: newId
                            });
                            return next;
                          },
                          { replaceHistory: false }
                        );
                      }}
                    >
                      Duplicate
                    </button>
                    <button
                      className="danger"
                      onClick={() => {
                        updateStory(
                          (current) => {
                            const next = deepClone(current);
                            if (!next.combat) return current;
                            next.combat.actions = next.combat.actions.filter((_, idx) => idx !== index);
                            return next;
                          },
                          { replaceHistory: false }
                        );
                      }}
                    >
                      Delete
                    </button>
                  </div>
                  <label>Text</label>
                  <input
                    value={action.text}
                    onChange={(event) => {
                      const value = event.target.value;
                      updateStory(
                        (current) => {
                          const next = deepClone(current);
                          if (!next.combat) return current;
                          next.combat.actions[index].text = value;
                          return next;
                        },
                        { replaceHistory: true }
                      );
                    }}
                  />
                  <div className="grid-2">
                    <div className="field-row">
                      <label>Damage</label>
                      <input
                        type="number"
                        value={action.effect.damage ?? ''}
                        onChange={(event) => {
                          const raw = event.target.value;
                          updateStory(
                            (current) => {
                              const next = deepClone(current);
                              if (!next.combat) return current;
                              next.combat.actions[index].effect.damage = raw === '' ? undefined : Number(raw);
                              return next;
                            },
                            { replaceHistory: true }
                          );
                        }}
                      />
                    </div>
                    <div className="field-row">
                      <label>Block</label>
                      <input
                        type="number"
                        value={action.effect.block ?? ''}
                        onChange={(event) => {
                          const raw = event.target.value;
                          updateStory(
                            (current) => {
                              const next = deepClone(current);
                              if (!next.combat) return current;
                              next.combat.actions[index].effect.block = raw === '' ? undefined : Number(raw);
                              return next;
                            },
                            { replaceHistory: true }
                          );
                        }}
                      />
                    </div>
                    <div className="field-row">
                      <label>Enemy atk delta</label>
                      <input
                        type="number"
                        value={action.effect.enemyAttackDelta ?? ''}
                        onChange={(event) => {
                          const raw = event.target.value;
                          updateStory(
                            (current) => {
                              const next = deepClone(current);
                              if (!next.combat) return current;
                              next.combat.actions[index].effect.enemyAttackDelta = raw === '' ? undefined : Number(raw);
                              return next;
                            },
                            { replaceHistory: true }
                          );
                        }}
                      />
                    </div>
                    <div className="field-row">
                      <label>Run away</label>
                      <input
                        type="checkbox"
                        checked={Boolean(action.effect.run)}
                        onChange={(event) => {
                          const value = event.target.checked;
                          updateStory(
                            (current) => {
                              const next = deepClone(current);
                              if (!next.combat) return current;
                              next.combat.actions[index].effect.run = value || undefined;
                              return next;
                            },
                            { replaceHistory: true }
                          );
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
              <div className="row">
                <button
                  className="secondary"
                  onClick={() => {
                    updateStory(
                      (current) => {
                        const next = deepClone(current);
                        if (!next.combat) return current;
                        const existingIds = new Set(next.combat.actions.map((item) => item.id));
                        const newId = getUniqueId(existingIds, 'combat_action_');
                        next.combat.actions.push({
                          id: newId,
                          role: 'any',
                          text: 'Nouvelle action de combat.',
                          effect: {}
                        });
                        return next;
                      },
                      { replaceHistory: false }
                    );
                  }}
                >
                  Add combat action
                </button>
              </div>
            </div>
          ) : null}

          {!selectedScene ? (
            <div className="panel-section">
              <div className="small">Select a scene to edit its content.</div>
            </div>
          ) : isBackboneMode ? (
            <>
              <div className="panel-section">
                <h2>Backbone Settings</h2>
                <div className="editor-grid">
                  <label>Scene id</label>
                  <input value={selectedScene.id} disabled />
                  <label>Scene type</label>
                  <select
                    value={selectedSceneType}
                    onChange={(event) => updateSceneType(selectedScene.id, event.target.value as typeof selectedSceneType)}
                  >
                    <option value="story">Story</option>
                    <option value="combat">Combat</option>
                    <option value="timed">Timed</option>
                    <option value="ending">Ending</option>
                  </select>
                  <label>Title</label>
                  <input
                    value={selectedScene.title ?? ''}
                    onChange={(event) =>
                      updateSelectedScene(
                        (scene) => {
                          scene.title = event.target.value;
                        },
                        { replaceHistory: true }
                      )
                    }
                  />
                  <label>Journal title</label>
                  <input
                    value={selectedScene.journalTitle ?? ''}
                    onChange={(event) =>
                      updateSelectedScene(
                        (scene) => {
                          const nextTitle = event.target.value;
                          scene.journalTitle = nextTitle ? nextTitle : undefined;
                        },
                        { replaceHistory: true }
                      )
                    }
                  />
                  <label>Intermission text</label>
                  <input
                    value={selectedScene.intermissionText ?? ''}
                    placeholder="Later, you arrive at {scene}."
                    onChange={(event) =>
                      updateSelectedScene(
                        (scene) => {
                          const nextText = event.target.value;
                          scene.intermissionText = nextText ? nextText : undefined;
                        },
                        { replaceHistory: true }
                      )
                    }
                  />
                </div>
              </div>

              {selectedSceneIsEnding ? (
                <div className="panel-section">
                  <h2>Ending Scene</h2>
                  <div className="small">
                    Ending scenes skip actions and decisions in game. Players only see &quot;Fin.&quot; and
                    &quot;Recommencer l&apos;aventure&quot;.
                  </div>
                </div>
              ) : (
                <div className="panel-section">
                  <h2>Backbone Decisions</h2>
                  {selectedScene.options.map((option) => (
                    <div key={`backbone-option-${option.id}`} className="editor-card">
                      <div className="row">
                        <span className="badge">{formatSceneOptionLabel(option.id, selectedScene)}</span>
                        <label className="checkbox-row">
                          <input
                            type="checkbox"
                            checked={Boolean(option.defaultVisible)}
                            onChange={() =>
                              updateSelectedScene(
                                (scene) => {
                                  scene.options.forEach((item) => {
                                    item.defaultVisible = item.id === option.id;
                                  });
                                },
                                { replaceHistory: false }
                              )
                            }
                          />
                          Default
                        </label>
                        <label className="checkbox-row">
                          <input
                            type="checkbox"
                            checked={Boolean(option.isRisky)}
                            onChange={(event) =>
                              updateSelectedScene(
                                (scene) => {
                                  const target = scene.options.find((item) => item.id === option.id);
                                  if (!target) return;
                                  target.isRisky = event.target.checked;
                                },
                                { replaceHistory: true }
                              )
                            }
                          />
                          Risky
                        </label>
                      </div>
                      <label>Option text</label>
                      <input
                        value={option.text}
                        onChange={(event) =>
                          updateSelectedScene(
                            (scene) => {
                              const target = scene.options.find((item) => item.id === option.id);
                              if (!target) return;
                              target.text = event.target.value;
                            },
                            { replaceHistory: true }
                          )
                        }
                      />
                      <div className="route-list">
                        {option.next.map((route, routeIndex) => (
                          <div key={`backbone-route-${option.id}-${routeIndex}`} className="route-card">
                            <div className="row">
                              <label>Next scene</label>
                              <select
                                value={route.to ?? ''}
                                onChange={(event) =>
                                  updateSelectedScene(
                                    (scene) => {
                                      const target = scene.options.find((item) => item.id === option.id);
                                      if (!target) return;
                                      const nextRoute = target.next[routeIndex];
                                      if (!nextRoute) return;
                                      nextRoute.to = event.target.value ? event.target.value : null;
                                    },
                                    { replaceHistory: true }
                                  )
                                }
                              >
                                <option value="">END</option>
                                {story?.scenes.map((scene) => (
                                  <option key={scene.id} value={scene.id}>
                                    {scene.id} — {scene.title}
                                  </option>
                                ))}
                              </select>
                              <button
                                className="danger"
                                onClick={() =>
                                  updateSelectedScene(
                                    (scene) => {
                                      const target = scene.options.find((item) => item.id === option.id);
                                      if (!target) return;
                                      target.next = target.next.filter((_, idx) => idx !== routeIndex);
                                    },
                                    { replaceHistory: false }
                                  )
                                }
                              >
                                Remove route
                              </button>
                            </div>
                          </div>
                        ))}
                        <button
                          className="secondary"
                          onClick={() =>
                            updateSelectedScene(
                              (scene) => {
                                const target = scene.options.find((item) => item.id === option.id);
                                if (!target) return;
                                target.next.push({ to: story?.startSceneId ?? null });
                              },
                              { replaceHistory: false }
                            )
                          }
                        >
                          Add route
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="panel-section">
                <div className="small">
                  Backbone mode edits story structure only. Switch to Detailed mode to write intro text, actions,
                  evidence, route conditions, and outcomes.
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="panel-section">
                <h2>Scene Settings</h2>
                <div className="editor-grid">
                  <label>Scene type</label>
                  <select
                    value={selectedSceneType}
                    onChange={(event) => updateSceneType(selectedScene.id, event.target.value as typeof selectedSceneType)}
                  >
                    <option value="story">Story</option>
                    <option value="combat">Combat</option>
                    <option value="timed">Timed</option>
                    <option value="ending">Ending</option>
                  </select>
                  <label>Title</label>
                  <input
                    value={selectedScene.title ?? ''}
                    onChange={(event) =>
                      updateSelectedScene(
                        (scene) => {
                          scene.title = event.target.value;
                        },
                        { replaceHistory: true }
                      )
                    }
                  />
                  <label>Journal title</label>
                  <input
                    value={selectedScene.journalTitle ?? ''}
                    onChange={(event) =>
                      updateSelectedScene(
                        (scene) => {
                          const nextTitle = event.target.value;
                          scene.journalTitle = nextTitle ? nextTitle : undefined;
                        },
                        { replaceHistory: true }
                      )
                    }
                  />
                  <label>Intermission text</label>
                  <input
                    value={selectedScene.intermissionText ?? ''}
                    placeholder="Later, you arrive at {scene}."
                    onChange={(event) =>
                      updateSelectedScene(
                        (scene) => {
                          const nextText = event.target.value;
                          scene.intermissionText = nextText ? nextText : undefined;
                        },
                        { replaceHistory: true }
                      )
                    }
                  />
                  <label>Intro</label>
                  <textarea
                    value={selectedScene.intro ?? ''}
                    onChange={(event) =>
                      updateSelectedScene(
                        (scene) => {
                          scene.intro = event.target.value;
                        },
                        { replaceHistory: true }
                      )
                    }
                  />
                  <label>Canonical truth</label>
                  <textarea
                    value={selectedScene.canonicalTruth ?? ''}
                    onChange={(event) =>
                      updateSelectedScene(
                        (scene) => {
                          scene.canonicalTruth = event.target.value;
                        },
                        { replaceHistory: true }
                      )
                    }
                  />
                </div>
              </div>

              {selectedSceneIsEnding ? (
                <div className="panel-section">
                  <h2>Ending Scene</h2>
                  <div className="small">
                    Ending scenes now skip actions and decisions. The in-game footer shows a centered &quot;Fin.&quot;
                    and a restart button (&quot;Recommencer l&apos;aventure&quot;).
                  </div>
                </div>
              ) : null}

              {selectedScene.mode === 'combat' && selectedScene.combat ? (
                <div className="panel-section">
                  <h2>Combat Scene</h2>
                  <div className="editor-grid">
                    <label>Enemy name</label>
                    <input
                      value={selectedScene.combat.enemyName}
                      onChange={(event) =>
                        updateSelectedScene(
                          (scene) => {
                            if (!scene.combat) return;
                            scene.combat.enemyName = event.target.value;
                          },
                          { replaceHistory: true }
                        )
                      }
                    />
                    <label>Enemy HP</label>
                    <input
                      type="number"
                      value={selectedScene.combat.enemyHp}
                      onChange={(event) =>
                        updateSelectedScene(
                          (scene) => {
                            if (!scene.combat) return;
                            const value = Number(event.target.value);
                            scene.combat.enemyHp = Number.isFinite(value) ? value : scene.combat.enemyHp;
                          },
                          { replaceHistory: true }
                        )
                      }
                    />
                    <label>Enemy attack</label>
                    <input
                      type="number"
                      value={selectedScene.combat.enemyAttack}
                      onChange={(event) =>
                        updateSelectedScene(
                          (scene) => {
                            if (!scene.combat) return;
                            const value = Number(event.target.value);
                            scene.combat.enemyAttack = Number.isFinite(value) ? value : scene.combat.enemyAttack;
                          },
                          { replaceHistory: true }
                        )
                      }
                    />
                    <label>Allow run</label>
                    <input
                      type="checkbox"
                      checked={selectedScene.combat.allowRun !== false}
                      onChange={(event) =>
                        updateSelectedScene(
                          (scene) => {
                            if (!scene.combat) return;
                            scene.combat.allowRun = event.target.checked;
                          },
                          { replaceHistory: true }
                        )
                      }
                    />
                  </div>
                </div>
              ) : null}

              {selectedScene.mode === 'timed' && selectedScene.timed ? (
                <div className="panel-section">
                  <h2>Timed Scene</h2>
                  <div className="editor-grid">
                    <label>Kind</label>
                    <select
                      value={selectedScene.timed.kind}
                      onChange={(event) =>
                        updateSelectedScene(
                          (scene) => {
                            if (!scene.timed) return;
                            scene.timed.kind = event.target.value as 'rest' | 'travel' | 'wait';
                          },
                          { replaceHistory: true }
                        )
                      }
                    >
                      <option value="rest">rest</option>
                      <option value="travel">travel</option>
                      <option value="wait">wait</option>
                    </select>
                    <label>Duration (seconds)</label>
                    <input
                      type="number"
                      value={selectedScene.timed.durationSeconds}
                      onChange={(event) =>
                        updateSelectedScene(
                          (scene) => {
                            if (!scene.timed) return;
                            const value = Number(event.target.value);
                            scene.timed.durationSeconds = Number.isFinite(value) ? value : scene.timed.durationSeconds;
                          },
                          { replaceHistory: true }
                        )
                      }
                    />
                    <label>Status text</label>
                    <input
                      value={selectedScene.timed.statusText ?? ''}
                      onChange={(event) =>
                        updateSelectedScene(
                          (scene) => {
                            if (!scene.timed) return;
                            scene.timed.statusText = event.target.value;
                          },
                          { replaceHistory: true }
                        )
                      }
                    />
                    <label>Waiting text (after timer starts)</label>
                    <input
                      value={selectedScene.timed.restWaitingText ?? ''}
                      onChange={(event) =>
                        updateSelectedScene(
                          (scene) => {
                            if (!scene.timed) return;
                            scene.timed.restWaitingText = event.target.value;
                          },
                          { replaceHistory: true }
                        )
                      }
                    />
                    <label>Allow early end</label>
                    <input
                      type="checkbox"
                      checked={Boolean(selectedScene.timed.allowEarly)}
                      onChange={(event) =>
                        updateSelectedScene(
                          (scene) => {
                            if (!scene.timed) return;
                            scene.timed.allowEarly = event.target.checked;
                          },
                          { replaceHistory: true }
                        )
                      }
                    />
                  </div>
                </div>
              ) : null}

              <div className="panel-section">
                <h2>Intro Dialogue</h2>
                <DialogueEditor
                  lines={selectedScene.introDialogue ?? []}
                  onChange={(next) =>
                    updateSelectedScene(
                      (scene) => {
                        scene.introDialogue = next.length ? next : undefined;
                      },
                      { replaceHistory: true }
                    )
                  }
                />
              </div>

              <div className="panel-section">
                <h2>Intro Variants (by previous option)</h2>
                {OPTION_IDS.map((optionId) => (
                  <div key={`intro-${optionId}`} className="editor-card">
                    <div className="row">
                      <span className="badge">{formatSceneOptionLabel(optionId, selectedScene)}</span>
                    </div>
                    <textarea
                      className="compact"
                      value={selectedScene.introByPreviousOption?.[optionId] ?? ''}
                      onChange={(event) => {
                        const value = event.target.value;
                        updateSelectedScene(
                          (scene) => {
                            const introMap = { ...(scene.introByPreviousOption ?? {}) };
                            if (value.trim()) {
                              introMap[optionId] = value;
                            } else {
                              delete introMap[optionId];
                            }
                            scene.introByPreviousOption = Object.keys(introMap).length ? introMap : undefined;
                          },
                          { replaceHistory: true }
                        );
                      }}
                    />
                  </div>
                ))}
              </div>

              {!selectedSceneIsEnding ? (
                <div className="panel-section">
                  <h2>Evidence</h2>
                  {selectedScene.evidence.map((evidence) => (
                    <div key={evidence.id} className="editor-card">
                      <div className="row">
                        <input
                          className="inline-input"
                          value={evidence.id}
                          onChange={(event) => {
                            const nextId = event.target.value.trim();
                            if (!nextId || nextId === evidence.id) return;
                            updateSelectedScene(
                              (scene) => {
                                if (scene.evidence.some((item) => item.id === nextId)) {
                                  return;
                                }
                                renameEvidenceId(scene, evidence.id, nextId);
                              },
                              { replaceHistory: true }
                            );
                          }}
                        />
                        <button
                          className="danger"
                          onClick={() =>
                            updateSelectedScene(
                              (scene) => {
                                removeEvidenceId(scene, evidence.id);
                              },
                              { replaceHistory: false }
                            )
                          }
                        >
                          Delete
                        </button>
                      </div>
                      <label>Label</label>
                      <input
                        value={evidence.label}
                        onChange={(event) =>
                          updateSelectedScene(
                            (scene) => {
                              const target = scene.evidence.find((item) => item.id === evidence.id);
                              if (!target) return;
                              target.label = event.target.value;
                            },
                            { replaceHistory: true }
                          )
                        }
                      />
                      <label>Description</label>
                      <textarea
                        className="compact"
                        value={evidence.description}
                        onChange={(event) =>
                          updateSelectedScene(
                            (scene) => {
                              const target = scene.evidence.find((item) => item.id === evidence.id);
                              if (!target) return;
                              target.description = event.target.value;
                            },
                            { replaceHistory: true }
                          )
                        }
                      />
                    </div>
                  ))}
                  <div className="row">
                    <button
                      className="secondary"
                      onClick={() =>
                        updateSelectedScene(
                          (scene) => {
                            const existing = new Set(scene.evidence.map((item) => item.id));
                            const newId = getUniqueId(existing, `${scene.id}_evidence_`);
                            scene.evidence.push({
                              id: newId,
                              label: 'Nouvel indice',
                              description: ''
                            });
                          },
                          { replaceHistory: false }
                        )
                      }
                    >
                      Add evidence
                    </button>
                  </div>
                </div>
              ) : null}

              {selectedSceneIsEnding ? (
                <div className="panel-section">
                  <div className="small">Ending scenes have no action choices or scene steps.</div>
                </div>
              ) : selectedScene.mode === 'combat' ? (
                <div className="panel-section">
                  <div className="small">Combat scenes use shared combat actions instead of scene steps.</div>
                </div>
              ) : (
                <div className="panel-section">
                  <h2>Scene Steps</h2>
                  {selectedScene.steps.map((step) => {
                    const rolesInStep = Array.from(new Set(step.actions.map((action) => action.role)));
                    const sortedRoles = [
                      ...ROLE_OPTIONS.filter((role) => rolesInStep.includes(role)),
                      ...rolesInStep.filter((role) => !ROLE_OPTIONS.includes(role as typeof ROLE_OPTIONS[number]))
                    ];

                    return (
                      <div key={step.id} className="editor-card">
                        <div className="row">
                          <input
                            className="inline-input"
                            value={step.id}
                            onChange={(event) =>
                              updateSelectedScene(
                                (scene) => {
                                  const target = scene.steps.find((item) => item.id === step.id);
                                  if (!target) return;
                                  target.id = event.target.value;
                                },
                                { replaceHistory: true }
                              )
                            }
                          />
                          <button
                            className="secondary"
                            onClick={() =>
                              updateSelectedScene(
                                (scene) => {
                                  const source = scene.steps.find((item) => item.id === step.id);
                                  if (!source) return;
                                  const stepIds = new Set(scene.steps.map((item) => item.id));
                                  const newStepId = getUniqueId(stepIds, `${scene.id}_step_`);
                                  const used = new Set(collectActionIds(scene));
                                  const actionMap = new Map<string, string>();
                                  const newActions = source.actions.map((action) => {
                                    const newId = getUniqueId(used, `${scene.id}_${action.role}_`);
                                    used.add(newId);
                                    actionMap.set(action.id, newId);
                                    return { ...deepClone(action), id: newId };
                                  });
                                  const newOutcomes: Record<string, SceneActionOutcome> = {};
                                  Object.entries(source.outcomes).forEach(([actionId, outcome]) => {
                                    const mappedId = actionMap.get(actionId);
                                    if (!mappedId) return;
                                    const outcomeCopy = deepClone(outcome);
                                    if (outcomeCopy.disableActionIds) {
                                      outcomeCopy.disableActionIds = outcomeCopy.disableActionIds.map(
                                        (id) => actionMap.get(id) ?? id
                                      );
                                    }
                                    newOutcomes[mappedId] = outcomeCopy;
                                  });
                                  scene.steps.push({
                                    id: newStepId,
                                    actions: newActions,
                                    outcomes: newOutcomes
                                  });
                                },
                                { replaceHistory: false }
                              )
                            }
                          >
                            Duplicate step
                          </button>
                          <button
                            className="danger"
                            onClick={() =>
                              updateSelectedScene(
                                (scene) => {
                                  const target = scene.steps.find((item) => item.id === step.id);
                                  if (!target) return;
                                  const actionIds = target.actions.map((action) => action.id);
                                  scene.steps = scene.steps.filter((item) => item.id !== step.id);
                                  actionIds.forEach((actionId) => removeActionId(scene, actionId));
                                },
                                { replaceHistory: false }
                              )
                            }
                          >
                            Delete step
                          </button>
                        </div>
                        <div className="row">
                          <button
                            className="secondary"
                            onClick={() =>
                              updateSelectedScene(
                                (scene) => {
                                  const target = scene.steps.find((item) => item.id === step.id);
                                  if (!target) return;
                                  const used = new Set(collectActionIds(scene));
                                  const makeAction = (role: string, buttonText: string, text: string, stage?: string) => {
                                    const id = getUniqueId(used, `${scene.id}_${role}_`);
                                    used.add(id);
                                    const action: SceneAction = { id, role, buttonText, text, stage };
                                    target.actions.push(action);
                                    target.outcomes[id] = { narration: 'Le groupe enregistre ce choix.' };
                                  };
                                  makeAction('warrior', 'Action du guerrier.', 'Action du guerrier.', 'agit avec prudence.');
                                  makeAction('sage', 'Action du sage.', 'Action du sage.', 'observe et decide.');
                                  makeAction('ranger', 'Action du ranger.', 'Action du ranger.', 'se deplace en silence.');
                                },
                                { replaceHistory: false }
                              )
                            }
                          >
                            Add role preset
                          </button>
                          {ROLE_OPTIONS.map((role) => (
                            <button
                              key={`add-${step.id}-${role}`}
                              className="secondary"
                              onClick={() =>
                                updateSelectedScene(
                                  (scene) => {
                                    const target = scene.steps.find((item) => item.id === step.id);
                                    if (!target) return;
                                    const id = createActionId(scene, role);
                                    const action: SceneAction = {
                                      id,
                                      role,
                                      buttonText: `Nouvelle action (${role}).`,
                                      text: `Nouvelle action (${role}).`
                                    };
                                    target.actions.push(action);
                                    target.outcomes[id] = { narration: 'Le groupe enregistre ce choix.' };
                                  },
                                  { replaceHistory: false }
                                )
                              }
                            >
                              + {role}
                            </button>
                          ))}
                          <button
                            className="secondary"
                            onClick={() =>
                              updateSelectedScene(
                                (scene) => {
                                  const target = scene.steps.find((item) => item.id === step.id);
                                  if (!target) return;
                                  const actionIds = target.actions.map((action) => action.id);
                                  target.actions = [];
                                  target.outcomes = {};
                                  actionIds.forEach((actionId) => removeActionId(scene, actionId));
                                },
                                { replaceHistory: false }
                              )
                            }
                          >
                            Clear actions
                          </button>
                        </div>
                        {sortedRoles.map((role) => (
                          <div key={`${step.id}-${role}`} className="role-group">
                            <div className="role-title">{role}</div>
                            {step.actions
                              .filter((action) => action.role === role)
                              .map((action) => {
                                const outcome = step.outcomes[action.id] ?? { narration: '' };
                                return (
                                  <div key={action.id} className="action-card">
                                    <div className="row">
                                      <input
                                        className="inline-input"
                                        value={action.id}
                                        onChange={(event) => {
                                          const nextId = event.target.value.trim();
                                          if (!nextId || nextId === action.id) return;
                                          updateSelectedScene(
                                            (scene) => {
                                              if (collectActionIds(scene).includes(nextId)) return;
                                              renameActionId(scene, action.id, nextId);
                                            },
                                            { replaceHistory: true }
                                          );
                                        }}
                                      />
                                      <select
                                        value={action.role}
                                        onChange={(event) =>
                                          updateSelectedScene(
                                            (scene) => {
                                              const target = scene.steps
                                                .flatMap((item) => item.actions)
                                                .find((item) => item.id === action.id);
                                              if (!target) return;
                                              target.role = event.target.value;
                                            },
                                            { replaceHistory: true }
                                          )
                                        }
                                      >
                                        {!ROLE_OPTIONS.includes(action.role as (typeof ROLE_OPTIONS)[number]) ? (
                                          <option value={action.role}>{action.role}</option>
                                        ) : null}
                                        {ROLE_OPTIONS.map((roleOption) => (
                                          <option key={roleOption} value={roleOption}>
                                            {roleOption}
                                          </option>
                                        ))}
                                      </select>
                                      <button
                                        className="secondary"
                                        onClick={() =>
                                          updateSelectedScene(
                                            (scene) => {
                                              const targetStep = scene.steps.find((item) => item.id === step.id);
                                              if (!targetStep) return;
                                              const used = new Set(collectActionIds(scene));
                                              const newId = getUniqueId(used, `${scene.id}_${action.role}_`);
                                              used.add(newId);
                                              const newAction = { ...deepClone(action), id: newId };
                                              targetStep.actions.push(newAction);
                                              targetStep.outcomes[newId] = deepClone(outcome);
                                            },
                                            { replaceHistory: false }
                                          )
                                        }
                                      >
                                        Duplicate
                                      </button>
                                      <button
                                        className="danger"
                                        onClick={() =>
                                          updateSelectedScene(
                                            (scene) => {
                                              removeActionId(scene, action.id);
                                            },
                                            { replaceHistory: false }
                                          )
                                        }
                                      >
                                        Delete
                                      </button>
                                    </div>
                                    <label>Stage / tone (optional)</label>
                                    <input
                                      value={action.stage ?? ''}
                                      onChange={(event) =>
                                        updateSelectedScene(
                                          (scene) => {
                                            const target = scene.steps
                                              .flatMap((item) => item.actions)
                                              .find((item) => item.id === action.id);
                                            if (!target) return;
                                            target.stage = event.target.value || undefined;
                                          },
                                          { replaceHistory: true }
                                        )
                                      }
                                    />
                                    <label>Action button content</label>
                                    <input
                                      value={action.buttonText ?? action.text}
                                      onChange={(event) =>
                                        updateSelectedScene(
                                          (scene) => {
                                            const target = scene.steps
                                              .flatMap((item) => item.actions)
                                              .find((item) => item.id === action.id);
                                            if (!target) return;
                                            target.buttonText = event.target.value || undefined;
                                          },
                                          { replaceHistory: true }
                                        )
                                      }
                                    />
                                    <label>Player dialogue line</label>
                                    <input
                                      value={action.text}
                                      onChange={(event) =>
                                        updateSelectedScene(
                                          (scene) => {
                                            const target = scene.steps
                                              .flatMap((item) => item.actions)
                                              .find((item) => item.id === action.id);
                                            if (!target) return;
                                            target.text = event.target.value;
                                          },
                                          { replaceHistory: true }
                                        )
                                      }
                                    />
                                    <label>Player closing narration (optional)</label>
                                    <textarea
                                      className="compact"
                                      value={action.narration ?? ''}
                                      onChange={(event) =>
                                        updateSelectedScene(
                                          (scene) => {
                                            const target = scene.steps
                                              .flatMap((item) => item.actions)
                                              .find((item) => item.id === action.id);
                                            if (!target) return;
                                            target.narration = event.target.value || undefined;
                                          },
                                          { replaceHistory: true }
                                        )
                                      }
                                    />
                                    <label>Additional NPC answer line(s) (optional)</label>
                                    <DialogueEditor
                                      lines={outcome.dialogue ?? []}
                                      onChange={(next) =>
                                        updateSelectedScene(
                                          (scene) => {
                                            const targetStep = scene.steps.find((item) => item.id === step.id);
                                            if (!targetStep) return;
                                            const existing = targetStep.outcomes[action.id] ?? { narration: '' };
                                            targetStep.outcomes[action.id] = {
                                              ...existing,
                                              dialogue: next.length ? next : undefined
                                            };
                                          },
                                          { replaceHistory: true }
                                        )
                                      }
                                    />
                                    <label>Additional NPC closing narration (optional)</label>
                                    <textarea
                                      className="compact"
                                      value={outcome.narration}
                                      onChange={(event) =>
                                        updateSelectedScene(
                                          (scene) => {
                                            const targetStep = scene.steps.find((item) => item.id === step.id);
                                            if (!targetStep) return;
                                            const existing = targetStep.outcomes[action.id] ?? { narration: '' };
                                            targetStep.outcomes[action.id] = {
                                              ...existing,
                                              narration: event.target.value
                                            };
                                          },
                                          { replaceHistory: true }
                                        )
                                      }
                                    />
                                    <div className="action-outcome">
                                      <div className="impact-label">Outcome effects</div>
                                      <MultiSelect
                                        label="Evidence ids"
                                        options={evidenceIdLibrary}
                                        selected={outcome.evidenceIds ?? []}
                                        onChange={(next) =>
                                          updateSelectedScene(
                                            (scene) => {
                                              const targetStep = scene.steps.find((item) => item.id === step.id);
                                              if (!targetStep) return;
                                              const existing = targetStep.outcomes[action.id] ?? { narration: '' };
                                              targetStep.outcomes[action.id] = {
                                                ...existing,
                                                evidenceIds: next.length ? next : undefined
                                              };
                                            },
                                            { replaceHistory: true }
                                          )
                                        }
                                      />
                                      <MultiSelect
                                        label="Unlock options"
                                        options={[...OPTION_IDS]}
                                        selected={outcome.unlockOptionIds ?? []}
                                        onChange={(next) =>
                                          updateSelectedScene(
                                            (scene) => {
                                              const targetStep = scene.steps.find((item) => item.id === step.id);
                                              if (!targetStep) return;
                                              const existing = targetStep.outcomes[action.id] ?? { narration: '' };
                                              targetStep.outcomes[action.id] = {
                                                ...existing,
                                                unlockOptionIds: next.length ? (next as typeof OPTION_IDS[number][]) : undefined
                                              };
                                            },
                                            { replaceHistory: true }
                                          )
                                        }
                                      />
                                      <MultiSelect
                                        label="Disable action ids"
                                        options={actionIdLibrary.filter((id) => id !== action.id)}
                                        selected={outcome.disableActionIds ?? []}
                                        onChange={(next) =>
                                          updateSelectedScene(
                                            (scene) => {
                                              const targetStep = scene.steps.find((item) => item.id === step.id);
                                              if (!targetStep) return;
                                              const existing = targetStep.outcomes[action.id] ?? { narration: '' };
                                              targetStep.outcomes[action.id] = {
                                                ...existing,
                                                disableActionIds: next.length ? next : undefined
                                              };
                                            },
                                            { replaceHistory: true }
                                          )
                                        }
                                      />
                                      <div className="grid-2">
                                        <TagInput
                                          label="global tags"
                                          tags={outcome.tagsAdded?.global ?? []}
                                          suggestions={tagLibrary}
                                          listId={`outcome-${step.id}-${action.id}-global`}
                                          onChange={(next) =>
                                            updateSelectedScene(
                                              (scene) => {
                                                const targetStep = scene.steps.find((item) => item.id === step.id);
                                                if (!targetStep) return;
                                                const existing = targetStep.outcomes[action.id] ?? { narration: '' };
                                                targetStep.outcomes[action.id] = {
                                                  ...existing,
                                                  tagsAdded: {
                                                    ...existing.tagsAdded,
                                                    global: next.length ? next : undefined
                                                  }
                                                };
                                              },
                                              { replaceHistory: true }
                                            )
                                          }
                                        />
                                        <TagInput
                                          label="scene tags"
                                          tags={outcome.tagsAdded?.scene ?? []}
                                          suggestions={tagLibrary}
                                          listId={`outcome-${step.id}-${action.id}-scene`}
                                          onChange={(next) =>
                                            updateSelectedScene(
                                              (scene) => {
                                                const targetStep = scene.steps.find((item) => item.id === step.id);
                                                if (!targetStep) return;
                                                const existing = targetStep.outcomes[action.id] ?? { narration: '' };
                                                targetStep.outcomes[action.id] = {
                                                  ...existing,
                                                  tagsAdded: {
                                                    ...existing.tagsAdded,
                                                    scene: next.length ? next : undefined
                                                  }
                                                };
                                              },
                                              { replaceHistory: true }
                                            )
                                          }
                                        />
                                      </div>
                                      <div className="field-row">
                                        <label>HP delta</label>
                                        <input
                                          type="number"
                                          value={outcome.hpDelta ?? ''}
                                          onChange={(event) => {
                                            const raw = event.target.value;
                                            updateSelectedScene(
                                              (scene) => {
                                                const targetStep = scene.steps.find((item) => item.id === step.id);
                                                if (!targetStep) return;
                                                const existing = targetStep.outcomes[action.id] ?? { narration: '' };
                                                targetStep.outcomes[action.id] = {
                                                  ...existing,
                                                  hpDelta: raw === '' ? undefined : Number(raw)
                                                };
                                              },
                                              { replaceHistory: true }
                                            );
                                          }}
                                        />
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                  <div className="row">
                    <button
                      className="secondary"
                      onClick={() =>
                        updateSelectedScene(
                          (scene) => {
                            const stepIds = new Set(scene.steps.map((item) => item.id));
                            const newStepId = getUniqueId(stepIds, `${scene.id}_step_`);
                            const used = new Set(collectActionIds(scene));
                            const makeAction = (role: string, buttonText: string, text: string, stage?: string) => {
                              const id = getUniqueId(used, `${scene.id}_${role}_`);
                              used.add(id);
                              const action: SceneAction = { id, role, buttonText, text, stage };
                              return action;
                            };
                            const actions = [
                              makeAction('warrior', 'Action du guerrier.', 'Action du guerrier.', 'agit avec prudence.'),
                              makeAction('sage', 'Action du sage.', 'Action du sage.', 'observe et decide.'),
                              makeAction('ranger', 'Action du ranger.', 'Action du ranger.', 'se deplace en silence.')
                            ];
                            const outcomes: Record<string, SceneActionOutcome> = {};
                            actions.forEach((action) => {
                              outcomes[action.id] = { narration: 'Le groupe enregistre ce choix.' };
                            });
                            scene.steps.push({ id: newStepId, actions, outcomes });
                          },
                          { replaceHistory: false }
                        )
                      }
                    >
                      Add step
                    </button>
                  </div>
                </div>
              )}

              {!selectedSceneIsEnding ? (
                <div className="panel-section">
                  <h2>Decisions</h2>
                {selectedScene.options.map((option) => (
                  <div key={option.id} className="editor-card">
                    <div className="row">
                      <span className="badge">{formatSceneOptionLabel(option.id, selectedScene)}</span>
                      <label className="checkbox-row">
                        <input
                          type="checkbox"
                          checked={Boolean(option.defaultVisible)}
                          onChange={() =>
                            updateSelectedScene(
                              (scene) => {
                                scene.options.forEach((item) => {
                                  item.defaultVisible = item.id === option.id;
                                });
                              },
                              { replaceHistory: false }
                            )
                          }
                        />
                        Default
                      </label>
                      <label className="checkbox-row">
                        <input
                          type="checkbox"
                          checked={Boolean(option.isRisky)}
                          onChange={(event) =>
                            updateSelectedScene(
                              (scene) => {
                                const target = scene.options.find((item) => item.id === option.id);
                                if (!target) return;
                                target.isRisky = event.target.checked;
                              },
                              { replaceHistory: true }
                            )
                          }
                        />
                        Risky
                      </label>
                    </div>
                    <label>Text</label>
                    <input
                      value={option.text}
                      onChange={(event) =>
                        updateSelectedScene(
                          (scene) => {
                            const target = scene.options.find((item) => item.id === option.id);
                            if (!target) return;
                            target.text = event.target.value;
                          },
                          { replaceHistory: true }
                        )
                      }
                    />
                    <div className="grid-2">
                      <TagInput
                        label="global tags"
                        tags={option.tagsAdded?.global ?? []}
                        suggestions={tagLibrary}
                        listId={`option-${option.id}-global`}
                        onChange={(next) =>
                          updateSelectedScene(
                            (scene) => {
                              const target = scene.options.find((item) => item.id === option.id);
                              if (!target) return;
                              target.tagsAdded = {
                                ...target.tagsAdded,
                                global: next.length ? next : undefined
                              };
                            },
                            { replaceHistory: true }
                          )
                        }
                      />
                      <TagInput
                        label="scene tags"
                        tags={option.tagsAdded?.scene ?? []}
                        suggestions={tagLibrary}
                        listId={`option-${option.id}-scene`}
                        onChange={(next) =>
                          updateSelectedScene(
                            (scene) => {
                              const target = scene.options.find((item) => item.id === option.id);
                              if (!target) return;
                              target.tagsAdded = {
                                ...target.tagsAdded,
                                scene: next.length ? next : undefined
                              };
                            },
                            { replaceHistory: true }
                          )
                        }
                      />
                    </div>
                    <div className="route-list">
                      {option.next.map((route, routeIndex) => (
                        <div key={`${option.id}-route-${routeIndex}`} className="route-card">
                          <div className="row">
                            <label>Next scene</label>
                            <select
                              value={route.to ?? ''}
                              onChange={(event) =>
                                updateSelectedScene(
                                  (scene) => {
                                    const target = scene.options.find((item) => item.id === option.id);
                                    if (!target) return;
                                    const nextRoute = target.next[routeIndex];
                                    if (!nextRoute) return;
                                    nextRoute.to = event.target.value ? event.target.value : null;
                                  },
                                  { replaceHistory: true }
                                )
                              }
                            >
                              <option value="">END</option>
                              {story?.scenes.map((scene) => (
                                <option key={scene.id} value={scene.id}>
                                  {scene.id} — {scene.title}
                                </option>
                              ))}
                            </select>
                            <button
                              className="danger"
                              onClick={() =>
                                updateSelectedScene(
                                  (scene) => {
                                    const target = scene.options.find((item) => item.id === option.id);
                                    if (!target) return;
                                    target.next = target.next.filter((_, idx) => idx !== routeIndex);
                                  },
                                  { replaceHistory: false }
                                )
                              }
                            >
                              Remove route
                            </button>
                          </div>
                          <TagConditionEditor
                            label="Global tags"
                            condition={route.ifGlobal}
                            suggestions={tagLibrary}
                            idPrefix={`route-${option.id}-${routeIndex}-global`}
                            onChange={(next) =>
                              updateSelectedScene(
                                (scene) => {
                                  const target = scene.options.find((item) => item.id === option.id);
                                  if (!target) return;
                                  const nextRoute = target.next[routeIndex];
                                  if (!nextRoute) return;
                                  nextRoute.ifGlobal = next;
                                },
                                { replaceHistory: true }
                              )
                            }
                          />
                          <TagConditionEditor
                            label="Scene tags"
                            condition={route.ifScene}
                            suggestions={tagLibrary}
                            idPrefix={`route-${option.id}-${routeIndex}-scene`}
                            onChange={(next) =>
                              updateSelectedScene(
                                (scene) => {
                                  const target = scene.options.find((item) => item.id === option.id);
                                  if (!target) return;
                                  const nextRoute = target.next[routeIndex];
                                  if (!nextRoute) return;
                                  nextRoute.ifScene = next;
                                },
                                { replaceHistory: true }
                              )
                            }
                          />
                          <TagConditionEditor
                            label="Action ids"
                            condition={route.ifActions}
                            suggestions={actionIdLibrary}
                            idPrefix={`route-${option.id}-${routeIndex}-actions`}
                            onChange={(next) =>
                              updateSelectedScene(
                                (scene) => {
                                  const target = scene.options.find((item) => item.id === option.id);
                                  if (!target) return;
                                  const nextRoute = target.next[routeIndex];
                                  if (!nextRoute) return;
                                  nextRoute.ifActions = next;
                                },
                                { replaceHistory: true }
                              )
                            }
                          />
                        </div>
                      ))}
                      <button
                        className="secondary"
                        onClick={() =>
                          updateSelectedScene(
                            (scene) => {
                              const target = scene.options.find((item) => item.id === option.id);
                              if (!target) return;
                              target.next.push({ to: story?.startSceneId ?? null });
                            },
                            { replaceHistory: false }
                          )
                        }
                      >
                        Add route
                      </button>
                    </div>
                  </div>
                ))}
                </div>
              ) : null}

              {!selectedSceneIsEnding ? (
                <div className="panel-section">
                  <h2>Unlock Rules</h2>
                {selectedScene.unlockRules.map((rule, index) => (
                  <div key={`unlock-${index}`} className="editor-card">
                    <div className="row">
                      <select
                        value={rule.optionId}
                        onChange={(event) =>
                          updateSelectedScene(
                            (scene) => {
                              const target = scene.unlockRules[index];
                              if (!target) return;
                              target.optionId = event.target.value as typeof OPTION_IDS[number];
                            },
                            { replaceHistory: true }
                          )
                        }
                      >
                        {OPTION_IDS.map((optionId) => (
                          <option key={optionId} value={optionId}>
                            {formatSceneOptionLabel(optionId, selectedScene)}
                          </option>
                        ))}
                      </select>
                      <button
                        className="danger"
                        onClick={() =>
                          updateSelectedScene(
                            (scene) => {
                              scene.unlockRules = scene.unlockRules.filter((_, idx) => idx !== index);
                            },
                            { replaceHistory: false }
                          )
                        }
                      >
                        Delete
                      </button>
                    </div>
                    <MultiSelect
                      label="Evidence required"
                      options={evidenceIdLibrary}
                      selected={rule.evidenceIds}
                      onChange={(next) =>
                        updateSelectedScene(
                          (scene) => {
                            const target = scene.unlockRules[index];
                            if (!target) return;
                            target.evidenceIds = next;
                          },
                          { replaceHistory: true }
                        )
                      }
                    />
                  </div>
                ))}
                <div className="row">
                  <button
                    className="secondary"
                    onClick={() =>
                      updateSelectedScene(
                        (scene) => {
                          scene.unlockRules.push({ optionId: 'B', evidenceIds: [] });
                        },
                        { replaceHistory: false }
                      )
                    }
                  >
                    Add unlock rule
                  </button>
                </div>
                </div>
              ) : null}

              {!selectedSceneIsEnding ? (
                <div className="panel-section">
                  <h2>Decision Outcomes</h2>
                {isCombatSceneEditor(selectedScene) ? (
                  <div className="small">Combat mapping: Win = A, Lose = B, Run = C.</div>
                ) : null}
                {OPTION_IDS.map((optionId) => {
                  const outcome = selectedScene.outcomeByOption[optionId] ?? { text: '' };
                  return (
                    <div key={`outcome-${optionId}`} className="editor-card">
                      <div className="row">
                        <span className="badge">{formatSceneOptionLabel(optionId, selectedScene)}</span>
                      </div>
                      <label>Outcome text</label>
                      <textarea
                        className="compact"
                        value={outcome.text}
                        onChange={(event) =>
                          updateSelectedScene(
                            (scene) => {
                              scene.outcomeByOption[optionId] = {
                                ...scene.outcomeByOption[optionId],
                                text: event.target.value
                              };
                            },
                            { replaceHistory: true }
                          )
                        }
                      />
                      <div className="field-row">
                        <label>HP delta</label>
                        <input
                          type="number"
                          value={outcome.hpDelta ?? ''}
                          onChange={(event) =>
                            updateSelectedScene(
                              (scene) => {
                                const raw = event.target.value;
                                scene.outcomeByOption[optionId] = {
                                  ...scene.outcomeByOption[optionId],
                                  hpDelta: raw === '' ? undefined : Number(raw)
                                };
                              },
                              { replaceHistory: true }
                            )
                          }
                        />
                      </div>
                    </div>
                  );
                })}
                </div>
              ) : null}

              <div className="panel-section">
                <label>Scene JSON</label>
                <textarea
                  className="json-panel"
                  value={sceneJsonDraft}
                  onChange={(event) => {
                    setSceneJsonDraft(event.target.value);
                    setSceneJsonDirty(true);
                  }}
                />
                <div className="row">
                  <button className="secondary" onClick={applySceneJson} disabled={!sceneJsonDirty}>
                    Apply scene JSON
                  </button>
                </div>
              </div>
            </>
          )}
          {!isBackboneMode ? (
            <div className="panel-section">
              <label>Story JSON (full)</label>
              <textarea
                className="json-panel"
                value={storyJsonDraft}
                onChange={(event) => {
                  setStoryJsonDraft(event.target.value);
                  setStoryJsonDirty(true);
                }}
              />
            </div>
          ) : null}
        </section>
      </div>
      <footer className="footer">
        Tip: Use Ctrl+Z / Cmd+Z outside inputs to undo the last change.
      </footer>
    </div>
  );
}
