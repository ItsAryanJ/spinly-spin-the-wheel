import { useState, useCallback, useEffect } from 'react';
import Header from './components/Header';
import Wheel from './components/Wheel';
import ChoicesPanel, { DEFAULT_CHOICES } from './components/ChoicesPanel';
import WinnerModal from './components/WinnerModal';
import { useLocalStorage } from './useLocalStorage';

export default function App() {
  /* ---- Theme ---- */
  const [theme, setTheme] = useLocalStorage<'light' | 'dark'>(
    'spinly_theme',
    typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light',
  );

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev: 'light' | 'dark') => (prev === 'light' ? 'dark' : 'light'));
  }, [setTheme]);

  /* ---- Choices ---- */
  const [choices, setChoices] = useLocalStorage<string[]>(
    'spinly_choices',
    DEFAULT_CHOICES,
  );

  // Validate saved choices
  useEffect(() => {
    if (!Array.isArray(choices) || choices.length === 0) {
      setChoices(DEFAULT_CHOICES);
    }
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  /* ---- Choices panel ---- */
  const [isChoicesOpen, setIsChoicesOpen] = useLocalStorage<boolean>(
    'spinly_panel_open',
    true,
  );

  const toggleChoices = useCallback(() => {
    setIsChoicesOpen((prev: boolean) => !prev);
  }, [setIsChoicesOpen]);

  /* ---- Spin state ---- */
  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [showWinner, setShowWinner] = useState(false);

  const validChoices = choices.filter((c) => c.trim().length > 0);

  const handleSpinStart = useCallback((winnerIndex: number) => {
    setIsSpinning(true);
    setSelectedIndex(winnerIndex);
    setShowWinner(false);
  }, []);

  const handleSpinEnd = useCallback(() => {
    // Short pause before showing winner
    setTimeout(() => {
      setIsSpinning(false);
      setShowWinner(true);
    }, 150);
  }, []);

  const handleCloseWinner = useCallback(() => {
    setShowWinner(false);
    setSelectedIndex(null);
  }, []);

  const handleSpinAgain = useCallback(() => {
    setShowWinner(false);
    setSelectedIndex(null);
    // Small delay then trigger a new spin
    setTimeout(() => {
      const btn = document.querySelector('.spin-button') as HTMLButtonElement;
      btn?.click();
    }, 200);
  }, []);

  /* ---- URL sharing (optional) ---- */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlChoices = params.get('choices');
    if (urlChoices) {
      const parsed = urlChoices
        .split(',')
        .map((c) => decodeURIComponent(c.trim()))
        .filter((c) => c.length > 0)
        .slice(0, 10);
      if (parsed.length >= 2) {
        setChoices(parsed);
      }
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  const wheelSize = isChoicesOpen ? 'medium' : 'large';
  const winnerName =
    selectedIndex !== null && validChoices[selectedIndex]
      ? validChoices[selectedIndex]
      : '';

  return (
    <div className="app">
      <Header theme={theme} onToggleTheme={toggleTheme} />

      <section className="hero">
        {/* <h1>Let the wheel decide.</h1>
        <p>Add your choices, give it a spin, and let fate pick one.</p> */}
      </section>

      <main className="main-content">
        <div className={`main-layout${isChoicesOpen ? '' : ' panel-closed'}`}>
          <div className="wheel-container">
            <Wheel
              choices={choices}
              isSpinning={isSpinning}
              onSpinStart={handleSpinStart}
              onSpinEnd={handleSpinEnd}
              disabled={false}
              size={wheelSize}
            />
          </div>

          <div className="choices-container">
            <ChoicesPanel
              choices={choices}
              setChoices={setChoices}
              isOpen={isChoicesOpen}
              onToggle={toggleChoices}
              isSpinning={isSpinning}
            />
          </div>
        </div>
      </main>

      {showWinner && winnerName && (
        <WinnerModal
          winner={winnerName}
          onClose={handleCloseWinner}
          onSpinAgain={handleSpinAgain}
        />
      )}
    </div>
  );
}
