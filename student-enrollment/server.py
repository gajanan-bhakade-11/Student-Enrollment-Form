"""
Student Enrollment - Micro Project
Database : SCHOOL-DB   (SQLite file: SCHOOL-DB.db)
Relation : STUDENT-TABLE
Run      : python server.py   ->  http://localhost:8000
No third-party packages required (Python 3.8+).
"""
import json
import os
import sqlite3
from datetime import date
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import unquote

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_FILE = os.path.join(BASE_DIR, "SCHOOL-DB.db")
STATIC_DIR = os.path.join(BASE_DIR, "static")
PORT = 8000

FIELDS = ["roll_no", "full_name", "class", "birth_date", "address", "enrollment_date"]


def get_conn():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    with get_conn() as conn:
        conn.execute(
            '''CREATE TABLE IF NOT EXISTS "STUDENT-TABLE" (
                   "Roll-No"         TEXT PRIMARY KEY,
                   "Full-Name"       TEXT NOT NULL,
                   "Class"           TEXT NOT NULL,
                   "Birth-Date"      TEXT NOT NULL,
                   "Address"         TEXT NOT NULL,
                   "Enrollment-Date" TEXT NOT NULL
               )'''
        )


def row_to_dict(row):
    return {
        "roll_no": row["Roll-No"],
        "full_name": row["Full-Name"],
        "class": row["Class"],
        "birth_date": row["Birth-Date"],
        "address": row["Address"],
        "enrollment_date": row["Enrollment-Date"],
    }


def validate(data):
    """Server-side validation (mirrors the browser checks). Returns error text or None."""
    for f in FIELDS:
        if not str(data.get(f, "")).strip():
            return f"Field '{f}' must not be empty."
    try:
        bd = date.fromisoformat(data["birth_date"])
        ed = date.fromisoformat(data["enrollment_date"])
    except ValueError:
        return "Dates must be in YYYY-MM-DD format."
    if bd > date.today():
        return "Birth date cannot be in the future."
    if ed < bd:
        return "Enrollment date cannot be before birth date."
    return None


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=STATIC_DIR, **kwargs)

    # ---------- helpers ----------
    def _send_json(self, status, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def _read_json(self):
        length = int(self.headers.get("Content-Length", 0))
        try:
            return json.loads(self.rfile.read(length) or b"{}")
        except json.JSONDecodeError:
            return None

    def _roll_from_path(self):
        prefix = "/api/student/"
        if self.path.startswith(prefix):
            return unquote(self.path[len(prefix):]).strip()
        return None

    # ---------- routes ----------
    def do_GET(self):
        roll = self._roll_from_path()
        if roll is None:
            return super().do_GET()  # static files
        with get_conn() as conn:
            row = conn.execute(
                'SELECT * FROM "STUDENT-TABLE" WHERE "Roll-No" = ?', (roll,)
            ).fetchone()
        if row:
            self._send_json(200, {"found": True, "student": row_to_dict(row)})
        else:
            self._send_json(200, {"found": False})

    def do_POST(self):  # Save (insert)
        if self.path != "/api/student":
            return self._send_json(404, {"error": "Not found"})
        data = self._read_json()
        if data is None:
            return self._send_json(400, {"error": "Invalid JSON"})
        err = validate(data)
        if err:
            return self._send_json(400, {"error": err})
        try:
            with get_conn() as conn:
                conn.execute(
                    'INSERT INTO "STUDENT-TABLE" VALUES (?,?,?,?,?,?)',
                    tuple(data[f].strip() for f in FIELDS),
                )
        except sqlite3.IntegrityError:
            return self._send_json(409, {"error": "Roll-No already exists."})
        self._send_json(201, {"message": "Student saved successfully."})

    def do_PUT(self):  # Update
        roll = self._roll_from_path()
        if not roll:
            return self._send_json(404, {"error": "Not found"})
        data = self._read_json()
        if data is None:
            return self._send_json(400, {"error": "Invalid JSON"})
        data["roll_no"] = roll
        err = validate(data)
        if err:
            return self._send_json(400, {"error": err})
        with get_conn() as conn:
            cur = conn.execute(
                '''UPDATE "STUDENT-TABLE"
                   SET "Full-Name"=?, "Class"=?, "Birth-Date"=?, "Address"=?, "Enrollment-Date"=?
                   WHERE "Roll-No"=?''',
                (data["full_name"].strip(), data["class"].strip(), data["birth_date"],
                 data["address"].strip(), data["enrollment_date"], roll),
            )
        if cur.rowcount == 0:
            return self._send_json(404, {"error": "Roll-No not found."})
        self._send_json(200, {"message": "Student updated successfully."})


if __name__ == "__main__":
    init_db()
    print(f"SCHOOL-DB ready. Open http://localhost:{PORT}")
    ThreadingHTTPServer(("", PORT), Handler).serve_forever()
