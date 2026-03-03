import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { architecture, openai_key, attacker_skill, harden_node } = body;

    if (!architecture) {
      return NextResponse.json({ error: "Missing architecture field" }, { status: 400 });
    }

    // Adjusting backendDir to look outside frontend/ if we're in it.
    // Assuming process.cwd() is /frontend
    const isFrontendDir = process.cwd().endsWith("/frontend") || process.cwd().endsWith("\\frontend");
    const baseProjectDir = isFrontendDir ? path.join(process.cwd(), "..") : process.cwd();
    const backendDir = path.join(baseProjectDir, "backend");
    const scriptPath = path.join(backendDir, "main.py");

    const result = await runPython(scriptPath, backendDir, { 
      architecture, 
      openai_key: openai_key || "",
      attacker_skill: attacker_skill || 1.0,
      harden_node: harden_node || null
    });



  try {
    const parsed = JSON.parse(result as string);
    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({ error: "Failed to parse simulation output", raw: result }, { status: 500 });
  }
}

function runPython(scriptPath: string, cwd: string, payload: object): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    // Try 'python' first (common on Windows), then 'python3'
    const command = process.platform === "win32" ? "python" : "python3";
    
    const py = spawn(command, [scriptPath], {
      cwd,
      env: { ...process.env, PYTHONPATH: cwd },
    });

    let stdout = "";
    let stderr = "";

    py.stdout.on("data", (data: Buffer) => { stdout += data.toString(); });
    py.stderr.on("data", (data: Buffer) => { stderr += data.toString(); });

    py.on("close", (code: number) => {
      if (code !== 0) {
        reject(new Error(`Python process exited with code ${code}: ${stderr}`));
      } else {
        resolve(stdout);
      }
    });

    py.on("error", (err: Error) => { reject(err); });

    py.stdin.write(JSON.stringify(payload));
    py.stdin.end();
  }).catch((err) => JSON.stringify({ error: err.message }));
}
