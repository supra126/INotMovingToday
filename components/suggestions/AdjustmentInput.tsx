"use client";

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
  return (
    <div className="space-y-4">
      <div>
        <label
          htmlFor="adjustment"
          className="block text-sm font-medium text-gray-300 mb-2"
        >
          調整方向
        </label>
        <textarea
          id="adjustment"
          value={adjustment}
          onChange={(e) => onAdjustmentChange(e.target.value)}
          placeholder="例如：更有活力一點、聚焦產品特寫、加入幽默元素..."
          rows={3}
          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
        />
      </div>

      <div>
        <label
          htmlFor="additionalText"
          className="block text-sm font-medium text-gray-300 mb-2"
        >
          補充說明（選填）
        </label>
        <textarea
          id="additionalText"
          value={additionalText}
          onChange={(e) => onAdditionalTextChange(e.target.value)}
          placeholder="關於品牌、目標受眾或特殊需求的額外資訊..."
          rows={2}
          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
        />
      </div>
    </div>
  );
}
