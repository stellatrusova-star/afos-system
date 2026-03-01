import { spawn } from "node:child_process";

const PORT = process.env.PORT || "3000";

const child = spawn(
  process.platform === "win32" ? "pnpm.cmd" : "pnpm",
  ["run", "dev", "--", "-p", PORT],
  {
    stdio: "inherit",
    env: { ...process.env, PORT },
  }
);

function shutdown() {
  if (!child.killed) child.kill("SIGTERM");
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
