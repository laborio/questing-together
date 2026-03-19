import { Animated, Image, ScrollView } from 'react-native';
import dividerLarge from '@/assets/images/T_Divider_L.png';
import dividerSmall from '@/assets/images/T_Divider_S.png';
import { Stack, StoryText, Typography } from '@/components';
import { colors } from '@/constants/colors';
import { useGame } from '@/contexts/GameContext';
import CombatStatusCard from '@/features/combat/components/CombatStatusCard';
import DecisionPanelCard from '@/features/story/DecisionPanelCard';
import { quoted, useSceneFeedAnimation } from '@/hooks/useSceneFeedAnimation';

const SceneFeedCard = () => {
  const game = useGame();
  const roomStory = game.roomStory;

  const { isReady, animationPlan, footerOpacity, scrollRef, getStartDelay, scrollHandlers } =
    useSceneFeedAnimation({
      sceneId: roomStory.currentScene.id,
      sceneTitle: roomStory.currentScene.journalTitle ?? roomStory.currentScene.title,
      persistenceScopeKey: game.roomId,
      storyInstanceKey: roomStory.storyInstanceKey,
      journalEntries: roomStory.journalEntries,
    });

  return (
    <Stack gap={10} flex={1} style={{ backgroundColor: 'transparent' }}>
      <Stack gap={12} flex={1} style={{ backgroundColor: 'transparent', padding: 14 }}>
        <Typography
          variant="caption"
          style={{
            fontWeight: '400',
            color: colors.combatTitleEmbedded,
            letterSpacing: 0.6,
            fontStyle: 'italic',
            textAlign: 'center',
            marginTop: 32,
          }}
        >
          {`*${roomStory.currentScene.journalTitle ?? roomStory.currentScene.title ?? 'Scene'}*`}
        </Typography>
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ gap: 12, paddingTop: 4, paddingBottom: 4 }}
          nestedScrollEnabled
          onLayout={scrollHandlers.onLayout}
          onScrollBeginDrag={scrollHandlers.onScrollBeginDrag}
          onScroll={scrollHandlers.onScroll}
          onContentSizeChange={scrollHandlers.onContentSizeChange}
          scrollEventThrottle={16}
        >
          {isReady
            ? roomStory.journalEntries.map((item) => {
                const shouldAnimate = animationPlan.animatedEntryIds.has(item.id);

                if (item.kind === 'transition') {
                  return (
                    <Stack key={item.id} gap={6} align="center" style={{ paddingVertical: 6 }}>
                      <StoryText
                        text={item.text}
                        style={{
                          fontSize: 12,
                          paddingTop: 4,
                          paddingBottom: 4,
                          fontStyle: 'italic',
                          color: colors.textTransition,
                          textAlign: 'center',
                          fontFamily: 'Besley',
                        }}
                        animate={shouldAnimate}
                        startDelay={getStartDelay(`${item.id}-transition`)}
                      />
                    </Stack>
                  );
                }

                if (item.kind === 'narration') {
                  return (
                    <Stack
                      key={item.id}
                      style={{
                        borderLeftWidth: 0,
                        borderLeftColor: colors.combatTitleEmbedded,
                        paddingLeft: 28,
                        paddingRight: 28,
                        paddingVertical: 24,
                      }}
                    >
                      <StoryText
                        text={item.text}
                        style={{
                          fontSize: 17,
                          lineHeight: 32,
                          color: colors.combatTitleEmbedded,
                          fontFamily: 'Besley',
                          fontWeight: '500',
                        }}
                        animate={shouldAnimate}
                        startDelay={getStartDelay(`${item.id}-narration`)}
                      />
                    </Stack>
                  );
                }

                if (item.kind === 'combat_summary') {
                  return (
                    <Stack key={item.id} style={{ marginLeft: 28, marginTop: 6, marginBottom: 6 }}>
                      <CombatStatusCard
                        combatState={item.combatState}
                        combatLog={item.combatLog}
                        resolvedOption={null}
                        showResolutionStatus={false}
                        embedded
                      />
                    </Stack>
                  );
                }

                if (item.kind === 'npc') {
                  return (
                    <Stack key={item.id} gap={12} style={{ marginLeft: 28 }}>
                      <StoryText
                        text={item.speaker}
                        style={{
                          fontSize: 14,
                          fontWeight: '600',
                          color: colors.combatTitleEmbedded,
                          textTransform: 'uppercase',
                          letterSpacing: 0.6,
                          fontFamily: 'Besley',
                          marginTop: 12,
                        }}
                        animate={shouldAnimate}
                        startDelay={getStartDelay(`${item.id}-speaker`)}
                      />
                      {item.aside ? (
                        <StoryText
                          text={item.aside}
                          style={{
                            fontSize: 16,
                            fontWeight: '400',
                            lineHeight: 20,
                            color: colors.textDialogue,
                            fontStyle: 'italic',
                            fontFamily: 'Besley',
                            marginTop: 4,
                            marginBottom: 12,
                          }}
                          animate={shouldAnimate}
                          startDelay={getStartDelay(`${item.id}-aside`)}
                        />
                      ) : null}
                      <StoryText
                        text={quoted(item.text)}
                        style={{
                          fontSize: 16,
                          lineHeight: 20,
                          color: colors.textDialogue,
                          fontFamily: 'Besley',
                          fontWeight: '400',
                          fontStyle: 'italic',
                          marginTop: 4,
                          marginBottom: 12,
                        }}
                        animate={shouldAnimate}
                        startDelay={getStartDelay(`${item.id}-line`)}
                      />
                      {item.narration ? (
                        <StoryText
                          text={item.narration}
                          style={{
                            marginTop: 6,
                            fontSize: 17,
                            lineHeight: 26,
                            color: colors.textDialogue,
                            fontFamily: 'Besley',
                            fontWeight: '500',
                          }}
                          animate={shouldAnimate}
                          startDelay={getStartDelay(`${item.id}-narration`)}
                        />
                      ) : null}
                    </Stack>
                  );
                }

                return (
                  <Stack key={item.id} gap={12} style={{ marginLeft: 28 }}>
                    <Image
                      source={dividerSmall}
                      style={{
                        width: '50%',
                        alignSelf: 'center',
                        aspectRatio: 400 / 22,
                        opacity: 0.75,
                        marginVertical: 2,
                      }}
                      resizeMode="contain"
                    />
                    <Typography
                      variant="body"
                      style={{
                        fontWeight: '600',
                        color: colors.combatTitleEmbedded,
                        textTransform: 'uppercase',
                        letterSpacing: 0.6,
                        marginTop: 12,
                      }}
                    >
                      {item.speaker}
                    </Typography>
                    {item.stage ? (
                      <StoryText
                        text={item.stage}
                        style={{
                          fontSize: 16,
                          fontWeight: '400',
                          lineHeight: 20,
                          color: colors.textDialogue,
                          fontStyle: 'italic',
                          fontFamily: 'Besley',
                          marginTop: 4,
                          marginBottom: 12,
                        }}
                        animate={shouldAnimate}
                        startDelay={getStartDelay(`${item.id}-stage`)}
                      />
                    ) : null}
                    {item.lines.map((line, lineIndex) => (
                      <StoryText
                        key={`${item.id}-line-${lineIndex}`}
                        text={quoted(line)}
                        style={{
                          fontSize: 16,
                          lineHeight: 20,
                          color: colors.textDialogue,
                          fontFamily: 'Besley',
                          fontWeight: '400',
                          fontStyle: 'italic',
                          marginTop: 4,
                          marginBottom: 12,
                        }}
                        animate={shouldAnimate}
                        startDelay={getStartDelay(`${item.id}-line-${lineIndex}`)}
                      />
                    ))}
                    {item.narration ? (
                      <StoryText
                        text={item.narration}
                        style={{
                          marginTop: 6,
                          fontSize: 17,
                          lineHeight: 26,
                          color: colors.textDialogue,
                          fontFamily: 'Besley',
                          fontWeight: '500',
                        }}
                        animate={shouldAnimate}
                        startDelay={getStartDelay(`${item.id}-narration`)}
                      />
                    ) : null}
                  </Stack>
                );
              })
            : null}
        </ScrollView>
        {isReady ? (
          <Animated.View style={{ marginTop: 6, gap: 10, opacity: footerOpacity }}>
            <Image
              source={dividerLarge}
              style={{ width: '100%', aspectRatio: 400 / 22, alignSelf: 'center' }}
              resizeMode="contain"
            />
            <DecisionPanelCard />
          </Animated.View>
        ) : null}
      </Stack>
    </Stack>
  );
};

export default SceneFeedCard;
