import { readFileSync, writeFileSync, unlinkSync, existsSync } from "node:fs";
import { VALIDATION_API_PORT } from "./limits.ts";

export const RESERVED_PORTS = [8790, 8791, 8788, 18790, 18791] as const;

export function assertValidationPort(port: number): string | null {
  if (RESERVED_PORTS.includes(port as (typeof RESERVED_PORTS)[number])) {
    return "这个端口已被系统或其他服务占用，验证进程不会绑定。";
  }
  if (port !== VALIDATION_API_PORT) return "验证接口只监听 127.0.0.1:8787。";
  return null;
}

export function isPidAlive(pid: number): boolean {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}

export function readPid(pidFile: string): number | null {
  if (!existsSync(pidFile)) return null;
  const pid = Number(readFileSync(pidFile, "utf8").trim());
  return Number.isInteger(pid) ? pid : null;
}

export function decideValidationStart(input: { port: number; profileError: string | null; pidAlive: boolean }): string | null {
  const portError = assertValidationPort(input.port);
  if (portError) return portError;
  if (input.profileError) return input.profileError;
  if (input.pidAlive) return "验证进程已在运行。没有重启，额度文件不会改动。";
  return null;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function stopValidationProcess(pidFile: string, quotaFile: string): Promise<{
  status: "stopped" | "not-running" | "still-running";
  quotaUntouched: true;
}> {
  const before = existsSync(quotaFile) ? readFileSync(quotaFile) : null;
  const pid = readPid(pidFile);
  const finish = (status: "stopped" | "not-running" | "still-running") => {
    const after = existsSync(quotaFile) ? readFileSync(quotaFile) : null;
    if (Buffer.compare(before ?? Buffer.alloc(0), after ?? Buffer.alloc(0)) !== 0) {
      throw new Error("额度文件被改动。");
    }
    return { status, quotaUntouched: true as const };
  };
  if (!pid || !isPidAlive(pid)) {
    if (existsSync(pidFile)) unlinkSync(pidFile);
    return finish("not-running");
  }
  process.kill(pid, "SIGTERM");
  const started = Date.now();
  while (Date.now() - started < 5000) {
    if (!isPidAlive(pid)) {
      if (existsSync(pidFile)) unlinkSync(pidFile);
      return finish("stopped");
    }
    await wait(50);
  }
  return finish("still-running");
}

export function writePidFile(pidFile: string, pid: number): void {
  writeFileSync(pidFile, `${pid}\n`);
}
