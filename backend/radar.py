"""
FutureFirst Deal Radar — thesis-based scoring engine.
Total: 100 pts = Domain (30) + Stage (25) + Keywords (35) + Year (10)
"""

# Financial subdomains — if AI Infra/Enterprise AI has these → max domain score
FINANCIAL_SUBDOMAIN_KEYWORDS = [
    "fintech", "finance", "financial", "bank", "banking", "insurance",
    "tax", "accounting", "audit", "payment", "wealth", "trading",
    "compliance", "regulatory", "lending", "credit", "investment",
]

BASE_DOMAIN_SCORES = {
    "AI Infrastructure & Developer Tools": 25,
    "Enterprise Software & AI": 25,
    "FinTech": 28,
    "Healthcare & Life Sciences": 22,
    "LegalTech": 22,
    "GovTech": 15,
    "Cloud Infrastructure & DevOps": 10,
    "Cybersecurity": 8,
    "DeepTech": 8,
    "BioTech": 8,
    "Commerce & Retail": 5,
    "Education": 5,
    "Industrial & Manufacturing": 5,
    "Mobility & Logistics": 5,
    "Construction & Real Estate": 4,
    "Consumer, Media & Entertainment": 3,
    "Agriculture & Food": 3,
    "Climate & Energy": 3,
    "Defense, Aerospace & Dual-Use": 3,
    "Other": 2,
}

ROUND_SCORES = {
    "Pre-Seed": 25,
    "Seed Round": 25,
    "Angel Round": 20,
    "Angel (individual)": 20,
    "Early Stage VC": 20,
    "early stage vc": 20,
    "Accelerator/lncubator": 15,
    "Grant": 12,
    "Equity Crowdfunding": 8,
    "Joint Venture": 5,
    "A": 5,
    "B": 0,
    "PE Growth/Expansion": 0,
    "Buyout/LBO": 0,
    "Merger/Acquisition": 0,
    "Secondary Transaction - Private": 0,
}

REGULATED_KEYWORDS = [
    "insurance", "banking", "bank", "financial services", "compliance",
    "regulatory", "regulation", "regulated", "clinical", "healthcare",
    "health system", "hospital", "medical", "pharma", "legal", "law firm",
    "tax", "audit", "accounting", "government", "public sector",
    "mission-critical", "enterprise", "underwriting", "claims",
    "fintech", "wealth management", "asset management", "mortgage",
    "lending", "credit risk", "fraud", "aml", "kyc",
]

AI_KEYWORDS = [
    "ai-powered", "ai-driven", "ai-native", "artificial intelligence",
    "machine learning", "large language model", "llm", "generative ai",
    "agentic", "autonomous", "deep learning", "foundation model",
    "nlp", "computer vision", "predictive", "intelligent automation",
]

VERTICAL_AI_KEYWORDS = [
    "vertical ai", "industry-specific", "domain-specific", "specialized ai",
    "workflow automation", "process automation", "data infrastructure",
    "proprietary data", "knowledge graph", "decision intelligence",
    "ai infrastructure", "ai platform", "ai agent", "copilot",
]

ENTERPRISE_KEYWORDS = [
    "enterprise", "b2b", "saas", "platform", "api", "integration",
    "scalable", "secure", "privacy", "gdpr", "hipaa", "soc 2",
    "on-premise", "cloud", "pipeline", "workflow",
]


def score_domain(company: dict) -> int:
    domain = company.get("vc_domain", "") or ""
    subdomain = (company.get("vc_subdomain", "") or "").lower()
    blurb = (company.get("blurb", "") or "").lower()

    base = BASE_DOMAIN_SCORES.get(domain, 2)

    # Boost AI Infra / Enterprise AI to 30 if subdomain/blurb has financial context
    if domain in ("AI Infrastructure & Developer Tools", "Enterprise Software & AI"):
        has_financial = any(kw in subdomain or kw in blurb for kw in FINANCIAL_SUBDOMAIN_KEYWORDS)
        if has_financial:
            return 30

    return base


def score_blurb(blurb: str) -> int:
    if not blurb:
        return 0
    text = blurb.lower()
    score = 0

    regulated_hits = sum(1 for kw in REGULATED_KEYWORDS if kw in text)
    score += min(regulated_hits * 5, 18)

    ai_hits = sum(1 for kw in AI_KEYWORDS if kw in text)
    score += min(ai_hits * 3, 10)

    vertical_hits = sum(1 for kw in VERTICAL_AI_KEYWORDS if kw in text)
    score += min(vertical_hits * 2, 4)

    enterprise_hits = sum(1 for kw in ENTERPRISE_KEYWORDS if kw in text)
    score += min(enterprise_hits * 1, 3)

    return min(score, 35)


def score_year(year) -> int:
    if not year or year != year:
        return 5
    y = int(year)
    if y >= 2024:
        return 10
    if y == 2023:
        return 8
    if y == 2022:
        return 4
    if y == 2021:
        return 2
    return 0


def compute_radar_score(company: dict) -> dict:
    domain_score = score_domain(company)
    round_score = ROUND_SCORES.get(company.get("round_type", ""), 3)
    blurb_score = score_blurb(company.get("blurb", ""))
    year_score = score_year(company.get("year"))

    total = min(domain_score + round_score + blurb_score + year_score, 100)

    if total >= 75:
        label = "Strong Match"
        tier = 3
    elif total >= 55:
        label = "Worth Tracking"
        tier = 2
    elif total >= 35:
        label = "Adjacent"
        tier = 1
    else:
        label = "Not Aligned"
        tier = 0

    return {
        "score": total,
        "label": label,
        "tier": tier,
        "breakdown": {
            "domain": domain_score,
            "stage": round_score,
            "keywords": blurb_score,
            "year": year_score,
        }
    }
