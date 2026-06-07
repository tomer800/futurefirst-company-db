"""
Founder LinkedIn Auto-Enrichment
Searches for founder LinkedIn profiles via DuckDuckGo, parses snippets,
classifies founder type and stores results.
"""
import sqlite3
import asyncio
import re
from datetime import datetime
from database import DB_PATH

ELITE_UNITS = [
    "8200", "unit 8200", "mamram", "ofek", "talpiot", "matzov",
    "lotem", "aman", "shin bet", "mossad", "elite", "intelligence corps",
    "cyber unit", "idf", "sayeret",
]

SERIAL_SIGNALS = [
    "acquired by", "acquisition", "acquired for", "exit", "ipo",
    "went public", "sold to", "merged with", "co-founder of",
    "previously founded", "serial entrepreneur", "second company",
    "third company", "$", "million", "billion",
]

SECOND_TIME_SIGNALS = [
    "former", "previously", "ex-", "prior", "co-founded",
    "founded", "cto at", "ceo at", "vp at", "director at",
]

TOP_UNIVERSITIES = [
    "technion", "tel aviv university", "hebrew university", "weizmann",
    "idc", "reichman", "mit", "stanford", "harvard", "oxford",
    "cambridge", "princeton", "cmu", "berkeley",
]


def init_enrichment_db():
    conn = sqlite3.connect(DB_PATH)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS founder_enrichment (
            company_id INTEGER PRIMARY KEY,
            ceo_name TEXT,
            linkedin_url TEXT,
            snippet TEXT,
            founder_type TEXT,
            past_companies TEXT,
            education TEXT,
            elite_unit INTEGER DEFAULT 0,
            enriched_at TEXT
        )
    """)
    conn.commit()
    conn.close()


def get_cached(company_id: int):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    row = conn.execute(
        "SELECT * FROM founder_enrichment WHERE company_id = ?", [company_id]
    ).fetchone()
    conn.close()
    return dict(row) if row else None


def save_enrichment(company_id: int, ceo_name: str, data: dict):
    conn = sqlite3.connect(DB_PATH)
    conn.execute("""
        INSERT OR REPLACE INTO founder_enrichment
        (company_id, ceo_name, linkedin_url, snippet, founder_type,
         past_companies, education, elite_unit, enriched_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, [
        company_id, ceo_name,
        data.get("linkedin_url", ""),
        data.get("snippet", ""),
        data.get("founder_type", "unknown"),
        data.get("past_companies", ""),
        data.get("education", ""),
        1 if data.get("elite_unit") else 0,
        datetime.utcnow().isoformat(),
    ])
    conn.commit()
    conn.close()


def parse_snippet(snippet: str, ceo_name: str, company_name: str) -> dict:
    if not snippet:
        return {"founder_type": "unknown", "past_companies": "", "education": "", "elite_unit": False}

    text = snippet.lower()

    # Elite unit detection
    elite_unit = any(unit in text for unit in ELITE_UNITS)

    # Education detection
    education = ""
    for uni in TOP_UNIVERSITIES:
        if uni in text:
            education = uni.title()
            break

    # Past companies — extract capitalized multi-word phrases that look like companies
    past_companies = []
    # Look for "at [Company]", "from [Company]", "former [role] at [Company]"
    patterns = [
        r'(?:at|from|former\w*\s+\w+\s+at)\s+([A-Z][A-Za-z0-9\s&]{2,25}?)(?:\s*[,.\|]|$)',
        r'([A-Z][A-Za-z0-9]{2,20})\s+(?:acquired|merged|ipo)',
    ]
    for pat in patterns:
        matches = re.findall(pat, snippet)
        for m in matches:
            m = m.strip()
            if m and m.lower() not in [company_name.lower(), ceo_name.lower(), "linkedin", "israel"]:
                past_companies.append(m)

    past_companies = list(dict.fromkeys(past_companies))[:4]

    # Founder type classification
    has_serial = any(sig in text for sig in SERIAL_SIGNALS)
    has_second = any(sig in text for sig in SECOND_TIME_SIGNALS)

    if has_serial:
        founder_type = "serial"
    elif has_second:
        founder_type = "second-time"
    else:
        founder_type = "first-time"

    return {
        "founder_type": founder_type,
        "past_companies": ", ".join(past_companies),
        "education": education,
        "elite_unit": elite_unit,
    }


async def enrich_founder(company_id: int, ceo_name: str, company_name: str, force: bool = False) -> dict:
    if not force:
        cached = get_cached(company_id)
        if cached:
            return cached

    if not ceo_name:
        return {"error": "No CEO name available"}

    try:
        from ddgs import DDGS

        # Search 1: LinkedIn profile
        query = f'"{ceo_name}" {company_name} site:linkedin.com/in'
        results = list(DDGS().text(query, max_results=3))
        linkedin_url = ""
        snippet = ""

        for r in results:
            if "linkedin.com/in/" in r.get("href", ""):
                linkedin_url = r["href"]
                snippet = r.get("body", "")
                break

        # Search 2: General founder background if no LinkedIn found
        if not snippet:
            query2 = f'"{ceo_name}" founder "{company_name}" Israel startup'
            results2 = list(DDGS().text(query2, max_results=3))
            if results2:
                snippet = results2[0].get("body", "")

        parsed = parse_snippet(snippet, ceo_name, company_name)
        data = {
            "linkedin_url": linkedin_url,
            "snippet": snippet[:500],
            **parsed,
        }

        save_enrichment(company_id, ceo_name, data)
        return {**data, "company_id": company_id, "ceo_name": ceo_name}

    except Exception as e:
        return {"error": str(e), "ceo_name": ceo_name}


def get_all_enrichments():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    rows = conn.execute("SELECT * FROM founder_enrichment").fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_enrichment_stats():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    total = conn.execute("SELECT COUNT(*) FROM founder_enrichment").fetchone()[0]
    by_type = conn.execute(
        "SELECT founder_type, COUNT(*) as count FROM founder_enrichment GROUP BY founder_type"
    ).fetchall()
    elite = conn.execute(
        "SELECT COUNT(*) FROM founder_enrichment WHERE elite_unit = 1"
    ).fetchone()[0]
    conn.close()
    return {
        "total_enriched": total,
        "by_type": [dict(r) for r in by_type],
        "elite_units": elite,
    }


# Initialize table on import
init_enrichment_db()
