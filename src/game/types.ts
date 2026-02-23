export type PlayerId = 'p1' | 'p2' | 'p3';
export type RoleId = 'sage' | 'warrior' | 'ranger';

export type Player = {
  id: PlayerId;
  name: string;
};

export type PartyChatMessage = {
  id: string;
  kind: 'player' | 'separator';
  playerId?: PlayerId;
  sceneId?: string;
  text: string;
};
