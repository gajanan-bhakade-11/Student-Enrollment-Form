# Student Enrollment Form – Micro Project

Database: **SCHOOL-DB** (SQLite file `SCHOOL-DB.db`, created automatically)
Relation: **STUDENT-TABLE**  (Roll-No *PK*, Full-Name, Class, Birth-Date, Address, Enrollment-Date)

## Run
Requires Python 3.8+ only (no pip installs).

    python server.py

Open http://localhost:8000 in a browser.

## Behaviour
1. On load / after Save / Update / Reset: empty form, cursor in **Roll-No**; all other fields and all buttons disabled.
2. Enter a Roll-No and press Tab or Enter:
   * **Not in DB** -> [Save] + [Reset] enabled, cursor moves to Full-Name.
   * **In DB**     -> record is displayed, Roll-No locked, [Update] + [Reset] enabled, cursor moves to Full-Name.
3. All fields are validated (no empty values; birth date not in future; enrollment date not before birth date) in both browser and server.
4. [Save] inserts, [Update] modifies, [Reset] clears; each returns to step 1.

## Files
    server.py          Python HTTP server + SQLite database layer
    static/index.html  Form markup
    static/style.css   Styling
    static/script.js   Form state logic, validation, API calls
