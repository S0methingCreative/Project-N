import React, { useState } from 'react';
import {
  PilotBeamColor,
  BEAM_COLOR_CONFIGS,
  getPilotBeamColor,
  setPilotBeamColor,
} from '../utils/pilotProfile';
import { soundEngine } from '../audio/soundEngine';
import { X, Check, Sparkles, Activity } from 'lucide-react';

interface BeamColorSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectColor?: (color: PilotBeamColor) => void;
  isFirstLaunchPrompt?: boolean;
  pendingModeName?: string;
}

export const BeamColorSelectModal: React.FC<BeamColorSelectModalProps> = ({
  isOpen,
  onClose,
  onSelectColor,
  isFirstLaunchPrompt = false,
  pendingModeName,
}) => {
  const [selectedColor, setSelectedColor] = useState<PilotBeamColor>(() => getPilotBeamColor());

  if (!isOpen) return null;

  const currentCfg = BEAM_COLOR_CONFIGS[selectedColor] || BEAM_COLOR_CONFIGS.green;
  const colorList: PilotBeamColor[] = ['green', 'blue', 'amber', 'azure'];

  const handleChoose = (c: PilotBeamColor) => {
    setSelectedColor(c);
    soundEngine.playTone(523.25, 'triangle', 0.08, 0.2);
  };

  const handleConfirm = () => {
    setPilotBeamColor(selectedColor);
    soundEngine.playCadenceResolution();
    if (onSelectColor) {
      onSelectColor(selectedColor);
    }
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="beam-color-modal-title"
      className="fixed inset-0 z-[120] flex items-center justify-center p-3 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-neutral-950 border-2 rounded-2xl p-5 sm:p-6 shadow-2xl relative overflow-hidden transition-all text-neutral-100 font-mono"
        style={{
          borderColor: currentCfg.hex,
          boxShadow: `0 0 35px ${currentCfg.shadow}, inset 0 0 15px rgba(0,0,0,0.8)`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient Top Glow Bar */}
        <div
          className="absolute top-0 left-0 right-0 h-1 transition-all duration-300"
          style={{
            backgroundColor: currentCfg.hex,
            boxShadow: `0 0 12px ${currentCfg.glow}`,
          }}
        />

        {/* Modal Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 animate-pulse" style={{ color: currentCfg.hex }} />
              <h2 id="beam-color-modal-title" className="text-base sm:text-lg font-black tracking-wider uppercase text-white">
                {isFirstLaunchPrompt ? 'SELECT PILOT BEAM COLOR' : 'EDIT PILOT BEAM COLOR'}
              </h2>
            </div>
            <p className="text-xs text-neutral-400 mt-1">
              {isFirstLaunchPrompt
                ? `Choose your beam frequency before launching ${pendingModeName || 'the game'}. Applies to all modes.`
                : 'Select 1 of the 4 Res 8 harmonic zone frequencies for your pilot line & high scores.'}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-700 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Beam Preview Window */}
        <div className="mb-5 p-4 rounded-xl bg-neutral-900/90 border border-neutral-800 flex flex-col gap-2">
          <div className="flex items-center justify-between text-[11px] text-neutral-400 font-bold uppercase tracking-wider">
            <span>LIVE BEAM PREVIEW (RES 0 - 5)</span>
            <span style={{ color: currentCfg.hex }}>{currentCfg.label}</span>
          </div>

          {/* Interactive Laser Beam Canvas Mockup */}
          <div className="h-14 w-full bg-black/90 rounded-lg relative overflow-hidden flex items-center justify-center border border-neutral-800/80">
            {/* Guide Rails */}
            <div
              className="absolute top-2.5 left-4 right-4 h-[1px] opacity-35 border-t border-dashed"
              style={{ borderColor: currentCfg.hex }}
            />
            <div
              className="absolute bottom-2.5 left-4 right-4 h-[1px] opacity-35 border-b border-dashed"
              style={{ borderColor: currentCfg.hex }}
            />

            {/* Glowing Main Beam Line */}
            <div
              className="absolute left-6 right-6 h-[3px] rounded-full transition-all duration-300"
              style={{
                backgroundColor: currentCfg.hex,
                boxShadow: `0 0 14px ${currentCfg.glow}, 0 0 28px ${currentCfg.shadow}`,
              }}
            />
            {/* White-Hot Core */}
            <div className="absolute left-6 right-6 h-[1.2px] bg-white rounded-full opacity-90" />

            {/* Simulated Player Bead */}
            <div className="relative z-10 flex items-center justify-center">
              <div
                className="w-4 h-4 rounded-full bg-white shadow-lg transition-transform animate-pulse"
                style={{
                  boxShadow: `0 0 16px ${currentCfg.glow}, 0 0 32px ${currentCfg.hex}`,
                }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-[10px] text-neutral-400 pt-1">
            <span>Harmonic Zone Origin: <strong className="text-neutral-200">{currentCfg.zoneName}</strong></span>
            <span className="text-neutral-300 italic">{currentCfg.zoneSub}</span>
          </div>
        </div>

        {/* Color Choice Grid */}
        <div className="grid grid-cols-2 gap-2.5 mb-5">
          {colorList.map((colorKey) => {
            const cfg = BEAM_COLOR_CONFIGS[colorKey];
            const isSelected = selectedColor === colorKey;

            return (
              <button
                key={colorKey}
                type="button"
                onClick={() => handleChoose(colorKey)}
                className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between min-h-[76px] relative ${
                  isSelected
                    ? 'bg-neutral-900 border-white shadow-md'
                    : 'bg-neutral-900/60 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900'
                }`}
                style={
                  isSelected
                    ? {
                        borderColor: cfg.hex,
                        boxShadow: `0 0 18px ${cfg.shadow}`,
                      }
                    : undefined
                }
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0 border border-black/40"
                      style={{
                        backgroundColor: cfg.hex,
                        boxShadow: `0 0 8px ${cfg.glow}`,
                      }}
                    />
                    <span className="font-bold text-xs sm:text-sm text-white tracking-wide">
                      {cfg.label}
                    </span>
                  </div>
                  {isSelected && <Check className="w-4 h-4 shrink-0" style={{ color: cfg.hex }} />}
                </div>

                <div className="text-[10px] text-neutral-400 flex flex-col">
                  <span className="font-semibold text-neutral-300">{cfg.zoneName}</span>
                  <span className="text-[9px] text-neutral-400">Res 8 Sector Color</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-neutral-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-neutral-400 hover:text-white bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            className="px-6 py-2.5 rounded-xl text-xs font-black tracking-wide uppercase text-black flex items-center gap-2 transition-all cursor-pointer active:scale-95 shadow-lg"
            style={{
              backgroundColor: currentCfg.hex,
              boxShadow: `0 0 16px ${currentCfg.shadow}`,
            }}
          >
            <Sparkles className="w-4 h-4 fill-black stroke-none" />
            <span>Confirm Beam Color</span>
          </button>
        </div>
      </div>
    </div>
  );
};
