"use client";

import { Modal } from "@/components/common/Modal";
import { useLocale } from "@/contexts/LocaleContext";
import { formatUsd, sumCosts, videoCost } from "@/lib/pricing";
import type { CostRow } from "@/lib/storyboard/videoJobs";

interface BatchCostConfirmProps {
  rows: CostRow[] | null;
  onConfirm: () => void;
  onClose: () => void;
}

export function BatchCostConfirm({ rows, onConfirm, onClose }: BatchCostConfirmProps) {
  const { t } = useLocale();
  if (!rows) return null;

  const total = sumCosts(rows.map((r) => videoCost(r.seconds, r.resolution)));
  const seconds = rows.reduce((sum, r) => sum + r.seconds, 0);
  const price = formatUsd(total.amount) + (total.isMinimum ? "+" : "");

  return (
    <Modal isOpen onClose={onClose} title={t("storyboard.videos.confirmTitle")}>
      <ul className="mb-4 flex flex-col gap-1 text-sm text-foreground">
        {rows.map((r) => (
          <li key={r.id}>
            {t("storyboard.videos.confirmRow", {
              id: r.id,
              seconds: r.seconds,
              resolution: r.resolution,
              end: r.hasEnd ? t("storyboard.videos.confirmEnd") : "",
            })}
          </li>
        ))}
      </ul>
      <p className="mb-4 text-sm text-muted">{t("storyboard.videos.confirmTotal", { seconds, price })}</p>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose} className="h-10 px-4 rounded-lg border border-line text-sm text-foreground">
          {t("storyboard.videos.cancel")}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="h-10 px-4 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent-hover"
        >
          {t("storyboard.videos.confirm")}
        </button>
      </div>
    </Modal>
  );
}
