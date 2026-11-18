/* Student Enrollment Form - front-end logic */
const $ = (id) => document.getElementById(id);

const rollNo = $("rollNo");
const otherFields = [$("fullName"), $("class"), $("birthDate"), $("address"), $("enrollmentDate")];
const saveBtn = $("saveBtn"), updateBtn = $("updateBtn"), resetBtn = $("resetBtn");
const msg = $("msg");

function showMsg(text, type) {
  msg.textContent = text || "";
  msg.className = "msg " + (type || "");
}

/* STEP 2: empty form, only Roll-No enabled & focused, everything else disabled */
function resetForm(keepMessage) {
  $("studentForm").reset();
  rollNo.disabled = false;
  otherFields.forEach((f) => (f.disabled = true));
  saveBtn.disabled = updateBtn.disabled = resetBtn.disabled = true;
  if (!keepMessage) showMsg("");
  rollNo.focus();
}

function enableFields() {
  otherFields.forEach((f) => (f.disabled = false));
}

function formData() {
  return {
    roll_no: rollNo.value.trim(),
    full_name: $("fullName").value.trim(),
    class: $("class").value.trim(),
    birth_date: $("birthDate").value,
    address: $("address").value.trim(),
    enrollment_date: $("enrollmentDate").value,
  };
}

/* Validation: no empty fields (+ sensible date checks) */
function validate(d) {
  const labels = { roll_no: "Roll-No", full_name: "Full-Name", class: "Class",
                   birth_date: "Birth-Date", address: "Address", enrollment_date: "Enrollment-Date" };
  const ids = { roll_no: rollNo, full_name: $("fullName"), class: $("class"),
                birth_date: $("birthDate"), address: $("address"), enrollment_date: $("enrollmentDate") };
  for (const k in labels) {
    if (!d[k]) {
      showMsg(`${labels[k]} cannot be empty.`, "err");
      ids[k].focus();
      return false;
    }
  }
  const today = new Date().toISOString().slice(0, 10);
  if (d.birth_date > today) { showMsg("Birth-Date cannot be in the future.", "err"); $("birthDate").focus(); return false; }
  if (d.enrollment_date < d.birth_date) { showMsg("Enrollment-Date cannot be before Birth-Date.", "err"); $("enrollmentDate").focus(); return false; }
  return true;
}

const DB_NAME = "student-enrollment-db";
const STORE_NAME = "students";

function openBrowserDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME, { keyPath: "roll_no" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function browserDB(method, url, body) {
  const db = await openBrowserDB();
  const transaction = db.transaction(STORE_NAME, "readwrite");
  const store = transaction.objectStore(STORE_NAME);

  if (method === "GET") {
    const rollNo = decodeURIComponent(url.split("/").pop());
    const record = await new Promise((resolve, reject) => {
      const request = store.get(rollNo);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return record ? { found: true, student: record } : { found: false };
  }

  if (method === "POST") {
    const existing = await new Promise((resolve, reject) => {
      const request = store.get(body.roll_no);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    if (existing) {
      db.close();
      throw new Error("Roll-No already exists.");
    }
    await new Promise((resolve, reject) => {
      const request = store.add(body);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    db.close();
    return { message: "Student saved successfully." };
  }

  if (method === "PUT") {
    await new Promise((resolve, reject) => {
      const request = store.put(body);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    db.close();
    return { message: "Student updated successfully." };
  }
}

async function api(url, method, body) {
  if (location.hostname.endsWith("github.io") || location.protocol === "file:") {
    return browserDB(method, url, body);
  }

  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

/* STEP 1: primary-key check */
let lookingUp = false;
async function lookupRollNo() {
  if (rollNo.disabled || lookingUp) return;
  const key = rollNo.value.trim();
  if (!key) { showMsg("Roll-No cannot be empty.", "err"); rollNo.focus(); return; }
  lookingUp = true;
  try {
    const data = await api("/api/student/" + encodeURIComponent(key), "GET");
    resetBtn.disabled = false;
    enableFields();
    if (data.found) {                      // record exists -> Update mode
      const s = data.student;
      $("fullName").value = s.full_name;
      $("class").value = s.class;
      $("birthDate").value = s.birth_date;
      $("address").value = s.address;
      $("enrollmentDate").value = s.enrollment_date;
      rollNo.disabled = true;              // primary key locked
      updateBtn.disabled = false;
      saveBtn.disabled = true;
      showMsg("Existing record loaded. Edit and click Update.", "info");
    } else {                               // new record -> Save mode
      saveBtn.disabled = false;
      updateBtn.disabled = true;
      showMsg("New Roll-No. Fill in the details and click Save.", "info");
    }
    $("fullName").focus();
  } catch (e) {
    showMsg(e.message, "err");
  } finally {
    lookingUp = false;
  }
}

rollNo.addEventListener("change", lookupRollNo);
rollNo.addEventListener("keydown", (e) => {
  if (e.key === "Enter") { e.preventDefault(); lookupRollNo(); }
});
$("studentForm").addEventListener("submit", (e) => e.preventDefault());

saveBtn.addEventListener("click", async () => {
  const d = formData();
  if (!validate(d)) return;
  try {
    const r = await api("/api/student", "POST", d);
    resetForm(true); showMsg(r.message, "ok");
  } catch (e) { showMsg(e.message, "err"); }
});

updateBtn.addEventListener("click", async () => {
  const d = formData();
  if (!validate(d)) return;
  try {
    const r = await api("/api/student/" + encodeURIComponent(d.roll_no), "PUT", d);
    resetForm(true); showMsg(r.message, "ok");
  } catch (e) { showMsg(e.message, "err"); }
});

resetBtn.addEventListener("click", () => resetForm());

window.addEventListener("load", () => resetForm());
