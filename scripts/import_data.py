"""
Run once to import the Excel data into SQLite and build the search index.
Usage: python scripts/import_data.py path/to/Claude_db_updated.xlsx
"""
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

import database
import search_engine

def main():
    excel_path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(
        os.path.dirname(__file__), "..", "..", "..", "Claude_db_updated.xlsx"
    )
    if not os.path.exists(excel_path):
        print(f"Error: Excel file not found at {excel_path}")
        print("Usage: python scripts/import_data.py /path/to/Claude_db_updated.xlsx")
        sys.exit(1)

    print(f"Importing from: {excel_path}")
    database.init_db(excel_path)
    print("Building search index...")
    search_engine.build_index()
    print("Done. Ready to run the platform.")

if __name__ == "__main__":
    main()
