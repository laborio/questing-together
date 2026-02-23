import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

type PartyStatusTone = 'ready' | 'waiting' | 'neutral' | 'offline';

type PartyStatusRow = {
  id: string;
  name: string;
  role: string;
  status: string;
  tone: PartyStatusTone;
};

type PartyTopBarProps = {
  partyHp: number;
  partyHpMax: number;
  rows: PartyStatusRow[];
  variant?: 'default' | 'parchment' | 'overlay';
};

const roleColorMap: Record<string, string> = {
  warrior: '#7b3f2a',
  sage: '#4f6b8a',
  ranger: '#3d6b4d',
};

const toneDotMap: Record<PartyStatusTone, string> = {
  ready: '#7dbf72',
  waiting: '#d6b25d',
  neutral: '#9b8b75',
  offline: '#b35b4a',
};

export function PartyTopBar({ partyHp, partyHpMax, rows, variant = 'default' }: PartyTopBarProps) {
  const max = Math.max(1, partyHpMax);
  const percent = Math.max(0, Math.min(1, partyHp / max));
  const isParchment = variant === 'parchment';
  const isOverlay = variant === 'overlay';
  const isCompact = isOverlay;

  return (
    <View
      style={[
        styles.bar,
        isParchment && styles.barParchment,
        isOverlay && styles.barOverlay,
        isCompact && styles.barCompact,
      ]}
    >
      <View style={[styles.avatarRow, isCompact && styles.avatarRowCompact]}>
        {rows.map((row) => {
          const roleKey = row.role.toLowerCase();
          const roleColor = roleColorMap[roleKey] ?? '#7a5c3a';
          const dotColor = toneDotMap[row.tone] ?? toneDotMap.neutral;
          const initial = row.name ? row.name[0]?.toUpperCase() : '?';

          return (
            <View key={row.id} style={[styles.avatarWrap, isCompact && styles.avatarWrapCompact]}>
              <View
                style={[
                  styles.avatarCircle,
                  isParchment && styles.avatarCircleParchment,
                  isOverlay && styles.avatarCircleOverlay,
                  isCompact && styles.avatarCircleCompact,
                  { borderColor: roleColor },
                ]}
              >
                <View style={[styles.avatarInner, { backgroundColor: roleColor }]}>
                  <Text
                    style={[
                      styles.avatarInitial,
                      isParchment && styles.avatarInitialParchment,
                      isOverlay && styles.avatarInitialOverlay,
                      isCompact && styles.avatarInitialCompact,
                    ]}
                  >
                    {initial}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusDot,
                    isParchment && styles.statusDotParchment,
                    isOverlay && styles.statusDotOverlay,
                    { backgroundColor: dotColor },
                  ]}
                />
              </View>
              <Text
                style={[
                  styles.avatarName,
                  isParchment && styles.avatarNameParchment,
                  isOverlay && styles.avatarNameOverlay,
                  isCompact && styles.avatarNameCompact,
                ]}
              >
                {row.name}
              </Text>
            </View>
          );
        })}
      </View>

      <View
        style={[
          styles.hpPlaque,
          isParchment && styles.hpPlaqueParchment,
          isOverlay && styles.hpPlaqueOverlay,
          isCompact && styles.hpPlaqueCompact,
        ]}
      >
        <Text style={[styles.hpLabel, isParchment && styles.hpLabelParchment, isOverlay && styles.hpLabelOverlay]}>
          Party Health
        </Text>
        <Text style={[styles.hpValue, isParchment && styles.hpValueParchment, isOverlay && styles.hpValueOverlay]}>
          {partyHp} / {partyHpMax}
        </Text>
        <View style={[styles.hpBar, isParchment && styles.hpBarParchment, isOverlay && styles.hpBarOverlay]}>
          <View style={[styles.hpFill, { width: `${percent * 100}%` }]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#7a5c3a',
    backgroundColor: '#3b2a1d',
  },
  barParchment: {
    borderColor: '#c9a87a',
    backgroundColor: '#f0e2c9',
  },
  barOverlay: {
    borderWidth: 0,
    borderColor: 'transparent',
    backgroundColor: 'transparent',
  },
  barCompact: {
    paddingVertical: 4,
    paddingHorizontal: 6,
    gap: 8,
  },
  avatarRowCompact: {
    gap: 6,
    flexWrap: 'nowrap',
  },
  avatarRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
    flex: 1,
  },
  avatarWrap: {
    alignItems: 'center',
    width: 72,
  },
  avatarWrapCompact: {
    width: 48,
  },
  avatarCircle: {
    width: 54,
    height: 54,
    borderRadius: 999,
    borderWidth: 2,
    padding: 3,
    backgroundColor: '#1f1610',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCircleCompact: {
    width: 34,
    height: 34,
    padding: 2,
  },
  avatarCircleParchment: {
    backgroundColor: '#f6efe0',
  },
  avatarCircleOverlay: {
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  avatarInner: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f4ead7',
  },
  avatarInitialCompact: {
    fontSize: 12,
  },
  avatarInitialParchment: {
    color: '#f8f1e2',
  },
  avatarInitialOverlay: {
    color: '#f8f1e2',
  },
  statusDot: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 10,
    height: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#f4ead7',
  },
  statusDotParchment: {
    borderColor: '#4b3420',
  },
  statusDotOverlay: {
    borderColor: '#4b3420',
  },
  avatarName: {
    marginTop: 4,
    fontSize: 11,
    color: '#f3e8d0',
    fontWeight: '600',
  },
  avatarNameCompact: {
    fontSize: 9,
  },
  avatarNameParchment: {
    color: '#5f4325',
  },
  avatarNameOverlay: {
    color: '#f8f1e2',
  },
  hpPlaque: {
    minWidth: 140,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#a58357',
    backgroundColor: '#4a3624',
  },
  hpPlaqueCompact: {
    minWidth: 120,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  hpPlaqueParchment: {
    borderColor: '#c9a87a',
    backgroundColor: '#ebd7b5',
  },
  hpPlaqueOverlay: {
    borderWidth: 0,
    borderColor: 'transparent',
    backgroundColor: 'transparent',
  },
  hpLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: '#e8d7bf',
    fontWeight: '700',
  },
  hpLabelParchment: {
    color: '#6b4a2a',
  },
  hpLabelOverlay: {
    color: '#f4ead7',
  },
  hpValue: {
    marginTop: 2,
    fontSize: 13,
    color: '#f5efe5',
    fontWeight: '700',
  },
  hpValueParchment: {
    color: '#4b3420',
  },
  hpValueOverlay: {
    color: '#f8f1e2',
  },
  hpBar: {
    marginTop: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: '#2a1d14',
    overflow: 'hidden',
  },
  hpBarParchment: {
    backgroundColor: '#d9c2a2',
  },
  hpBarOverlay: {
    backgroundColor: '#d9c2a2',
  },
  hpFill: {
    height: '100%',
    backgroundColor: '#9acd5a',
  },
});
