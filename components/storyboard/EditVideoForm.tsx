"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { useLocale } from "@/contexts/LocaleContext";
import { BlobImage } from "./BlobImage";

const MAX_IMAGES = 3;

export interface EditImageOption {
  key: string;
  label: string;
  blob: Blob;
}

interface EditVideoFormProps {
  /** Images the user can tick: product photos, the shot's frame */
  options: EditImageOption[];
  /** Price shown on the button */
  price: string;
  disabled?: boolean;
  onSubmit: (instruction: string, images: Blob[]) => void;
  onCancel: () => void;
}

/** One instruction plus up to three reference images, e.g. "swap the pack for the product in image 1" */
export function EditVideoForm({ options, price, disabled, onSubmit, onCancel }: EditVideoFormProps) {
  const { t } = useLocale();
  const [instruction, setInstruction] = useState("");
  const [uploads, setUploads] = useState<EditImageOption[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const all = [...options, ...uploads];
  const images = picked.flatMap((key) => all.filter((o) => o.key === key).map((o) => o.blob));

  const toggle = (key: string) =>
    setPicked((p) => (p.includes(key) ? p.filter((k) => k !== key) : p.length < MAX_IMAGES ? [...p, key] : p));

  const addFiles = async (files: FileList | null) => {
    const added = await Promise.all(
      Array.from(files ?? []).map(async (file, i) => ({
        key: `upload-${Date.now()}-${i}`,
        label: file.name,
        // Our own copy: a picked File breaks if the file on disk moves
        blob: new Blob([await file.arrayBuffer()], { type: file.type }),
      }))
    );
    setUploads((u) => [...u, ...added]);
    setPicked((p) => [...p, ...added.map((a) => a.key)].slice(0, MAX_IMAGES));
  };

  return (
    <div className="flex flex-col gap-2 rounded-[var(--radius-panel)] border border-line bg-panel p-3">
      <textarea
        value={instruction}
        onChange={(e) => setInstruction(e.target.value)}
        rows={2}
        placeholder={t("storyboard.edit.placeholder")}
        className="min-w-0 rounded-[var(--radius-control)] border border-line bg-sunken px-2.5 py-1.5 text-sm text-fg placeholder:text-fg-subtle focus:border-line-strong focus:outline-none"
      />
      <p className="text-xs text-fg-muted">{t("storyboard.edit.imagesHint", { max: MAX_IMAGES })}</p>
      <div className="flex flex-wrap gap-2">
        {all.map((option) => {
          const order = picked.indexOf(option.key);
          return (
            <button
              key={option.key}
              type="button"
              onClick={() => toggle(option.key)}
              title={option.label}
              className={`relative size-14 overflow-hidden rounded border ${order >= 0 ? "border-accent ring-1 ring-accent" : "border-line opacity-70"}`}
            >
              <BlobImage blob={option.blob} alt={option.label} className="size-full object-cover" />
              {order >= 0 && (
                <span className="absolute left-0.5 top-0.5 rounded bg-canvas/80 px-1 font-mono text-[10px] text-fg">{order + 1}</span>
              )}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex size-14 items-center justify-center rounded border border-dashed border-line text-xs text-fg-muted hover:text-fg"
        >
          {t("storyboard.edit.upload")}
        </button>
        <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => void addFiles(e.target.files)} />
      </div>
      <p className="text-xs text-fg-subtle">{t("storyboard.edit.textHint")}</p>
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={onCancel}>
          {t("storyboard.videos.cancel")}
        </Button>
        <Button size="sm" variant="primary" disabled={disabled || !instruction.trim()} onClick={() => onSubmit(instruction, images)}>
          {t("storyboard.edit.submit")}
          <span className="font-mono">{price}</span>
        </Button>
      </div>
    </div>
  );
}
