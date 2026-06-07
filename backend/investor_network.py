"""
Investor Network Graph — builds nodes and edges from co-investment data.
"""
import sqlite3
from collections import Counter, defaultdict
from database import DB_PATH

DOMAIN_COLORS = {
    "AI Infrastructure & Developer Tools": "#3b82f6",
    "AI Infrastructure": "#3b82f6",
    "Enterprise Software & AI": "#8b5cf6",
    "Enterprise Software": "#8b5cf6",
    "Healthcare & Life Sciences": "#10b981",
    "FinTech": "#f59e0b",
    "Cybersecurity": "#ef4444",
    "LegalTech": "#818cf8",
    "GovTech": "#4ade80",
    "Cloud Infrastructure & DevOps": "#06b6d4",
    "Commerce & Retail": "#f97316",
    "Climate & Energy": "#22c55e",
    "Agriculture & Food": "#84cc16",
    "Industrial & Manufacturing": "#64748b",
    "Mobility & Logistics": "#0ea5e9",
    "Construction & Real Estate": "#a78bfa",
    "Defense, Aerospace & Dual-Use": "#94a3b8",
    "Education": "#fbbf24",
    "Consumer, Media & Entertainment": "#ec4899",
    "BioTech": "#34d399",
    "DeepTech": "#60a5fa",
    "Other": "#6b7280",
}


def build_network(min_deals: int = 2, min_edge_weight: int = 2, domain_filter: str = None):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    rows = conn.execute(
        "SELECT id, name, investors, vc_domain FROM companies WHERE investors != ''"
    ).fetchall()
    conn.close()

    investor_deals = Counter()
    investor_domains = defaultdict(Counter)
    investor_companies = defaultdict(list)
    co_investments = Counter()

    for row in rows:
        investors = [i.strip() for i in row["investors"].split(",") if i.strip() and len(i.strip()) > 1]
        domain = row["vc_domain"] or "Other"

        if domain_filter and domain != domain_filter:
            # Still track for co-investment but don't count toward domain filter
            pass

        for inv in investors:
            investor_deals[inv] += 1
            investor_domains[inv][domain] += 1
            investor_companies[inv].append({
                "id": row["id"],
                "name": row["name"],
                "domain": domain,
            })

        for i in range(len(investors)):
            for j in range(i + 1, len(investors)):
                pair = tuple(sorted([investors[i], investors[j]]))
                co_investments[pair] += 1

    # Filter investors by min_deals
    active = {inv for inv, count in investor_deals.items() if count >= min_deals}

    # Apply domain filter if set
    if domain_filter:
        active = {
            inv for inv in active
            if investor_domains[inv].get(domain_filter, 0) > 0
        }

    # Build nodes
    nodes = []
    for inv in active:
        top_domain = investor_domains[inv].most_common(1)[0][0]
        nodes.append({
            "id": inv,
            "deals": investor_deals[inv],
            "primary_domain": top_domain,
            "color": DOMAIN_COLORS.get(top_domain, "#6b7280"),
            "domains": dict(investor_domains[inv]),
            "companies": investor_companies[inv][:20],
        })

    # Sort by deals descending
    nodes.sort(key=lambda x: x["deals"], reverse=True)

    # Build edges (only between active investors)
    edges = []
    for (a, b), weight in co_investments.items():
        if a in active and b in active and weight >= min_edge_weight:
            edges.append({
                "source": a,
                "target": b,
                "weight": weight,
            })

    return {
        "nodes": nodes,
        "edges": edges,
        "stats": {
            "total_investors": len(nodes),
            "total_edges": len(edges),
            "total_deals_tracked": len(rows),
        }
    }
