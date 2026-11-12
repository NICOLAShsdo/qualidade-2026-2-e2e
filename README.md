
## Frontend da atividade de testes E2E

A interface em `atividade/` carrega a lista de alunos ao abrir a página. O formulário envia o RA e o nome para `POST /api/students` e, após um cadastro bem-sucedido, limpa os campos e atualiza a lista por `GET /api/students`, sem recarregar a página. A tela também apresenta validações e mensagens de sucesso, erro e lista vazia.

Para iniciar apenas esse frontend e suas dependências, execute na raiz:

```powershell
docker compose up --build -d atividade
```

Acesse [http://localhost:8081](http://localhost:8081), conforme a variável `ATIVIDADE_PORT_HOST` do `.env`. O Nginx encaminha as chamadas `/api` ao servidor. Os dois frontends compartilham a mesma API e o mesmo banco no ambiente manual.

A página oferece labels acessíveis e atributos `data-testid` para localizar os elementos.

## Testes E2E da Atividade 2 — Cadastro de alunos

A suíte utiliza Playwright com TypeScript para testar a interface localizada em `atividade/`.

Os testes verificam a integração entre navegador, frontend, API Express e banco PostgreSQL.

### Requisitos

- Node.js 24 e npm.
- Docker Desktop em execução.
- Docker Compose com suporte a `up --wait`.
- Chromium instalado pelo Playwright.

### Preparação

Na raiz do projeto:

```powershell
npm ci
npx playwright install chromium
```

### Executar a atividade

Listar os testes:

```powershell
npm run test:atividade:list
```

Verificar os tipos:

```powershell
npm run test:atividade:typecheck
```

Executar toda a suíte:

```powershell
npm run test:atividade
```

Não é necessário iniciar a aplicação manualmente. O executor constrói e inicia os serviços, aguarda os healthchecks, executa os testes e encerra os contêineres.

### Cenários cobertos

A suíte contém 11 testes automatizados:

1. Listagem inicial dos alunos.
2. Cadastro válido.
3. Atualização da lista sem recarregar a página.
4. Limpeza do formulário após cadastro.
5. Persistência do cadastro após recarregar a página.
6. Validação dos campos obrigatórios (RA e nome).
7. RA negativo, zero, decimal e acima do limite.
8. Nome inválido após trim.
9. RA duplicado.
10. Lista vazia.

Os cenários de cadastro válido verificam conjuntamente a atualização da lista, a limpeza do formulário e a persistência.

### Isolamento e dados

Os testes utilizam o banco exclusivo `atividade_e2e`, com armazenamento temporário.

Antes de cada teste, o banco é limpo e os dados iniciais são restaurados. O teste de lista vazia prepara o banco sem registros.

A API e o banco são reais, sem simulação de respostas.

A configuração utiliza um worker, sem paralelismo e sem novas tentativas automáticas.

### Relatórios e diagnóstico

Para abrir o relatório HTML:

```powershell
npm run test:atividade:report
```

Os logs são salvos em:

`e2e-artifacts/atividade-compose.log`

As capturas de tela e traces são preservados em caso de falhas.

### Arquivos da nova suíte

| Arquivo | Responsabilidade |
| --- | --- |
| `e2e/cadastro-alunos.spec.ts` | Cenários automatizados do cadastro de alunos. |
| `e2e/banco-isolado.fixture.ts` | Preparação e restauração do banco de testes. |
| `e2e/run-atividade.cjs` | Inicialização, execução e encerramento do ambiente. |
| `compose.atividade.e2e.yml` | Banco, API e frontend exclusivos da atividade. |
| `playwright.atividade.config.ts` | Configuração independente do Playwright para a atividade. |

A suíte antiga do Laboratório REST continua utilizando `playwright.config.ts`, `compose.e2e.yml` e seus próprios arquivos de suporte.

## Desenvolvimento da API

Na pasta `server`, execute:

```powershell
npm ci
npm run typecheck
npm run build
```

Para executar a API localmente, ajuste as variáveis `DB_*` do `.env` para apontar a um PostgreSQL acessível pela máquina. Com o banco do Compose, use `DB_HOST=127.0.0.1` e `DB_PORT=5433`. Execute `npm run dev` para desenvolvimento ou `npm start` após compilar.

As dependências da raiz são destinadas aos testes E2E; as dependências em `server/` pertencem à API.