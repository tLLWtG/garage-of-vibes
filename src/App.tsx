import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGame } from './game/store';
import { milestoneById } from './game/milestones';
import { HUD } from './components/HUD';
import { FarmView } from './components/FarmView';
import { DungeonView } from './components/DungeonView';
import { ResultView } from './components/ResultView';

function MilestoneToast() {
  const toast = useGame((s) => s.milestoneToasts[0] ?? null);
  const dismiss = useGame((s) => s.dismissToast);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(dismiss, 3000);
    return () => clearTimeout(t);
  }, [toast, dismiss]);
  const def = toast ? milestoneById(toast) : null;
  return (
    <AnimatePresence mode="wait">
      {def && (
        <motion.div
          key={def.id}
          className="milestone-toast"
          initial={{ y: -64, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -64, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 380, damping: 28 }}
          onClick={dismiss}
        >
          <span className="toast-title">里程碑达成 · {def.name}</span>
          <span className="toast-desc">
            {def.desc} ｜ 奖励 {def.reward} 精华
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function App() {
  const phase = useGame((s) => s.phase);

  useEffect(() => {
    document.body.dataset.phase = phase;
  }, [phase]);

  return (
    <div className="app">
      <HUD />
      <main className="main">
        <AnimatePresence mode="wait">
          {phase === 'farm' && <FarmView key="farm" />}
          {phase === 'dungeon' && <DungeonView key="dungeon" />}
          {phase === 'result' && <ResultView key="result" />}
        </AnimatePresence>
      </main>
      <MilestoneToast />
    </div>
  );
}
