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

  const result = await new Promise<string>((resolve, reject) => {
    const py = spawn("python3", [scriptPath], {
      cwd: projectDir,
      env: { ...process.env, PYTHONPATH: projectDir },
    });

    let stdout = "";
    let stderr = "";

    py.stdout.on("data", (data: Buffer) => {
      stdout += data.toString();
    });

    py.stderr.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    py.on("close", (code: number) => {
      if (code !== 0) {
        reject(new Error(`Python process exited with code ${code}: ${stderr}`));
      } else {
        resolve(stdout);
      }
    });

    py.on("error", (err: Error) => {
      reject(err);
    });

    // Send input
    py.stdin.write(JSON.stringify({ architecture, openai_key: openai_key || "" }));
    py.stdin.end();
  }).catch((err) => {
    return JSON.stringify({ error: err.message });
  });

  try {
    const parsed = JSON.parse(result as string);
    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({ error: "Failed to parse simulation output", raw: result }, { status: 500 });
  }
}
