import React, { useState } from 'react';
import { GameState, CompiledModule } from '../types/game';
import { Cpu, Code, Layers, CheckCircle2, Lock, Eye, Disc } from 'lucide-react';

interface Props {
  gameState: GameState;
}

export const CompilerPipelineHUD: React.FC<Props> = ({ gameState }) => {
  const [selectedModule, setSelectedModule] = useState<CompiledModule | null>(null);

  // Group modules by Act
  const modules = gameState.compiledModules;
  const percent = gameState.engineCompilePercent;

  return (
    <div className="flex flex-col h-full bg-neutral-950 border border-neutral-800 rounded-lg overflow-hidden font-mono text-xs">
      {/* HUD Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-neutral-900 border-b border-neutral-800">
        <div className="flex items-center space-x-2 text-neutral-300">
          <Cpu className="w-4 h-4 text-cyan-400" />
          <span className="font-bold text-cyan-400">GRAPHICS & AUDIO PIPELINE COMPILER</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-neutral-400">ENGINE COMPILE:</span>
          <span className="text-cyan-300 font-bold">{percent}%</span>
        </div>
      </div>

      {/* Secret Compilation Bar */}
      <div className="px-4 py-3 bg-neutral-900/40 border-b border-neutral-800">
        <div className="flex justify-between text-[11px] mb-1.5 text-neutral-400">
          <span>GAME N ENGINE PIPELINE RECONSTRUCTION</span>
          <span className="text-emerald-400 font-semibold">{percent >= 100 ? '100% (COMPILED)' : `${percent}% / 100%`}</span>
        </div>
        <div className="w-full bg-neutral-900 h-2.5 rounded-full overflow-hidden border border-neutral-800">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 via-cyan-500 to-purple-500 transition-all duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] mt-1 text-neutral-500">
          <span>0-BIT VOID</span>
          <span>N=1 PIXEL</span>
          <span>BITS 1-4</span>
          <span>BITS 5-9</span>
          <span>10-BIT COMPLETE</span>
          <span>240 FPS ULTRA</span>
        </div>
      </div>

      {/* Modules Matrix List */}
      <div className="flex-1 p-3 overflow-y-auto space-y-2">
        <div className="text-[11px] text-neutral-400 uppercase tracking-wider mb-2 font-semibold flex items-center justify-between">
          <span>GAME N SYNTHESIZED SUBROUTINES:</span>
          <span className="text-neutral-500 text-[10px]">CLICK TO INSPECT SOURCE</span>
        </div>

        {modules.map((mod, mIdx) => {
          const isUnlocked = gameState.engineCompilePercent >= ((mIdx + 1) * 15);
          return (
            <div
              key={`mod-${mod.id}-${mIdx}`}
              onClick={() => setSelectedModule(mod)}
              className={`p-2.5 rounded border transition-all cursor-pointer flex items-center justify-between ${
                selectedModule?.id === mod.id
                  ? 'bg-neutral-800 border-cyan-500/80 shadow-md ring-1 ring-cyan-500/30'
                  : isUnlocked
                  ? 'bg-neutral-900/70 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-800/50'
                  : 'bg-neutral-950/60 border-neutral-900 opacity-50'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                {isUnlocked ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <Lock className="w-4 h-4 text-neutral-600 shrink-0" />
                )}
                <div>
                  <div className="flex items-center space-x-2">
                    <span className={`font-semibold ${isUnlocked ? 'text-neutral-200' : 'text-neutral-500'}`}>
                      {mod.name}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-400 border border-neutral-700">
                      N-CORE
                    </span>
                  </div>
                  <div className="text-[11px] text-neutral-400 line-clamp-1 mt-0.5">
                    {mod.description}
                  </div>
                </div>
              </div>

              <div className="text-[10px] px-2 py-1 rounded bg-black/40 text-neutral-400 border border-neutral-800 uppercase shrink-0">
                {mod.category}
              </div>
            </div>
          );
        })}
      </div>

      {/* Source Code Inspector Panel */}
      {selectedModule && (
        <div className="p-3 bg-neutral-900/90 border-t border-neutral-800 max-h-48 overflow-y-auto">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-cyan-400 font-bold flex items-center gap-1.5 text-xs">
              <Code className="w-3.5 h-3.5" />
              {selectedModule.name}
            </span>
            <span className="text-[10px] text-neutral-400">{selectedModule.description}</span>
          </div>
          <pre className="p-2 bg-black rounded border border-neutral-800 text-[11px] text-emerald-400 overflow-x-auto">
            <code>{selectedModule.codeSnippet}</code>
          </pre>
        </div>
      )}
    </div>
  );
};
