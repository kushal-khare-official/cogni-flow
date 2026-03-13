import { execFile } from "child_process";

export async function executeCode(
  code: string,
  ctx: Record<string, unknown>,
  language: string = "javascript",
): Promise<Record<string, unknown>> {
  if (language === "python") {
    return executePython(code, ctx);
  }
  return executeJavascript(code, ctx);
}

async function executeJavascript(
  code: string,
  ctx: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  try {
    const fn = new Function("ctx", code);
    const result = await fn(ctx);
    return { result: result ?? null };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function executePython(
  code: string,
  ctx: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  return new Promise((resolve) => {
    const child = execFile(
      "python3",
      ["-c", code],
      {
        timeout: 30_000,
        maxBuffer: 1024 * 1024,
        env: { ...process.env },
      },
      (error, stdout, stderr) => {
        if (error) {
          resolve({ error: error.message, stderr: stderr?.trim() });
          return;
        }
        try {
          const parsed = JSON.parse(stdout.trim());
          resolve({ result: parsed });
        } catch {
          resolve({ result: stdout.trim(), stderr: stderr?.trim() });
        }
      },
    );

    child.stdin?.write(JSON.stringify(ctx));
    child.stdin?.end();
  });
}
