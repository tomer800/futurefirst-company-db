import os
import sys
import asyncio
from fastapi import FastAPI, Query, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from dotenv import load_dotenv
from typing import Optional
import search_engine
import database
import radar as radar_engine
import investor_network
import founder_enrichment as founder_eng
import google_enrichment

load_dotenv()

app = FastAPI(title="FutureFirst Company DB", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

FRONTEND_DIST = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
ASSETS_DIR = os.path.join(os.path.dirname(__file__), "..", "assets")


# ── Company endpoints ──────────────────────────────────────────────────────────

@app.get("/api/companies")
def list_companies(
    domain: Optional[str] = None,
    year_min: Optional[int] = None,
    year_max: Optional[int] = None,
    round_type: Optional[str] = None,
    limit: int = Query(default=50, le=200),
    offset: int = 0,
):
    total, companies = database.get_all_companies(
        domain=domain,
        year_min=year_min,
        year_max=year_max,
        round_type=round_type,
        limit=limit,
        offset=offset,
    )
    return {"total": total, "companies": companies, "limit": limit, "offset": offset}


@app.get("/api/companies/{company_id}")
def get_company(company_id: int):
    company = database.get_company_by_id(company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    return company


@app.patch("/api/companies/{company_id}")
def update_company(company_id: int, payload: dict):
    for field, value in payload.items():
        try:
            database.update_company_field(company_id, field, str(value))
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
    return database.get_company_by_id(company_id)


# ── Search endpoint ────────────────────────────────────────────────────────────

@app.get("/api/search")
def search_companies(
    q: str = Query(..., min_length=1),
    domain: Optional[str] = None,
    year_min: Optional[int] = None,
    year_max: Optional[int] = None,
    round_type: Optional[str] = None,
    limit: int = Query(default=30, le=100),
):
    results = search_engine.search(
        query=q,
        top_k=limit,
        domain=domain,
        year_min=year_min,
        year_max=year_max,
        round_type=round_type,
    )
    return {"query": q, "total": len(results), "companies": results}


# ── Stats & filters ────────────────────────────────────────────────────────────

@app.get("/api/stats")
def get_stats():
    return database.get_stats()


@app.get("/api/stats/extended")
def get_extended_stats():
    import sqlite3
    from collections import Counter, defaultdict
    conn = sqlite3.connect(database.DB_PATH)
    conn.row_factory = sqlite3.Row

    # Domain by year (2023-2026)
    rows = conn.execute("""
        SELECT vc_domain, year, COUNT(*) as count FROM companies
        WHERE year >= 2023 AND year <= 2026 AND vc_domain != ''
        GROUP BY vc_domain, year ORDER BY vc_domain, year
    """).fetchall()
    domain_year = defaultdict(dict)
    for r in rows:
        domain_year[r['vc_domain']][int(r['year'])] = r['count']
    top_domains = sorted(domain_year.keys(), key=lambda d: sum(domain_year[d].values()), reverse=True)[:8]
    domain_growth = [
        {"domain": d, "2023": domain_year[d].get(2023,0), "2024": domain_year[d].get(2024,0),
         "2025": domain_year[d].get(2025,0), "2026": domain_year[d].get(2026,0)}
        for d in top_domains
    ]

    # Top investors
    inv_rows = conn.execute("SELECT investors FROM companies WHERE investors != ''").fetchall()
    counter = Counter()
    for r in inv_rows:
        for inv in r['investors'].split(','):
            inv = inv.strip()
            if inv and len(inv) > 2: counter[inv] += 1
    top_investors = [{"name": inv, "count": count} for inv, count in counter.most_common(12)]

    # Radar distribution
    radar_rows = conn.execute(
        "SELECT radar_label, radar_tier, COUNT(*) as count FROM companies GROUP BY radar_tier ORDER BY radar_tier DESC"
    ).fetchall()
    radar_dist = [dict(r) for r in radar_rows]

    # Stage by year
    stage_rows = conn.execute("""
        SELECT round_type, year, COUNT(*) as count FROM companies
        WHERE year >= 2023 AND year <= 2026 AND round_type != ''
        GROUP BY round_type, year
    """).fetchall()
    stage_map = defaultdict(dict)
    for r in stage_rows:
        stage_map[r['round_type']][int(r['year'])] = r['count']
    key_stages = ['Seed Round','Pre-Seed','Accelerator/lncubator','A','Angel Round','Grant']
    stage_by_year = [
        {"stage": s, "2023": stage_map[s].get(2023,0), "2024": stage_map[s].get(2024,0),
         "2025": stage_map[s].get(2025,0), "2026": stage_map[s].get(2026,0)}
        for s in key_stages if s in stage_map
    ]

    conn.close()
    return {
        "domain_growth": domain_growth,
        "top_investors": top_investors,
        "radar_distribution": radar_dist,
        "stage_by_year": stage_by_year,
    }


@app.get("/api/filters")
def get_filters():
    return database.get_filter_options()


# ── Enrichment endpoints ───────────────────────────────────────────────────────

@app.get("/api/enrich/{company_id}")
async def enrich_company(company_id: int):
    company = database.get_company_by_id(company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    enrichment = await google_enrichment.enrich_company(
        company["name"], company.get("website", "")
    )
    return {"company_id": company_id, "company_name": company["name"], **enrichment}


@app.get("/api/google-search")
async def google_search_endpoint(q: str = Query(...)):
    results = await google_enrichment.google_search(q)
    return {"query": q, "results": results}


# ── Admin endpoints ────────────────────────────────────────────────────────────

@app.get("/api/founder/{company_id}")
async def get_founder_enrichment(company_id: int, force: bool = False):
    company = database.get_company_by_id(company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Not found")
    ceo = company.get("ceo", "")
    if not ceo:
        return {"error": "No CEO name in database", "company_id": company_id}
    result = await founder_eng.enrich_founder(company_id, ceo, company["name"], force=force)
    return result


@app.get("/api/founder/stats/summary")
def founder_stats():
    return founder_eng.get_enrichment_stats()


@app.post("/api/founder/batch")
async def batch_enrich_founders(background_tasks: BackgroundTasks, limit: int = 20):
    conn = database.get_conn()
    rows = conn.execute(
        """SELECT c.id, c.name, c.ceo FROM companies c
           LEFT JOIN founder_enrichment fe ON c.id = fe.company_id
           WHERE c.ceo != '' AND fe.company_id IS NULL
           ORDER BY c.radar_score DESC LIMIT ?""",
        [limit]
    ).fetchall()
    conn.close()
    companies = [dict(r) for r in rows]

    async def run_batch():
        for c in companies:
            await founder_eng.enrich_founder(c["id"], c["ceo"], c["name"])
            await asyncio.sleep(1.5)  # rate limit

    background_tasks.add_task(run_batch)
    return {"status": "started", "queued": len(companies), "message": f"Enriching {len(companies)} founders in background"}


@app.get("/api/investors/network")
def get_investor_network(
    min_deals: int = 2,
    min_edge_weight: int = 2,
    domain: Optional[str] = None,
):
    return investor_network.build_network(
        min_deals=min_deals,
        min_edge_weight=min_edge_weight,
        domain_filter=domain or None,
    )


@app.get("/api/radar")
def get_radar(
    tier: Optional[int] = None,
    limit: int = Query(default=50, le=200),
    offset: int = 0,
):
    conn = database.get_conn()
    where = "WHERE radar_tier IS NOT NULL"
    params = []
    if tier is not None:
        where += " AND radar_tier = ?"
        params.append(tier)
    total = conn.execute(f"SELECT COUNT(*) FROM companies {where}", params).fetchone()[0]
    rows = conn.execute(
        f"SELECT * FROM companies {where} ORDER BY radar_score DESC LIMIT ? OFFSET ?",
        params + [limit, offset]
    ).fetchall()
    conn.close()
    return {"total": total, "companies": [dict(r) for r in rows]}


@app.get("/api/radar/stats")
def get_radar_stats():
    conn = database.get_conn()
    tiers = conn.execute(
        "SELECT radar_tier, radar_label, COUNT(*) as count FROM companies GROUP BY radar_tier ORDER BY radar_tier DESC"
    ).fetchall()
    top = conn.execute(
        "SELECT * FROM companies WHERE radar_tier = 3 ORDER BY radar_score DESC LIMIT 10"
    ).fetchall()
    conn.close()
    return {
        "tiers": [dict(t) for t in tiers],
        "top_matches": [dict(c) for c in top],
    }


@app.get("/api/radar/score/{company_id}")
def score_company(company_id: int):
    company = database.get_company_by_id(company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Not found")
    result = radar_engine.compute_radar_score(company)
    return {"company_id": company_id, "company_name": company["name"], **result}


@app.post("/api/admin/rebuild-index")
def rebuild_search_index():
    search_engine.rebuild()
    return {"status": "Search index rebuilt"}


@app.get("/api/health")
def health():
    return {"status": "ok", "version": "1.0.0"}


# ── Serve frontend ─────────────────────────────────────────────────────────────

if os.path.isdir(FRONTEND_DIST):
    app.mount("/assets-static", StaticFiles(directory=ASSETS_DIR), name="logo-assets")
    app.mount("/", StaticFiles(directory=FRONTEND_DIST, html=True), name="frontend")
else:
    @app.get("/")
    def root():
        return {"message": "FutureFirst DB API. Frontend not built yet. Run: cd frontend && npm install && npm run build"}
