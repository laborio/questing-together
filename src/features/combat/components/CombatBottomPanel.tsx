import { useState } from 'react';
import { BottomSheet, Button, Stack, StatusBadge, Typography } from '@/components';
import { colors } from '@/constants/colors';
import { useTranslation } from '@/contexts/I18nContext';
import RewardScreen from '@/features/combat/components/RewardScreen';
import CardHandGrid from '@/features/combat/components/SpellHandGrid';
import type { PlayerCombatState } from '@/types/spellCombat';

type CombatBottomPanelProps = {
  allEnemiesDead: boolean;
  isDead: boolean;
  turnPhase: string;
  hasEndedTurn: boolean;
  isHost: boolean;
  isBusy: boolean;
  isAnimating: boolean;
  localCombatState: PlayerCombatState | null;
  selectedEnemyIdx: number | null;
  onPlayCard: (handIndex: number, targetEnemyIdx?: number | null) => void;
  onConvergence: () => void;
  onEndTurn: () => void;
  onReroll: () => void;
  onAdvanceScreen: () => Promise<unknown>;
};

const CombatBottomPanel = ({
  allEnemiesDead,
  isDead,
  turnPhase,
  hasEndedTurn,
  isHost,
  isBusy,
  isAnimating,
  localCombatState,
  selectedEnemyIdx,
  onPlayCard,
  onConvergence,
  onEndTurn,
  onReroll,
  onAdvanceScreen,
}: CombatBottomPanelProps) => {
  const { t } = useTranslation();
  const [showRewards, setShowRewards] = useState(false);

  if (allEnemiesDead) {
    if (showRewards) {
      return (
        <RewardScreen
          onDone={() => {
            setShowRewards(false);
            void onAdvanceScreen();
          }}
        />
      );
    }
    return (
      <BottomSheet
        size="sm"
        style={{
          backgroundColor: colors.backgroundCombat,
          borderColor: `${colors.intentConfirmedBorder}33`,
        }}
      >
        <Stack gap={12} align="center" style={{ paddingVertical: 8 }}>
          <StatusBadge icon="⚔️" title="Victory!" titleColor={colors.combatOutcome} />
          {isHost ? (
            <Button
              size="md"
              onPress={() => setShowRewards(true)}
              label={t('combat.claimRewards')}
              disabled={isBusy}
            />
          ) : (
            <Typography variant="caption" style={{ color: colors.combatWaiting }}>
              {t('combat.waitingHost')}
            </Typography>
          )}
        </Stack>
      </BottomSheet>
    );
  }

  if (isDead) return null;

  if (turnPhase === 'enemy') return null;

  if (hasEndedTurn) {
    return (
      <BottomSheet
        size="sm"
        style={{
          backgroundColor: colors.backgroundCombat,
          borderColor: `${colors.intentConfirmedBorder}22`,
        }}
      >
        <Stack align="center" style={{ paddingVertical: 16 }}>
          <Typography variant="caption" style={{ color: colors.combatWaiting }}>
            {t('combat.waitingPlayers')}
          </Typography>
        </Stack>
      </BottomSheet>
    );
  }

  if (!localCombatState) {
    return (
      <BottomSheet
        size="sm"
        style={{
          backgroundColor: colors.backgroundCombat,
          borderColor: `${colors.intentConfirmedBorder}22`,
        }}
      >
        <Stack align="center" style={{ paddingVertical: 16 }}>
          <Typography variant="caption" style={{ color: colors.combatWaiting }}>
            {t('combat.loadingCards')}
          </Typography>
        </Stack>
      </BottomSheet>
    );
  }

  return (
    <BottomSheet
      size="lg"
      style={{
        backgroundColor: colors.backgroundCombat,
        borderTopWidth: 0,
      }}
    >
      <CardHandGrid
        combatState={localCombatState}
        disabled={isAnimating}
        onPlayCard={onPlayCard}
        onConvergence={onConvergence}
        onEndTurn={onEndTurn}
        onReroll={onReroll}
        selectedEnemyIdx={selectedEnemyIdx}
      />
    </BottomSheet>
  );
};

export default CombatBottomPanel;
