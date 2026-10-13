# 工作區改版 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把單鏡模式與分鏡模式改成 Runway 式的專業工作區，視覺沿用 IGiveUpOnLife 的深色設計系統，功能不變。

**Architecture:** 先換設計 token 與字體（舊的 class 名稱以別名接到新 token，未改寫的元件自動跟上），再加共用元件（`Segmented`、`Button`、`PanelSection`），然後重做頁框：48px 頂列＋滿版工作區。分鏡模式 ②③④ 用 `StepLayout` 組成「鏡頭欄 220px｜主區｜設定面板 340px」；原本一張大卡片的 ③④ 元件拆成主區元件與設定面板元件。`lib/`、`services/`、`hooks/` 的邏輯不動。

**Tech Stack:** Next.js 16.4、React 19.3、Tailwind 4（`@theme`）、`next/font/google`（IBM Plex Sans / Mono、Noto Sans TC）、`lucide-react`（新增）、Vitest。

**Spec:** `docs/superpowers/specs/2026-10-13-workspace-redesign-design.md`

## Global Constraints

- 只改外觀與版面，不改功能；所有既有測試通過。
- 只有深色主題；數值照 IGiveUpOnLife `app/globals.css` 的 `:root[data-theme="dark"]`，直接放在 `:root`。
- 主按鈕 `bg-accent text-accent-fg`（近白底、深色字）；任何 className 不可同時有 `bg-accent` 與 `text-white`。
- 彩色只用於狀態：`danger`＝錯誤、`success`＝完成、`warning`＝過期／警告。
- 字體 IBM Plex Sans（400/500/600）＋ Noto Sans TC 備援；IBM Plex Mono 用於英文 prompt、鏡號、秒數、金額；基本字級 14px。
- 圓角：控制項 `rounded-[var(--radius-control)]`（6px）、面板 `rounded-[var(--radius-panel)]`（10px）。
- 版面寬度：頂列高 48px；單鏡左欄 360px；分鏡鏡頭欄 220px、設定面板 340px。
- 桌面（≥1024px）滿版不整頁捲動、各欄自己捲動；窄於 1024px 時各區塊上下堆疊、整頁捲動。
- 新文字一律進 `locales/zh.json` 與 `locales/en.json`。
- ESLint 新規則（effect 內 setState、render 時讀 ref）照規則訊息調整寫法，不停用規則。
- 分支只在本地，不 push。

## Review Focus

1. 寬度窄於 1024px：三欄改成上下堆疊、整頁可捲動，內容不被 `h-dvh` 裁掉（Task 11 實測）。
2. 選取的鏡頭在對話修改後被刪除或改號：選取自動回到第一鏡，不顯示空白面板（Task 5 `resolveSelectedShot` 測試）。
3. ② 還沒有任何鏡頭時：鏡頭欄顯示空狀態、設定面板不顯示，主區照常可輸入腳本（Task 7 實測）。
4. 很長的專案名稱、畫面描述：頂列與鏡頭欄截斷成一行，不撐破版面（Task 6、Task 5 實測）。
5. 近白的重點色配上殘留的 `text-white`，按鈕字看不見：以測試掃描所有元件檔，禁止 `bg-accent` 與 `text-white` 出現在同一個 className（Task 1 測試）。

---

## File Structure

| 檔案 | 責任 |
|---|---|
| `app/globals.css` | 設計 token、舊名稱別名、`section-title`／`checker` 樣式 |
| `app/layout.tsx` | 字體 |
| `lib/ui-guard.test.ts` | 掃描元件檔，禁止 `bg-accent` + `text-white` |
| `components/ui/Button.tsx`、`Segmented.tsx` | 從 IGiveUpOnLife 複製 |
| `components/ui/PanelSection.tsx` | 設定面板的區塊（可收合，用 `<details>`） |
| `components/upload/*Selector.tsx` | 改用 `Segmented` |
| `components/layout/Header.tsx` | 48px 頂列（模式切換、中間插槽、右側工具） |
| `app/page.tsx`、`components/workspace/ResultPanel.tsx` | 單鏡模式版面 |
| `lib/storyboard/shots.ts` | `shotStatus`、`resolveSelectedShot`、`railThumbnail` |
| `components/storyboard/ShotRail.tsx`、`StepLayout.tsx` | 鏡頭欄、三欄框架 |
| `components/storyboard/ProjectList.tsx`、`StepBar.tsx` | 頂列用的精簡版 |
| `app/storyboard/page.tsx`、`components/storyboard/types.ts` | 分鏡頁框、選取狀態 |
| `components/storyboard/ProjectSetupStep.tsx` | ① 置中面板 |
| `components/storyboard/ScriptStep.tsx`、`ShotTable.tsx` | ② 三欄 |
| `components/storyboard/ShotImagesStep.tsx`、`ShotCandidates.tsx`、`ShotImageControls.tsx` | ③ 三欄＋總覽（取代 `ShotImageCard.tsx`） |
| `components/storyboard/ShotVideosStep.tsx`、`ShotVideoPreview.tsx`、`ShotVideoSettings.tsx` | ④ 三欄（取代 `ShotVideoCard.tsx`） |
| `components/common/Modal.tsx`、`components/settings/ApiKeyModal.tsx` 等 | 舊顏色 class 換成 token |

---

### Task 1: 設計 token、字體與重點色防呆

**Files:**
- Modify: `app/globals.css`（整檔改寫）
- Modify: `app/layout.tsx`
- Modify: 所有含 `bg-accent` 與 `text-white` 的元件 className
- Test: `lib/ui-guard.test.ts`

**Interfaces:**
- Produces: Tailwind 色名 `canvas / panel / raised / sunken / line / line-strong / fg / fg-muted / fg-subtle / accent / accent-fg / accent-soft / danger / danger-soft / success / warning`；舊名別名 `background / foreground / surface / surface-raised / muted / accent-hover`；CSS class `section-title`、`checker`；CSS 變數 `--radius-control`、`--radius-panel`。

- [ ] **Step 1: 寫失敗的防呆測試**

`lib/ui-guard.test.ts`：

```ts
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOTS = ["app", "components"];

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? files(full) : /\.tsx?$/.test(name) ? [full] : [];
  });
}

describe("accent colour", () => {
  it("never pairs the near-white accent background with white text", () => {
    const offenders = ROOTS.flatMap(files).flatMap((file) =>
      (readFileSync(file, "utf8").match(/["'`][^"'`]*bg-accent(?![-\w])[^"'`]*["'`]/g) ?? [])
        .filter((cls) => /\btext-white\b/.test(cls))
        .map((cls) => `${file}: ${cls}`)
    );
    expect(offenders).toEqual([]);
  });
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `pnpm test lib/ui-guard.test.ts`
Expected: FAIL，列出約 11 個檔案（`ProjectList.tsx`、`ScriptStep.tsx`、`PromptEditor.tsx`、`common/Button.tsx` …）。

- [ ] **Step 3: 改寫 `app/globals.css`**

```css
@import "tailwindcss";

/*
 * Jola Omni design tokens, shared with IGiveUpOnLife (dark theme only):
 * graphite neutrals and a near-white accent; colour is reserved for status
 * (danger = error, success = done, warning = stale).
 */
@theme {
  --font-sans: var(--font-plex-sans), var(--font-noto-sans-tc), "PingFang TC", "Microsoft JhengHei", sans-serif;
  --font-mono: var(--font-plex-mono), ui-monospace, "SFMono-Regular", monospace;

  --color-canvas: var(--canvas);
  --color-panel: var(--panel);
  --color-raised: var(--raised);
  --color-sunken: var(--sunken);
  --color-line: var(--line);
  --color-line-strong: var(--line-strong);
  --color-fg: var(--fg);
  --color-fg-muted: var(--fg-muted);
  --color-fg-subtle: var(--fg-subtle);
  --color-accent: var(--accent);
  --color-accent-fg: var(--accent-fg);
  --color-accent-soft: var(--accent-soft);
  --color-danger: var(--danger);
  --color-danger-soft: var(--danger-soft);
  --color-success: var(--success);
  --color-warning: var(--warning);

  /* Earlier names still used by some components, mapped onto the tokens above */
  --color-background: var(--canvas);
  --color-foreground: var(--fg);
  --color-surface: var(--sunken);
  --color-surface-raised: var(--raised);
  --color-muted: var(--fg-muted);
  --color-accent-hover: var(--accent-hover);

  /* Tailwind greys and blues follow the graphite scale, so stray utilities stay neutral */
  --color-gray-50: oklch(0.97 0.002 260);
  --color-gray-100: oklch(0.94 0.004 260);
  --color-gray-200: oklch(0.88 0.005 260);
  --color-gray-300: oklch(0.8 0.006 260);
  --color-gray-400: oklch(0.72 0.008 260);
  --color-gray-500: oklch(0.6 0.008 260);
  --color-gray-600: oklch(0.45 0.008 260);
  --color-gray-700: oklch(0.37 0.008 260);
  --color-gray-800: oklch(0.29 0.006 260);
  --color-gray-900: oklch(0.205 0.005 260);
  --color-gray-950: oklch(0.17 0.004 260);
  --color-blue-300: oklch(0.88 0.005 260);
  --color-blue-400: oklch(0.8 0.006 260);
  --color-blue-500: oklch(0.72 0.008 260);
  --color-blue-600: oklch(0.45 0.008 260);
  --color-blue-700: oklch(0.37 0.008 260);
}

@layer base {
  :root {
    color-scheme: dark;
    --canvas: oklch(0.17 0.004 260);
    --panel: oklch(0.205 0.005 260);
    --raised: oklch(0.24 0.006 260);
    --sunken: oklch(0.15 0.004 260);
    --line: oklch(0.29 0.006 260);
    --line-strong: oklch(0.37 0.008 260);
    --fg: oklch(0.94 0.004 260);
    --fg-muted: oklch(0.72 0.008 260);
    --fg-subtle: oklch(0.66 0.008 260);
    --accent: oklch(0.95 0.003 260);
    --accent-hover: oklch(0.86 0.003 260);
    --accent-fg: oklch(0.17 0.005 260);
    --accent-soft: oklch(0.95 0.003 260 / 0.1);
    --danger: oklch(0.68 0.16 25);
    --danger-soft: oklch(0.68 0.16 25 / 0.14);
    --success: oklch(0.72 0.13 155);
    --warning: oklch(0.8 0.13 80);
    --checker: oklch(0.19 0.005 260);
    --radius-control: 6px;
    --radius-panel: 10px;
  }

  html,
  body {
    background: var(--canvas);
  }

  body {
    color: var(--fg);
    font-family: var(--font-sans);
    font-size: 14px;
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  ::selection {
    background: var(--accent-soft);
  }

  :focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }

  * {
    scrollbar-width: thin;
    scrollbar-color: var(--line-strong) transparent;
  }

  h1,
  h2,
  h3 {
    text-wrap: balance;
  }

  p {
    text-wrap: pretty;
  }
}

@layer components {
  /* Small uppercase label for panel sections */
  .section-title {
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--fg-muted);
  }

  /* Checkerboard behind images and empty previews */
  .checker {
    background-color: var(--sunken);
    background-image:
      linear-gradient(45deg, var(--checker) 25%, transparent 25%),
      linear-gradient(-45deg, var(--checker) 25%, transparent 25%),
      linear-gradient(45deg, transparent 75%, var(--checker) 75%),
      linear-gradient(-45deg, transparent 75%, var(--checker) 75%);
    background-size: 16px 16px;
    background-position: 0 0, 0 8px, 8px -8px, -8px 0;
  }
}
```

- [ ] **Step 4: 字體**

`app/layout.tsx`：import 改為 `import { IBM_Plex_Mono, IBM_Plex_Sans, Noto_Sans_TC } from "next/font/google";`，把 `geist`、`geistMono` 兩段換成：

```ts
const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-plex-sans",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
  variable: "--font-plex-mono",
});
```

`<html className>` 改為 `` `${plexSans.variable} ${plexMono.variable} ${notoSansTC.variable}` ``；`criticalCSS` 改為 `html,body{margin:0;background-color:oklch(0.17 0.004 260);color:oklch(0.94 0.004 260)}`。

- [ ] **Step 5: 修正重點色上的白字**

```bash
python3 - <<'EOF'
import pathlib, re
for path in [*pathlib.Path("app").rglob("*.tsx"), *pathlib.Path("components").rglob("*.tsx")]:
    text = path.read_text()
    fixed = re.sub(
        r'(["\'`])([^"\'`]*\bbg-accent(?![-\w])[^"\'`]*)\1',
        lambda m: m.group(1) + re.sub(r"\btext-white\b", "text-accent-fg", m.group(2)) + m.group(1),
        text,
    )
    if fixed != text:
        path.write_text(fixed)
        print("fixed", path)
EOF
```

- [ ] **Step 6: 跑測試、型別、lint**

Run: `pnpm test && npx tsc --noEmit -p . && npx eslint app components`
Expected: 全部通過（含 `ui-guard`）。

- [ ] **Step 7: 目視確認**

dev server 已在 8000 跑。瀏覽器開 `/` 與 `/storyboard`：底色變成石墨灰、字體為 IBM Plex、主按鈕為近白底深色字且看得到字。

- [ ] **Step 8: Commit**

```bash
git add app/globals.css app/layout.tsx lib/ui-guard.test.ts app components
git commit -m "style: Adopt the IGiveUpOnLife dark tokens and IBM Plex"
```

---

### Task 2: 共用元件與選擇器

**Files:**
- Create: `components/ui/Button.tsx`、`components/ui/Segmented.tsx`（從 IGiveUpOnLife 複製）
- Create: `components/ui/PanelSection.tsx`
- Modify: `components/upload/RatioSelector.tsx`、`ResolutionSelector.tsx`、`DurationSelector.tsx`、`AudioModeSelector.tsx`（整檔改寫）
- Modify: `package.json`（`lucide-react`）

**Interfaces:**
- Produces:
  - `Button`（`variant: "primary" | "secondary" | "ghost" | "danger"`、`size: "sm" | "md" | "lg"`、`iconOnly?`，其餘為 button 屬性）
  - `Segmented<T extends string>({ value, options: { value: T; label: ReactNode; disabled?; title? }[], onChange, label, size? })`
  - `PanelSection({ title, action?, children, collapsible?, defaultOpen?, summary? })`
  - `Field({ label, children, hint? })`（在 `PanelSection.tsx` 一起 export）：小標＋內容＋說明
  - 四個選擇器的 props 不變

- [ ] **Step 1: 安裝與複製**

```bash
pnpm add lucide-react@^1.54.0
cp ../IGiveUpOnLife/components/ui/Button.tsx components/ui/Button.tsx
cp ../IGiveUpOnLife/components/ui/Segmented.tsx components/ui/Segmented.tsx
```

兩個檔案的註解是中文，維持原樣即可。

- [ ] **Step 2: `components/ui/PanelSection.tsx`**

```tsx
"use client";

import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";

/** A section of a settings panel; collapsible sections show a summary while closed */
export function PanelSection({
  title,
  action,
  children,
  collapsible = false,
  defaultOpen = true,
  summary,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
  summary?: ReactNode;
}) {
  if (!collapsible) {
    return (
      <section className="border-b border-line px-4 py-4 last:border-b-0">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="section-title">{title}</h3>
          {action}
        </div>
        {children}
      </section>
    );
  }
  return (
    <details open={defaultOpen} className="group border-b border-line last:border-b-0">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3.5 hover:bg-raised">
        <ChevronRight size={14} aria-hidden="true" className="shrink-0 text-fg-subtle transition-transform group-open:rotate-90" />
        <span className="section-title">{title}</span>
        {summary && (
          <span className="ml-auto min-w-0 truncate font-mono text-[11px] text-fg-muted group-open:hidden">{summary}</span>
        )}
      </summary>
      <div className="px-4 pb-4">{children}</div>
    </details>
  );
}

/** Label + control + optional hint, the building block inside sections */
export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs text-fg-muted">{label}</span>
      {children}
      {hint && <p className="text-xs text-fg-subtle">{hint}</p>}
    </div>
  );
}
```

- [ ] **Step 3: 四個選擇器改用 `Segmented`**

`components/upload/RatioSelector.tsx`：

```tsx
"use client";

import { Field } from "@/components/ui/PanelSection";
import { Segmented } from "@/components/ui/Segmented";
import { useLocale } from "@/contexts/LocaleContext";
import type { VideoGenerationMode, VideoRatio } from "@/types";

interface RatioSelectorProps {
  value: VideoRatio;
  onChange: (ratio: VideoRatio) => void;
  disabled?: boolean;
  /** Kept for callers; every mode supports both ratios */
  videoMode?: VideoGenerationMode;
}

export function RatioSelector({ value, onChange, disabled = false }: RatioSelectorProps) {
  const { t } = useLocale();
  const label = t("upload.settings.ratio");
  return (
    <Field label={label}>
      <Segmented
        label={label}
        value={value}
        onChange={onChange}
        options={(["9:16", "16:9"] as const).map((ratio) => ({
          value: ratio,
          label: t(`upload.ratio.${ratio}.name`),
          disabled,
        }))}
      />
    </Field>
  );
}
```

`components/upload/ResolutionSelector.tsx`：

```tsx
"use client";

import { Field } from "@/components/ui/PanelSection";
import { Segmented } from "@/components/ui/Segmented";
import { useLocale } from "@/contexts/LocaleContext";
import type { VideoResolution } from "@/types";

interface ResolutionSelectorProps {
  value: VideoResolution;
  onChange: (resolution: VideoResolution) => void;
  disabled?: boolean;
}

const resolutions: VideoResolution[] = ["720p", "1080p", "4k"];

export function ResolutionSelector({ value, onChange, disabled = false }: ResolutionSelectorProps) {
  const { t } = useLocale();
  const label = t("upload.settings.resolution");
  return (
    <Field label={label}>
      <Segmented
        label={label}
        value={value}
        onChange={onChange}
        options={resolutions.map((resolution) => ({
          value: resolution,
          label: t(`upload.resolution.${resolution}`),
          disabled,
        }))}
      />
    </Field>
  );
}
```

`components/upload/DurationSelector.tsx`：

```tsx
"use client";

import { Field } from "@/components/ui/PanelSection";
import { Segmented } from "@/components/ui/Segmented";
import { useLocale } from "@/contexts/LocaleContext";
import type { VideoDuration } from "@/types";

interface DurationSelectorProps {
  value: VideoDuration;
  onChange: (duration: VideoDuration) => void;
  disabled?: boolean;
  hint?: string;
}

const durations: VideoDuration[] = [4, 6, 8, 10];

export function DurationSelector({ value, onChange, disabled = false, hint }: DurationSelectorProps) {
  const { t } = useLocale();
  const label = t("upload.duration.label");
  return (
    <Field label={label} hint={hint}>
      <Segmented
        label={label}
        value={String(value)}
        onChange={(next) => onChange(Number(next) as VideoDuration)}
        options={durations.map((duration) => ({
          value: String(duration),
          label: `${duration}${t("upload.duration.unit")}`,
          disabled,
        }))}
      />
    </Field>
  );
}
```

`components/upload/AudioModeSelector.tsx`：

```tsx
"use client";

import { Field } from "@/components/ui/PanelSection";
import { Segmented } from "@/components/ui/Segmented";
import { useLocale } from "@/contexts/LocaleContext";
import type { AudioMode } from "@/types";

interface AudioModeSelectorProps {
  value: AudioMode;
  onChange: (mode: AudioMode) => void;
  disabled?: boolean;
}

const modes: AudioMode[] = ["sfx_music", "sfx"];

export function AudioModeSelector({ value, onChange, disabled = false }: AudioModeSelectorProps) {
  const { t } = useLocale();
  const label = t("upload.audio.label");
  return (
    <Field label={label} hint={value === "sfx" ? t("upload.audio.sfxHint") : undefined}>
      <Segmented
        label={label}
        value={value}
        onChange={onChange}
        options={modes.map((mode) => ({ value: mode, label: t(`upload.audio.${mode}`), disabled }))}
      />
    </Field>
  );
}
```

- [ ] **Step 4: 檢查**

Run: `pnpm test && npx tsc --noEmit -p . && npx eslint components`
Expected: 通過。瀏覽器 `/`：比例、音訊、進階設定裡的解析度與秒數都變成分段切換，點選有效。

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml components/ui components/upload
git commit -m "style: Add shared Button, Segmented and PanelSection; selectors use Segmented"
```

---

### Task 3: 頂列

**Files:**
- Modify: `components/layout/Header.tsx`（整檔改寫）
- Modify: `components/LanguageToggle.tsx`（整檔改寫）

**Interfaces:**
- Consumes: `Button`（Task 2）
- Produces: `Header({ hasApiKey, serverHasKey, onApiSettingsClick, onGuideClick?, active?: "single" | "storyboard", children? })`；`children` 放在中間（專案、步驟）。

- [ ] **Step 1: `components/layout/Header.tsx`**

```tsx
"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Button } from "@/components/ui/Button";
import { useLocale } from "@/contexts/LocaleContext";

interface HeaderProps {
  hasApiKey: boolean;
  serverHasKey: boolean;
  onApiSettingsClick: () => void;
  onGuideClick?: () => void;
  active?: "single" | "storyboard";
  /** Mode-specific controls in the middle (project picker, steps) */
  children?: ReactNode;
}

const MODES = [
  { mode: "single", href: "/", label: "header.modeSingle" },
  { mode: "storyboard", href: "/storyboard", label: "header.modeStoryboard" },
] as const;

export function Header({ hasApiKey, serverHasKey, onApiSettingsClick, onGuideClick, active = "single", children }: HeaderProps) {
  const { t } = useLocale();

  const apiLabel = serverHasKey
    ? t(hasApiKey ? "header.apiSettingsCustom" : "header.apiSettingsFree")
    : t(hasApiKey ? "header.apiSettingsConnected" : "header.apiSettings");

  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b border-line bg-panel px-3">
      <span className="shrink-0 text-[13px] font-semibold tracking-tight">{t("common.appName")}</span>

      <nav aria-label={t("header.modeSingle")} className="flex shrink-0 rounded-[var(--radius-control)] border border-line bg-sunken p-0.5">
        {MODES.map(({ mode, href, label }) => (
          <Link
            key={mode}
            href={href}
            aria-current={active === mode ? "page" : undefined}
            className={`inline-flex h-7 items-center rounded-[5px] px-2.5 text-xs font-medium transition-colors ${
              active === mode ? "bg-panel text-fg shadow-sm" : "text-fg-muted hover:text-fg"
            }`}
          >
            {t(label)}
          </Link>
        ))}
      </nav>

      <div className="flex min-w-0 flex-1 items-center gap-3">{children}</div>

      <div className="flex shrink-0 items-center gap-1">
        <LanguageToggle />
        {onGuideClick && (
          <Button variant="ghost" size="sm" onClick={onGuideClick}>
            {t("header.guide")}
          </Button>
        )}
        <Button variant="secondary" size="sm" onClick={onApiSettingsClick}>
          {apiLabel}
        </Button>
      </div>
    </header>
  );
}
```

（GitHub 連結拿掉：工具型介面頂列只放操作；`header.github` 文字保留不刪。）

- [ ] **Step 2: `components/LanguageToggle.tsx`**

```tsx
"use client";

import { Languages } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useLocale } from "@/contexts/LocaleContext";

export function LanguageToggle() {
  const { locale, toggleLocale, t } = useLocale();

  return (
    <Button variant="ghost" size="sm" onClick={toggleLocale} title={t("language.switchTo")}>
      <Languages size={14} aria-hidden="true" />
      {t(`language.${locale}`)}
    </Button>
  );
}
```

- [ ] **Step 3: 檢查**

Run: `npx tsc --noEmit -p . && npx eslint components`
Expected: 通過。兩個頁面頂列高 48px，模式切換為分段樣式，語言、說明（單鏡）、API 設定在右側。

- [ ] **Step 4: Commit**

```bash
git add components/layout/Header.tsx components/LanguageToggle.tsx
git commit -m "style: Rebuild the top bar as a 48px tool header"
```

---

### Task 4: 單鏡模式版面

**Files:**
- Modify: `app/page.tsx`（return 區塊）
- Modify: `components/workspace/ResultPanel.tsx`（外框與影片尺寸）

**Interfaces:**
- Consumes: `Header`（Task 3）

- [ ] **Step 1: `app/page.tsx` 的 return**

把 `return (` 到檔尾 `);` 的 JSX 換成：

```tsx
  return (
    <div className="flex min-h-dvh flex-col lg:h-dvh">
      <Header
        active="single"
        hasApiKey={apiKeyStatus.hasApiKey}
        serverHasKey={apiKeyStatus.serverHasKey}
        onGuideClick={() => setShowGuideModal(true)}
        onApiSettingsClick={apiKeyStatus.openApiKeyModal}
      />

      <div className="flex flex-1 flex-col lg:min-h-0 lg:flex-row">
        <aside className="w-full shrink-0 border-line bg-panel lg:w-[360px] lg:overflow-y-auto lg:border-r">
          <div className="flex flex-col gap-5 p-4">
            <InputPanel
              startFrame={videoSettings.startFrame}
              endFrame={videoSettings.endFrame}
              references={videoSettings.references}
              description={description}
              negativePrompt={videoSettings.negativePrompt}
              videoRatio={videoSettings.videoRatio}
              videoResolution={videoSettings.videoResolution}
              videoDuration={videoSettings.videoDuration}
              audioMode={videoSettings.audioMode}
              isBusy={isBusy}
              isDrafting={promptDraft.isDrafting}
              hasDraft={!!promptDraft.draft}
              onStartFrameChange={handleStartFrameChange}
              onEndFrameChange={videoSettings.setEndFrame}
              onReferencesChange={videoSettings.setReferences}
              onDescriptionChange={setDescription}
              onNegativePromptChange={videoSettings.setNegativePrompt}
              onVideoRatioChange={videoSettings.setVideoRatio}
              onVideoResolutionChange={videoSettings.setVideoResolution}
              onVideoDurationChange={videoSettings.setVideoDuration}
              onAudioModeChange={videoSettings.setAudioMode}
              onRequestDraft={handleRequestDraft}
              onGenerateDirect={handleGenerateDirect}
            />

            {draftError && (
              <p role="alert" className="rounded-[var(--radius-control)] border border-danger/40 bg-danger-soft px-3 py-2 text-sm text-danger">
                {draftError.startsWith("errors.") ? t(draftError) : draftError}
              </p>
            )}

            {promptDraft.draft && promptDraft.fields && (
              <PromptEditor
                draft={promptDraft.draft}
                fields={promptDraft.fields}
                isBusy={isBusy}
                onFieldChange={promptDraft.setField}
                onGenerate={handleGenerate}
              />
            )}
          </div>
        </aside>

        <main className="min-w-0 flex-1 bg-canvas lg:overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-6">
            <ResultPanel
              ratio={videoSettings.videoRatio}
              previewImage={videoSettings.startFrame}
              status={video.status}
              progress={video.progress}
              videoUrl={video.videoUrl}
              finalPrompt={video.finalPrompt}
              totalDuration={video.totalDuration}
              isExtending={video.isExtending}
              error={video.error}
              onCancel={video.cancel}
              onRegenerate={lastSource === "direct" ? handleGenerateDirect : handleGenerate}
              onExtend={handleExtend}
            />
          </div>
        </main>
      </div>

      <GuideModal isOpen={showGuideModal} onClose={() => setShowGuideModal(false)} />

      <ApiKeyModal
        isOpen={apiKeyStatus.showApiKeyModal}
        onClose={apiKeyStatus.closeApiKeyModal}
        serverHasKey={apiKeyStatus.serverHasKey}
      />
    </div>
  );
```

- [ ] **Step 2: `ResultPanel` 的外框與影片尺寸**

1. 根元素 `<div className="lg:sticky lg:top-20 flex flex-col gap-4">` 改為 `<div className="flex w-full flex-col items-center gap-4">`。
2. 影片框的 className 改為（保留 `relative overflow-hidden`，比例由高度決定，桌面上盡量放大）：

```tsx
        className={`relative overflow-hidden rounded-[var(--radius-panel)] border border-line checker ${
          ratio === "9:16"
            ? "aspect-[9/16] w-full max-w-sm lg:h-[calc(100dvh-14rem)] lg:w-auto lg:max-w-full"
            : "aspect-video w-full max-w-5xl"
        }`}
```

3. 影片框之後的所有區塊（錯誤、按鈕列、延伸、送出的提示詞）各自加上 `w-full max-w-md`：錯誤 `<p>`、按鈕列 `<div className="flex gap-2">` → `<div className="flex w-full max-w-md gap-2">`、延伸 `<div className="flex flex-col gap-2 rounded-lg border border-line p-3.5">` → `<div className="flex w-full max-w-md flex-col gap-2 rounded-[var(--radius-panel)] border border-line bg-panel p-3.5">`、`<details className="rounded-lg border border-line">` → `<details className="w-full max-w-md rounded-[var(--radius-panel)] border border-line bg-panel">`。
4. 錯誤 `<p>` 的 class 換成 `w-full max-w-md rounded-[var(--radius-control)] border border-danger/40 bg-danger-soft px-3 py-2 text-sm text-danger`。

- [ ] **Step 3: 檢查**

Run: `pnpm test && npx tsc --noEmit -p . && npx eslint app components`

瀏覽器 `/`（1440 寬）：左欄 360px 可捲動、右側影片框置中且高度接近視窗；縮到 900 寬：左欄在上、結果在下，整頁可捲動。用 mock 直接生成一次（需要時 `VIDEO_PROVIDER=mock` 重開 dev server），影片、下載、延伸都在。

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx components/workspace/ResultPanel.tsx
git commit -m "style: Lay out single-shot mode as a side panel and canvas"
```

---

### Task 5: 鏡頭狀態與鏡頭欄

**Files:**
- Modify: `lib/storyboard/shots.ts`
- Test: `lib/storyboard/shots.test.ts`
- Create: `components/storyboard/ShotRail.tsx`
- Modify: `locales/zh.json`、`locales/en.json`

**Interfaces:**
- Produces:
  - `type ShotStatus = "empty" | "unpicked" | "done" | "stale" | "failed" | "busy"`
  - `shotStatus(shot: Shot, step: Step): ShotStatus`
  - `resolveSelectedShot(shots: Shot[], id: string | null): Shot | undefined`
  - `railThumbnail(shot: Shot): StoredImage | undefined`
  - `<ShotRail shots step ratio selectedId onSelect header? />`

- [ ] **Step 1: 寫失敗的測試**（加在 `shots.test.ts` 末尾，並在 import 加上三個函式名稱）

```ts
describe("workspace helpers", () => {
  it("summarises a shot for the rail before videos", () => {
    const shot = toShot(row(), true);
    expect(shotStatus(shot, 2)).toBe("empty");
    expect(shotStatus({ ...shot, imageStatus: "generating" }, 3)).toBe("busy");
    expect(shotStatus({ ...shot, candidates: [img("a")] }, 3)).toBe("unpicked");
    expect(shotStatus({ ...shot, candidates: [img("a")], selected: 0, finalImage: img("a") }, 3)).toBe("done");
    expect(shotStatus({ ...shot, candidates: [img("a")], stale: true }, 3)).toBe("stale");
    expect(shotStatus({ ...shot, imageStatus: "failed" }, 3)).toBe("failed");
  });

  it("summarises a shot's video in step 4", () => {
    const shot = toShot(row(), true);
    const video = { progress: 0, prompt: "", duration: 4 };
    expect(shotStatus(shot, 4)).toBe("empty");
    expect(shotStatus({ ...shot, draftStatus: "drafting" }, 4)).toBe("busy");
    expect(shotStatus({ ...shot, video: { ...video, status: "generating" } }, 4)).toBe("busy");
    expect(shotStatus({ ...shot, video: { ...video, status: "failed" } }, 4)).toBe("failed");
    expect(shotStatus({ ...shot, video: { ...video, status: "completed" } }, 4)).toBe("done");
    expect(shotStatus({ ...shot, video: { ...video, status: "completed", outdated: true } }, 4)).toBe("stale");
  });

  it("falls back to the first shot when the selection is gone", () => {
    const shots = [toShot(row(), false), toShot(row({ id: "s02" }), true)];
    expect(resolveSelectedShot(shots, "s02")?.id).toBe("s02");
    expect(resolveSelectedShot(shots, "s09")?.id).toBe("s01");
    expect(resolveSelectedShot(shots, null)?.id).toBe("s01");
    expect(resolveSelectedShot([], "s01")).toBeUndefined();
  });

  it("picks the final, then the selected, then the first candidate as thumbnail", () => {
    const a = img("a");
    const b = img("b");
    const shot = { ...toShot(row(), true), candidates: [a, b] };
    expect(railThumbnail(shot)).toBe(a);
    expect(railThumbnail({ ...shot, selected: 1 })).toBe(b);
    const final = img("final");
    expect(railThumbnail({ ...shot, selected: 1, finalImage: final })).toBe(final);
    expect(railThumbnail(toShot(row(), true))).toBeUndefined();
  });
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `pnpm test lib/storyboard/shots.test.ts`
Expected: FAIL，`shotStatus is not a function`。

- [ ] **Step 3: 實作**（加在 `shots.ts` 末尾）

```ts
export type ShotStatus = "empty" | "unpicked" | "done" | "stale" | "failed" | "busy";

/** One status per shot for the rail: images up to step 3, the video in step 4 */
export function shotStatus(shot: Shot, step: Step): ShotStatus {
  if (step >= 4) {
    if (shot.video?.status === "generating" || shot.draftStatus === "drafting") return "busy";
    if (shot.video?.status === "failed" || shot.draftStatus === "failed") return "failed";
    if (shot.video?.status === "completed") return shot.video.outdated ? "stale" : "done";
    return "empty";
  }
  if (shot.imageStatus === "generating") return "busy";
  if (shot.stale) return "stale";
  if (shot.imageStatus === "failed" && shot.candidates.length === 0) return "failed";
  if (shot.finalImage) return "done";
  if (shot.candidates.length > 0) return "unpicked";
  return "empty";
}

/** The selected shot, or the first one if the selection was removed or renumbered */
export function resolveSelectedShot(shots: Shot[], id: string | null): Shot | undefined {
  return shots.find((shot) => shot.id === id) ?? shots[0];
}

export function railThumbnail(shot: Shot): StoredImage | undefined {
  return shot.finalImage ?? (shot.selected !== undefined ? shot.candidates[shot.selected] : shot.candidates[0]);
}
```

- [ ] **Step 4: 跑測試確認通過**

Run: `pnpm test lib/storyboard/shots.test.ts`
Expected: PASS。

- [ ] **Step 5: 語系**

`zh.json` 的 `storyboard` 加：

```json
"rail": { "title": "鏡頭", "total": "共 {{seconds}} 秒", "empty": "整理出分鏡表後，鏡頭會列在這裡" },
"status": { "empty": "未處理", "unpicked": "有圖未選", "done": "完成", "stale": "過期", "failed": "失敗", "busy": "處理中" }
```

`en.json`：

```json
"rail": { "title": "Shots", "total": "{{seconds}}s total", "empty": "Shots appear here once the storyboard is built" },
"status": { "empty": "Not started", "unpicked": "Not picked", "done": "Done", "stale": "Outdated", "failed": "Failed", "busy": "Working" }
```

- [ ] **Step 6: `components/storyboard/ShotRail.tsx`**

```tsx
"use client";

import type { ReactNode } from "react";
import { useLocale } from "@/contexts/LocaleContext";
import { railThumbnail, shotStatus, type ShotStatus } from "@/lib/storyboard/shots";
import type { Shot, Step } from "@/lib/storyboard/types";
import type { VideoRatio } from "@/types";
import { BlobImage } from "./BlobImage";

const DOT: Record<ShotStatus, string> = {
  empty: "size-2 rounded-full bg-fg-subtle/40",
  unpicked: "size-2 rounded-full bg-fg",
  done: "size-2 rounded-full bg-success",
  stale: "size-2 rounded-full bg-warning",
  failed: "size-2 rounded-full bg-danger",
  busy: "size-2.5 rounded-full border-2 border-fg-muted border-t-transparent animate-spin",
};

interface ShotRailProps {
  shots: Shot[];
  step: Step;
  ratio: VideoRatio;
  selectedId?: string;
  onSelect: (id: string) => void;
  /** Rail-wide action, e.g. "Generate all" in step 4 */
  header?: ReactNode;
}

export function ShotRail({ shots, step, ratio, selectedId, onSelect, header }: ShotRailProps) {
  const { t } = useLocale();
  const thumbClass = ratio === "9:16" ? "h-12 w-[27px]" : "h-[27px] w-12";
  const total = shots.reduce((sum, shot) => sum + (step >= 4 ? shot.duration : shot.seconds), 0);

  return (
    <nav aria-label={t("storyboard.rail.title")} className="flex w-full shrink-0 flex-col border-line bg-panel lg:w-[220px] lg:border-r">
      <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2.5">
        <span className="section-title">{t("storyboard.rail.title")}</span>
        <span className="font-mono text-[11px] text-fg-muted">{t("storyboard.rail.total", { seconds: total })}</span>
      </div>
      {header && <div className="border-b border-line p-2">{header}</div>}
      {shots.length === 0 ? (
        <p className="p-3 text-xs text-fg-subtle">{t("storyboard.rail.empty")}</p>
      ) : (
        <ol className="flex gap-1 overflow-x-auto p-2 lg:min-h-0 lg:flex-1 lg:flex-col lg:overflow-y-auto">
          {shots.map((shot) => {
            const status = shotStatus(shot, step);
            const thumb = railThumbnail(shot);
            const active = shot.id === selectedId;
            return (
              <li key={shot.id} className="shrink-0 lg:shrink">
                <button
                  type="button"
                  onClick={() => onSelect(shot.id)}
                  aria-current={active ? "true" : undefined}
                  className={`flex w-44 items-center gap-2.5 rounded-[var(--radius-control)] p-1.5 text-left transition-colors lg:w-full ${
                    active ? "bg-raised" : "hover:bg-raised/60"
                  }`}
                >
                  <span className={`checker shrink-0 overflow-hidden rounded border border-line ${thumbClass}`}>
                    {thumb && <BlobImage blob={thumb.blob} alt="" className="size-full object-cover" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="font-mono text-xs text-fg">{shot.id}</span>
                      <span className={DOT[status]} title={t(`storyboard.status.${status}`)} />
                    </span>
                    <span className="block truncate text-xs text-fg-muted">{shot.visual}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </nav>
  );
}
```

- [ ] **Step 7: 檢查並 Commit**

Run: `pnpm test && npx tsc --noEmit -p . && npx eslint components lib`

```bash
git add lib/storyboard/shots.ts lib/storyboard/shots.test.ts components/storyboard/ShotRail.tsx locales
git commit -m "feat(storyboard): Add shot status and the shot rail"
```

---

### Task 6: 分鏡頁框、選取狀態與 ① 專案設定

**Files:**
- Create: `components/storyboard/StepLayout.tsx`
- Modify: `components/storyboard/types.ts`
- Modify: `components/storyboard/ProjectList.tsx`、`StepBar.tsx`（整檔改寫）
- Modify: `app/storyboard/page.tsx`（整檔改寫）
- Modify: `components/storyboard/ProjectSetupStep.tsx`（外框與按鈕）

**Interfaces:**
- Consumes: `Header` children（Task 3）、`resolveSelectedShot`（Task 5）、`Button`
- Produces:
  - `StepProps` 新增 `selectedShotId: string | null` 與 `selectShot: (id: string) => void`
  - `<StepLayout rail main inspector />`、`<Inspector footer?>{children}</Inspector>`

- [ ] **Step 1: `components/storyboard/types.ts`**

```ts
import type { ProjectUpdater } from "@/hooks/useStoryboardProject";
import type { Step, StoryboardProject } from "@/lib/storyboard/types";

export interface StepProps {
  project: StoryboardProject;
  /** Bound to this project's id, so late async results land in the right project */
  update: ProjectUpdater;
  /** Returns the user's key, or opens the key dialog and returns null */
  requireApiKey: () => string | null;
  goTo: (step: Step) => void;
  /** Shot shown in the canvas and inspector; resolve with resolveSelectedShot */
  selectedShotId: string | null;
  selectShot: (id: string) => void;
}
```

- [ ] **Step 2: `components/storyboard/StepLayout.tsx`**

```tsx
import type { ReactNode } from "react";

/** Shot rail | canvas | inspector; stacks below 1024px */
export function StepLayout({ rail, main, inspector }: { rail: ReactNode; main: ReactNode; inspector?: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col lg:min-h-0 lg:flex-row">
      {rail}
      <main className="min-w-0 flex-1 bg-canvas lg:overflow-y-auto">{main}</main>
      {inspector && (
        <aside className="flex w-full shrink-0 flex-col border-line bg-panel lg:w-[340px] lg:border-l">{inspector}</aside>
      )}
    </div>
  );
}

/** Scrolling settings with an optional pinned action at the bottom */
export function Inspector({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  return (
    <>
      <div className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto">{children}</div>
      {footer && <div className="flex flex-col gap-2 border-t border-line p-3">{footer}</div>}
    </>
  );
}
```

- [ ] **Step 3: `ProjectList.tsx`（頂列精簡版）**

```tsx
"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useLocale } from "@/contexts/LocaleContext";
import type { ProjectSummary } from "@/lib/storyboard/types";

interface ProjectListProps {
  projects: ProjectSummary[];
  activeId?: string;
  onOpen: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
}

/** Project picker for the top bar */
export function ProjectList({ projects, activeId, onOpen, onCreate, onDelete }: ProjectListProps) {
  const { t } = useLocale();
  const active = projects.find((p) => p.id === activeId);

  return (
    <div className="flex min-w-0 items-center gap-1">
      <select
        aria-label={t("storyboard.projects")}
        value={activeId ?? ""}
        onChange={(e) => e.target.value && onOpen(e.target.value)}
        className="h-8 w-56 min-w-0 truncate rounded-[var(--radius-control)] border border-line bg-sunken px-2 text-[13px] text-fg focus:border-line-strong focus:outline-none"
      >
        {!activeId && <option value="">{t("storyboard.empty")}</option>}
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <Button variant="ghost" size="sm" iconOnly aria-label={t("storyboard.newProject")} title={t("storyboard.newProject")} onClick={onCreate}>
        <Plus size={15} />
      </Button>
      {active && (
        <Button
          variant="ghost"
          size="sm"
          iconOnly
          aria-label={t("storyboard.deleteProject")}
          title={t("storyboard.deleteProject")}
          onClick={() => {
            if (window.confirm(t("storyboard.deleteConfirm", { name: active.name }))) onDelete(active.id);
          }}
        >
          <Trash2 size={14} />
        </Button>
      )}
    </div>
  );
}
```

- [ ] **Step 4: `StepBar.tsx`（頂列步驟）**

```tsx
"use client";

import { useLocale } from "@/contexts/LocaleContext";
import { canEnterStep } from "@/lib/storyboard/shots";
import type { Step, StoryboardProject } from "@/lib/storyboard/types";

const STEPS: Step[] = [1, 2, 3, 4];

export function StepBar({ project, onSelect }: { project: StoryboardProject; onSelect: (step: Step) => void }) {
  const { t } = useLocale();

  return (
    <ol className="flex min-w-0 items-center gap-0.5 overflow-x-auto">
      {STEPS.map((step) => {
        // Going back is always allowed; going forward only through the step's own button
        const reachable = step <= project.step && canEnterStep(project, step);
        const current = project.step === step;
        return (
          <li key={step} className="shrink-0">
            <button
              type="button"
              disabled={!reachable}
              aria-current={current ? "step" : undefined}
              onClick={() => onSelect(step)}
              className={`flex h-8 items-center gap-1.5 rounded-[var(--radius-control)] px-2.5 text-xs font-medium transition-colors disabled:opacity-35 ${
                current ? "bg-raised text-fg" : "text-fg-muted hover:text-fg"
              }`}
            >
              <span className="font-mono text-[11px] text-fg-subtle">{step}</span>
              {t(`storyboard.steps.${step}`)}
            </button>
          </li>
        );
      })}
    </ol>
  );
}
```

- [ ] **Step 5: `app/storyboard/page.tsx`（整檔）**

```tsx
"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Header } from "@/components/layout/Header";
import { ProjectList } from "@/components/storyboard/ProjectList";
import { StepBar } from "@/components/storyboard/StepBar";
import { ProjectSetupStep } from "@/components/storyboard/ProjectSetupStep";
import { ScriptStep } from "@/components/storyboard/ScriptStep";
import { ShotImagesStep } from "@/components/storyboard/ShotImagesStep";
import { ShotVideosStep } from "@/components/storyboard/ShotVideosStep";
import type { StepProps } from "@/components/storyboard/types";
import { useLocale } from "@/contexts/LocaleContext";
import { useApiKeyStatus } from "@/hooks";
import { useStoryboardProject } from "@/hooks/useStoryboardProject";
import { getApiKey } from "@/lib/storage/api-key-storage";
import type { Step } from "@/lib/storyboard/types";

const ApiKeyModal = dynamic(
  () => import("@/components/settings/ApiKeyModal").then((mod) => mod.ApiKeyModal),
  { ssr: false }
);

const STEP_COMPONENTS = {
  1: ProjectSetupStep,
  2: ScriptStep,
  3: ShotImagesStep,
  4: ShotVideosStep,
} as const;

export default function StoryboardPage() {
  const { t } = useLocale();
  const apiKeyStatus = useApiKeyStatus();
  const store = useStoryboardProject();
  const { project } = store;
  const [selectedShotId, setSelectedShotId] = useState<string | null>(null);

  // Storyboard mode always uses the user's own key (images are generated in the browser)
  const requireApiKey = () => {
    const key = getApiKey("gemini");
    if (!key) apiKeyStatus.openApiKeyModal();
    return key || null;
  };

  const StepComponent = project ? STEP_COMPONENTS[project.step] : null;
  const stepProps: StepProps | null = project
    ? {
        project,
        update: (fn, options) => store.update(project.id, fn, options),
        requireApiKey,
        goTo: (step: Step) => store.update(project.id, (p) => ({ ...p, step })),
        selectedShotId,
        selectShot: setSelectedShotId,
      }
    : null;

  return (
    <div className="flex min-h-dvh flex-col lg:h-dvh">
      <Header
        active="storyboard"
        hasApiKey={apiKeyStatus.hasApiKey}
        serverHasKey={apiKeyStatus.serverHasKey}
        onApiSettingsClick={apiKeyStatus.openApiKeyModal}
      >
        <ProjectList
          projects={store.projects}
          activeId={project?.id}
          onOpen={store.open}
          onCreate={store.create}
          onDelete={store.remove}
        />
        {project && stepProps && <StepBar project={project} onSelect={stepProps.goTo} />}
      </Header>

      {project && stepProps && StepComponent ? (
        <StepComponent key={project.id} {...stepProps} />
      ) : (
        <div className="flex flex-1 items-center justify-center p-6 text-sm text-fg-subtle">
          {store.isLoading ? t("storyboard.loading") : t("storyboard.empty")}
        </div>
      )}

      <ApiKeyModal
        isOpen={apiKeyStatus.showApiKeyModal}
        onClose={apiKeyStatus.closeApiKeyModal}
        serverHasKey={apiKeyStatus.serverHasKey}
      />
    </div>
  );
}
```

- [ ] **Step 6: `ProjectSetupStep` 置中面板**

1. import 加 `import { Button } from "@/components/ui/Button";`。
2. 最外層 `<div className="flex max-w-xl flex-col gap-5">` 換成兩層：

```tsx
    <div className="flex flex-1 justify-center overflow-y-auto bg-canvas p-6">
      <div className="flex h-fit w-full max-w-[560px] flex-col gap-5 rounded-[var(--radius-panel)] border border-line bg-panel p-6">
```

並在檔尾多補一個 `</div>`。
3. `inputClass` 改為 `"w-full rounded-[var(--radius-control)] border border-line bg-sunken px-3 py-2 text-sm text-fg placeholder:text-fg-subtle focus:border-line-strong focus:outline-none"`。
4. 各 `<label className="flex flex-col gap-2 text-sm text-muted">` 改為 `"flex flex-col gap-1.5 text-xs text-fg-muted"`；產品圖的 `<span className="text-sm text-muted">` 改 `text-xs text-fg-muted`。
5. 最後的「下一步」按鈕換成：

```tsx
      <Button variant="primary" size="lg" disabled={!canEnterStep(project, 2)} onClick={() => goTo(2)}>
        {t("storyboard.next")}
      </Button>
```

- [ ] **Step 7: 檢查並 Commit**

Run: `pnpm test && npx tsc --noEmit -p . && npx eslint app components`
Expected: 型別錯誤只可能來自 ②③④ 還沒用到 `selectedShotId`（不會報錯，屬選用欄位的使用端）；若 ③④ 舊元件仍可編譯即通過。

瀏覽器 `/storyboard`：頂列有專案下拉、新增、刪除、四個步驟；① 為置中面板；長專案名稱在下拉框內截斷。

```bash
git add components/storyboard app/storyboard/page.tsx
git commit -m "style(storyboard): Move projects and steps into the top bar; add the step layout"
```

---

### Task 7: ② 分鏡表三欄

**Files:**
- Modify: `components/storyboard/ShotTable.tsx`（加 `layout` 屬性）
- Modify: `components/storyboard/ScriptStep.tsx`（render 區塊）
- Modify: `components/storyboard/ScriptChat.tsx`（顏色）

**Interfaces:**
- Consumes: `StepLayout`、`Inspector`、`ShotRail`、`PanelSection`、`Button`、`resolveSelectedShot`
- Produces: `ShotTable` 新增 `layout?: "cards" | "panel"`（`panel`＝單欄、無外框）

- [ ] **Step 1: `ShotTable` 的 `layout`**

1. props 加 `layout?: "cards" | "panel";`，解構預設 `layout = "cards"`。
2. `<li key={shot.id} className="flex flex-col gap-3 rounded-lg border border-line p-4">` 改為：

```tsx
        <li
          key={shot.id}
          className={layout === "panel" ? "flex flex-col gap-3" : "flex flex-col gap-3 rounded-[var(--radius-panel)] border border-line bg-panel p-4"}
        >
```

3. `<div className="grid gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">` 改為：

```tsx
          <div className={layout === "panel" ? "flex flex-col gap-3" : "grid gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]"}>
```

4. `fieldClass` 改為 `"w-full rounded-[var(--radius-control)] border border-line bg-sunken px-2.5 py-1.5 text-sm leading-relaxed text-fg focus:border-line-strong focus:outline-none resize-none disabled:opacity-50 [field-sizing:content]"`；AI 優化按鈕換成 `<Button size="sm" ...>`（加 `import { Button } from "@/components/ui/Button";`）。

- [ ] **Step 2: `ScriptChat` 顏色**

使用者訊息 `self-end bg-accent/20 text-foreground` 改 `self-end bg-accent-soft text-fg`；AI 訊息 `self-start bg-surface text-foreground` 改 `self-start border border-line bg-panel text-fg`；輸入框 class 換成 `flex-1 rounded-[var(--radius-control)] border border-line bg-sunken px-3 py-2 text-sm text-fg focus:border-line-strong focus:outline-none disabled:opacity-50`；送出鈕換 `<Button size="md" disabled={...} onClick={send}>`。

- [ ] **Step 3: `ScriptStep` 的 render**

1. 函式參數加 `selectedShotId, selectShot`，並在 `ctx` 下方加 `const selected = resolveSelectedShot(project.shots, selectedShotId);`；import 加 `resolveSelectedShot`、`StepLayout, Inspector`、`ShotRail`、`PanelSection`、`Button`。
2. `return (...)` 整段換成：

```tsx
  const confirmLabel =
    busy === "confirm"
      ? t("storyboard.script.confirming")
      : project.script.confirmed && needsImages.length === 0
        ? t("storyboard.next")
        : `${t("storyboard.script.confirm")}（${formatUsd(confirmCost.amount)}）`;

  return (
    <StepLayout
      rail={
        <ShotRail
          shots={project.shots}
          step={2}
          ratio={project.ratio}
          selectedId={selected?.id}
          onSelect={selectShot}
        />
      }
      main={
        <div className="mx-auto flex max-w-3xl flex-col gap-5 p-6">
          <div className="grid gap-4 md:grid-cols-[auto_minmax(0,1fr)]">
            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-fg-muted">{t("storyboard.script.sourceImage")}</span>
              <ImagePicker
                images={project.script.sourceImage ? [project.script.sourceImage] : []}
                max={1}
                disabled={!!busy}
                onChange={(images) => update((p) => ({ ...p, script: { ...p.script, sourceImage: images[0] } }))}
              />
              <p className="text-xs text-fg-subtle">{t("storyboard.script.sourceImageHint")}</p>
            </div>
            <label className="flex flex-col gap-1.5 text-xs text-fg-muted">
              {t("storyboard.script.sourceText")}
              <textarea
                rows={6}
                value={project.script.sourceText}
                disabled={!!busy}
                placeholder={t("storyboard.script.sourceTextPlaceholder")}
                onChange={(e) => update((p) => ({ ...p, script: { ...p.script, sourceText: e.target.value } }))}
                className="w-full resize-y rounded-[var(--radius-control)] border border-line bg-sunken px-3 py-2.5 text-sm text-fg placeholder:text-fg-subtle focus:border-line-strong focus:outline-none"
              />
            </label>
          </div>

          <Button size="lg" disabled={!hasInput || !!busy} onClick={analyze}>
            {busy === "analyze"
              ? t("storyboard.script.analyzing")
              : hasShots
                ? t("storyboard.script.reanalyze")
                : t("storyboard.script.analyze")}
          </Button>
          {!hasInput && <p className="text-xs text-fg-subtle">{t("storyboard.script.needInput")}</p>}

          {error && (
            <p role="alert" className="rounded-[var(--radius-control)] border border-danger/40 bg-danger-soft px-3 py-2 text-sm text-danger">
              {error}
            </p>
          )}

          {project.script.suggestions.length > 0 && (
            <div className="rounded-[var(--radius-panel)] border border-line bg-panel px-4 py-3">
              <h3 className="section-title mb-2">{t("storyboard.script.suggestions")}</h3>
              <ul className="list-disc pl-5 text-sm text-fg-muted">
                {project.script.suggestions.map((s) => <li key={s}>{s}</li>)}
              </ul>
            </div>
          )}

          {hasShots && <ScriptChat chat={project.script.chat} disabled={!!busy} onSend={chat} />}
        </div>
      }
      inspector={
        selected && (
          <Inspector
            footer={
              <Button
                variant="primary"
                size="lg"
                disabled={!!busy}
                onClick={project.script.confirmed && needsImages.length === 0 ? () => goTo(3) : confirm}
              >
                {confirmLabel}
              </Button>
            }
          >
            <PanelSection title={`${selected.id}`}>
              <ShotTable
                shots={[selected]}
                layout="panel"
                disabled={!!busy}
                onEdit={editRow}
                onPolish={(shotId) => void polish(shotId)}
                polishingId={polishingId}
              />
            </PanelSection>
          </Inspector>
        )
      }
    />
  );
```

（`ShotTable` 的鏡號已在卡片標題列出現，`PanelSection` 標題用同一個鏡號即可；若重複，刪掉 `ShotTable` 在 `layout="panel"` 時的鏡號 `<span>`。）

- [ ] **Step 4: 檢查並 Commit**

Run: `pnpm test && npx tsc --noEmit -p . && npx eslint components`

瀏覽器 ②：左欄列出 s01…、中間是腳本來源與建議和對話、右側是選取鏡頭的欄位與底部確認鈕；點左欄切換鏡頭；新專案（沒有鏡頭）時左欄顯示空狀態、右側不出現。

```bash
git add components/storyboard
git commit -m "style(storyboard): Lay out the storyboard step as rail, canvas and inspector"
```

---

### Task 8: ③ 分鏡圖三欄與總覽

**Files:**
- Create: `components/storyboard/ShotCandidates.tsx`
- Create: `components/storyboard/ShotImageControls.tsx`
- Modify: `components/storyboard/ShotImagesStep.tsx`（整檔改寫）
- Delete: `components/storyboard/ShotImageCard.tsx`
- Modify: `locales/zh.json`、`locales/en.json`

**Interfaces:**
- Consumes: 同 Task 7；`removeCandidate`、`selectCandidate`、`setFinalSize`、`regenerateShot`、`finalizeImages`、`generateCandidates`
- Produces:
  - `<ShotCandidates shot ratio size="large" | "small" onSelect onDelete />`
  - `<ShotImageControls shot onRegenerate />`（`onRegenerate(change: { prompt?: string; note?: string; count: number })`）

- [ ] **Step 1: 語系**

`storyboard.images` 加：zh `"viewSingle": "單鏡", "viewOverview": "總覽", "shot": "這一鏡", "regenerateTitle": "重生"`；en `"viewSingle": "Shot", "viewOverview": "Overview", "shot": "This shot", "regenerateTitle": "Regenerate"`。

- [ ] **Step 2: `ShotCandidates.tsx`**

```tsx
"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Modal } from "@/components/common/Modal";
import { Button } from "@/components/ui/Button";
import { useLocale } from "@/contexts/LocaleContext";
import type { Shot } from "@/lib/storyboard/types";
import type { VideoRatio } from "@/types";
import { BlobImage } from "./BlobImage";

interface ShotCandidatesProps {
  shot: Shot;
  ratio: VideoRatio;
  /** large = single-shot canvas, small = one row of the overview */
  size: "large" | "small";
  onSelect: (index: number) => void;
  onDelete: (index: number) => void;
}

export function ShotCandidates({ shot, ratio, size, onSelect, onDelete }: ShotCandidatesProps) {
  const { t } = useLocale();
  // Candidate index, or "final" for a re-rendered 2K / 4K frame
  const [zoom, setZoom] = useState<number | "final" | null>(null);
  const busy = shot.imageStatus === "generating";
  const rerendered =
    shot.finalImage && shot.selected !== undefined && shot.finalImage !== shot.candidates[shot.selected]
      ? shot.finalImage
      : undefined;
  const zoomed = zoom === "final" ? rerendered : zoom !== null ? shot.candidates[zoom] : undefined;

  const aspect = ratio === "9:16" ? "aspect-[9/16]" : "aspect-video";
  const tile =
    size === "large"
      ? ratio === "9:16"
        ? "w-[min(18rem,40vw)]"
        : "w-[min(28rem,60vw)]"
      : ratio === "9:16"
        ? "w-24"
        : "w-40";

  return (
    <div className="flex flex-wrap gap-3">
      {shot.candidates.map((image, index) => {
        const picked = shot.selected === index;
        return (
          <figure key={index} className={`flex flex-col gap-1.5 ${tile}`}>
            <button
              type="button"
              onClick={() => (size === "large" ? setZoom(index) : onSelect(index))}
              className={`checker relative overflow-hidden rounded-[var(--radius-control)] border ${aspect} ${
                picked ? "border-accent ring-2 ring-accent" : "border-line hover:border-line-strong"
              }`}
            >
              <BlobImage blob={image.blob} alt={`${shot.id}-${index + 1}`} className="size-full object-cover" />
            </button>
            {size === "large" && (
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant={picked ? "primary" : "secondary"}
                  disabled={busy}
                  className="flex-1"
                  onClick={() => onSelect(index)}
                >
                  {picked ? t("storyboard.images.selected") : `${index + 1}`}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  iconOnly
                  disabled={busy}
                  aria-label={t("storyboard.images.delete")}
                  title={t("storyboard.images.delete")}
                  onClick={() => onDelete(index)}
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            )}
          </figure>
        );
      })}

      {rerendered && (
        <figure className={`flex flex-col gap-1.5 ${tile}`}>
          <button
            type="button"
            onClick={() => setZoom("final")}
            className={`checker overflow-hidden rounded-[var(--radius-control)] border border-success ring-2 ring-success/60 ${aspect}`}
          >
            <BlobImage blob={rerendered.blob} alt={`${shot.id}-final`} className="size-full object-cover" />
          </button>
          {size === "large" && <figcaption className="text-center text-xs text-success">{t("storyboard.images.finalRerendered")}</figcaption>}
        </figure>
      )}

      {busy && (
        <div className={`flex items-center justify-center rounded-[var(--radius-control)] border border-dashed border-line text-xs text-fg-subtle ${aspect} ${tile}`}>
          {t("storyboard.images.generating")}
        </div>
      )}

      <Modal isOpen={zoom !== null} onClose={() => setZoom(null)} size="xl">
        {zoomed && <BlobImage blob={zoomed.blob} alt="" className="w-full rounded-[var(--radius-control)]" />}
      </Modal>
    </div>
  );
}
```

- [ ] **Step 3: `ShotImageControls.tsx`**

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/PanelSection";
import { Segmented } from "@/components/ui/Segmented";
import { useLocale } from "@/contexts/LocaleContext";
import { formatUsd, imageCost } from "@/lib/pricing";
import type { Shot } from "@/lib/storyboard/types";

interface ShotImageControlsProps {
  shot: Shot;
  onRegenerate: (change: { prompt?: string; note?: string; count: number }) => void;
}

const inputClass =
  "w-full rounded-[var(--radius-control)] border border-line bg-sunken px-3 py-2 text-sm text-fg placeholder:text-fg-subtle focus:border-line-strong focus:outline-none disabled:opacity-50";

/** Regenerate controls for one shot; remount (key) when its prompt changes */
export function ShotImageControls({ shot, onRegenerate }: ShotImageControlsProps) {
  const { t } = useLocale();
  const [note, setNote] = useState("");
  const [count, setCount] = useState<"1" | "2">("2");
  const [prompt, setPrompt] = useState(shot.imagePrompt);
  const busy = shot.imageStatus === "generating";

  return (
    <div className="flex flex-col gap-3">
      <Field label={t("storyboard.images.notePlaceholder")}>
        <input value={note} disabled={busy} onChange={(e) => setNote(e.target.value)} className={inputClass} />
      </Field>
      <Field label={t("storyboard.images.count")}>
        <Segmented
          label={t("storyboard.images.count")}
          value={count}
          onChange={setCount}
          options={(["1", "2"] as const).map((n) => ({ value: n, label: t("storyboard.images.countOption", { count: n }) }))}
        />
      </Field>
      <details className="text-xs text-fg-muted">
        <summary className="cursor-pointer select-none">{t("storyboard.images.editPrompt")}</summary>
        <textarea
          rows={5}
          value={prompt}
          disabled={busy}
          onChange={(e) => setPrompt(e.target.value)}
          className={`${inputClass} mt-2 font-mono text-xs`}
        />
      </details>
      <Button
        disabled={busy}
        onClick={() => {
          onRegenerate({ note, prompt: prompt !== shot.imagePrompt ? prompt : undefined, count: Number(count) });
          setNote("");
        }}
      >
        {t("storyboard.images.regenerate")}（{formatUsd(imageCost("1K", Number(count)).amount)}）
      </Button>
    </div>
  );
}
```

- [ ] **Step 4: `ShotImagesStep.tsx`（整檔）**

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { PanelSection } from "@/components/ui/PanelSection";
import { Segmented } from "@/components/ui/Segmented";
import { useLocale } from "@/contexts/LocaleContext";
import { formatUsd, imageCost } from "@/lib/pricing";
import { CANDIDATES_PER_SHOT, finalizeImages, generateCandidates, regenerateShot } from "@/lib/storyboard/imageJobs";
import {
  canEnterStep,
  removeCandidate,
  resolveSelectedShot,
  selectCandidate,
  setFinalSize,
} from "@/lib/storyboard/shots";
import type { Shot } from "@/lib/storyboard/types";
import type { ImageSize } from "@/types";
import { ShotCandidates } from "./ShotCandidates";
import { ShotImageControls } from "./ShotImageControls";
import { ShotRail } from "./ShotRail";
import { Inspector, StepLayout } from "./StepLayout";
import type { StepProps } from "./types";

const SIZES: ImageSize[] = ["1K", "2K", "4K"];

export function ShotImagesStep({ project, update, requireApiKey, goTo, selectedShotId, selectShot }: StepProps) {
  const { t, locale } = useLocale();
  const [finalizing, setFinalizing] = useState(false);
  const [view, setView] = useState<"single" | "overview">("single");

  const selected = resolveSelectedShot(project.shots, selectedShotId);
  const missing = project.shots.filter((s) => (s.candidates.length === 0 || s.stale) && s.imageStatus !== "generating");
  const toFinalize = project.shots.filter((s) => s.selected !== undefined && !s.finalImage);
  const allSelected = project.shots.every((s) => s.selected !== undefined);
  const anyBusy = project.shots.some((s) => s.imageStatus === "generating");

  const withKey = (work: (apiKey: string) => void) => {
    const apiKey = requireApiKey();
    if (apiKey) work(apiKey);
  };
  const jobCtx = (apiKey: string) => ({ projectId: project.id, update, apiKey });
  const patchShot = (shotId: string, fn: (shot: Shot) => Shot) =>
    update((p) => ({ ...p, shots: p.shots.map((s) => (s.id === shotId ? fn(s) : s)) }));
  const select = (shotId: string, index: number) => update((p) => ({
    ...p,
    shots: p.shots.map((s) => (s.id === shotId ? selectCandidate(s, index, p.finalSize) : s)),
  }));

  const finalize = () =>
    withKey(async (apiKey) => {
      const cost = imageCost(project.finalSize, toFinalize.length);
      const ok = window.confirm(
        `${t("storyboard.images.finalize", { count: toFinalize.length, size: project.finalSize })}\n${t("storyboard.cost", { price: formatUsd(cost.amount) })}`
      );
      if (!ok) return;
      setFinalizing(true);
      await finalizeImages(jobCtx(apiKey), project);
      setFinalizing(false);
    });

  const toolbar = (
    <div className="flex flex-wrap items-center gap-2">
      <div className="w-44">
        <Segmented
          label={t("storyboard.images.viewSingle")}
          value={view}
          onChange={setView}
          options={[
            { value: "single", label: t("storyboard.images.viewSingle") },
            { value: "overview", label: t("storyboard.images.viewOverview") },
          ]}
        />
      </div>
      {missing.length > 0 && (
        <Button
          size="sm"
          onClick={() => withKey((apiKey) => void generateCandidates(jobCtx(apiKey), project, missing.map((s) => s.id)))}
        >
          {t("storyboard.images.generateMissing")}（{formatUsd(imageCost("1K", missing.length * CANDIDATES_PER_SHOT).amount)}）
        </Button>
      )}
    </div>
  );

  const main =
    view === "overview" ? (
      <div className="flex flex-col gap-4 p-6">
        {toolbar}
        {project.shots.map((shot) => (
          <section key={shot.id} className="flex flex-col gap-2 border-b border-line pb-4 last:border-b-0">
            <button type="button" onClick={() => { selectShot(shot.id); setView("single"); }} className="flex min-w-0 items-baseline gap-2 text-left">
              <span className="font-mono text-xs text-fg">{shot.id}</span>
              <span className="truncate text-xs text-fg-muted">{shot.visual}</span>
            </button>
            <ShotCandidates
              shot={shot}
              ratio={project.ratio}
              size="small"
              onSelect={(index) => select(shot.id, index)}
              onDelete={(index) => patchShot(shot.id, (s) => removeCandidate(s, index))}
            />
          </section>
        ))}
      </div>
    ) : (
      <div className="flex flex-col gap-4 p-6">
        {toolbar}
        {selected && (
          <>
            <div>
              <h2 className="font-mono text-sm text-fg">{selected.id}</h2>
              <p className="mt-1 max-w-3xl text-sm text-fg-muted">{selected.visual}</p>
            </div>
            <ShotCandidates
              shot={selected}
              ratio={project.ratio}
              size="large"
              onSelect={(index) => select(selected.id, index)}
              onDelete={(index) => patchShot(selected.id, (s) => removeCandidate(s, index))}
            />
          </>
        )}
      </div>
    );

  return (
    <StepLayout
      rail={<ShotRail shots={project.shots} step={3} ratio={project.ratio} selectedId={selected?.id} onSelect={selectShot} />}
      main={main}
      inspector={
        <Inspector
          footer={
            <>
              {!allSelected && <p className="text-xs text-fg-subtle">{t("storyboard.images.needSelection")}</p>}
              <Button variant="primary" size="lg" disabled={!canEnterStep(project, 4)} onClick={() => goTo(4)}>
                {t("storyboard.next")}
              </Button>
            </>
          }
        >
          {selected && (
            <PanelSection title={`${t("storyboard.images.shot")} · ${selected.id}`}>
              <div className="flex flex-col gap-2">
                {selected.stale && <p className="text-xs text-warning">{t("storyboard.images.stale")}</p>}
                {selected.hasPackaging && <p className="text-xs text-fg-muted">{t("storyboard.images.packagingHint")}</p>}
                {selected.imageError && <p role="alert" className="text-xs text-danger">{t(selected.imageError)}</p>}
                <ShotImageControls
                  key={`${selected.id}-${selected.imagePrompt}`}
                  shot={selected}
                  onRegenerate={(change) =>
                    withKey((apiKey) => void regenerateShot(jobCtx(apiKey), project, selected.id, change, locale))
                  }
                />
              </div>
            </PanelSection>
          )}
          <PanelSection title={t("storyboard.images.finalSize")}>
            <div className="flex flex-col gap-2">
              <Segmented
                label={t("storyboard.images.finalSize")}
                value={project.finalSize}
                onChange={(size) => update((p) => setFinalSize(p, size))}
                options={SIZES.map((size) => ({ value: size, label: size, disabled: anyBusy }))}
              />
              <p className="text-xs text-fg-subtle">{t("storyboard.images.finalSizeHint")}</p>
              {project.finalSize !== "1K" && toFinalize.length > 0 && (
                <Button disabled={!allSelected || finalizing || anyBusy} onClick={finalize}>
                  {finalizing
                    ? t("storyboard.images.finalizing")
                    : t("storyboard.images.finalize", { count: toFinalize.length, size: project.finalSize })}
                </Button>
              )}
            </div>
          </PanelSection>
        </Inspector>
      }
    />
  );
}
```

- [ ] **Step 5: 刪除舊卡片並檢查**

```bash
git rm components/storyboard/ShotImageCard.tsx
```

Run: `pnpm test && npx tsc --noEmit -p . && npx eslint components`

瀏覽器 ③：左欄縮圖與狀態點、中間大圖（點圖放大、下方選取與刪除）、右側重生設定與定稿尺寸；切「總覽」可在每列直接點選；點總覽的鏡號回到單鏡。

- [ ] **Step 6: Commit**

```bash
git add components/storyboard locales
git commit -m "style(storyboard): Lay out the frames step with a single-shot canvas and overview"
```

---

### Task 9: ④ 影片三欄

**Files:**
- Create: `components/storyboard/ShotVideoPreview.tsx`
- Create: `components/storyboard/ShotVideoSettings.tsx`
- Modify: `components/storyboard/ShotVideosStep.tsx`（整檔改寫）
- Delete: `components/storyboard/ShotVideoCard.tsx`
- Modify: `components/storyboard/MusicSelect.tsx`、`BatchCostConfirm.tsx`（顏色）
- Modify: `locales/zh.json`、`locales/en.json`

**Interfaces:**
- Consumes: 同 Task 7；`shotResolution`、`costRows`、`generateShotVideos`、`extendShotVideo`、`draftShotFields`、`videoFileName`
- Produces:
  - `<ShotVideoPreview shot ratio onExtend />`
  - `<ShotVideoSettings shot isLast resolution onPatch />`（`onPatch(fn: (shot: Shot) => Shot)`）

- [ ] **Step 1: 語系**

`storyboard.videos` 加：zh `"settingsTitle": "鏡頭設定", "fieldsTitle": "提示詞欄位", "noVideo": "還沒有影片，右側設定好後按「生成這鏡」"`；en `"settingsTitle": "Shot settings", "fieldsTitle": "Prompt fields", "noVideo": "No video yet. Set up the shot on the right and click \"Generate this shot\""`。

- [ ] **Step 2: `ShotVideoPreview.tsx`**

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useLocale } from "@/contexts/LocaleContext";
import { videoFileName } from "@/lib/storyboard/shots";
import type { Shot } from "@/lib/storyboard/types";
import type { VideoRatio } from "@/types";
import { BlobImage } from "./BlobImage";

const EXTEND_STEPS = [4, 6, 8];

/** Points a <video> at the stored Blob (or the fallback URL), revoking object URLs on change */
function useVideoElement(shot: Shot) {
  const ref = useRef<HTMLVideoElement>(null);
  const blob = shot.video?.blob;
  const fallbackUrl = shot.video?.url;
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (!blob) {
      element.src = fallbackUrl ?? "";
      return;
    }
    const url = URL.createObjectURL(blob);
    element.src = url;
    return () => URL.revokeObjectURL(url);
  }, [blob, fallbackUrl]);
  return ref;
}

interface ShotVideoPreviewProps {
  shot: Shot;
  ratio: VideoRatio;
  onExtend: (prompt: string, seconds: number) => void;
}

export function ShotVideoPreview({ shot, ratio, onExtend }: ShotVideoPreviewProps) {
  const { t } = useLocale();
  const [extendPrompt, setExtendPrompt] = useState("");
  const [extendSeconds, setExtendSeconds] = useState(4);
  const videoRef = useVideoElement(shot);
  const video = shot.video;
  const hasVideo = !!(video?.blob || video?.url);

  const frameClass =
    ratio === "9:16"
      ? "aspect-[9/16] w-full max-w-sm lg:h-[calc(100dvh-15rem)] lg:w-auto lg:max-w-full"
      : "aspect-video w-full max-w-5xl";

  const download = () => {
    const blob = video?.blob;
    const href = blob ? URL.createObjectURL(blob) : video?.url;
    if (!href) return;
    const a = document.createElement("a");
    a.href = href;
    a.download = videoFileName(shot);
    a.click();
    if (blob) setTimeout(() => URL.revokeObjectURL(href), 1000);
  };

  return (
    <div className="flex flex-col items-center gap-4 p-6">
      <div className={`checker relative overflow-hidden rounded-[var(--radius-panel)] border border-line ${frameClass}`}>
        {hasVideo ? (
          <video ref={videoRef} controls playsInline className="absolute inset-0 size-full bg-black object-contain" />
        ) : shot.finalImage ? (
          <BlobImage blob={shot.finalImage.blob} alt={shot.id} className="absolute inset-0 size-full object-cover opacity-70" />
        ) : null}
        {video?.status === "generating" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-canvas/70 backdrop-blur-sm">
            <div className="size-7 animate-spin rounded-full border-2 border-line border-t-accent" />
            <p className="font-mono text-xs text-fg">{t("storyboard.videos.status.generating", { progress: video.progress })}</p>
          </div>
        )}
      </div>

      <div className="flex w-full max-w-md flex-col gap-2">
        {!hasVideo && video?.status !== "generating" && <p className="text-center text-xs text-fg-subtle">{t("storyboard.videos.noVideo")}</p>}
        {video?.status === "interrupted" && <p className="text-xs text-warning">{t("storyboard.videos.status.interrupted")}</p>}
        {video?.outdated && video.status === "completed" && <p className="text-xs text-warning">{t("storyboard.videos.outdated")}</p>}
        {video?.error && (
          <p role="alert" className="text-xs text-danger">{video.error.startsWith("errors.") ? t(video.error) : video.error}</p>
        )}
        {hasVideo && (
          <Button onClick={download}>
            <Download size={14} aria-hidden="true" />
            {t("storyboard.videos.download")}
          </Button>
        )}
        {video?.status === "completed" && video.sourceVideoUri && (
          <div className="flex gap-2">
            <input
              value={extendPrompt}
              placeholder={t("storyboard.videos.extendPlaceholder")}
              onChange={(e) => setExtendPrompt(e.target.value)}
              className="h-8 min-w-0 flex-1 rounded-[var(--radius-control)] border border-line bg-sunken px-2.5 text-sm text-fg placeholder:text-fg-subtle focus:border-line-strong focus:outline-none"
            />
            <select
              value={extendSeconds}
              onChange={(e) => setExtendSeconds(Number(e.target.value))}
              className="h-8 rounded-[var(--radius-control)] border border-line bg-sunken px-2 font-mono text-xs text-fg"
            >
              {EXTEND_STEPS.map((s) => <option key={s} value={s}>+{s}s</option>)}
            </select>
            <Button disabled={!extendPrompt.trim()} onClick={() => onExtend(extendPrompt, extendSeconds)}>
              {t("storyboard.videos.extend")}
            </Button>
          </div>
        )}
        {video?.prompt && (
          <details className="rounded-[var(--radius-panel)] border border-line bg-panel px-3 py-2 text-xs text-fg-muted">
            <summary className="cursor-pointer select-none">{t("storyboard.videos.prompt")}</summary>
            <p className="mt-1 whitespace-pre-wrap font-mono leading-relaxed">{video.prompt}</p>
          </details>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: `ShotVideoSettings.tsx`**

```tsx
"use client";

import { DurationSelector } from "@/components/upload/DurationSelector";
import { ResolutionSelector } from "@/components/upload/ResolutionSelector";
import { Field, PanelSection } from "@/components/ui/PanelSection";
import { PromptEditor } from "@/components/workspace/PromptEditor";
import { useLocale } from "@/contexts/LocaleContext";
import type { EndFrame, Shot } from "@/lib/storyboard/types";
import type { VideoResolution } from "@/types";
import { ImagePicker } from "./ImagePicker";
import { MusicSelect } from "./MusicSelect";

interface ShotVideoSettingsProps {
  shot: Shot;
  isLast: boolean;
  resolution: VideoResolution;
  onPatch: (fn: (shot: Shot) => Shot) => void;
}

export function ShotVideoSettings({ shot, isLast, resolution, onPatch }: ShotVideoSettingsProps) {
  const { t } = useLocale();
  const busy = shot.video?.status === "generating";

  return (
    <>
      <PanelSection title={`${t("storyboard.videos.settingsTitle")} · ${shot.id}`}>
        <div className="flex flex-col gap-4">
          <DurationSelector
            value={shot.duration}
            disabled={busy}
            onChange={(duration) => onPatch((s) => ({ ...s, duration }))}
            hint={shot.seconds < shot.duration ? t("storyboard.script.scriptSeconds", { seconds: shot.seconds }) : undefined}
          />
          <MusicSelect value={shot.music} disabled={busy} onChange={(music) => onPatch((s) => ({ ...s, music }))} />
          <ResolutionSelector value={resolution} disabled={busy} onChange={(r) => onPatch((s) => ({ ...s, resolution: r }))} />
          <Field label={t("storyboard.videos.endFrame")}>
            <select
              value={shot.endFrame.kind}
              disabled={busy}
              onChange={(e) => {
                const kind = e.target.value as EndFrame["kind"];
                if (kind !== "upload") onPatch((s) => ({ ...s, endFrame: { kind } }));
              }}
              className="h-8 rounded-[var(--radius-control)] border border-line bg-sunken px-2 text-sm text-fg"
            >
              <option value="none">{t("storyboard.videos.endFrameNone")}</option>
              {!isLast && <option value="next">{t("storyboard.videos.endFrameNext")}</option>}
              <option value="upload">{t("storyboard.videos.endFrameUpload")}</option>
            </select>
            <ImagePicker
              images={shot.endFrame.kind === "upload" ? [shot.endFrame.image] : []}
              max={1}
              disabled={busy}
              onChange={(images) =>
                onPatch((s) => ({ ...s, endFrame: images[0] ? { kind: "upload", image: images[0] } : { kind: "none" } }))
              }
            />
          </Field>
        </div>
      </PanelSection>

      <PanelSection title={t("storyboard.videos.fieldsTitle")} collapsible>
        {shot.draft && shot.fields ? (
          <PromptEditor
            draft={shot.draft}
            fields={shot.fields}
            isBusy={busy}
            onFieldChange={(key, value) => onPatch((s) => (s.fields ? { ...s, fields: { ...s.fields, [key]: value } } : s))}
          />
        ) : shot.draftStatus === "failed" ? (
          <p role="alert" className="text-sm text-danger">
            {t("storyboard.videos.draftFailed")}
            {shot.draftError && `（${shot.draftError.startsWith("errors.") ? t(shot.draftError) : shot.draftError}）`}
          </p>
        ) : (
          <p className="text-sm text-fg-subtle">
            {shot.draftStatus === "drafting" ? t("storyboard.videos.drafting") : t("storyboard.videos.needsFields")}
          </p>
        )}
      </PanelSection>
    </>
  );
}
```

- [ ] **Step 4: `ShotVideosStep.tsx`（整檔）**

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { useLocale } from "@/contexts/LocaleContext";
import { formatUsd, sumCosts, videoCost } from "@/lib/pricing";
import { getApiKey } from "@/lib/storage/api-key-storage";
import { resolveSelectedShot, shotResolution } from "@/lib/storyboard/shots";
import type { Shot } from "@/lib/storyboard/types";
import { costRows, draftShotFields, extendShotVideo, generateShotVideos, type CostRow } from "@/lib/storyboard/videoJobs";
import { BatchCostConfirm } from "./BatchCostConfirm";
import { ShotRail } from "./ShotRail";
import { ShotVideoPreview } from "./ShotVideoPreview";
import { ShotVideoSettings } from "./ShotVideoSettings";
import { Inspector, StepLayout } from "./StepLayout";
import type { StepProps } from "./types";

export function ShotVideosStep({ project, update, requireApiKey, selectedShotId, selectShot }: StepProps) {
  const { t, locale } = useLocale();
  const [pending, setPending] = useState<{ rows: CostRow[]; run: () => void } | null>(null);
  const drafted = useRef(false);

  const selected = resolveSelectedShot(project.shots, selectedShotId);
  const jobCtx = (apiKey: string) => ({ projectId: project.id, update, apiKey });
  const unfinished = project.shots.filter(
    (s) => s.video?.status !== "generating" && (s.video?.status !== "completed" || s.video.outdated)
  );
  // Shots whose fields are missing and not being filled right now (never drafted, failed, or image changed)
  const needDraft = project.shots.filter((s) => !s.fields && s.finalImage && s.draftStatus !== "drafting");

  const draftFields = () => {
    const apiKey = requireApiKey();
    if (apiKey) void draftShotFields(jobCtx(apiKey), project, locale);
  };

  // Fill fields once when the step opens, if the key is already set; otherwise the button does it
  useEffect(() => {
    if (drafted.current) return;
    drafted.current = true;
    const apiKey = getApiKey("gemini");
    if (apiKey && needDraft.length > 0) void draftShotFields(jobCtx(apiKey), project, locale);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const confirmGenerate = (shotIds: string[]) => {
    const apiKey = requireApiKey();
    if (!apiKey) return;
    setPending({
      rows: costRows(project, shotIds),
      run: () => void generateShotVideos(jobCtx(apiKey), project, shotIds, locale),
    });
  };

  const confirmExtend = (shot: Shot, prompt: string, seconds: number) => {
    const apiKey = requireApiKey();
    if (!apiKey) return;
    setPending({
      rows: [{ id: shot.id, seconds, resolution: shotResolution(shot, project), hasEnd: false }],
      run: () => void extendShotVideo(jobCtx(apiKey), project, shot.id, prompt, seconds),
    });
  };

  const patchShot = (shotId: string, fn: (shot: Shot) => Shot) =>
    update((p) => ({ ...p, shots: p.shots.map((s) => (s.id === shotId ? fn(s) : s)) }));

  const allCost = sumCosts(unfinished.map((s) => videoCost(s.duration, shotResolution(s, project))));
  const railHeader = (
    <div className="flex flex-col gap-1.5">
      <Button
        variant="primary"
        disabled={unfinished.length === 0 || unfinished.some((s) => !s.fields)}
        onClick={() => confirmGenerate(unfinished.map((s) => s.id))}
      >
        {unfinished.length === project.shots.length ? t("storyboard.videos.generateAll") : t("storyboard.videos.generateMissing")}
        {unfinished.length > 0 && <span className="font-mono">{formatUsd(allCost.amount)}</span>}
      </Button>
      {needDraft.length > 0 && (
        <Button size="sm" variant="ghost" onClick={draftFields}>
          {t("storyboard.videos.draftFields")}
        </Button>
      )}
    </div>
  );

  const selectedVideo = selected?.video;
  const generateLabel = !selectedVideo
    ? t("storyboard.videos.generateOne")
    : selectedVideo.status === "failed"
      ? t("storyboard.videos.retry")
      : t("storyboard.videos.regenerate");

  return (
    <>
      <StepLayout
        rail={
          <ShotRail
            shots={project.shots}
            step={4}
            ratio={project.ratio}
            selectedId={selected?.id}
            onSelect={selectShot}
            header={railHeader}
          />
        }
        main={
          selected && (
            <ShotVideoPreview
              shot={selected}
              ratio={project.ratio}
              onExtend={(prompt, seconds) => confirmExtend(selected, prompt, seconds)}
            />
          )
        }
        inspector={
          selected && (
            <Inspector
              footer={
                <Button
                  variant={selectedVideo ? "secondary" : "primary"}
                  size="lg"
                  disabled={selectedVideo?.status === "generating" || !selected.fields}
                  onClick={() => confirmGenerate([selected.id])}
                >
                  {generateLabel}
                  <span className="font-mono">{formatUsd(videoCost(selected.duration, shotResolution(selected, project)).amount)}</span>
                </Button>
              }
            >
              <ShotVideoSettings
                key={selected.id}
                shot={selected}
                isLast={selected.id === project.shots[project.shots.length - 1]?.id}
                resolution={shotResolution(selected, project)}
                onPatch={(fn) => patchShot(selected.id, fn)}
              />
            </Inspector>
          )
        }
      />

      <BatchCostConfirm
        rows={pending?.rows ?? null}
        onClose={() => setPending(null)}
        onConfirm={() => {
          pending?.run();
          setPending(null);
        }}
      />
    </>
  );
}
```

- [ ] **Step 5: 顏色收尾、刪舊卡片**

`MusicSelect.tsx` 的兩個控制項 class 換成 `h-8 rounded-[var(--radius-control)] border border-line bg-sunken px-2 text-sm text-fg focus:border-line-strong focus:outline-none`（輸入框另加 `min-w-0 flex-1 px-2.5`）；標籤 `text-muted` → `text-fg-muted`。`BatchCostConfirm.tsx` 兩顆按鈕換成 `<Button onClick={onClose}>` 與 `<Button variant="primary" onClick={onConfirm}>`，列表數字加 `font-mono`。

```bash
git rm components/storyboard/ShotVideoCard.tsx
```

- [ ] **Step 6: 檢查並 Commit**

Run: `pnpm test && npx tsc --noEmit -p . && npx eslint components`

瀏覽器 ④：左欄頂端「全部生成 $x」、縮圖與狀態點；中間影片依比例放大；右側鏡頭設定（秒數、配樂、解析度、結束畫面）與可收合的提示詞欄位；底部「生成這鏡 $x」。用 mock 跑一鏡，進度在影片框中央、完成後可播放與下載。

```bash
git add components/storyboard locales
git commit -m "style(storyboard): Lay out the video step with canvas preview and shot settings"
```

---

### Task 10: 對話框與其餘元件的顏色

**Files:**
- Modify: `components/common/Modal.tsx`、`components/settings/ApiKeyModal.tsx`、`components/GuideModal.tsx`、`components/upload/ModeImageUploader.tsx`、`components/workspace/InputPanel.tsx`、`components/workspace/PromptEditor.tsx`、`components/common/Button.tsx`、`components/storyboard/ImagePicker.tsx`

- [ ] **Step 1: Tailwind 顏色 class 換成 token**

```bash
python3 - <<'EOF'
import pathlib, re
MAP = [
    (r"\bbg-gray-900\b", "bg-panel"),
    (r"\bbg-gray-800\b", "bg-sunken"),
    (r"\bborder-gray-800\b", "border-line"),
    (r"\bborder-gray-700\b", "border-line"),
    (r"\bhover:bg-gray-700\b", "hover:bg-raised"),
    (r"\bhover:bg-gray-800\b", "hover:bg-raised"),
    (r"\btext-gray-300\b", "text-fg"),
    (r"\btext-gray-400\b", "text-fg-muted"),
    (r"\btext-gray-500\b", "text-fg-subtle"),
    (r"\bplaceholder-gray-500\b", "placeholder:text-fg-subtle"),
    (r"\btext-blue-[34]00\b", "text-fg"),
    (r"\bborder-blue-400\b", "border-accent"),
    (r"\bborder-blue-500/\d+\b", "border-line-strong"),
    (r"\bbg-blue-500/10\b", "bg-accent-soft"),
    (r"\bring-blue-500\b", "ring-accent/40"),
    (r"\btext-red-[34]00\b", "text-danger"),
    (r"\bborder-red-500/30\b", "border-danger/40"),
    (r"\bbg-red-500/10\b", "bg-danger-soft"),
    (r"\btext-green-[34]00(/70)?\b", "text-success"),
    (r"\bborder-green-500/30\b", "border-success/30"),
    (r"\bbg-green-900/20\b", "bg-success/10"),
    (r"\btext-yellow-[34]00(/70)?\b", "text-warning"),
    (r"\bborder-yellow-500/30\b", "border-warning/30"),
    (r"\bbg-yellow-900/20\b", "bg-warning/10"),
    (r"\btext-amber-300\b", "text-warning"),
    (r"\brounded-2xl\b", "rounded-[var(--radius-panel)]"),
    (r"\brounded-xl\b", "rounded-[var(--radius-control)]"),
    (r"\bhover:bg-white/5\b", "hover:bg-raised"),
]
for path in [*pathlib.Path("components").rglob("*.tsx"), *pathlib.Path("app").rglob("*.tsx")]:
    text = path.read_text()
    fixed = text
    for pattern, repl in MAP:
        fixed = re.sub(pattern, repl, fixed)
    if fixed != text:
        path.write_text(fixed)
        print("updated", path)
EOF
```

- [ ] **Step 2: 對話框標題**

`Modal.tsx`：標題 `text-xl font-semibold text-white` → `text-base font-semibold text-fg`；關閉鈕 `text-fg-muted hover:text-white` → `text-fg-muted hover:text-fg`；外框 `shadow-2xl` 保留；標題列 `px-6 py-4` → `px-5 py-3.5`、內容 `p-6` → `p-5`。

- [ ] **Step 3: 檢查**

Run: `pnpm test && npx tsc --noEmit -p . && npx eslint . && rg -n "(gray|blue|green|yellow|amber)-[0-9]" app components`
Expected: 測試、型別、lint 通過；最後的 `rg` 沒有輸出（`emerald`、`red-500/80` 等狀態色以外不再有 Tailwind 原色）。若還有，依上表補上對應並重跑。

瀏覽器：API 設定視窗、使用方式視窗、單鏡的主圖上傳框，顏色都和其他面板一致。

- [ ] **Step 4: Commit**

```bash
git add app components
git commit -m "style: Move dialogs and remaining components onto the design tokens"
```

---

### Task 11: 實際走一次與截圖比對

**Files:** 無（只有修正時才改檔）

- [ ] **Step 1: 全部檢查**

Run: `pnpm test && npx tsc --noEmit -p . && npx eslint .`

- [ ] **Step 2: 單鏡模式（mock）**

`VIDEO_PROVIDER=mock` 重開 dev server（port 8000）。1440×900：左欄、結果區、頂列；直接生成一次；縮到 1280 寬與 900 寬各截一張，確認不破版、窄螢幕可捲動（Review Focus 1）。

- [ ] **Step 3: 分鏡模式**

用現有的 PDRN 專案：
1. ①：置中面板。
2. ②：鏡頭欄、主區、設定面板；點不同鏡頭切換；新建一個空專案走到 ②，確認鏡頭欄空狀態、無設定面板（Review Focus 3）。
3. ③：單鏡與總覽切換、刪除候選圖（不跑重生，避免花錢）。
4. ④：選一鏡用 mock 生成，看進度與完成狀態點；確認「全部生成」在鏡頭欄頂端。
5. 長名稱：把專案名稱改成 60 字，確認頂列截斷（Review Focus 4）。

- [ ] **Step 4: 切回真的 Omni**

測完以 `pnpm dev -p 8000`（不設 `VIDEO_PROVIDER`）重開，讓使用者繼續用真的 Omni。

- [ ] **Step 5: Commit 修正**

```bash
git add -A app components lib locales
git commit -m "fix(ui): <修正內容>"
```
