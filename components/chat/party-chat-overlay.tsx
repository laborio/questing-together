import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { PartyChatPanel } from '@/components/chat/party-chat-panel';
import { PartyChatMessage, PlayerId } from '@/src/game/types';

type PartyChatOverlayProps = {
  isOpen: boolean;
  unreadCount: number;
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
  onOpen: () => void;
  onClose: () => void;
  onInputChange: (text: string) => void;
  onSend: () => void;
};

export function PartyChatOverlay({
  isOpen,
  unreadCount,
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
  onOpen,
  onClose,
  onInputChange,
  onSend,
}: PartyChatOverlayProps) {
  return (
    <>
      <Pressable onPress={onOpen} style={styles.chatLauncher}>
        <Text style={styles.chatLauncherLabel}>CHAT</Text>
        {unreadCount > 0 ? (
          <View style={styles.chatUnreadBadge}>
            <Text style={styles.chatUnreadText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
          </View>
        ) : null}
      </Pressable>

      <Modal visible={isOpen} transparent animationType="slide" onRequestClose={onClose}>
        <View style={styles.chatOverlay}>
          <View style={styles.chatSheet}>
            <PartyChatPanel
              isOpen={isOpen}
              localPlayerId={localPlayerId}
              messages={messages}
              chatError={chatError}
              chatInput={chatInput}
              inputLength={inputLength}
              canSend={canSend}
              maxMessagesPerScene={maxMessagesPerScene}
              messagesUsedThisScene={messagesUsedThisScene}
              messagesRemainingThisScene={messagesRemainingThisScene}
              maxCharactersPerMessage={maxCharactersPerMessage}
              playerLabelById={playerLabelById}
              onInputChange={onInputChange}
              onSend={onSend}
              onClose={onClose}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  chatLauncher: {
    position: 'absolute',
    right: 16,
    bottom: 22,
    width: 64,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0284c7',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  chatLauncherLabel: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Besley',
  },
  chatUnreadBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  chatUnreadText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'Besley',
  },
  chatOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.7)',
    justifyContent: 'flex-end',
  },
  chatSheet: {
    height: '72%',
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
});
