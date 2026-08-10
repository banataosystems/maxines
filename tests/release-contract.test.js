import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const read=p=>readFileSync(p,'utf8');
const stripSqlComments=sql=>sql.replace(/--.*$/gm,'').replace(/\/\*[\s\S]*?\*\//g,'');
const VERIFIED_MEDIA_SKUS=['SHRT-89','OUT-014','GRF-101','BSC-06','OUT-012','PRT-003','PRT-002'];

test('production entry loads database/session bootstrap and only verified Archive editorial media',()=>{
  const html=read('index.html');
  assert.match(html,/\/backend-init\.js/);
  assert.match(html,/telegram-web-app\.js/);
  assert.match(html,/\/media\/originals\.js/);
  for(const file of ['bsc-06.js','shrt-89.js','out-014.js','grf-101.js','out-012.js','prt-003.js','prt-002.js'])assert.match(html,new RegExp(`/media/editorial/${file.replace('.','\\.')}`));
  assert.doesNotMatch(html,/\/media\/editorial\/grf-102\.js/);
});

test('verified untouched-photo derivative layer reconciles exactly to approved media mappings',()=>{
  const originals=read('media/originals.js');
  for(const sku of VERIFIED_MEDIA_SKUS)assert.match(originals,new RegExp(`__ARCHIVE_ORIGINAL__\\['${sku}'\\]`));
  assert.doesNotMatch(originals,/GRF-102/);
});

test('embedded recovery catalog contains exactly 13 source SKU records',()=>{
  const catalog=read('catalog-data.js');
  assert.equal((catalog.match(/"sku":/g)||[]).length,13);
  assert.match(catalog,/checkoutEnabled":false/);
});

test('Archive shell keeps editorial and untouched original media as separate trust layers',()=>{
  const shell=read('shell.js');
  assert.match(shell,/__ARCHIVE_EDITORIAL__/);
  assert.match(shell,/__ARCHIVE_ORIGINAL__/);
  assert.match(shell,/O\[p\.sku\]\|\|p\.imageUrl/);
  assert.match(shell,/Editorial/);
  assert.match(shell,/Original Photo/);
  assert.match(shell,/source display label/i);
  assert.match(shell,/not treated as an approved settlement price/i);
});

test('client commerce remains server-gated and uses Telegram invoices only when activated',()=>{
  const shell=read('shell.js');
  assert.match(shell,/H\.checkoutActivated/);
  assert.match(shell,/fetch\('\/api\/checkout'/);
  assert.match(shell,/openInvoice/);
});

test('Archive locked-commerce drawer submits authenticated non-charging availability requests',()=>{
  const shell=read('shell.js');
  assert.match(shell,/fetch\('\/api\/request'/);
  assert.match(shell,/x-telegram-init-data/);
  assert.match(shell,/not a confirmed order/i);
  assert.match(shell,/no payment/i);
});

test('bootstrap hydrates live catalog, health and Telegram session',()=>{
  const init=read('backend-init.js');
  assert.match(init,/fetch\('\/api\/catalog'/);
  assert.match(init,/fetch\('\/api\/health'/);
  assert.match(init,/fetch\('\/api\/session'/);
  assert.match(init,/x-telegram-init-data/);
  assert.match(init,/request-mode\.js/);
});

test('locked checkout has a non-charging authenticated availability fallback',()=>{
  const mode=read('request-mode.js');
  assert.match(mode,/H\.checkoutActivated/);
  assert.match(mode,/S\.authenticated/);
  assert.match(mode,/fetch\('\/api\/request'/);
  assert.match(mode,/not a confirmed order/i);
  assert.match(mode,/no payment/i);
  const migration=read('supabase/migrations/20260810153952_availability_request_fallback.sql');
  assert.match(migration,/revoke all on table public\.availability_requests from anon, authenticated/i);
  assert.match(migration,/grant execute on function public\.create_availability_request[\s\S]*to service_role/i);
});

test('rollback is non-destructive and closes release gate',()=>{
  const sql=read('supabase/rollback/disable_checkout.sql');
  const executable=stripSqlComments(sql);
  assert.match(executable,/checkout_release_authorized\s*=\s*false/i);
  assert.doesNotMatch(executable,/\b(?:delete|drop|truncate)\b/i);
});

test('security headers are declared',()=>{
  const v=read('vercel.json');
  for(const h of ['X-Content-Type-Options','Referrer-Policy','Permissions-Policy','X-Frame-Options'])assert.match(v,new RegExp(h));
});

test('repository text contains no obvious committed service credentials',()=>{
  const files=[];
  function walk(dir){for(const n of readdirSync(dir)){if(n==='.git'||n==='node_modules')continue;const p=join(dir,n);const s=statSync(p);if(s.isDirectory())walk(p);else if(/\.(js|mjs|json|md|sql|html|css|ts)$/.test(p))files.push(p)}}
  walk('.');
  const text=files.map(read).join('\n');
  assert.doesNotMatch(text,/\b\d{8,12}:[A-Za-z0-9_-]{30,}\b/);
  assert.doesNotMatch(text,/sb_secret_[A-Za-z0-9_-]{20,}/);
  assert.doesNotMatch(text,/eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/);
});
