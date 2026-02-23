import React, { useEffect, useRef, useState } from 'react';
import { Image, NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

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
  | { id: string; kind: 'npc'; speaker: string; text: string; aside?: string }
  | { id: string; kind: 'player'; speaker: string; lines: string[]; stage?: string; narration?: string };

type SceneFeedCardProps = {
  sceneTitle?: string | null;
  journalEntries: JournalEntry[];
  sceneHistory: SceneHistoryItem[];
  header?: React.ReactNode;
  footer?: React.ReactNode;
  fullBleed?: boolean;
};

export function SceneFeedCard({
  sceneTitle,
  journalEntries,
  sceneHistory,
  header,
  footer,
  fullBleed = false,
}: SceneFeedCardProps) {
  const [showHistory, setShowHistory] = React.useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const autoScrollRef = useRef(true);
  const [animateFromIndex, setAnimateFromIndex] = useState<number | null>(null);
  const previousCountRef = useRef<number | null>(null);

  useEffect(() => {
    if (previousCountRef.current === null) {
      previousCountRef.current = journalEntries.length;
      setAnimateFromIndex(journalEntries.length);
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

  function TypewriterText({
    text,
    style,
    startDelay = 0,
  }: {
    text: string;
    style?: object;
    startDelay?: number;
  }) {
    const [visibleText, setVisibleText] = useState('');

    useEffect(() => {
      let currentIndex = 0;
      let interval: ReturnType<typeof setInterval> | null = null;

      setVisibleText('');

      const startTimer = setTimeout(() => {
        interval = setInterval(() => {
          currentIndex += 1;
          setVisibleText(text.slice(0, currentIndex));
          if (currentIndex >= text.length && interval) {
            clearInterval(interval);
          }
        }, 28);
      }, startDelay);

      return () => {
        clearTimeout(startTimer);
        if (interval) clearInterval(interval);
      };
    }, [startDelay, text]);

    return <Text style={style}>{visibleText}</Text>;
  }

  function StoryText({
    text,
    style,
    animate,
    startDelay,
  }: {
    text: string;
    style?: object;
    animate: boolean;
    startDelay: number;
  }) {
    if (!text) return null;
    if (!animate) return <Text style={style}>{text}</Text>;
    return <TypewriterText text={text} style={style} startDelay={startDelay} />;
  }

  function quoted(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return text;
    if (/^[\"“«]/.test(trimmed)) return text;
    return `"${text}"`;
  }

  return (
    <View style={[styles.card, fullBleed && styles.cardFull]}>
      <View style={[styles.bookSheet, fullBleed && styles.bookSheetFull]}>
        {header ? <View style={styles.headerBlock}>{header}</View> : null}
        <Text style={styles.sectionTitle}>
          {`*Story Journal — ${sceneTitle ?? 'Scene'}*`}
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
            const startDelay = shouldAnimate && animateFromIndex !== null ? (index - animateFromIndex) * 120 : 0;

            if (item.kind === 'transition') {
              return (
                <View key={item.id} style={styles.transitionWrap}>
                  <Image source={dividerLarge} style={styles.transitionDivider} resizeMode="contain" />
                  <StoryText text={item.text} style={styles.transitionText} animate={shouldAnimate} startDelay={startDelay} />
                  <Image source={dividerLarge} style={styles.transitionDivider} resizeMode="contain" />
                </View>
              );
            }

            if (item.kind === 'narration') {
              return (
                <View key={item.id} style={styles.narrativeParagraph}>
                  <StoryText text={item.text} style={styles.narrativeText} animate={shouldAnimate} startDelay={startDelay} />
                </View>
              );
            }

            if (item.kind === 'npc') {
              return (
                <View key={item.id} style={[styles.dialogueWrap, styles.dialogueNpc]}>
                  <Text style={styles.dialogueSpeaker}>{item.speaker}</Text>
                  {item.aside ? (
                    <StoryText
                      text={item.aside}
                      style={styles.dialogueAside}
                      animate={shouldAnimate}
                      startDelay={startDelay}
                    />
                  ) : null}
                  <StoryText
                    text={quoted(item.text)}
                    style={styles.dialogueLine}
                    animate={shouldAnimate}
                    startDelay={startDelay}
                  />
                </View>
              );
            }

            return (
              <View key={item.id} style={[styles.dialogueWrap, styles.dialoguePlayer]}>
                <Image source={dividerSmall} style={styles.actionDivider} resizeMode="contain" />
                <Text style={styles.dialogueSpeaker}>{item.speaker}</Text>
                {item.stage ? (
                  <StoryText text={item.stage} style={styles.dialogueAside} animate={shouldAnimate} startDelay={startDelay} />
                ) : null}
                {item.lines.map((line, lineIndex) => (
                  <StoryText
                    key={`${item.id}-line-${lineIndex}`}
                    text={quoted(line)}
                    style={styles.dialogueLine}
                    animate={shouldAnimate}
                    startDelay={startDelay}
                  />
                ))}
                {item.narration ? (
                  <StoryText
                    text={item.narration}
                    style={styles.actionNarration}
                    animate={shouldAnimate}
                    startDelay={startDelay}
                  />
                ) : null}
              </View>
            );
          })}
        </ScrollView>
        {footer ? (
          <View style={styles.journalFooter}>
            <Image source={dividerLarge} style={styles.journalDivider} resizeMode="contain" />
            {footer}
          </View>
        ) : null}

        {sceneHistory.length ? (
          <View style={styles.historyCard}>
            <Image source={dividerLarge} style={styles.historyDivider} resizeMode="contain" />
            <Pressable onPress={() => setShowHistory((value) => !value)} style={styles.historyToggle}>
              <Text style={styles.historyTitle}>{showHistory ? 'Hide completed scenes' : 'Show completed scenes'}</Text>
            </Pressable>
            {showHistory
              ? sceneHistory.map((entry) => (
                  <View key={entry.sceneId} style={styles.historyRow}>
                    <Text style={styles.historySceneLabel}>
                      {entry.sceneTitle} · Option {entry.optionId}
                    </Text>
                    <Text style={styles.historyOutcomeText}>{entry.outcomeText}</Text>
                  </View>
                ))
              : null}
          </View>
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
    fontWeight: '500',
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
    fontWeight: '500',
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
  historyCard: {
    marginTop: 2,
    paddingTop: 8,
    gap: 7,
  },
  historyDivider: {
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
  historyToggle: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#b48a54',
    backgroundColor: '#e9d3ae',
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  historyTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#5f4325',
    fontFamily: 'Besley',
  },
  historyRow: {
    gap: 3,
  },
  historySceneLabel: {
    fontSize: 12,
    color: '#4b3420',
    fontWeight: '700',
    fontFamily: 'Besley',
  },
  historyOutcomeText: {
    fontSize: 12,
    lineHeight: 17,
    color: '#5f4325',
    fontFamily: 'Besley',
  },
});
