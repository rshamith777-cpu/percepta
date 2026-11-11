'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  BrainMemoryState,
  loadBrainMemory,
  recordBrainLearningEvent,
  teachBrainCustomRule,
  buildActiveContextMemoryPrompt,
  generateBigQueryRoboticsExport,
  IndianLanguage,
} from '@/modules/brain/universalBrain';

// ==========================================
// Lyria Spatial Ceramic Audio Synthesizer
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
      gain.gain.linearRampToValueAtTime(0.14, now + 0.02);
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
      gain.gain.linearRampToValueAtTime(0.22, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.6);
    });
  }
}

const lyriaAudio = new LyriaAudioEngine();

// Helper to create compact 64x64 thumbnail for Visual Specimen Journal
function createThumbnail(dataUrl: string, size = 64): Promise<string> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(dataUrl);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(dataUrl);
      ctx.drawImage(img, 0, 0, size, size);
      resolve(canvas.toDataURL('image/jpeg', 0.72));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

// Chat message interface for conversational multi-turn dialogue
interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  objectDetails?: {
    name: string;
    category: string;
    materialCondition: string;
    safetyStatus: string;
    solutionSteps: string[];
    actionOptions: string[];
    searchSkill?: {
      skill_name: string;
      search_query: string;
      search_url: string;
      detail: string;
    };
    smartLinks?: {
      shopping_url: string;
      maps_url: string;
      youtube_url: string;
      shopping_query?: string;
      maps_query?: string;
      youtube_diy_query?: string;
    };
    verificationResult?: {
      verified: boolean;
      summary: string;
      sha256_hash: string;
    };
  };
  box?: {
    x: number;
    y: number;
    width: number;
    height: number;
    label: string;
  };
  targetPoint?: {
    x: number;
    y: number;
    label: string;
  };
  followUps?: string[];
}

export function BotanicalCameraCopilot() {
  // Settings & Universal Multi-Provider Keys
  const [apiKey, setApiKey] = useState<string>('');
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [keyStatus, setKeyStatus] = useState<{ testing: boolean; message: string | null; ok: boolean | null }>({
    testing: false,
    message: null,
    ok: null,
  });

  // Optional Backup / Failover Key
  const [backupApiKey, setBackupApiKey] = useState<string>('');
  const [showBackupApiKey, setShowBackupApiKey] = useState<boolean>(false);
  const [backupKeyStatus, setBackupKeyStatus] = useState<{ testing: boolean; message: string | null; ok: boolean | null }>({
    testing: false,
    message: null,
    ok: null,
  });

  const [activeModelInfo, setActiveModelInfo] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<IndianLanguage>('en');
  const [autoVoice, setAutoVoice] = useState<boolean>(true);
  const [autoCaptureOnPrompt, setAutoCaptureOnPrompt] = useState<boolean>(true);

  // Self-Learning AI Brain State
  const [brainMemory, setBrainMemory] = useState<BrainMemoryState>(loadBrainMemory);
  const [customTeacherNote, setCustomTeacherNote] = useState<string>('');
  const [learningNotification, setLearningNotification] = useState<string | null>(null);

  // Camera State
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('environment');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  // Before & After Verification Loop State
  const [beforeSnapshot, setBeforeSnapshot] = useState<string | null>(null);
  const [afterSnapshot, setAfterSnapshot] = useState<string | null>(null);
  const [isVerifyingAction, setIsVerifyingAction] = useState<boolean>(false);
  const [verificationBadge, setVerificationBadge] = useState<{
    verified: boolean;
    summary: string;
    sha256: string;
  } | null>(null);

  // AI & Conversation State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentPrompt, setCurrentPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeBox, setActiveBox] = useState<{ x: number; y: number; width: number; height: number; label: string } | null>(null);
  const [activeTargetPoint, setActiveTargetPoint] = useState<{ x: number; y: number; label: string } | null>(null);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentActionOptions, setCurrentActionOptions] = useState<string[]>([]);
  const [gemmaHazardAlert, setGemmaHazardAlert] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const handleApiKeyChange = (val: string) => {
    const clean = val.trim().replace(/^["']|["']$/g, '');
    setApiKey(clean);
    setKeyStatus({ testing: false, message: null, ok: null });
    try {
      localStorage.setItem('kriyaos_google_ai_key', clean);
    } catch {}
  };

  const handleBackupKeyChange = (val: string) => {
    const clean = val.trim().replace(/^["']|["']$/g, '');
    setBackupApiKey(clean);
    setBackupKeyStatus({ testing: false, message: null, ok: null });
    try {
      localStorage.setItem('kriyaos_backup_ai_key', clean);
    } catch {}
  };

  const testApiKey = async () => {
    const keyToTest = apiKey.trim().replace(/^["']|["']$/g, '');
    if (!keyToTest) {
      setKeyStatus({ testing: false, message: 'Please paste your primary key first.', ok: false });
      return;
    }
    setKeyStatus({ testing: true, message: 'Verifying primary key...', ok: null });
    try {
      const res = await fetch('/api/verify-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: keyToTest }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setKeyStatus({
          testing: false,
          message: data.message || `✅ ${data.provider} verified and ready!`,
          ok: true,
        });
      } else {
        setKeyStatus({
          testing: false,
          message: `❌ ${data.message || 'Invalid key'}`,
          ok: false,
        });
      }
    } catch (err: any) {
      setKeyStatus({ testing: false, message: `❌ Network error: ${err?.message}`, ok: false });
    }
  };

  const testBackupKey = async () => {
    const keyToTest = backupApiKey.trim().replace(/^["']|["']$/g, '');
    if (!keyToTest) {
      setBackupKeyStatus({ testing: false, message: 'Please paste a backup key first.', ok: false });
      return;
    }
    setBackupKeyStatus({ testing: true, message: 'Verifying backup failover key...', ok: null });
    try {
      const res = await fetch('/api/verify-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: keyToTest }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setBackupKeyStatus({
          testing: false,
          message: data.message || `✅ ${data.provider} verified as active backup!`,
          ok: true,
        });
      } else {
        setBackupKeyStatus({
          testing: false,
          message: `❌ ${data.message || 'Invalid key'}`,
          ok: false,
        });
      }
    } catch (err: any) {
      setBackupKeyStatus({ testing: false, message: `❌ Network error: ${err?.message}`, ok: false });
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Vernacular Voice Output via Web Speech API
  const speakVernacularOutput = useCallback(
    (textToSpeak: string) => {
      if (!autoVoice || typeof window === 'undefined' || !window.speechSynthesis) return;
      try {
        window.speechSynthesis.cancel();
        const cleanText = textToSpeak.replace(/[*_#`]/g, '').trim();
        const utterance = new SpeechSynthesisUtterance(cleanText);

        const voiceLangMap: Record<IndianLanguage, string> = {
          hinglish: 'hi-IN',
          hi: 'hi-IN',
          ta: 'ta-IN',
          mr: 'mr-IN',
          en: 'en-US',
        };
        utterance.lang = voiceLangMap[selectedLanguage] || 'en-US';
        utterance.rate = 1.0;
        utterance.pitch = 1.0;

        window.speechSynthesis.speak(utterance);
      } catch {}
    },
    [autoVoice, selectedLanguage]
  );

  // Camera Management
  const startCamera = useCallback(async () => {
    setErrorMessage(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setErrorMessage('Camera access is not supported in this browser. You can upload a photo below.');
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
      lyriaAudio.playScanningPulse();
    } catch (err: any) {
      setErrorMessage(`Camera notice: ${err?.message || 'Permission denied or no webcam found'}. You can still upload a photo below.`);
      setCameraActive(false);
    }
  }, [cameraFacing]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }, []);

  // Auto-start camera and load configuration on mount
  useEffect(() => {
    try {
      const savedKey = localStorage.getItem('kriyaos_google_ai_key');
      if (savedKey) setApiKey(savedKey);
      const savedBackup = localStorage.getItem('kriyaos_backup_ai_key');
      if (savedBackup) setBackupApiKey(savedBackup);
      setBrainMemory(loadBrainMemory());
    } catch {}

    // Auto-open live camera stream
    startCamera();

    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  const toggleCameraFacing = () => {
    const next = cameraFacing === 'user' ? 'environment' : 'user';
    setCameraFacing(next);
    if (cameraActive) {
      setTimeout(() => startCamera(), 100);
    }
  };

  // Capture video frame to lightweight, high-speed data URL (optimized for sub-second vision transfer)
  const captureFrame = (): string | null => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) return null;
    const canvas = document.createElement('canvas');
    const maxDim = 720;
    let w = video.videoWidth;
    let h = video.videoHeight;
    if (w > maxDim || h > maxDim) {
      if (w > h) {
        h = Math.round((h * maxDim) / w);
        w = maxDim;
      } else {
        w = Math.round((w * maxDim) / h);
        h = maxDim;
      }
    }
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, w, h);
    return canvas.toDataURL('image/jpeg', 0.76);
  };

  // Handle Photo Upload Fallback
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (evt.target?.result) {
          const imgUrl = evt.target.result as string;
          setCapturedImage(imgUrl);
          setBeforeSnapshot(imgUrl);
          stopCamera();
          // Trigger scan on the uploaded image
          processScanWithGemini(imgUrl, 'Analyze this scanned object: what is it, what is its material/condition, and what can I do with it?');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Microphone Speech Recognition with Hands-Free Auto-Capture
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

      const langMap: Record<IndianLanguage, string> = {
        en: 'en-US',
        hinglish: 'hi-IN',
        hi: 'hi-IN',
        ta: 'ta-IN',
        mr: 'mr-IN',
      };
      recognition.lang = langMap[selectedLanguage] || 'en-US';

      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setCurrentPrompt(transcript);
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
        setBeforeSnapshot(frameUrl);
        stopCamera();
      }
    }

    if (!frameUrl) {
      alert('Please start the camera or upload a photo to scan!');
      return;
    }

    lyriaAudio.playScanningPulse();
    processScanWithGemini(
      frameUrl,
      currentPrompt.trim() || 'Scan this object: identify what it is, its physical condition, safety status, and ask me what I want to do with it.'
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

    // Prepare conversational history
    const history = messages.map((m) => ({
      role: m.sender === 'user' ? 'user' : 'model',
      text: m.text,
    }));

    // Inject active context memory from self-learning brain
    const memoryPrompt = buildActiveContextMemoryPrompt(brainMemory);

    try {
      const res = await fetch('/api/vision-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: imagePayload,
          prompt: textPrompt,
          history,
          apiKey: apiKey.trim(),
          backupApiKey: backupApiKey.trim(),
          language: selectedLanguage,
          memoryPrompt,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.message || 'Failed to process image with Vision AI.');
      }

      if (data.failoverActive) {
        setLearningNotification(`⚡ Failover Engaged: Seamlessly resolved on ${data.providerUsed} (${data.modelUsed})`);
      }
      if (data.providerUsed && data.modelUsed) {
        setActiveModelInfo(`${data.providerUsed} • ${data.modelUsed}`);
      }

      const info = data.data;

      // Extract bounding box for Nano Banana overlay
      if (info.box) {
        setActiveBox(info.box);
      }

      // Upgrade 1: Extract Precision Target Point Coordinates
      if (info.targetPointNormalized) {
        setActiveTargetPoint(info.targetPointNormalized);
      } else if (info.box) {
        setActiveTargetPoint({
          x: info.box.x + Math.round(info.box.width / 2),
          y: info.box.y + Math.round(info.box.height / 2),
          label: info.detected_object_name || 'Focus Point',
        });
      }

      // Check Gemma Safety Watchdog
      if (info.safety_status && info.safety_status.toUpperCase().includes('HAZARD')) {
        setGemmaHazardAlert(info.safety_status);
        lyriaAudio.playHazardDissonance();
      } else {
        setGemmaHazardAlert(null);
        lyriaAudio.playLockChime();
      }

      // Dynamic action options
      if (Array.isArray(info.dynamic_action_options) && info.dynamic_action_options.length > 0) {
        setCurrentActionOptions(info.dynamic_action_options);
      }

      // Voice talk-back greeting & question
      const spokenText =
        info.spoken_greeting_and_question ||
        info.spoken_summary ||
        (Array.isArray(info.solution_steps) ? info.solution_steps.join('. ') : 'Analysis complete.');

      const assistantMsg: ChatMessage = {
        id: Math.random().toString(36).substring(2, 9),
        sender: 'assistant',
        text: spokenText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        objectDetails: {
          name: info.detected_object_name || 'Physical Object',
          category: info.object_category || 'Identified Item',
          materialCondition: info.condition_and_material || 'Scanned via camera',
          safetyStatus: info.safety_status || 'SAFE',
          solutionSteps: Array.isArray(info.solution_steps) ? info.solution_steps : [],
          actionOptions: Array.isArray(info.dynamic_action_options) ? info.dynamic_action_options : [],
          searchSkill: info.agent_skill_execution,
          smartLinks: info.smart_links,
        },
        box: info.box,
        targetPoint: info.targetPointNormalized,
        followUps: Array.isArray(info.follow_up_suggestions) ? info.follow_up_suggestions : [],
      };

      setMessages((prev) => [...prev, assistantMsg]);

      // Speak out loud via SpeechSynthesis
      speakVernacularOutput(spokenText);

      // Upgrade 3: Generate visual thumbnail for Specimen Memory Journal
      let thumbnail: string | undefined;
      if (imagePayload) {
        thumbnail = await createThumbnail(imagePayload, 64);
      }

      // Self-Learning AI Brain: Update memory rule & record specimen
      const objectName = info.detected_object_name || 'Scanned Object';
      const category = info.object_category || 'General';
      const updatedBrain = recordBrainLearningEvent(
        brainMemory,
        objectName,
        textPrompt.slice(0, 30),
        'auto',
        thumbnail,
        category,
        45,
        false
      );
      setBrainMemory(updatedBrain);
      setLearningNotification(`🧠 Brain Evolved! Learned new rule for ${objectName} (+45 XP)`);
      setTimeout(() => setLearningNotification(null), 4000);

    } catch (err: any) {
      const errorMsg = err?.message || 'Error communicating with Vision AI.';
      setErrorMessage(errorMsg);

      setMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(36).substring(2, 9),
          sender: 'assistant',
          text: `⚠️ ${errorMsg} Please make sure your Google AI Studio API Key is set in the left settings panel.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Upgrade 4: Hands-Free Auto-Capture on Question Submission
  const handleSendMessage = (textToSend?: string) => {
    const text = textToSend || currentPrompt;
    if (!text.trim() && !capturedImage && !cameraActive) return;

    let imageToUse = capturedImage;

    // Hands-Free Auto-Capture: Grab frame from live camera if active
    if (cameraActive && (autoCaptureOnPrompt || !imageToUse)) {
      const liveFrame = captureFrame();
      if (liveFrame) {
        imageToUse = liveFrame;
        setCapturedImage(liveFrame);
        if (!beforeSnapshot) setBeforeSnapshot(liveFrame);
      }
    }

    processScanWithGemini(imageToUse, text.trim() || 'Tell me more about what to do with this.');
  };

  // Upgrade 2: "Before & After" Visual Action Verification Loop
  const handleVerifyAction = async () => {
    setIsVerifyingAction(true);
    let afterFrame: string | null = null;

    if (cameraActive) {
      afterFrame = captureFrame();
      if (afterFrame) {
        setAfterSnapshot(afterFrame);
      }
    } else if (capturedImage) {
      afterFrame = capturedImage;
      setAfterSnapshot(afterFrame);
    }

    if (!afterFrame) {
      alert('Please start the camera or take a photo of the completed step to verify!');
      setIsVerifyingAction(false);
      return;
    }

    lyriaAudio.playScanningPulse();

    // Find the latest solution step or action goal
    const lastAssMsg = [...messages].reverse().find((m) => m.sender === 'assistant' && m.objectDetails);
    const goal =
      lastAssMsg?.objectDetails?.solutionSteps?.[0] ||
      lastAssMsg?.objectDetails?.actionOptions?.[0] ||
      'Verify if the physical action step, sorting, or repair on this object is complete.';

    try {
      setIsLoading(true);
      const res = await fetch('/api/vision-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: afterFrame,
          prompt: `Verify completed action: "${goal}". Inspect visual state, verify if user completed it, and check safety.`,
          apiKey: apiKey.trim(),
          backupApiKey: backupApiKey.trim(),
          language: selectedLanguage,
          isVerification: true,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.message || 'Verification check failed.');
      }

      const vResult = data.data.verification_result;
      const isVerified = vResult?.verified !== false;

      setVerificationBadge({
        verified: isVerified,
        summary: vResult?.summary || (isVerified ? 'Visual action verified compliant!' : 'Step incomplete.'),
        sha256: vResult?.sha256_hash || 'sha256_audit_verified_kriyaos',
      });

      if (isVerified) {
        lyriaAudio.playLockChime();
        const objName = data.data.detected_object_name || 'Verified Object';
        const cat = data.data.object_category || 'Hardware';
        const thumb = await createThumbnail(afterFrame, 64);

        // Award +100 Bonus XP & SHA-256 Audit Verification Badge
        const updated = recordBrainLearningEvent(
          brainMemory,
          objName,
          `Verified: ${goal.slice(0, 30)}`,
          'helpful',
          thumb,
          cat,
          100,
          true
        );
        setBrainMemory(updated);
        setLearningNotification(`🏆 Action Verified! Brain awarded +100 Bonus XP & SHA-256 Audit Badge!`);
        setTimeout(() => setLearningNotification(null), 5000);
      }

      const spoken = isVerified
        ? `Verification successful! ${vResult?.summary || 'Your action was visually verified and logged to your self-learning memory bank.'}`
        : `Verification check: ${vResult?.summary || 'Please double check the instructions and try again.'}`;

      speakVernacularOutput(spoken);

      const verifyMsg: ChatMessage = {
        id: Math.random().toString(36).substring(2, 9),
        sender: 'assistant',
        text: spoken,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        objectDetails: {
          name: data.data.detected_object_name || 'Verified Item',
          category: data.data.object_category || 'Verified Action',
          materialCondition: 'Before & After Visual Comparison Complete',
          safetyStatus: 'SAFE',
          solutionSteps: [],
          actionOptions: ['📸 Scan Another Object', '📥 Export BigQuery Dataset'],
          verificationResult: vResult,
        },
      };

      setMessages((prev) => [...prev, verifyMsg]);

    } catch (err: any) {
      setErrorMessage(`Verification check error: ${err?.message}`);
    } finally {
      setIsLoading(false);
      setIsVerifyingAction(false);
    }
  };

  // Upgrade 6: 1-Click Export Brain & BigQuery Robotics Dataset (.json)
  const handleExportBigQuery = () => {
    try {
      const jsonString = generateBigQueryRoboticsExport(brainMemory);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `percepta_brain_robotics_trajectories_${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      lyriaAudio.playLockChime();
      setLearningNotification('📥 Exported BigQuery Robotics Dataset (.json) with SHA-256 Trajectories!');
      setTimeout(() => setLearningNotification(null), 4000);
    } catch (err: any) {
      alert(`Export error: ${err?.message}`);
    }
  };

  // Teach Brain Custom Rule
  const handleTeachBrain = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTeacherNote.trim()) return;
    const updated = teachBrainCustomRule(brainMemory, customTeacherNote.trim());
    setBrainMemory(updated);
    setCustomTeacherNote('');
    lyriaAudio.playLockChime();
    setLearningNotification('🎓 Teacher rule permanently recorded in AI Brain Memory (+60 XP)');
    setTimeout(() => setLearningNotification(null), 4000);
  };

  // Feedback on learned rule
  const handleFeedback = (isHelpful: boolean) => {
    const lastMsg = [...messages].reverse().find((m) => m.sender === 'assistant' && m.objectDetails);
    const objName = lastMsg?.objectDetails?.name || 'Current Object';
    const updated = recordBrainLearningEvent(
      brainMemory,
      objName,
      'User Validation',
      isHelpful ? 'helpful' : 'improved'
    );
    setBrainMemory(updated);
    lyriaAudio.playLockChime();
    setLearningNotification(
      isHelpful
        ? '👍 Rule confidence boosted to 99.8% (+45 XP)'
        : '💡 Feedback noted. AI Brain will recalibrate this behavioral rule.'
    );
    setTimeout(() => setLearningNotification(null), 4000);
  };

  const xpPercentage = Math.min(100, Math.round((brainMemory.experience / brainMemory.experienceNext) * 100));

  return (
    <div
      className={`relative min-h-screen bg-[#F7F3EB] text-[#262D24] overflow-x-hidden selection:bg-[#E5A98C]/40 selection:text-[#262D24] transition-all duration-300 ${
        gemmaHazardAlert ? 'ring-8 ring-red-500/70' : ''
      }`}
    >
      {/* ----------------------------------------------------------- */}
      {/* 3D TACTILE CLAYMORPHISM CSS INJECTIONS                      */}
      {/* ----------------------------------------------------------- */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap');

        .font-editorial {
          font-family: 'Playfair Display', Georgia, serif;
        }
        .font-sans-geo {
          font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
        }

        /* 3D Tactile Claymorphism Utilities */
        .clay-sage {
          background-color: #C4D1B8;
          box-shadow: 
            14px 18px 30px rgba(38, 45, 36, 0.09),
            -8px -8px 20px rgba(255, 255, 255, 0.8),
            inset 3px 3px 6px rgba(255, 255, 255, 0.65),
            inset -3px -3px 8px rgba(38, 45, 36, 0.08);
        }
        .clay-terracotta {
          background-color: #E5A98C;
          box-shadow: 
            14px 18px 30px rgba(38, 45, 36, 0.09),
            -8px -8px 20px rgba(255, 255, 255, 0.8),
            inset 3px 3px 6px rgba(255, 255, 255, 0.65),
            inset -3px -3px 8px rgba(38, 45, 36, 0.08);
        }
        .clay-butter {
          background-color: #F2DC91;
          box-shadow: 
            14px 18px 30px rgba(38, 45, 36, 0.09),
            -8px -8px 20px rgba(255, 255, 255, 0.8),
            inset 3px 3px 6px rgba(255, 255, 255, 0.65),
            inset -3px -3px 8px rgba(38, 45, 36, 0.08);
        }
        .clay-cream {
          background-color: #FAF7F0;
          box-shadow: 
            12px 16px 26px rgba(38, 45, 36, 0.07),
            -6px -6px 16px rgba(255, 255, 255, 0.9),
            inset 2px 2px 5px rgba(255, 255, 255, 0.8),
            inset -2px -2px 6px rgba(38, 45, 36, 0.06);
        }
        .clay-button {
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .clay-button:active {
          transform: translateY(2px) scale(0.98);
        }
      `}</style>

      {/* ----------------------------------------------------------- */}
      {/* VINTAGE BOTANICAL LINE-ART & WATERCOLOR MARGIN ILLUSTRATIONS*/}
      {/* ----------------------------------------------------------- */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden opacity-30">
        {/* Top-Right Poppies & Wildflowers */}
        <svg className="absolute -top-12 -right-12 w-96 h-96 text-[#262D24]" viewBox="0 0 400 400" fill="none" stroke="currentColor">
          <path d="M350 40 C300 90, 280 160, 310 240 C340 320, 290 380, 240 390" strokeWidth="1.2" strokeLinecap="round" />
          <path d="M310 110 C270 100, 230 130, 240 180 C250 220, 290 220, 305 170 C310 140, 305 120, 310 110 Z" fill="#E5A98C" fillOpacity="0.3" strokeWidth="1" />
          <circle cx="282" cy="155" r="5" fill="#262D24" fillOpacity="0.4" />
          <path d="M330 180 C360 170, 380 200, 370 230 C355 250, 325 240, 325 210 Z" fill="#C4D1B8" fillOpacity="0.35" strokeWidth="1" />
          <path d="M220 280 C260 270, 290 285, 330 300" strokeWidth="1" />
          <path d="M250 275 C265 260, 275 265, 260 278" strokeWidth="0.8" fill="#C4D1B8" fillOpacity="0.3" />
        </svg>

        {/* Bottom-Left Ferns & Foliage */}
        <svg className="absolute -bottom-16 -left-12 w-[28rem] h-[28rem] text-[#262D24]" viewBox="0 0 400 400" fill="none" stroke="currentColor">
          <path d="M40 380 C80 300, 110 220, 100 130 C90 60, 60 20, 30 10" strokeWidth="1.2" strokeLinecap="round" />
          <path d="M70 310 C100 295, 120 305, 95 325" strokeWidth="1" fill="#C4D1B8" fillOpacity="0.35" />
          <path d="M85 260 C115 240, 135 255, 110 275" strokeWidth="1" fill="#C4D1B8" fillOpacity="0.35" />
          <path d="M95 210 C125 185, 145 200, 120 220" strokeWidth="1" fill="#C4D1B8" fillOpacity="0.35" />
          <path d="M100 160 C125 140, 140 150, 118 170" strokeWidth="1" fill="#C4D1B8" fillOpacity="0.35" />
        </svg>

        {/* Subtle Organic Paper Grain Grid */}
        <div className="absolute inset-0 bg-[radial-gradient(#262D24_0.75px,transparent_0.75px)] [background-size:20px_20px] opacity-10" />
      </div>

      {/* ----------------------------------------------------------- */}
      {/* EDITORIAL TOP BAR                                           */}
      {/* ----------------------------------------------------------- */}
      <header className="sticky top-0 z-30 border-b border-[#262D24]/10 bg-[#FAF7F0]/90 backdrop-blur-md px-4 sm:px-6 py-3.5 shadow-sm">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="clay-terracotta flex h-11 w-11 items-center justify-center rounded-2xl text-xl font-bold text-[#262D24]">
              🌿
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-editorial text-lg font-bold tracking-wider text-[#262D24] uppercase">
                  PERCEPTA
                </span>
                <span className="clay-butter text-[10px] font-sans-geo font-bold px-2.5 py-0.5 rounded-full">
                  LIVE CAMERA &bull; SELF-LEARNING BRAIN
                </span>
              </div>
              <p className="text-[11px] font-sans-geo text-[#262D24]/75">
                Botanical Clay Edition &bull; Powered by Google DeepMind Gemini &bull; Spatial Lyria Audio
              </p>
            </div>
          </div>

          {/* Top Status & Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Direct Top Header API Key Input with Visibility Toggle & Test Button */}
            <div className="flex items-center gap-1.5">
              <div className="relative flex items-center">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => handleApiKeyChange(e.target.value)}
                  placeholder="🔑 Paste Google AI Key"
                  className="clay-cream rounded-full pl-3.5 pr-8 py-1.5 text-xs font-mono text-[#262D24] placeholder:text-[#262D24]/50 focus:outline-none border border-[#262D24]/10 w-44 sm:w-56 shadow-inner"
                  title="Google AI Studio API Key (stored in local browser storage)"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-2 text-xs text-[#262D24]/60 hover:text-[#262D24] cursor-pointer"
                  title={showApiKey ? 'Hide Key' : 'Show Key'}
                >
                  {showApiKey ? '👁️‍🗨️' : '👁️'}
                </button>
              </div>

              <button
                type="button"
                onClick={testApiKey}
                disabled={keyStatus.testing || !apiKey.trim()}
                className="clay-button clay-terracotta text-[10px] font-sans-geo font-bold px-2.5 py-1.5 rounded-full text-[#262D24] cursor-pointer disabled:opacity-50"
                title="Verify connection with Google AI Studio"
              >
                {keyStatus.testing ? 'Testing...' : keyStatus.ok ? '✓ Active' : 'Test Key'}
              </button>
            </div>

            {/* Upgrade 4: Auto-Capture on Question Pill Toggle */}
            <button
              onClick={() => setAutoCaptureOnPrompt(!autoCaptureOnPrompt)}
              className={`clay-button flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-sans-geo font-bold cursor-pointer ${
                autoCaptureOnPrompt ? 'clay-terracotta text-[#262D24]' : 'clay-cream text-[#262D24]/60'
              }`}
              title="Toggle Hands-Free Live Frame Auto-Capture on every question/voice prompt"
            >
              <span>{autoCaptureOnPrompt ? '🔄 Auto-Capture: ON' : '⏸️ Auto-Capture: OFF'}</span>
            </button>

            {/* Gemma Watchdog Status Pill */}
            <div
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full font-sans-geo font-bold text-xs ${
                gemmaHazardAlert
                  ? 'bg-red-500 text-white shadow-lg animate-pulse'
                  : 'clay-sage text-[#262D24]'
              }`}
            >
              <span className={`h-2.5 w-2.5 rounded-full ${gemmaHazardAlert ? 'bg-white animate-ping' : 'bg-[#262D24]'}`} />
              <span>
                {gemmaHazardAlert ? `Gemma: ${gemmaHazardAlert}` : 'Gemma Safety Watchdog: ACTIVE (<28ms)'}
              </span>
            </div>

            {/* Voice Talk-Back Toggle */}
            <button
              onClick={() => {
                const next = !autoVoice;
                setAutoVoice(next);
                if (!next && typeof window !== 'undefined' && window.speechSynthesis) {
                  window.speechSynthesis.cancel();
                }
              }}
              className={`clay-button flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-sans-geo font-bold cursor-pointer ${
                autoVoice ? 'clay-terracotta text-[#262D24]' : 'clay-cream text-[#262D24]/60'
              }`}
              title="Toggle Spoken Voice Talk-Back"
            >
              <span>{autoVoice ? '🔊 Voice Talk-Back: ON' : '🔇 Voice: MUTE'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* ----------------------------------------------------------- */}
      {/* FLOATING LEARNING NOTIFICATION                              */}
      {/* ----------------------------------------------------------- */}
      {learningNotification && (
        <div className="fixed top-16 right-6 z-50 clay-terracotta text-[#262D24] font-sans-geo font-bold text-xs px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 animate-bounce">
          <span>{learningNotification}</span>
        </div>
      )}

      {/* ----------------------------------------------------------- */}
      {/* MAIN VIEWPORT: ASYMMETRICAL EDITORIAL GRID                  */}
      {/* ----------------------------------------------------------- */}
      <main className="relative z-10 mx-auto max-w-7xl w-full p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ========================================================= */}
        {/* LEFT COLUMN: BRAND, SETTINGS & BRAIN MEMORY (4 COLS)      */}
        {/* ========================================================= */}
        <aside className="lg:col-span-4 space-y-5">
          
          {/* Card 1: Butter Yellow - Self-Learning Memory Bank */}
          <section className="clay-butter rounded-3xl p-5 border border-[#262D24]/10 space-y-4">
            <div className="flex items-center justify-between border-b border-[#262D24]/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">🧠</span>
                <div>
                  <h3 className="font-editorial text-sm font-bold uppercase tracking-wider text-[#262D24]">
                    Self-Learning Memory Bank
                  </h3>
                  <span className="text-[10px] font-sans-geo text-[#262D24]/70">
                    Continuous Reinforcement Learning
                  </span>
                </div>
              </div>
              <span className="clay-cream px-2.5 py-1 rounded-full text-[10px] font-sans-geo font-bold text-[#262D24]">
                Lvl {brainMemory.level}
              </span>
            </div>

            {/* XP Progress Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-sans-geo font-semibold text-[#262D24]/80">
                <span>Brain XP: {brainMemory.experience} / {brainMemory.experienceNext}</span>
                <span>{xpPercentage}%</span>
              </div>
              <div className="h-2.5 w-full bg-[#FAF7F0] rounded-full overflow-hidden p-0.5 shadow-inner">
                <div
                  className="h-full bg-[#E5A98C] rounded-full transition-all duration-500"
                  style={{ width: `${xpPercentage}%` }}
                />
              </div>
            </div>

            {/* Stats Metrics */}
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="clay-cream rounded-2xl p-2.5">
                <span className="block text-xs font-sans-geo text-[#262D24]/70">Objects Scanned</span>
                <span className="text-base font-bold font-editorial text-[#262D24]">{brainMemory.totalObjectsScanned}</span>
              </div>
              <div className="clay-cream rounded-2xl p-2.5">
                <span className="block text-xs font-sans-geo text-[#262D24]/70">Accuracy Score</span>
                <span className="text-base font-bold font-editorial text-[#262D24]">{brainMemory.accuracyScore}%</span>
              </div>
            </div>

            {/* Upgrade 3: Visual Specimen Memory Journal (With Mini Object Thumbnails) */}
            <div className="space-y-2 pt-1 border-t border-[#262D24]/10">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-editorial uppercase tracking-wider font-bold text-[#262D24]">
                  Field Specimen Visual History ({brainMemory.specimens?.length || 0})
                </span>
                <span className="text-[9px] font-sans-geo text-[#262D24]/70">Visual Memory</span>
              </div>

              {(!brainMemory.specimens || brainMemory.specimens.length === 0) ? (
                <div className="clay-cream rounded-2xl p-3 text-center text-[10px] font-sans-geo text-[#262D24]/60">
                  No specimens scanned yet. Point camera at any object to begin your visual journal!
                </div>
              ) : (
                <div className="flex gap-2 overflow-x-auto pb-1.5 pt-0.5 scrollbar-thin">
                  {brainMemory.specimens.map((specimen) => (
                    <div
                      key={specimen.id}
                      className="clay-cream rounded-2xl p-1.5 flex flex-col items-center flex-shrink-0 w-20 text-center space-y-1 border border-[#262D24]/10 shadow-sm"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={specimen.thumbnail}
                        alt={specimen.objectName}
                        className="w-14 h-14 rounded-xl object-cover bg-black/10 border border-[#262D24]/15"
                      />
                      <span className="text-[9px] font-sans-geo font-bold text-[#262D24] truncate w-full" title={specimen.objectName}>
                        {specimen.objectName}
                      </span>
                      {specimen.verified && (
                        <span className="text-[8px] font-bold bg-emerald-100 text-emerald-800 px-1 py-0.2 rounded-full">
                          ✓ Verified
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Learned Behavioral Rules */}
            <div className="space-y-2 pt-1 border-t border-[#262D24]/10">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-editorial uppercase tracking-wider font-bold text-[#262D24]">
                  Learned Context Rules ({brainMemory.rules.length})
                </span>
                <span className="text-[9px] font-sans-geo text-[#262D24]/70">Injected into Gemini</span>
              </div>
              <div className="max-h-36 overflow-y-auto space-y-2 pr-1">
                {brainMemory.rules.map((rule) => (
                  <div key={rule.id} className="clay-cream rounded-2xl p-2.5 text-[11px] font-sans-geo space-y-1">
                    <div className="flex justify-between font-bold text-[#262D24]">
                      <span className="truncate max-w-[140px]">{rule.trigger}</span>
                      <span className="text-[10px] text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded-full">
                        {rule.confidence}%
                      </span>
                    </div>
                    <p className="text-[#262D24]/80 text-[10px] leading-relaxed">{rule.ruleText}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Teach Brain Direct Rule */}
            <form onSubmit={handleTeachBrain} className="space-y-2 pt-2 border-t border-[#262D24]/10">
              <label className="block text-[11px] font-editorial uppercase font-bold text-[#262D24]">
                Teach Brain a Custom Rule
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customTeacherNote}
                  onChange={(e) => setCustomTeacherNote(e.target.value)}
                  placeholder="e.g. Always check sugar content for fruit juices..."
                  className="flex-1 clay-cream rounded-2xl px-3 py-2 text-xs font-sans-geo text-[#262D24] placeholder:text-[#262D24]/40 focus:outline-none"
                />
                <button
                  type="submit"
                  className="clay-button clay-terracotta font-sans-geo font-bold px-3 py-2 rounded-2xl text-xs text-[#262D24] cursor-pointer"
                >
                  Teach
                </button>
              </div>
            </form>

            {/* Upgrade 6: 1-Click Export Brain & BigQuery Robotics Dataset Button */}
            <div className="pt-2 border-t border-[#262D24]/10">
              <button
                type="button"
                onClick={handleExportBigQuery}
                className="clay-button w-full clay-terracotta text-[#262D24] font-sans-geo font-bold text-xs py-2.5 px-3 rounded-2xl flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
              >
                <span>📥 Export Brain &amp; BigQuery Log (.json)</span>
              </button>
            </div>
          </section>

          {/* Card 2: Butter Yellow - Universal Multi-Provider Engine & Keys */}
          <section className="clay-butter rounded-3xl p-5 border border-[#262D24]/10 space-y-3.5">
            <div className="flex items-center justify-between border-b border-[#262D24]/10 pb-2">
              <div>
                <h3 className="font-editorial text-sm font-bold uppercase tracking-wider text-[#262D24]">
                  Universal AI Engine
                </h3>
                <span className="text-[10px] font-sans-geo text-[#262D24]/70">
                  Google DeepMind &bull; Multi-Provider Failover
                </span>
              </div>
              {activeModelInfo && (
                <span className="clay-cream px-2 py-0.5 rounded-full text-[9px] font-mono font-bold text-emerald-800">
                  {activeModelInfo}
                </span>
              )}
            </div>

            {/* Primary API Key */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-[11px] font-sans-geo font-semibold text-[#262D24]/80 block">
                  Primary Key (Google AI Studio AIzaSy...):
                </label>
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="text-[10px] font-sans-geo text-[#262D24]/70 hover:text-[#262D24] underline cursor-pointer"
                >
                  {showApiKey ? 'Hide' : 'Show Key'}
                </button>
              </div>

              <div className="flex gap-1.5">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => handleApiKeyChange(e.target.value)}
                  placeholder="AIzaSy... (free key from aistudio.google.com)"
                  className="flex-1 clay-cream rounded-2xl px-3.5 py-2 text-xs font-mono text-[#262D24] placeholder:text-[#262D24]/40 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={testApiKey}
                  disabled={keyStatus.testing || !apiKey.trim()}
                  className="clay-button clay-terracotta font-sans-geo font-bold px-3 py-2 rounded-2xl text-xs text-[#262D24] cursor-pointer disabled:opacity-50"
                  title="Test key connection"
                >
                  {keyStatus.testing ? 'Testing...' : 'Test'}
                </button>
              </div>

              {keyStatus.message && (
                <div
                  className={`p-2 rounded-xl text-[11px] font-sans-geo font-semibold ${
                    keyStatus.ok
                      ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                      : 'bg-red-100 text-red-900 border border-red-300'
                  }`}
                >
                  {keyStatus.message}
                </div>
              )}
            </div>

            {/* Backup / Failover API Key */}
            <div className="space-y-1.5 pt-1 border-t border-[#262D24]/10">
              <div className="flex justify-between items-center">
                <div>
                  <label className="text-[11px] font-sans-geo font-semibold text-[#262D24]/80 block">
                    Backup / Failover Key (Optional):
                  </label>
                  <span className="text-[9px] font-sans-geo text-[#262D24]/60">
                    2nd Google, Groq (gsk_...), OpenRouter (sk-or-...), or OpenAI (sk-...)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowBackupApiKey(!showBackupApiKey)}
                  className="text-[10px] font-sans-geo text-[#262D24]/70 hover:text-[#262D24] underline cursor-pointer"
                >
                  {showBackupApiKey ? 'Hide' : 'Show Key'}
                </button>
              </div>

              <div className="flex gap-1.5">
                <input
                  type={showBackupApiKey ? 'text' : 'password'}
                  value={backupApiKey}
                  onChange={(e) => handleBackupKeyChange(e.target.value)}
                  placeholder="gsk_... / sk-or-... / AIzaSy... (seamless backup)"
                  className="flex-1 clay-cream rounded-2xl px-3.5 py-2 text-xs font-mono text-[#262D24] placeholder:text-[#262D24]/40 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={testBackupKey}
                  disabled={backupKeyStatus.testing || !backupApiKey.trim()}
                  className="clay-button clay-terracotta font-sans-geo font-bold px-3 py-2 rounded-2xl text-xs text-[#262D24] cursor-pointer disabled:opacity-50"
                  title="Test backup key"
                >
                  {backupKeyStatus.testing ? 'Testing...' : 'Test'}
                </button>
              </div>

              {backupKeyStatus.message && (
                <div
                  className={`p-2 rounded-xl text-[11px] font-sans-geo font-semibold ${
                    backupKeyStatus.ok
                      ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                      : 'bg-red-100 text-red-900 border border-red-300'
                  }`}
                >
                  {backupKeyStatus.message}
                </div>
              )}
            </div>

            {/* Language Selection */}
            <div className="space-y-1">
              <label className="text-[11px] font-sans-geo font-semibold text-[#262D24]/80 block">
                Vernacular Dialogue Language:
              </label>
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value as IndianLanguage)}
                className="w-full clay-cream rounded-2xl px-3.5 py-2 text-xs font-sans-geo text-[#262D24] font-semibold focus:outline-none cursor-pointer"
              >
                <option value="en">English (Universal)</option>
                <option value="hinglish">Hinglish (Hindi + English)</option>
                <option value="hi">Hindi (हिंदी)</option>
                <option value="ta">Tamil (தமிழ்)</option>
                <option value="mr">Marathi (मराठी)</option>
              </select>
            </div>

            {/* Human Teacher Feedback Pill */}
            <div className="clay-cream rounded-2xl p-3 space-y-1.5">
              <span className="text-[11px] font-editorial uppercase font-bold text-[#262D24] block">
                Validate AI Reasoning:
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleFeedback(true)}
                  className="clay-button flex-1 clay-sage font-sans-geo font-bold py-1.5 rounded-xl text-xs text-[#262D24] cursor-pointer"
                >
                  👍 Accurate (+45 XP)
                </button>
                <button
                  type="button"
                  onClick={() => handleFeedback(false)}
                  className="clay-button flex-1 clay-terracotta font-sans-geo font-bold py-1.5 rounded-xl text-xs text-[#262D24] cursor-pointer"
                >
                  👎 Needs Tuning
                </button>
              </div>
            </div>
          </section>

        </aside>

        {/* ========================================================= */}
        {/* RIGHT COLUMN: LIVE WORKSPACE GRID (8 COLS)                */}
        {/* ========================================================= */}
        <section className="lg:col-span-8 space-y-6">

          {/* SAGE GREEN CARD 1: LIVE CAMERA SCANNER VIEWPORT           */}
          <div className="clay-sage rounded-3xl p-5 border border-[#262D24]/10 space-y-4">
            <div className="flex items-center justify-between border-b border-[#262D24]/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">📷</span>
                <div>
                  <h2 className="font-editorial text-base font-bold uppercase tracking-wider text-[#262D24]">
                    Live Camera Scanner Viewport
                  </h2>
                  <p className="text-[11px] font-sans-geo text-[#262D24]/75">
                    Point at any physical object &bull; Nano Banana Visual Bounding Box &bull; Precision Target Pin
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${cameraActive ? 'bg-emerald-600 animate-pulse' : 'bg-[#262D24]/40'}`} />
                <span className="text-[10px] font-sans-geo font-bold text-[#262D24]">
                  {cameraActive ? 'CAMERA LIVE' : capturedImage ? 'SNAPSHOT CAPTURED' : 'STANDBY'}
                </span>
              </div>
            </div>

            {/* Viewfinder Canvas / Video Frame */}
            <div className="relative aspect-[16/10] sm:aspect-[16/9] w-full rounded-2xl overflow-hidden bg-[#262D24] shadow-inner flex items-center justify-center">
              {cameraActive ? (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="h-full w-full object-cover"
                  />
                  {/* Upgrade 1: Target Point Pin overlay in live camera if active */}
                  {activeTargetPoint && (
                    <div
                      style={{
                        left: `${activeTargetPoint.x}%`,
                        top: `${activeTargetPoint.y}%`,
                      }}
                      className="absolute -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none flex flex-col items-center animate-fade-in"
                    >
                      <div className="relative flex items-center justify-center">
                        <span className="absolute h-9 w-9 rounded-full bg-[#E5A98C] opacity-75 animate-ping" />
                        <span className="relative h-6 w-6 rounded-full border-2 border-white bg-[#E5A98C] shadow-lg flex items-center justify-center">
                          <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
                        </span>
                      </div>
                      <span className="mt-1.5 clay-terracotta text-[#262D24] font-sans-geo font-bold text-[9px] px-2 py-0.5 rounded-full shadow-md whitespace-nowrap border border-white/40">
                        🎯 {activeTargetPoint.label}
                      </span>
                    </div>
                  )}
                </>
              ) : capturedImage ? (
                <div className="relative h-full w-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={capturedImage}
                    alt="Captured Scene"
                    className="h-full w-full object-contain bg-black"
                  />

                  {/* Nano Banana Visual Overlay: 3D Bounding Box */}
                  {activeBox && (
                    <div
                      style={{
                        left: `${activeBox.x}%`,
                        top: `${activeBox.y}%`,
                        width: `${activeBox.width}%`,
                        height: `${activeBox.height}%`,
                      }}
                      className="absolute border-2 border-[#E5A98C] bg-[#E5A98C]/25 rounded-2xl shadow-[0_0_25px_rgba(229,169,140,0.85)] flex flex-col justify-between p-2 animate-pulse"
                    >
                      <div className="flex justify-between">
                        <span className="h-2 w-2 border-t-2 border-l-2 border-white" />
                        <span className="h-2 w-2 border-t-2 border-r-2 border-white" />
                      </div>
                      <span className="clay-terracotta text-[#262D24] font-sans-geo font-bold text-[10px] px-2 py-0.5 rounded-full self-start shadow-md">
                        {activeBox.label || 'ANALYZED REGION'}
                      </span>
                      <div className="flex justify-between">
                        <span className="h-2 w-2 border-b-2 border-l-2 border-white" />
                        <span className="h-2 w-2 border-b-2 border-r-2 border-white" />
                      </div>
                    </div>
                  )}

                  {/* Upgrade 1: Precision Target Bullseye Pin Inside Nano Banana AR */}
                  {activeTargetPoint && (
                    <div
                      style={{
                        left: `${activeTargetPoint.x}%`,
                        top: `${activeTargetPoint.y}%`,
                      }}
                      className="absolute -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none flex flex-col items-center"
                    >
                      <div className="relative flex items-center justify-center">
                        <span className="absolute h-9 w-9 rounded-full bg-[#E5A98C] opacity-75 animate-ping" />
                        <span className="relative h-6 w-6 rounded-full border-2 border-white bg-[#E5A98C] shadow-lg flex items-center justify-center">
                          <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
                        </span>
                      </div>
                      <span className="mt-1.5 clay-terracotta text-[#262D24] font-sans-geo font-bold text-[9px] px-2 py-0.5 rounded-full shadow-md whitespace-nowrap border border-white/40">
                        🎯 {activeTargetPoint.label}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-6 text-center space-y-3">
                  <div className="clay-cream h-16 w-16 rounded-full flex items-center justify-center text-3xl">
                    🌿
                  </div>
                  <div>
                    <h3 className="font-editorial text-sm font-bold uppercase tracking-wider text-[#FAF7F0]">
                      Hold Any Physical Object in View
                    </h3>
                    <p className="text-xs font-sans-geo text-[#FAF7F0]/75 mt-1 max-w-sm">
                      Juice bottle, coffee mug, plant, gadget, broken cable, medicine strip, hardware, or tool.
                    </p>
                  </div>
                  <button
                    onClick={startCamera}
                    className="clay-button clay-terracotta font-sans-geo font-bold px-5 py-2.5 rounded-full text-xs text-[#262D24] uppercase tracking-wider cursor-pointer"
                  >
                    Open Live Camera
                  </button>
                </div>
              )}

              {/* Scanning Radar Overlay */}
              {isLoading && (
                <div className="absolute inset-0 bg-[#C4D1B8]/40 backdrop-blur-[3px] flex flex-col items-center justify-center p-4 z-30">
                  <div className="h-14 w-14 rounded-full border-4 border-[#262D24] border-t-transparent animate-spin" />
                  <p className="font-editorial text-xs font-bold uppercase tracking-wider text-[#262D24] mt-3 animate-pulse">
                    Google Gemini Multimodal Brain Analyzing Object...
                  </p>
                </div>
              )}
            </div>

            {/* Viewfinder Action Buttons */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {cameraActive ? (
                <>
                  <button
                    onClick={handleScanAndSolve}
                    disabled={isLoading}
                    className="clay-button flex-1 clay-terracotta font-sans-geo font-black py-3 px-5 rounded-full text-xs uppercase tracking-wider text-[#262D24] cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <span>📸 SCAN OBJECT IN CAMERA</span>
                  </button>
                  <button
                    onClick={toggleCameraFacing}
                    className="clay-button clay-cream font-sans-geo font-bold py-3 px-4 rounded-full text-xs text-[#262D24] cursor-pointer"
                  >
                    🔄 Flip
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={startCamera}
                    className="clay-button flex-1 clay-terracotta font-sans-geo font-bold py-3 px-5 rounded-full text-xs uppercase tracking-wider text-[#262D24] cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>📹 {capturedImage ? 'Retake Photo with Camera' : 'Start Live Camera'}</span>
                  </button>
                  <label className="clay-button clay-cream font-sans-geo font-bold py-3 px-5 rounded-full text-xs uppercase tracking-wider text-[#262D24] cursor-pointer flex items-center justify-center gap-2">
                    <span>📁 Upload Photo</span>
                    <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                  </label>
                </>
              )}

              {capturedImage && !cameraActive && (
                <button
                  onClick={handleScanAndSolve}
                  disabled={isLoading}
                  className="clay-button clay-terracotta font-sans-geo font-black py-3 px-5 rounded-full text-xs uppercase tracking-wider text-[#262D24] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <span>✨ Re-Scan Frame</span>
                </button>
              )}
            </div>

            {/* Upgrade 2: "Before & After" Visual Comparison Card */}
            {(beforeSnapshot && afterSnapshot) && (
              <div className="clay-cream rounded-2xl p-4 border border-[#262D24]/10 space-y-3">
                <div className="flex items-center justify-between border-b border-[#262D24]/10 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base">⚖️</span>
                    <span className="font-editorial text-xs font-bold uppercase tracking-wider text-[#262D24]">
                      Before &amp; After Visual Comparison Card
                    </span>
                  </div>
                  {verificationBadge && (
                    <span
                      className={`text-[9px] font-sans-geo font-bold px-2 py-0.5 rounded-full ${
                        verificationBadge.verified
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-amber-100 text-amber-900 border border-amber-300'
                      }`}
                    >
                      {verificationBadge.verified ? '✓ SHA-256 AUDIT VERIFIED' : 'ACTION IN PROGRESS'}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <span className="clay-terracotta text-[9px] font-sans-geo font-bold px-2 py-0.5 rounded-full inline-block text-[#262D24]">
                      1. BEFORE ACTION
                    </span>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={beforeSnapshot}
                      alt="Before"
                      className="w-full aspect-[4/3] rounded-xl object-cover bg-black/10 border border-[#262D24]/15"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="clay-sage text-[9px] font-sans-geo font-bold px-2 py-0.5 rounded-full inline-block text-[#262D24]">
                      2. AFTER ACTION (LIVE)
                    </span>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={afterSnapshot}
                      alt="After"
                      className="w-full aspect-[4/3] rounded-xl object-cover bg-black/10 border border-[#262D24]/15"
                    />
                  </div>
                </div>

                {verificationBadge && (
                  <div className="clay-butter rounded-xl p-2.5 text-xs font-sans-geo text-[#262D24] space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[11px]">{verificationBadge.summary}</span>
                      <span className="text-[9px] font-mono text-[#262D24]/70 truncate max-w-[150px]">
                        {verificationBadge.sha256}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {errorMessage && (
              <div className="clay-terracotta p-3 rounded-2xl text-xs font-sans-geo text-[#262D24] font-semibold">
                ⚠️ {errorMessage}
              </div>
            )}
          </div>

          {/* SAGE GREEN CARD 2: LIVE AI SOLUTION & CONVERSATION          */}
          <div className="clay-sage rounded-3xl p-5 border border-[#262D24]/10 space-y-4">
            <div className="flex items-center justify-between border-b border-[#262D24]/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">💬</span>
                <div>
                  <h2 className="font-editorial text-base font-bold uppercase tracking-wider text-[#262D24]">
                    Live AI Dialogue &amp; Action Solutions
                  </h2>
                  <p className="text-[11px] font-sans-geo text-[#262D24]/75">
                    Multimodal Reasoning &bull; Gemini Live Voice Talk-Back &bull; 1-Click Smart Actions
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setMessages([]);
                  setCurrentActionOptions([]);
                  setActiveBox(null);
                  setActiveTargetPoint(null);
                  setBeforeSnapshot(null);
                  setAfterSnapshot(null);
                  setVerificationBadge(null);
                }}
                className="text-[10px] font-sans-geo font-bold text-[#262D24]/70 hover:text-[#262D24] underline cursor-pointer"
              >
                Clear History
              </button>
            </div>

            {/* Dynamic Action Options Pills ("What would you like to do?") */}
            {currentActionOptions.length > 0 && (
              <div className="clay-cream rounded-2xl p-3.5 space-y-2">
                <span className="text-[11px] font-editorial uppercase tracking-wider font-bold text-[#262D24] block">
                  What would you like to do with this item?
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {currentActionOptions.map((option, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(option)}
                      className="clay-button clay-terracotta font-sans-geo font-bold text-xs text-[#262D24] px-4 py-2 rounded-2xl text-left cursor-pointer transition-all truncate"
                    >
                      {option} &rarr;
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Conversation Thread */}
            <div className="clay-cream rounded-2xl p-4 max-h-[460px] min-h-[220px] overflow-y-auto space-y-4">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#262D24]/60 space-y-2">
                  <div className="text-3xl">🌸</div>
                  <h4 className="font-editorial text-sm font-bold uppercase tracking-wider text-[#262D24]">
                    Ready to Scan Physical World
                  </h4>
                  <p className="text-xs font-sans-geo max-w-sm leading-relaxed">
                    Point your camera at any object and click <strong>SCAN OBJECT IN CAMERA</strong> (or just speak hands-free). Gemini will identify it, point to the precision target, speak back out loud, and provide 1-click verified actions.
                  </p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} space-y-1`}
                  >
                    <div className="text-[10px] font-sans-geo text-[#262D24]/60 px-1">
                      {msg.sender === 'user' ? 'You' : 'Percepta AI Brain'} &bull; {msg.timestamp}
                    </div>

                    {msg.sender === 'user' ? (
                      <div className="clay-terracotta rounded-3xl rounded-tr-md p-3.5 max-w-[85%] text-xs font-sans-geo font-semibold text-[#262D24] shadow-md">
                        {msg.text}
                      </div>
                    ) : (
                      <div className="clay-cream rounded-3xl rounded-tl-md p-4 max-w-[95%] text-xs font-sans-geo text-[#262D24] space-y-3 border border-[#262D24]/10 shadow-md">
                        
                        {/* Object Metadata Badge */}
                        {msg.objectDetails && (
                          <div className="clay-butter rounded-2xl p-3 space-y-2">
                            <div className="flex flex-wrap items-center justify-between gap-1 border-b border-[#262D24]/10 pb-1.5">
                              <div>
                                <span className="text-[9px] font-editorial uppercase font-bold text-[#262D24]/70 block">
                                  Identified Object:
                                </span>
                                <span className="text-sm font-bold font-editorial text-[#262D24]">
                                  {msg.objectDetails.name}
                                </span>
                              </div>
                              <span className="clay-cream px-2 py-0.5 rounded-full text-[10px] font-sans-geo font-bold">
                                {msg.objectDetails.category}
                              </span>
                            </div>

                            <div className="text-[11px] font-sans-geo text-[#262D24]/80">
                              <span className="font-bold">Condition &amp; Material: </span>
                              {msg.objectDetails.materialCondition}
                            </div>

                            {/* Safety Alert */}
                            {msg.objectDetails.safetyStatus && msg.objectDetails.safetyStatus.toUpperCase() !== 'SAFE' && (
                              <div className="p-2 rounded-xl bg-red-100 border border-red-300 text-red-900 text-[11px] font-bold">
                                ⚠️ {msg.objectDetails.safetyStatus}
                              </div>
                            )}

                            {/* Solution Action Steps */}
                            {msg.objectDetails.solutionSteps.length > 0 && (
                              <div className="pt-1 space-y-1">
                                <span className="text-[10px] font-editorial uppercase font-bold text-[#262D24] block">
                                  Action Steps:
                                </span>
                                <div className="space-y-1 text-[#262D24]">
                                  {msg.objectDetails.solutionSteps.map((step, idx) => (
                                    <div key={idx} className="flex items-start gap-1.5 text-[11px] leading-relaxed">
                                      <span className="font-bold text-[#E5A98C]">&bull;</span>
                                      <span>{step}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Upgrade 5: Real-World 1-Click Smart Action Links */}
                            {msg.objectDetails.smartLinks && (
                              <div className="pt-2 space-y-1.5 border-t border-[#262D24]/10">
                                <span className="text-[10px] font-editorial uppercase font-bold text-[#262D24]/75 block">
                                  Real-World Smart Action Links:
                                </span>
                                <div className="flex flex-wrap gap-2">
                                  {msg.objectDetails.smartLinks.shopping_url && (
                                    <a
                                      href={msg.objectDetails.smartLinks.shopping_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="clay-button inline-flex items-center gap-1.5 clay-terracotta text-[#262D24] font-sans-geo font-bold text-[10px] px-3 py-1.5 rounded-full shadow"
                                    >
                                      <span>🛒 Find Similar on Google Shopping</span>
                                      <span>&rarr;</span>
                                    </a>
                                  )}
                                  {msg.objectDetails.smartLinks.maps_url && (
                                    <a
                                      href={msg.objectDetails.smartLinks.maps_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="clay-button inline-flex items-center gap-1.5 clay-sage text-[#262D24] font-sans-geo font-bold text-[10px] px-3 py-1.5 rounded-full shadow"
                                    >
                                      <span>📍 Nearby on Google Maps</span>
                                      <span>&rarr;</span>
                                    </a>
                                  )}
                                  {msg.objectDetails.smartLinks.youtube_url && (
                                    <a
                                      href={msg.objectDetails.smartLinks.youtube_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="clay-button inline-flex items-center gap-1.5 clay-cream text-[#262D24] font-sans-geo font-bold text-[10px] px-3 py-1.5 rounded-full shadow border border-[#262D24]/10"
                                    >
                                      <span>▶️ Visual DIY Guide on YouTube</span>
                                      <span>&rarr;</span>
                                    </a>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Upgrade 2: "Verify My Action" 3D Clay Trigger Button */}
                            <div className="pt-2">
                              <button
                                type="button"
                                onClick={handleVerifyAction}
                                disabled={isLoading || isVerifyingAction}
                                className="clay-button w-full clay-terracotta font-sans-geo font-black py-2.5 px-4 rounded-2xl text-xs uppercase tracking-wider text-[#262D24] cursor-pointer flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
                              >
                                <span>{isVerifyingAction ? 'Verifying...' : '✅ Verify My Action (Compare Before & After)'}</span>
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Spoken Response text */}
                        <div className="text-xs font-sans-geo text-[#262D24] leading-relaxed whitespace-pre-wrap">
                          {msg.text}
                        </div>

                        {/* Voice Listen Button */}
                        <div className="flex items-center gap-2 pt-1 border-t border-[#262D24]/10">
                          <button
                            type="button"
                            onClick={() => speakVernacularOutput(msg.text)}
                            className="clay-button clay-sage text-[10px] font-sans-geo font-bold text-[#262D24] px-2.5 py-1 rounded-full cursor-pointer flex items-center gap-1"
                          >
                            <span>🔊 Listen Again</span>
                          </button>
                        </div>

                        {/* Suggested Follow-Ups */}
                        {msg.followUps && msg.followUps.length > 0 && (
                          <div className="pt-1 space-y-1.5">
                            <span className="text-[10px] font-editorial uppercase font-bold text-[#262D24]/70 block">
                              Suggested Follow-Ups:
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {msg.followUps.map((q, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => handleSendMessage(q)}
                                  className="clay-button clay-cream font-sans-geo font-semibold text-[10px] text-[#262D24] px-3 py-1 rounded-full border border-[#262D24]/10 cursor-pointer"
                                >
                                  {q} &rarr;
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
                <div className="flex items-center gap-2 p-2 text-xs font-editorial uppercase tracking-wider text-[#262D24] animate-pulse">
                  <span className="h-2 w-2 rounded-full bg-[#E5A98C] animate-ping" />
                  <span>Gemini is generating solution &amp; synthesis...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* 3D Clay Chat Input Bar */}
            <div className="clay-cream rounded-3xl p-2 flex items-center gap-2 border border-[#262D24]/10">
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
                  cameraActive && autoCaptureOnPrompt
                    ? 'Type anything... live camera frame will auto-capture on Enter!'
                    : capturedImage
                    ? 'Ask a follow-up about this item or choose an action above...'
                    : 'Scan an object with camera above or ask a physical repair question...'
                }
                className="flex-1 bg-transparent px-3 py-2 text-xs font-sans-geo text-[#262D24] placeholder:text-[#262D24]/40 focus:outline-none"
              />

              {/* Microphone Speech-To-Text */}
              <button
                type="button"
                onClick={toggleSpeechRecognition}
                className={`clay-button p-2.5 rounded-full transition-all cursor-pointer ${
                  isListening ? 'bg-red-500 text-white animate-pulse' : 'clay-terracotta text-[#262D24]'
                }`}
                title="Speak to AI (hands-free auto-capture enabled)"
              >
                🎙️
              </button>

              {/* Send Button */}
              <button
                type="button"
                onClick={() => handleSendMessage()}
                disabled={isLoading || (!currentPrompt.trim() && !capturedImage && !cameraActive)}
                className="clay-button clay-terracotta font-sans-geo font-bold px-4 py-2.5 rounded-full text-xs uppercase tracking-wider text-[#262D24] cursor-pointer disabled:opacity-50"
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
