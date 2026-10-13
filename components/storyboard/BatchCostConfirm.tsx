"use client";

import { Modal } from "@/components/common/Modal";
import { Button } from "@/components/ui/Button";
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
      <ul className="mb-4 flex flex-col gap-1 font-mono text-[13px] text-fg">
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
      <p className="mb-4 text-sm text-fg-muted">{t("storyboard.videos.confirmTotal", { seconds, price })}</p>
      <div className="flex justify-end gap-2">
        <Button onClick={onClose}>{t("storyboard.videos.cancel")}</Button>
        <Button variant="primary" onClick={onConfirm}>
          {t("storyboard.videos.confirm")}
        </Button>
      </div>
    </Modal>
  );
}
