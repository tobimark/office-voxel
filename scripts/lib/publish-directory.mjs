import * as fs from 'node:fs/promises';
import path from 'node:path';

const removeOptions = { recursive: true, force: true, maxRetries: 3, retryDelay: 100 };

async function verifyCopy(source, destination) {
  const entries = await fs.readdir(source, { withFileTypes: true });
  const copied = await fs.readdir(destination);
  if (JSON.stringify(entries.map(entry => entry.name).sort()) !== JSON.stringify(copied.sort())) {
    throw new Error(`Directory copy differs: ${destination}`);
  }
  for (const entry of entries) {
    const from = path.join(source, entry.name), to = path.join(destination, entry.name);
    const target = await fs.lstat(to);
    if (entry.isDirectory() && target.isDirectory()) {
      await verifyCopy(from, to);
    } else if (entry.isFile() && target.isFile()) {
      const [original, copy] = await Promise.all([fs.readFile(from), fs.readFile(to)]);
      if (!original.equals(copy)) throw new Error(`File copy differs: ${to}`);
    } else {
      throw new Error(`Unsupported or mismatched export entry: ${from}`);
    }
  }
}

// Windows can deny renaming a nonempty directory even when its files can be
// copied/deleted. Keep a verified copy before removing any published content.
export async function publishDirectory({
  stage, outRoot, rename = fs.rename, copy = fs.cp, remove = fs.rm,
  platform = process.platform, onWarning = console.warn,
}) {
  async function transfer(source, destination) {
    try {
      await rename(source, destination);
      return false;
    } catch (error) {
      if (platform !== 'win32' || !['EPERM', 'EACCES', 'EBUSY'].includes(error.code)) throw error;
    }
    // Exclusive creation prevents overwriting an unrelated existing directory.
    await fs.mkdir(destination);
    try {
      for (const name of await fs.readdir(source)) {
        await copy(path.join(source, name), path.join(destination, name), { recursive: true, force: false, errorOnExist: true });
      }
      await verifyCopy(source, destination);
    } catch (error) {
      try { await remove(destination, removeOptions); }
      catch (cleanup) {
        throw new AggregateError([error, cleanup], `Copy failed; incomplete directory remains at ${destination}`);
      }
      throw error;
    }
    return true;
  }

  let backup, backupReady = false;
  async function cleanBackup() {
    if (!backupReady) return;
    try { await remove(backup, removeOptions); }
    catch (error) { onWarning(`Could not remove export backup ${backup}: ${error.message}`); }
  }
  try {
    let previousExists;
    try { await fs.lstat(outRoot); previousExists = true; }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (previousExists) {
      backup = `${stage}-previous`;
      const copied = await transfer(outRoot, backup);
      backupReady = true;
      if (copied) await remove(outRoot, removeOptions);
    }
    await transfer(stage, outRoot);
  } catch (error) {
    if (backupReady) {
      try {
        // A failed copy or removal may leave part of the output behind.
        await remove(outRoot, removeOptions);
        await transfer(backup, outRoot);
      } catch (rollback) {
        throw new AggregateError([error, rollback], `Publication and rollback failed; previous export remains at ${backup}`);
      }
      await cleanBackup();
    }
    throw error;
  }
  await cleanBackup();
}
