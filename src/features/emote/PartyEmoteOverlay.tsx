import React, { useMemo, useState } from 'react';
import { Animated, PanResponder, Pressable, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ErrorBadge, FloatingToast, Stack, Typography } from '@/components';
import { colors } from '@/constants/colors';
import { PARTY_EMOTES } from '@/constants/constants';
import type { EmoteText, PartyEmote, PlayerId, RoleId } from '@/types/player';
import { getEmoteMenuCenter } from '@/utils/getEmoteMenuCenter';
import { portraitByRole } from '@/utils/portraitByRole';
import {
  optionVectors,
  type Point,
  resolveHighlightedEmote,
} from '@/utils/resolveHighlightedEmote';

type PartyEmoteOverlayProps = {
  playerLabelById: Partial<Record<PlayerId, string>>;
  playerRoleById: Partial<Record<PlayerId, RoleId | null>>;
  visibleEmotes: PartyEmote[];
  errorText: string | null;
  onClearVisibleEmote: (id: string) => void;
  onSendEmote: (emote: EmoteText) => void;
};

const LAUNCHER_SIZE = 72;
const MENU_VISUAL_SIZE = 164;
const OPTION_RADIUS = 112;
const OPTION_BUBBLE_SIZE = 82;
const KNOB_TRAVEL = 26;
const DRAG_THRESHOLD = 8;

export const PartyEmoteOverlay = ({
  playerLabelById,
  playerRoleById,
  visibleEmotes,
  errorText,
  onClearVisibleEmote,
  onSendEmote,
}: PartyEmoteOverlayProps) => {
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [launcherLayout, setLauncherLayout] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [dragPoint, setDragPoint] = useState<Point | null>(null);
  const [highlightedEmote, setHighlightedEmote] = useState<EmoteText | null>(null);

  const menuCenter = useMemo(
    () => getEmoteMenuCenter(launcherLayout, windowWidth, windowHeight, insets.top, insets.bottom),
    [insets.bottom, insets.top, launcherLayout, windowHeight, windowWidth],
  );

  const closeMenu = React.useCallback(() => {
    setIsMenuOpen(false);
    setDragPoint(null);
    setHighlightedEmote(null);
  }, []);

  const selectEmote = React.useCallback(
    (emote: EmoteText) => {
      closeMenu();
      onSendEmote(emote);
    },
    [closeMenu, onSendEmote],
  );

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
    [closeMenu, highlightedEmote, menuCenter, selectEmote],
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
      <Stack
        align="center"
        justify="center"
        onLayout={(event) => {
          setLauncherLayout(event.nativeEvent.layout);
        }}
        style={{
          position: 'absolute',
          zIndex: 20,
          width: LAUNCHER_SIZE,
          height: LAUNCHER_SIZE,
          right: 16 + insets.right,
          bottom: 20 + insets.bottom,
        }}
        {...panResponder.panHandlers}
      >
        {errorText ? (
          <ErrorBadge
            textAlign="right"
            style={{
              position: 'absolute',
              right: 0,
              bottom: LAUNCHER_SIZE + 10,
              maxWidth: 180,
            }}
          >
            {errorText}
          </ErrorBadge>
        ) : null}
        <Stack
          align="center"
          justify="center"
          style={{
            width: LAUNCHER_SIZE,
            height: LAUNCHER_SIZE,
            borderRadius: LAUNCHER_SIZE / 2,
            backgroundColor: colors.emoteLauncherBg,
            borderWidth: 2,
            borderColor: colors.emoteLauncherBorder,
            shadowColor: colors.textBlack,
            shadowOpacity: 0.22,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 4 },
            elevation: 6,
          }}
        >
          <Typography
            variant="caption"
            style={{
              color: colors.textPrimary,
              fontSize: 11,
              fontWeight: '700',
              letterSpacing: 0.6,
            }}
          >
            EMOTE
          </Typography>
        </Stack>
      </Stack>

      {isMenuOpen && menuCenter ? (
        <Stack
          pointerEvents="box-none"
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 19 }}
        >
          <Pressable
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            onPress={closeMenu}
          />
          <Stack
            pointerEvents="none"
            align="center"
            justify="center"
            style={{
              position: 'absolute',
              width: MENU_VISUAL_SIZE,
              height: MENU_VISUAL_SIZE,
              left: menuCenter.x - MENU_VISUAL_SIZE / 2,
              top: menuCenter.y - MENU_VISUAL_SIZE / 2,
            }}
          >
            <Stack
              style={{
                width: MENU_VISUAL_SIZE,
                height: MENU_VISUAL_SIZE,
                borderRadius: MENU_VISUAL_SIZE / 2,
                borderWidth: 3,
                borderColor: colors.emoteMenuCircleBorder,
                backgroundColor: colors.emoteMenuCircleBg,
              }}
            />
            <Animated.View
              style={[
                {
                  position: 'absolute',
                  width: 54,
                  height: 54,
                  borderRadius: 27,
                  borderWidth: 2,
                  borderColor: colors.emoteKnobBorder,
                  backgroundColor: colors.emoteKnobBg,
                },
                knobStyle,
              ]}
            />
          </Stack>

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
                  {
                    position: 'absolute',
                    width: OPTION_BUBBLE_SIZE,
                    height: OPTION_BUBBLE_SIZE,
                    borderRadius: OPTION_BUBBLE_SIZE / 2,
                    borderWidth: 2,
                    borderColor: colors.emoteBubbleBorder,
                    backgroundColor: colors.emoteBubbleBg,
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingHorizontal: 8,
                    shadowColor: colors.textBlack,
                    shadowOpacity: 0.18,
                    shadowRadius: 8,
                    shadowOffset: { width: 0, height: 4 },
                    elevation: 5,
                    left: bubbleX,
                    top: bubbleY,
                  },
                  isHighlighted && {
                    backgroundColor: colors.emoteBubbleHighlightBg,
                    transform: [{ scale: 1.08 }],
                  },
                ]}
              >
                <Typography
                  variant="body"
                  style={{
                    fontSize: 12,
                    lineHeight: 15,
                    fontWeight: '700',
                    textAlign: 'center',
                    color: isHighlighted ? colors.textPrimary : colors.emoteBubbleText,
                  }}
                >
                  {emote}
                </Typography>
              </Pressable>
            );
          })}
        </Stack>
      ) : null}

      <Stack
        pointerEvents="none"
        gap={8}
        style={{
          position: 'absolute',
          left: 16,
          right: 96,
          bottom: 112 + insets.bottom,
          alignItems: 'flex-start',
          zIndex: 18,
        }}
      >
        {visibleEmotes.map((emote) => (
          <FloatingToast
            key={emote.id}
            portrait={portraitByRole(playerRoleById[emote.playerId])}
            name={playerLabelById[emote.playerId] ?? emote.playerId}
            text={emote.text}
            onDone={() => onClearVisibleEmote(emote.id)}
          />
        ))}
      </Stack>
    </>
  );
};
