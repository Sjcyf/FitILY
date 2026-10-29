import { useCallback, useState } from 'react';
import { enterFullscreen, type Facing } from './camera/camera';
import { loadSoundEnabled, setSoundEnabled, unlockAudio } from './feedback';
import type { WorkoutResult } from './session/workout';
import { ResultScreen } from './ui/ResultScreen';
import { SelectScreen, loadSettings, type WorkoutSettings } from './ui/SelectScreen';
import { SessionScreen } from './ui/SessionScreen';

type Screen =
  | { name: 'select' }
  | { name: 'session'; run: number } // run меняется на «Ещё раз», чтобы сеанс начался заново
  | { name: 'result'; result: WorkoutResult };

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'select' });
  const [settings, setSettings] = useState<WorkoutSettings>(loadSettings);
  const [facing, setFacing] = useState<Facing>('environment');
  const [soundOn, setSoundOn] = useState(() => {
    const enabled = loadSoundEnabled();
    setSoundEnabled(enabled);
    return enabled;
  });
  const toggleSound = () => {
    setSoundEnabled(!soundOn);
    setSoundOn(!soundOn);
  };
  // Звук и речь разрешаются только из обработчика нажатия.
  const startSession = () => {
    unlockAudio();
    setScreen({ name: 'session', run: Date.now() });
  };

  const onFinish = useCallback(
    (result: WorkoutResult) => setScreen({ name: 'result', result }),
    [],
  );
  const toSelect = useCallback(() => setScreen({ name: 'select' }), []);

  if (screen.name === 'select') {
    return (
      <SelectScreen
        initial={settings}
        onStart={(s) => {
          enterFullscreen();
          setSettings(s);
          startSession();
        }}
      />
    );
  }

  if (screen.name === 'result') {
    return (
      <ResultScreen
        result={screen.result}
        onRepeat={startSession}
        onChange={toSelect}
      />
    );
  }

  return (
    <div className="screen">
      <SessionScreen
        key={screen.run}
        settings={settings}
        facing={facing}
        onFinish={onFinish}
        onBack={toSelect}
      />
      <div className="toolbar">
        <button className="tool-button" onClick={toggleSound}>
          {soundOn ? 'Звук: вкл' : 'Звук: выкл'}
        </button>
        <button
          className="tool-button"
          onClick={() => setFacing((f) => (f === 'environment' ? 'user' : 'environment'))}
        >
          {facing === 'environment' ? 'Фронтальная' : 'Тыловая'}
        </button>
      </div>
    </div>
  );
}
