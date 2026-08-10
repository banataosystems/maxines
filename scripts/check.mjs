import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const roots=['api','media'];
const files=['backend-init.js','catalog-data.js','shell.js','request-mode.js'];
function walk(dir){for(const name of readdirSync(dir)){const p=join(dir,name);if(statSync(p).isDirectory())walk(p);else if(p.endsWith('.js'))files.push(p)}}
for(const root of roots)walk(root);
let failed=false;
for(const file of [...new Set(files)].sort()){
  const r=spawnSync(process.execPath,['--check',file],{stdio:'inherit'});
  if(r.status!==0)failed=true;
}
if(failed)process.exit(1);
console.log(`Syntax OK: ${new Set(files).size} JavaScript files`);
