/**
 * Player identities — each defines a dominant trait
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
      'Fire specialist. Empowering Fire cards fuels devastating Convergence effects.',
    convergenceActionName: 'Detonate',
    convergenceDescription:
      'If 2 or more traits are empowered, Detonate appears above Fire. It cashes out every empowered trait at once into one combined free action.',
  },
  {
    id: 'guard',
    name: 'Bulwark',
    dominantTrait: 'guard',
    passiveDescription:
      'Guard specialist. Empowering Guard cards fuels powerful Convergence defenses.',
    convergenceActionName: 'Last Bastion',
    convergenceDescription:
      'If 2 or more traits are empowered, Last Bastion appears above Guard. It cashes out every empowered trait at once into one combined free action.',
  },
  {
    id: 'shadow',
    name: 'Nightglass',
    dominantTrait: 'shadow',
    passiveDescription:
      'Shadow specialist. Empowering Shadow cards fuels deadly Convergence strikes.',
    convergenceActionName: 'Execution Window',
    convergenceDescription:
      'If 2 or more traits are empowered, Execution Window appears above Shadow. It cashes out every empowered trait at once into one combined free action.',
  },
  {
    id: 'storm',
    name: 'Tempest Core',
    dominantTrait: 'storm',
    passiveDescription:
      'Storm specialist. Empowering Storm cards fuels explosive Convergence bursts.',
    convergenceActionName: 'Overdrive',
    convergenceDescription:
      'If 2 or more traits are empowered, Overdrive appears above Storm. It cashes out every empowered trait at once into one combined free action.',
  },
  {
    id: 'nature',
    name: 'Worldroot',
    dominantTrait: 'nature',
    passiveDescription:
      'Nature specialist. Empowering Nature cards fuels restorative Convergence effects.',
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
