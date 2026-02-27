import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  TextStyle,
  View,
  StyleProp,
} from 'react-native';

import { CombatStatusCard } from '@/components/story/combat-status-card';

const dividerLarge = require('../../assets/images/T_Divider_L.png');
const dividerSmall = require('../../assets/images/T_Divider_S.png');

type SceneHistoryItem = {
  sceneId: string;
  sceneTitle: string;
  optionId: string;
  outcomeText: string;
};

type JournalEntry =
  | { id: string; kind: 'transition'; text: string }
  | { id: string; kind: 'narration'; text: string }
  | { id: string; kind: 'npc'; speaker: string; text: string; aside?: string; narration?: string }
  | { id: string; kind: 'player'; speaker: string; lines: string[]; stage?: string; narration?: string }
  | {
      id: string;
      kind: 'combat_summary';
      combatState: {
        partyHp: number;
        partyHpMax: number;
        enemyHp: number;
        enemyHpMax: number;
        enemyName: string;
        round: number;
        outcome: 'victory' | 'defeat' | 'escape' | null;
        allowRun: boolean;
      };
      combatLog: { id: string; text: string }[];
    };

type SceneFeedCardProps = {
  sceneId?: string | null;
  sceneTitle?: string | null;
  journalEntries: JournalEntry[];
  sceneHistory: SceneHistoryItem[];
  header?: React.ReactNode;
  footer?: React.ReactNode;
  fullBleed?: boolean;
};

const LINE_REVEAL_CADENCE_MS = 360;
const LINE_FADE_DURATION_MS = 2400;
const LINE_FADE_EASING = Easing.out(Easing.cubic);
const FOOTER_FADE_DURATION_MS = 500;
const FOOTER_REVEAL_BUFFER_MS = 120;

function StoryText({
  text,
  style,
  animate,
  startDelay = 0,
}: {
  text: string;
  style?: StyleProp<TextStyle>;
  animate: boolean;
  startDelay?: number;
}) {
  const opacity = useRef(new Animated.Value(animate ? 0 : 1)).current;

  useEffect(() => {
    if (!animate) {
      opacity.setValue(1);
      return;
    }

    opacity.setValue(0);

    const startTimer = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 1,
        duration: LINE_FADE_DURATION_MS,
        easing: LINE_FADE_EASING,
        useNativeDriver: true,
      }).start();
    }, startDelay);

    return () => {
      clearTimeout(startTimer);
      opacity.stopAnimation();
    };
  }, [animate, opacity, startDelay, text]);

  return (
    <Animated.View style={{ opacity }}>
      <Text style={style}>{text}</Text>
    </Animated.View>
  );
}

function quoted(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return text;
  if (/^[\"“«]/.test(trimmed)) return text;
  return `"${text}"`;
}

function getEntryAnimationUnits(item: JournalEntry): { key: string; text: string }[] {
  if (item.kind === 'transition') {
    return [{ key: `${item.id}-transition`, text: item.text }];
  }

  if (item.kind === 'narration') {
    return [{ key: `${item.id}-narration`, text: item.text }];
  }

  if (item.kind === 'combat_summary') {
    return [];
  }

  if (item.kind === 'npc') {
    const units: { key: string; text: string }[] = [{ key: `${item.id}-speaker`, text: item.speaker }];
    if (item.aside) {
      units.push({ key: `${item.id}-aside`, text: item.aside });
    }
    units.push({ key: `${item.id}-line`, text: quoted(item.text) });
    if (item.narration) {
      units.push({ key: `${item.id}-narration`, text: item.narration });
    }
    return units;
  }

  const units: { key: string; text: string }[] = [];
  if (item.stage) {
    units.push({ key: `${item.id}-stage`, text: item.stage });
  }
  item.lines.forEach((line, lineIndex) => {
    units.push({ key: `${item.id}-line-${lineIndex}`, text: quoted(line) });
  });
  if (item.narration) {
    units.push({ key: `${item.id}-narration`, text: item.narration });
  }
  return units;
}

export function SceneFeedCard({
  sceneId,
  sceneTitle,
  journalEntries,
  sceneHistory: _sceneHistory,
  header,
  footer,
  fullBleed = false,
}: SceneFeedCardProps) {
  const scrollRef = useRef<ScrollView>(null);
  const autoScrollRef = useRef(true);
  const [animateFromIndex, setAnimateFromIndex] = useState<number | null>(null);
  const previousCountRef = useRef<number | null>(null);
  const revealedFooterScenesRef = useRef<Set<string>>(new Set());
  const footerOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (previousCountRef.current === null) {
      previousCountRef.current = journalEntries.length;
      setAnimateFromIndex(0);
      return;
    }
    if (journalEntries.length > previousCountRef.current) {
      setAnimateFromIndex(previousCountRef.current);
    } else {
      setAnimateFromIndex(journalEntries.length);
    }
    previousCountRef.current = journalEntries.length;
  }, [journalEntries.length]);

  useEffect(() => {
    if (!journalEntries.length) return;
    if (autoScrollRef.current) {
      scrollRef.current?.scrollToEnd({ animated: true });
    }
  }, [journalEntries.length]);

  const animationPlan = useMemo(() => {
    const delays = new Map<string, number>();
    if (animateFromIndex === null || animateFromIndex >= journalEntries.length) {
      return { delays, totalDurationMs: 0 };
    }

    let delayCursor = 0;

    for (let index = animateFromIndex; index < journalEntries.length; index += 1) {
      const units = getEntryAnimationUnits(journalEntries[index]);
      units.forEach(({ key, text }) => {
        if (!text) return;
        delays.set(key, delayCursor);
        delayCursor += LINE_REVEAL_CADENCE_MS;
      });
    }

    const totalDurationMs = delayCursor > 0 ? delayCursor - LINE_REVEAL_CADENCE_MS + LINE_FADE_DURATION_MS : 0;
    return { delays, totalDurationMs };
  }, [animateFromIndex, journalEntries]);

  const footerSceneKey = sceneId ?? sceneTitle ?? '__scene__';

  useEffect(() => {
    if (!footer) return;
    if (revealedFooterScenesRef.current.has(footerSceneKey)) {
      footerOpacity.setValue(1);
      return;
    }

    footerOpacity.setValue(0);
  }, [footer, footerOpacity, footerSceneKey]);

  useEffect(() => {
    if (!footer) return;
    if (animateFromIndex === null) return;
    if (revealedFooterScenesRef.current.has(footerSceneKey)) return;

    const revealDelayMs = Math.max(0, animationPlan.totalDurationMs + FOOTER_REVEAL_BUFFER_MS);
    const timer = setTimeout(() => {
      Animated.timing(footerOpacity, {
        toValue: 1,
        duration: FOOTER_FADE_DURATION_MS,
        useNativeDriver: true,
      }).start(() => {
        revealedFooterScenesRef.current.add(footerSceneKey);
      });
    }, revealDelayMs);

    return () => {
      clearTimeout(timer);
      footerOpacity.stopAnimation();
    };
  }, [animateFromIndex, animationPlan.totalDurationMs, footer, footerOpacity, footerSceneKey]);

  const getStartDelay = (animationKey: string) => animationPlan.delays.get(animationKey) ?? 0;

  return (
    <View style={[styles.card, fullBleed && styles.cardFull]}>
      <View style={[styles.bookSheet, fullBleed && styles.bookSheetFull]}>
        {header ? <View style={styles.headerBlock}>{header}</View> : null}
        <Text style={styles.sectionTitle}>
          {`*${sceneTitle ?? 'Scene'}*`}
        </Text>
        <ScrollView
          ref={scrollRef}
          style={styles.journalScroll}
          contentContainerStyle={styles.journalBlock}
          onScroll={(event: NativeSyntheticEvent<NativeScrollEvent>) => {
            const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
            const paddingToBottom = 24;
            autoScrollRef.current = layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;
          }}
          onContentSizeChange={() => {
            if (autoScrollRef.current) {
              scrollRef.current?.scrollToEnd({ animated: true });
            }
          }}
          scrollEventThrottle={16}>
          {journalEntries.map((item, index) => {
            const shouldAnimate =
              animateFromIndex !== null && animateFromIndex < journalEntries.length && index >= animateFromIndex;

            if (item.kind === 'transition') {
              return (
                <View key={item.id} style={styles.transitionWrap}>
                  <Image source={dividerLarge} style={styles.transitionDivider} resizeMode="contain" />
                  <StoryText
                    text={item.text}
                    style={styles.transitionText}
                    animate={shouldAnimate}
                    startDelay={getStartDelay(`${item.id}-transition`)}
                  />
                  <Image source={dividerLarge} style={styles.transitionDivider} resizeMode="contain" />
                </View>
              );
            }

            if (item.kind === 'narration') {
              return (
                <View key={item.id} style={styles.narrativeParagraph}>
                  <StoryText
                    text={item.text}
                    style={styles.narrativeText}
                    animate={shouldAnimate}
                    startDelay={getStartDelay(`${item.id}-narration`)}
                  />
                </View>
              );
            }

            if (item.kind === 'combat_summary') {
              return (
                <View key={item.id} style={styles.combatSummaryWrap}>
                  <CombatStatusCard
                    combatState={item.combatState}
                    combatLog={item.combatLog}
                    resolvedOption={null}
                    showResolutionStatus={false}
                    embedded
                  />
                </View>
              );
            }

            if (item.kind === 'npc') {
              return (
                <View key={item.id} style={[styles.dialogueWrap, styles.dialogueNpc]}>
                  <StoryText
                    text={item.speaker}
                    style={styles.dialogueSpeaker}
                    animate={shouldAnimate}
                    startDelay={getStartDelay(`${item.id}-speaker`)}
                  />
                  {item.aside ? (
                    <StoryText
                      text={item.aside}
                      style={styles.dialogueAside}
                      animate={shouldAnimate}
                      startDelay={getStartDelay(`${item.id}-aside`)}
                    />
                  ) : null}
                  <StoryText
                    text={quoted(item.text)}
                    style={styles.dialogueLine}
                    animate={shouldAnimate}
                    startDelay={getStartDelay(`${item.id}-line`)}
                  />
                  {item.narration ? (
                    <StoryText
                      text={item.narration}
                      style={styles.actionNarration}
                      animate={shouldAnimate}
                      startDelay={getStartDelay(`${item.id}-narration`)}
                    />
                  ) : null}
                </View>
              );
            }

            return (
              <View key={item.id} style={[styles.dialogueWrap, styles.dialoguePlayer]}>
                <Image source={dividerSmall} style={styles.actionDivider} resizeMode="contain" />
                <Text style={styles.dialogueSpeaker}>{item.speaker}</Text>
                {item.stage ? (
                  <StoryText
                    text={item.stage}
                    style={styles.dialogueAside}
                    animate={shouldAnimate}
                    startDelay={getStartDelay(`${item.id}-stage`)}
                  />
                ) : null}
                {item.lines.map((line, lineIndex) => (
                  <StoryText
                    key={`${item.id}-line-${lineIndex}`}
                    text={quoted(line)}
                    style={styles.dialogueLine}
                    animate={shouldAnimate}
                    startDelay={getStartDelay(`${item.id}-line-${lineIndex}`)}
                  />
                ))}
                {item.narration ? (
                  <StoryText
                    text={item.narration}
                    style={styles.actionNarration}
                    animate={shouldAnimate}
                    startDelay={getStartDelay(`${item.id}-narration`)}
                  />
                ) : null}
              </View>
            );
          })}
        </ScrollView>
        {footer ? (
          <Animated.View style={[styles.journalFooter, { opacity: footerOpacity }]}>
            <Image source={dividerLarge} style={styles.journalDivider} resizeMode="contain" />
            {footer}
          </Animated.View>
        ) : null}

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#2a1d14',
    borderRadius: 12,
    padding: 10,
    gap: 10,
    borderWidth: 1,
    borderColor: '#6f4e2e',
    flex: 1,
  },
  cardFull: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    padding: 0,
  },
  bookSheet: {
    backgroundColor: '#f4ead7',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#c9a87a',
    padding: 14,
    gap: 12,
    flex: 1,
  },
  bookSheetFull: {
    borderRadius: 0,
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  headerBlock: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '400',
    color: '#47332a',
    letterSpacing: 0.6,
    fontFamily: 'Besley',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 32,
  },
  narrativeParagraph: {
    borderLeftWidth: 0,
    borderLeftColor: '#47332a',
    paddingLeft: 28,
    paddingRight: 28,
    paddingVertical: 24,
  },
  narrativeText: {
    fontSize: 17,
    lineHeight: 32,
    color: '#47332a',
    fontFamily: 'Besley',
    fontWeight: '500',
  },
  journalScroll: {
    flex: 1,
  },
  journalBlock: {
    gap: 12,
    paddingTop: 4,
    paddingBottom: 4,
  },
  transitionWrap: {
    alignItems: 'center',
    paddingVertical: 6,
    gap: 6,
  },
  transitionDivider: {
    width: '70%',
    aspectRatio: 400 / 22,
    alignSelf: 'center',
  },
  transitionText: {
    fontSize: 12,
    paddingTop: 4,
    paddingBottom: 4,
    fontStyle: 'italic',
    color: '#7a5c39',
    textAlign: 'center',
    fontFamily: 'Besley',
  },
  dialogueWrap: {
    gap: 12,
  },
  dialogueNpc: {
    marginLeft: 28,
  },
  dialoguePlayer: {
    marginLeft: 28,
  },
  combatSummaryWrap: {
    marginLeft: 28,
    marginTop: 6,
    marginBottom: 6,
  },
  dialogueSpeaker: {
    fontSize: 14,
    fontWeight: '600',
    color: '#47332a',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontFamily: 'Besley',
    marginTop: 12,
  },
  dialogueAside: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 20,
    color: '#413129',
    fontStyle: 'italic',
    fontFamily: 'Besley',
    marginTop: 4,
    marginBottom: 12,
  },
  dialogueLine: {
    fontSize: 16,
    lineHeight: 20,
    color: '#413129',
    fontFamily: 'Besley',
    fontWeight: '400',
    fontStyle: 'italic',
    marginTop: 4,
    marginBottom: 12,
  },
  actionNarration: {
    marginTop: 6,
    fontSize: 17,
    lineHeight: 26,
    color: '#413129',
    fontFamily: 'Besley',
    fontWeight: '500',
  },
  journalFooter: {
    marginTop: 6,
    gap: 10,
  },
  journalDivider: {
    width: '100%',
    aspectRatio: 400 / 22,
    alignSelf: 'center',
  },
  actionDivider: {
    width: '50%',
    alignSelf: 'center',
    aspectRatio: 400 / 22,
    opacity: 0.75,
    marginVertical: 2,
  },
});
