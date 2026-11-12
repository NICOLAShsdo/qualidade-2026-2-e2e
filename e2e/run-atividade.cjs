
const { spawnSync } = require("node:child_process");
const { mkdirSync, writeFileSync } = require("node:fs");
const { resolve } = require("node:path");

process.chdir(resolve(__dirname, ".."));

const compose = [
  "compose",
  "-f",
  "compose.atividade.e2e.yml",
  "-p",
  "atividade-e2e",
];

function docker(args, options = {}) {
  const result = spawnSync("docker", [...compose, ...args], {
    stdio: "inherit",
    ...options,
  });

  if (result.error) throw result.error;

  if (result.status !== 0) {
    throw new Error(`Docker falhou: ${args.join(" ")}`);
  }

  return result;
}

let exitCode = 1;
let started = false;

try {
  // Remove contêineres anteriores.
  docker(["down", "--remove-orphans"]);

  started = true;

  // Constrói e inicializa os serviços.
  docker([
    "up",
    "-d",
    "--build",
    "--wait",
    "--wait-timeout",
    "180",
  ]);

  // Executa a suíte específica da atividade.
  const result = spawnSync(
    process.execPath,
    [
      require.resolve("@playwright/test/cli"),
      "test",
      "--config=playwright.atividade.config.ts",
      ...process.argv.slice(2),
    ],
    {
      stdio: "inherit",
    }
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

      writeFileSync(
        "e2e-artifacts/atividade-compose.log",
        logs.stdout
      );

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
