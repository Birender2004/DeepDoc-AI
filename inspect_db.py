import sqlite3

conn = sqlite3.connect("backend/deepdoc.db")

for table in ("knowledge_bases", "documents"):
    print(f"\n--- {table} ---")
    columns = conn.execute(f"PRAGMA table_info({table})").fetchall()
    print("Columns:", [column[1] for column in columns])

    rows = conn.execute(f"SELECT * FROM {table}").fetchall()
    for row in rows:
        print(row)

conn.close()
