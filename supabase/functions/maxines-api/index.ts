import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const ALLOWED_ORIGIN = "https://maxines.vercel.app";
const MAX_INIT_AGE_SECONDS = 3600;
const enc = new TextEncoder();

function cors(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin === ALLOWED_ORIGIN ? ALLOWED_ORIGIN : ALLOWED_ORIGIN,
    "Access-Control-Allow-Headers": "content-type,x-telegram-init-data",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Cache-Control": "no-store",
    "Vary": "Origin",
    "X-Content-Type-Options": "nosniff",
  };
}
function json(status: number, body: unknown, origin: string | null) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors(origin), "Content-Type": "application/json; charset=utf-8" } });
}
async function rest(path: string, init: RequestInit = {}) {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) throw new Error("database_not_configured");
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}`, Accept: "application/json", "Content-Type": "application/json", ...(init.headers || {}) },
  });
  const text = await res.text();
  let data: any = null;
  if (text) { try { data = JSON.parse(text); } catch { data = text; } }
  if (!res.ok) { const e = new Error(`database_${res.status}`); (e as any).details = data; throw e; }
  return data;
}
async function rpc(name: string, body: Record<string, unknown> = {}) { return await rest(`rpc/${name}`, { method: "POST", body: JSON.stringify(body) }); }
function firstString(value: any) {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  if (value && typeof value === "object") { const first = Object.values(value)[0]; if (typeof first === "string") return first; }
  return "";
}
async function botToken() { return firstString(await rpc("maxines_get_telegram_bot_token")); }
async function paymentProviderToken() { return firstString(await rpc("maxines_get_payment_provider_token")); }
async function settings() {
  const rows = await rest("commerce_settings?select=checkout_release_authorized,payment_currency,flat_shipping_amount&singleton=eq.true&limit=1");
  return rows?.[0] || { checkout_release_authorized: false, payment_currency: null, flat_shipping_amount: null };
}
async function capabilities() { return await rpc("maxines_backend_capabilities"); }
async function telegram(method: string, body: Record<string, unknown>) {
  const token = await botToken();
  if (!token) throw new Error("telegram_not_configured");
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.ok) throw new Error(`telegram_${method}_failed`);
  return data.result;
}
async function hmacSha256(keyBytes: Uint8Array, message: string) {
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(message)));
}
function toHex(bytes: Uint8Array) { return Array.from(bytes, b => b.toString(16).padStart(2, "0")).join(""); }
function constantTimeHexEqual(a: string, b: string) {
  if (a.length !== b.length || a.length !== 64) return false;
  let diff = 0; for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i); return diff === 0;
}
async function validateTelegramInitData(raw: string) {
  if (!raw) return { ok: false, error: "missing_init_data" } as const;
  const token = await botToken();
  if (!token) return { ok: false, error: "bot_not_configured" } as const;
  const params = new URLSearchParams(raw);
  const receivedHash = params.get("hash") || "";
  if (!/^[0-9a-f]{64}$/i.test(receivedHash)) return { ok: false, error: "invalid_hash" } as const;
  params.delete("hash");
  const entries = [...params.entries()].sort(([a], [b]) => a.localeCompare(b));
  const dataCheckString = entries.map(([k, v]) => `${k}=${v}`).join("\n");
  const secretKey = await hmacSha256(enc.encode("WebAppData"), token);
  const expectedHash = toHex(await hmacSha256(secretKey, dataCheckString));
  if (!constantTimeHexEqual(expectedHash, receivedHash.toLowerCase())) return { ok: false, error: "signature_mismatch" } as const;
  const authDate = Number(params.get("auth_date"));
  const now = Math.floor(Date.now() / 1000);
  if (!Number.isFinite(authDate)) return { ok: false, error: "missing_auth_date" } as const;
  if (authDate > now + 60) return { ok: false, error: "future_auth_date" } as const;
  if (now - authDate > MAX_INIT_AGE_SECONDS) return { ok: false, error: "expired_init_data" } as const;
  let user: any = null; try { user = JSON.parse(params.get("user") || "null"); } catch { user = null; }
  if (!user?.id) return { ok: false, error: "missing_user" } as const;
  return { ok: true, user: { id: Number(user.id), username: typeof user.username === "string" ? user.username : null, firstName: typeof user.first_name === "string" ? user.first_name : null, lastName: typeof user.last_name === "string" ? user.last_name : null, languageCode: typeof user.language_code === "string" ? user.language_code : null } } as const;
}
function normalizeItems(raw: any) {
  if (!Array.isArray(raw) || raw.length < 1 || raw.length > 20) throw new Error("invalid_items");
  const merged = new Map<string, { sku: string; size: string; quantity: number }>();
  for (const item of raw) {
    const sku = String(item?.sku || "").trim().toUpperCase();
    const size = String(item?.size || "OS").trim().toUpperCase();
    const quantity = Number(item?.quantity);
    if (!/^[A-Z0-9-]{2,40}$/.test(sku) || !/^[A-Z0-9+._-]{1,16}$/.test(size) || !Number.isInteger(quantity) || quantity < 1 || quantity > 10) throw new Error("invalid_item");
    const key = `${sku}::${size}`;
    const existing = merged.get(key);
    if (existing) { existing.quantity += quantity; if (existing.quantity > 10) throw new Error("invalid_quantity"); }
    else merged.set(key, { sku, size, quantity });
  }
  return [...merged.values()];
}
async function cancelOrder(orderId: string) { try { await rpc("cancel_checkout_order", { p_order_id: orderId }); } catch {} }

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(origin) });
  const url = new URL(req.url);
  const route = url.pathname.split("/").filter(Boolean).pop() || "health";
  try {
    if (route === "health" && req.method === "GET") {
      const [products, variants, caps, cfg] = await Promise.all([
        rest("products?select=sku,checkout_enabled&active=eq.true"),
        rest("product_variants?select=stock,enabled&enabled=eq.true"),
        capabilities(), settings(),
      ]);
      const checkoutEnabledProducts = products.filter((p: any) => p.checkout_enabled).length;
      const inventoryConfigured = variants.some((v: any) => Number(v.stock) > 0);
      const checkoutActivated = Boolean(caps?.payment_provider_configured && cfg.checkout_release_authorized && cfg.payment_currency && cfg.flat_shipping_amount !== null && checkoutEnabledProducts > 0 && inventoryConfigured);
      return json(200, { ok: true, app: "maxines", databaseConnected: true, products: products.length, checkoutEnabledProducts, telegramBotConfigured: Boolean(caps?.telegram_bot_configured), paymentProviderConfigured: Boolean(caps?.payment_provider_configured), webhookSecretConfigured: Boolean(caps?.webhook_secret_configured), releaseAuthorized: Boolean(cfg.checkout_release_authorized), paymentCurrencyConfigured: Boolean(cfg.payment_currency), shippingConfigured: cfg.flat_shipping_amount !== null, inventoryConfigured, checkoutActivated, mode: "full_backend_fail_closed" }, origin);
    }
    if (route === "catalog" && req.method === "GET") {
      const [products, variants] = await Promise.all([
        rest("products?select=id,sku,name,category,display_price,display_currency,tag,description,source_verified,checkout_enabled,sort_order&active=eq.true&order=sort_order.asc"),
        rest("product_variants?select=product_id,size,stock,enabled&enabled=eq.true&order=size.asc"),
      ]);
      const byProduct = new Map<string, any[]>();
      for (const v of variants) { if (!byProduct.has(v.product_id)) byProduct.set(v.product_id, []); byProduct.get(v.product_id)!.push({ size: v.size, enabled: Boolean(v.enabled), inStock: Number(v.stock) > 0 }); }
      return json(200, { ok: true, products: products.map((p: any) => ({ sku: p.sku, name: p.name, category: p.category, displayPrice: Number(p.display_price), displayCurrency: p.display_currency, tag: p.tag || "", description: p.description || "", sourceVerified: Boolean(p.source_verified), checkoutEnabled: Boolean(p.checkout_enabled), variants: byProduct.get(p.id) || [] })), source: { mode: "supabase_database", claimedItems: 41, availableItems: products.length, checkoutActivated: products.some((p: any) => p.checkout_enabled), exactStockCountsExposed: false } }, origin);
    }
    if (route === "session" && req.method === "POST") {
      const auth = await validateTelegramInitData(req.headers.get("x-telegram-init-data") || "");
      if (!auth.ok) return json(401, { ok: false, authenticated: false, error: auth.error }, origin);
      return json(200, { ok: true, authenticated: true, telegram: true, user: auth.user }, origin);
    }
    if (route === "telegram-health" && req.method === "GET") {
      const bot = await telegram("getMe", {});
      return json(200, { ok: true, reason: "connected", username: bot?.username || null, id: bot?.id || null }, origin);
    }
    if (route === "checkout" && req.method === "POST") {
      const auth = await validateTelegramInitData(req.headers.get("x-telegram-init-data") || "");
      if (!auth.ok) return json(401, { ok: false, error: "telegram_auth_required" }, origin);
      const [caps, cfg] = await Promise.all([capabilities(), settings()]);
      if (!caps?.payment_provider_configured) return json(503, { ok: false, error: "payment_provider_not_configured", checkoutActivated: false }, origin);
      if (!cfg.checkout_release_authorized) return json(503, { ok: false, error: "checkout_release_not_authorized", checkoutActivated: false }, origin);
      if (!cfg.payment_currency) return json(503, { ok: false, error: "payment_currency_not_configured", checkoutActivated: false }, origin);
      if (cfg.flat_shipping_amount === null) return json(503, { ok: false, error: "shipping_not_configured", checkoutActivated: false }, origin);
      const body = await req.json().catch(() => ({}));
      const items = normalizeItems(body?.items);
      let orderId = "";
      try {
        const created = await rpc("create_checkout_order", { p_telegram_user_id: String(auth.user.id), p_currency: cfg.payment_currency, p_items: items, p_shipping_amount: Number(cfg.flat_shipping_amount) });
        const order = Array.isArray(created) ? created[0] : created;
        if (!order?.order_id) throw new Error("order_not_created");
        orderId = order.order_id;
        const providerToken = await paymentProviderToken();
        if (!providerToken) throw new Error("payment_provider_not_configured");
        const prices: any[] = [{ label: "Merchandise", amount: Number(order.subtotal_amount) }];
        if (Number(order.shipping_amount) > 0) prices.push({ label: "Shipping", amount: Number(order.shipping_amount) });
        const invoiceUrl = await telegram("createInvoiceLink", { title: "MAXINES Order", description: `MAXINES order ${orderId.slice(0, 8)} — ${items.reduce((n: number, i: any) => n + i.quantity, 0)} piece(s)`, payload: orderId, provider_token: providerToken, currency: cfg.payment_currency, prices, need_name: true, need_phone_number: true, need_email: true, need_shipping_address: true, send_phone_number_to_provider: true, send_email_to_provider: true, is_flexible: false });
        return json(200, { ok: true, mode: "telegram", orderId, invoiceUrl, currency: cfg.payment_currency, totalAmount: Number(order.total_amount) }, origin);
      } catch (error) {
        if (orderId) await cancelOrder(orderId);
        const msg = error instanceof Error ? error.message : "checkout_failed";
        const safe = /stock|variant|price|checkout|inventory|currency|shipping|payment_provider/i.test(msg) ? msg : "checkout_could_not_be_created";
        return json(409, { ok: false, error: safe }, origin);
      }
    }
    if (route === "order" && req.method === "GET") {
      const auth = await validateTelegramInitData(req.headers.get("x-telegram-init-data") || "");
      if (!auth.ok) return json(401, { ok: false, error: "telegram_auth_required" }, origin);
      const id = String(url.searchParams.get("id") || "");
      if (!/^[0-9a-f-]{36}$/i.test(id)) return json(400, { ok: false, error: "invalid_order_id" }, origin);
      const rows = await rest(`orders?select=id,status,currency,subtotal_amount,shipping_amount,total_amount,created_at,paid_at&id=eq.${encodeURIComponent(id)}&telegram_user_id=eq.${encodeURIComponent(String(auth.user.id))}&limit=1`);
      if (!rows?.[0]) return json(404, { ok: false, error: "order_not_found" }, origin);
      return json(200, { ok: true, order: rows[0] }, origin);
    }
    return json(404, { ok: false, error: "not_found" }, origin);
  } catch (error) {
    console.error("maxines-api", error instanceof Error ? error.message : "unknown_error");
    return json(503, { ok: false, error: "backend_unavailable" }, origin);
  }
});
