import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

type SceneActionChoice = {
  id: string;
  text: string;
  isDisabled?: boolean;
  hpDelta?: number;
  effectText?: string;
};

type SceneActionsCardProps = {
  phaseLabel: string;
  statusText: string;
  actions: SceneActionChoice[];
  localSelectedActionId: string | null;
  canAct: boolean;
  allowSkip: boolean;
  onTakeAction: (actionId: string) => void;
  onSkip: () => void;
  embedded?: boolean;
};

export function SceneActionsCard({
  phaseLabel,
  statusText,
  actions,
  localSelectedActionId,
  canAct,
  allowSkip,
  onTakeAction,
  onSkip,
  embedded = false,
}: SceneActionsCardProps) {
  return (
    <View style={[styles.card, embedded && styles.embeddedCard]}>
      {!embedded ? <Text style={styles.sectionTitle}>Scene Actions</Text> : null}
      <Text style={styles.phaseText}>{phaseLabel}</Text>
      <Text style={styles.statusText}>{statusText}</Text>

      <ScrollView style={styles.actionsScroll} contentContainerStyle={styles.actionsList} showsVerticalScrollIndicator={false}>
        {actions.map((action) => {
          const isSelectedAction = action.id === localSelectedActionId;
          const isDisabled = !canAct || action.isDisabled;
          const hasHpDelta = typeof action.hpDelta === 'number' && Number.isFinite(action.hpDelta) && action.hpDelta !== 0;
          const hpLabel = hasHpDelta ? `HP ${action.hpDelta > 0 ? '+' : ''}${action.hpDelta}` : null;

          return (
            <Pressable
              key={action.id}
              disabled={isDisabled}
              onPress={() => onTakeAction(action.id)}
              style={[
                styles.actionButton,
                (isSelectedAction || !isDisabled) && styles.actionButtonActive,
                isSelectedAction && styles.actionButtonSelected,
                isDisabled && !isSelectedAction && styles.actionButtonDisabled,
              ]}>
              <Text style={styles.actionText}>{action.text}</Text>
              {hpLabel || action.effectText ? (
                <View style={styles.actionMetaRow}>
                  {hpLabel ? (
                    <Text
                      style={[
                        styles.actionMetaText,
                        action.hpDelta && action.hpDelta < 0 ? styles.actionMetaNegative : styles.actionMetaPositive,
                      ]}>
                      {hpLabel}
                    </Text>
                  ) : null}
                  {action.effectText ? <Text style={styles.actionMetaSubText}>{action.effectText}</Text> : null}
                </View>
              ) : null}
              {action.isDisabled ? <Text style={styles.actionDisabledText}>Unavailable after earlier actions</Text> : null}
            </Pressable>
          );
        })}
      </ScrollView>

      {allowSkip ? (
        <Pressable disabled={!canAct} onPress={onSkip} style={[styles.skipButton, !canAct && styles.skipButtonDisabled]}>
          <Text style={styles.skipButtonText}>Hold back (no reaction)</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#2a1d14',
    borderRadius: 12,
    padding: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#6f4e2e',
  },
  embeddedCard: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    padding: 0,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#f3e8d0',
    fontFamily: 'Besley',
  },
  phaseText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: '#e0bf88',
    fontFamily: 'Besley',
  },
  statusText: {
    fontSize: 12,
    color: '#d3c2a4',
    lineHeight: 18,
    fontFamily: 'Besley',
  },
  actionsList: {
    gap: 8,
    paddingBottom: 2,
  },
  actionsScroll: {
    maxHeight: 260,
  },
  actionButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#7a5c3a',
    backgroundColor: '#3b2a1d',
    padding: 10,
    gap: 4,
  },
  actionButtonActive: {
    borderColor: '#c9a87a',
    backgroundColor: '#4b3624',
  },
  actionButtonSelected: {
    borderColor: '#d9be8f',
    backgroundColor: '#5a3e27',
    opacity: 1,
  },
  actionButtonDisabled: {
    opacity: 0.55,
  },
  actionText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#f3e8d0',
    fontFamily: 'Besley',
    fontWeight: '400',
  },
  actionMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionMetaText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    fontFamily: 'Besley',
  },
  actionMetaPositive: {
    color: '#9ad18b',
  },
  actionMetaNegative: {
    color: '#e39b8e',
  },
  actionMetaSubText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: '#d2b88f',
    fontFamily: 'Besley',
  },
  actionDisabledText: {
    fontSize: 11,
    color: '#c9b69a',
    textTransform: 'uppercase',
    fontWeight: '700',
    fontFamily: 'Besley',
  },
  skipButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#7a5c3a',
    backgroundColor: '#3b2a1d',
    paddingVertical: 10,
    alignItems: 'center',
  },
  skipButtonDisabled: {
    opacity: 0.5,
  },
  skipButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#f3e8d0',
    textTransform: 'uppercase',
    fontFamily: 'Besley',
  },
});
