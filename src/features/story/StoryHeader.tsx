import { Image, type LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import type { EdgeInsets } from 'react-native-safe-area-context';

import headerTexture from '@/assets/images/T_Background_Header.png';
import headerBorderTexture from '@/assets/images/T_HeaderBorder.png';
import { PartyTopBar } from '@/features/party/PartyTopBar';
import type { PartyStatusRow } from '@/utils/buildPartyStatusRows';

type StoryHeaderProps = {
  headerMinHeight: number;
  headerVerticalPadding: number;
  insets: EdgeInsets;
  partyHp: number;
  partyHpMax: number;
  partyStatusRows: PartyStatusRow[];
  hasTechAlert: boolean;
  onToggleStatusPanel: () => void;
  onLayout: (event: LayoutChangeEvent) => void;
};

export function StoryHeader({
  headerMinHeight,
  headerVerticalPadding,
  insets,
  partyHp,
  partyHpMax,
  partyStatusRows,
  hasTechAlert,
  onToggleStatusPanel,
  onLayout,
}: StoryHeaderProps) {
  return (
    <View onLayout={onLayout} style={[styles.storyHeader, { minHeight: headerMinHeight }]}>
      <Image source={headerTexture} style={styles.storyHeaderBg} resizeMode="stretch" />
      <Image source={headerBorderTexture} style={styles.storyHeaderBorder} resizeMode="stretch" />
      <View
        style={[
          styles.storyHeaderContent,
          {
            paddingHorizontal: 18,
            paddingTop: headerVerticalPadding + insets.top,
            paddingBottom: headerVerticalPadding,
          },
        ]}
      >
        <View
          style={[
            styles.headerControlsRow,
            {
              top: Math.max(4, insets.top),
              paddingLeft: 18 + insets.left,
              paddingRight: 18 + insets.right,
            },
          ]}
        >
          <Pressable style={styles.dotsButton} onPress={onToggleStatusPanel}>
            <Text style={styles.dotsButtonText}>...</Text>
            {hasTechAlert ? <View style={styles.dotsAlert} /> : null}
          </Pressable>
        </View>
        <PartyTopBar
          partyHp={partyHp}
          partyHpMax={partyHpMax}
          rows={partyStatusRows}
          variant="overlay"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  storyHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    overflow: 'visible',
    backgroundColor: '#2a1d14',
    zIndex: 5,
  },
  storyHeaderBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 1,
  },
  storyHeaderBorder: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -16,
    height: 18,
  },
  storyHeaderContent: {
    flex: 1,
    justifyContent: 'center',
  },
  headerControlsRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    zIndex: 2,
  },
  dotsButton: {
    width: 28,
    height: 28,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(36, 27, 19, 0.55)',
  },
  dotsButtonText: {
    color: '#f4ead7',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 2,
    marginTop: -1,
  },
  dotsAlert: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: '#f3b3a4',
  },
});
