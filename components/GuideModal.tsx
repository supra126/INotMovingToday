"use client";

import React from "react";
import { useLocale } from "@/contexts/LocaleContext";

interface GuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GuideModal: React.FC<GuideModalProps> = ({ isOpen, onClose }) => {
  const { t, tRaw } = useLocale();

  if (!isOpen) return null;

  const step1Items = [
    { key: "supplement" },
    { key: "ratio" },
    { key: "resolution" },
    { key: "startFrame" },
  ];

  const step2Items = tRaw<string[]>("guide.step2.items");

  const step3Items = [
    { key: "storyboard" },
    { key: "camera" },
    { key: "duration" },
  ];

  const step4Items = [
    { key: "generate" },
    { key: "progress" },
    { key: "download" },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Content */}
      <div className="relative bg-[#1a1a1f] border border-white/10 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl shadow-purple-900/20 animate-in fade-in zoom-in duration-300">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors p-2"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        <div className="p-8">
          <h2 className="text-3xl font-bold text-white mb-8">{t("guide.title")}</h2>

          {/* API Key Notice */}
          <div className="mb-8 p-4 bg-blue-900/20 border border-blue-500/30 rounded-xl">
            <div className="flex items-start gap-3">
              <span className="text-blue-400 text-xl">🔑</span>
              <div>
                <p className="text-blue-300 font-semibold mb-1">{t("guide.apiNotice.title")}</p>
                <p className="text-gray-400 text-sm leading-relaxed">
                  {t("guide.apiNotice.description")}{" "}
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 underline"
                  >
                    {t("guide.apiNotice.linkText")}
                  </a>{" "}
                  {t("guide.apiNotice.descriptionSuffix")}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            {/* Step 1 */}
            <div className="flex gap-4">
              <div className="shrink-0 w-10 h-10 rounded-full bg-purple-600/20 text-purple-400 flex items-center justify-center font-bold text-lg border border-purple-600/30">
                1
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-2">{t("guide.step1.title")}</h3>
                <p className="text-gray-400 text-sm leading-relaxed mb-3">{t("guide.step1.description")}</p>
                <ul className="list-disc list-inside text-sm text-gray-400 space-y-1.5 ml-1">
                  {step1Items.map((item) => (
                    <li key={item.key}>
                      <strong className="text-white">{t(`guide.step1.items.${item.key}.label`)}</strong>
                      ：{t(`guide.step1.items.${item.key}.desc`)}
                    </li>
                  ))}
                </ul>
                <p className="text-gray-400 text-xs mt-3">{t("guide.step1.tip")}</p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-4">
              <div className="shrink-0 w-10 h-10 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold text-lg border border-blue-600/30">
                2
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-2">{t("guide.step2.title")}</h3>
                <p className="text-gray-400 text-sm leading-relaxed mb-2">
                  {t("guide.step2.description")}{" "}
                  <strong className="text-white">{t("guide.step2.descHighlight")}</strong>
                  {t("guide.step2.descSuffix")}
                </p>
                <ul className="list-disc list-inside text-sm text-gray-400 space-y-1 ml-1 mb-3">
                  {step2Items.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
                <p className="text-gray-400 text-sm leading-relaxed">{t("guide.step2.tip")}</p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-4">
              <div className="shrink-0 w-10 h-10 rounded-full bg-pink-600/20 text-pink-400 flex items-center justify-center font-bold text-lg border border-pink-600/30">
                3
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-2">{t("guide.step3.title")}</h3>
                <p className="text-gray-400 text-sm leading-relaxed mb-2">{t("guide.step3.description")}</p>
                <ul className="list-disc list-inside text-sm text-gray-400 space-y-1 ml-1 mb-3">
                  {step3Items.map((item) => (
                    <li key={item.key}>
                      <strong className="text-white">{t(`guide.step3.items.${item.key}.label`)}</strong>
                      ：{t(`guide.step3.items.${item.key}.desc`)}
                    </li>
                  ))}
                </ul>
                <p className="text-gray-400 text-sm leading-relaxed">
                  {t("guide.step3.tip")}
                </p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex gap-4">
              <div className="shrink-0 w-10 h-10 rounded-full bg-green-600/20 text-green-400 flex items-center justify-center font-bold text-lg border border-green-600/30">
                4
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-2">{t("guide.step4.title")}</h3>
                <p className="text-gray-400 text-sm leading-relaxed mb-3">{t("guide.step4.description")}</p>
                <ul className="list-disc list-inside text-sm text-gray-400 space-y-1.5 ml-1">
                  {step4Items.map((item) => (
                    <li key={item.key}>
                      <strong className="text-white">{t(`guide.step4.items.${item.key}.label`)}</strong>
                      ：{t(`guide.step4.items.${item.key}.desc`)}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
