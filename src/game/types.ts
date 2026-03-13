export type PlayerId = 'p1' | 'p2' | 'p3';
export type RoleId = 'sage' | 'warrior' | 'ranger';

export type Player = {
  id: PlayerId;
  name: string;
};

export type EmoteText = 'Safe!' | 'Fight!' | 'Trust me!' | 'Sorry...';

export type PartyEmote = {
  id: string;
  playerId: PlayerId;
  sceneId?: string;
  text: EmoteText;
};
