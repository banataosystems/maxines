import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const read=p=>readFileSync(p,'utf8');

test('production entry loads database/session bootstrap',()=>{
  const html=read('index.html');
  assert.match(html,/\/backend-init\.js/);
  assert.match(html,/telegram-web-app\.js/);
});

test('embedded recovery catalog contains exactly 13 source SKU records',()=>{
  const catalog=read('catalog-data.js');
  assert.equal((catalog.match(/"sku":/g)||[]).length,13);
  assert.match(catalog,/checkoutEnabled":false/);
});

test('client commerce remains server-gated and uses Telegram invoices',()=>{
  const shell=read('shell.js');
  assert.match(shell,/H\.checkoutActivated/);
  assert.match(shell,/fetch\('\/api\/checkout'/);
  assert.match(shell,/openInvoice/);
});

test('bootstrap hydrates live catalog, health and Telegram session',()=>{
  const init=read('backend-init.js');
  assert.match(init,/fetch\('\/api\/catalog'/);
  assert.match(init,/fetch\('\/api\/health'/);
  assert.match(init,/fetch\('\/api\/session'/);
  assert.match(init,/x-telegram-init-data/);
});

test('rollback is non-destructive and closes release gate',()=>{
  const sql=read('supabase/rollback/disable_checkout.sql');
  assert.match(sql,/checkout_release_authorized\s*=\s*false/i);
  assert.doesNotMatch(sql,/\bdelete\b|\bdrop\b|\btruncate\b/i);
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
