import { test, expect, send } from "./support";

test("cadastra um aluno pela interface", async ({ page }) => {
  const student = { ra: 900003, name: "Mariana" };
  expect(await send(page, "students-create", 201, { body: student })).toEqual(
    student,
  );
});

test("seleciona operações e prepara a requisição", async ({ page }) => {
  await expect(page.getByTestId("page-title")).toBeVisible();
  await expect(page.getByTestId("status")).toHaveAttribute(
    "data-state",
    "idle",
  );
  await expect(page.getByTestId("body")).toBeDisabled();
  await page.getByTestId("example").selectOption("students-create");
  await expect(page.getByTestId("method")).toHaveValue("POST");
  await expect(page.getByTestId("path")).toHaveValue("/api/students");
  await page.getByTestId("body").fill('{"ra":900001,"name":"Aluno E2E"}');
  const preview = page.getByTestId("request-preview");
  await expect(preview).toContainText(
    "POST http://127.0.0.1:18080/api/students",
  );
  await expect(preview).toContainText("Content-Type: application/json");
  await expect(preview).toContainText("Aluno E2E");
});

for (const scenario of [
  {
    operation: "students-list",
    size: 3,
    item: { ra: 258001, name: "Ana Clara Silva" },
  },
  {
    operation: "courses-list",
    size: 39,
    item: { id: 13, name: "Desenvolvimento Web III" },
  },
  {
    operation: "enrollments-list",
    size: 22,
    item: { studentRa: 258001, courseId: 1 },
  },
]) {
  test(`lista dados iniciais: ${scenario.operation}`, async ({ page }) => {
    const body = await send(page, scenario.operation, 200);
    expect(body).toHaveLength(scenario.size);
    expect(body).toEqual(
      expect.arrayContaining([expect.objectContaining(scenario.item)]),
    );
  });
}

for (const scenario of [
  { operation: "students-get", item: { ra: 258001, name: "Ana Clara Silva" } },
  {
    operation: "courses-get",
    item: { id: 13, name: "Desenvolvimento Web III" },
  },
  { operation: "enrollments-get", item: { studentRa: 258001, courseId: 1 } },
]) {
  test(`busca registro inicial: ${scenario.operation}`, async ({ page }) => {
    expect(await send(page, scenario.operation, 200)).toMatchObject(
      scenario.item,
    );
  });
}

test("cadastra aluno e disciplina, matricula e consulta após recarregar", async ({
  page,
}) => {
  const student = { ra: 900001, name: "Aluno E2E" };
  expect(await send(page, "students-create", 201, { body: student })).toEqual(
    student,
  );
  const course = await send(page, "courses-create", 201, {
    body: { name: "Disciplina E2E" },
  });
  expect(course).toEqual({ id: expect.any(Number), name: "Disciplina E2E" });
  const keys = { studentRa: student.ra, courseId: course.id };
  const enrollment = await send(page, "enrollments-create", 201, {
    body: keys,
  });
  expect(enrollment).toMatchObject(keys);
  expect(Number.isNaN(Date.parse(enrollment.enrolledAt))).toBe(false);
  await page.reload();
  expect(
    await send(page, "students-get", 200, {
      path: `/api/students/${student.ra}`,
    }),
  ).toEqual(student);
  expect(
    await send(page, "courses-get", 200, { path: `/api/courses/${course.id}` }),
  ).toEqual(course);
  expect(
    await send(page, "enrollments-get", 200, {
      path: `/api/enrollments/student/${student.ra}/course/${course.id}`,
    }),
  ).toEqual(enrollment);
});

for (const status of [400, 404, 409]) {
  test(`apresenta erro HTTP ${status}`, async ({ page }) => {
    const body = await send(page, `error-${status}`, status);
    expect(body).toMatchObject({
      statusCode: status,
      message: expect.any(String),
      error: expect.any(String),
    });
  });
}

test("bloqueia JSON inválido e permite corrigir e reenviar", async ({
  page,
}) => {
  const requests: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.startsWith("/api/"))
      requests.push(request.url());
  });
  await page.getByTestId("example").selectOption("students-create");
  await page.getByTestId("body").fill("{");
  await page.getByTestId("send").click();
  await expect(page.getByTestId("status")).toHaveAttribute(
    "data-state",
    "validation-error",
  );
  await expect(page.getByTestId("status")).toHaveText("Requisição não enviada");
  expect(requests).toHaveLength(0);
  await expect(page.getByTestId("send")).toBeEnabled();
  const student = { ra: 900002, name: "JSON corrigido" };
  expect(await send(page, "students-create", 201, { body: student })).toEqual(
    student,
  );
});
