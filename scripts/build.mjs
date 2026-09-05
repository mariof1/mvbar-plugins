import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ZipArchive } from 'archiver';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pluginsDirectory = path.join(root, 'plugins');
const outputDirectory = path.join(root, 'dist');
const packageBaseUrl = 'https://raw.githubusercontent.com/mariof1/mvbar-plugins/main/dist/';
const stableZipDate = new Date('1980-01-01T00:00:00.000Z');

// A valid inert WebAssembly module. Missing Music is a declarative extension:
// MVBar supplies its constrained catalog/request host capability.
const inertWasm = Buffer.from([
  0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00,
  0x01, 0x04, 0x01, 0x60, 0x00, 0x00,
  0x03, 0x02, 0x01, 0x00,
  0x07, 0x0e, 0x01, 0x0a,
  0x6d, 0x76, 0x62, 0x61, 0x72, 0x5f, 0x74, 0x65, 0x73, 0x74,
  0x00, 0x00,
  0x0a, 0x04, 0x01, 0x02, 0x00, 0x0b,
]);

async function buildPackage(directory, outputFilename) {
  const manifestBuffer = await fs.readFile(path.join(directory, 'manifest.json'));
  const manifest = JSON.parse(manifestBuffer.toString('utf8'));
  let wasm;
  try {
    wasm = await fs.readFile(path.join(directory, 'plugin.wasm'));
  } catch (error) {
    if (error.code !== 'ENOENT' || manifest.mvbar?.extension?.type !== 'missing-music') throw error;
    wasm = inertWasm;
  }

  const archive = new ZipArchive({ zlib: { level: 9 } });
  const chunks = [];
  archive.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
  const complete = new Promise((resolve, reject) => {
    archive.on('end', resolve);
    archive.on('error', reject);
  });
  archive.append(manifestBuffer, { name: 'manifest.json', date: stableZipDate, mode: 0o644 });
  archive.append(wasm, { name: 'plugin.wasm', date: stableZipDate, mode: 0o644 });
  await archive.finalize();
  await complete;

  const buffer = Buffer.concat(chunks);
  await fs.writeFile(path.join(outputDirectory, outputFilename), buffer);
  return {
    manifest,
    size: buffer.length,
    sha256: crypto.createHash('sha256').update(buffer).digest('hex'),
  };
}

await fs.mkdir(outputDirectory, { recursive: true });
const directories = (await fs.readdir(pluginsDirectory, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .sort((left, right) => left.name.localeCompare(right.name));
const registryPlugins = [];

for (const entry of directories) {
  const directory = path.join(pluginsDirectory, entry.name);
  const metadata = JSON.parse(await fs.readFile(path.join(directory, 'registry-entry.json'), 'utf8'));
  if (metadata.key !== entry.name || !/^[a-z0-9][a-z0-9-]{0,63}$/.test(metadata.key)) {
    throw new Error(`Invalid registry key for ${entry.name}`);
  }
  if (path.basename(metadata.filename) !== metadata.filename || !metadata.filename.endsWith('.ndp')) {
    throw new Error(`Invalid package filename for ${entry.name}`);
  }
  const built = await buildPackage(directory, metadata.filename);
  registryPlugins.push({
    key: metadata.key,
    id: built.manifest.id,
    name: built.manifest.name,
    version: built.manifest.version,
    description: built.manifest.description ?? null,
    filename: metadata.filename,
    packageUrl: `${packageBaseUrl}${encodeURIComponent(metadata.filename)}`,
    sha256: built.sha256,
    size: built.size,
    homepage: built.manifest.homepage ?? null,
  });
  console.log(`built ${metadata.filename} (${built.size} bytes)`);
}

const registry = {
  schemaVersion: 1,
  repository: 'https://github.com/mariof1/mvbar-plugins',
  plugins: registryPlugins,
};
await fs.writeFile(path.join(root, 'registry.json'), `${JSON.stringify(registry, null, 2)}\n`);
