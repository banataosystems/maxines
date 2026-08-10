import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read=p=>readFileSync(p,'utf8');

test('render path is non-blocking and accessibility zoom is enabled',()=>{const html=read('index.html'),init=read('backend-init.js');assert.doesNotMatch(html,/user-scalable=no/);assert.match(html,/id="app"/);assert.doesNotMatch(html,/id="app"[^>]*aria-live/);assert.match(html,/id="status"[^>]*role="status"[^>]*aria-live="polite"/);assert.ok(html.indexOf('/app-main.js')<html.indexOf('/backend-init.js'));assert.doesNotMatch(init,/import\(['"]\/shell\.js/);assert.match(init,/maxines:state/)});

test('customer media is delivered as a real image resource rather than executable data URI',()=>{const manifest=read('media-manifest.js'),shell=read('app-main.js'),media=read('api/media.js');for(const id of ['2305','2311','2317','2319'])assert.match(manifest,new RegExp(`/api/media\\?id=${id}`));assert.doesNotMatch(shell,/createElement\('script'\)/);assert.doesNotMatch(shell,/base64,/);assert.match(media,/Content-Type','image\/webp'/);assert.match(media,/ALLOWED/)});

test('customer price stays non-transactional until checkout activation',()=>{const main=read('app-main.js'),state=read('app-state.js');assert.match(state,/Price on request/);assert.match(state,/checkoutActivated/);assert.doesNotMatch(main,/source label<\/span>/)});

test('search and dialog accessibility are implemented',()=>{const shell=read('app-main.js');assert.match(shell,/search-results/);assert.match(shell,/setTimeout\([^,]+,100\)/);assert.match(shell,/e\.key==='Escape'/);assert.match(shell,/e\.key==='Tab'/);assert.match(shell,/aria-labelledby=/);assert.match(shell,/restoreFocus/)});

test('HttpOnly application session and cookie forwarding are present',()=>{const session=read('api/session.js'),proxy=read('api/_proxy.js'),reqProxy=read('api/_request-proxy.js');assert.match(session,/HttpOnly/);assert.match(session,/Secure/);assert.match(session,/SameSite=Lax/);assert.match(session,/mx_session/);assert.match(proxy,/x-maxines-session/);assert.match(reqProxy,/x-maxines-session/)});

test('persistent customer and owner operations are private by default',()=>{const sql=read('supabase/migrations/20260811_000001_customer_owner_ops.sql');for(const table of ['user_favorites','staff_users','audit_events'])assert.match(sql,new RegExp(`alter table public\\.${table} enable row level security`,'i'));assert.match(sql,/revoke all on public\.staff_users from public, anon, authenticated/i);assert.match(sql,/grant execute on function public\.maxines_record_audit[\s\S]*to service_role/i);const shell=read('app-main.js');for(const endpoint of ['/api/favorites','/api/orders','/api/owner-requests'])assert.match(shell,new RegExp(endpoint.replaceAll('/','\\/')))});

test('production hardening pins runtime and tightens CSP',()=>{const pkg=JSON.parse(read('package.json')),v=read('vercel.json');assert.equal(pkg.engines.node,'24.x');assert.match(v,/object-src 'none'/);assert.match(v,/manifest-src 'self'/)});

test('commerce remains fail-closed and request fallback non-charging',()=>{const shell=read('app-main.js');assert.match(shell,/fetch\('\/api\/checkout'/);assert.match(shell,/fetch\('\/api\/request'/);assert.match(shell,/not a confirmed order/i);assert.match(shell,/No payment was taken/i)});
