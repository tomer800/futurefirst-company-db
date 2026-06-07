import sqlite3
import numpy as np
import os
import pickle
import re
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from database import DB_PATH

INDEX_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "search_index.pkl")

SYNONYMS = {
    "insurance": "insurance underwriting claims fintech regulated",
    "bank": "banking financial services fintech regulated",
    "banking": "banking financial services fintech regulated",
    "healthcare": "healthcare health medical clinical hospital",
    "hospital": "healthcare health medical clinical hospital",
    "medical": "healthcare health medical clinical hospital",
    "legal": "legal legaltech compliance regulatory",
    "lawyer": "legal legaltech compliance regulatory",
    "law": "legal legaltech compliance regulatory",
    "security": "cybersecurity security threat detection",
    "cyber": "cybersecurity security threat detection attack",
    "cloud": "cloud infrastructure devops deployment",
    "data": "data infrastructure pipeline analytics",
    "ai": "artificial intelligence machine learning",
    "automation": "automation workflow agentic automated",
    "compliance": "compliance regulatory regulatory fintech",
    "fintech": "fintech financial payments banking",
    "climate": "climate energy sustainability green",
    "agriculture": "agriculture food farming agritech",
    "real estate": "real estate construction proptech",
    "logistics": "logistics supply chain mobility transportation",
    "education": "education edtech learning",
    "government": "government govtech public sector",
    "defense": "defense aerospace military dual-use",
    "drug": "pharma biotech life sciences drug discovery",
    "biotech": "biotech pharma life sciences drug discovery",
    "saas": "saas software enterprise b2b",
    "enterprise": "enterprise software b2b saas",
    "developer": "developer tools infrastructure devops api",
    "llm": "llm language model ai infrastructure generative",
    "generative": "generative ai llm language model",
    "agentic": "agentic agent autonomous ai workflow",
    "vertical": "vertical ai industry-specific enterprise",
}

def expand_query(query: str) -> str:
    q = query.lower()
    extras = []
    for keyword, expansion in SYNONYMS.items():
        if keyword in q:
            extras.append(expansion)
    if extras:
        return query + " " + " ".join(extras)
    return query


def build_text(row):
    name = row.get("name", "") or ""
    blurb = row.get("blurb", "") or ""
    domain = row.get("vc_domain", "") or ""
    subdomain = row.get("vc_subdomain", "") or ""
    verticals = row.get("verticals", "") or ""
    investors = row.get("investors", "") or ""
    ceo = row.get("ceo", "") or ""
    # Weight important fields by repeating them
    return " ".join([
        name, name, name,
        domain, domain,
        subdomain, subdomain,
        blurb,
        verticals,
        investors,
        ceo,
    ])


def build_index():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    rows = conn.execute("SELECT * FROM companies").fetchall()
    conn.close()

    records = [dict(r) for r in rows]
    ids = [r["id"] for r in records]
    texts = [build_text(r) for r in records]

    vectorizer = TfidfVectorizer(
        ngram_range=(1, 3),
        max_features=30000,
        sublinear_tf=True,
        min_df=1,
        analyzer="word",
    )
    matrix = vectorizer.fit_transform(texts)

    with open(INDEX_PATH, "wb") as f:
        pickle.dump({"vectorizer": vectorizer, "matrix": matrix, "ids": ids}, f)

    print(f"Search index built: {len(ids)} documents")
    return vectorizer, matrix, ids


def load_index():
    if not os.path.exists(INDEX_PATH):
        return build_index()
    with open(INDEX_PATH, "rb") as f:
        data = pickle.load(f)
    return data["vectorizer"], data["matrix"], data["ids"]


_vectorizer = None
_matrix = None
_ids = None


def _ensure_loaded():
    global _vectorizer, _matrix, _ids
    if _vectorizer is None:
        _vectorizer, _matrix, _ids = load_index()


def search(query: str, top_k: int = 50, domain: str = None, year_min: int = None, year_max: int = None, round_type: str = None):
    _ensure_loaded()

    expanded = expand_query(query)
    query_vec = _vectorizer.transform([expanded])
    scores = cosine_similarity(query_vec, _matrix).flatten()
    ranked = np.argsort(scores)[::-1]

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row

    results = []
    for idx in ranked:
        if len(results) >= top_k:
            break
        score = float(scores[idx])
        if score < 0.005:
            break
        company_id = _ids[idx]
        row = conn.execute("SELECT * FROM companies WHERE id = ?", [company_id]).fetchone()
        if not row:
            continue
        r = dict(row)

        if domain and r.get("vc_domain") != domain:
            continue
        if year_min and (r.get("year") is None or r["year"] < year_min):
            continue
        if year_max and (r.get("year") is None or r["year"] > year_max):
            continue
        if round_type and r.get("round_type") != round_type:
            continue

        r["_score"] = round(score, 4)
        results.append(r)

    conn.close()
    return results


def rebuild():
    global _vectorizer, _matrix, _ids
    _vectorizer, _matrix, _ids = build_index()
