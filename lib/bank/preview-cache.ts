import { createHash, randomUUID } from "node:crypto";
import type { prepareStatement } from "./import.mjs";
type Prepared = Awaited<ReturnType<typeof prepareStatement>>;
const previews = new Map<
  string,
  { owner: string; prepared: Prepared; expires: number }
>();

export function savePreview(owner: string, prepared: Prepared) {
  for (const [token, item] of previews)
    if (item.expires < Date.now()) previews.delete(token);
  while (previews.size >= 10) previews.delete(previews.keys().next().value!);
  const token = randomUUID();
  previews.set(token, { owner, prepared, expires: Date.now() + 10 * 60_000 });
  return token;
}

export function findPreview(token: string, owner: string, bytes: Uint8Array) {
  const item = previews.get(token);
  if (!item || item.owner !== owner || item.expires < Date.now()) return null;
  const hash = createHash("sha256").update(bytes).digest("hex");
  return item.prepared.hash === hash ? item.prepared : null;
}
