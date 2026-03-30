/**
 * Player identities — each defines a dominant trait, Attune behavior,
 * and convergence action name/description.
 */

import type { Trait } from '@/features/gameConfig/cardTypes';

type Identity = {
  id: string;
  name: string;
  dominantTrait: Trait;
  passiveDescription: string;
  convergenceActionName: string;
  convergenceDescription: string;
};

const IDENTITIES: Identity[] = [
  {
    id: 'fire',
    name: 'Ashbound',
    dominantTrait: 'fire',
    passiveDescription:
      'Start each fight with 1 Attune charge. Consuming an empowered Fire card gives +1 Attune, up to 2. Spend one to retag your next off-trait card as Fire.',
    convergenceActionName: 'Detonate',
    convergenceDescription:
      'If 2 or more traits are empowered, Detonate appears above Fire. It cashes out every empowered trait at once into one combined free action.',
  },
  {
    id: 'guard',
    name: 'Bulwark',
    dominantTrait: 'guard',
    passiveDescription:
      'Start each fight with 1 Attune charge. Consuming an empowered Guard card gives +1 Attune, up to 2. Spend one to retag your next off-trait card as Guard.',
    convergenceActionName: 'Last Bastion',
    convergenceDescription:
      'If 2 or more traits are empowered, Last Bastion appears above Guard. It cashes out every empowered trait at once into one combined free action.',
  },
  {
    id: 'shadow',
    name: 'Nightglass',
    dominantTrait: 'shadow',
    passiveDescription:
      'Start each fight with 1 Attune charge. Consuming an empowered Shadow card gives +1 Attune, up to 2. Spend one to retag your next off-trait card as Shadow.',
    convergenceActionName: 'Execution Window',
    convergenceDescription:
      'If 2 or more traits are empowered, Execution Window appears above Shadow. It cashes out every empowered trait at once into one combined free action.',
  },
  {
    id: 'storm',
    name: 'Tempest Core',
    dominantTrait: 'storm',
    passiveDescription:
      'Start each fight with 1 Attune charge. Consuming an empowered Storm card gives +1 Attune, up to 2. Spend one to retag your next off-trait card as Storm.',
    convergenceActionName: 'Overdrive',
    convergenceDescription:
      'If 2 or more traits are empowered, Overdrive appears above Storm. It cashes out every empowered trait at once into one combined free action.',
  },
  {
    id: 'nature',
    name: 'Worldroot',
    dominantTrait: 'nature',
    passiveDescription:
      'Start each fight with 1 Attune charge. Consuming an empowered Nature card gives +1 Attune, up to 2. Spend one to retag your next off-trait card as Nature.',
    convergenceActionName: 'World Bloom',
    convergenceDescription:
      'If 2 or more traits are empowered, World Bloom appears above Nature. It cashes out every empowered trait at once into one combined free action.',
  },
];

const IDENTITY_BY_ID: Record<string, Identity> = Object.fromEntries(
  IDENTITIES.map((i) => [i.id, i]),
);

const getIdentityById = (id: string): Identity | undefined => IDENTITY_BY_ID[id];

export type { Identity };
export { getIdentityById, IDENTITIES, IDENTITY_BY_ID };
