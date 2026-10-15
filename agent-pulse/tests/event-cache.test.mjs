import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { tail } from '../server/codex.mjs';

test('rereads an appended Windows rollout even when mtime does not change', async () => {
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'pulse-cache-'));
 const file=path.join(dir,'events.jsonl');
 const stamp=new Date('2026-01-01T00:00:00Z');
 const event=type=>JSON.stringify({type:'event_msg',timestamp:new Date().toISOString(),payload:{type}})+'\n';
 try {
  await fs.writeFile(file,event('task_started'));
  await fs.utimes(file,stamp,stamp);
  assert.equal((await tail(file)).phase,'running');
  await fs.appendFile(file,event('task_complete'));
  await fs.utimes(file,stamp,stamp);
  assert.equal((await tail(file)).phase,'completed');
 } finally { await fs.unlink(file); await fs.rmdir(dir); }
});
