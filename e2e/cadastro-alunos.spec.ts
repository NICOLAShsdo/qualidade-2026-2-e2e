
import type { Page } from "@playwright/test";

import {
  test,
  expect,
  resetActivityDatabase,
} from "./banco-isolado.fixture";

// Monitora as requisições de cadastro enviadas à API.
function monitorarCadastros(page: Page) {
  let quantidade = 0;

  page.on("request", (request) => {
    const url = new URL(request.url());

    if (
      request.method() === "POST" &&
      url.pathname === "/api/students"
    ) {
      quantidade++;
    }
  });

  return () => quantidade;
}

// 1. LISTAGEM INICIAL
test("lista os alunos existentes no banco", async ({ page }) => {
  const linhas = page.getByTestId("student-row");

  await expect(linhas).toHaveCount(3);

  await expect(
    linhas.filter({ hasText: "258001" })
  ).toContainText("Ana Clara Silva");

  await expect(
    linhas.filter({ hasText: "258002" })
  ).toContainText("Bruno Henrique Santos");

  await expect(
    linhas.filter({ hasText: "258003" })
  ).toContainText("Camila Oliveira Souza");
});

// 2. CADASTRO VÁLIDO
// 3. ATUALIZAÇÃO DA LISTA
// 4. LIMPEZA DO FORMULÁRIO
// 5. PERSISTÊNCIA
test(
  "cadastra aluno, atualiza a lista, limpa o formulário e mantém o registro",
  async ({ page }) => {
    const ra = page.getByTestId('ra');  
    const nome = page.getByLabel("Nome");
    const linhas = page.getByTestId("student-row");

    const quantidadeAntes = await linhas.count();

    let navegacoes = 0;

    page.on("framenavigated", (frame) => {
      if (frame === page.mainFrame()) {
        navegacoes++;
      }
    });

    const respostaCadastro = page.waitForResponse((response) => {
      const url = new URL(response.url());

      return (
        url.pathname === "/api/students" &&
        response.request().method() === "POST"
      );
    });

    const respostaListagem = page.waitForResponse((response) => {
      const url = new URL(response.url());

      return (
        url.pathname === "/api/students" &&
        response.request().method() === "GET"
      );
    });

    await ra.fill("900101");
    await nome.fill("Aluno Teste Playwright");

    await page.getByRole("button", {
      name: "Cadastrar aluno",
    }).click();

    const cadastro = await respostaCadastro;

    expect(cadastro.status()).toBe(201);

    expect(await cadastro.json()).toEqual({
      ra: 900101,
      name: "Aluno Teste Playwright",
    });

    const listagem = await respostaListagem;

    expect(listagem.status()).toBe(200);

    await expect(
      page.getByTestId("form-message")
    ).toHaveText("Aluno cadastrado com sucesso.");

    await expect(
      page.getByTestId("form-message")
    ).toHaveAttribute("data-state", "success");

    await expect(
      linhas.filter({ hasText: "900101" })
    ).toContainText("Aluno Teste Playwright");

    // A página não pode ser recarregada no cadastro.
    expect(navegacoes).toBe(0);

    await expect(linhas).toHaveCount(quantidadeAntes + 1);

    // Os campos devem ficar vazios.
    await expect(ra).toHaveValue("");
    await expect(nome).toHaveValue("");

    // Verifica persistência após recarregar.
    await page.reload();

    await expect(
      linhas.filter({ hasText: "900101" })
    ).toContainText("Aluno Teste Playwright");
  }
);

// 6. CAMPOS OBRIGATÓRIOS
for (const campo of ["RA", "Nome"] as const) {
  test(
    `impede cadastro quando ${campo} está vazio`,
    async ({ page }) => {
      const quantidadePosts = monitorarCadastros(page);

      if (campo === "RA") {
        await page.getByLabel("Nome").fill("Nome válido");
      } else {
        await page.getByTestId("ra").fill("900102");
      }

      const input =
        campo === "RA"
          ? page.getByTestId("ra")
          : page.getByLabel("Nome");

      await page.getByRole("button", {
        name: "Cadastrar aluno",
      }).click();

      const valorAusente = await input.evaluate((element) => {
        return (element as HTMLInputElement)
          .validity.valueMissing;
      });

      expect(valorAusente).toBe(true);
      expect(quantidadePosts()).toBe(0);
    }
  );
}

// 7. RA INVÁLIDO
const casosRA = [
  {
    descricao: "negativo",
    valor: "-1",
    regra: "rangeUnderflow",
  },
  {
    descricao: "zero",
    valor: "0",
    regra: "rangeUnderflow",
  },
  {
    descricao: "decimal",
    valor: "1.5",
    regra: "stepMismatch",
  },
  {
    descricao: "acima do limite",
    valor: "2147483648",
    regra: "rangeOverflow",
  },
] as const;

for (const caso of casosRA) {
  test(`rejeita RA ${caso.descricao}`, async ({ page }) => {
    const quantidadePosts = monitorarCadastros(page);

    const ra = page.getByTestId('ra');

    await ra.fill(caso.valor);
    await page.getByLabel("Nome").fill("Nome válido");

    await page.getByRole("button", {
      name: "Cadastrar aluno",
    }).click();

    const resultado = await ra.evaluate(
      (element, regra) => {
        const input = element as HTMLInputElement;

        return {
          valido: input.checkValidity(),
          regraAtivada: input.validity[regra],
        };
      },
      caso.regra
    );

    expect(resultado.valido).toBe(false);
    expect(resultado.regraAtivada).toBe(true);
    expect(quantidadePosts()).toBe(0);
  });
}

// 8. NOME INVÁLIDO
test(
  "rejeita nome com menos de três caracteres após retirar espaços",
  async ({ page }) => {
    const quantidadePosts = monitorarCadastros(page);

    const nome = page.getByLabel("Nome");

    await page.getByTestId('ra').fill("900103");
    await nome.fill(" ab ");

    await page.getByRole("button", {
      name: "Cadastrar aluno",
    }).click();

    const resultado = await nome.evaluate((element) => {
      const input = element as HTMLInputElement;

      return {
        valido: input.checkValidity(),
        erroPersonalizado: input.validity.customError,
        mensagem: input.validationMessage,
      };
    });

    expect(resultado.valido).toBe(false);
    expect(resultado.erroPersonalizado).toBe(true);

    expect(resultado.mensagem).toBe(
      "Informe um nome com pelo menos 3 caracteres."
    );

    expect(quantidadePosts()).toBe(0);
  }
);

// 9. RA DUPLICADO
test(
  "rejeita RA duplicado e preserva os campos preenchidos",
  async ({ page }) => {
    const ra = page.getByTestId('ra');
    const nome = page.getByLabel("Nome");

    await ra.fill("258001");
    await nome.fill("Nome duplicado");

    const respostaCadastro = page.waitForResponse((response) => {
      const url = new URL(response.url());

      return (
        url.pathname === "/api/students" &&
        response.request().method() === "POST"
      );
    });

    await page.getByRole("button", {
      name: "Cadastrar aluno",
    }).click();

    const resposta = await respostaCadastro;

    expect(resposta.status()).toBe(409);

    await expect(
      page.getByTestId("form-message")
    ).toContainText(
      "Já existe um estudante com este RA."
    );

    await expect(
      page.getByTestId("form-message")
    ).toHaveAttribute("data-state", "error");

    await expect(ra).toHaveValue("258001");
    await expect(nome).toHaveValue("Nome duplicado");

    await expect(
      page.getByTestId("student-row")
    ).toHaveCount(3);

    await expect(
      page.getByTestId("student-row").filter({
        hasText: "258001",
      })
    ).toContainText("Ana Clara Silva");
  }
);

// 10. LISTA VAZIA
test(
  "exibe mensagem quando não existem alunos cadastrados",
  async ({ page }) => {
    resetActivityDatabase(false);

    await page.reload();

    await expect(
      page.getByTestId("student-row")
    ).toHaveCount(0);

    await expect(
      page.getByTestId("list-message")
    ).toHaveText("Nenhum aluno cadastrado.");

    await expect(
      page.getByTestId("list-message")
    ).toHaveAttribute("data-state", "success");

    await expect(
      page.locator("#students")
    ).toHaveAttribute("aria-busy", "false");
  }
);
