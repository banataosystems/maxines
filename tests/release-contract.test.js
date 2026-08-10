import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const read=p=>readFileSync(p,'utf8');
const stripSqlComments=sql=>sql.replace(/--.*$/gm,'').replace(/\/\*[\s\S]*?\*\//g,'');
const HIRES=['2305','2311','2317','2319'];
const MAPPED={'SHRT-89':'2311','OUT-014':'2319','OUT-012':'2317','PRT-002':'2305'};
function webpDimensionsFromFile(path){
  const js=read(path);const m=js.match(/base64,([A-Za-z0-9+/=]+)/);assert.ok(m,`embedded WebP missing in ${path}`);
  const b=Buffer.from(m[1],'base64');assert.equal(b.toString('ascii',0,4),'RIFF');assert.equal(b.toString('ascii',8,12),'WEBP');const chunk=b.toString('ascii',12,16);
  if(chunk==='VP8 ')return {width:b.readUInt16LE(26)&0x3fff,height:b.readUInt16LE(28)&0x3fff};
  if(chunk==='VP8X')return {width:1+b.readUIntLE(24,3),height:1+b.readUIntLE(27,3)};
  throw new Error(`unsupported WebP chunk ${chunk}`);
}

test('production entry loads Telegram, manifest, one eager hi-res hero and backend bootstrap',()=>{
  const html=read('index.html');
  assert.match(html,/telegram-web-app\.js/);assert.match(html,/\/media-manifest\.js/);assert.match(html,/\/media\/hires\/2311\.js/);assert.match(html,/\/backend-init\.js/);
  assert.doesNotMatch(html,/\/media\/editorial\//);assert.doesNotMatch(html,/bsc-06\.js|grf-102\.js/);
  assert.equal((html.match(/\/media\/hires\/[^"']+\.js/g)||[]).length,1,'only the landing hero should be eager');
});

test('all customer-facing verified images are high-resolution and no low-resolution image can ship',()=>{
  for(const id of HIRES){const path=`media/hires/${id}.js`;assert.ok(existsSync(path),`${path} missing`);const d=webpDimensionsFromFile(path);assert.ok(d.width>=1000,`${id} width ${d.width}`);assert.ok(d.height>=1250,`${id} height ${d.height}`)}
});

test('media manifest exposes exactly four fully transported verified commerce mappings',()=>{
  const manifest=read('media-manifest.js');
  for(const [sku,id] of Object.entries(MAPPED))assert.match(manifest,new RegExp(`"${sku}"\\s*:\\s*"${id}"`));
  for(const sku of ['GRF-102','BSC-06','GRF-101','PRT-003'])assert.doesNotMatch(manifest,new RegExp(`"${sku}"\\s*:`));
  assert.match(manifest,/editorialOrder/);assert.equal((manifest.match(/script:"\/media\/hires\//g)||[]).length,4);
});

test('customer UI never falls back to low-resolution source image URLs',()=>{
  const shell=read('shell.js');
  assert.match(shell,/__MAXINES_HIRES__/);assert.match(shell,/__MAXINES_MEDIA_MANIFEST__/);
  assert.doesNotMatch(shell,/p\.imageUrl/);assert.doesNotMatch(shell,/__ARCHIVE_EDITORIAL__|__ARCHIVE_ORIGINAL__/);
  assert.match(shell,/high-resolution editorial presentation only/i);
});

test('responsive layout has deliberate compact-phone, tablet, desktop and wide-screen modes',()=>{
  const css=read('styles.css');
  for(const pattern of [/@media\(max-width:359px\)/,/@media\(min-width:600px\)/,/@media\(min-width:1024px\)/,/@media\(min-width:1600px\)/,/@media\(orientation:landscape\)/,/@media\(prefers-reduced-motion:reduce\)/])assert.match(css,pattern);
  assert.match(css,/safe-area-inset-top/);assert.match(css,/--app-height/);assert.match(css,/aspect-ratio/);assert.match(css,/content-visibility:auto/);
  assert.doesNotMatch(css,/archive-shell[^}]*max-width:520px/);
});

test('embedded recovery catalog remains 13 source SKU records and fail-closed',()=>{
  const catalog=read('catalog-data.js');assert.equal((catalog.match(/"sku":/g)||[]).length,13);assert.match(catalog,/checkoutEnabled":false/);
});

test('client commerce remains server-gated with authenticated non-charging request fallback',()=>{
  const shell=read('shell.js');assert.match(shell,/H\.checkoutActivated/);assert.match(shell,/fetch\('\/api\/checkout'/);assert.match(shell,/openInvoice/);assert.match(shell,/fetch\('\/api\/request'/);assert.match(shell,/x-telegram-init-data/);assert.match(shell,/not a confirmed order/i);assert.match(shell,/no payment/i);
});

test('bootstrap hydrates catalog, health and Telegram session without legacy DOM observer enhancer',()=>{
  const init=read('backend-init.js');assert.match(init,/fetch\('\/api\/catalog'/);assert.match(init,/fetch\('\/api\/health'/);assert.match(init,/fetch\('\/api\/session'/);assert.match(init,/x-telegram-init-data/);assert.doesNotMatch(init,/request-mode\.js/);
});

test('database request fallback remains service-role constrained',()=>{
  const migration=read('supabase/migrations/20260810153952_availability_request_fallback.sql');assert.match(migration,/revoke all on table public\.availability_requests from anon, authenticated/i);assert.match(migration,/grant execute on function public\.create_availability_request[\s\S]*to service_role/i);
});

test('rollback is non-destructive and closes release gate',()=>{
  const executable=stripSqlComments(read('supabase/rollback/disable_checkout.sql'));assert.match(executable,/checkout_release_authorized\s*=\s*false/i);assert.doesNotMatch(executable,/\b(?:delete|drop|truncate)\b/i);
});

test('security headers are declared',()=>{const v=read('vercel.json');for(const h of ['X-Content-Type-Options','Referrer-Policy','Permissions-Policy','X-Frame-Options'])assert.match(v,new RegExp(h))});

test('repository text contains no obvious committed service credentials',()=>{
  const files=[];function walk(dir){for(const n of readdirSync(dir)){if(n==='.git'||n==='node_modules')continue;const p=join(dir,n);const s=statSync(p);if(s.isDirectory())walk(p);else if(/\.(js|mjs|json|md|sql|html|css|ts)$/.test(p))files.push(p)}}walk('.');const text=files.map(read).join('\n');assert.doesNotMatch(text,/\b\d{8,12}:[A-Za-z0-9_-]{30,}\b/);assert.doesNotMatch(text,/sb_secret_[A-Za-z0-9_-]{20,}/);assert.doesNotMatch(text,/eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/);
});
