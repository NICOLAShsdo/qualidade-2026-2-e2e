const { spawnSync } = require("node:child_process");
const { mkdirSync, writeFileSync } = require("node:fs");
const { resolve } = require("node:path");

process.chdir(resolve(__dirname, ".."));

const compose = ["compose", "-f", "compose.e2e.yml", "-p", "aula4-e2e"];

function docker(args, options = {}) {
  const result = spawnSync("docker", [...compose, ...args], {
    stdio: "inherit",
    ...options,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Docker falhou: ${args.join(" ")}`);
  return result;
}

let exitCode = 1;
let started = false;
try {
  // Projeto exclusivo; nunca utiliza o volume da demonstração.
  docker(["down", "--remove-orphans"]);
  started = true;
  docker(["up", "-d", "--build", "--wait", "--wait-timeout", "180"]);
  const result = spawnSync(
    process.execPath,
    [require.resolve("@playwright/test/cli"), "test", ...process.argv.slice(2)],
    { stdio: "inherit" },
  );
  if (result.error) throw result.error;
  exitCode = result.status ?? 1;
} catch (error) {
  console.error(error.message);
} finally {
  if (started) {
    try {
      mkdirSync("e2e-artifacts", { recursive: true });
      const logs = docker(["logs", "--no-color"], {
        stdio: "pipe",
        encoding: "utf8",
      });
      writeFileSync("e2e-artifacts/compose.log", logs.stdout);
    } catch (error) {
      console.error(error.message);
    }
    try {
      docker(["down", "--remove-orphans"]);
    } catch (error) {
      console.error(error.message);
      exitCode = 1;
    }
  }
}
process.exitCode = exitCode;
