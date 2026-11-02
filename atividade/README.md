# Atividade: testes e2e do cadastro de alunos

Frontend em HTML, CSS e JavaScript, sem dependências. Utiliza o mesmo servidor e banco do laboratório.

## Executar

Na raiz do projeto:

```sh
docker compose up --build -d atividade
```

Acesse http://localhost:8081. O Compose também inicia o servidor e o banco. Para mudar a porta, defina `ATIVIDADE_PORT_HOST` no `.env`.

Abra a página pelo Compose para que o Nginx encaminhe `/api` ao servidor.

## Comportamento esperado

- Ao abrir a página, a lista é carregada por `GET /api/students`.
- O formulário envia `POST /api/students` com `{ ra: number, name: string }`.
- O RA deve ser um inteiro entre 1 e 2147483647. O nome deve ter de 3 a 100 caracteres, desconsiderando espaços nas extremidades.
- Após cadastrar, o formulário é limpo e a lista é consultada novamente, sem recarregar a página.
- RA duplicado exibe a mensagem retornada pela API e mantém os campos preenchidos.
- A tela informa carregamento, lista vazia e falhas de cadastro ou listagem.

## Proposta de testes

Implemente testes para listagem inicial, cadastro com atualização da tabela, persistência após recarregar a página, campos obrigatórios, limites dos campos, RA duplicado e falhas da API.

Prefira seletores acessíveis como `getByLabel('RA')`, `getByLabel('Nome')` e `getByRole('button', { name: 'Cadastrar aluno' })`. Também estão disponíveis os `data-testid`: `student-form`, `ra`, `name`, `submit`, `form-message`, `list-message`, `students-table`, `students-list` e `student-row`.

As mensagens possuem `data-state` (`loading`, `success` ou `error`). A seção da lista expõe `aria-busy` durante a consulta.

Configure a URL base dos testes para esta aplicação. A suíte existente em `e2e` continua apontando para o laboratório REST. Utilize um banco isolado para os testes, pois os cadastros são persistidos no banco compartilhado com o laboratório.
