# API de alunos, disciplinas e matrículas — testes E2E

Projeto didático com API Express e TypeScript, banco PostgreSQL e interface web. Permite cadastrar alunos e disciplinas e registrar matrículas. A interface **Laboratório REST** permite selecionar operações, editar caminhos e corpos JSON e observar respostas HTTP.

A suíte de testes de ponta a ponta (E2E) usa **Playwright Test com TypeScript** para automatizar essa interface em um navegador Chromium real.

A pasta **`atividade/`** contém um segundo frontend, em HTML, CSS e JavaScript, dedicado ao cadastro de alunos pelos campos `ra` e `name`. Essa interface utiliza a mesma API e serve de base para os alunos desenvolverem seus próprios testes E2E.

## O que os testes verificam

Os cenários que enviam requisições exercitam o caminho completo: navegador, interface web, Nginx, API Express e PostgreSQL. A suíte também verifica comportamentos locais da interface, como a preparação da requisição e o bloqueio de JSON inválido antes do envio.

```text
Playwright → navegador → interface web → Nginx → API Express → PostgreSQL
```

Nos cenários que enviam requisições, os testes selecionam operações, preenchem campos e clicam em “Enviar requisição”. Depois verificam o status, os headers e o corpo apresentados na página, comparando o JSON exibido com a resposta HTTP recebida. A API e o banco são reais, sem mocks.

A suíte contém **13 cenários**:

| Grupo | Casos | Verificações |
| --- | --- | --- |
| Cadastro pela interface | 1 | Seleção, preenchimento e clique via `send()`; status 201 e objeto do aluno no corpo da resposta. |
| Preparação da requisição | 1 | Seleção da operação, método, caminho, habilitação do corpo e prévia do JSON. |
| Listagens | 3 | Dados iniciais de alunos, disciplinas e matrículas. |
| Buscas | 3 | Consulta de um registro inicial de cada recurso. |
| Fluxo completo | 1 | Criação de aluno e disciplina, matrícula e consulta dos registros após recarregar a página. |
| Erros HTTP | 3 | Apresentação dos erros 400, 404 e 409 e de seu contrato JSON. |
| Validação local | 1 | JSON inválido não gera requisição; após a correção, o cadastro funciona. |

No fluxo completo, o teste usa o ID da disciplina retornado pela API para registrar a matrícula. A consulta após recarregar a página verifica que os dados continuam disponíveis no servidor.

## Executar os testes E2E

Requisitos:

- Node.js 24 e npm.
- Docker em execução, com contêineres Linux.
- Docker Compose com suporte a `up --wait`.
- Porta local `18080` disponível.

Na **raiz do projeto**, instale as dependências e o navegador:

```powershell
npm ci
npx playwright install chromium
```

Depois execute:

```powershell
npm run test:e2e
```

Não é necessário iniciar a aplicação manualmente. O comando:

1. Remove contêineres remanescentes do projeto Docker exclusivo `aula4-e2e`.
2. Constrói e inicia banco, API e frontend usando `compose.e2e.yml`.
3. Aguarda os healthchecks, incluindo o acesso à API pelo Nginx.
4. Executa os testes em sequência no Chromium.
5. Salva os logs dos serviços e encerra os contêineres, inclusive quando os testes falham.

Uma execução bem-sucedida apresenta `13 passed`. A instalação do navegador e a primeira construção das imagens podem levar mais tempo.

### Isolamento e dados

O ambiente E2E usa o banco `aula4_e2e`, com armazenamento temporário e sem publicar a porta do PostgreSQL. As tabelas são criadas por `database/init.sql`, e os dados iniciais vêm de `database/seed.sql`.

Antes de cada cenário, a fixture em `e2e/support.ts` executa `TRUNCATE` com reinício das sequências e reaplica o seed **somente no banco do projeto Docker E2E**. Cada caso começa com os mesmos dados e pode executar independentemente dos anteriores.

O Compose E2E define suas próprias credenciais e portas dos serviços. Não depende dos valores do `.env` e não monta o volume `aula4_database_data` da demonstração. Os dados temporários são descartados ao remover os contêineres.

A configuração usa um worker, sem paralelismo e sem novas tentativas automáticas. Reserve o nome `aula4-e2e` e a porta `18080` para os testes; não execute duas suítes simultaneamente.

### Comandos úteis

Execute na raiz:

| Comando | Finalidade |
| --- | --- |
| `npm run test:e2e` | Preparar o ambiente, executar a suíte e encerrar os contêineres. |
| `npm run test:e2e -- --headed` | Executar com a janela do navegador visível. |
| `npm run test:e2e -- --grep "matricula"` | Executar os cenários cujos títulos correspondam ao filtro. |
| `npm run test:e2e:list` | Listar os cenários sem iniciar o Docker ou executar os testes. |
| `npm run test:e2e:typecheck` | Verificar os tipos dos testes e da configuração. |
| `npm run test:e2e:report` | Abrir o relatório HTML da última execução. |

### Relatórios e diagnóstico

Execute `npm run test:e2e:report` e acesse o endereço informado no terminal.
O servidor escolhe automaticamente uma porta disponível em `127.0.0.1`.
Mantenha o terminal aberto enquanto consulta o relatório e pressione **Ctrl+C**
ao terminar para encerrar o servidor. O comando de
listagem usa apenas saída de texto e preserva o HTML da última execução.

| Local | Conteúdo |
| --- | --- |
| `playwright-report/index.html` | Relatório HTML com os resultados por cenário. |
| `test-results/` | Capturas de tela e traces preservados quando há falhas. |
| `test-results/.last-run.json` | Estado da última execução e identificação dos testes que falharam. |
| `e2e-artifacts/compose.log` | Logs do banco, da API e do frontend. |

Essas pastas são geradas automaticamente e estão no `.gitignore`. Podem ser
apagadas quando seus resultados não forem mais necessários; serão recriadas
nas próximas execuções que produzirem esses arquivos. Excluir `playwright-report/`
remove o relatório disponível para consulta até executar os testes novamente.

O Playwright cria `test-results/`; o script `e2e/run.cjs` cria `e2e-artifacts/`
para salvar os logs antes de encerrar os contêineres. Em uma execução sem falhas,
é normal que `test-results/` contenha apenas `.last-run.json`, pois a configuração
preserva capturas e traces somente nas falhas.

O trace permite investigar as ações do navegador, as requisições e o estado da página. Para abrir um arquivo produzido por uma falha:

```powershell
npx playwright show-trace "caminho/para/trace.zip"
```

Se o processo for interrompido à força e os contêineres permanecerem ativos, encerre o ambiente com:

```powershell
docker compose -f compose.e2e.yml -p aula4-e2e down --remove-orphans
```

## Organização da suíte

A pasta `e2e/` reúne o código dos testes e sua infraestrutura. Ela fica na raiz
porque os cenários verificam frontend, API e banco em conjunto. Essa localização
é uma escolha de organização do projeto; a descoberta dos testes é definida por
`testDir: './e2e'` em `playwright.config.ts`.

| Arquivo | Responsabilidade |
| --- | --- |
| `e2e/laboratorio.spec.ts` | Cenários executados pelo navegador. |
| `e2e/support.ts` | Restauração do banco e auxiliar para envio pela interface. |
| `e2e/run.cjs` | Inicialização do ambiente, execução, logs e encerramento. |
| `e2e/tsconfig.json` | Verificação de tipos dos testes. |
| `playwright.config.ts` | Chromium, execução sequencial, capturas e relatórios. |
| `compose.e2e.yml` | Banco, API e frontend exclusivos dos testes. |
| `package.json` e `package-lock.json` da raiz | Comandos e dependências E2E. |

### Como ampliar os testes

Adicione cenários em `e2e/laboratorio.spec.ts` ou em novos arquivos `*.spec.ts` dentro de `e2e/`. Importe `test` e `expect` de `./support` para utilizar a restauração automática do banco. O auxiliar `send()` seleciona uma operação, envia a requisição pela tela e verifica sua resposta.

Use `getByTestId()` com os atributos `data-testid` e os valores fixos das operações documentados em [front/README.md](front/README.md). Prepare os dados necessários no próprio cenário e use os IDs retornados pela API. Aguarde respostas e condições da página, sem pausas fixas.

A cobertura atual se concentra nos fluxos do Laboratório REST. Não inclui testes de carga, concorrência, outros navegadores ou todas as combinações possíveis de validação da API. A referência operacional da suíte está em [e2e/README.md](e2e/README.md).

## Executar a aplicação manualmente

Na raiz, copie `.env.example` para `.env`, caso ainda não exista, e execute:

```powershell
docker compose up -d --build
```

Com as portas do arquivo de exemplo:

- Laboratório REST (`front/`): http://localhost:8080
- Cadastro de alunos (`atividade/`): http://localhost:8081
- API de alunos: http://localhost:3002/api/students
- PostgreSQL: localhost:5433

O banco aplica os scripts de `database/` na primeira inicialização de um diretório de dados vazio e mantém os dados no volume `aula4_database_data`. Para encerrar a aplicação, execute `docker compose down`.

## Frontend da atividade de testes E2E

A interface em `atividade/` carrega a lista de alunos ao abrir a página. O formulário envia o RA e o nome para `POST /api/students` e, após um cadastro bem-sucedido, limpa os campos e atualiza a lista por `GET /api/students`, sem recarregar a página. A tela também apresenta validações e mensagens de sucesso, erro e lista vazia.

Para iniciar apenas esse frontend e suas dependências, execute na raiz:

```powershell
docker compose up --build -d atividade
```

Acesse http://localhost:8081, conforme a variável `ATIVIDADE_PORT_HOST` do `.env`. O Nginx encaminha as chamadas `/api` ao servidor. Os dois frontends compartilham a mesma API e o mesmo banco no ambiente manual.

A proposta é implementar testes para listagem inicial, cadastro com atualização da tabela, persistência após recarregar a página, campos inválidos, RA duplicado e falhas da API. A página oferece labels acessíveis e atributos `data-testid` para localizar os elementos.

A suíte existente em `e2e/` e o ambiente `compose.e2e.yml` continuam destinados ao Laboratório REST. Para testar a nova interface, prepare uma configuração e um ambiente com banco isolado para a atividade. Consulte [atividade/README.md](atividade/README.md) para os comportamentos esperados e os seletores disponíveis.

## Desenvolvimento da API

Na pasta `server`, execute:

```powershell
npm ci
npm run typecheck
npm run build
```

Para executar a API localmente, ajuste as variáveis `DB_*` do `.env` para apontar a um PostgreSQL acessível pela máquina. Com o banco do Compose, use `DB_HOST=127.0.0.1` e `DB_PORT=5433`. Execute `npm run dev` para desenvolvimento ou `npm start` após compilar.

As dependências da raiz são destinadas aos testes E2E; as dependências em `server/` pertencem à API.
