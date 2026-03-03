import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { architecture, openai_key } = body;

  if (!architecture) {
    return NextResponse.json({ error: "Missing architecture field" }, { status: 400 });
  }

  const projectDir = path.join(process.cwd(), "project");
  const scriptPath = path.join(projectDir, "run_simulation.py");

  const result = await runPython(scriptPath, projectDir, { architecture, openai_key: openai_key || "" });

  try {
    const parsed = JSON.parse(result as string);
    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({ error: "Failed to parse simulation output", raw: result }, { status: 500 });
  }
}

function runPython(scriptPath: string, cwd: string, payload: object): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const py = spawn("python3", [scriptPath], {
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
