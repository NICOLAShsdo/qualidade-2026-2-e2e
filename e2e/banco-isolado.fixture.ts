
import { test as base, expect } from "@playwright/test";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const projectRoot = resolve(__dirname, "..");

// Executa comandos SQL no banco exclusivo dos testes.
function executeSql(sql: string): void {
  const result = spawnSync(
    "docker",
    [
      "compose",
      "-f",
      "compose.atividade.e2e.yml",
      "-p",
      "atividade-e2e",
      "exec",
      "-T",
      "database",
      "psql",
      "-U",
      "postgres",
      "-d",
      "atividade_e2e",
      "-v",
      "ON_ERROR_STOP=1",
    ],
    {
      cwd: projectRoot,
      encoding: "utf8",
      input: sql,
    }
  );

  if (result.error || result.status !== 0) {
    throw new Error(
      `Falha ao preparar o banco E2E: ${
        result.error?.message ?? result.stderr
      }`
    );
  }
}

// Limpa o banco e, opcionalmente, restaura os dados iniciais.
export function resetActivityDatabase(withSeed = true): void {
  const seed = withSeed
    ? readFileSync(
        resolve(projectRoot, "database/seed.sql"),
        "utf8"
      )
    : "";

  const sql = `
    TRUNCATE enrollments, courses, students
    RESTART IDENTITY CASCADE;
    ${seed}
  `;

  executeSql(sql);
}

// Prepara o banco e abre a interface antes de cada teste.
export const test = base.extend({
  page: async ({ page }, use) => {
    resetActivityDatabase(true);

    // Aguarda a primeira consulta dos alunos.
    const respostaListagem = page.waitForResponse((response) => {
      const url = new URL(response.url());

      return (
        url.pathname === "/api/students" &&
        response.request().method() === "GET"
      );
    });

    await page.goto("/");

    const resposta = await respostaListagem;

    expect(resposta.status()).toBe(200);

    await expect(
      page.getByTestId("student-row")
    ).toHaveCount(3);

    await expect(
      page.locator("#students")
    ).toHaveAttribute("aria-busy", "false");

    await use(page);
  },
});

export { expect };
