import { spawn } from "node:child_process";
import electronPath from "electron";

const devServerUrl = "http://127.0.0.1:5173";
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

function spawnProcess(command, args, options = {}) {
  return spawn(command, args, {
    stdio: "inherit",
    shell: false,
    ...options,
  });
}

async function waitForDevServer(url) {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      // Vite is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

const viteProcess = spawnProcess(npmCommand, ["run", "dev", "--", "--port", "5173", "--strictPort"]);

let electronProcess;
let shuttingDown = false;

function shutdown(exitCode = 0) {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  electronProcess?.kill();
  viteProcess.kill();
  process.exit(exitCode);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

viteProcess.on("exit", (code) => {
  if (!shuttingDown) {
    shutdown(code ?? 1);
  }
});

try {
  await waitForDevServer(devServerUrl);
  electronProcess = spawnProcess(electronPath, ["."], {
    env: {
      ...process.env,
      VITE_DEV_SERVER_URL: devServerUrl,
    },
  });
  electronProcess.on("exit", (code) => shutdown(code ?? 0));
} catch (error) {
  console.error(error);
  shutdown(1);
}
