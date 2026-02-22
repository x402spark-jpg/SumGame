/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  RotateCcw, 
  Timer, 
  Play, 
  Pause, 
  Settings2,
  ChevronLeft,
  AlertCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { cn } from '@/src/lib/utils';
import { 
  GameMode, 
  Block, 
  GRID_ROWS, 
  GRID_COLS, 
  INITIAL_ROWS, 
  TIME_LIMIT 
} from './types';

const generateId = () => Math.random().toString(36).substring(2, 9);

const getRandomValue = () => Math.floor(Math.random() * 9) + 1;

export default function App() {
  const [mode, setMode] = useState<GameMode | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [target, setTarget] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const [highScore, setHighScore] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Load high score
  useEffect(() => {
    const saved = localStorage.getItem('sumstack_highscore');
    if (saved) setHighScore(parseInt(saved));
  }, []);

  // Update high score
  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem('sumstack_highscore', score.toString());
    }
  }, [score, highScore]);

  const generateTarget = useCallback((currentBlocks: Block[]) => {
    if (currentBlocks.length === 0) return 10;
    
    // Pick a random number of blocks to sum (2-4)
    const numToSum = Math.min(currentBlocks.length, Math.floor(Math.random() * 3) + 2);
    const shuffled = [...currentBlocks].sort(() => 0.5 - Math.random());
    const sum = shuffled.slice(0, numToSum).reduce((acc, b) => acc + b.value, 0);
    
    // Ensure target is reasonable (not too high, not too low)
    return Math.max(5, Math.min(sum, 45));
  }, []);

  const addNewRow = useCallback(() => {
    setBlocks(prev => {
      // Check if any block is at the top row (row 0)
      const willOverflow = prev.some(b => b.row === 0);
      if (willOverflow) {
        setGameOver(true);
        return prev;
      }

      // Shift existing blocks up
      const shifted = prev.map(b => ({ ...b, row: b.row - 1 }));
      
      // Add new row at the bottom (row GRID_ROWS - 1)
      const newRow: Block[] = Array.from({ length: GRID_COLS }).map((_, col) => ({
        id: generateId(),
        value: getRandomValue(),
        row: GRID_ROWS - 1,
        col
      }));

      return [...shifted, ...newRow];
    });
    
    if (mode === 'time') {
      setTimeLeft(TIME_LIMIT);
    }
  }, [mode]);

  const initGame = (selectedMode: GameMode) => {
    setMode(selectedMode);
    setGameOver(false);
    setScore(0);
    setSelectedIds([]);
    setIsPaused(false);
    
    const initialBlocks: Block[] = [];
    for (let r = GRID_ROWS - INITIAL_ROWS; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        initialBlocks.push({
          id: generateId(),
          value: getRandomValue(),
          row: r,
          col: c
        });
      }
    }
    setBlocks(initialBlocks);
    setTarget(generateTarget(initialBlocks));
    if (selectedMode === 'time') setTimeLeft(TIME_LIMIT);
  };

  // Timer logic for Time Mode
  useEffect(() => {
    if (mode === 'time' && !gameOver && !isPaused) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            addNewRow();
            return TIME_LIMIT;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [mode, gameOver, isPaused, addNewRow]);

  const handleBlockClick = (id: string) => {
    if (gameOver || isPaused) return;

    const isSelected = selectedIds.includes(id);
    const newSelection = isSelected 
      ? selectedIds.filter(i => i !== id) 
      : [...selectedIds, id];
    
    const currentSum = blocks
      .filter(b => newSelection.includes(b.id))
      .reduce((acc, b) => acc + b.value, 0);

    if (currentSum === target) {
      // SUCCESS
      setScore(s => s + currentSum * 10);
      confetti({
        particleCount: 40,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#10b981', '#34d399', '#6ee7b7']
      });

      // Calculate remaining blocks and gravity
      const remaining = blocks.filter(b => !newSelection.includes(b.id));
      const updatedBlocks: Block[] = [];
      
      for (let c = 0; c < GRID_COLS; c++) {
        const columnBlocks = remaining
          .filter(b => b.col === c)
          .sort((a, b) => b.row - a.row); // Bottom to top
        
        columnBlocks.forEach((b, idx) => {
          updatedBlocks.push({
            ...b,
            row: GRID_ROWS - 1 - idx
          });
        });
      }

      setBlocks(updatedBlocks);
      setSelectedIds([]);
      
      // Generate new target
      const nextTarget = generateTarget(updatedBlocks);
      setTarget(nextTarget);

      // In classic mode, add exactly one new row after success
      if (mode === 'classic') {
        setTimeout(() => {
          addNewRow();
        }, 200);
      }
    } else if (currentSum > target) {
      // FAILED - too high, reset selection
      setSelectedIds([]);
    } else {
      setSelectedIds(newSelection);
    }
  };

  if (!mode) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-zinc-950">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full text-center space-y-12"
        >
          <div className="space-y-4">
            <h1 className="text-6xl font-bold tracking-tighter text-white">
              数字<span className="text-emerald-500">求和</span>
            </h1>
            <p className="text-zinc-400 font-medium">
              极简主义数学逻辑挑战
            </p>
          </div>

          <div className="grid gap-4">
            <button
              onClick={() => initGame('classic')}
              className="group relative flex flex-col items-start p-6 bg-zinc-900 border border-zinc-800 rounded-2xl hover:border-emerald-500/50 transition-all text-left"
            >
              <div className="flex items-center justify-between w-full mb-2">
                <span className="text-xl font-bold text-white">经典模式</span>
                <Play className="w-5 h-5 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-sm text-zinc-500">每次成功消除后新增一行。挑战生存极限。</p>
            </button>

            <button
              onClick={() => initGame('time')}
              className="group relative flex flex-col items-start p-6 bg-zinc-900 border border-zinc-800 rounded-2xl hover:border-amber-500/50 transition-all text-left"
            >
              <div className="flex items-center justify-between w-full mb-2">
                <span className="text-xl font-bold text-white">计时模式</span>
                <Timer className="w-5 h-5 text-amber-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-sm text-zinc-500">与时间赛跑。每10秒强制新增一行。</p>
            </button>
          </div>

          {highScore > 0 && (
            <div className="flex items-center justify-center gap-2 text-zinc-500">
              <Trophy className="w-4 h-4" />
              <span className="text-sm font-mono tracking-wider uppercase">最高分: {highScore}</span>
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  const currentSum = blocks
    .filter(b => selectedIds.includes(b.id))
    .reduce((acc, b) => acc + b.value, 0);

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center p-4 md:p-8">
      {/* Header */}
      <div className="w-full max-w-lg flex items-center justify-between mb-8">
        <button 
          onClick={() => setMode(null)}
          className="p-2 hover:bg-zinc-900 rounded-full transition-colors text-zinc-400 hover:text-white"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        <div className="flex flex-col items-center">
          <span className="text-xs font-mono uppercase tracking-[0.2em] text-zinc-500 mb-1">目标</span>
          <div className="relative">
            <div className="text-5xl font-bold text-white font-mono animate-pulse-target">
              {target}
            </div>
            {currentSum > 0 && (
              <div className={cn(
                "absolute -bottom-6 left-1/2 -translate-x-1/2 text-sm font-mono font-bold transition-colors",
                currentSum > target ? "text-red-500" : "text-emerald-500"
              )}>
                {currentSum}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end">
          <span className="text-xs font-mono uppercase tracking-[0.2em] text-zinc-500 mb-1">得分</span>
          <span className="text-2xl font-bold text-white font-mono">{score}</span>
        </div>
      </div>

      {/* Game Area */}
      <div className="relative w-full max-w-[400px] aspect-[7/10] bg-zinc-900/50 rounded-2xl border border-zinc-800 p-1 overflow-hidden shadow-2xl">
        {/* Grid Background */}
        <div className="absolute inset-0 grid grid-cols-7 grid-rows-10 p-1 opacity-20 pointer-events-none">
          {Array.from({ length: 70 }).map((_, i) => (
            <div key={i} className="border-[0.5px] border-zinc-700" />
          ))}
        </div>

        {/* Blocks */}
        <div className="relative w-full h-full">
          <AnimatePresence>
            {blocks.map((block) => (
              <motion.button
                key={block.id}
                layoutId={block.id}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ 
                  scale: 1, 
                  opacity: 1,
                  left: `calc(${block.col} * 100% / ${GRID_COLS})`,
                  top: `calc(${block.row} * 100% / ${GRID_ROWS})`,
                }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                onClick={() => handleBlockClick(block.id)}
                className={cn(
                  "absolute flex items-center justify-center text-xl font-bold font-mono transition-all rounded-lg",
                  selectedIds.includes(block.id)
                    ? "bg-emerald-500 text-zinc-950 shadow-[0_0_20px_rgba(16,185,129,0.6)] z-10 scale-90"
                    : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                )}
                style={{
                  width: `calc(100% / ${GRID_COLS} - 4px)`,
                  height: `calc(100% / ${GRID_ROWS} - 4px)`,
                  margin: '2px',
                }}
              >
                {block.value}
              </motion.button>
            ))}
          </AnimatePresence>
        </div>

        {/* Time Mode Progress Bar */}
        {mode === 'time' && (
          <div className="absolute bottom-0 left-0 w-full h-1 bg-zinc-800">
            <motion.div 
              className="h-full bg-amber-500"
              initial={{ width: '100%' }}
              animate={{ width: `${(timeLeft / TIME_LIMIT) * 100}%` }}
              transition={{ duration: 1, ease: 'linear' }}
            />
          </div>
        )}

        {/* Pause Overlay */}
        {isPaused && !gameOver && (
          <div className="absolute inset-0 z-50 bg-zinc-950/80 backdrop-blur-sm flex flex-col items-center justify-center">
            <h2 className="text-3xl font-bold text-white mb-6 uppercase tracking-widest">已暂停</h2>
            <button 
              onClick={() => setIsPaused(false)}
              className="p-4 bg-emerald-500 text-zinc-950 rounded-full hover:scale-110 transition-transform"
            >
              <Play className="w-8 h-8 fill-current" />
            </button>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="mt-8 flex items-center gap-4">
        <button
          onClick={() => setIsPaused(!isPaused)}
          className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 hover:text-white transition-colors"
        >
          {isPaused ? <Play className="w-6 h-6" /> : <Pause className="w-6 h-6" />}
        </button>
        <button
          onClick={() => initGame(mode)}
          className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 hover:text-white transition-colors"
        >
          <RotateCcw className="w-6 h-6" />
        </button>
      </div>

      {/* Game Over Modal */}
      <AnimatePresence>
        {gameOver && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-[100] bg-zinc-950/90 backdrop-blur-md flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="max-w-sm w-full bg-zinc-900 border border-zinc-800 p-8 rounded-3xl text-center shadow-2xl"
            >
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              
              <h2 className="text-4xl font-bold text-white mb-2">游戏结束</h2>
              <p className="text-zinc-500 mb-8 font-medium">方块堆积到顶部了！</p>
              
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800">
                  <span className="block text-[10px] uppercase tracking-widest text-zinc-500 mb-1">得分</span>
                  <span className="text-2xl font-bold text-white font-mono">{score}</span>
                </div>
                <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800">
                  <span className="block text-[10px] uppercase tracking-widest text-zinc-500 mb-1">最高分</span>
                  <span className="text-2xl font-bold text-emerald-500 font-mono">{highScore}</span>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => initGame(mode)}
                  className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-2xl transition-colors flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-5 h-5" />
                  再试一次
                </button>
                <button
                  onClick={() => setMode(null)}
                  className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-2xl transition-colors"
                >
                  返回主菜单
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer Hint */}
      <div className="mt-auto pt-8 text-zinc-600 text-[10px] uppercase tracking-[0.3em] font-medium">
        点击数字求和以达到目标值
      </div>
    </div>
  );
}
