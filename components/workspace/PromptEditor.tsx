"use client";

import { useLocale } from "@/contexts/LocaleContext";
import { PROMPT_FIELD_KEYS } from "@/lib/ai/prompts";
import type { PromptDraft, PromptFieldKey, PromptFields } from "@/types";

interface PromptEditorProps {
  draft: PromptDraft;
  fields: PromptFields;
  isBusy: boolean;
  onFieldChange: (key: PromptFieldKey, value: string) => void;
  onGenerate: () => void;
}

export function PromptEditor({
  draft,
  fields,
  isBusy,
  onFieldChange,
  onGenerate,
}: PromptEditorProps) {
  const { t } = useLocale();
  const canGenerate = !isBusy && fields.subject.trim().length > 0;

  return (
    <section className="flex flex-col gap-4 border-t border-line pt-6">
      <div>
        <h2 className="text-sm font-medium text-foreground">{t("prompt.title")}</h2>
        {draft.summary && <p className="mt-1 text-sm text-muted">{draft.summary}</p>}
      </div>

      {PROMPT_FIELD_KEYS.map((key) => {
        const options = draft.fields[key].options.filter((option) => option !== fields[key]);
        return (
          <div key={key} className="flex flex-col gap-2">
            <label htmlFor={`prompt-${key}`} className="text-xs text-muted">
              {t(`prompt.fields.${key}`)}
            </label>
            <textarea
              id={`prompt-${key}`}
              value={fields[key]}
              onChange={(e) => onFieldChange(key, e.target.value)}
              disabled={isBusy}
              rows={2}
              className="w-full bg-surface border border-line rounded-lg px-3.5 py-2.5 text-sm leading-relaxed text-foreground focus:border-accent focus:outline-none transition-colors resize-y disabled:opacity-50"
            />
            {options.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {options.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => onFieldChange(key, option)}
                    disabled={isBusy}
                    title={t("prompt.useOption")}
                    className="max-w-full truncate rounded-md border border-line px-2.5 py-1 text-xs text-muted hover:border-white/20 hover:text-foreground transition-colors disabled:opacity-50"
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}

      <button
        onClick={onGenerate}
        disabled={!canGenerate}
        className="w-full h-12 rounded-lg bg-accent text-white text-[15px] font-medium hover:bg-accent-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {t("prompt.generate")}
      </button>
    </section>
  );
}
