import { useState, useCallback, DragEvent, ChangeEvent } from "react";
import { Upload, FileAudio, X } from "lucide-react";

interface FileUploaderProps {
  onFileSelect: (file: File) => void;
}

export default function FileUploader({ onFileSelect }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("audio/")) {
      setSelectedFile(file);
      onFileSelect(file);
    }
  }, [onFileSelect]);

  const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      onFileSelect(file);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
  };

  return (
    <div className="w-full">
      {!selectedFile ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center transition-all duration-200 ${
            isDragging
              ? "border-indigo-500 bg-indigo-50 scale-[1.02]"
              : "border-gray-200 bg-gray-50 hover:border-indigo-300 hover:bg-white"
          }`}
        >
          <input
            type="file"
            accept="audio/*"
            onChange={handleFileInput}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div className="p-4 bg-indigo-100 rounded-full text-indigo-600 mb-4">
            <Upload size={32} />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            Upload Audio File
          </h3>
          <p className="text-sm text-gray-500 text-center max-w-xs">
            Drag and drop your WAV, MP3, or M4A file here, or click to browse
          </p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
              <FileAudio size={24} />
            </div>
            <div>
              <h4 className="font-medium text-gray-900 truncate max-w-[200px]">
                {selectedFile.name}
              </h4>
              <p className="text-xs text-gray-500">
                {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
              </p>
            </div>
          </div>
          <button
            onClick={clearFile}
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>
      )}
    </div>
  );
}
