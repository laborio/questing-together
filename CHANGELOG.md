# Changelog

## Unreleased

### Refactor
- Reorganized project structure: moved story config to `src/constants/storyConfig.json` and `src/utils/storyConfig.ts`
- Moved player types to `src/types/player.ts`
- Moved `NO_REACTION_ACTION_ID` to `src/constants/constants.ts`
- Simplified `storyConfig.ts`: removed redundant aliases (`STORY_SCENES`, `STORY_START_SCENE_ID`, `SCENE_ID_SET`)
- Renamed `STORY_DATA` to `STORY_CONFIG`
- Split `src/components/story/` into `components/Card/` and `components/Animated/`

## 2026-03-15

### Update
- Resting scene + UI updates for resting scene

### Add
- Combat animated bar fill + auto scrolling on action selection

### Update
- Intermission text UI (removed dividers)
- Text animations don't animate again if already seen

### Fix
- Name creation issue in role selection room

## 2026-03-14

### Add
- Emote system instead of chat
- Voting decisions display other players choices

## 2026-03-13

### Update
- Story content (Mikzor Morgul)

### Add
- Notifications system

## 2026-03-12

### Update
- Visual and editor improvements
- Editor tool upgrade
- UI for title screen and room screen
- Animations, UX layout, journal, story editor entries

## 2026-03-11

- Initial commit
