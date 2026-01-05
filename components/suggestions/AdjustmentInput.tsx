"use client";

import { useLocale } from "@/contexts/LocaleContext";

interface AdjustmentInputProps {
  adjustment: string;
  onAdjustmentChange: (value: string) => void;
  additionalText: string;
  onAdditionalTextChange: (value: string) => void;
}

export function AdjustmentInput({
  adjustment,
  onAdjustmentChange,
  additionalText,
  onAdditionalTextChange,
}: AdjustmentInputProps) {
  const { t } = useLocale();

  return (
    <div className="space-y-4">
      <div>
        <label
          htmlFor="adjustment"
          className="block text-sm font-medium text-gray-300 mb-2"
        >
          {t("suggestions.adjustmentLabel")}
        </label>
        <textarea
          id="adjustment"
          value={adjustment}
          onChange={(e) => onAdjustmentChange(e.target.value)}
          placeholder={t("suggestions.refinePlaceholder")}
          rows={3}
          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
        />
      </div>

      <div>
        <label
          htmlFor="additionalText"
          className="block text-sm font-medium text-gray-300 mb-2"
        >
          {t("suggestions.additionalNotes")}
        </label>
        <textarea
          id="additionalText"
          value={additionalText}
          onChange={(e) => onAdditionalTextChange(e.target.value)}
          placeholder={t("suggestions.additionalNotesPlaceholder")}
          rows={2}
          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
        />
      </div>
    </div>
  );
}
