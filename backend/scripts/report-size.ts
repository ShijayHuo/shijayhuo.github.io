import { gzipSync } from "node:zlib";
import { readFileSync, statSync } from "node:fs";
import path from "node:path";

const workerFile = path.join(import.meta.dirname, "../dist/worker.js");
const worker = readFileSync(workerFile);
const gzip = gzipSync(worker);
console.log(JSON.stringify({
  workerBytes: worker.byteLength,
  workerGzipBytes: gzip.byteLength,
  workerExists: statSync(workerFile).isFile(),
  workersCpu: "unmeasured",
  workersMemory: "unmeasured",
  note: "这是 esbuild 产物字节数，不是 Cloudflare 上的 CPU 或内存。",
}));
