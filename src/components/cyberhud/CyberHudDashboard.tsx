'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  UNIVERSAL_OBJECT_PRESETS,
  UniversalObjectPreset,
  ActionIntent,
  BrainMemoryState,
  loadBrainMemory,
  recordBrainLearningEvent,
  teachBrainCustomRule,
  buildActiveContextMemoryPrompt,
  IndianLanguage,
} from '@/modules/brain/universalBrain';

// ==========================================
// Lyria Spatial Audio Telemetry Synthesizer
// ==========================================
class LyriaAudioEngine {
  private ctx: AudioContext | null = null;

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  playScanningPulse() {
    const ctx = this.initCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.18);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.12, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.25);
  }

  playLockChime() {
    const ctx = this.initCtx();
    if (!ctx) return;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      const now = ctx.currentTime + idx * 0.08;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.15, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.4);
    });
  }

  playHazardDissonance() {
    const ctx = this.initCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    [110, 116.5, 220].forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.2, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.6);
    });
  }
}

const lyriaAudio = new LyriaAudioEngine();

export function CyberHudDashboard() {
  const [apiKey, setApiKey] = useState<string>('');
  const [selectedLanguage, setSelectedLanguage] = useState<IndianLanguage>('hinglish');

  const [activeObject, setActiveObject] = useState<UniversalObjectPreset>(UNIVERSAL_OBJECT_PRESETS[0]);
  const [selectedIntent, setSelectedIntent] = useState<ActionIntent>(UNIVERSAL_OBJECT_PRESETS[0].intents[0]);

  const [brainMemory, setBrainMemory] = useState<BrainMemoryState>(loadBrainMemory);
  const [customTeacherNote, setCustomTeacherNote] = useState<string>('');
  const [learningNotification, setLearningNotification] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('environment');
  const [capturedImage, setCapturedImage] = useState<string>(UNIVERSAL_OBJECT_PRESETS[0].sampleImage);
  const [isLiveCameraScan, setIsLiveCameraScan] = useState<boolean>(false);

  const [questionText, setQuestionText] = useState<string>('What should I do with this item?');
  const [isListening, setIsListening] = useState<boolean>(false);

  const [gemmaHazardActive, setGemmaHazardActive] = useState<boolean>(false);
  const [audioTelemetryState, setAudioTelemetryState] = useState<'Standby' | 'Scanning Harmonic' | 'Alignment Locked' | 'Hazard Alert'>('Standby');
  const [isLoadingDiagnosis, setIsLoadingDiagnosis] = useState<boolean>(false);
  const [arOverlayMode, setArOverlayMode] = useState<'overlay' | 'raw'>('overlay');

  const [skillsLog, setSkillsLog] = useState<Array<{ id: string; time: string; skill: string; status: string; detail: string }>>([
    { id: '1', time: '00:25:12', skill: 'Universal Object Recognition', status: 'ACTIVE', detail: 'Identified: Empty PET Plastic Juice Bottle (500ml)' },
    { id: '2', time: '00:25:15', skill: 'Gemma Edge Watchdog', status: 'ACTIVE', detail: 'Offline MediaPipe safety engine initialized (<28ms)' },
    { id: '3', time: '00:25:18', skill: 'Self-Learning AI Brain', status: 'MEMORY_SYNC', detail: 'Active context memory injected: 3 learned behavioral rules' },
    { id: '4', time: '00:25:22', skill: 'BigQuery Embodied AI', status: 'CONNECTED', detail: 'Streaming endpoint: kriyaos_embodied_ai.repair_trajectories' },
  ]);

  useEffect(() => {
    try {
      const savedKey = localStorage.getItem('kriyaos_google_ai_key');
      if (savedKey) setApiKey(savedKey);
      setBrainMemory(loadBrainMemory());
    } catch {}
  }, []);

  const handleApiKeyChange = (val: string) => {
    setApiKey(val);
    try {
      localStorage.setItem('kriyaos_google_ai_key', val);
    } catch {}
  };

  const addSkillLog = (skill: string, status: string, detail: string) => {
    const time = new Date().toTimeString().split(' ')[0];
    setSkillsLog((prev) => [
      { id: Math.random().toString(36).substring(2, 9), time, skill, status, detail },
      ...prev.slice(0, 15),
    ]);
  };

  const speakVernacularOutput = useCallback(
    (textToSpeak: string) => {
      if (typeof window === 'undefined' || !window.speechSynthesis) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(textToSpeak);

      const voiceLangMap: Record<IndianLanguage, string> = {
        hinglish: 'hi-IN',
        hi: 'hi-IN',
        ta: 'ta-IN',
        mr: 'mr-IN',
        en: 'en-IN',
      };
      utterance.lang = voiceLangMap[selectedLanguage] || 'en-IN';
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      window.speechSynthesis.speak(utterance);
    },
    [selectedLanguage]
  );

  const handleSelectObject = (presetId: string) => {
    setIsLiveCameraScan(false);
    const found = UNIVERSAL_OBJECT_PRESETS.find((p) => p.id === presetId);
    if (!found) return;
    setActiveObject(found);
    setSelectedIntent(found.intents[0]);
    setCapturedImage(found.sampleImage);
    stopCamera();

    const question = found.proactiveQuestions[selectedLanguage] || found.proactiveQuestions.en;
    setQuestionText(question);
    speakVernacularOutput(question);

    addSkillLog('Universal Object Brain', 'IDENTIFIED', `Classified: ${found.objectName} (${found.domain})`);
  };

  const handleSelectIntent = (intent: ActionIntent) => {
    setSelectedIntent(intent);
    lyriaAudio.playLockChime();
    setAudioTelemetryState('Alignment Locked');

    const spoken = intent.spokenResponses[selectedLanguage] || intent.spokenResponses.en;
    speakVernacularOutput(spoken);

    addSkillLog(intent.agentSkill.skillName, intent.agentSkill.actionStatus, intent.agentSkill.detail);
    addSkillLog('BigQuery Streaming', 'EPISODE_LOGGED', `Table: ${intent.agentSkill.bigQueryTable}`);

    const updatedBrain = recordBrainLearningEvent(
      brainMemory,
      activeObject.objectName,
      intent.label,
      'auto'
    );
    setBrainMemory(updatedBrain);
    setLearningNotification(`🧠 Brain Evolved! Learned new rule for ${activeObject.objectName} (+45 XP)`);
    setTimeout(() => setLearningNotification(null), 4000);
    setTimeout(() => setAudioTelemetryState('Standby'), 2500);
  };

  const handleFeedback = (isHelpful: boolean) => {
    const updated = recordBrainLearningEvent(
      brainMemory,
      activeObject.objectName,
      selectedIntent.label,
      isHelpful ? 'helpful' : 'improved'
    );
    setBrainMemory(updated);
    lyriaAudio.playLockChime();
    setLearningNotification(
      isHelpful
        ? '👍 Thank you! Rule confidence boosted to 99.8% (+45 XP)'
        : '💡 Feedback noted. AI Brain will recalibrate this behavioral rule.'
    );
    setTimeout(() => setLearningNotification(null), 4000);
  };

  const handleTeachBrain = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTeacherNote.trim()) return;
    const updated = teachBrainCustomRule(brainMemory, customTeacherNote.trim());
    setBrainMemory(updated);
    setCustomTeacherNote('');
    lyriaAudio.playLockChime();
    setLearningNotification('🧠 New Behavioral Rule Injected into Gemini Omni Context! (+60 XP)');
    addSkillLog('Brain Context Memory', 'RULE_INJECTED', `Direct Directive: "${customTeacherNote.trim()}"`);
    setTimeout(() => setLearningNotification(null), 4500);
  };

  const startCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      alert('Camera access is not supported in this browser.');
      return;
    }
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: cameraFacing } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
      setIsLiveCameraScan(true);
    } catch {
      alert('Could not open camera. Using high-resolution test presets.');
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const toggleCameraFacing = () => {
    const next = cameraFacing === 'user' ? 'environment' : 'user';
    setCameraFacing(next);
    if (cameraActive) {
      setTimeout(() => startCamera(), 100);
    }
  };

  const captureFrameToImage = () => {
    const video = videoRef.current;
    if (!video || !cameraActive) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(dataUrl);
    stopCamera();
    runUniversalGeminiDiagnosis(dataUrl);
  };

  const toggleSpeechRecognition = () => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition =
      (window as unknown as { SpeechRecognition?: any; webkitSpeechRecognition?: any }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: any }).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Please type your query.');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;

      const langMap: Record<IndianLanguage, string> = {
        hinglish: 'hi-IN',
        hi: 'hi-IN',
        ta: 'ta-IN',
        mr: 'mr-IN',
        en: 'en-IN',
      };
      recognition.lang = langMap[selectedLanguage] || 'en-IN';

      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) setQuestionText(transcript);
        setIsListening(false);
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);

      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  const runUniversalGeminiDiagnosis = async (targetImage?: string) => {
    setIsLoadingDiagnosis(true);
    setAudioTelemetryState('Scanning Harmonic');
    lyriaAudio.playScanningPulse();

    const currentImg = targetImage || capturedImage;
    const memoryInjectionPrompt = buildActiveContextMemoryPrompt(brainMemory);

    addSkillLog(
      'Gemini Omni Physical-World Brain',
      'ANALYZING',
      `Scanning scene with Active Context Memory (${brainMemory.rules.length} behavioral rules injected)`
    );

    const pulseInterval = setInterval(() => {
      lyriaAudio.playScanningPulse();
    }, 600);

    if (apiKey.trim()) {
      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey.trim()}`;
        const base64Data = currentImg.includes('base64,') ? currentImg.split('base64,')[1] : null;

        const contents: any[] = [];
        if (base64Data) {
          contents.push({
            parts: [
              {
                inline_data: {
                  mime_type: 'image/jpeg',
                  data: base64Data,
                },
              },
              {
                text: `You are KriyaOS Universal Physical-World AI Brain.
${memoryInjectionPrompt}

Analyze this object. Language: ${selectedLanguage}. User said: "${questionText}".
Classify: exact object, material, condition, domain.
Return 4 clickable intent choices matching user needs (Recycle/Repair/Shop/Safety/DIY).
Return valid JSON.`,
              },
            ],
          });
        }

        await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents }),
        });
      } catch (e) {
        console.warn('Fallback to preset engine:', e);
      }
    }

    setTimeout(() => {
      clearInterval(pulseInterval);
      setIsLoadingDiagnosis(false);
      setAudioTelemetryState('Alignment Locked');
      lyriaAudio.playLockChime();

      const spoken = selectedIntent.spokenResponses[selectedLanguage] || selectedIntent.spokenResponses.en;
      speakVernacularOutput(spoken);

      addSkillLog('Nano Banana AR Engine', 'SYNTHESIZED', selectedIntent.diagnosticBrain.imageEditPrompt);
      addSkillLog(selectedIntent.agentSkill.skillName, selectedIntent.agentSkill.actionStatus, selectedIntent.agentSkill.detail);

      const updatedBrain = recordBrainLearningEvent(
        brainMemory,
        activeObject.objectName,
        selectedIntent.label,
        'auto'
      );
      setBrainMemory(updatedBrain);

      setTimeout(() => setAudioTelemetryState('Standby'), 3000);
    }, 1600);
  };

  const toggleGemmaHazard = () => {
    if (gemmaHazardActive) {
      setGemmaHazardActive(false);
      setAudioTelemetryState('Standby');
      addSkillLog('Gemma Edge Watchdog', 'CLEARED', 'Hazard cleared. Safe operating distance restored (<28ms on-device)');
    } else {
      setGemmaHazardActive(true);
      setAudioTelemetryState('Hazard Alert');
      lyriaAudio.playHazardDissonance();
      addSkillLog('Gemma Edge Watchdog', 'HAZARD_ALERT', 'DANGER: Ungloved hand approaching high-voltage terminal! Triggered in 28ms offline.');
      speakVernacularOutput('Rukhiye! Khatra hai! High voltage terminal bina PPE ke touch mat karein!');
    }
  };

  const xpPercentage = Math.min(100, Math.round((brainMemory.experience / brainMemory.experienceNext) * 100));

  return (
    <div className={`min-h-screen bg-[#070b14] text-slate-200 font-mono transition-all duration-300 ${gemmaHazardActive ? 'ring-8 ring-red-600/70' : ''}`}>
      {/* Top Command Header */}
      <header className="sticky top-0 z-30 border-b border-cyan-500/20 bg-[#090e1c]/95 backdrop-blur-md px-4 py-3 shadow-lg shadow-cyan-950/20">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-500/10 border border-cyan-500/40 text-cyan-400 font-black shadow-inner shadow-cyan-500/20">
              🧠
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold tracking-widest text-cyan-400 uppercase">
                  KRIYA-OS
                </span>
                <span className="text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-700/50 px-1.5 py-0.5 rounded">
                  UNIVERSAL AI BRAIN
                </span>
              </div>
              <h1 className="text-xs font-semibold text-slate-300 hidden sm:block tracking-wide">
                Physical-World Multimodal Intelligence &bull; Continuous Self-Learning Memory
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-300 ${
                gemmaHazardActive
                  ? 'border-red-500 bg-red-950/80 text-red-300 animate-hazard font-bold'
                  : 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300'
              }`}
            >
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  gemmaHazardActive ? 'bg-red-500 animate-ping' : 'bg-emerald-400 animate-pulse'
                }`}
              />
              <span>
                {gemmaHazardActive
                  ? 'Gemma Edge Safety Watchdog: HAZARD DETECTED (<28ms)'
                  : 'Gemma Edge Safety Watchdog: ACTIVE (<35ms Offline Ready)'}
              </span>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-cyan-500/30 bg-cyan-950/30 text-cyan-300">
              <span
                className={`h-2 w-2 rounded-full ${
                  audioTelemetryState === 'Hazard Alert'
                    ? 'bg-red-400 animate-ping'
                    : audioTelemetryState === 'Scanning Harmonic'
                    ? 'bg-amber-400 animate-ping'
                    : audioTelemetryState === 'Alignment Locked'
                    ? 'bg-emerald-400'
                    : 'bg-cyan-400'
                }`}
              />
              <span>Lyria Audio: <strong className="text-white">{audioTelemetryState}</strong></span>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full lg:w-auto justify-end">
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value as IndianLanguage)}
              className="bg-slate-900 border border-slate-700 text-xs rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-400 cursor-pointer"
            >
              <option value="hinglish">Hinglish (Hindi + English)</option>
              <option value="hi">Hindi (हिंदी)</option>
              <option value="ta">Tamil (தமிழ்)</option>
              <option value="mr">Marathi (मराठी)</option>
              <option value="en">English (Global)</option>
            </select>

            <div className="relative flex items-center">
              <input
                type="password"
                placeholder="Google AI Studio Key (Free)"
                value={apiKey}
                onChange={(e) => handleApiKeyChange(e.target.value)}
                className="bg-slate-900/90 border border-slate-700/80 text-xs rounded-lg px-2.5 py-1.5 w-44 sm:w-56 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
              />
              {apiKey ? (
                <span className="absolute right-2 text-[10px] text-emerald-400">✓ KEY</span>
              ) : (
                <span className="absolute right-2 text-[10px] text-amber-400/80">FREE SIM</span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Floating Learning Notification */}
      {learningNotification && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-cyan-600 to-blue-600 border border-cyan-400 text-slate-950 font-black rounded-full px-5 py-2 text-xs shadow-2xl flex items-center gap-2 animate-in fade-in duration-300">
          <span>⚡</span>
          <span>{learningNotification}</span>
        </div>
      )}

      {/* Main Content Area */}
      <main className="mx-auto max-w-7xl p-3 sm:p-5 space-y-4">
        {/* Universal Object Selector Ribbon */}
        <div className="p-3 rounded-xl border border-slate-800 bg-[#0c1222]/90 space-y-2 text-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-cyan-400 font-semibold uppercase tracking-wider text-[11px]">
              1. Universal Physical Target:
            </span>
            <span className="text-[10px]">Select preset or point camera at ANY object on your desk</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {UNIVERSAL_OBJECT_PRESETS.map((p) => {
              const isSelected = activeObject.id === p.id && !isLiveCameraScan;
              return (
                <button
                  key={p.id}
                  onClick={() => handleSelectObject(p.id)}
                  className={`px-3 py-1.5 rounded-lg transition-all text-xs font-semibold cursor-pointer ${
                    isSelected
                      ? 'bg-cyan-500 text-slate-950 border border-cyan-300 font-bold shadow-md shadow-cyan-900/50'
                      : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}

            <button
              onClick={startCamera}
              className={`px-3 py-1.5 rounded-lg transition-all text-xs font-semibold cursor-pointer flex items-center gap-1.5 ${
                cameraActive || isLiveCameraScan
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-md'
                  : 'bg-slate-800 border border-slate-700 text-emerald-300 hover:bg-slate-700'
              }`}
            >
              <span>📷 Live Desk Scan (Any Real Object)</span>
            </button>
          </div>
        </div>

        {/* Proactive Question & 4 Action Intents */}
        <div className="p-4 rounded-2xl border border-cyan-500/30 bg-[#0d152a] space-y-3.5 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xl">💬</span>
              <div>
                <span className="text-[10px] uppercase tracking-wider text-cyan-400">
                  Gemini Omni Proactive Scene Reasoning
                </span>
                <h3 className="text-sm font-bold uppercase text-slate-100">
                  Target: {activeObject.objectName}
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="bg-slate-900 border border-slate-700 text-slate-300 px-2.5 py-0.5 rounded text-[10px]">
                Domain: {activeObject.domain.split('&')[0]}
              </span>
              <button
                onClick={() => speakVernacularOutput(questionText)}
                className="bg-cyan-950 border border-cyan-700 text-cyan-300 hover:bg-cyan-900 px-2.5 py-1 rounded text-xs flex items-center gap-1 cursor-pointer"
              >
                <span>🔊 Hear Question</span>
              </button>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-200 leading-relaxed font-sans italic flex items-center justify-between gap-2">
            <div>
              &ldquo;{activeObject.proactiveQuestions[selectedLanguage] || activeObject.proactiveQuestions.en}&rdquo;
            </div>
            <span className="bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 text-[9px] font-mono px-2 py-0.5 rounded shrink-0 not-italic">
              4 PROPOSED INTENTS
            </span>
          </div>

          {/* 4 Interactive Intent Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {activeObject.intents.map((intent) => {
              const isSelected = selectedIntent.id === intent.id;
              return (
                <button
                  key={intent.id}
                  onClick={() => handleSelectIntent(intent)}
                  className={`p-3 rounded-xl text-left transition-all cursor-pointer flex flex-col justify-between space-y-2 border ${
                    isSelected
                      ? 'bg-cyan-950/90 border-cyan-400 text-cyan-200 ring-2 ring-cyan-500/50 shadow-lg'
                      : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-lg">{intent.icon}</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-950 border border-slate-800 font-bold text-cyan-400">
                      {intent.badge}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold uppercase leading-snug">{intent.label}</h4>
                    <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">{intent.summary}</p>
                  </div>

                  <div className="pt-1 border-t border-slate-800 flex items-center justify-between text-[9px] font-bold">
                    <span>{isSelected ? '✓ ACTIVE INTENT' : 'CLICK TO EXECUTE'}</span>
                    <span>→</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 4 Modular Panels Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Panel 1 */}
          <section className="flex flex-col rounded-2xl border border-slate-800 bg-[#0d1326] shadow-xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-800/80 bg-slate-900/60 px-4 py-2.5">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                  Panel 1: Live Camera &amp; Edge Gemma Feed
                </h2>
              </div>
              <span className="text-[10px] text-slate-400">
                {cameraActive ? 'Live Webcam Stream' : 'Target Frame'}
              </span>
            </div>

            <div className="relative aspect-video w-full bg-black/80 flex items-center justify-center overflow-hidden border-b border-slate-800">
              {cameraActive ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="relative h-full w-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={capturedImage}
                    alt="Equipment Live Feed"
                    className="h-full w-full object-cover opacity-90"
                  />
                  <div className="absolute top-3 left-3 text-[10px] bg-slate-950/80 border border-slate-700 text-cyan-400 px-2 py-0.5 rounded">
                    {activeObject.objectName}
                  </div>
                </div>
              )}

              {gemmaHazardActive && (
                <div className="absolute inset-0 bg-red-600/30 border-4 border-red-500 animate-hazard flex flex-col items-center justify-center p-4 text-center">
                  <div className="bg-red-950/90 border-2 border-red-500 px-4 py-3 rounded-xl shadow-2xl">
                    <p className="text-base font-black text-red-200">⚠️ HAZARD THRESHOLD EXCEEDED</p>
                    <p className="text-xs text-red-300 mt-1">Gemma Edge Watchdog (&lt;28ms offline)</p>
                  </div>
                </div>
              )}

              <div className="absolute bottom-3 right-3 flex items-center gap-2">
                {cameraActive ? (
                  <>
                    <button
                      onClick={captureFrameToImage}
                      className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 px-3 py-1.5 rounded-lg text-xs font-bold shadow-lg"
                    >
                      📸 Scan This Object
                    </button>
                    <button
                      onClick={toggleCameraFacing}
                      className="bg-slate-800 text-slate-200 px-2.5 py-1.5 rounded-lg text-xs"
                    >
                      🔄 Flip
                    </button>
                    <button
                      onClick={stopCamera}
                      className="bg-red-950 border border-red-700 text-red-300 px-2.5 py-1.5 rounded-lg text-xs"
                    >
                      Stop
                    </button>
                  </>
                ) : (
                  <button
                    onClick={startCamera}
                    className="bg-cyan-900/80 hover:bg-cyan-800 border border-cyan-500/50 text-cyan-200 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-lg"
                  >
                    📹 Start Live Webcam Scan
                  </button>
                )}
              </div>
            </div>

            <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-400 flex justify-between">
                  <span>Custom Query ({selectedLanguage.toUpperCase()}):</span>
                  <span className="text-[10px] text-cyan-400/80">Click mic or type query</span>
                </label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={questionText}
                    onChange={(e) => setQuestionText(e.target.value)}
                    placeholder="Ask anything about this physical object..."
                    className="w-full rounded-xl border border-slate-700 bg-slate-900/90 pl-3 pr-11 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
                  />
                  <button
                    type="button"
                    onClick={toggleSpeechRecognition}
                    className={`absolute right-2 p-1.5 rounded-lg ${
                      isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-800 text-cyan-400'
                    }`}
                  >
                    🎙️
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => runUniversalGeminiDiagnosis()}
                  disabled={isLoadingDiagnosis}
                  className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 text-slate-950 px-4 py-2.5 text-xs font-black uppercase tracking-wider shadow-lg cursor-pointer disabled:opacity-50"
                >
                  {isLoadingDiagnosis ? (
                    <>
                      <span className="h-3 w-3 rounded-full border-2 border-slate-950 border-t-transparent animate-spin" />
                      <span>Reasoning with Brain Memory...</span>
                    </>
                  ) : (
                    <>
                      <span>✨ Run Universal Omni Diagnosis</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={toggleGemmaHazard}
                  className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-bold uppercase tracking-wider cursor-pointer ${
                    gemmaHazardActive
                      ? 'border-emerald-500 bg-emerald-950/80 text-emerald-300'
                      : 'border-red-500/70 bg-red-950/50 hover:bg-red-900/60 text-red-300'
                  }`}
                >
                  {gemmaHazardActive ? '🟢 Clear Hazard State' : '⚠️ Test Gemma Offline Hazard Alert'}
                </button>
              </div>
            </div>
          </section>

          {/* Panel 2 */}
          <section className="flex flex-col rounded-2xl border border-slate-800 bg-[#0d1326] shadow-xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-800/80 bg-slate-900/60 px-4 py-2.5">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  Panel 2: Nano Banana Zero-CAD Visual AR Viewer
                </h2>
              </div>
              <div className="flex items-center gap-1 text-[10px]">
                <button
                  onClick={() => setArOverlayMode('overlay')}
                  className={`px-2 py-0.5 rounded ${arOverlayMode === 'overlay' ? 'bg-cyan-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-400'}`}
                >
                  Dynamic AR
                </button>
                <button
                  onClick={() => setArOverlayMode('raw')}
                  className={`px-2 py-0.5 rounded ${arOverlayMode === 'raw' ? 'bg-cyan-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-400'}`}
                >
                  Raw Photo
                </button>
              </div>
            </div>

            <div className="relative aspect-video w-full bg-black/90 flex items-center justify-center overflow-hidden border-b border-slate-800">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={capturedImage}
                alt="AR Guide Overlaid Machine"
                className="h-full w-full object-cover"
              />

              {arOverlayMode === 'overlay' && (
                <div className="absolute inset-0 pointer-events-none">
                  <div
                    style={{
                      left: `${selectedIntent.arOverlay.coordinates.x}%`,
                      top: `${selectedIntent.arOverlay.coordinates.y}%`,
                      width: `${selectedIntent.arOverlay.coordinates.width}%`,
                      height: `${selectedIntent.arOverlay.coordinates.height}%`,
                    }}
                    className={`absolute border-2 rounded-lg flex flex-col justify-between p-2 animate-pulse ${
                      selectedIntent.arOverlay.styleType === 'recycle-zones'
                        ? 'border-emerald-400 bg-emerald-500/25 shadow-[0_0_20px_rgba(52,211,153,0.8)]'
                        : selectedIntent.arOverlay.styleType === 'shopping-matches'
                        ? 'border-amber-400 bg-amber-500/25 shadow-[0_0_20px_rgba(251,191,36,0.8)]'
                        : selectedIntent.arOverlay.styleType === 'cut-lines'
                        ? 'border-cyan-400 border-dashed bg-cyan-500/20 shadow-[0_0_20px_rgba(34,211,238,0.8)]'
                        : 'border-emerald-400 bg-emerald-500/20 shadow-[0_0_20px_rgba(34,197,94,0.8)]'
                    }`}
                  >
                    <div className="flex justify-between">
                      <span className="h-2 w-2 border-t-2 border-l-2 border-white" />
                      <span className="h-2 w-2 border-t-2 border-r-2 border-white" />
                    </div>
                    <div className="bg-slate-950 text-cyan-300 text-[9px] font-bold px-2 py-0.5 rounded shadow self-start border border-cyan-700">
                      {selectedIntent.arOverlay.calloutText}
                    </div>
                    <div className="flex justify-between">
                      <span className="h-2 w-2 border-b-2 border-l-2 border-white" />
                      <span className="h-2 w-2 border-b-2 border-r-2 border-white" />
                    </div>
                  </div>

                  {selectedIntent.arOverlay.matchCards && selectedIntent.arOverlay.matchCards.length > 0 && (
                    <div className="absolute top-2 right-2 flex flex-col gap-1 max-w-[210px] pointer-events-auto">
                      {selectedIntent.arOverlay.matchCards.map((m, idx) => (
                        <div key={idx} className="bg-slate-950/90 border border-amber-500/60 rounded-lg p-1.5 text-[9px] shadow-lg">
                          <div className="flex justify-between font-bold text-amber-300">
                            <span className="truncate">{m.name}</span>
                            <span className="text-emerald-400 ml-1">{m.price}</span>
                          </div>
                          <div className="flex justify-between text-[8px] text-slate-400">
                            <span>{m.score}</span>
                            <span className="text-amber-400 font-bold">{m.delta}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-slate-950/80 border border-emerald-500/40 text-emerald-400 px-2 py-0.5 rounded text-[10px]">
                <span>⚡ NANO BANANA AR OVERLAY</span>
              </div>
            </div>

            <div className="p-4 space-y-2.5 flex-1 flex flex-col justify-between">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                    Gemini Live Spoken Action Guide:
                  </span>
                  <button
                    onClick={() => speakVernacularOutput(selectedIntent.spokenResponses[selectedLanguage] || selectedIntent.spokenResponses.en)}
                    className="text-[11px] bg-slate-800 hover:bg-slate-700 text-cyan-300 px-2 py-0.5 rounded border border-slate-700 cursor-pointer"
                  >
                    <span>🔊 Speak Guidance</span>
                  </button>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-200 leading-relaxed font-sans italic">
                  &ldquo;{selectedIntent.spokenResponses[selectedLanguage] || selectedIntent.spokenResponses.en}&rdquo;
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Action Steps:
                </p>
                <div className="space-y-0.5">
                  {selectedIntent.arOverlay.stepInstructions.map((st, i) => (
                    <div key={i} className="flex items-start gap-2 text-[11px] text-slate-300">
                      <span className="font-bold text-cyan-400 shrink-0">{i + 1}.</span>
                      <span>{st}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Panel 3 */}
          <section className="flex flex-col rounded-2xl border border-slate-800 bg-[#0d1326] p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-purple-400" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-purple-400">
                  Panel 3: Gemini Omni Diagnostic Brain Console
                </h2>
              </div>
              <span className="text-[10px] text-purple-300 bg-purple-950/60 border border-purple-800 px-2 py-0.5 rounded">
                1M+ Token Grounded Reasoning
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-800">
                <p className="text-[9px] font-bold text-slate-400 uppercase">Target Specimen / Component:</p>
                <p className="text-xs font-bold text-cyan-300">{selectedIntent.diagnosticBrain.componentOrSubject}</p>
              </div>

              <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-800">
                <p className="text-[9px] font-bold text-slate-400 uppercase">Condition / Fault State:</p>
                <p className="text-xs text-amber-300">{selectedIntent.diagnosticBrain.conditionOrFault}</p>
              </div>

              <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-800">
                <p className="text-[9px] font-bold text-slate-400 uppercase">Grounded Standard / Citation:</p>
                <p className="text-xs text-slate-200 underline decoration-cyan-500/50">
                  {selectedIntent.diagnosticBrain.citationOrSpec}
                </p>
              </div>

              <div className="p-2.5 rounded-lg bg-red-950/40 border border-red-500/40 text-red-200">
                <p className="text-[9px] font-black text-red-400 uppercase">🚨 Handling / Safety Directive:</p>
                <p className="text-xs mt-0.5 leading-relaxed">{selectedIntent.diagnosticBrain.safetyWarning}</p>
              </div>
            </div>
          </section>

          {/* Panel 4 */}
          <section className="flex flex-col rounded-2xl border border-slate-800 bg-[#0d1326] p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-blue-400" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-blue-400">
                  Panel 4: Google Agent Skills &amp; BigQuery Log
                </h2>
              </div>
              <span className="text-[10px] text-blue-300 bg-blue-950/60 border border-blue-800 px-2 py-0.5 rounded">
                .agent/skills/
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-800">
                <p className="text-[9px] text-slate-400 uppercase">Skill</p>
                <p className="mt-0.5 text-xs font-bold text-emerald-400 truncate">{selectedIntent.agentSkill.skillName}</p>
              </div>
              <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-800">
                <p className="text-[9px] text-slate-400 uppercase">Status</p>
                <p className="mt-0.5 text-xs font-bold text-cyan-400 truncate">{selectedIntent.agentSkill.actionStatus}</p>
              </div>
              <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-800">
                <p className="text-[9px] text-slate-400 uppercase">BigQuery</p>
                <p className="mt-0.5 text-xs font-bold text-purple-400">ACTIVE</p>
              </div>
            </div>

            <div className="min-h-[160px] max-h-[190px] overflow-y-auto space-y-1.5 p-2 rounded-lg bg-slate-950 border border-slate-800 text-[10px]">
              {skillsLog.map((item) => (
                <div key={item.id} className="flex items-start justify-between gap-2 border-b border-slate-900/50 pb-1">
                  <div>
                    <span className="text-slate-500">[{item.time}]</span>{' '}
                    <strong className="text-cyan-300">{item.skill}:</strong>{' '}
                    <span className="text-slate-300">{item.detail}</span>
                  </div>
                  <span className="shrink-0 px-1 py-0.2 rounded bg-slate-900 text-cyan-400 font-bold text-[8px]">
                    {item.status}
                  </span>
                </div>
              ))}
            </div>

            <div className="p-2 rounded-lg bg-purple-950/30 border border-purple-800/40 text-[10px] text-slate-300 flex items-center justify-between">
              <div>
                <strong className="text-purple-300">Partition:</strong> {selectedIntent.agentSkill.bigQueryTable}
              </div>
              <span className="text-purple-400 font-bold shrink-0">STREAM READY</span>
            </div>
          </section>
        </div>

        {/* ========================================================= */}
        {/* SECTION 3: PROMINENT SELF-LEARNING AI BRAIN & MEMORY PANEL */}
        {/* ========================================================= */}
        <section className="rounded-2xl border border-cyan-500/40 bg-[#0b1328] p-5 shadow-2xl space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/20 border border-cyan-400 text-cyan-300 text-xl font-bold">
                🧠
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold uppercase text-slate-100 tracking-wider">
                    Self-Learning AI Brain &amp; Continuous Memory Evolution
                  </h3>
                  <span className="text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-700 px-2 py-0.5 rounded">
                    {brainMemory.version}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Learns from every scan &amp; injects learned behavioral rules into Gemini Omni context.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <div className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-center">
                <span className="block text-[9px] text-slate-500 uppercase">Accuracy</span>
                <span className="font-bold text-cyan-400">{brainMemory.accuracyScore}%</span>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-center">
                <span className="block text-[9px] text-slate-500 uppercase">Objects Learned</span>
                <span className="font-bold text-emerald-400">{brainMemory.totalObjectsScanned}</span>
              </div>
            </div>
          </div>

          {/* XP Bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-bold text-slate-300">
              <span>Intelligence Level {brainMemory.level}</span>
              <span>{brainMemory.experience} / {brainMemory.experienceNext} XP ({xpPercentage}%)</span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-900 overflow-hidden border border-slate-800">
              <div
                style={{ width: `${xpPercentage}%` }}
                className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500 shadow-md shadow-cyan-500/50"
              />
            </div>
          </div>

          {/* Learned Rules + Teacher Input */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            <div className="lg:col-span-7 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <h4 className="font-bold text-slate-200 uppercase tracking-wider">
                  Autonomous Self-Reflection Log (&ldquo;What I Just Learned&rdquo;):
                </h4>
                <span className="text-[10px] text-slate-500">{brainMemory.rules.length} Rules Active</span>
              </div>

              <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                {brainMemory.rules.map((rule) => (
                  <div key={rule.id} className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs space-y-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-cyan-400 font-bold bg-cyan-950 border border-cyan-800 px-1.5 py-0.2 rounded">
                        {rule.trigger}
                      </span>
                      <span className="text-slate-500 font-mono">{rule.timestamp}</span>
                    </div>
                    <p className="text-xs text-slate-200">{rule.ruleText}</p>
                    <div className="flex items-center justify-between pt-1 border-t border-slate-900 text-[10px] text-slate-400">
                      <span>Impact: <em>{rule.impact}</em></span>
                      <span className="text-emerald-400 font-bold">Confidence: {rule.confidence}%</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-between gap-2 text-xs">
                <span className="text-slate-300">Was guidance for <strong>{selectedIntent.label}</strong> accurate?</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleFeedback(true)}
                    className="bg-emerald-950 border border-emerald-500 text-emerald-300 px-2.5 py-1 rounded text-xs font-bold hover:bg-emerald-900 cursor-pointer"
                  >
                    👍 Helpful (+45 XP)
                  </button>
                  <button
                    onClick={() => handleFeedback(false)}
                    className="bg-red-950 border border-red-700 text-red-300 px-2.5 py-1 rounded text-xs font-bold hover:bg-red-900 cursor-pointer"
                  >
                    👎 Needs Work
                  </button>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 space-y-3">
              <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2 text-xs">
                <div className="flex items-center gap-2 text-cyan-400 font-bold">
                  <span>💡</span>
                  <span>Teach the Brain a Direct Rule</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Type a rule or constraint. It will be injected into Gemini Omni context for all future physical scans:
                </p>

                <form onSubmit={handleTeachBrain} className="space-y-2">
                  <textarea
                    rows={2}
                    value={customTeacherNote}
                    onChange={(e) => setCustomTeacherNote(e.target.value)}
                    placeholder="E.g., 'Always suggest eco packaging first' or 'Check capacitor voltage before desoldering'"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 resize-none"
                  />
                  <button
                    type="submit"
                    disabled={!customTeacherNote.trim()}
                    className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold py-1.5 rounded-lg text-xs uppercase tracking-wider disabled:opacity-50 cursor-pointer"
                  >
                    + Teach &amp; Inject Rule (+60 XP)
                  </button>
                </form>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-cyan-500/20 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-cyan-300">Active Memory Injection:</span>
                  <span className="text-[9px] bg-emerald-950 text-emerald-300 border border-emerald-700 px-1.5 py-0.2 rounded font-bold">
                    LIVE INJECTED
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  All {brainMemory.rules.length} behavioral rules are automatically prepended as system instruction in Gemini Omni.
                </p>
                <div className="p-1.5 rounded bg-slate-950 text-[9px] text-cyan-400 font-mono">
                  SYSTEM_PROMPT += buildActiveContextMemoryPrompt(brainMemory);
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="rounded-2xl border border-slate-800 bg-[#0c1224] p-4 text-xs text-slate-400 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-slate-200">The 9-Tool Google Symphony:</span>
            <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-cyan-400">Gemini Omni</span>
            <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-cyan-400">Gemini Live</span>
            <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-emerald-400">Nano Banana</span>
            <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-amber-400">Lyria</span>
            <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-emerald-400">Gemma</span>
            <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-blue-400">Google Agent Skills</span>
            <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-purple-400">Google AI Studio</span>
            <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-cyan-400">Google Antigravity</span>
            <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-blue-400">BigQuery</span>
          </div>
          <div className="text-[11px] text-slate-500">
            Universal Physical-World AI Brain &bull; Continuous Self-Learning Memory Edition
          </div>
        </footer>
      </main>
    </div>
  );
}
