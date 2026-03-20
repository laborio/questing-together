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
  const [takenRoles, setTakenRoles] = useState<RoleId[]>([]);
  const [joinCode, setJoinCode] = useState('');

  const handleBack = () => {
    setStep('home');
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

  const handleConfirm = (name: string, roleId: RoleId) => {
    if (isCreating) {
      void roomConnection.createRoom(name, roleId);
    } else {
      void roomConnection.joinRoom(joinCode, name, roleId);
    }
  };

  const handlePlayTest = (screenType: ScreenType, bloc: number) => {
    void roomConnection.createPlaytest(screenType, bloc);
  };

  if (step === 'pick') {
    return (
      <CharacterPicker
        mode={isCreating ? 'create' : 'join'}
        takenRoles={takenRoles}
        onConfirm={handleConfirm}
        onBack={handleBack}
      />
    );
  }

  if (step === 'browse') {
    return <RoomBrowser onSelectRoom={(code) => void handleSelectRoom(code)} onBack={handleBack} />;
  }

  if (step === 'playtest') {
    return (
      <PlayTestMenu isBusy={roomConnection.isBusy} onSelect={handlePlayTest} onBack={handleBack} />
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
