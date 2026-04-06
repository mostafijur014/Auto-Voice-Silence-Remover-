import { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import { Play, Pause, RotateCcw } from "lucide-react";

interface WaveformProps {
  url: string;
  label: string;
  color?: string;
}

export default function Waveform({ url, label, color = "#4f46e5" }: WaveformProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;

    const wavesurfer = WaveSurfer.create({
      container: containerRef.current,
      waveColor: color + "80",
      progressColor: color,
      cursorColor: color,
      barWidth: 2,
      barRadius: 3,
      height: 80,
      normalize: true,
    });

    wavesurfer.load(url);

    wavesurfer.on("ready", () => {
      setDuration(wavesurfer.getDuration());
    });

    wavesurfer.on("error", (err) => {
      // Suppress "signal is aborted" errors which are often benign during cleanup
      if (err.message?.includes("abort") || err.name === "AbortError") {
        console.debug("WaveSurfer load aborted (expected during cleanup)");
        return;
      }
      console.error("WaveSurfer error:", err);
    });

    wavesurfer.on("audioprocess", () => {
      setCurrentTime(wavesurfer.getCurrentTime());
    });

    wavesurfer.on("play", () => setIsPlaying(true));
    wavesurfer.on("pause", () => setIsPlaying(false));
    wavesurfer.on("finish", () => setIsPlaying(false));

    wavesurferRef.current = wavesurfer;

    return () => {
      wavesurfer.destroy();
    };
  }, [url, color]);

  const togglePlay = () => {
    wavesurferRef.current?.playPause();
  };

  const stop = () => {
    wavesurferRef.current?.stop();
    setIsPlaying(false);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">{label}</span>
        <span className="text-xs font-mono text-gray-400">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>
      
      <div ref={containerRef} className="mb-4" />

      <div className="flex items-center gap-2">
        <button
          onClick={togglePlay}
          className="p-2 rounded-full bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
        >
          {isPlaying ? <Pause size={20} /> : <Play size={20} />}
        </button>
        <button
          onClick={stop}
          className="p-2 rounded-full bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <RotateCcw size={20} />
        </button>
      </div>
    </div>
  );
}
