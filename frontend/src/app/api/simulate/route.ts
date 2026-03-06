import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { architecture, attacker_skill, harden_node } = body;

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
    const fs = require("fs");
    // Fallback chain: venv python → system python3 → system python
    const venvPython = path.join(cwd, "..", ".venv", "bin", "python3");
    let command: string;
    if (process.platform === "win32") {
      command = "python";
    } else if (fs.existsSync(venvPython)) {
      command = venvPython;
    } else {
      command = "python3";
    }

    const py = spawn(command, [scriptPath], {
      cwd,
      env: { ...process.env, PYTHONPATH: cwd },
    });

    let stdout = "";
    let stderr = "";

    // Timeout: kill after 180 seconds (increased from 60s to accommodate
    // simulation + RL training + AI explanation pipeline)
    const timeout = setTimeout(() => {
      py.kill("SIGKILL");
      // Return partial results instead of hard rejection
      if (stdout.trim()) {
        resolve(stdout);
      } else {
        resolve(JSON.stringify({
          status: "error",
          error: "Simulation timed out after 180 seconds. Try a smaller graph or disable Monte Carlo.",
        }));
      }
    }, 180000);

    py.stdout.on("data", (data: Buffer) => { stdout += data.toString(); });
    py.stderr.on("data", (data: Buffer) => { stderr += data.toString(); });

    py.on("close", (code: number) => {
      clearTimeout(timeout);
      if (code !== 0) {
        reject(new Error(`Python process exited with code ${code}: ${stderr}`));
      } else {
        resolve(stdout);
      }
    });

    py.on("error", (err: Error) => {
      clearTimeout(timeout);
      reject(err);
    });

    py.stdin.write(JSON.stringify(payload));
    py.stdin.end();
  }).catch((err) => JSON.stringify({ error: err.message }));
}
