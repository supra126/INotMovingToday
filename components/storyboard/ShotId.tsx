/** Shot ids stay lowercase monospace, even inside uppercase section titles */
export function ShotId({ id }: { id: string }) {
  return <span className="font-mono normal-case tracking-normal">{id}</span>;
}
