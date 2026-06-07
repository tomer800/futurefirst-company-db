import sqlite3
import pandas as pd
import json
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "companies.db")


def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db(excel_path: str):
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    df = pd.read_excel(excel_path)

    df.columns = [
        "name", "ceo", "year", "website", "blurb",
        "round_type", "investors", "verticals", "vc_domain", "vc_subdomain"
    ]

    df["year"] = pd.to_numeric(df["year"], errors="coerce")
    df["investors"] = df["investors"].fillna("")
    df["verticals"] = df["verticals"].fillna("")
    df["ceo"] = df["ceo"].fillna("")
    df["round_type"] = df["round_type"].fillna("")
    df["vc_subdomain"] = df["vc_subdomain"].fillna("")
    df["website"] = df["website"].fillna("")

    # Normalize round type casing
    df["round_type"] = df["round_type"].str.strip()
    df.loc[df["round_type"] == "Early stage VC", "round_type"] = "Early Stage VC"

    # Compute radar scores
    from radar import compute_radar_score
    records = df.to_dict(orient="records")
    df["radar_score"] = [compute_radar_score(r)["score"] for r in records]
    df["radar_label"] = [compute_radar_score(r)["label"] for r in records]
    df["radar_tier"] = [compute_radar_score(r)["tier"] for r in records]

    conn = sqlite3.connect(DB_PATH)
    df.to_sql("companies", conn, if_exists="replace", index=True, index_label="id")
    conn.commit()
    conn.close()
    print(f"Imported {len(df)} companies into {DB_PATH}")


def get_all_companies(
    domain: str = None,
    year_min: int = None,
    year_max: int = None,
    round_type: str = None,
    limit: int = 100,
    offset: int = 0,
):
    conn = get_conn()
    where = []
    params = []

    if domain:
        where.append("vc_domain = ?")
        params.append(domain)
    if year_min:
        where.append("year >= ?")
        params.append(year_min)
    if year_max:
        where.append("year <= ?")
        params.append(year_max)
    if round_type:
        where.append("round_type = ?")
        params.append(round_type)

    where_sql = ("WHERE " + " AND ".join(where)) if where else ""
    total = conn.execute(f"SELECT COUNT(*) FROM companies {where_sql}", params).fetchone()[0]
    rows = conn.execute(
        f"SELECT * FROM companies {where_sql} ORDER BY year DESC, name ASC LIMIT ? OFFSET ?",
        params + [limit, offset],
    ).fetchall()
    conn.close()
    return total, [dict(r) for r in rows]


def get_company_by_id(company_id: int):
    conn = get_conn()
    row = conn.execute("SELECT * FROM companies WHERE id = ?", [company_id]).fetchone()
    conn.close()
    return dict(row) if row else None


def get_stats():
    conn = get_conn()
    total = conn.execute("SELECT COUNT(*) FROM companies").fetchone()[0]
    by_domain = conn.execute(
        "SELECT vc_domain, COUNT(*) as count FROM companies GROUP BY vc_domain ORDER BY count DESC"
    ).fetchall()
    by_year = conn.execute(
        "SELECT year, COUNT(*) as count FROM companies WHERE year IS NOT NULL GROUP BY year ORDER BY year"
    ).fetchall()
    by_round = conn.execute(
        "SELECT round_type, COUNT(*) as count FROM companies WHERE round_type != '' GROUP BY round_type ORDER BY count DESC LIMIT 8"
    ).fetchall()
    conn.close()
    return {
        "total": total,
        "by_domain": [dict(r) for r in by_domain],
        "by_year": [dict(r) for r in by_year],
        "by_round": [dict(r) for r in by_round],
    }


def get_filter_options():
    conn = get_conn()
    domains = [r[0] for r in conn.execute(
        "SELECT DISTINCT vc_domain FROM companies WHERE vc_domain != '' ORDER BY vc_domain"
    ).fetchall()]
    rounds = [r[0] for r in conn.execute(
        "SELECT DISTINCT round_type FROM companies WHERE round_type != '' ORDER BY round_type"
    ).fetchall()]
    years = [int(r[0]) for r in conn.execute(
        "SELECT DISTINCT year FROM companies WHERE year IS NOT NULL ORDER BY year"
    ).fetchall()]
    conn.close()
    return {"domains": domains, "round_types": rounds, "years": years}


def update_company_field(company_id: int, field: str, value: str):
    allowed = {"blurb", "website", "investors", "ceo", "round_type"}
    if field not in allowed:
        raise ValueError(f"Field {field} not updatable")
    conn = get_conn()
    conn.execute(f"UPDATE companies SET {field} = ? WHERE id = ?", [value, company_id])
    conn.commit()
    conn.close()
