/**
 * Riddles / puzzles for puzzle screens.
 * Add new riddles here — the adventure generator picks randomly per biome.
 */

export type Riddle = {
  id: string;
  biome: string | null; // null = available in all biomes
  question: string;
  choices: { id: string; text: string; correct: boolean }[];
  reward: { hpDelta?: number; goldDelta?: number; expDelta?: number };
  penalty: { hpDelta?: number; goldDelta?: number; expDelta?: number };
  timeLimit: number; // seconds
};

export const RIDDLES: Riddle[] = [
  {
    id: 'riddle_shadow',
    biome: null,
    question:
      'I have cities, but no houses. I have mountains, but no trees. I have water, but no fish. What am I?',
    choices: [
      { id: 'a', text: 'A map', correct: true },
      { id: 'b', text: 'A dream', correct: false },
      { id: 'c', text: 'A painting', correct: false },
    ],
    reward: { expDelta: 25, goldDelta: 15 },
    penalty: { hpDelta: -15 },
    timeLimit: 30,
  },
  {
    id: 'riddle_time',
    biome: null,
    question: 'What has hands but cannot clap?',
    choices: [
      { id: 'a', text: 'A ghost', correct: false },
      { id: 'b', text: 'A clock', correct: true },
      { id: 'c', text: 'A tree', correct: false },
    ],
    reward: { expDelta: 20, goldDelta: 10 },
    penalty: { hpDelta: -10 },
    timeLimit: 20,
  },
  {
    id: 'riddle_fire',
    biome: null,
    question: "I am not alive, but I grow; I don't have lungs, but I need air. What am I?",
    choices: [
      { id: 'a', text: 'Fire', correct: true },
      { id: 'b', text: 'A crystal', correct: false },
      { id: 'c', text: 'Moss', correct: false },
    ],
    reward: { expDelta: 20, goldDelta: 20 },
    penalty: { hpDelta: -10 },
    timeLimit: 25,
  },
  {
    id: 'riddle_forest_1',
    biome: 'cursed_forest',
    question: 'In the cursed wood, what walks without feet and whispers without a mouth?',
    choices: [
      { id: 'a', text: 'The wind', correct: true },
      { id: 'b', text: 'A snake', correct: false },
      { id: 'c', text: 'A river', correct: false },
    ],
    reward: { expDelta: 30, hpDelta: 10 },
    penalty: { hpDelta: -20 },
    timeLimit: 25,
  },
  {
    id: 'riddle_sewer_1',
    biome: 'sunken_sewers',
    question: 'What flows down but never up, carries secrets but never speaks?',
    choices: [
      { id: 'a', text: 'Blood', correct: false },
      { id: 'b', text: 'Sewage water', correct: true },
      { id: 'c', text: 'Time', correct: false },
    ],
    reward: { expDelta: 25, goldDelta: 15 },
    penalty: { hpDelta: -15 },
    timeLimit: 20,
  },
  {
    id: 'riddle_fortress_1',
    biome: 'ruined_fortress',
    question:
      'I was once full of life, now I guard the dead. I stand tall but I fell long ago. What am I?',
    choices: [
      { id: 'a', text: 'A tower', correct: true },
      { id: 'b', text: 'A sword', correct: false },
      { id: 'c', text: 'A king', correct: false },
    ],
    reward: { expDelta: 30, goldDelta: 10 },
    penalty: { hpDelta: -15 },
    timeLimit: 25,
  },
];
