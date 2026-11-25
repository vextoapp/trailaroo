import { DEFAULT_LOCALE } from "./config";
import enAU from "./messages/en-AU.json";

export type MessageKey = keyof typeof enAU;
const catalogs: Record<string, Record<MessageKey, string>> = { "en-AU": enAU };

/** Look up a user-facing string and fill {placeholders}. Every UI string goes through here. */
export function t(key: MessageKey, vars: Record<string, string | number> = {}, locale = DEFAULT_LOCALE): string {
  const template = (catalogs[locale] ?? enAU)[key];
  return template.replace(/\{(\w+)\}/g, (m, name: string) => (name in vars ? String(vars[name]) : m));
}
