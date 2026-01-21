import React, { useState, useEffect } from 'react';

interface GeorgeCreditProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GeorgeCredit({ isOpen, onClose }: GeorgeCreditProps) {
  const [stage, setStage] = useState(0);
  const [fireworks, setFireworks] = useState<Array<{ id: number; x: number; y: number; color: string }>>([]);

  useEffect(() => {
    if (isOpen) {
      setStage(0);
      setFireworks([]);

      // Stage progression - stays a bit too long for the joke
      const timers = [
        setTimeout(() => setStage(1), 500),   // Genie smoke appears
        setTimeout(() => setStage(2), 1500),  // Text starts appearing
        setTimeout(() => setStage(3), 3000),  // Full text visible
        setTimeout(() => setStage(4), 4500),  // Fireworks start
        setTimeout(() => setStage(5), 7000),  // More fireworks
        setTimeout(() => setStage(6), 9500),  // Even more fireworks
        setTimeout(() => setStage(7), 12000), // Text gets bigger
        setTimeout(() => setStage(8), 15000), // Awkwardly long pause
        setTimeout(() => setStage(9), 18000), // Still going...
        setTimeout(() => {
          // Finally close after an uncomfortably long time
          onClose();
        }, 22000),
      ];

      return () => timers.forEach(t => clearTimeout(t));
    }
  }, [isOpen, onClose]);

  // Generate fireworks
  useEffect(() => {
    if (stage >= 4 && isOpen) {
      const colors = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#ff85c0', '#a855f7'];
      const interval = setInterval(() => {
        const newFireworks = Array.from({ length: 3 }, (_, i) => ({
          id: Date.now() + i,
          x: Math.random() * 100,
          y: Math.random() * 100,
          color: colors[Math.floor(Math.random() * colors.length)],
        }));
        setFireworks(prev => [...prev.slice(-30), ...newFireworks]);
      }, 300);

      return () => clearInterval(interval);
    }
  }, [stage, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      {/* Fireworks */}
      {fireworks.map(fw => (
        <div
          key={fw.id}
          className="absolute animate-firework pointer-events-none"
          style={{
            left: `${fw.x}%`,
            top: `${fw.y}%`,
          }}
        >
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full animate-particle"
              style={{
                backgroundColor: fw.color,
                transform: `rotate(${i * 45}deg) translateY(-20px)`,
                animationDelay: `${i * 0.05}s`,
              }}
            />
          ))}
        </div>
      ))}

      {/* Genie smoke effect */}
      {stage >= 1 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className={`transition-all duration-1000 ${stage >= 2 ? 'opacity-30 scale-150' : 'opacity-60 scale-100'}`}>
            <div className="w-32 h-32 bg-purple-500 rounded-full blur-3xl animate-pulse" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-blue-400 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '0.5s' }} />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-pink-400 rounded-full blur-xl animate-pulse" style={{ animationDelay: '1s' }} />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="relative z-10 text-center px-8 py-12">
        {/* Magical lamp icon */}
        {stage >= 1 && (
          <div className={`text-6xl mb-8 transition-all duration-1000 ${stage >= 2 ? 'animate-bounce' : 'animate-pulse'}`}>
            🪔
          </div>
        )}

        {/* The text appears dramatically */}
        {stage >= 2 && (
          <div className={`transition-all duration-1000 ${stage >= 7 ? 'scale-125' : 'scale-100'}`}>
            <h1
              className={`font-bold bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 bg-clip-text text-transparent mb-4 transition-all duration-500 ${
                stage >= 3 ? 'text-5xl' : 'text-3xl'
              } ${stage >= 7 ? 'text-6xl' : ''}`}
              style={{
                textShadow: stage >= 4 ? '0 0 30px rgba(255, 255, 255, 0.5)' : 'none',
              }}
            >
              {stage >= 3 ? '✨ George Denton ✨' : 'George...'}
            </h1>

            {stage >= 3 && (
              <p className={`text-2xl text-white mb-6 transition-all duration-500 ${stage >= 5 ? 'animate-pulse' : ''}`}>
                made this!
              </p>
            )}

            {stage >= 4 && (
              <div className="text-4xl space-x-2 animate-bounce">
                🎆🎇🎆🎇🎆
              </div>
            )}

            {stage >= 6 && (
              <p className="text-lg text-purple-300 mt-6 italic animate-pulse">
                ...with a little help from Claude
              </p>
            )}

            {stage >= 8 && (
              <p className="text-sm text-gray-400 mt-8 animate-pulse">
                (yes, this is still going...)
              </p>
            )}

            {stage >= 9 && (
              <p className="text-xs text-gray-500 mt-4">
                (...any second now...)
              </p>
            )}
          </div>
        )}
      </div>

      {/* Skip button (appears after a bit) */}
      {stage >= 5 && (
        <button
          onClick={onClose}
          className="absolute bottom-8 right-8 px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
        >
          Skip (party pooper)
        </button>
      )}
    </div>
  );
}
