import sqlite3
import numpy as np
import os
import pickle
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from database import DB_PATH

INDEX_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "search_index.pkl")


def build_text(row):
    parts = [
        row.get("name", ""),
        row.get("blurb", ""),
        row.get("vc_domain", ""),
        row.get("vc_subdomain", ""),
        row.get("verticals", ""),
        row.get("investors", ""),
        row.get("ceo", ""),
    ]
    return " ".join(p for p in parts if p)


def build_index():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    rows = conn.execute("SELECT * FROM companies").fetchall()
    conn.close()

    records = [dict(r) for r in rows]
    ids = [r["id"] for r in records]
    texts = [build_text(r) for r in records]

    vectorizer = TfidfVectorizer(
        ngram_range=(1, 2),
        max_features=20000,
        sublinear_tf=True,
        min_df=1,
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

    query_vec = _vectorizer.transform([query])
    scores = cosine_similarity(query_vec, _matrix).flatten()
    ranked = np.argsort(scores)[::-1]

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row

    results = []
    for idx in ranked:
        if len(results) >= top_k:
            break
        score = float(scores[idx])
        if score < 0.01:
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
