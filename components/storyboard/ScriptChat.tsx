"use client";

import { useState } from "react";
import { useLocale } from "@/contexts/LocaleContext";
import type { ChatMessage } from "@/lib/storyboard/types";

interface ScriptChatProps {
  chat: ChatMessage[];
  disabled: boolean;
  onSend: (message: string) => void;
}

export function ScriptChat({ chat, disabled, onSend }: ScriptChatProps) {
  const { t } = useLocale();
  const [message, setMessage] = useState("");

  const send = () => {
    if (!message.trim()) return;
    onSend(message.trim());
    setMessage("");
  };

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex max-h-72 flex-col gap-2 overflow-y-auto">
        {chat.map((m) => (
          <li
            key={m.at}
            className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
              m.role === "user" ? "self-end bg-accent/20 text-foreground" : "self-start bg-surface text-foreground"
            }`}
          >
            {m.text}
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <input
          value={message}
          disabled={disabled}
          placeholder={t("storyboard.script.chatPlaceholder")}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.nativeEvent.isComposing) send();
          }}
          className="flex-1 bg-surface border border-line rounded-lg px-3.5 py-2.5 text-sm text-foreground focus:border-accent focus:outline-none disabled:opacity-50"
        />
        <button
          type="button"
          disabled={disabled || !message.trim()}
          onClick={send}
          className="h-10 px-4 rounded-lg border border-line text-sm text-foreground hover:bg-white/5 disabled:opacity-40"
        >
          {t("storyboard.script.send")}
        </button>
      </div>
    </div>
  );
}
