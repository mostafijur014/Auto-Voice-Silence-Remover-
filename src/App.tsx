import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Settings2, 
  Sparkles, 
  Download, 
  Loader2, 
  AlertCircle, 
  CheckCircle2,
  Volume2,
  Clock,
  Scissors
} from "lucide-react";
import FileUploader from "./components/FileUploader";
import Waveform from "./components/Waveform";

interface ProcessResult {
  filename: string;
  beforeDuration: number;
  afterDuration: number;
  downloadUrl: string;
}

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [threshold, setThreshold] = useState(-50);
  const [duration, setDuration] = useState(0.5);
  const [outputFormat, setOutputFormat] = useState<"mp3" | "wav">("mp3");
  const [autoMode, setAutoMode] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ProcessResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setOriginalUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [file]);

  const handleProcess = async () => {
    if (!file) return;

    setIsProcessing(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append("audio", file);
    formData.append("threshold", `${threshold}dB`);
    formData.append("duration", duration.toString());
    formData.append("autoMode", autoMode.toString());
    formData.append("outputFormat", outputFormat);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.details || "Failed to process audio");
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      // Suppress "aborted" errors which can happen if the request is cancelled
      if (err instanceof Error && (err.name === "AbortError" || err.message.includes("aborted"))) {
        console.debug("Fetch request was aborted");
        return;
      }
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsProcessing(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleDownload = async () => {
    if (!result) return;
    
    try {
      const response = await fetch(result.downloadUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error("Download failed:", err);
      setError("Failed to download file. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans selection:bg-indigo-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
              <Scissors size={18} />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">SilenceRemover AI</h1>
          </div>
          <div className="hidden sm:flex items-center gap-4 text-sm text-slate-500">
            <span className="flex items-center gap-1.5"><Sparkles size={14} /> AI-Powered</span>
            <span className="flex items-center gap-1.5"><Volume2 size={14} /> Lossless Quality</span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Controls */}
          <div className="lg:col-span-5 space-y-6">
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex items-center gap-2 mb-6">
                <Settings2 size={20} className="text-indigo-600" />
                <h2 className="font-semibold text-slate-900">Processing Controls</h2>
              </div>

              <div className="space-y-8">
                {/* Auto Mode Toggle */}
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${autoMode ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                      <Sparkles size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">Auto Mode</p>
                      <p className="text-xs text-slate-500">AI detects best settings</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setAutoMode(!autoMode)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${autoMode ? 'bg-indigo-600' : 'bg-slate-300'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${autoMode ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                {/* Output Format Selection */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-slate-600">Output Format</label>
                  <div className="flex gap-2">
                    {["mp3", "wav"].map((format) => (
                      <button
                        key={format}
                        onClick={() => setOutputFormat(format as "mp3" | "wav")}
                        className={`flex-1 py-2 rounded-lg text-sm font-bold uppercase transition-all ${
                          outputFormat === format
                            ? "bg-indigo-600 text-white shadow-md"
                            : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                        }`}
                      >
                        {format}
                      </button>
                    ))}
                  </div>
                </div>

                <AnimatePresence mode="wait">
                  {!autoMode && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-6 overflow-hidden"
                    >
                      {/* Threshold Slider */}
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <label className="text-slate-600 font-medium">Silence Threshold</label>
                          <span className="text-indigo-600 font-mono font-bold">{threshold} dB</span>
                        </div>
                        <input
                          type="range"
                          min="-80"
                          max="-20"
                          step="1"
                          value={threshold}
                          onChange={(e) => setThreshold(parseInt(e.target.value))}
                          className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                        />
                        <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                          <span>-80dB (Strict)</span>
                          <span>-20dB (Loose)</span>
                        </div>
                      </div>

                      {/* Duration Slider */}
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <label className="text-slate-600 font-medium">Min Silence Duration</label>
                          <span className="text-indigo-600 font-mono font-bold">{duration}s</span>
                        </div>
                        <input
                          type="range"
                          min="0.01"
                          max="2"
                          step="0.01"
                          value={duration}
                          onChange={(e) => setDuration(parseFloat(e.target.value))}
                          className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                        />
                        <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                          <span>0.01s</span>
                          <span>2.0s</span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <button
                  onClick={handleProcess}
                  disabled={!file || isProcessing}
                  className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all duration-200 ${
                    !file || isProcessing
                      ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                      : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200 active:scale-[0.98]"
                  }`}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      Processing Audio...
                    </>
                  ) : (
                    <>
                      <Scissors size={20} />
                      Remove Silence
                    </>
                  )}
                </button>
              </div>
            </section>

            {error && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-red-600">
                <AlertCircle size={20} className="shrink-0 mt-0.5" />
                <p className="text-sm font-medium">{error}</p>
              </div>
            )}
          </div>

          {/* Right Column: Upload & Results */}
          <div className="lg:col-span-7 space-y-6">
            <FileUploader onFileSelect={setFile} />

            <AnimatePresence>
              {file && originalUrl && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  <Waveform url={originalUrl} label="Original Audio" />

                  {result && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="space-y-6"
                    >
                      <div className="p-6 bg-emerald-50 border border-emerald-100 rounded-2xl">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2 text-emerald-700">
                            <CheckCircle2 size={20} />
                            <h3 className="font-bold">Processing Complete!</h3>
                          </div>
                          <button
                            onClick={handleDownload}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-bold shadow-md shadow-emerald-100"
                          >
                            <Download size={16} />
                            Download
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-white/50 p-3 rounded-xl">
                            <div className="flex items-center gap-1.5 text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-1">
                              <Clock size={12} /> Before
                            </div>
                            <p className="text-lg font-mono font-bold text-slate-700">{formatDuration(result.beforeDuration)}</p>
                          </div>
                          <div className="bg-white/50 p-3 rounded-xl">
                            <div className="flex items-center gap-1.5 text-emerald-600 text-[10px] uppercase font-bold tracking-wider mb-1">
                              <Scissors size={12} /> After
                            </div>
                            <p className="text-lg font-mono font-bold text-emerald-700">{formatDuration(result.afterDuration)}</p>
                          </div>
                        </div>
                        
                        <div className="mt-4 text-xs text-emerald-600 font-medium">
                          Removed {formatDuration(result.beforeDuration - result.afterDuration)} of silence (
                          {Math.round((1 - result.afterDuration / result.beforeDuration) * 100)}% reduction)
                        </div>
                      </div>

                      <Waveform url={result.downloadUrl} label="Processed Audio" color="#10b981" />
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {!file && (
              <div className="h-[400px] border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400 bg-slate-50/50">
                <Volume2 size={48} className="mb-4 opacity-20" />
                <p className="text-sm font-medium">Upload an audio file to see the waveform</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-5xl mx-auto px-6 py-12 border-t border-slate-200 mt-12 text-center">
        <p className="text-sm text-slate-500">
          Powered by FFmpeg & AI • Secure local processing
        </p>
      </footer>
    </div>
  );
}
