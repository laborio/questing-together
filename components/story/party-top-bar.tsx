import React from 'react';
import { Image, ImageSourcePropType, StyleSheet, Text, View } from 'react-native';

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

const portraitFrame = require('../../assets/images/T_PortraitFrame.png');
const rangerPortrait = require('../../assets/images/T_RangerPortrait.png');
const sagePortrait = require('../../assets/images/T_SagePortrait.png');
const warriorPortrait = require('../../assets/images/T_WarriorPortrait.png');
const partyHealthFrame = require('../../assets/images/T_PartyHealthFrame.png');

function portraitByRole(role: string): ImageSourcePropType {
  const normalized = role.toLowerCase();
  if (normalized.includes('ranger')) return rangerPortrait;
  if (normalized.includes('sage')) return sagePortrait;
  return warriorPortrait;
}

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
          const portrait = portraitByRole(row.role);

          return (
            <View key={row.id} style={[styles.avatarWrap, isCompact && styles.avatarWrapCompact]}>
              <View style={[styles.avatarFrameWrap, isCompact && styles.avatarFrameWrapCompact]}>
                <Image source={portraitFrame} style={[styles.avatarFrame, isCompact && styles.avatarFrameCompact]} />
                <Image source={portrait} style={styles.avatarPortrait} resizeMode="contain" />
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
          styles.hpFrameWrap,
          isCompact && styles.hpFrameWrapCompact,
        ]}
      >
        <View style={[styles.hpFillClip, isCompact && styles.hpFillClipCompact]}>
          <View style={[styles.hpFill, { width: `${percent * 100}%` }]} />
        </View>
        <Image source={partyHealthFrame} style={styles.hpFrame} resizeMode="stretch" />
        <Text
          style={[
            styles.hpFrameText,
            isParchment && styles.hpFrameTextParchment,
            isOverlay && styles.hpFrameTextOverlay,
            isCompact && styles.hpFrameTextCompact,
          ]}
        >
          Party Health {partyHp}/{partyHpMax}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
    padding: 0,
    borderRadius: 0,
    borderWidth: 0,
    borderColor: '#070504',
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
    paddingVertical: 0,
    paddingHorizontal: 0,
    gap: 0,
  },
  avatarRowCompact: {
    gap: 4,
    flexWrap: 'nowrap',
  },
  avatarRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'nowrap',
    flexShrink: 0,
  },
  avatarWrap: {
    alignItems: 'center',
    width: 96,
  },
  avatarWrapCompact: {
    width: 66,
  },
  avatarFrameWrap: {
    width: 84,
    height: 84,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFrameWrapCompact: {
    width: 52,
    height: 52,
  },
  avatarFrame: {
    width: '100%',
    height: '100%',
  },
  avatarFrameCompact: {
    width: '100%',
    height: '100%',
  },
  avatarPortrait: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    zIndex: 2,
  },
  avatarName: {
    marginTop: 4,
    fontSize: 16,
    color: '#f3e8d0',
    fontWeight: '600',
    fontFamily: 'Besley',
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
  hpFrameWrap: {
    flex: 1,
    minWidth: 0,
    height: 36,
    justifyContent: 'center',
  },
  hpFrameWrapCompact: {
    height: 32,
  },
  hpFrame: {
    ...StyleSheet.absoluteFillObject,
    width: undefined,
    height: undefined,
  },
  hpFillClip: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    borderRadius: 0,
    overflow: 'hidden',
  },
  hpFillClipCompact: {
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    borderRadius: 9,
  },
  hpFill: {
    height: '100%',
    backgroundColor: 'rgba(43, 120, 50, 0.30)',
  },
  hpFrameText: {
    textAlign: 'center',
    color: '#f8f1e2',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Besley',
  },
  hpFrameTextCompact: {
    fontSize: 11,
  },
  hpFrameTextParchment: {
    color: '#4b3420',
  },
  hpFrameTextOverlay: {
    color: '#f8f1e2',
  },
});
