/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Download,
  Music,
  Mic,
  Clock,
  Sparkles,
  Info,
  CheckCircle2,
  Layers,
  Film
} from 'lucide-react';
import { AmbientMusicPlayer } from './utils/audioEngine';

// Import high-resolution travel photography stills generated for the video
import loungeImg from './assets/images/jjimjilbang_lounge_1793544484011.jpg';
import warmRoomImg from './assets/images/jjimjilbang_warm_room_1793544499138.jpg';
import coldRoomImg from './assets/images/jjimjilbang_cold_room_1793544522347.jpg';
import eggSikhyeImg from './assets/images/jjimjilbang_egg_sikhye_1793544537764.jpg';
import friendsSnackImg from './assets/images/jjimjilbang_friends_snacking_1793544555319.jpg';

interface VideoScene {
  id: number;
  timeRange: string;
  startSec: number;
  endSec: number;
  title: string;
  voiceoverText: string;
  voiceoverPronunciation: string;
  subtitles: [string, string];
  shots: {
    start: number;
    end: number;
    image: string;
    description: string;
    cameraMotion: string;
  }[];
}

const VIDEO_SCENES: VideoScene[] = [
  {
    id: 1,
    timeRange: "0–5s",
    startSec: 0,
    endSec: 5,
    title: "Scene 1 — Shared Relaxation Area",
    voiceoverText: "Try a jjimjilbang—a Korean bathhouse made for relaxing.",
    voiceoverPronunciation: "Try a jjim-jil-bang—a Korean bathhouse made for relaxing.",
    subtitles: [
      "Try a jjimjilbang—",
      "a Korean bathhouse made for relaxing."
    ],
    shots: [
      {
        start: 0,
        end: 5,
        image: loungeImg,
        description: "Wide shot of Korean jjimjilbang shared relaxation area. Young adults in matching loose shirts and shorts sit on floor mats; camera slowly pushes toward the warm glowing heated room entrance.",
        cameraMotion: "Slow cinematic push-in towards warm kiln entrance (scale 1.0 → 1.15)"
      }
    ]
  },
  {
    id: 2,
    timeRange: "5–10s",
    startSec: 5,
    endSec: 10,
    title: "Scene 2 — Heated & Cold Thermal Rooms",
    voiceoverText: "Warm up in heated rooms, then try a cold room.",
    voiceoverPronunciation: "Warm up in heated rooms, then try a cold room.",
    subtitles: [
      "Warm up in heated rooms,",
      "then try a cold room."
    ],
    shots: [
      {
        start: 5.0,
        end: 7.5,
        image: warmRoomImg,
        description: "Visitors sitting quietly inside a warm room with wood and stone surfaces under soft golden amber illumination.",
        cameraMotion: "Gentle lateral drift and calm slow push (scale 1.02 → 1.09)"
      },
      {
        start: 7.5,
        end: 10.0,
        image: coldRoomImg,
        description: "Connected shot of the same visitors relaxing inside a cool room with pale blue lighting and frosted stone walls.",
        cameraMotion: "Smooth cut with subtle crystalline drift (scale 1.0 → 1.08)"
      }
    ]
  },
  {
    id: 3,
    timeRange: "10–15s",
    startSec: 10,
    endSec: 15,
    title: "Scene 3 — Baked Eggs & Sikhye Refreshments",
    voiceoverText: "Enjoy baked eggs and sikhye, a sweet rice drink.",
    voiceoverPronunciation: "Enjoy baked eggs and shik-hyeh, a sweet rice drink.",
    subtitles: [
      "Enjoy baked eggs and sikhye,",
      "a sweet rice drink."
    ],
    shots: [
      {
        start: 10.0,
        end: 12.5,
        image: eggSikhyeImg,
        description: "Close-up of hands peeling a brown baked egg beside a clear cup of pale golden sikhye with visible floating rice grains.",
        cameraMotion: "Macro focus push with warm organic lighting (scale 1.0 → 1.10)"
      },
      {
        start: 12.5,
        end: 15.0,
        image: friendsSnackImg,
        description: "Two friends enjoying the refreshments at a low table in the shared relaxation area, smiling and laughing together.",
        cameraMotion: "Warm social medium shot with smooth reveal pull (scale 1.08 → 1.0)"
      }
    ]
  }
];

export default function App() {
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState<boolean>(true);
  const [isMusicEnabled, setIsMusicEnabled] = useState<boolean>(true);
  const [volume, setVolume] = useState<number>(0.8);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);

  const videoContainerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const musicPlayerRef = useRef<AmbientMusicPlayer | null>(null);
  const spokenSceneIds = useRef<Set<number>>(new Set());
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // Preload all scene images into memory for zero-lag canvas rendering
  const loadedImagesRef = useRef<Map<string, HTMLImageElement>>(new Map());

  useEffect(() => {
    // Initialize Web Audio ambient music
    musicPlayerRef.current = new AmbientMusicPlayer();

    // Initialize Web Speech API
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
    }

    // Preload image elements
    const imagesToPreload = [loungeImg, warmRoomImg, coldRoomImg, eggSikhyeImg, friendsSnackImg];
    imagesToPreload.forEach(src => {
      const img = new Image();
      img.src = src;
      img.onload = () => {
        loadedImagesRef.current.set(src, img);
      };
    });

    return () => {
      if (musicPlayerRef.current) musicPlayerRef.current.stop();
      if (synthRef.current) synthRef.current.cancel();
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  // Update volume
  useEffect(() => {
    if (musicPlayerRef.current) {
      musicPlayerRef.current.setVolume(isMusicEnabled ? volume * 0.22 : 0);
    }
  }, [volume, isMusicEnabled]);

  // Current active scene and shot
  const currentScene = useMemo(() => {
    return VIDEO_SCENES.find(
      s => currentTime >= s.startSec && (currentTime < s.endSec || (s.id === 3 && currentTime <= 15))
    ) || VIDEO_SCENES[0];
  }, [currentTime]);

  const currentShot = useMemo(() => {
    for (const scene of VIDEO_SCENES) {
      for (const shot of scene.shots) {
        if (currentTime >= shot.start && (currentTime < shot.end || (shot.end === 15 && currentTime <= 15))) {
          return { ...shot, sceneId: scene.id, subtitles: scene.subtitles };
        }
      }
    }
    return { ...VIDEO_SCENES[0].shots[0], sceneId: 1, subtitles: VIDEO_SCENES[0].subtitles };
  }, [currentTime]);

  // Spoken voiceover function with natural English delivery & exact pronunciations
  const triggerVoiceover = (scene: VideoScene) => {
    if (!isVoiceEnabled || !synthRef.current) return;
    synthRef.current.cancel();

    // Uses phonetic guide for natural Korean pronunciation: "jjim-jil-bang", "shik-hyeh"
    const utterance = new SpeechSynthesisUtterance(scene.voiceoverPronunciation);
    utterance.lang = 'en-US';
    utterance.rate = 0.95; // Relaxed, friendly, natural conversational pacing
    utterance.pitch = 1.02;

    const voices = synthRef.current.getVoices();
    const friendlyVoice = voices.find(
      v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Jenny'))
    ) || voices.find(v => v.lang.startsWith('en'));

    if (friendlyVoice) utterance.voice = friendlyVoice;
    synthRef.current.speak(utterance);
  };

  // Main playback animation loop (15-second duration with natural scene pacing)
  useEffect(() => {
    if (isPlaying) {
      if (isMusicEnabled && musicPlayerRef.current) {
        musicPlayerRef.current.play();
      }

      const loop = (timestamp: number) => {
        if (lastTimeRef.current !== null) {
          const delta = (timestamp - lastTimeRef.current) / 1000;
          setCurrentTime(prev => {
            const next = prev + delta;

            if (next >= 15.0) {
              setIsPlaying(false);
              lastTimeRef.current = null;
              if (musicPlayerRef.current) musicPlayerRef.current.stop();
              if (synthRef.current) synthRef.current.cancel();

              if (isRecording && mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                mediaRecorderRef.current.stop();
                setIsRecording(false);
              }
              return 15.0;
            }

            // Trigger narration voiceover with a brief natural 0.4s pause after scene start
            for (const scene of VIDEO_SCENES) {
              if (next >= scene.startSec + 0.4 && next < scene.endSec - 0.5) {
                if (!spokenSceneIds.current.has(scene.id)) {
                  spokenSceneIds.current.add(scene.id);
                  triggerVoiceover(scene);
                }
              }
            }

            return next;
          });
        }
        lastTimeRef.current = timestamp;
        animFrameRef.current = requestAnimationFrame(loop);
      };

      animFrameRef.current = requestAnimationFrame(loop);
    } else {
      lastTimeRef.current = null;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (musicPlayerRef.current) musicPlayerRef.current.stop();
      if (synthRef.current) synthRef.current.cancel();
    }

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, isVoiceEnabled, isMusicEnabled, isRecording]);

  // Canvas frame drawing for vertical 9:16 (1080x1920) YouTube Shorts
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Strict YouTube Shorts vertical standard: 1080 x 1920 (9:16)
    const width = 1080;
    const height = 1920;
    canvas.width = width;
    canvas.height = height;

    const img = loadedImagesRef.current.get(currentShot.image);

    // Calculate normalized progress within the current shot for camera pan/zoom
    const shotDuration = currentShot.end - currentShot.start;
    const shotProgress = Math.max(0, Math.min(1, (currentTime - currentShot.start) / shotDuration));

    // Smooth easing
    const eased = Math.sin((shotProgress * Math.PI) / 2);

    ctx.save();
    ctx.clearRect(0, 0, width, height);

    if (img && img.complete && img.naturalWidth > 0) {
      // For 16:9 image to cover 9:16 vertical canvas:
      // Base scale must match height: baseScale = height / img.height = 1920 / 720 ~= 2.666
      const baseScale = Math.max(width / img.naturalWidth, height / img.naturalHeight);

      let zoom = 1.0;
      let focusCenterX = img.naturalWidth * 0.5; // default center
      let focusCenterY = img.naturalHeight * 0.5;

      if (currentShot.start === 0) {
        // Scene 1 (0–5s): Wide shot of relaxation area -> slow push toward warm kiln entrance on right
        // Start centered on students lounging (x ~ 45%), pan toward warm kiln entrance (x ~ 68%)
        zoom = 1.03 + eased * 0.12;
        focusCenterX = img.naturalWidth * (0.46 + eased * 0.20);
        focusCenterY = img.naturalHeight * 0.55;
      } else if (currentShot.start === 5.0) {
        // Scene 2A (5–7.5s): Warm room with wood/stone surfaces, centered on resting visitors
        zoom = 1.05 + eased * 0.08;
        focusCenterX = img.naturalWidth * (0.42 + eased * 0.05);
        focusCenterY = img.naturalHeight * 0.52;
      } else if (currentShot.start === 7.5) {
        // Scene 2B (7.5–10s): Cold room with pale blue light, centered on seated visitors & ICE ROOM sign
        zoom = 1.04 + eased * 0.07;
        focusCenterX = img.naturalWidth * (0.50 - eased * 0.04);
        focusCenterY = img.naturalHeight * 0.50;
      } else if (currentShot.start === 10.0) {
        // Scene 3A (10–12.5s): Close-up peeling brown baked egg beside sikhye cup
        zoom = 1.02 + eased * 0.10;
        focusCenterX = img.naturalWidth * (0.52 - eased * 0.03);
        focusCenterY = img.naturalHeight * 0.60;
      } else {
        // Scene 3B (12.5–15s): Two friends laughing and enjoying refreshments at low table
        zoom = 1.06 - eased * 0.06;
        focusCenterX = img.naturalWidth * 0.50;
        focusCenterY = img.naturalHeight * 0.52;
      }

      const currentScale = baseScale * zoom;
      const drawW = img.naturalWidth * currentScale;
      const drawH = img.naturalHeight * currentScale;

      const dx = width / 2 - focusCenterX * currentScale;
      const dy = height / 2 - focusCenterY * currentScale;

      ctx.drawImage(img, dx, dy, drawW, drawH);

      // Subtle atmospheric vignette & top/bottom gradients for vertical phone readability
      const topGrad = ctx.createLinearGradient(0, 0, 0, 320);
      topGrad.addColorStop(0, 'rgba(0,0,0,0.55)');
      topGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = topGrad;
      ctx.fillRect(0, 0, width, 320);

      const bottomGrad = ctx.createLinearGradient(0, height - 520, 0, height);
      bottomGrad.addColorStop(0, 'rgba(0,0,0,0)');
      bottomGrad.addColorStop(1, 'rgba(0,0,0,0.65)');
      ctx.fillStyle = bottomGrad;
      ctx.fillRect(0, height - 520, width, 520);
    } else {
      ctx.fillStyle = '#1c1917';
      ctx.fillRect(0, 0, width, height);
    }

    // Render Clean White English Subtitles Near Bottom (YouTube Shorts Safe Zone)
    // Placed in lower third (above YouTube Shorts action bar: y ~= 1480-1560)
    const activeSubs = currentShot.subtitles;
    if (activeSubs) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Adjusted typography for 1080×1920 vertical format
      const fontSize = 52;
      ctx.font = `700 ${fontSize}px "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;

      const lineSpacing = 68;
      const subtitleCenterY = height - 420; // Safe zone above YouTube Shorts caption/audio overlay

      const line1 = activeSubs[0];
      const line2 = activeSubs[1];

      const w1 = ctx.measureText(line1).width;
      const w2 = ctx.measureText(line2).width;
      const maxTextW = Math.max(w1, w2);

      // Translucent protective backing pill
      ctx.fillStyle = 'rgba(0, 0, 0, 0.52)';
      ctx.beginPath();
      const padX = 36;
      const padY = 22;
      const boxW = maxTextW + padX * 2;
      const boxH = lineSpacing + padY * 2;
      ctx.roundRect((width - boxW) / 2, subtitleCenterY - lineSpacing / 2 - padY, boxW, boxH, 20);
      ctx.fill();

      // Soft shadow for high contrast
      ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 3;

      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(line1, width / 2, subtitleCenterY - lineSpacing / 2);
      ctx.fillText(line2, width / 2, subtitleCenterY + lineSpacing / 2);
    }

    ctx.restore();
  }, [currentTime, currentShot]);

  // Video playback controls
  const handlePlayPause = () => {
    if (currentTime >= 15.0) {
      setCurrentTime(0);
      spokenSceneIds.current.clear();
      setIsPlaying(true);
      return;
    }
    setIsPlaying(prev => !prev);
  };

  const handleRestart = () => {
    setIsPlaying(false);
    if (synthRef.current) synthRef.current.cancel();
    if (musicPlayerRef.current) musicPlayerRef.current.stop();
    spokenSceneIds.current.clear();
    setCurrentTime(0);
  };

  const handleSeek = (newSec: number) => {
    if (synthRef.current) synthRef.current.cancel();
    spokenSceneIds.current.clear();
    setCurrentTime(newSec);

    // If seeking while playing, register past scenes
    if (isPlaying) {
      VIDEO_SCENES.forEach(s => {
        if (newSec > s.startSec + 1.0) spokenSceneIds.current.add(s.id);
      });
    }
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!videoContainerRef.current) return;
    if (!document.fullscreenElement) {
      videoContainerRef.current.requestFullscreen().catch(err => console.log(err));
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(err => console.log(err));
      setIsFullscreen(false);
    }
  };

  // Export / Record full 15s WebM video from Canvas
  const handleExportVideo = () => {
    if (isRecording) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    handleRestart();
    recordedChunksRef.current = [];

    const stream = canvas.captureStream(30); // 30 FPS
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm'
    });

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        recordedChunksRef.current.push(e.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      setRecordedVideoUrl(url);

      // Auto trigger download
      const a = document.createElement('a');
      a.href = url;
      a.download = 'jjimjilbang_culture_15s_travel_video.webm';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    };

    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start();
    setIsRecording(true);
    setIsPlaying(true);
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans selection:bg-amber-500/30">
      {/* Top Header */}
      <header className="border-b border-stone-800/80 bg-stone-900/80 backdrop-blur-md sticky top-0 z-40 px-4 lg:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-600 via-orange-500 to-amber-400 flex items-center justify-center shadow-lg shadow-orange-950/40 border border-amber-400/20">
            <Film className="w-5 h-5 text-stone-950 font-bold" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-semibold text-stone-100 text-sm tracking-wide sm:text-base">
                Korean Jjimjilbang Culture • 15s Travel Video
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full">
                Video Rendered
              </span>
            </div>
            <p className="text-xs text-stone-400 hidden sm:block">
              Realistic travel-video visuals with natural movement, friendly voiceover, and synchronized subtitles
            </p>
          </div>
        </div>

        {/* Video Download / Export Action */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportVideo}
            disabled={isRecording}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold shadow-md transition-all ${
              isRecording 
                ? 'bg-rose-600 text-white animate-pulse' 
                : 'bg-amber-500 hover:bg-amber-400 text-stone-950'
            }`}
            title="Record and download the 15-second video file"
          >
            {isRecording ? (
              <>
                <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                <span>Recording 15s Video...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Export Video (WebM)</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Video Viewport & Studio */}
      <main className="flex-1 max-w-6xl mx-auto w-full p-4 lg:p-8 flex flex-col gap-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left / Center: Vertical 9:16 YouTube Shorts Player */}
          <div className="lg:col-span-6 flex flex-col items-center">
            <div 
              ref={videoContainerRef} 
              className="relative w-full max-w-[380px] sm:max-w-[400px] aspect-[9/16] bg-black rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-stone-800 ring-1 ring-white/10 group flex flex-col justify-end"
            >
              {/* Real-time HTML5 Canvas rendering cinematic 1080x1920 9:16 camera motion & subtitles */}
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full object-cover"
              />

              {/* YouTube Shorts UI Overlays: Top Header & Timecode */}
              <div className="absolute top-5 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
                <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 shadow-lg">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                  <span className="text-[11px] font-bold tracking-wider uppercase text-white">
                    SHORTS • 9:16
                  </span>
                </div>

                <div className="font-mono text-[11px] bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full text-stone-200 border border-white/10">
                  {currentTime.toFixed(1)}s / 15.0s
                </div>
              </div>

              {/* Big Center Play Button Overlay when paused */}
              {!isPlaying && (
                <button
                  onClick={handlePlayPause}
                  className="absolute inset-0 m-auto w-20 h-20 rounded-full bg-amber-500/95 hover:bg-amber-400 text-stone-950 flex items-center justify-center shadow-2xl shadow-orange-950/90 transition-transform hover:scale-105 active:scale-95 z-30 cursor-pointer backdrop-blur-sm"
                  aria-label="Play video"
                >
                  {currentTime >= 15.0 ? (
                    <RotateCcw className="w-8 h-8" />
                  ) : (
                    <Play className="w-8 h-8 fill-current ml-1" />
                  )}
                </button>
              )}

              {/* Bottom Shorts Player Controls Bar */}
              <div className="relative z-20 bg-gradient-to-t from-black/95 via-black/70 to-transparent pt-12 pb-3.5 px-4 flex flex-col gap-2.5">
                {/* 15-Second Interactive Scrubber with Scene Chapter Markers */}
                <div className="relative flex items-center group/scrub">
                  <div
                    className="relative w-full h-2 bg-stone-700/70 rounded-full cursor-pointer overflow-hidden border border-white/10"
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                      handleSeek(pct * 15.0);
                    }}
                  >
                    {/* Active Played Fill */}
                    <div
                      className="absolute top-0 left-0 bottom-0 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-300 transition-all duration-75"
                      style={{ width: `${(currentTime / 15.0) * 100}%` }}
                    />

                    {/* 5s Marker */}
                    <div 
                      className="absolute top-0 bottom-0 left-[33.333%] w-0.5 bg-white/60 z-10" 
                      title="5.0s: Scene 2 begins"
                    />

                    {/* 10s Marker */}
                    <div 
                      className="absolute top-0 bottom-0 left-[66.666%] w-0.5 bg-white/60 z-10" 
                      title="10.0s: Scene 3 begins"
                    />
                  </div>
                </div>

                {/* Bottom Controls Row inside Shorts player */}
                <div className="flex items-center justify-between text-xs text-stone-300">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handlePlayPause}
                      className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                      title={isPlaying ? "Pause" : "Play"}
                    >
                      {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                    </button>

                    <button
                      onClick={handleRestart}
                      className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                      title="Restart to 0:00"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>

                    <span className="font-mono text-[10px] text-stone-300">
                      {currentTime.toFixed(1)}s / 15.0s
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Voiceover Toggle */}
                    <button
                      onClick={() => setIsVoiceEnabled(!isVoiceEnabled)}
                      className={`p-1.5 rounded-lg border text-[10px] transition-colors ${
                        isVoiceEnabled 
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' 
                          : 'bg-stone-800 text-stone-500 border-stone-700'
                      }`}
                      title={isVoiceEnabled ? "English voiceover ON" : "Voiceover muted"}
                    >
                      <Mic className="w-3.5 h-3.5" />
                    </button>

                    {/* Background Music Toggle */}
                    <button
                      onClick={() => setIsMusicEnabled(!isMusicEnabled)}
                      className={`p-1.5 rounded-lg border text-[10px] transition-colors ${
                        isMusicEnabled 
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' 
                          : 'bg-stone-800 text-stone-500 border-stone-700'
                      }`}
                      title={isMusicEnabled ? "Quiet background music ON" : "Music muted"}
                    >
                      <Music className="w-3.5 h-3.5" />
                    </button>

                    {/* Fullscreen Button */}
                    <button
                      onClick={toggleFullscreen}
                      className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                      title="Toggle Fullscreen"
                    >
                      {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick jump tabs below phone */}
            <div className="flex items-center gap-2 mt-4 bg-stone-900/80 p-1.5 rounded-xl border border-stone-800 text-xs">
              <button
                onClick={() => handleSeek(0)}
                className={`px-3 py-1 rounded-lg text-xs transition-colors ${
                  currentTime < 5 ? 'bg-amber-500 text-stone-950 font-bold' : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                0–5s Lounge
              </button>
              <button
                onClick={() => handleSeek(5.0)}
                className={`px-3 py-1 rounded-lg text-xs transition-colors ${
                  currentTime >= 5 && currentTime < 10 ? 'bg-amber-500 text-stone-950 font-bold' : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                5–10s Hot & Cold
              </button>
              <button
                onClick={() => handleSeek(10.0)}
                className={`px-3 py-1 rounded-lg text-xs transition-colors ${
                  currentTime >= 10 ? 'bg-amber-500 text-stone-950 font-bold' : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                10–15s Eggs & Sikhye
              </button>
            </div>
          </div>

          {/* Right Side: YouTube Shorts Spec Card & Scene Breakdown */}
          <div className="lg:col-span-6 flex flex-col gap-4">
            {/* Format Spec Banner */}
            <div className="p-4 rounded-2xl bg-stone-900/70 border border-stone-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-amber-400 block uppercase tracking-wider">
                  Target Platform Standard
                </span>
                <span className="text-sm font-bold text-stone-100">
                  YouTube Shorts Vertical 9:16 (1080×1920)
                </span>
                <p className="text-xs text-stone-400 mt-0.5">
                  Framing adjusted for vertical mobile viewport with safe-zone subtitles.
                </p>
              </div>
              <button
                onClick={handleExportVideo}
                disabled={isRecording}
                className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow-md transition-all"
              >
                <Download className="w-4 h-4" />
                <span>{isRecording ? "Recording..." : "Export WebM"}</span>
              </button>
            </div>

            {/* Audio Settings & Volume Bar */}
            <div className="p-3.5 rounded-xl bg-stone-900/60 border border-stone-800 flex items-center justify-between text-xs text-stone-300">
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider">Audio Mix</span>
                <span className="text-stone-600">|</span>
                <span className="text-xs text-amber-300 font-medium">Conversational Narrator + Ambient Lofi</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setVolume(v => v === 0 ? 0.8 : 0)} className="text-stone-300 hover:text-white">
                  {volume === 0 ? <VolumeX className="w-4 h-4 text-stone-500" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="w-20 h-1.5 bg-stone-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
              </div>
            </div>

            {/* Video Production Cue Sheet & Scene Breakdown Cards */}
            <div className="flex flex-col gap-3">
              {VIDEO_SCENES.map((scene) => {
                const isActive = currentTime >= scene.startSec && (currentTime < scene.endSec || (scene.id === 3 && currentTime <= 15));
                return (
                  <div
                    key={scene.id}
                    onClick={() => handleSeek(scene.startSec)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col gap-2.5 ${
                      isActive
                        ? 'bg-stone-900/95 border-amber-500/80 shadow-lg shadow-amber-950/20 ring-1 ring-amber-500/40'
                        : 'bg-stone-900/40 border-stone-800/80 hover:bg-stone-900/70'
                    }`}
                  >
                    {/* Scene Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
                          isActive ? 'bg-amber-500 text-stone-950' : 'bg-stone-800 text-amber-400'
                        }`}>
                          {scene.timeRange}
                        </span>
                        <h3 className="font-semibold text-stone-200 text-xs sm:text-sm">
                          {scene.title}
                        </h3>
                      </div>
                      <span className="text-[10px] text-stone-400">
                        {scene.shots.length === 1 ? '1 continuous shot' : '2 connected shots'}
                      </span>
                    </div>

                    {/* Spoken Voiceover */}
                    <div className="bg-stone-950/80 p-2.5 rounded-lg border border-stone-800/80 text-xs">
                      <span className="text-[10px] uppercase font-bold text-stone-400 block mb-0.5 flex items-center gap-1">
                        <Mic className="w-3 h-3 text-amber-400" />
                        <span>Voiceover (English):</span>
                      </span>
                      <p className="text-stone-100 font-medium italic">
                        “{scene.voiceoverText}”
                      </p>
                      {scene.voiceoverPronunciation !== scene.voiceoverText && (
                        <span className="text-[10px] text-amber-400/80 block mt-0.5 font-mono">
                          Phonetic delivery: {scene.voiceoverPronunciation}
                        </span>
                      )}
                    </div>

                    {/* Subtitles on screen */}
                    <div className="bg-amber-950/20 p-2.5 rounded-lg border border-amber-900/30 text-xs">
                      <span className="text-[10px] uppercase font-bold text-amber-400 block mb-0.5">
                        Shorts Subtitles (Safe-Zone Lower 25%):
                      </span>
                      <p className="font-mono text-stone-200 text-[11px] leading-snug">
                        {scene.subtitles[0]}<br />
                        {scene.subtitles[1]}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Video Production Requirements Checklist */}
        <div className="bg-stone-900/40 rounded-xl p-4 border border-stone-800/80 text-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-stone-400">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
            <span className="text-stone-200 font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              15.0s Total Runtime
            </span>
            <span>• 1 friendly conversational English narrator</span>
            <span>• Pronunciation guide: “jjim-jil-bang” & “shik-hyeh”</span>
            <span>• Quiet Web Audio background music</span>
            <span>• White subtitles with subtle shadow (no black slides)</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-800/60 bg-stone-950 px-4 py-4 text-center text-xs text-stone-500">
        Created for Korean cultural travel video production • 15-Second Video Completed
      </footer>
    </div>
  );
}
