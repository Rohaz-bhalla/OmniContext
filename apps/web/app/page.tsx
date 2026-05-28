"use client";

import { useState, useRef, useEffect } from "react";
import {
  Send,
  Bot,
  User,
  Loader2,
  Database,
  FolderSync,
  Sparkles,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ModeToggle } from "@/components/toggle-theme";
import { cn } from "@/lib/utils";

// Determine the backend URL dynamically based on the environment.
// In dev, route to the local Python API. In production, use relative paths.
const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === "development" ? "http://127.0.0.1:8000" : "");

type Message = { role: "user" | "ai"; text: string; sources?: string[] };

export default function OmniContextUI() {
  const [folderId, setFolderId] = useState("");
  const [isIngesting, setIsIngesting] = useState(false);
  const [ingestStatus, setIngestStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [question, setQuestion] = useState("");
  const [isChatting, setIsChatting] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isChatting]);

  const handleIngest = async () => {
    // --- FIX APPLIED HERE: Strip accidental whitespace ---
    const cleanId = folderId.trim();
    if (!cleanId) return;

    setIsIngesting(true);
    setIngestStatus(null);
    try {
      const res = await fetch(`${API_BASE}/api/ingest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Send the cleaned ID to the backend
        body: JSON.stringify({ folder_id: cleanId }),
      });

      const data = await res.json().catch(() => null);

      if (res.ok && data) {
        setIngestStatus({
          type: "success",
          message: data.message || "Sync complete.",
        });
      } else {
        setIngestStatus({
          type: "error",
          message: data?.detail || `Server error: ${res.status}`,
        });
      }
    } catch (err) {
      console.error("Ingestion error:", err);
      setIngestStatus({
        type: "error",
        message: "Failed to connect to the RAG engine. Is the backend running?",
      });
    } finally {
      setIsIngesting(false);
    }
  };

  const handleChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    const text = question;
    setMessages((p) => [...p, { role: "user", text }]);
    setQuestion("");
    setIsChatting(true);

    try {
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text }),
      });

      const data = await res.json().catch(() => null);

      if (res.ok && data) {
        setMessages((p) => [
          ...p,
          { role: "ai", text: data.answer, sources: data.sources },
        ]);
      } else {
        setMessages((p) => [
          ...p,
          { role: "ai", text: `Error: ${data?.detail || res.statusText}` },
        ]);
      }
    } catch (err) {
      console.error("Chat error:", err);
      setMessages((p) => [
        ...p,
        {
          role: "ai",
          text: "Connection failed. Please ensure the backend server is reachable.",
        },
      ]);
    } finally {
      setIsChatting(false);
    }
  };

  const qCount = messages.filter((m) => m.role === "user").length;

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        width: "100%",
        overflow: "hidden",
      }}
      className="bg-background text-foreground"
    >
      {/* ═══════════════ SIDEBAR ═══════════════ */}
      <aside
        style={{
          width: "264px",
          minWidth: "264px",
          display: "flex",
          flexDirection: "column",
          borderRight: "1px solid hsl(var(--border))",
        }}
        className="bg-muted/20"
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            paddingLeft: "20px",
            paddingRight: "20px",
            paddingTop: "18px",
            paddingBottom: "18px",
            borderBottom: "1px solid hsl(var(--border))",
          }}
        >
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
            className="bg-primary text-primary-foreground"
          >
            <Database style={{ width: "15px", height: "15px" }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              style={{
                fontSize: "13px",
                fontWeight: 600,
                lineHeight: 1,
                letterSpacing: "-0.01em",
              }}
            >
              OmniContext
            </p>
            <p
              style={{
                fontSize: "10px",
                marginTop: "3px",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
              className="text-muted-foreground"
            >
              RAG Engine
            </p>
          </div>
          <ModeToggle />
        </div>

        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            paddingLeft: "16px",
            paddingRight: "16px",
            paddingTop: "20px",
            paddingBottom: "20px",
            overflowY: "auto",
          }}
        >
          <div
            style={{
              borderRadius: "12px",
              border: "1px solid hsl(var(--border))",
              overflow: "hidden",
            }}
            className="bg-background"
          >
            <div
              style={{
                paddingLeft: "14px",
                paddingRight: "14px",
                paddingTop: "12px",
                paddingBottom: "12px",
                borderBottom: "1px solid hsl(var(--border))",
              }}
              className="bg-muted/30"
            >
              <p
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  letterSpacing: "0.07em",
                  textTransform: "uppercase",
                }}
                className="text-muted-foreground"
              >
                Data Source
              </p>
            </div>

            <div
              style={{
                paddingLeft: "14px",
                paddingRight: "14px",
                paddingTop: "14px",
                paddingBottom: "14px",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              <p
                style={{ fontSize: "12px", lineHeight: "1.6" }}
                className="text-muted-foreground"
              >
                Paste your Google Drive folder ID to begin indexing.
              </p>

              <Input
                placeholder="Folder ID"
                value={folderId}
                onChange={(e) => setFolderId(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleIngest()}
                style={{
                  height: "36px",
                  fontSize: "12px",
                  fontFamily: "monospace",
                }}
              />

              <Button
                onClick={handleIngest}
                disabled={isIngesting || !folderId.trim()}
                style={{
                  width: "100%",
                  height: "36px",
                  fontSize: "13px",
                  gap: "6px",
                }}
              >
                {isIngesting ? (
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{
                      repeat: Infinity,
                      duration: 1,
                      ease: "linear",
                    }}
                    style={{ display: "flex" }}
                  >
                    <Loader2 style={{ width: "13px", height: "13px" }} />
                  </motion.span>
                ) : (
                  <FolderSync style={{ width: "13px", height: "13px" }} />
                )}
                {isIngesting ? "Syncing…" : "Sync Folder"}
              </Button>

              <AnimatePresence>
                {ingestStatus && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "8px",
                      borderRadius: "8px",
                      paddingLeft: "10px",
                      paddingRight: "10px",
                      paddingTop: "9px",
                      paddingBottom: "9px",
                      fontSize: "12px",
                      lineHeight: "1.5",
                    }}
                    className={
                      ingestStatus.type === "success"
                        ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400"
                        : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400"
                    }
                  >
                    {ingestStatus.type === "success" ? (
                      <CheckCircle2
                        style={{
                          width: "13px",
                          height: "13px",
                          marginTop: "1px",
                          flexShrink: 0,
                        }}
                      />
                    ) : (
                      <XCircle
                        style={{
                          width: "13px",
                          height: "13px",
                          marginTop: "1px",
                          flexShrink: 0,
                        }}
                      />
                    )}
                    {ingestStatus.message}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div style={{ flex: 1 }} />

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "7px",
              paddingLeft: "10px",
              paddingRight: "10px",
              paddingTop: "8px",
              paddingBottom: "8px",
              borderRadius: "8px",
              fontSize: "12px",
            }}
            className="bg-muted/50 text-muted-foreground"
          >
            <span
              style={{
                width: "7px",
                height: "7px",
                borderRadius: "50%",
                flexShrink: 0,
              }}
              className={cn(
                "inline-block transition-colors",
                qCount > 0 ? "bg-green-500" : "bg-muted-foreground/30",
              )}
            />
            {qCount > 0
              ? `${qCount} question${qCount !== 1 ? "s" : ""} this session`
              : "No active session"}
          </div>
        </div>
      </aside>

      {/* ═══════════════ MAIN ═══════════════ */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ flex: 1, overflowY: "auto" }}>
          <div
            style={{
              maxWidth: "680px",
              marginLeft: "auto",
              marginRight: "auto",
              paddingLeft: "24px",
              paddingRight: "24px",
              paddingTop: "48px",
              paddingBottom: "40px",
              display: "flex",
              flexDirection: "column",
              gap: "28px",
            }}
          >
            {messages.length === 0 && !isChatting && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  textAlign: "center",
                  paddingTop: "100px",
                  paddingBottom: "100px",
                  gap: "16px",
                }}
              >
                <div
                  style={{
                    width: "52px",
                    height: "52px",
                    borderRadius: "16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  className="border border-border bg-muted"
                >
                  <Sparkles
                    style={{ width: "22px", height: "22px" }}
                    className="text-muted-foreground/60"
                  />
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                  }}
                >
                  <p
                    style={{
                      fontSize: "15px",
                      fontWeight: 600,
                      letterSpacing: "-0.01em",
                    }}
                  >
                    Ask anything about your documents
                  </p>
                  <p
                    style={{ fontSize: "13px" }}
                    className="text-muted-foreground"
                  >
                    Sync a folder on the left, then start a conversation.
                  </p>
                </div>
              </motion.div>
            )}

            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                style={{
                  display: "flex",
                  gap: "12px",
                  flexDirection: msg.role === "user" ? "row-reverse" : "row",
                  alignItems: "flex-start",
                }}
              >
                <div
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "8px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    marginTop: "2px",
                  }}
                  className={cn(
                    "border",
                    msg.role === "ai"
                      ? "bg-primary/10 border-primary/20 text-primary"
                      : "bg-muted border-border text-muted-foreground",
                  )}
                >
                  {msg.role === "ai" ? (
                    <Bot style={{ width: "13px", height: "13px" }} />
                  ) : (
                    <User style={{ width: "13px", height: "13px" }} />
                  )}
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                    maxWidth: "78%",
                    alignItems: msg.role === "user" ? "flex-end" : "flex-start",
                  }}
                >
                  <div
                    style={{
                      paddingLeft: "16px",
                      paddingRight: "16px",
                      paddingTop: "10px",
                      paddingBottom: "10px",
                      borderRadius: "16px",
                      fontSize: "14px",
                      lineHeight: "1.7",
                      borderTopRightRadius:
                        msg.role === "user" ? "4px" : "16px",
                      borderTopLeftRadius: msg.role === "ai" ? "4px" : "16px",
                    }}
                    className={
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted border border-border text-foreground"
                    }
                  >
                    <p style={{ whiteSpace: "pre-wrap", margin: 0 }}>
                      {msg.text}
                    </p>
                  </div>

                  {msg.sources && msg.sources.length > 0 && (
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: 600,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                        }}
                        className="text-muted-foreground"
                      >
                        Sources
                      </span>
                      {msg.sources.map((s, j) => (
                        <Badge
                          key={j}
                          variant="outline"
                          style={{ fontSize: "11px" }}
                        >
                          {s}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}

            {isChatting && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "12px",
                }}
              >
                <div
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "8px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    marginTop: "2px",
                  }}
                  className="bg-primary/10 border border-primary/20 text-primary"
                >
                  <Bot style={{ width: "13px", height: "13px" }} />
                </div>
                <div
                  style={{
                    paddingLeft: "16px",
                    paddingRight: "16px",
                    height: "40px",
                    borderRadius: "16px",
                    borderTopLeftRadius: "4px",
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                  }}
                  className="bg-muted border border-border"
                >
                  {[0, 0.15, 0.3].map((delay, i) => (
                    <motion.span
                      key={i}
                      animate={{ y: [0, -4, 0] }}
                      transition={{
                        repeat: Infinity,
                        duration: 0.7,
                        delay,
                        ease: "easeInOut",
                      }}
                      style={{
                        display: "block",
                        width: "6px",
                        height: "6px",
                        borderRadius: "50%",
                      }}
                      className="bg-muted-foreground/50"
                    />
                  ))}
                </div>
              </motion.div>
            )}

            <div ref={bottomRef} />
          </div>
        </div>

        <div
          style={{
            flexShrink: 0,
            borderTop: "1px solid hsl(var(--border))",
            paddingLeft: "24px",
            paddingRight: "24px",
            paddingTop: "16px",
            paddingBottom: "20px",
          }}
          className="bg-background"
        >
          <form
            onSubmit={handleChat}
            style={{
              maxWidth: "680px",
              marginLeft: "auto",
              marginRight: "auto",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              borderRadius: "12px",
              paddingLeft: "16px",
              paddingRight: "6px",
              paddingTop: "6px",
              paddingBottom: "6px",
            }}
            className="border border-border bg-muted/30 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 ring-offset-background transition-shadow"
          >
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask a question about your documents…"
              disabled={isChatting}
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                outline: "none",
                fontSize: "14px",
                paddingTop: "6px",
                paddingBottom: "6px",
                minWidth: 0,
              }}
              className="text-foreground placeholder:text-muted-foreground/50"
            />
            <Button
              type="submit"
              size="icon"
              disabled={isChatting || !question.trim()}
              style={{
                width: "34px",
                height: "34px",
                borderRadius: "8px",
                flexShrink: 0,
              }}
            >
              <Send style={{ width: "14px", height: "14px" }} />
            </Button>
          </form>
          <p
            style={{ textAlign: "center", marginTop: "10px", fontSize: "11px" }}
            className="text-muted-foreground/40"
          >
            OmniContext · Retrieval-Augmented Generation
          </p>
        </div>
      </div>
    </div>
  );
}
