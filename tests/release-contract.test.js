import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
const read=p=>readFileSync(p,'utf8');
const stripSqlComments=sql=>sql.replace(/--.*$/gm,'').replace(/\/\*[\s\S]*?\*\//g,'');
const MAPPED={'SHRT-89':'2311','OUT-014':'2319','OUT-012':'2317','PRT-002':'2305'};

test('media manifest publishes only the four verified SKU associations',()=>{const manifest=read('media-manifest.js');for(const [sku,id] of Object.entries(MAPPED))assert.match(manifest,new RegExp(`"${sku}"\\s*:\\s*"${id}"`));for(const sku of ['GRF-102','BSC-06','GRF-101','PRT-003'])assert.doesNotMatch(manifest,new RegExp(`"${sku}"\\s*:`));assert.equal((manifest.match(/src:"\/api\/media/g)||[]).length,4)});

test('responsive layout preserves all deliberate device modes',()=>{const css=read('styles.css');for(const pattern of [/@media\(max-width:359px\)/,/@media\(min-width:600px\)/,/@media\(min-width:1024px\)/,/@media\(min-width:1600px\)/,/@media\(orientation:landscape\)/,/@media\(prefers-reduced-motion:reduce\)/])assert.match(css,pattern);assert.match(css,/safe-area-inset-top/);assert.match(css,/--app-height/);assert.match(css,/aspect-ratio/)});

test('embedded recovery catalog remains 13 source records and fail-closed',()=>{assert.ok(existsSync('catalog-data.js'),'catalog-data.js missing');const catalog=read('catalog-data.js');assert.equal((catalog.match(/"sku":/g)||[]).length,13);assert.match(catalog,/checkoutEnabled":false/)});

test('commerce remains server-gated and non-charging fallback remains explicit',()=>{const shell=read('app-main.js'),state=read('app-state.js');assert.match(state,/checkoutActivated/);assert.match(shell,/fetch\('\/api\/checkout'/);assert.match(shell,/openInvoice/);assert.match(shell,/fetch\('\/api\/request'/);assert.match(shell,/not a confirmed order/i);assert.match(shell,/No payment was taken/i)});

test('backend bootstrap still hydrates catalog health and Telegram session asynchronously',()=>{const init=read('backend-init.js');assert.match(init,/fetchJson\('\/api\/catalog'/);assert.match(init,/fetchJson\('\/api\/health'/);assert.match(init,/fetchJson\('\/api\/session'/);assert.match(init,/x-telegram-init-data/);assert.match(init,/maxines:state/)});

test('availability request foundation stays service-role constrained',()=>{const migration=read('supabase/migrations/20260810153952_availability_request_fallback.sql');assert.match(migration,/revoke all on table public\.availability_requests from anon, authenticated/i);assert.match(migration,/grant execute on function public\.create_availability_request[\s\S]*to service_role/i)});

test('rollback remains non-destructive and closes release gate',()=>{const executable=stripSqlComments(read('supabase/rollback/disable_checkout.sql'));assert.match(executable,/checkout_release_authorized\s*=\s*false/i);assert.doesNotMatch(executable,/\b(?:delete|drop|truncate)\b/i)});

test('security headers are declared and CSP blocks plugins',()=>{const v=read('vercel.json');for(const h of ['X-Content-Type-Options','Referrer-Policy','Permissions-Policy','X-Frame-Options'])assert.match(v,new RegExp(h));assert.match(v,/object-src 'none'/)});

test('repository text contains no obvious committed service credentials',()=>{const files=[];function walk(dir){for(const n of readdirSync(dir)){if(n==='.git'||n==='node_modules')continue;const p=join(dir,n);const s=statSync(p);if(s.isDirectory())walk(p);else if(/\.(js|mjs|json|md|sql|html|css|ts)$/.test(p))files.push(p)}}walk('.');const text=files.map(read).join('\n');assert.doesNotMatch(text,/\b\d{8,12}:[A-Za-z0-9_-]{30,}\b/);assert.doesNotMatch(text,/sb_secret_[A-Za-z0-9_-]{20,}/);assert.doesNotMatch(text,/eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/)});
