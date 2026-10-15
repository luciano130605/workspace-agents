import { spawn } from 'node:child_process';
const children=[spawn(process.execPath,['--watch','--env-file-if-exists=.env','server/index.mjs'],{stdio:'inherit',windowsHide:true}),spawn(process.execPath,['node_modules/vite/bin/vite.js'],{stdio:'inherit',windowsHide:true})];
let stopping=false;function stop(){if(stopping)return;stopping=true;children.forEach(c=>c.kill());}for(const c of children){c.on('exit',stop);c.on('error',stop)}process.on('SIGINT',stop);process.on('SIGTERM',stop);
