import { RoleId } from '@/src/game/types';

import rawStoryData from './story-data.json';

export type SceneId = string;
export type OptionId = 'A' | 'B' | 'C';
export type ActionId = string;
export type SceneMode = 'story' | 'combat' | 'timed';

export type TagSet = {
  global?: string[];
  scene?: string[];
};

export type TagCondition = {
  all?: string[];
  any?: string[];
  none?: string[];
};

export type TagRoute = {
  ifGlobal?: TagCondition;
  ifScene?: TagCondition;
  ifActions?: TagCondition;
  to: SceneId | null;
};

export type SceneEvidence = {
  id: string;
  label: string;
  description: string;
};

export type SceneOption = {
  id: OptionId;
  text: string;
  defaultVisible?: boolean;
  isRisky?: boolean;
  tagsAdded?: TagSet;
  next: TagRoute[];
};

export type SceneUnlockRule = {
  optionId: OptionId;
  evidenceIds: string[];
};

export type SceneOutcome = {
  text: string;
  hpDelta?: number;
};

export type DialogueLine = {
  speaker: string;
  text: string;
  aside?: string;
};

export type SceneAction = {
  id: ActionId;
  role: RoleId | 'any';
  text: string;
  stage?: string;
};

export type CombatActionEffect = {
  damage?: number;
  block?: number;
  enemyAttackDelta?: number;
  run?: boolean;
};

export type CombatAction = {
  id: ActionId;
  role: RoleId | 'any';
  text: string;
  effect: CombatActionEffect;
};

export type CombatConfig = {
  partyHp: number;
  actions: CombatAction[];
};

export type CombatSceneConfig = {
  enemyName: string;
  enemyHp: number;
  enemyAttack: number;
  allowRun?: boolean;
};

export type TimedSceneConfig = {
  kind: 'rest' | 'travel' | 'wait';
  durationSeconds: number;
  allowEarly?: boolean;
  statusText?: string;
};

export type SceneActionOutcome = {
  narration: string;
  dialogue?: DialogueLine[];
  evidenceIds?: string[];
  unlockOptionIds?: OptionId[];
  disableActionIds?: ActionId[];
  tagsAdded?: TagSet;
  hpDelta?: number;
};

export type SceneStep = {
  id: string;
  actions: SceneAction[];
  outcomes: Record<ActionId, SceneActionOutcome>;
};

export type Scene = {
  id: SceneId;
  title: string;
  canonicalTruth: string;
  intro: string;
  introDialogue?: DialogueLine[];
  introByPreviousOption?: Partial<Record<OptionId, string>>;
  mode?: SceneMode;
  combat?: CombatSceneConfig;
  timed?: TimedSceneConfig;
  evidence: SceneEvidence[];
  steps: SceneStep[];
  options: SceneOption[];
  unlockRules: SceneUnlockRule[];
  outcomeByOption: Record<OptionId, SceneOutcome>;
  isEnding?: boolean;
  meta?: Record<string, unknown>;
};

export type StoryData = {
  version: number;
  startSceneId: SceneId;
  scenes: Scene[];
  combat?: CombatConfig;
  meta?: Record<string, unknown>;
};

export const NO_REACTION_ACTION_ID = 'no_reaction';

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isOptionId(value: unknown): value is OptionId {
  return value === 'A' || value === 'B' || value === 'C';
}

function isTagCondition(value: unknown): value is TagCondition {
  if (!isObject(value)) return false;
  if (value.all !== undefined && !isStringArray(value.all)) return false;
  if (value.any !== undefined && !isStringArray(value.any)) return false;
  if (value.none !== undefined && !isStringArray(value.none)) return false;
  return true;
}

function isTagSet(value: unknown): value is TagSet {
  if (!isObject(value)) return false;
  if (value.global !== undefined && !isStringArray(value.global)) return false;
  if (value.scene !== undefined && !isStringArray(value.scene)) return false;
  return true;
}

function assertStoryData(raw: unknown): StoryData {
  if (!isObject(raw)) {
    throw new Error('Story data must be a JSON object.');
  }

  const errors: string[] = [];
  const version = raw.version;
  const startSceneId = raw.startSceneId;
  const scenes = raw.scenes;
  const combat = raw.combat as unknown;

  if (typeof version !== 'number') errors.push('version must be a number');
  if (typeof startSceneId !== 'string') errors.push('startSceneId must be a string');
  if (!Array.isArray(scenes) || scenes.length === 0) errors.push('scenes must be a non-empty array');

  const sceneIds = new Set<string>();
  const optionIdSet = new Set<OptionId>(['A', 'B', 'C']);
  const combatActionIds = new Set<string>();
  const combatScenes: string[] = [];

  const pendingRoutes: Array<{ sceneId: string; optionId: OptionId; to: unknown }> = [];

  if (combat !== undefined) {
    if (!isObject(combat)) {
      errors.push('combat must be an object');
    } else {
      const combatObj = combat as Record<string, unknown>;
      if (!isFiniteNumber(combatObj.partyHp) || combatObj.partyHp <= 0) {
        errors.push('combat.partyHp must be a positive number');
      }
      if (!Array.isArray(combatObj.actions) || combatObj.actions.length === 0) {
        errors.push('combat.actions must be a non-empty array');
      } else {
        combatObj.actions.forEach((action: unknown, actionIndex: number) => {
          if (!isObject(action)) {
            errors.push(`combat.actions[${actionIndex}] must be an object`);
            return;
          }
          if (typeof action.id !== 'string' || !action.id) {
            errors.push(`combat.actions[${actionIndex}].id must be a string`);
            return;
          }
          if (combatActionIds.has(action.id)) {
            errors.push(`combat.actions has duplicate id ${action.id}`);
          }
          combatActionIds.add(action.id);
          if (typeof action.role !== 'string') {
            errors.push(`combat.actions[${actionIndex}].role must be a string`);
          }
          if (typeof action.text !== 'string') {
            errors.push(`combat.actions[${actionIndex}].text must be a string`);
          }
          if (!isObject(action.effect)) {
            errors.push(`combat.actions[${actionIndex}].effect must be an object`);
          } else {
            const effect = action.effect as Record<string, unknown>;
            if (effect.damage !== undefined && !isFiniteNumber(effect.damage)) {
              errors.push(`combat.actions[${actionIndex}].effect.damage must be a number`);
            }
            if (effect.block !== undefined && !isFiniteNumber(effect.block)) {
              errors.push(`combat.actions[${actionIndex}].effect.block must be a number`);
            }
            if (effect.enemyAttackDelta !== undefined && !isFiniteNumber(effect.enemyAttackDelta)) {
              errors.push(`combat.actions[${actionIndex}].effect.enemyAttackDelta must be a number`);
            }
            if (effect.run !== undefined && typeof effect.run !== 'boolean') {
              errors.push(`combat.actions[${actionIndex}].effect.run must be a boolean`);
            }
          }
        });
      }
    }
  }

  if (Array.isArray(scenes)) {
    scenes.forEach((scene, sceneIndex) => {
      if (!isObject(scene)) {
        errors.push(`scenes[${sceneIndex}] must be an object`);
        return;
      }

      const sceneId = scene.id;
      if (typeof sceneId !== 'string' || !sceneId) {
        errors.push(`scenes[${sceneIndex}].id must be a non-empty string`);
      } else if (sceneIds.has(sceneId)) {
        errors.push(`scenes[${sceneIndex}].id is duplicated (${sceneId})`);
      } else {
        sceneIds.add(sceneId);
      }

      if (typeof scene.title !== 'string') errors.push(`scenes[${sceneIndex}].title must be string`);
      if (typeof scene.intro !== 'string') errors.push(`scenes[${sceneIndex}].intro must be string`);
      if (typeof scene.canonicalTruth !== 'string') {
        errors.push(`scenes[${sceneIndex}].canonicalTruth must be string`);
      }

      const rawMode = scene.mode;
      if (rawMode !== undefined && rawMode !== 'story' && rawMode !== 'combat' && rawMode !== 'timed') {
        errors.push(`scenes[${sceneIndex}].mode must be "story", "combat", or "timed"`);
      }
      const sceneMode: SceneMode =
        rawMode === 'combat' || scene.combat ? 'combat' : rawMode === 'timed' || scene.timed ? 'timed' : 'story';
      if (sceneMode === 'combat') {
        combatScenes.push(String(sceneId));
        if (!isObject(scene.combat)) {
          errors.push(`scenes[${sceneIndex}].combat must be an object for combat scenes`);
        } else {
          const combatConfig = scene.combat as Record<string, unknown>;
          if (typeof combatConfig.enemyName !== 'string') {
            errors.push(`scenes[${sceneIndex}].combat.enemyName must be string`);
          }
          if (!isFiniteNumber(combatConfig.enemyHp) || combatConfig.enemyHp <= 0) {
            errors.push(`scenes[${sceneIndex}].combat.enemyHp must be a positive number`);
          }
          if (!isFiniteNumber(combatConfig.enemyAttack) || combatConfig.enemyAttack < 0) {
            errors.push(`scenes[${sceneIndex}].combat.enemyAttack must be a non-negative number`);
          }
          if (combatConfig.allowRun !== undefined && typeof combatConfig.allowRun !== 'boolean') {
            errors.push(`scenes[${sceneIndex}].combat.allowRun must be boolean`);
          }
        }
      }
      if (sceneMode === 'timed') {
        if (!isObject(scene.timed)) {
          errors.push(`scenes[${sceneIndex}].timed must be an object for timed scenes`);
        } else {
          const timed = scene.timed as Record<string, unknown>;
          if (timed.kind !== 'rest' && timed.kind !== 'travel' && timed.kind !== 'wait') {
            errors.push(`scenes[${sceneIndex}].timed.kind must be "rest", "travel", or "wait"`);
          }
          if (!isFiniteNumber(timed.durationSeconds) || timed.durationSeconds <= 0) {
            errors.push(`scenes[${sceneIndex}].timed.durationSeconds must be a positive number`);
          }
          if (timed.allowEarly !== undefined && typeof timed.allowEarly !== 'boolean') {
            errors.push(`scenes[${sceneIndex}].timed.allowEarly must be boolean`);
          }
          if (timed.statusText !== undefined && typeof timed.statusText !== 'string') {
            errors.push(`scenes[${sceneIndex}].timed.statusText must be string`);
          }
        }
      }

      if (scene.introDialogue !== undefined) {
        if (!Array.isArray(scene.introDialogue)) {
          errors.push(`scenes[${sceneIndex}].introDialogue must be an array`);
        } else {
          scene.introDialogue.forEach((line: unknown, lineIndex: number) => {
            if (!isObject(line) || typeof line.speaker !== 'string' || typeof line.text !== 'string') {
              errors.push(`scenes[${sceneIndex}].introDialogue[${lineIndex}] must have speaker/text`);
            }
          });
        }
      }

      if (!Array.isArray(scene.evidence)) {
        errors.push(`scenes[${sceneIndex}].evidence must be an array`);
      }

      const evidenceIds = new Set<string>();
      if (Array.isArray(scene.evidence)) {
        scene.evidence.forEach((evidence: unknown, evidenceIndex: number) => {
          if (!isObject(evidence) || typeof evidence.id !== 'string') {
            errors.push(`scenes[${sceneIndex}].evidence[${evidenceIndex}].id must be string`);
            return;
          }
          evidenceIds.add(evidence.id);
        });
      }

      if (!Array.isArray(scene.steps)) {
        errors.push(`scenes[${sceneIndex}].steps must be an array`);
      } else if (scene.steps.length === 0 && sceneMode !== 'combat') {
        errors.push(`scenes[${sceneIndex}].steps must be a non-empty array`);
      }

      const actionIds = new Set<string>();
      if (Array.isArray(scene.steps)) {
        scene.steps.forEach((step: unknown, stepIndex: number) => {
          if (!isObject(step)) {
            errors.push(`scenes[${sceneIndex}].steps[${stepIndex}] must be an object`);
            return;
          }
          if (typeof step.id !== 'string') {
            errors.push(`scenes[${sceneIndex}].steps[${stepIndex}].id must be string`);
          }

          if (!Array.isArray(step.actions) || step.actions.length === 0) {
            errors.push(`scenes[${sceneIndex}].steps[${stepIndex}].actions must be non-empty`);
          } else {
            step.actions.forEach((action: unknown, actionIndex: number) => {
              if (!isObject(action)) {
                errors.push(`scenes[${sceneIndex}].steps[${stepIndex}].actions[${actionIndex}] must be object`);
                return;
              }
              if (typeof action.id !== 'string') {
                errors.push(`scenes[${sceneIndex}].steps[${stepIndex}].actions[${actionIndex}].id must be string`);
                return;
              }
              if (actionIds.has(action.id)) {
                errors.push(`scenes[${sceneIndex}] has duplicate action id ${action.id}`);
              }
              actionIds.add(action.id);
              if (typeof action.role !== 'string') {
                errors.push(`scenes[${sceneIndex}].steps[${stepIndex}].actions[${actionIndex}].role must be string`);
              }
              if (typeof action.text !== 'string') {
                errors.push(`scenes[${sceneIndex}].steps[${stepIndex}].actions[${actionIndex}].text must be string`);
              }
              if (action.stage !== undefined && typeof action.stage !== 'string') {
                errors.push(`scenes[${sceneIndex}].steps[${stepIndex}].actions[${actionIndex}].stage must be string`);
              }
            });
          }

          if (!isObject(step.outcomes)) {
            errors.push(`scenes[${sceneIndex}].steps[${stepIndex}].outcomes must be object`);
          } else if (Array.isArray(step.actions)) {
            step.actions.forEach((action: any) => {
              const outcome = (step.outcomes as Record<string, unknown>)[action.id];
              if (!outcome || !isObject(outcome)) {
                errors.push(`scenes[${sceneIndex}].steps[${stepIndex}].outcomes missing for action ${action.id}`);
                return;
              }
              if (typeof outcome.narration !== 'string') {
                errors.push(`outcomes for ${action.id} must include narration`);
              }
              if (outcome.dialogue !== undefined) {
                if (!Array.isArray(outcome.dialogue)) {
                  errors.push(`outcomes.${action.id}.dialogue must be array`);
                } else {
                  outcome.dialogue.forEach((line: unknown, lineIndex: number) => {
                    if (!isObject(line) || typeof line.speaker !== 'string' || typeof line.text !== 'string') {
                      errors.push(`outcomes.${action.id}.dialogue[${lineIndex}] must have speaker/text`);
                    }
                  });
                }
              }
              if (outcome.evidenceIds !== undefined && !isStringArray(outcome.evidenceIds)) {
                errors.push(`outcomes.${action.id}.evidenceIds must be string array`);
              }
              if (isStringArray(outcome.evidenceIds)) {
                outcome.evidenceIds.forEach((id: string) => {
                  if (!evidenceIds.has(id)) {
                    errors.push(`outcomes.${action.id}.evidenceIds references missing evidence ${id}`);
                  }
                });
              }
              if (outcome.unlockOptionIds !== undefined && !isStringArray(outcome.unlockOptionIds)) {
                errors.push(`outcomes.${action.id}.unlockOptionIds must be string array`);
              }
              if (isStringArray(outcome.unlockOptionIds)) {
                outcome.unlockOptionIds.forEach((id: string) => {
                  if (!optionIdSet.has(id as OptionId)) {
                    errors.push(`outcomes.${action.id}.unlockOptionIds invalid option ${id}`);
                  }
                });
              }
              if (outcome.disableActionIds !== undefined && !isStringArray(outcome.disableActionIds)) {
                errors.push(`outcomes.${action.id}.disableActionIds must be string array`);
              }
              if (isStringArray(outcome.disableActionIds)) {
                outcome.disableActionIds.forEach((id: string) => {
                  if (!actionIds.has(id)) {
                    errors.push(`outcomes.${action.id}.disableActionIds missing action ${id}`);
                  }
                });
              }
              if (outcome.tagsAdded !== undefined && !isTagSet(outcome.tagsAdded)) {
                errors.push(`outcomes.${action.id}.tagsAdded must be tag set`);
              }
              if (outcome.hpDelta !== undefined && !isFiniteNumber(outcome.hpDelta)) {
                errors.push(`outcomes.${action.id}.hpDelta must be number`);
              }
            });
          }
        });
      }

      if (!Array.isArray(scene.options) || scene.options.length === 0) {
        errors.push(`scenes[${sceneIndex}].options must be non-empty`);
      }

      const optionIds = new Set<OptionId>();
      if (Array.isArray(scene.options)) {
        let defaultCount = 0;
        scene.options.forEach((option: unknown, optionIndex: number) => {
          if (!isObject(option) || !isOptionId(option.id)) {
            errors.push(`scenes[${sceneIndex}].options[${optionIndex}].id must be A/B/C`);
            return;
          }
          optionIds.add(option.id);
          if (option.defaultVisible) defaultCount += 1;
          if (typeof option.text !== 'string') {
            errors.push(`scenes[${sceneIndex}].options[${optionIndex}].text must be string`);
          }
          if (option.tagsAdded !== undefined && !isTagSet(option.tagsAdded)) {
            errors.push(`scenes[${sceneIndex}].options[${optionIndex}].tagsAdded must be tag set`);
          }
          if (!Array.isArray(option.next) || option.next.length === 0) {
            errors.push(`scenes[${sceneIndex}].options[${optionIndex}].next must be non-empty array`);
          } else {
            option.next.forEach((route: unknown, routeIndex: number) => {
              if (!isObject(route)) {
                errors.push(`scenes[${sceneIndex}].options[${optionIndex}].next[${routeIndex}] must be object`);
                return;
              }
              if (route.ifGlobal !== undefined && !isTagCondition(route.ifGlobal)) {
                errors.push(`scenes[${sceneIndex}].options[${optionIndex}].next[${routeIndex}].ifGlobal invalid`);
              }
              if (route.ifScene !== undefined && !isTagCondition(route.ifScene)) {
                errors.push(`scenes[${sceneIndex}].options[${optionIndex}].next[${routeIndex}].ifScene invalid`);
              }
              if (route.ifActions !== undefined && !isTagCondition(route.ifActions)) {
                errors.push(`scenes[${sceneIndex}].options[${optionIndex}].next[${routeIndex}].ifActions invalid`);
              }
              if (route.ifActions && isTagCondition(route.ifActions)) {
                const actionRefs = [
                  ...(route.ifActions.all ?? []),
                  ...(route.ifActions.any ?? []),
                  ...(route.ifActions.none ?? []),
                ];
                actionRefs.forEach((id: string) => {
                  if (!actionIds.has(id)) {
                    errors.push(`scenes[${sceneIndex}].options[${optionIndex}].next[${routeIndex}].ifActions references missing action ${id}`);
                  }
                });
              }
              pendingRoutes.push({ sceneId: sceneId as string, optionId: option.id, to: route.to });
            });
          }
        });
        if (defaultCount !== 1) {
          errors.push(`scenes[${sceneIndex}].options must have exactly one defaultVisible option`);
        }
      }

      if (!Array.isArray(scene.unlockRules)) {
        errors.push(`scenes[${sceneIndex}].unlockRules must be array`);
      } else {
        scene.unlockRules.forEach((rule: unknown, ruleIndex: number) => {
          if (!isObject(rule) || !isOptionId(rule.optionId) || !isStringArray(rule.evidenceIds)) {
            errors.push(`scenes[${sceneIndex}].unlockRules[${ruleIndex}] invalid`);
            return;
          }
          if (!optionIds.has(rule.optionId)) {
            errors.push(`scenes[${sceneIndex}].unlockRules[${ruleIndex}] references missing option`);
          }
          rule.evidenceIds.forEach((id: string) => {
            if (!evidenceIds.has(id)) {
              errors.push(`scenes[${sceneIndex}].unlockRules[${ruleIndex}] references missing evidence ${id}`);
            }
          });
        });
      }

      if (!isObject(scene.outcomeByOption)) {
        errors.push(`scenes[${sceneIndex}].outcomeByOption must be object`);
      } else {
        optionIds.forEach((optionId) => {
          const outcome = (scene.outcomeByOption as Record<string, unknown>)[optionId];
          if (!outcome || !isObject(outcome) || typeof outcome.text !== 'string') {
            errors.push(`scenes[${sceneIndex}].outcomeByOption missing text for ${optionId}`);
          } else {
            if (outcome.hpDelta !== undefined && !isFiniteNumber(outcome.hpDelta)) {
              errors.push(`scenes[${sceneIndex}].outcomeByOption.${optionId}.hpDelta must be number`);
            }
          }
        });
      }
    });
  }

  if (typeof startSceneId === 'string' && sceneIds.size > 0 && !sceneIds.has(startSceneId)) {
    errors.push(`startSceneId ${startSceneId} does not match any scene id`);
  }

  pendingRoutes.forEach((route) => {
    if (route.to === null) return;
    if (typeof route.to !== 'string' || !sceneIds.has(route.to)) {
      errors.push(`Scene ${route.sceneId} option ${route.optionId} routes to missing scene ${String(route.to)}`);
    }
  });

  if (combatScenes.length > 0 && !combat) {
    errors.push(`combat config is required when combat scenes exist (missing for ${combatScenes.join(', ')})`);
  }

  if (errors.length > 0) {
    throw new Error(`Invalid story-data.json:\n- ${errors.join('\n- ')}`);
  }

  return raw as StoryData;
}

export const STORY_DATA = assertStoryData(rawStoryData);
export const STORY_SCENES: Scene[] = STORY_DATA.scenes;
export const STORY_START_SCENE_ID: SceneId = STORY_DATA.startSceneId;
export const SCENE_ID_SET = new Set<SceneId>(STORY_SCENES.map((scene) => scene.id));
export const SCENE_BY_ID: Record<SceneId, Scene> = STORY_SCENES.reduce((acc, scene) => {
  acc[scene.id] = scene;
  return acc;
}, {} as Record<SceneId, Scene>);

export function getDefaultNextSceneId(sceneId: SceneId): SceneId | null {
  const currentIndex = STORY_SCENES.findIndex((scene) => scene.id === sceneId);
  if (currentIndex < 0) return null;
  const nextScene = STORY_SCENES[currentIndex + 1];
  return nextScene ? nextScene.id : null;
}

export function applyTagSet(tags: TagSet | undefined, globalSet: Set<string>, sceneSet: Set<string>) {
  if (!tags) return;
  tags.global?.forEach((tag) => globalSet.add(tag));
  tags.scene?.forEach((tag) => sceneSet.add(tag));
}

function matchesCondition(tags: Set<string>, condition?: TagCondition): boolean {
  if (!condition) return true;
  if (condition.all && condition.all.some((tag) => !tags.has(tag))) return false;
  if (condition.any && condition.any.length > 0 && !condition.any.some((tag) => tags.has(tag))) return false;
  if (condition.none && condition.none.some((tag) => tags.has(tag))) return false;
  return true;
}

export function resolveNextSceneId(
  scene: Scene,
  optionId: OptionId,
  globalTags: Set<string>,
  sceneTags: Set<string>,
  actionIds: Set<string>
): SceneId | null {
  const option = scene.options.find((item) => item.id === optionId);
  if (!option) return null;

  const nextGlobalTags = new Set(globalTags);
  const nextSceneTags = new Set(sceneTags);
  applyTagSet(option.tagsAdded, nextGlobalTags, nextSceneTags);

  const routes = option.next ?? [];
  for (const route of routes) {
    if (!matchesCondition(nextGlobalTags, route.ifGlobal)) continue;
    if (!matchesCondition(nextSceneTags, route.ifScene)) continue;
    if (!matchesCondition(actionIds, route.ifActions)) continue;
    return route.to ?? null;
  }

  return null;
}
