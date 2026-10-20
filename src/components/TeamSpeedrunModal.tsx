import React, { useState, useEffect } from 'react';
import {
  Users,
  Copy,
  Check,
  Play,
  LogOut,
  Shield,
  Zap,
  Activity,
  Crown,
  Share2,
  AlertTriangle,
  Radio,
  X,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import {
  SpeedrunRoom,
  TeamPilot,
  createSpeedrunRoom,
  joinSpeedrunRoom,
  leaveSpeedrunRoom,
  setPilotReady,
  launchTeamRun,
  resumeTeamRun,
  subscribeToSpeedrunRoom,
  getLocalPilotId,
  getShareableJoinUrl,
  getTeamResourceScale,
  getTeamBossMaxHp,
  getLastSpeedrunRoomCode,
  getSortedPilots,
} from '../services/teamSpeedrunService';
import {
  PilotBeamColor,
  BEAM_COLOR_CONFIGS,
  getPilotBeamColor,
  getPlayerCode,
  renderInitialsBadge,
} from '../utils/pilotProfile';

interface TeamSpeedrunModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLaunchRun: (room: SpeedrunRoom) => void;
  activeRoom: SpeedrunRoom | null;
  setActiveRoom: (room: SpeedrunRoom | null) => void;
  initialCode?: string | null;
}

export const TeamSpeedrunModal: React.FC<TeamSpeedrunModalProps> = ({
  isOpen,
  onClose,
  onLaunchRun,
  activeRoom,
  setActiveRoom,
  initialCode,
}) => {
  const savedRoomCode = getLastSpeedrunRoomCode();
  const [roomCodeInput, setRoomCodeInput] = useState<string>(initialCode || savedRoomCode || '');
  const [copiedLink, setCopiedLink] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const localPilotId = getLocalPilotId();
  const currentInitials = getPlayerCode() || 'PIL';
  const currentColor = getPilotBeamColor();

  // If initialCode provided, pre-fill
  useEffect(() => {
    if (initialCode) {
      setRoomCodeInput(initialCode.toUpperCase());
    } else if (savedRoomCode && !roomCodeInput) {
      setRoomCodeInput(savedRoomCode.toUpperCase());
    }
  }, [initialCode, savedRoomCode]);

  // Subscribe to active room updates only while modal is open (App.tsx maintains the live gameplay subscription)
  useEffect(() => {
    if (!isOpen || !activeRoom?.id) return;
    let prevStatus = activeRoom.status;
    const unsub = subscribeToSpeedrunRoom(activeRoom.id, updated => {
      if (!updated) {
        setActiveRoom(null);
        setErrorMsg('Squad room was closed by host or expired.');
      } else {
        setActiveRoom(updated);
        // If room transitioned to active while in modal, launch run
        if (updated.status === 'active' && prevStatus !== 'active') {
          prevStatus = 'active';
          onLaunchRun(updated);
        } else {
          prevStatus = updated.status;
        }
      }
    });
    return () => unsub();
  }, [isOpen, activeRoom?.id, onLaunchRun, setActiveRoom]);

  if (!isOpen) return null;

  const handleCreateRoom = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const room = await createSpeedrunRoom(currentInitials, currentColor);
      setActiveRoom(room);
    } catch (err) {
      setErrorMsg('Failed to create squad room. Please check your network.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = async (codeToJoin?: string) => {
    const targetCode = (codeToJoin || roomCodeInput).trim().toUpperCase();
    if (!targetCode) {
      setErrorMsg('Please enter a 4-character room code.');
      return;
    }
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await joinSpeedrunRoom(targetCode, currentInitials, currentColor);
      if (res.success && res.room) {
        setActiveRoom(res.room);
      } else {
        setErrorMsg(res.error || 'Could not join room.');
      }
    } catch (err) {
      setErrorMsg('Network error connecting to squad room.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (!activeRoom) return;
    const link = getShareableJoinUrl(activeRoom.code);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(link).then(() => {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2500);
      });
    }
  };

  const handleLeaveRoom = async () => {
    if (!activeRoom) return;
    try {
      setLoading(true);
      await leaveSpeedrunRoom(activeRoom.code, localPilotId);
      setActiveRoom(null);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleReady = async () => {
    if (!activeRoom) return;
    const myPilot = activeRoom.pilots[localPilotId];
    if (!myPilot) return;
    await setPilotReady(activeRoom.code, localPilotId, !myPilot.isReady);
  };

  const handleLaunchSquad = async () => {
    if (!activeRoom) return;
    try {
      setLoading(true);
      const launchedRoom = await launchTeamRun(activeRoom.code);
      onLaunchRun(launchedRoom || activeRoom);
    } finally {
      setLoading(false);
    }
  };

  const handleResumeSquad = async () => {
    if (!activeRoom) return;
    try {
      setLoading(true);
      const resumedRoom = await resumeTeamRun(activeRoom.code);
      onLaunchRun(resumedRoom || activeRoom);
    } finally {
      setLoading(false);
    }
  };

  const pilotsList = getSortedPilots(activeRoom?.pilots, activeRoom?.hostPilotId);
  const pilotCount = Math.max(1, pilotsList.length);
  const resourceScale = getTeamResourceScale(pilotCount);
  const bossHp = getTeamBossMaxHp(pilotCount);
  const isHost = activeRoom ? activeRoom.hostPilotId === localPilotId : false;
  const myPilot = activeRoom ? activeRoom.pilots[localPilotId] : null;

  const hasSavedProgress = Boolean(
    activeRoom && (
      (activeRoom.sharedState?.act1Bits || 0) > 0 ||
      (activeRoom.sharedState?.act1Resolution || 0) > 0 ||
      (activeRoom.sharedState?.act1SubPart || 1) > 1 ||
      (activeRoom.sharedState?.totalHz || 0) > 0
    )
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-zinc-950 border-2 border-cyan-500/50 rounded-2xl shadow-[0_0_50px_rgba(6,182,212,0.25)] flex flex-col max-h-[92vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-cyan-500/30 bg-gradient-to-r from-zinc-900 via-zinc-950 to-zinc-900">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/40 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
              <Users className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black font-mono tracking-wider text-cyan-300 flex items-center gap-2">
                SQUAD CO-OP
                <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-sans border border-cyan-500/40 font-bold uppercase tracking-widest">
                  1–4 PILOTS
                </span>
              </h2>
              <p className="text-xs text-zinc-400 font-mono">
                Pure Co-Op Experience · Linear Resource Multipliers · 5s Automatic Respawn · No Leaderboard
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-amber-300 border border-amber-600/60 text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
              title="Return to Main Menu"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>MAIN MENU</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition-colors cursor-pointer"
              title="Return to Main Menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-zinc-200">
          {errorMsg && (
            <div className="flex items-center gap-2 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/40 text-rose-300 text-sm font-mono animate-shake">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {!activeRoom ? (
            /* LOBBY ENTRY VIEW: Create or Join */
            <div className="space-y-6">
              {/* Pilot Card Identity Preview */}
              <div className="p-4 rounded-xl bg-zinc-900/70 border border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {renderInitialsBadge(currentInitials, currentColor)}
                  <div>
                    <div className="text-xs font-mono text-zinc-400">ACTIVE PILOT CALLSIGN</div>
                    <div className="text-sm font-bold font-mono text-zinc-100 flex items-center gap-2">
                      <span>{currentInitials}</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700 capitalize">
                        {BEAM_COLOR_CONFIGS[currentColor]?.label || currentColor} Beam
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-mono">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    LIVE WEBSOCKET SERVER · 24H ROOMS
                  </span>
                </div>
              </div>

              {/* Action Grid: Create Squad or Join Squad */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Create Squad Pod */}
                <div className="p-5 rounded-xl bg-gradient-to-b from-cyan-950/20 to-zinc-900/60 border border-cyan-500/30 flex flex-col justify-between space-y-4 hover:border-cyan-500/50 transition-all">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-cyan-400 font-mono font-bold text-sm tracking-wide">
                      <Radio className="w-4 h-4" />
                      CREATE SQUAD ROOM
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Initialize a dedicated squad frequency. Generates a 4-character room code and shareable direct join link for your crew.
                    </p>
                  </div>
                  <button
                    onClick={handleCreateRoom}
                    disabled={loading}
                    className="w-full py-3 px-4 rounded-xl font-mono font-black text-sm tracking-wider bg-cyan-500 text-black hover:bg-cyan-400 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.4)] disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
                    <span>HOST SQUAD FREQUENCY</span>
                  </button>
                </div>

                {/* Join Squad Pod */}
                <div className="p-5 rounded-xl bg-gradient-to-b from-purple-950/20 to-zinc-900/60 border border-purple-500/30 flex flex-col justify-between space-y-4 hover:border-purple-500/50 transition-all">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-purple-400 font-mono font-bold text-sm tracking-wide">
                      <Users className="w-4 h-4" />
                      JOIN SQUAD FREQUENCY
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Connect your mobile phone or browser to an existing pilot squad using their 4-character room code.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <input
                      type="text"
                      maxLength={4}
                      value={roomCodeInput}
                      onChange={e => setRoomCodeInput(e.target.value.toUpperCase())}
                      placeholder="ENTER 4-CHAR CODE (e.g. K7X9)"
                      className="w-full bg-zinc-950 border border-purple-500/50 rounded-lg px-3 py-2 text-center text-lg font-mono font-black text-purple-300 tracking-[0.3em] uppercase placeholder:text-zinc-600 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400"
                    />
                    <button
                      onClick={() => handleJoinRoom()}
                      disabled={loading || !roomCodeInput.trim()}
                      className="w-full py-2.5 px-4 rounded-xl font-mono font-black text-sm tracking-wider bg-purple-600 text-white hover:bg-purple-500 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(168,85,247,0.3)] disabled:opacity-50 cursor-pointer"
                    >
                      {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Radio className="w-4 h-4" />}
                      <span>LINK TO SQUAD</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Scaling Breakdown Reference Table */}
              <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 space-y-3">
                <div className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-cyan-400" />
                  SQUAD CO-OP SCALING RULES (NO LEADERBOARD)
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs font-mono">
                  <div className="p-2.5 rounded-lg bg-zinc-950/80 border border-zinc-800">
                    <div className="text-zinc-500">1 PILOT</div>
                    <div className="text-cyan-400 font-bold text-sm">1× Resources</div>
                    <div className="text-[11px] text-zinc-400">100 HP Bosses</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-zinc-950/80 border border-zinc-800">
                    <div className="text-zinc-500">2 PILOTS</div>
                    <div className="text-cyan-400 font-bold text-sm">2× Resources</div>
                    <div className="text-[11px] text-zinc-400">150 HP Bosses</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-zinc-950/80 border border-zinc-800">
                    <div className="text-zinc-500">3 PILOTS</div>
                    <div className="text-cyan-400 font-bold text-sm">3× Resources</div>
                    <div className="text-[11px] text-zinc-400">200 HP Bosses</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-zinc-950/80 border border-zinc-800">
                    <div className="text-zinc-500">4 PILOTS</div>
                    <div className="text-cyan-400 font-bold text-sm">4× Resources</div>
                    <div className="text-[11px] text-zinc-400">250 HP Bosses</div>
                  </div>
                </div>
                <div className="text-[11px] text-zinc-400 leading-normal font-mono border-t border-zinc-800/80 pt-2 flex flex-col gap-1">
                  <div>⚡ <span className="text-zinc-200">Ghost Respawn:</span> 0 HP triggers 5s automatic ghost recovery. Waves continue flowing; no teammate revive required.</div>
                  <div>💀 <span className="text-zinc-200">Team Wipe:</span> If all pilots are knocked simultaneously, the current checkpoint resets per Speedrun rules.</div>
                </div>
              </div>

              <div className="pt-1 flex justify-end">
                <button
                  onClick={onClose}
                  className="w-full sm:w-auto py-2.5 px-5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-amber-300 border border-amber-600/60 text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>RETURN TO MAIN MENU</span>
                </button>
              </div>
            </div>
          ) : (
            /* ACTIVE ROOM LOBBY / ROSTER VIEW */
            <div className="space-y-5">
              {/* Room Code & Quick Share Banner */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-950/40 via-zinc-900 to-cyan-950/40 border border-cyan-500/40 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-300 font-mono text-xs uppercase font-bold tracking-widest border border-cyan-500/40">
                    ROOM FREQUENCY
                  </div>
                  <div className="text-3xl font-black font-mono tracking-[0.25em] text-cyan-300 drop-shadow-[0_0_15px_rgba(6,182,212,0.6)]">
                    {activeRoom.code}
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={handleCopyLink}
                    className="flex-1 sm:flex-none py-2 px-3.5 rounded-lg bg-zinc-800/90 hover:bg-zinc-700 border border-zinc-700 text-xs font-mono font-bold text-cyan-300 flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? 'LINK COPIED!' : 'COPY DIRECT LINK'}</span>
                  </button>

                  <button
                    onClick={handleLeaveRoom}
                    disabled={loading}
                    className="py-2 px-3 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/40 text-xs font-mono font-bold text-rose-300 flex items-center gap-1.5 transition-all cursor-pointer"
                    title="Leave Squad"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>LEAVE</span>
                  </button>
                </div>
              </div>

              {/* Roster of 4 Pilot Slots */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-mono text-zinc-400 px-1">
                  <span>CONNECTED SQUAD PILOTS ({pilotsList.length}/4)</span>
                  <span className="text-cyan-400 font-bold">{resourceScale}× SCALING APPLIED</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(() => {
                    // Stable 4-slot pod layout: slot 0 is host pod, slots 1-3 maintain stable order
                    const podSlots: (TeamPilot | null)[] = [null, null, null, null];
                    pilotsList.forEach((pilot, i) => {
                      const slot = (typeof pilot.slotIndex === 'number' && pilot.slotIndex >= 0 && pilot.slotIndex < 4 && !podSlots[pilot.slotIndex])
                        ? pilot.slotIndex
                        : i;
                      if (slot >= 0 && slot < 4 && !podSlots[slot]) {
                        podSlots[slot] = pilot;
                      } else {
                        const freeIdx = podSlots.findIndex(s => s === null);
                        if (freeIdx !== -1) podSlots[freeIdx] = pilot;
                      }
                    });

                    return podSlots.map((pilot, idx) => {
                      if (pilot) {
                        const isMe = pilot.id === localPilotId;
                        const beamCfg = BEAM_COLOR_CONFIGS[pilot.color as PilotBeamColor] || BEAM_COLOR_CONFIGS.green;
                        return (
                          <div
                            key={pilot.id}
                            className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                              isMe
                                ? 'bg-zinc-900/90 border-cyan-500/60 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                                : 'bg-zinc-900/50 border-zinc-800'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              {renderInitialsBadge(pilot.initials, pilot.color)}
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono font-bold text-sm text-zinc-100">{pilot.initials}</span>
                                  {pilot.isHost && (
                                    <span title="Squad Host">
                                      <Crown className="w-3.5 h-3.5 text-amber-400" />
                                    </span>
                                  )}
                                  {isMe && (
                                    <span className="text-[10px] font-mono px-1 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                                      YOU
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] font-mono text-zinc-400">
                                  {beamCfg.label} Beam
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {pilot.isReady ? (
                                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-500/40 flex items-center gap-1">
                                  <Check className="w-3 h-3" />
                                  READY
                                </span>
                              ) : (
                                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-amber-950/80 text-amber-400 border border-amber-500/40">
                                  PREPPING
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      } else {
                        return (
                          <div
                            key={`empty-${idx}`}
                            className="p-3.5 rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40 flex items-center justify-between text-zinc-600 font-mono text-xs"
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg border border-dashed border-zinc-800 flex items-center justify-center text-zinc-700 font-black">
                                {idx + 1}
                              </div>
                              <span>OPEN PILOT POD {idx + 1}</span>
                            </div>
                            <span className="text-[10px] text-zinc-700">WAITING...</span>
                          </div>
                        );
                      }
                    });
                  })()}
                </div>
              </div>

              {/* Live Scaling Metrics Bar */}
              <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 grid grid-cols-3 gap-2 text-center font-mono">
                <div>
                  <div className="text-[10px] text-zinc-500 uppercase">Resource Scaling</div>
                  <div className="text-sm font-bold text-cyan-400">{resourceScale}× Requirements</div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-500 uppercase">Boss 1 & 2 Health</div>
                  <div className="text-sm font-bold text-amber-400">{bossHp} HP (+50%/pilot)</div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-500 uppercase">Revive Mechanic</div>
                  <div className="text-sm font-bold text-emerald-400">5.0s Auto Ghost</div>
                </div>
              </div>

              {/* SAVED SQUAD CHECKPOINT BANNER */}
              {hasSavedProgress && (
                <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/40 flex items-center justify-between text-xs font-mono text-amber-200">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                    <div>
                      <div className="font-bold text-amber-300">
                        SAVED SQUAD CHECKPOINT: {activeRoom.sharedState?.act1SubPart === 2 ? `PART 2 · RES ${activeRoom.sharedState?.act1Resolution || 0}` : `PART 1 · BIT ${activeRoom.sharedState?.act1Bits || 0}`}
                      </div>
                      <div className="text-[11px] text-amber-400/80">
                        Squad Bank: {activeRoom.sharedState?.totalHz || 0} Hz / {activeRoom.sharedState?.totalV || 0} V{activeRoom.sharedState?.act1SubPart === 2 ? ` / ${activeRoom.sharedState?.totalBaud || 0} Flux` : ''} · Run #{activeRoom.sharedState?.runNumber || 1}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-amber-900/60 border border-amber-600/50 uppercase tracking-widest font-bold">
                    SAVED
                  </span>
                </div>
              )}

              {/* Host / Pilot Ready & Launch Controls */}
              <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                {!isHost && (
                  <button
                    onClick={handleToggleReady}
                    className={`w-full sm:w-1/2 py-3 px-4 rounded-xl font-mono font-bold text-sm tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      myPilot?.isReady
                        ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border border-zinc-600'
                        : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                    }`}
                  >
                    <Check className="w-4 h-4" />
                    <span>{myPilot?.isReady ? 'SET UNREADY' : 'MARK READY'}</span>
                  </button>
                )}

                {isHost ? (
                  hasSavedProgress ? (
                    <div className="w-full flex flex-col sm:flex-row items-center gap-2">
                      <button
                        onClick={handleResumeSquad}
                        disabled={loading}
                        className="w-full sm:flex-1 py-3 px-4 rounded-xl font-mono font-black text-sm tracking-wider bg-gradient-to-r from-emerald-500 to-cyan-500 text-black hover:opacity-95 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(16,185,129,0.4)] cursor-pointer"
                      >
                        <Play className="w-4 h-4 fill-current" />
                        <span>CONTINUE RUN (RESUME)</span>
                      </button>
                      <button
                        onClick={handleLaunchSquad}
                        disabled={loading}
                        className="w-full sm:w-auto py-3 px-4 rounded-xl font-mono font-bold text-xs tracking-wider bg-zinc-900 text-zinc-300 hover:bg-zinc-800 border border-zinc-700 active:scale-[0.98] transition-all cursor-pointer"
                        title="Start over from Bit 0"
                      >
                        <span>NEW RUN (RESET)</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={handleLaunchSquad}
                      disabled={loading}
                      className="w-full py-3 px-6 rounded-xl font-mono font-black text-sm tracking-wider bg-gradient-to-r from-cyan-500 to-emerald-500 text-black hover:opacity-95 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(6,182,212,0.4)] cursor-pointer"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>LAUNCH SQUAD CO-OP ({pilotCount} PILOT{pilotCount > 1 ? 'S' : ''})</span>
                    </button>
                  )
                ) : (
                  <div className="w-full sm:w-1/2 text-center text-xs font-mono text-zinc-400 p-3 bg-zinc-900/60 rounded-xl border border-zinc-800">
                    {hasSavedProgress
                      ? 'Saved checkpoint detected. Waiting for Host to continue run...'
                      : 'Waiting for Host to launch Squad Co-Op session...'}
                  </div>
                )}

                <button
                  onClick={onClose}
                  className="w-full sm:w-auto py-3 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-amber-300 border border-amber-600/60 text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 shrink-0"
                  title="Return to Main Menu"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>MAIN MENU</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
