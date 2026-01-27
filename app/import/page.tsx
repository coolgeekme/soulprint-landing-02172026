"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Upload, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import JSZip from "jszip";

type ImportStatus = "idle" | "extracting" | "uploading" | "processing" | "complete" | "error";

export default function ImportPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [status, setStatus] = useState<ImportStatus>("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState("");
  const [stats, setStats] = useState<{
    conversations: number;
    messages: number;
  } | null>(null);

  // Check auth on mount
  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
      }
    };
    checkAuth();
  }, [router]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith(".zip")) {
        setError("Please select a ZIP file");
        return;
      }
      setSelectedFile(file);
      setError("");
    }
  };

  const extractConversationsFromZip = async (file: File): Promise<string> => {
    const zip = new JSZip();
    const contents = await zip.loadAsync(file);
    
    const conversationsFile = contents.file("conversations.json");
    if (!conversationsFile) {
      throw new Error("conversations.json not found in ZIP file");
    }
    
    return await conversationsFile.async("text");
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setError("");
    setStatus("extracting");
    setStatusMessage("Extracting conversations from ZIP...");

    try {
      // Extract conversations.json from ZIP
      const conversationsJson = await extractConversationsFromZip(selectedFile);
      
      // Quick parse to get count
      const parsed = JSON.parse(conversationsJson);
      const conversationCount = Array.isArray(parsed) ? parsed.length : 0;
      
      setStatus("uploading");
      setStatusMessage(`Found ${conversationCount} conversations. Uploading...`);

      // Send to API
      setStatus("processing");
      setStatusMessage("Processing your ChatGPT history...");

      const response = await fetch("/api/import/gpt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          conversations: conversationsJson,
          fastMode: true 
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Import failed");
      }

      setStats({
        conversations: result.stats?.conversationsImported || 0,
        messages: result.stats?.messagesImported || 0,
      });

      setStatus("complete");
      setStatusMessage("Import complete! Redirecting to chat...");

      // Redirect to chat after a moment
      setTimeout(() => {
        router.push("/chat");
      }, 2000);

    } catch (err) {
      console.error("Import error:", err);
      setStatus("error");
      setError(err instanceof Error ? err.message : "Import failed");
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case "extracting":
      case "uploading":
      case "processing":
        return <Loader2 className="w-8 h-8 text-[#EA580C] animate-spin" />;
      case "complete":
        return <CheckCircle className="w-8 h-8 text-green-500" />;
      case "error":
        return <AlertCircle className="w-8 h-8 text-red-500" />;
      default:
        return <Upload className="w-8 h-8 text-[#EA580C]" />;
    }
  };

  return (
    <main className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-md flex flex-col gap-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="font-koulen text-4xl text-white mb-2">
            IMPORT YOUR DATA
          </h1>
          <p className="text-gray-400">
            Upload your ChatGPT export to create your SoulPrint
          </p>
        </div>

        {/* Instructions */}
        <div className="bg-[#111] border border-[#222] rounded-xl p-5">
          <h2 className="font-semibold text-white mb-3">How to export from ChatGPT:</h2>
          <ol className="space-y-2 text-sm text-gray-400">
            <li className="flex gap-3">
              <span className="text-[#EA580C] font-bold">1.</span>
              Go to chat.openai.com → Settings
            </li>
            <li className="flex gap-3">
              <span className="text-[#EA580C] font-bold">2.</span>
              Click Data Controls → Export Data
            </li>
            <li className="flex gap-3">
              <span className="text-[#EA580C] font-bold">3.</span>
              Download the ZIP from your email
            </li>
            <li className="flex gap-3">
              <span className="text-[#EA580C] font-bold">4.</span>
              Upload it here
            </li>
          </ol>
        </div>

        {/* Error */}
        {error && (
          <div className="p-4 text-sm text-red-400 bg-red-900/20 border border-red-900/30 rounded-xl">
            {error}
          </div>
        )}

        {/* Status */}
        {status !== "idle" && status !== "error" && (
          <div className="flex items-center gap-4 p-4 bg-[#111] border border-[#222] rounded-xl">
            {getStatusIcon()}
            <div>
              <p className="text-white font-medium">{statusMessage}</p>
              {stats && (
                <p className="text-sm text-gray-400">
                  {stats.conversations} conversations, {stats.messages} messages
                </p>
              )}
            </div>
          </div>
        )}

        {/* File Upload */}
        {status === "idle" || status === "error" ? (
          <div className="flex flex-col gap-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".zip"
              onChange={handleFileSelect}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="min-h-[180px] border-2 border-dashed border-[#333] rounded-xl flex flex-col items-center justify-center gap-4 hover:border-[#EA580C]/50 hover:bg-[#EA580C]/5 transition-all"
            >
              {selectedFile ? (
                <>
                  <div className="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center">
                    <CheckCircle className="w-7 h-7 text-green-500" />
                  </div>
                  <div className="text-center">
                    <p className="text-white font-medium">{selectedFile.name}</p>
                    <p className="text-gray-500 text-sm">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <p className="text-[#EA580C] text-sm">Tap to change</p>
                </>
              ) : (
                <>
                  <div className="w-14 h-14 rounded-full bg-[#EA580C]/20 flex items-center justify-center">
                    <Upload className="w-7 h-7 text-[#EA580C]" />
                  </div>
                  <div className="text-center">
                    <p className="text-white font-medium">Select ZIP File</p>
                    <p className="text-gray-500 text-sm">
                      Click to browse
                    </p>
                  </div>
                </>
              )}
            </button>

            <Button
              onClick={handleUpload}
              disabled={!selectedFile}
              className="w-full h-14 bg-[#EA580C] hover:bg-[#EA580C]/90 text-white font-bold rounded-xl shadow-lg shadow-[#EA580C]/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Generate My SoulPrint
            </Button>

            <button
              type="button"
              onClick={() => router.push("/chat")}
              className="text-gray-500 text-sm hover:text-gray-400 transition-colors"
            >
              Skip for now →
            </button>
          </div>
        ) : null}
      </div>
    </main>
  );
}
