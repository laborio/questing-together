import { useState } from 'react';
import { useGame } from '@/contexts/GameContext';
import CharacterPicker from '@/features/home/components/CharacterPicker';
import PlayTestMenu from '@/features/home/components/PlayTestMenu';
import RoomBrowser from '@/features/home/components/RoomBrowser';
import TitleScreen from '@/features/home/components/TitleScreen';
import type { ScreenType } from '@/types/adventure';
import type { RoleId } from '@/types/player';

type Step = 'home' | 'browse' | 'pick' | 'playtest';

const GameLauncher = () => {
  const { roomConnection } = useGame();

  const [step, setStep] = useState<Step>('home');
  const [isCreating, setIsCreating] = useState(false);
  const [isPlaytest, setIsPlaytest] = useState(false);
  const [playtestScreenType, setPlaytestScreenType] = useState<ScreenType>('combat');
  const [playtestBloc, setPlaytestBloc] = useState(1);
  const [takenRoles, setTakenRoles] = useState<RoleId[]>([]);
  const [joinCode, setJoinCode] = useState('');

  const handleBack = () => {
    if (step === 'pick' && isPlaytest) {
      setStep('playtest');
    } else {
      setStep('home');
      setIsPlaytest(false);
    }
    setTakenRoles([]);
    setJoinCode('');
    setIsCreating(false);
  };

  const handleCreate = () => {
    setIsCreating(true);
    setTakenRoles([]);
    setStep('pick');
  };

  const handleSelectRoom = async (code: string) => {
    setJoinCode(code);
    const result = await roomConnection.peekRoom(code);
    if (result) {
      setIsCreating(false);
      setTakenRoles(result.takenRoles);
      setStep('pick');
    }
  };

  const handleConfirm = (name: string, roleId: RoleId, enemyCount?: number) => {
    if (isPlaytest) {
      void roomConnection.createPlaytest(
        playtestScreenType,
        playtestBloc,
        name,
        roleId,
        enemyCount,
      );
    } else if (isCreating) {
      void roomConnection.createRoom(name, roleId);
    } else {
      void roomConnection.joinRoom(joinCode, name, roleId);
    }
  };

  const handlePlayTestSelect = (screenType: ScreenType, bloc: number) => {
    setIsPlaytest(true);
    setPlaytestScreenType(screenType);
    setPlaytestBloc(bloc);
    setTakenRoles([]);
    setStep('pick');
  };

  if (step === 'pick') {
    const pickerMode = isPlaytest ? 'playtest' : isCreating ? 'create' : 'join';
    return (
      <CharacterPicker
        mode={pickerMode}
        takenRoles={takenRoles}
        onConfirm={handleConfirm}
        onBack={handleBack}
        playtestScreenType={isPlaytest ? playtestScreenType : undefined}
      />
    );
  }

  if (step === 'browse') {
    return <RoomBrowser onSelectRoom={(code) => void handleSelectRoom(code)} onBack={handleBack} />;
  }

  if (step === 'playtest') {
    return (
      <PlayTestMenu
        isBusy={roomConnection.isBusy}
        onSelect={handlePlayTestSelect}
        onBack={handleBack}
      />
    );
  }

  return (
    <TitleScreen
      onCreate={handleCreate}
      onBrowse={() => setStep('browse')}
      onPlayTest={() => setStep('playtest')}
    />
  );
};

export default GameLauncher;
