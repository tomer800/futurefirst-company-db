#!/bin/bash
set -e

PLATFORM_DIR="$(cd "$(dirname "$0")" && pwd)"
EXCEL_PATH="/Users/tomergolan/Downloads/Claude_db_updated.xlsx"

echo ""
echo "  ✦ FutureFirst Company DB — Setup"
echo "  ─────────────────────────────────"
echo ""

# Python deps
echo "→ Installing Python dependencies..."
cd "$PLATFORM_DIR/backend"
pip install -q -r requirements.txt

# Import data
echo "→ Importing company data..."
cd "$PLATFORM_DIR"
python scripts/import_data.py "$EXCEL_PATH"

# Frontend
echo "→ Installing frontend dependencies..."
cd "$PLATFORM_DIR/frontend"
npm install --silent

echo "→ Building frontend..."
npm run build

echo ""
echo "  ✓ Setup complete!"
echo ""
echo "  Run the platform:"
echo "  cd $PLATFORM_DIR/backend && uvicorn main:app --reload"
echo ""
echo "  Then open: http://localhost:8000"
echo ""
