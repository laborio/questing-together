import React, { useState } from 'react';
import { Image, ImageBackground, Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type RoomConnectionCardProps = {
  isBusy: boolean;
  errorText: string | null;
  onCreateRoom: () => void;
  onJoinRoom: (code: string) => void;
};

const homeScreenArt = require('../../assets/images/T_HomeScreen_Art.png');
const homeScreenTitleFrame = require('../../assets/images/T_HomeScreen_TitleFrame.png');
const buttonTexture = require('../../assets/images/T_Button.png');
const buttonTextureDisabled = require('../../assets/images/T_Button_Disabled.png');

export function RoomConnectionCard({
  isBusy,
  errorText,
  onCreateRoom,
  onJoinRoom,
}: RoomConnectionCardProps) {
  const { height, width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [joinCode, setJoinCode] = useState('');
  const [showJoinInput, setShowJoinInput] = useState(false);
  const canJoin = Boolean(joinCode.trim()) && !isBusy;
  const minHeight = Math.max(560, height + insets.top + insets.bottom);
  const titleTopOffset = Math.max(52, Math.round(height * 0.16));
  const actionsBottomOffset = Math.max(90, Math.round(height * 0.16));
  const titleFrameHeight = Math.max(106, Math.round(height * 0.15));
  const titleFrameWidth = width + 32;

  return (
    <ImageBackground
      source={homeScreenArt}
      resizeMode="cover"
      imageStyle={styles.screenArt}
      style={[styles.screen, { minHeight, marginTop: -insets.top, marginBottom: -insets.bottom }]}>
      <View style={styles.overlayTint} />
      <View style={styles.content}>
        <View style={[styles.topBlock, { marginTop: titleTopOffset }]}>
          <View style={[styles.titleFrameWrap, { height: titleFrameHeight, width: titleFrameWidth }]}>
            <Image source={homeScreenTitleFrame} style={styles.titleFrame} resizeMode="stretch" />
            <Text style={styles.title}>À L’AVENTURE, COMPAGNONS</Text>
          </View>
          <Text style={styles.subtitle}>Multiplayer Text RPG Adventure</Text>
        </View>

        <View style={[styles.bottomBlock, { marginBottom: actionsBottomOffset }]}>
          <Pressable disabled={isBusy} onPress={onCreateRoom} style={[styles.textureButtonWrap, isBusy && styles.disabled]}>
            <ImageBackground
              source={isBusy ? buttonTextureDisabled : buttonTexture}
              resizeMode="stretch"
              imageStyle={styles.textureImage}
              style={styles.textureButton}>
              <Text style={styles.textureButtonLabel}>{isBusy ? 'Working...' : 'Create Room'}</Text>
              <Text style={styles.textureButtonHint}>Start a new party</Text>
            </ImageBackground>
          </Pressable>

          <Pressable
            disabled={showJoinInput && !canJoin}
            onPress={() => {
              if (!showJoinInput) {
                setShowJoinInput(true);
                return;
              }
              if (!canJoin) return;
              onJoinRoom(joinCode);
            }}
            style={[styles.textureButtonWrap, showJoinInput && !canJoin && styles.disabled]}>
            <ImageBackground
              source={showJoinInput && !canJoin ? buttonTextureDisabled : buttonTexture}
              resizeMode="stretch"
              imageStyle={styles.textureImage}
              style={styles.textureButton}>
              <Text style={styles.textureButtonLabel}>{showJoinInput ? 'Join With Code' : 'Join Room'}</Text>
              <Text style={styles.textureButtonHint}>
                {showJoinInput ? 'Confirm to enter the selected room' : 'Enter a room code to join your party'}
              </Text>
            </ImageBackground>
          </Pressable>

          {showJoinInput ? (
            <TextInput
              value={joinCode}
              onChangeText={(text) => setJoinCode(text.toUpperCase())}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={8}
              placeholder="ROOM CODE"
              placeholderTextColor="#8f7250"
              style={styles.input}
            />
          ) : null}

          {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}
        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  screen: {
    width: '100%',
    overflow: 'hidden',
    justifyContent: 'center',
  },
  screenArt: {
    opacity: 1,
  },
  overlayTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(24, 16, 12, 0.12)',
  },
  content: {
    flex: 1,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 28,
    alignItems: 'center',
  },
  topBlock: {
    width: '100%',
    alignItems: 'center',
    gap: 8,
  },
  titleFrameWrap: {
    alignSelf: 'center',
    marginTop: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleFrame: {
    ...StyleSheet.absoluteFillObject,
    width: undefined,
    height: undefined,
  },
  title: {
    fontSize: 30,
    color: '#573505',
    textAlign: 'center',
    fontFamily: 'Besley',
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  subtitle: {
    fontSize: 14,
    color: '#f1ddbc',
    textAlign: 'center',
    fontFamily: 'Besley',
    marginBottom: 0,
  },
  bottomBlock: {
    width: '100%',
    alignItems: 'center',
    gap: 10,
    marginTop: 'auto',
  },
  textureButtonWrap: {
    width: '100%',
    maxWidth: 420,
  },
  textureButton: {
    minHeight: 66,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  textureImage: {
    borderRadius: 10,
  },
  textureButtonLabel: {
    color: '#f8f1e2',
    fontSize: 16,
    fontFamily: 'Besley',
    fontWeight: '600',
    textAlign: 'center',
  },
  textureButtonHint: {
    color: '#edd9b4',
    fontSize: 9,
    fontFamily: 'Besley',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  input: {
    borderWidth: 1,
    borderColor: '#dec39e',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#f8f1e2',
    backgroundColor: 'rgba(35, 24, 16, 0.62)',
    fontSize: 17,
    fontFamily: 'Besley',
    textAlign: 'center',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    width: '100%',
    maxWidth: 320,
    marginTop: -2,
  },
  errorText: {
    fontSize: 12,
    color: '#ffcac0',
    fontFamily: 'Besley',
    textAlign: 'center',
    marginTop: 4,
  },
  disabled: {
    opacity: 0.6,
  },
});
