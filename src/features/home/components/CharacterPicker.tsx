import { useMemo, useState } from 'react';
import { Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import paperTexture from '@/assets/images/T_Background_Paper.png';
import {
  Alert,
  BottomSheet,
  Button,
  Portrait,
  Stack,
  Stepper,
  TextField,
  TiledBackground,
  Typography,
} from '@/components';
import { colors } from '@/constants/colors';
import { roles } from '@/constants/constants';
import { useGame } from '@/contexts/GameContext';
import { useTranslation } from '@/contexts/I18nContext';
import type { ScreenType } from '@/types/adventure';
import type { RoleId } from '@/types/player';
import { portraitByRole } from '@/utils/portraitByRole';

type CharacterPickerProps = {
  mode: 'create' | 'join' | 'playtest';
  takenRoles: RoleId[];
  onConfirm: (name: string, roleId: RoleId, enemyCount?: number, botCount?: number) => void;
  onBack: () => void;
  playtestScreenType?: ScreenType;
};

const CharacterPicker = ({
  mode,
  takenRoles,
  onConfirm,
  onBack,
  playtestScreenType,
}: CharacterPickerProps) => {
  const insets = useSafeAreaInsets();
  const { roomConnection } = useGame();
  const { isBusy, roomError } = roomConnection;
  const { t } = useTranslation();

  const randomName = useMemo(() => {
    const prefixes = [
      'Ash',
      'Blaze',
      'Dusk',
      'Ember',
      'Frost',
      'Grim',
      'Iron',
      'Luna',
      'Nyx',
      'Onyx',
      'Raven',
      'Shadow',
      'Storm',
      'Thorn',
      'Vale',
      'Wren',
      'Zephyr',
      'Cinder',
      'Drake',
      'Flint',
      'Hawk',
      'Jade',
      'Kai',
      'Lyra',
      'Moss',
      'Oak',
      'Pike',
      'Quinn',
      'Reed',
      'Sage',
      'Talon',
      'Vex',
    ];
    const suffixes = [
      'blade',
      'born',
      'claw',
      'fall',
      'fire',
      'forge',
      'heart',
      'moon',
      'root',
      'shade',
      'song',
      'spark',
      'stone',
      'strike',
      'sworn',
      'ward',
      'wind',
      'wood',
      'bane',
      'fang',
      'helm',
      'lock',
      'mark',
      'ridge',
    ];
    const p = prefixes[Math.floor(Math.random() * prefixes.length)];
    const s = suffixes[Math.floor(Math.random() * suffixes.length)];
    return `${p}${s}`;
  }, []);

  const [nameInput, setNameInput] = useState(randomName);
  const [selectedRole, setSelectedRole] = useState<RoleId | null>(null);
  const [enemyCount, setEnemyCount] = useState(3);
  const [botCount, setBotCount] = useState(0);

  const trimmedName = nameInput.replace(/\s+/g, '-').trim();
  const canConfirm = trimmedName.length > 0 && trimmedName.length <= 20 && selectedRole !== null;
  const focusedRole = selectedRole ? roles.find((r) => r.id === selectedRole) : null;
  const showEnemyStepper =
    mode === 'playtest' && (playtestScreenType === 'combat' || playtestScreenType === 'boss_fight');

  const getTitle = () => {
    if (mode === 'playtest') return t('playTest.title');
    if (mode === 'create') return t('characterPicker.createAdventure');
    return t('characterPicker.joinAdventure');
  };

  const getConfirmLabel = () => {
    if (isBusy)
      return mode === 'create' ? t('characterPicker.creating') : t('characterPicker.joining');
    if (mode === 'playtest') return t('playTest.title');
    return mode === 'create' ? t('home.createRoom') : t('home.joinRoom');
  };

  const handleConfirm = () => {
    if (canConfirm) {
      onConfirm(
        trimmedName,
        selectedRole,
        showEnemyStepper ? enemyCount : undefined,
        mode === 'playtest' && showEnemyStepper ? botCount : undefined,
      );
    }
  };

  return (
    <Stack flex={1} style={{ backgroundColor: colors.backgroundPaper }}>
      <TiledBackground source={paperTexture} />
      <ScrollView
        contentContainerStyle={{
          padding: 12,
          gap: 14,
          paddingTop: 12 + insets.top,
          paddingBottom: 120 + insets.bottom,
          flexGrow: 1,
        }}
      >
        <Stack
          gap={12}
          style={{
            paddingVertical: 14,
            backgroundColor: colors.backgroundCardTransparent,
          }}
        >
          <Typography variant="heading" style={{ color: colors.textOverlayHeading }}>
            {getTitle()}
          </Typography>

          <Typography variant="caption" bold style={{ color: colors.textAvatarNameParchment }}>
            {t('characterPicker.yourName')}
          </Typography>
          <TextField
            value={nameInput}
            onChangeText={(text) => setNameInput(text.replace(/\s+/g, '-'))}
            autoCorrect={false}
            autoCapitalize="words"
            maxLength={20}
            editable={!isBusy}
            placeholder={t('characterPicker.namePlaceholder')}
          />

          <Typography variant="caption" bold style={{ color: colors.textAvatarNameParchment }}>
            {t('characterPicker.pickClass')}
          </Typography>
          <Stack direction="row" justify="space-evenly">
            {roles.map((role) => {
              const isTaken = takenRoles.includes(role.id);
              const isSelected = selectedRole === role.id;
              const roleKey = role.id as 'warrior' | 'sage' | 'ranger';

              return (
                <Pressable
                  key={role.id}
                  disabled={isTaken || isBusy}
                  onPress={() => setSelectedRole(role.id)}
                  style={{ alignItems: 'center', opacity: isTaken ? 0.35 : 1 }}
                >
                  <Portrait
                    source={portraitByRole(role.id)}
                    size={80}
                    highlighted={isSelected || isTaken}
                    highlightColor={
                      isSelected
                        ? colors.success
                        : isTaken
                          ? colors.errorDark
                          : colors.textInputDark
                    }
                    name={t(`roles.${roleKey}`)}
                    nameColor={
                      isSelected
                        ? colors.success
                        : isTaken
                          ? colors.errorDark
                          : colors.textInputDark
                    }
                    nameFontSize={12}
                  />
                  {isTaken ? (
                    <Typography
                      variant="fine"
                      bold
                      style={{ color: colors.errorDark, marginTop: 2 }}
                    >
                      {t('characterPicker.taken')}
                    </Typography>
                  ) : null}
                </Pressable>
              );
            })}
          </Stack>

          {focusedRole ? (
            <Alert
              variant="warning"
              title={t(`roles.${focusedRole.id as 'warrior' | 'sage' | 'ranger'}`)}
            >
              {t(`roles.${focusedRole.id as 'warrior' | 'sage' | 'ranger'}Summary`)}
            </Alert>
          ) : null}

          {showEnemyStepper ? (
            <>
              <Stack gap={4} align="center" style={{ paddingTop: 8 }}>
                <Typography
                  variant="caption"
                  bold
                  style={{ color: colors.textAvatarNameParchment }}
                >
                  Enemies
                </Typography>
                <Stepper value={enemyCount} min={1} max={8} onValueChange={setEnemyCount} />
              </Stack>
              <Stack gap={4} align="center" style={{ paddingTop: 8 }}>
                <Typography
                  variant="caption"
                  bold
                  style={{ color: colors.textAvatarNameParchment }}
                >
                  Bot Allies
                </Typography>
                <Stepper value={botCount} min={0} max={2} onValueChange={setBotCount} />
              </Stack>
            </>
          ) : null}
        </Stack>
      </ScrollView>

      <BottomSheet size="xs">
        <Stack direction="row" gap={10}>
          <Stack flex={1}>
            <Button
              size="sm"
              variant="ghost"
              disabled={isBusy}
              onPress={onBack}
              label={t('common.back')}
            />
          </Stack>
          <Stack flex={1}>
            <Button
              size="sm"
              disabled={!canConfirm || isBusy}
              onPress={handleConfirm}
              label={getConfirmLabel()}
            />
          </Stack>
        </Stack>
        {roomError ? <Typography variant="error">{roomError}</Typography> : null}
      </BottomSheet>
    </Stack>
  );
};

export default CharacterPicker;
