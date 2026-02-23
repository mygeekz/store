import fetch from 'node-fetch';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';

/**
 * telegramService.ts
 *
 * Thin wrapper around Telegram Bot API (server-side).
 * We keep the surface area small but make network errors debuggable.
 */

export interface TelegramResult {
  success: boolean;
  status?: number;
  message?: string;
  data?: any;
  rawText?: string;
}

const TG_TIMEOUT_MS = 12_000;

// Runtime overrides (set from DB settings) – useful when the server is running
// inside filtered networks and needs to route via local proxies (e.g. v2rayN).
let TG_PROXY_OVERRIDE: string | undefined;

export function setTelegramProxy(proxyUrl?: string | null) {
  const v = String(proxyUrl || '').trim();
  TG_PROXY_OVERRIDE = v ? v : undefined;
}

/**
 * Optional proxy support (important for filtered networks).
 *
 * Set one of these env vars for the server process:
 *   - TG_PROXY=socks5://127.0.0.1:10808
 *   - TG_PROXY=http://127.0.0.1:10809
 *   - HTTPS_PROXY / HTTP_PROXY (fallback)
 */
function getProxyAgent() {
  const proxy = TG_PROXY_OVERRIDE || process.env.TG_PROXY || process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
  if (!proxy) return undefined;

  // socks5://..., socks://...
  if (proxy.startsWith('socks')) return new SocksProxyAgent(proxy);

  // http://... (CONNECT tunneling for https)
  return new HttpsProxyAgent(proxy);
}

async function tgRequest(url: string, init: RequestInit): Promise<TelegramResult> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), TG_TIMEOUT_MS);

  try {
    const agent = getProxyAgent();
    const res = await fetch(url, { ...init, agent, signal: controller.signal } as any);
    const status = res.status;

    const rawText = await res.text().catch(() => '');
    let data: any = null;
    try {
      data = rawText ? JSON.parse(rawText) : null;
    } catch {
      data = null;
    }

    if (res.ok && data?.ok) return { success: true, status, data, rawText };

    // Telegram sometimes returns 200 with ok=false
    const msg = data?.description || `Telegram request failed (HTTP ${status})`;
    return { success: false, status, message: msg, data: data ?? rawText, rawText };
  } catch (err: any) {
    // network errors often hide the real cause in err.cause
    const cause = err?.cause;
    const extra =
      cause?.code ? ` (cause: ${cause.code})` :
      cause?.message ? ` (cause: ${cause.message})` :
      '';

    const msg =
      err?.name === 'AbortError'
        ? `Telegram request timeout after ${TG_TIMEOUT_MS}ms`
        : (err?.message || 'fetch failed') + extra;

    return { success: false, message: msg };
  } finally {
    clearTimeout(t);
  }
}

/**
 * Health check: Telegram getMe
 */
export async function getTelegramBotInfo(botToken: string): Promise<TelegramResult> {
  const url = `https://api.telegram.org/bot${botToken}/getMe`;
  return tgRequest(url, { method: 'GET' });
}

/**
 * Send message: Telegram sendMessage
 */
export async function sendTelegramMessage(botToken: string, chatId: string, text: string): Promise<TelegramResult> {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

  // Telegram hard limit is 4096 chars; keep UI safe
  const raw = String(text ?? '');
  const safeText = raw.length > 4096 ? raw.slice(0, 4093) + '...' : raw;

  return tgRequest(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: safeText,
      disable_web_page_preview: true,
    }),
  });
}



export function parseChatIdList(input: any): string[] {
  const raw = String(input ?? '').trim();
  if (!raw) return [];
  // Accept JSON array, comma-separated, newline-separated, or space-separated
  try {
    const j = JSON.parse(raw);
    if (Array.isArray(j)) return j.map(x => String(x).trim()).filter(Boolean);
  } catch {}
  return raw
    .split(/[\n,؛;\s]+/g)
    .map(s => s.trim())
    .filter(Boolean);
}

/**
 * Send the same message to multiple chat targets (groups/channels/users).
 * Failures are collected but do not stop other deliveries.
 */
export async function sendTelegramMessages(
  botToken: string,
  chatIds: string[],
  text: string
): Promise<{ ok: boolean; results: Array<{ chatId: string; ok: boolean; error?: string }> }> {
  const ids = Array.from(new Set((chatIds || []).map(s => String(s).trim()).filter(Boolean)));
  const results: Array<{ chatId: string; ok: boolean; error?: string }> = [];
  if (!ids.length) return { ok: false, results: [] };

  let anyOk = false;
  for (const chatId of ids) {
    try {
      await sendTelegramMessage(botToken, chatId, text);
      anyOk = true;
      results.push({ chatId, ok: true });
    } catch (e: any) {
      results.push({ chatId, ok: false, error: String(e?.message || e) });
    }
  }
  return { ok: anyOk, results };
}

