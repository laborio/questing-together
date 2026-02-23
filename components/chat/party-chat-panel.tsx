import React, { useEffect, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { PartyChatMessage, PlayerId } from '@/src/game/types';

type PartyChatPanelProps = {
  isOpen: boolean;
  localPlayerId: PlayerId;
  messages: PartyChatMessage[];
  chatError: string | null;
  chatInput: string;
  inputLength: number;
  canSend: boolean;
  maxMessagesPerScene: number;
  messagesUsedThisScene: number;
  messagesRemainingThisScene: number;
  maxCharactersPerMessage: number;
  playerLabelById: Partial<Record<PlayerId, string>>;
  onInputChange: (text: string) => void;
  onSend: () => void;
  onClose: () => void;
};

export function PartyChatPanel({
  isOpen,
  localPlayerId,
  messages,
  chatError,
  chatInput,
  inputLength,
  canSend,
  maxMessagesPerScene,
  messagesUsedThisScene,
  messagesRemainingThisScene,
  maxCharactersPerMessage,
  playerLabelById,
  onInputChange,
  onSend,
  onClose,
}: PartyChatPanelProps) {
  const chatScrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!isOpen) return;
    const id = setTimeout(() => {
      chatScrollRef.current?.scrollToEnd({ animated: true });
    }, 0);
    return () => clearTimeout(id);
  }, [isOpen, messages]);

  return (
    <>
      <View style={styles.chatPanelHeader}>
        <Text style={styles.chatPanelTitle}>Party Chat</Text>
        <Pressable onPress={onClose} style={styles.chatPanelCloseButton}>
          <Text style={styles.chatPanelCloseText}>X</Text>
        </Pressable>
      </View>

      <Text style={styles.chatRuleText}>
        Mind-bond limit: {maxMessagesPerScene} messages per scene, {maxCharactersPerMessage} chars each.
      </Text>
      <Text style={styles.chatBudgetText}>
        Messages: {messagesUsedThisScene}/{maxMessagesPerScene} used ({messagesRemainingThisScene} left)
      </Text>
      {chatError ? <Text style={styles.chatErrorText}>{chatError}</Text> : null}

      <ScrollView
        ref={chatScrollRef}
        style={styles.chatPanelMessages}
        contentContainerStyle={styles.chatPanelMessagesContent}>
        {messages.map((chat) =>
          chat.kind === 'separator' ? (
            <View key={chat.id} style={styles.chatSeparatorWrap}>
              <Text style={styles.chatSeparatorText}>{chat.text}</Text>
            </View>
          ) : (
            <View
              key={chat.id}
              style={[styles.messageRow, chat.playerId === localPlayerId ? styles.messageRowLocal : styles.messageRowRemote]}>
              <View style={[styles.chatBubble, chat.playerId === localPlayerId ? styles.chatBubbleLocal : styles.chatBubbleRemote]}>
                <Text style={styles.chatAuthor}>
                  {chat.playerId === localPlayerId
                    ? 'You'
                    : playerLabelById[chat.playerId as PlayerId] ?? chat.playerId}
                </Text>
                <Text style={styles.chatText}>{chat.text}</Text>
              </View>
            </View>
          )
        )}
      </ScrollView>

      <View style={styles.chatInputRow}>
        <TextInput
          value={chatInput}
          onChangeText={onInputChange}
          placeholder={`Max ${maxCharactersPerMessage} chars`}
          placeholderTextColor="#64748b"
          style={styles.chatInput}
        />
        <Pressable disabled={!canSend} onPress={onSend} style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}>
          <Text style={styles.sendButtonText}>Send</Text>
        </Pressable>
      </View>
      <Text style={styles.chatCounterText}>
        Chars: {inputLength}/{maxCharactersPerMessage}
      </Text>
    </>
  );
}

const styles = StyleSheet.create({
  chatPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  chatPanelTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#e2e8f0',
  },
  chatPanelCloseButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111827',
  },
  chatPanelCloseText: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '700',
  },
  chatRuleText: {
    fontSize: 12,
    color: '#93c5fd',
  },
  chatBudgetText: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
    marginBottom: 8,
  },
  chatErrorText: {
    fontSize: 12,
    color: '#fca5a5',
    marginBottom: 8,
  },
  chatPanelMessages: {
    flex: 1,
  },
  chatPanelMessagesContent: {
    gap: 8,
    paddingBottom: 8,
  },
  chatSeparatorWrap: {
    alignItems: 'center',
    marginVertical: 2,
  },
  chatSeparatorText: {
    fontSize: 12,
    color: '#94a3b8',
    backgroundColor: '#111827',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  messageRow: {
    flexDirection: 'row',
  },
  messageRowLocal: {
    justifyContent: 'flex-end',
  },
  messageRowRemote: {
    justifyContent: 'flex-start',
  },
  chatBubble: {
    maxWidth: '86%',
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    gap: 4,
  },
  chatBubbleLocal: {
    borderColor: '#38bdf8',
    backgroundColor: '#083344',
  },
  chatBubbleRemote: {
    borderColor: '#334155',
    backgroundColor: '#111827',
  },
  chatAuthor: {
    fontSize: 12,
    fontWeight: '700',
    color: '#93c5fd',
  },
  chatText: {
    fontSize: 14,
    color: '#e2e8f0',
    lineHeight: 18,
  },
  chatInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  chatInput: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#111827',
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: '#e2e8f0',
  },
  sendButton: {
    borderRadius: 10,
    backgroundColor: '#0284c7',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  chatCounterText: {
    marginTop: 6,
    fontSize: 11,
    color: '#94a3b8',
    textAlign: 'right',
  },
});
