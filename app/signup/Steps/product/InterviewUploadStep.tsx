"use client";

import { useState, useRef } from "react";
import { ArrowRight, Upload, FileText, Music, Video, File, X } from "lucide-react";
import SignupStepLayout from "../SignupStepLayout";
import { useSignupForm } from "../../SignupFormContext";

const ACCEPTED = ".pdf,.docx,.txt,.mp3,.mp4,.m4a,.wav,.mov";

export type UploadedFile = {
  name: string;
  size: number;
  type: string;
  path: string;
};

type InterviewUploadStepProps = {
  value: UploadedFile[];
  onBack?: () => void;
  onContinue: (files: UploadedFile[]) => void;
  onSkip: () => void;
  sessionId: string | null;
  progressPercent?: number;
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(type: string) {
  if (type.startsWith("audio/") || type.startsWith("video/")) {
    return type.startsWith("video/") ? Video : Music;
  }
  if (type === "application/pdf" || type.includes("text")) return FileText;
  return File;
}

export default function InterviewUploadStep({
  value,
  onBack,
  onContinue,
  onSkip,
  sessionId,
  progressPercent = 91,
}: InterviewUploadStepProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { submitting } = useSignupForm();

  const hasExisting = value.length > 0;

  function addFiles(incoming: FileList | File[]) {
    const arr = Array.from(incoming);
    setFiles((prev) => {
      const names = new Set(prev.map((f) => f.name));
      return [...prev, ...arr.filter((f) => !names.has(f.name))];
    });
  }

  function removeFile(name: string) {
    setFiles((prev) => prev.filter((f) => f.name !== name));
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  }

  async function handleContinue() {
    if (files.length === 0) {
      onContinue(value);
      return;
    }

    if (!sessionId) {
      setUploadError("Session ID missing. Please refresh and try again.");
      return;
    }

    setUploading(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append("sessionId", sessionId);
      files.forEach((f) => formData.append("files", f));

      const res = await fetch("/api/signup/interview-upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error || "Upload failed");
      }

      const json = await res.json();
      onContinue(json.files as UploadedFile[]);
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <SignupStepLayout progressPercent={progressPercent}>
      <div className="w-full flex flex-col items-center justify-center">
        <div className="w-full max-w-4xl mx-auto grid md:grid-cols-2 gap-12 items-center justify-items-center">
          <div className="space-y-6 w-full max-w-lg text-center md:text-left md:justify-self-stretch">
            <div className="animate-fade-slide-in step-delay-1 w-12 h-12 rounded-xl bg-[#fff4e6] flex items-center justify-center mx-auto md:mx-0">
              <Upload className="w-6 h-6 text-[#f97316]" />
            </div>

            <div className="animate-fade-slide-in step-delay-2 space-y-4">
              <h1 className="text-4xl font-bold tracking-tight text-black">
                Upload your
                <br />
                <span className="text-[#f97316]">interviews</span>
              </h1>
              <p className="animate-fade-slide-in step-delay-3 text-muted-foreground leading-relaxed">
                Share your interview recordings or transcripts. We&apos;ll analyze them to surface key insights.
              </p>
            </div>

            <div className="animate-fade-slide-in step-delay-4 bg-[#fafafa] rounded-lg p-5 space-y-3 md:mx-0 mx-auto max-w-md">
              <div className="flex items-center gap-2 justify-center md:justify-start">
                <div className="w-1.5 h-1.5 rounded-full bg-[#f97316]" />
                <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  Accepted formats
                </span>
              </div>
              <p className="font-mono text-sm text-black leading-relaxed">
                <span className="text-[#f97316]">PDF, DOCX, TXT</span> — transcripts
                <br />
                <span className="text-[#f97316]">MP3, MP4, M4A, WAV, MOV</span> — recordings
              </p>
            </div>
          </div>

          <div className="space-y-4 w-full max-w-lg flex flex-col items-center md:items-stretch md:justify-self-stretch">
            <div className="animate-fade-slide-in step-delay-5 space-y-3 w-full">
              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                  dragOver
                    ? "border-orange-400 bg-orange-50"
                    : "border-gray-300 hover:border-orange-300 hover:bg-gray-50"
                }`}
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
              >
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-700">Drag & drop files here</p>
                <p className="text-xs text-muted-foreground mt-1">or click to browse</p>
                <input
                  ref={inputRef}
                  type="file"
                  multiple
                  accept={ACCEPTED}
                  className="hidden"
                  onChange={(e) => e.target.files && addFiles(e.target.files)}
                />
              </div>

              {files.length > 0 && (
                <div className="space-y-2">
                  {files.map((file) => {
                    const Icon = getFileIcon(file.type);
                    return (
                      <div
                        key={file.name}
                        className="flex items-center gap-3 px-3 py-2 bg-white border border-gray-200 rounded-lg"
                      >
                        <Icon className="w-4 h-4 text-orange-500 flex-shrink-0" />
                        <span className="flex-1 text-sm text-gray-800 truncate">{file.name}</span>
                        <span className="text-xs text-muted-foreground flex-shrink-0">
                          {formatBytes(file.size)}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeFile(file.name)}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                          aria-label={`Remove ${file.name}`}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {hasExisting && files.length === 0 && (
                <p className="text-xs text-green-600">
                  {value.length} file{value.length !== 1 ? "s" : ""} already uploaded.
                </p>
              )}

              {uploadError && <p className="text-sm text-red-600">{uploadError}</p>}
            </div>

            <div className="animate-fade-slide-in step-delay-6 flex flex-col sm:flex-row items-center justify-center gap-4 sm:justify-between pt-2 w-full">
              <div className="flex items-center gap-2 text-sm text-muted-foreground order-2 sm:order-1">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span>Auto-saved</span>
              </div>

              <div className="flex items-center justify-center gap-5 order-1 sm:order-2">
                <button
                  type="button"
                  onClick={onBack}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleContinue}
                  disabled={uploading || submitting}
                  className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? "Uploading…" : "Continue"}
                  {!uploading && <ArrowRight className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="text-center">
              <button
                type="button"
                onClick={onSkip}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
              >
                Skip for now
              </button>
            </div>
          </div>
        </div>
      </div>
    </SignupStepLayout>
  );
}
