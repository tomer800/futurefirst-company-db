import os
import sys
from fastapi import FastAPI, Query, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from dotenv import load_dotenv
from typing import Optional
import search_engine
import database
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
