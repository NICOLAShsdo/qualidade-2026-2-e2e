const form = document.getElementById("student-form");
const raInput = document.getElementById("ra");
const nameInput = document.getElementById("name");
const submit = document.getElementById("submit");
const formMessage = document.getElementById("form-message");
const listMessage = document.getElementById("list-message");
const studentsList = document.getElementById("students-list");
const studentsSection = document.getElementById("students");

async function request(options = {}) {
  const response = await fetch("/api/students", {
    ...options,
    signal: AbortSignal.timeout(15000),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Não foi possível concluir a operação.");
  }
  return data;
}

async function loadStudents() {
  studentsSection.setAttribute("aria-busy", "true");
  listMessage.textContent = "Carregando alunos…";
  listMessage.dataset.state = "loading";
  try {
    const students = await request();
    const rows = students.map((student) => {
      const row = document.createElement("tr");
      row.dataset.testid = "student-row";
      for (const value of [student.ra, student.name]) {
        const cell = document.createElement("td");
        cell.textContent = value;
        row.append(cell);
      }
      return row;
    });
    studentsList.replaceChildren(...rows);
    listMessage.textContent = students.length === 0 ? "Nenhum aluno cadastrado." : "";
    listMessage.dataset.state = "success";
  } catch (error) {
    listMessage.textContent = `Não foi possível atualizar a lista de alunos. ${error.message}`;
    listMessage.dataset.state = "error";
  } finally {
    studentsSection.setAttribute("aria-busy", "false");
  }
}

nameInput.addEventListener("input", () => nameInput.setCustomValidity(""));

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (submit.disabled) return;
  const name = nameInput.value.trim();
  nameInput.setCustomValidity(name.length < 3 ? "Informe um nome com pelo menos 3 caracteres." : "");
  if (!form.reportValidity()) return;

  submit.disabled = true;
  form.setAttribute("aria-busy", "true");
  formMessage.textContent = "Cadastrando aluno…";
  formMessage.dataset.state = "loading";
  try {
    await request({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ra: Number(raInput.value), name }),
    });
    form.reset();
    formMessage.textContent = "Aluno cadastrado com sucesso.";
    formMessage.dataset.state = "success";
    await loadStudents();
    raInput.focus();
  } catch (error) {
    formMessage.textContent = `Não foi possível cadastrar o aluno. ${error.message}`;
    formMessage.dataset.state = "error";
  } finally {
    submit.disabled = false;
    form.setAttribute("aria-busy", "false");
  }
});

loadStudents();
