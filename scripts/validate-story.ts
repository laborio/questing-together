import fs from 'node:fs';
import path from 'node:path';

type UnknownRecord = Record<string, unknown>;

const DEFAULT_STORY_PATH = path.join(process.cwd(), 'src', 'story', 'story-data.json');

function isObject(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isOptionId(value: unknown): value is 'A' | 'B' | 'C' {
  return value === 'A' || value === 'B' || value === 'C';
}

function isTagCondition(value: unknown): value is UnknownRecord {
  if (!isObject(value)) return false;
  if (value.all !== undefined && !isStringArray(value.all)) return false;
  if (value.any !== undefined && !isStringArray(value.any)) return false;
  if (value.none !== undefined && !isStringArray(value.none)) return false;
  return true;
}

function validateStoryData(raw: unknown): string[] {
  const errors: string[] = [];

  if (!isObject(raw)) {
    return ['Story data must be a JSON object.'];
  }

  if (typeof raw.version !== 'number') errors.push('version must be a number');
  if (typeof raw.startSceneId !== 'string') errors.push('startSceneId must be a string');
  if (!Array.isArray(raw.scenes) || raw.scenes.length === 0) {
    errors.push('scenes must be a non-empty array');
    return errors;
  }

  const sceneIds = new Set<string>();
  const pendingRoutes: Array<{ sceneId: string; optionId: string; to: unknown }> = [];
  const combatScenes: string[] = [];

  if (raw.combat !== undefined) {
    if (!isObject(raw.combat)) {
      errors.push('combat must be an object');
    } else {
      const combat = raw.combat as UnknownRecord;
      if (!isFiniteNumber(combat.partyHp) || combat.partyHp <= 0) {
        errors.push('combat.partyHp must be a positive number');
      }
      if (!Array.isArray(combat.actions) || combat.actions.length === 0) {
        errors.push('combat.actions must be a non-empty array');
      } else {
        const actionIds = new Set<string>();
        combat.actions.forEach((action, actionIndex) => {
          if (!isObject(action)) {
            errors.push(`combat.actions[${actionIndex}] must be an object`);
            return;
          }
          if (typeof action.id !== 'string') {
            errors.push(`combat.actions[${actionIndex}].id must be string`);
          } else if (actionIds.has(action.id)) {
            errors.push(`combat.actions has duplicate id ${action.id}`);
          } else {
            actionIds.add(action.id);
          }
          if (typeof action.role !== 'string') {
            errors.push(`combat.actions[${actionIndex}].role must be string`);
          }
          if (typeof action.text !== 'string') {
            errors.push(`combat.actions[${actionIndex}].text must be string`);
          }
          if (!isObject(action.effect)) {
            errors.push(`combat.actions[${actionIndex}].effect must be object`);
          } else {
            const effect = action.effect as UnknownRecord;
            if (effect.damage !== undefined && !isFiniteNumber(effect.damage)) {
              errors.push(`combat.actions[${actionIndex}].effect.damage must be number`);
            }
            if (effect.block !== undefined && !isFiniteNumber(effect.block)) {
              errors.push(`combat.actions[${actionIndex}].effect.block must be number`);
            }
            if (effect.enemyAttackDelta !== undefined && !isFiniteNumber(effect.enemyAttackDelta)) {
              errors.push(`combat.actions[${actionIndex}].effect.enemyAttackDelta must be number`);
            }
            if (effect.run !== undefined && typeof effect.run !== 'boolean') {
              errors.push(`combat.actions[${actionIndex}].effect.run must be boolean`);
            }
          }
        });
      }
    }
  }

  raw.scenes.forEach((scene, sceneIndex) => {
    if (!isObject(scene)) {
      errors.push(`scenes[${sceneIndex}] must be an object`);
      return;
    }

    if (typeof scene.id !== 'string' || !scene.id) {
      errors.push(`scenes[${sceneIndex}].id must be a non-empty string`);
    } else if (sceneIds.has(scene.id)) {
      errors.push(`scenes[${sceneIndex}].id is duplicated (${scene.id})`);
    } else {
      sceneIds.add(scene.id);
    }

    if (typeof scene.title !== 'string') errors.push(`scenes[${sceneIndex}].title must be string`);
    if (typeof scene.intro !== 'string') errors.push(`scenes[${sceneIndex}].intro must be string`);
    if (typeof scene.canonicalTruth !== 'string') {
      errors.push(`scenes[${sceneIndex}].canonicalTruth must be string`);
    }

    if (scene.mode !== undefined && scene.mode !== 'story' && scene.mode !== 'combat' && scene.mode !== 'timed') {
      errors.push(`scenes[${sceneIndex}].mode must be "story", "combat", or "timed"`);
    }
    const sceneMode = scene.mode === 'combat' || scene.combat ? 'combat' : scene.mode === 'timed' || scene.timed ? 'timed' : 'story';
    if (sceneMode === 'combat') {
      combatScenes.push(String(scene.id ?? sceneIndex));
      if (!isObject(scene.combat)) {
        errors.push(`scenes[${sceneIndex}].combat must be object for combat scenes`);
      } else {
        const combat = scene.combat as UnknownRecord;
        if (typeof combat.enemyName !== 'string') {
          errors.push(`scenes[${sceneIndex}].combat.enemyName must be string`);
        }
        if (!isFiniteNumber(combat.enemyHp) || combat.enemyHp <= 0) {
          errors.push(`scenes[${sceneIndex}].combat.enemyHp must be positive number`);
        }
        if (!isFiniteNumber(combat.enemyAttack) || combat.enemyAttack < 0) {
          errors.push(`scenes[${sceneIndex}].combat.enemyAttack must be non-negative number`);
        }
        if (combat.allowRun !== undefined && typeof combat.allowRun !== 'boolean') {
          errors.push(`scenes[${sceneIndex}].combat.allowRun must be boolean`);
        }
      }
    }
    if (sceneMode === 'timed') {
      if (!isObject(scene.timed)) {
        errors.push(`scenes[${sceneIndex}].timed must be object for timed scenes`);
      } else {
        const timed = scene.timed as UnknownRecord;
        if (timed.kind !== 'rest' && timed.kind !== 'travel' && timed.kind !== 'wait') {
          errors.push(`scenes[${sceneIndex}].timed.kind must be "rest", "travel", or "wait"`);
        }
        if (!isFiniteNumber(timed.durationSeconds) || timed.durationSeconds <= 0) {
          errors.push(`scenes[${sceneIndex}].timed.durationSeconds must be positive number`);
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
        scene.introDialogue.forEach((line, lineIndex) => {
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
      scene.evidence.forEach((evidence, evidenceIndex) => {
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
      scene.steps.forEach((step, stepIndex) => {
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
          step.actions.forEach((action, actionIndex) => {
            if (!isObject(action)) {
              errors.push(`scenes[${sceneIndex}].steps[${stepIndex}].actions[${actionIndex}] must be object`);
              return;
            }
            if (typeof action.id !== 'string') {
              errors.push(`scenes[${sceneIndex}].steps[${stepIndex}].actions[${actionIndex}].id must be string`);
            } else {
              actionIds.add(action.id);
            }
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
        } else {
          actionIds.forEach((actionId) => {
            if (step.outcomes[actionId] === undefined) {
              errors.push(`scenes[${sceneIndex}].steps[${stepIndex}].outcomes missing action ${actionId}`);
            }
          });

          Object.entries(step.outcomes).forEach(([actionId, outcome]) => {
            if (!isObject(outcome)) {
              errors.push(`scenes[${sceneIndex}].steps[${stepIndex}].outcomes.${actionId} must be object`);
              return;
            }
            if (typeof outcome.narration !== 'string') {
              errors.push(`scenes[${sceneIndex}].steps[${stepIndex}].outcomes.${actionId}.narration must be string`);
            }

            if (outcome.evidenceIds !== undefined && !isStringArray(outcome.evidenceIds)) {
              errors.push(`scenes[${sceneIndex}].steps[${stepIndex}].outcomes.${actionId}.evidenceIds must be string[]`);
            } else if (Array.isArray(outcome.evidenceIds)) {
              outcome.evidenceIds.forEach((evidenceId) => {
                if (!evidenceIds.has(evidenceId)) {
                  errors.push(`scenes[${sceneIndex}].steps[${stepIndex}].outcomes.${actionId}.evidenceIds missing ${evidenceId}`);
                }
              });
            }

            if (outcome.unlockOptionIds !== undefined && !Array.isArray(outcome.unlockOptionIds)) {
              errors.push(`scenes[${sceneIndex}].steps[${stepIndex}].outcomes.${actionId}.unlockOptionIds must be array`);
            }

            if (outcome.disableActionIds !== undefined && !isStringArray(outcome.disableActionIds)) {
              errors.push(`scenes[${sceneIndex}].steps[${stepIndex}].outcomes.${actionId}.disableActionIds must be string[]`);
            } else if (Array.isArray(outcome.disableActionIds)) {
              outcome.disableActionIds.forEach((disabledId) => {
                if (!actionIds.has(disabledId)) {
                  errors.push(`scenes[${sceneIndex}].steps[${stepIndex}].outcomes.${actionId}.disableActionIds missing ${disabledId}`);
                }
              });
            }

            if (outcome.tagsAdded !== undefined) {
              const tagsAdded = outcome.tagsAdded;
              if (!isObject(tagsAdded)) {
                errors.push(`scenes[${sceneIndex}].steps[${stepIndex}].outcomes.${actionId}.tagsAdded must be object`);
              } else {
                if (tagsAdded.global !== undefined && !isStringArray(tagsAdded.global)) {
                  errors.push(`scenes[${sceneIndex}].steps[${stepIndex}].outcomes.${actionId}.tagsAdded.global must be string[]`);
                }
                if (tagsAdded.scene !== undefined && !isStringArray(tagsAdded.scene)) {
                  errors.push(`scenes[${sceneIndex}].steps[${stepIndex}].outcomes.${actionId}.tagsAdded.scene must be string[]`);
                }
              }
            }
            if (outcome.hpDelta !== undefined && !isFiniteNumber(outcome.hpDelta)) {
              errors.push(`scenes[${sceneIndex}].steps[${stepIndex}].outcomes.${actionId}.hpDelta must be number`);
            }
          });
        }
      });
    }

    if (!Array.isArray(scene.options) || scene.options.length === 0) {
      errors.push(`scenes[${sceneIndex}].options must be a non-empty array`);
    }

    const optionIds = new Set<string>();
    let hasDefault = false;
    if (Array.isArray(scene.options)) {
      scene.options.forEach((option, optionIndex) => {
        if (!isObject(option)) {
          errors.push(`scenes[${sceneIndex}].options[${optionIndex}] must be object`);
          return;
        }
        if (!isOptionId(option.id)) {
          errors.push(`scenes[${sceneIndex}].options[${optionIndex}].id must be A/B/C`);
        } else if (optionIds.has(option.id)) {
          errors.push(`scenes[${sceneIndex}].options[${optionIndex}].id duplicated ${option.id}`);
        } else {
          optionIds.add(option.id);
        }
        if (typeof option.text !== 'string') {
          errors.push(`scenes[${sceneIndex}].options[${optionIndex}].text must be string`);
        }
        if (option.defaultVisible === true) hasDefault = true;
        if (!Array.isArray(option.next) || option.next.length === 0) {
          errors.push(`scenes[${sceneIndex}].options[${optionIndex}].next must be non-empty array`);
        } else {
          option.next.forEach((route, routeIndex) => {
            if (!isObject(route) || !('to' in route)) {
              errors.push(`scenes[${sceneIndex}].options[${optionIndex}].next[${routeIndex}] must have "to"`);
              return;
            }
            if (route.ifGlobal !== undefined && !isTagCondition(route.ifGlobal)) {
              errors.push(`scenes[${sceneIndex}].options[${optionIndex}].next[${routeIndex}].ifGlobal invalid`);
            }
            if (route.ifScene !== undefined && !isTagCondition(route.ifScene)) {
              errors.push(`scenes[${sceneIndex}].options[${optionIndex}].next[${routeIndex}].ifScene invalid`);
            }
            pendingRoutes.push({ sceneId: String(scene.id), optionId: String(option.id), to: route.to });
          });
        }
      });
    }

    if (!hasDefault) {
      errors.push(`scenes[${sceneIndex}].options must include a defaultVisible option`);
    }

    if (!Array.isArray(scene.unlockRules)) {
      errors.push(`scenes[${sceneIndex}].unlockRules must be an array`);
    } else {
      scene.unlockRules.forEach((rule, ruleIndex) => {
        if (!isObject(rule)) {
          errors.push(`scenes[${sceneIndex}].unlockRules[${ruleIndex}] must be object`);
          return;
        }
        if (!isOptionId(rule.optionId)) {
          errors.push(`scenes[${sceneIndex}].unlockRules[${ruleIndex}].optionId must be A/B/C`);
        }
        if (!isStringArray(rule.evidenceIds)) {
          errors.push(`scenes[${sceneIndex}].unlockRules[${ruleIndex}].evidenceIds must be string[]`);
        } else {
          rule.evidenceIds.forEach((evidenceId) => {
            if (!evidenceIds.has(evidenceId)) {
              errors.push(`scenes[${sceneIndex}].unlockRules[${ruleIndex}].evidenceIds missing ${evidenceId}`);
            }
          });
        }
      });
    }

    if (!isObject(scene.outcomeByOption)) {
      errors.push(`scenes[${sceneIndex}].outcomeByOption must be object`);
    } else {
      optionIds.forEach((optionId) => {
        if (!scene.outcomeByOption[optionId]) {
          errors.push(`scenes[${sceneIndex}].outcomeByOption missing ${optionId}`);
        } else if (!isObject(scene.outcomeByOption[optionId])) {
          errors.push(`scenes[${sceneIndex}].outcomeByOption.${optionId} must be object`);
        } else if (typeof scene.outcomeByOption[optionId]?.text !== 'string') {
          errors.push(`scenes[${sceneIndex}].outcomeByOption.${optionId}.text must be string`);
        } else if (
          scene.outcomeByOption[optionId]?.hpDelta !== undefined &&
          !isFiniteNumber(scene.outcomeByOption[optionId]?.hpDelta)
        ) {
          errors.push(`scenes[${sceneIndex}].outcomeByOption.${optionId}.hpDelta must be number`);
        }
      });
    }
  });

  if (typeof raw.startSceneId === 'string' && !sceneIds.has(raw.startSceneId)) {
    errors.push(`startSceneId (${raw.startSceneId}) does not match a scene id`);
  }

  pendingRoutes.forEach((route) => {
    if (route.to !== null && typeof route.to !== 'string') {
      errors.push(`Scene ${route.sceneId} option ${route.optionId} has invalid route "to"`);
    } else if (typeof route.to === 'string' && !sceneIds.has(route.to)) {
      errors.push(`Scene ${route.sceneId} option ${route.optionId} routes to missing scene ${route.to}`);
    }
  });

  if (combatScenes.length > 0 && raw.combat === undefined) {
    errors.push(`combat config is required when combat scenes exist (${combatScenes.join(', ')})`);
  }

  return errors;
}

function run(): void {
  const storyPath = process.argv[2] ?? DEFAULT_STORY_PATH;
  const json = fs.readFileSync(storyPath, 'utf8');
  const raw = JSON.parse(json) as unknown;
  const errors = validateStoryData(raw);

  if (errors.length > 0) {
    console.error('Story validation failed:');
    errors.forEach((error) => console.error(`- ${error}`));
    process.exitCode = 1;
    return;
  }

  console.log(`Story validation passed for ${storyPath}`);
}

run();
