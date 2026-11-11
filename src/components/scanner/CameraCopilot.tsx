'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  objectInfo?: {
    name: string;
    category: string;
    condition: string;
    issue: string;
    solution: string[];
    safetyWarning?: string | null;
  };
  box?: {
    x: number;
    y: number;
    width: number;
    height: number;
    label: string;
  };
  followUps?: string[];
}

export function CameraCopilot() {
  // Settings & Keys
  const [apiKey, setApiKey] = useState<string>('');
  const [language, setLanguage] = useState<'en' | 'hinglish' | 'hi' | 'ta' | 'mr'>('en');
  const [autoVoice, setAutoVoice] = useState<boolean>(true);

  // Camera State
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('environment');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  // Conversation & AI State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentPrompt, setCurrentPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeBox, setActiveBox] = useState<{ x: number; y: number; width: number; height: number; label: string } | null>(null);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Load API key from local storage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('kriyaos_google_ai_key');
      if (saved) setApiKey(saved);
    } catch {}
  }, []);

  const handleApiKeyChange = (val: string) => {
    setApiKey(val);
    try {
      localStorage.setItem('kriyaos_google_ai_key', val);
    } catch {}
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Voice Talk-Back using Web Speech API
  const speakText = useCallback((textToSpeak: string) => {
    if (!autoVoice || typeof window === 'undefined' || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const cleanText = textToSpeak.replace(/[*_#`]/g, '').trim();
      const utterance = new SpeechSynthesisUtterance(cleanText);

      const langMap: Record<string, string> = {
        en: 'en-US',
        hinglish: 'hi-IN',
        hi: 'hi-IN',
        ta: 'ta-IN',
        mr: 'mr-IN',
      };
      utterance.lang = langMap[language] || 'en-US';
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      window.speechSynthesis.speak(utterance);
    } catch {}
  }, [autoVoice, language]);

  // Camera Management
  const startCamera = async () => {
    setErrorMessage(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setErrorMessage('Camera access is not supported in this browser.');
      return;
    }
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: cameraFacing }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
    } catch (err: any) {
      setErrorMessage(`Camera error: ${err?.message || 'Permission denied'}. You can still upload a photo below.`);
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

  // Capture video frame to high-res data URL
  const captureFrame = (): string | null => {
    const video = videoRef.current;
    if (!video) return null;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.9);
  };

  // Handle Photo Upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (evt.target?.result) {
          const imgUrl = evt.target.result as string;
          setCapturedImage(imgUrl);
          stopCamera();
          // Trigger scan on the uploaded image
          processScanWithGemini(imgUrl, 'Analyze this image: what is this object, what issues exist, and how do I solve them?');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Microphone Speech Recognition
  const toggleSpeechRecognition = () => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition =
      (window as unknown as { SpeechRecognition?: any; webkitSpeechRecognition?: any }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: any }).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Please type your message.');
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

      const langMap: Record<string, string> = {
        en: 'en-US',
        hinglish: 'hi-IN',
        hi: 'hi-IN',
        ta: 'ta-IN',
        mr: 'mr-IN',
      };
      recognition.lang = langMap[language] || 'en-US';

      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setCurrentPrompt(transcript);
          // If camera is open or image captured, send directly
          handleSendMessage(transcript);
        }
        setIsListening(false);
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);

      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  // Primary Action: Scan Camera & Process with Google Gemini
  const handleScanAndSolve = () => {
    let frameUrl = capturedImage;
    if (cameraActive) {
      frameUrl = captureFrame();
      if (frameUrl) {
        setCapturedImage(frameUrl);
        stopCamera();
      }
    }

    if (!frameUrl) {
      alert('Please start the camera or upload a photo to scan!');
      return;
    }

    processScanWithGemini(
      frameUrl,
      currentPrompt.trim() || 'Scan this object: identify what it is, detect any problems or conditions, and provide an actionable step-by-step solution.'
    );
  };

  // Send message or follow-up to Google Gemini
  const processScanWithGemini = async (imagePayload: string | null, textPrompt: string) => {
    setErrorMessage(null);
    setIsLoading(true);

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: ChatMessage = {
      id: Math.random().toString(36).substring(2, 9),
      sender: 'user',
      text: textPrompt,
      timestamp: time,
    };

    setMessages((prev) => [...prev, userMsg]);
    setCurrentPrompt('');

    // Prepare history for multi-turn conversational context
    const history = messages.map((m) => ({
      role: m.sender === 'user' ? 'user' : 'model',
      text: m.text,
    }));

    try {
      const res = await fetch('/api/vision-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: imagePayload,
          prompt: textPrompt,
          history,
          apiKey: apiKey.trim(),
          language,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.message || 'Failed to process image with Gemini.');
      }

      const info = data.data;

      // Extract bounding box if returned
      if (info.box) {
        setActiveBox(info.box);
      }

      const assistantMsg: ChatMessage = {
        id: Math.random().toString(36).substring(2, 9),
        sender: 'assistant',
        text: info.spokenSummary || (Array.isArray(info.solution) ? info.solution.join(' ') : String(info.solution)),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        objectInfo: {
          name: info.objectIdentified || 'Detected Object',
          category: info.category || 'Physical Hardware',
          condition: info.condition || 'Observed in camera',
          issue: info.issue || 'Identified state',
          solution: Array.isArray(info.solution) ? info.solution : [String(info.solution)],
          safetyWarning: info.safetyWarning,
        },
        box: info.box,
        followUps: info.followUpSuggestions,
      };

      setMessages((prev) => [...prev, assistantMsg]);

      // Talk back out loud to the user!
      if (assistantMsg.text) {
        speakText(assistantMsg.text);
      }

    } catch (err: any) {
      const errorMsg = err?.message || 'Error communicating with Google Gemini.';
      setErrorMessage(errorMsg);

      setMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(36).substring(2, 9),
          sender: 'assistant',
          text: `⚠️ ${errorMsg} Please check your Google AI Studio API Key in the top header.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = (textToSend?: string) => {
    const text = textToSend || currentPrompt;
    if (!text.trim() && !capturedImage) return;

    processScanWithGemini(capturedImage, text.trim() || 'Tell me more about how to fix this.');
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col font-sans">
      {/* ----------------------------------------------------------- */}
      {/* HEADER                                                      */}
      {/* ----------------------------------------------------------- */}
      <header className="sticky top-0 z-30 border-b border-cyan-500/20 bg-[#090e1c]/95 backdrop-blur-md px-4 py-3 shadow-lg">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-slate-950 font-black text-xl shadow-md shadow-cyan-500/30">
              ⚡
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold tracking-wider text-cyan-400 text-base uppercase font-mono">
                  KRIYA-OS
                </span>
                <span className="bg-cyan-950 text-cyan-300 border border-cyan-700/50 text-[10px] font-mono px-2 py-0.5 rounded-full">
                  LIVE VISION COPILOT
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Point Camera &bull; Detect Anything &bull; Google Gemini Live Voice Dialogue
              </p>
            </div>
          </div>

          {/* Controls: Voice Toggle, Language, Google Key */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Auto Voice Speak Toggle */}
            <button
              onClick={() => {
                const next = !autoVoice;
                setAutoVoice(next);
                if (!next && typeof window !== 'undefined' && window.speechSynthesis) {
                  window.speechSynthesis.cancel();
                }
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                autoVoice
                  ? 'bg-cyan-950 border-cyan-500 text-cyan-300 shadow-sm shadow-cyan-950'
                  : 'bg-slate-900 border-slate-700 text-slate-400'
              }`}
              title="Toggle automatic spoken talk-back"
            >
              <span>{autoVoice ? '🔊 Voice Talk-Back: ON' : '🔇 Voice: MUTE'}</span>
            </button>

            {/* Language Selector */}
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as any)}
              className="bg-slate-900 border border-slate-700 text-xs rounded-full px-3 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-400 cursor-pointer font-medium"
            >
              <option value="en">English (Global)</option>
              <option value="hinglish">Hinglish (Hindi + English)</option>
              <option value="hi">Hindi (हिंदी)</option>
              <option value="ta">Tamil (தமிழ்)</option>
              <option value="mr">Marathi (मराठी)</option>
            </select>

            {/* Google AI Studio API Key Input */}
            <div className="relative flex items-center">
              <input
                type="password"
                placeholder="Google AI Studio Key"
                value={apiKey}
                onChange={(e) => handleApiKeyChange(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-xs rounded-full pl-3 pr-8 py-1.5 w-40 sm:w-52 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 font-mono"
              />
              <span className="absolute right-2.5 text-[10px] font-bold text-cyan-400 font-mono">
                {apiKey ? '✓' : 'KEY'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* ----------------------------------------------------------- */}
      {/* MAIN VIEWPORT: CAMERA SCANNER (LEFT) + LIVE CHAT (RIGHT)   */}
      {/* ----------------------------------------------------------- */}
      <main className="flex-1 mx-auto max-w-7xl w-full p-3 sm:p-5 grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        
        {/* ========================================================= */}
        {/* LEFT COLUMN: LIVE CAMERA VIEWPORT & CAPTURE (5 COLS)      */}
        {/* ========================================================= */}
        <section className="lg:col-span-5 flex flex-col rounded-2xl border border-slate-800 bg-[#0d1326] shadow-xl overflow-hidden justify-between">
          
          {/* Viewport Header */}
          <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/70 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${cameraActive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">
                {cameraActive ? 'Live Camera Feed' : capturedImage ? 'Inspected Snapshot' : 'Camera Standby'}
              </span>
            </div>
            {cameraActive && (
              <span className="text-[10px] text-cyan-400 font-mono">READY TO SCAN</span>
            )}
          </div>

          {/* Viewport Frame */}
          <div className="relative aspect-[4/3] w-full bg-black flex items-center justify-center overflow-hidden border-b border-slate-800">
            {cameraActive ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="h-full w-full object-cover"
              />
            ) : capturedImage ? (
              <div className="relative h-full w-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={capturedImage}
                  alt="Scanned Object"
                  className="h-full w-full object-contain bg-black"
                />

                {/* Dynamic Glowing Bounding Box over target */}
                {activeBox && (
                  <div
                    style={{
                      left: `${activeBox.x}%`,
                      top: `${activeBox.y}%`,
                      width: `${activeBox.width}%`,
                      height: `${activeBox.height}%`,
                    }}
                    className="absolute border-2 border-cyan-400 bg-cyan-500/20 shadow-[0_0_20px_rgba(34,211,238,0.8)] rounded-lg flex flex-col justify-between p-1.5 animate-pulse"
                  >
                    <div className="flex justify-between">
                      <span className="h-2 w-2 border-t-2 border-l-2 border-white" />
                      <span className="h-2 w-2 border-t-2 border-r-2 border-white" />
                    </div>
                    <span className="bg-slate-950 text-cyan-300 border border-cyan-600 text-[9px] font-mono px-1.5 py-0.5 rounded self-start shadow font-bold">
                      {activeBox.label || 'ANALYZED REGION'}
                    </span>
                    <div className="flex justify-between">
                      <span className="h-2 w-2 border-b-2 border-l-2 border-white" />
                      <span className="h-2 w-2 border-b-2 border-r-2 border-white" />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-6 text-center space-y-3">
                <div className="h-14 w-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-3xl">
                  📷
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-200">Point Camera at Any Physical Object</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs">
                    Hold broken equipment, tools, wires, food packets, gadgets, or household items in front of your camera.
                  </p>
                </div>
                <button
                  onClick={startCamera}
                  className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-cyan-500/20 cursor-pointer"
                >
                  Start Camera Now
                </button>
              </div>
            )}

            {/* Scanning Radar Overlay during loading */}
            {isLoading && (
              <div className="absolute inset-0 bg-cyan-950/40 backdrop-blur-[2px] flex flex-col items-center justify-center p-4">
                <div className="h-16 w-16 rounded-full border-4 border-cyan-400 border-t-transparent animate-spin shadow-2xl" />
                <p className="text-xs font-bold text-cyan-300 mt-3 font-mono tracking-wider animate-pulse">
                  GOOGLE GEMINI ANALYZING SCENE...
                </p>
              </div>
            )}
          </div>

          {/* Camera Action Buttons */}
          <div className="p-4 space-y-3 bg-[#0d1326]">
            {cameraActive ? (
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={handleScanAndSolve}
                  disabled={isLoading}
                  className="col-span-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 text-slate-950 font-black py-3 px-4 rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <span>📸 SCAN &amp; SOLVE WITH GEMINI</span>
                </button>
                <button
                  onClick={toggleCameraFacing}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs flex items-center justify-center gap-1 cursor-pointer"
                >
                  <span>🔄 Flip</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={startCamera}
                  className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold py-2.5 px-4 rounded-xl text-xs uppercase tracking-wider shadow-md cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>📹 {capturedImage ? 'Retake Camera Photo' : 'Turn On Camera'}</span>
                </button>
                <label className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold py-2.5 px-4 rounded-xl text-xs uppercase tracking-wider cursor-pointer flex items-center justify-center gap-2 text-center">
                  <span>📁 Upload Photo</span>
                  <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                </label>
              </div>
            )}

            {capturedImage && !cameraActive && (
              <button
                onClick={handleScanAndSolve}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 text-slate-950 font-black py-2.5 px-4 rounded-xl text-xs uppercase tracking-wider shadow-lg cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <span>✨ Re-Scan This Image</span>
              </button>
            )}

            {errorMessage && (
              <div className="p-3 rounded-xl bg-red-950/70 border border-red-500/50 text-red-200 text-xs">
                {errorMessage}
              </div>
            )}
          </div>
        </section>

        {/* ========================================================= */}
        {/* RIGHT COLUMN: REAL-TIME CONVERSATION & SOLUTIONS (7 COLS) */}
        {/* ========================================================= */}
        <section className="lg:col-span-7 flex flex-col rounded-2xl border border-slate-800 bg-[#0d1326] shadow-xl overflow-hidden h-[600px] lg:h-auto justify-between">
          
          {/* Chat Header */}
          <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/70 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <span className="text-lg">🤖</span>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono">
                Conversational Diagnostic Assistant
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400 font-mono">POWERED BY GOOGLE AI</span>
              <button
                onClick={() => setMessages([])}
                className="text-[10px] text-slate-400 hover:text-slate-200 underline font-mono cursor-pointer"
              >
                Clear History
              </button>
            </div>
          </div>

          {/* Conversation Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-3">
                <div className="h-12 w-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-2xl text-cyan-400">
                  💬
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-200">No Scans Yet</h4>
                  <p className="text-xs text-slate-400 max-w-sm mt-1 leading-relaxed">
                    Point your camera at broken equipment, a circuit board, a tool, or any household item and click <strong>SCAN &amp; SOLVE</strong>. The AI will detect the problem, speak the solution, and chat with you!
                  </p>
                </div>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} space-y-1.5`}
                >
                  <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                    <span>{msg.sender === 'user' ? 'You' : 'KriyaOS AI'}</span>
                    <span>&bull;</span>
                    <span>{msg.timestamp}</span>
                  </div>

                  {msg.sender === 'user' ? (
                    <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-3.5 text-xs shadow-md">
                      {msg.text}
                    </div>
                  ) : (
                    <div className="max-w-[92%] rounded-2xl rounded-tl-sm bg-slate-900 border border-slate-800 text-slate-200 p-4 text-xs space-y-3 shadow-lg">
                      {/* Structured Object Card if present */}
                      {msg.objectInfo && (
                        <div className="rounded-xl border border-cyan-500/30 bg-slate-950/70 p-3 space-y-2.5">
                          <div className="flex flex-wrap items-center justify-between gap-1 border-b border-slate-800 pb-2">
                            <div>
                              <span className="text-[10px] uppercase font-mono text-cyan-400 font-bold block">
                                Identified Object:
                              </span>
                              <span className="text-sm font-bold text-white">
                                {msg.objectInfo.name}
                              </span>
                            </div>
                            <span className="bg-cyan-950 text-cyan-300 border border-cyan-800 px-2 py-0.5 rounded text-[10px] font-mono">
                              {msg.objectInfo.category}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                            <div>
                              <span className="text-slate-400 block text-[9px] uppercase font-mono">Condition:</span>
                              <span className="text-slate-200">{msg.objectInfo.condition}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[9px] uppercase font-mono">Diagnosed Issue:</span>
                              <span className="text-amber-300 font-semibold">{msg.objectInfo.issue}</span>
                            </div>
                          </div>

                          {/* Safety Warning Badge */}
                          {msg.objectInfo.safetyWarning && (
                            <div className="p-2 rounded-lg bg-red-950/60 border border-red-500/40 text-red-200 text-[11px] flex items-start gap-1.5">
                              <span className="text-sm">⚠️</span>
                              <span>{msg.objectInfo.safetyWarning}</span>
                            </div>
                          )}

                          {/* Step-by-Step Solution */}
                          {msg.objectInfo.solution.length > 0 && (
                            <div className="pt-1 space-y-1">
                              <span className="text-[10px] uppercase font-mono text-emerald-400 font-bold block">
                                Recommended Action Steps:
                              </span>
                              <div className="space-y-1 text-slate-200">
                                {msg.objectInfo.solution.map((step, idx) => (
                                  <div key={idx} className="flex items-start gap-1.5 text-[11px] leading-relaxed">
                                    <span className="text-cyan-400 font-bold">{idx + 1}.</span>
                                    <span>{step}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Main text message / Spoken Summary */}
                      <div className="text-xs leading-relaxed text-slate-200 whitespace-pre-wrap">
                        {msg.text}
                      </div>

                      {/* Voice Replay Button */}
                      <div className="flex items-center gap-2 pt-1 border-t border-slate-800/60">
                        <button
                          onClick={() => speakText(msg.text)}
                          className="flex items-center gap-1 text-[10px] font-mono text-cyan-400 hover:text-cyan-300 bg-slate-950 px-2 py-1 rounded border border-slate-800 cursor-pointer"
                        >
                          <span>🔊 Listen to Voice</span>
                        </button>
                      </div>

                      {/* Suggested Follow-Up Questions */}
                      {msg.followUps && msg.followUps.length > 0 && (
                        <div className="pt-1 space-y-1.5">
                          <span className="text-[10px] uppercase font-mono text-slate-400 font-semibold block">
                            Suggested Follow-Ups:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {msg.followUps.map((question, i) => (
                              <button
                                key={i}
                                onClick={() => handleSendMessage(question)}
                                className="text-[10px] text-cyan-300 bg-cyan-950/60 hover:bg-cyan-900 border border-cyan-800/80 px-2.5 py-1 rounded-full transition-all text-left cursor-pointer"
                              >
                                {question} &rarr;
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}

            {isLoading && (
              <div className="flex items-center gap-2 p-3 text-xs text-cyan-400 font-mono animate-pulse">
                <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
                <span>Gemini is diagnosing the image &amp; preparing solution...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* User Input & Follow-up Controls */}
          <div className="p-3 border-t border-slate-800 bg-slate-900/60 space-y-2">
            <div className="flex items-center gap-2">
              <div className="relative flex-1 flex items-center">
                <input
                  type="text"
                  value={currentPrompt}
                  onChange={(e) => setCurrentPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder={
                    capturedImage
                      ? "Ask a follow-up or describe what you want to do with this object..."
                      : "Scan an object above or ask any physical-world repair question..."
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 pl-3 pr-11 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
                />
                <button
                  type="button"
                  onClick={toggleSpeechRecognition}
                  className={`absolute right-2 p-1.5 rounded-lg transition-all ${
                    isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-800 text-cyan-400 hover:bg-slate-700'
                  }`}
                  title="Speak your question using microphone"
                >
                  🎙️
                </button>
              </div>

              <button
                type="button"
                onClick={() => handleSendMessage()}
                disabled={isLoading || (!currentPrompt.trim() && !capturedImage)}
                className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider shadow-md disabled:opacity-50 cursor-pointer shrink-0"
              >
                Send
              </button>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}

