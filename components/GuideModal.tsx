"use client";

import React from "react";
import { useLocale } from "@/contexts/LocaleContext";

interface GuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const STEP1_ITEMS = ["mainImage", "idea", "ratio", "advanced"];
const STEP3_ITEMS = ["script", "generate", "extend"];

export const GuideModal: React.FC<GuideModalProps> = ({ isOpen, onClose }) => {
  const { t, tRaw } = useLocale();

  if (!isOpen) return null;

  const step2Items = tRaw<string[]>("guide.step2.items");

  const steps = [
    {
      title: t("guide.step1.title"),
      lead: t("guide.step1.description"),
      items: STEP1_ITEMS.map((key) => ({
        label: t(`guide.step1.items.${key}.label`),
        desc: t(`guide.step1.items.${key}.desc`),
      })),
      tip: t("guide.step1.tip"),
    },
    {
      title: t("guide.step2.title"),
      lead: `${t("guide.step2.description")} ${t("guide.step2.descHighlight")}${t("guide.step2.descSuffix")}`,
      items: (Array.isArray(step2Items) ? step2Items : []).map((desc) => ({ label: "", desc })),
      tip: t("guide.step2.tip"),
    },
    {
      title: t("guide.step3.title"),
      lead: t("guide.step3.description"),
      items: STEP3_ITEMS.map((key) => ({
        label: t(`guide.step3.items.${key}.label`),
        desc: t(`guide.step3.items.${key}.desc`),
      })),
      tip: t("guide.step3.tip"),
    },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />

      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-line bg-surface animate-in fade-in duration-200">
        <button
          onClick={onClose}
          aria-label={t("common.close")}
          className="absolute top-3 right-3 h-9 w-9 inline-flex items-center justify-center rounded-md text-muted hover:text-foreground hover:bg-white/5 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="p-6 sm:p-8">
          <h2 className="text-xl font-semibold text-foreground">{t("guide.title")}</h2>

          <p className="mt-3 text-sm text-muted leading-relaxed">
            <span className="text-foreground">{t("guide.apiNotice.title")}</span>　{t("guide.apiNotice.description")}{" "}
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 underline underline-offset-2"
            >
              {t("guide.apiNotice.linkText")}
            </a>{" "}
            {t("guide.apiNotice.descriptionSuffix")}
          </p>

          <ol className="mt-8 flex flex-col gap-8">
            {steps.map((step, index) => (
              <li key={step.title} className="grid grid-cols-[2rem_1fr] gap-x-3">
                <span className="text-sm font-mono text-muted pt-0.5">{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <h3 className="text-base font-medium text-foreground">{step.title}</h3>
                  <p className="mt-1 text-sm text-muted">{step.lead}</p>
                  <ul className="mt-3 flex flex-col gap-1.5 text-sm text-gray-300">
                    {step.items.map((item) => (
                      <li key={item.label + item.desc}>
                        {item.label && <span className="text-foreground">{item.label}：</span>}
                        {item.desc}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 text-xs text-muted">{step.tip}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
};
