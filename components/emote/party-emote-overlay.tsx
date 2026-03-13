import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  ImageSourcePropType,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PARTY_EMOTES } from '@/src/game/constants';
import { EmoteText, PartyEmote, PlayerId, RoleId } from '@/src/game/types';

type PartyEmoteOverlayProps = {
  playerLabelById: Partial<Record<PlayerId, string>>;
  playerRoleById: Partial<Record<PlayerId, RoleId | null>>;
  visibleEmotes: PartyEmote[];
  errorText: string | null;
  onClearVisibleEmote: (id: string) => void;
  onSendEmote: (emote: EmoteText) => void;
};

type Point = {
  x: number;
  y: number;
};

const portraitFrame = require('../../assets/images/T_PortraitFrame.png');
const rangerPortrait = require('../../assets/images/T_RangerPortrait.png');
const sagePortrait = require('../../assets/images/T_SagePortrait.png');
const warriorPortrait = require('../../assets/images/T_WarriorPortrait.png');

const LAUNCHER_SIZE = 72;
const MENU_VISUAL_SIZE = 164;
const OPTION_RADIUS = 112;
const OPTION_BUBBLE_SIZE = 82;
const KNOB_TRAVEL = 26;
const DRAG_THRESHOLD = 8;
const TOAST_ENTRY_DURATION = 140;
const TOAST_RISE_DISTANCE = -400;
const TOAST_HOLD_DURATION = 400;
const TOAST_FADE_DURATION = 1600;
const TOAST_TOTAL_RISE_DURATION = TOAST_ENTRY_DURATION + TOAST_HOLD_DURATION + TOAST_FADE_DURATION;

const optionVectors: Record<EmoteText, Point> = {
  'Safe!': { x: 0, y: -1 },
  'Fight!': { x: 1, y: 0 },
  'Trust me!': { x: 0, y: 1 },
  'Sorry...': { x: -1, y: 0 },
};

function portraitByRole(roleId: RoleId | null | undefined): ImageSourcePropType {
  if (roleId === 'ranger') return rangerPortrait;
  if (roleId === 'sage') return sagePortrait;
  return warriorPortrait;
}

function getMenuCenter(
  launcherLayout: { x: number; y: number; width: number; height: number } | null,
  windowWidth: number,
  windowHeight: number,
  insetTop: number,
  insetBottom: number
): Point | null {
  if (!launcherLayout) return null;

  const desiredX = launcherLayout.x + launcherLayout.width / 2;
  const desiredY = launcherLayout.y + launcherLayout.height / 2;
  const padding = OPTION_RADIUS + OPTION_BUBBLE_SIZE / 2 + 12;

  return {
    x: Math.min(windowWidth - padding, Math.max(padding, desiredX)),
    y: Math.min(windowHeight - insetBottom - padding, Math.max(insetTop + padding, desiredY)),
  };
}

function resolveHighlightedEmote(point: Point, center: Point): EmoteText | null {
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  const distance = Math.hypot(dx, dy);
  if (distance < 34) return null;

  let bestMatch: EmoteText | null = null;
  let bestScore = -Infinity;

  PARTY_EMOTES.forEach((emote) => {
    const vector = optionVectors[emote];
    const score = (dx * vector.x + dy * vector.y) / distance;
    if (score > bestScore) {
      bestScore = score;
      bestMatch = emote;
    }
  });

  return bestMatch;
}

function FloatingEmoteToast({
  emote,
  playerRole,
  playerName,
  onDone,
}: {
  emote: PartyEmote;
  playerRole: RoleId | null | undefined;
  playerName: string;
  onDone: () => void;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(8)).current;
  const scale = useRef(new Animated.Value(0.96)).current;

  useEffect(() => {
    const animation = Animated.parallel([
      Animated.timing(translateY, {
        toValue: TOAST_RISE_DISTANCE,
        duration: TOAST_TOTAL_RISE_DURATION,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 1,
            duration: TOAST_ENTRY_DURATION,
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 1,
            duration: TOAST_ENTRY_DURATION,
            useNativeDriver: true,
          }),
        ]),
        Animated.delay(TOAST_HOLD_DURATION),
        Animated.timing(opacity, {
          toValue: 0,
          duration: TOAST_FADE_DURATION,
          useNativeDriver: true,
        }),
      ]),
    ]);

    animation.start(({ finished }) => {
      if (finished) onDone();
    });

    return () => {
      animation.stop();
    };
  }, [onDone, opacity, scale, translateY]);

  return (
    <Animated.View
      style={[
        styles.toastCard,
        {
          opacity,
          transform: [{ translateY }, { scale }],
        },
      ]}>
      <View style={styles.toastPortraitWrap}>
        <Image source={portraitFrame} style={styles.toastPortraitFrame} resizeMode="contain" />
        <Image source={portraitByRole(playerRole)} style={styles.toastPortraitImage} resizeMode="contain" />
      </View>
      <View style={styles.toastTextWrap}>
        <Text style={styles.toastPlayerName}>{playerName}</Text>
        <Text style={styles.toastText}>{emote.text}</Text>
      </View>
    </Animated.View>
  );
}

export function PartyEmoteOverlay({
  playerLabelById,
  playerRoleById,
  visibleEmotes,
  errorText,
  onClearVisibleEmote,
  onSendEmote,
}: PartyEmoteOverlayProps) {
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [launcherLayout, setLauncherLayout] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [dragPoint, setDragPoint] = useState<Point | null>(null);
  const [highlightedEmote, setHighlightedEmote] = useState<EmoteText | null>(null);

  const menuCenter = useMemo(
    () => getMenuCenter(launcherLayout, windowWidth, windowHeight, insets.top, insets.bottom),
    [insets.bottom, insets.top, launcherLayout, windowHeight, windowWidth]
  );

  const closeMenu = React.useCallback(() => {
    setIsMenuOpen(false);
    setDragPoint(null);
    setHighlightedEmote(null);
  }, []);

  const selectEmote = React.useCallback((emote: EmoteText) => {
    closeMenu();
    onSendEmote(emote);
  }, [closeMenu, onSendEmote]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          if (!menuCenter) return;
          setIsMenuOpen(true);
          setDragPoint(menuCenter);
          setHighlightedEmote(null);
        },
        onPanResponderMove: (_, gestureState) => {
          if (!menuCenter) return;
          const nextPoint = { x: gestureState.moveX, y: gestureState.moveY };
          setDragPoint(nextPoint);
          setHighlightedEmote(resolveHighlightedEmote(nextPoint, menuCenter));
        },
        onPanResponderRelease: (_, gestureState) => {
          if (!menuCenter) {
            closeMenu();
            return;
          }

          const movement = Math.hypot(gestureState.dx, gestureState.dy);
          if (highlightedEmote) {
            selectEmote(highlightedEmote);
            return;
          }

          if (movement < DRAG_THRESHOLD) {
            setIsMenuOpen(true);
            setDragPoint(null);
            setHighlightedEmote(null);
            return;
          }

          closeMenu();
        },
        onPanResponderTerminate: closeMenu,
      }),
    [closeMenu, highlightedEmote, menuCenter, selectEmote]
  );

  const knobStyle = useMemo(() => {
    if (!dragPoint || !menuCenter) {
      return { transform: [{ translateX: 0 }, { translateY: 0 }] };
    }

    const dx = dragPoint.x - menuCenter.x;
    const dy = dragPoint.y - menuCenter.y;
    const distance = Math.max(1, Math.hypot(dx, dy));
    const clampedDistance = Math.min(distance, KNOB_TRAVEL);
    const translateX = (dx / distance) * clampedDistance;
    const translateY = (dy / distance) * clampedDistance;

    return { transform: [{ translateX }, { translateY }] };
  }, [dragPoint, menuCenter]);

  return (
    <>
      <View
        onLayout={(event) => {
          setLauncherLayout(event.nativeEvent.layout);
        }}
        style={[styles.launcherWrap, { right: 16 + insets.right, bottom: 20 + insets.bottom }]}
        {...panResponder.panHandlers}>
        {errorText ? (
          <View style={styles.errorBadge}>
            <Text style={styles.errorBadgeText}>{errorText}</Text>
          </View>
        ) : null}
        <View style={styles.launcherButton}>
          <Text style={styles.launcherLabel}>EMOTE</Text>
        </View>
      </View>

      {isMenuOpen && menuCenter ? (
        <View pointerEvents="box-none" style={styles.overlay}>
          <Pressable style={styles.overlayDismissLayer} onPress={closeMenu} />
          <View
            pointerEvents="none"
            style={[
              styles.menuVisual,
              {
                left: menuCenter.x - MENU_VISUAL_SIZE / 2,
                top: menuCenter.y - MENU_VISUAL_SIZE / 2,
              },
            ]}>
            <View style={styles.menuOuterCircle} />
            <Animated.View style={[styles.menuInnerKnob, knobStyle]} />
          </View>

          {PARTY_EMOTES.map((emote) => {
            const vector = optionVectors[emote];
            const bubbleX = menuCenter.x + vector.x * OPTION_RADIUS - OPTION_BUBBLE_SIZE / 2;
            const bubbleY = menuCenter.y + vector.y * OPTION_RADIUS - OPTION_BUBBLE_SIZE / 2;
            const isHighlighted = highlightedEmote === emote;

            return (
              <Pressable
                key={emote}
                onPress={() => selectEmote(emote)}
                style={[
                  styles.optionBubble,
                  {
                    left: bubbleX,
                    top: bubbleY,
                  },
                  isHighlighted && styles.optionBubbleHighlighted,
                ]}>
                <Text style={[styles.optionBubbleText, isHighlighted && styles.optionBubbleTextHighlighted]}>{emote}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <View pointerEvents="none" style={[styles.toastStack, { bottom: 112 + insets.bottom }]}>
        {visibleEmotes.map((emote) => (
          <FloatingEmoteToast
            key={emote.id}
            emote={emote}
            playerRole={playerRoleById[emote.playerId]}
            playerName={playerLabelById[emote.playerId] ?? emote.playerId}
            onDone={() => onClearVisibleEmote(emote.id)}
          />
        ))}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  launcherWrap: {
    position: 'absolute',
    zIndex: 20,
    width: LAUNCHER_SIZE,
    height: LAUNCHER_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  launcherButton: {
    width: LAUNCHER_SIZE,
    height: LAUNCHER_SIZE,
    borderRadius: LAUNCHER_SIZE / 2,
    backgroundColor: '#403108',
    borderWidth: 2,
    borderColor: '#d4b020',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.22,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  launcherLabel: {
    color: '#f8f1e2',
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'Besley',
    letterSpacing: 0.6,
  },
  errorBadge: {
    position: 'absolute',
    right: 0,
    bottom: LAUNCHER_SIZE + 10,
    maxWidth: 180,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#a53f36',
    backgroundColor: 'rgba(91, 32, 26, 0.94)',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  errorBadgeText: {
    color: '#f8e2dd',
    fontSize: 11,
    lineHeight: 15,
    fontFamily: 'Besley',
    textAlign: 'right',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 19,
  },
  overlayDismissLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  menuVisual: {
    position: 'absolute',
    width: MENU_VISUAL_SIZE,
    height: MENU_VISUAL_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuOuterCircle: {
    width: MENU_VISUAL_SIZE,
    height: MENU_VISUAL_SIZE,
    borderRadius: MENU_VISUAL_SIZE / 2,
    borderWidth: 3,
    borderColor: 'rgba(229, 219, 196, 0.82)',
    backgroundColor: 'rgba(28, 42, 46, 0.42)',
  },
  menuInnerKnob: {
    position: 'absolute',
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 2,
    borderColor: '#f4ead7',
    backgroundColor: 'rgba(25, 77, 67, 0.9)',
  },
  optionBubble: {
    position: 'absolute',
    width: OPTION_BUBBLE_SIZE,
    height: OPTION_BUBBLE_SIZE,
    borderRadius: OPTION_BUBBLE_SIZE / 2,
    borderWidth: 2,
    borderColor: '#d8c49f',
    backgroundColor: 'rgba(244, 234, 215, 0.96)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    shadowColor: '#000000',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  optionBubbleHighlighted: {
    backgroundColor: '#244d44',
    transform: [{ scale: 1.08 }],
  },
  optionBubbleText: {
    color: '#4f3824',
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '700',
    fontFamily: 'Besley',
    textAlign: 'center',
  },
  optionBubbleTextHighlighted: {
    color: '#f8f1e2',
  },
  toastStack: {
    position: 'absolute',
    left: 16,
    right: 96,
    alignItems: 'flex-start',
    gap: 8,
    zIndex: 18,
  },
  toastCard: {
    minWidth: 170,
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#d4c19e',
    backgroundColor: 'rgba(34, 27, 20, 0.92)',
    paddingVertical: 6,
    paddingLeft: 6,
    paddingRight: 14,
  },
  toastPortraitWrap: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toastPortraitFrame: {
    width: '100%',
    height: '100%',
  },
  toastPortraitImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  toastTextWrap: {
    flexShrink: 1,
    gap: 1,
  },
  toastPlayerName: {
    color: '#d8c49f',
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Besley',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  toastText: {
    color: '#f8f1e2',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Besley',
  },
});
