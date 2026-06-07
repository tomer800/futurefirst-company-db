"""
FutureFirst Deal Radar — thesis-based scoring engine.
Scores each company 0-100 based on alignment with the FF investment thesis:
  - Vertical AI / AI Infrastructure for regulated, mission-critical industries
  - Seed / Pre-Seed stage
  - Founded 2023-2026
  - Enterprise / regulated industry focus
"""

DOMAIN_SCORES = {
    "AI Infrastructure & Developer Tools": 30,
    "Enterprise Software & AI": 28,
    "FinTech": 25,
    "Healthcare & Life Sciences": 25,
    "LegalTech": 22,
    "GovTech": 20,
    "Cloud Infrastructure & DevOps": 18,
    "Cybersecurity": 14,
    "Commerce & Retail": 10,
    "Education": 10,
    "Industrial & Manufacturing": 10,
    "Mobility & Logistics": 8,
    "Construction & Real Estate": 8,
    "Consumer, Media & Entertainment": 5,
    "Agriculture & Food": 5,
    "Climate & Energy": 5,
    "Defense, Aerospace & Dual-Use": 5,
    "BioTech": 8,
    "DeepTech": 10,
    "Other": 3,
}

ROUND_SCORES = {
    "Pre-Seed": 25,
    "Seed Round": 25,
    "Angel Round": 20,
    "Early Stage VC": 20,
    "early stage vc": 20,
    "Accelerator/lncubator": 15,
    "Grant": 12,
    "Equity Crowdfunding": 10,
    "A": 8,
    "B": 3,
    "PE Growth/Expansion": 2,
    "Buyout/LBO": 1,
    "Merger/Acquisition": 1,
    "Secondary Transaction - Private": 1,
    "Joint Venture": 5,
}

# High-value keywords from FF thesis
REGULATED_KEYWORDS = [
    "insurance", "banking", "bank", "financial services", "compliance",
    "regulatory", "regulation", "regulated", "clinical", "healthcare",
    "health system", "hospital", "medical", "pharma", "legal", "law firm",
    "tax", "audit", "accounting", "government", "public sector",
    "mission-critical", "enterprise", "underwriting", "claims",
    "fintech", "wealth management", "asset management",
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


def score_blurb(blurb: str) -> int:
    if not blurb:
        return 0
    text = blurb.lower()
    score = 0

    regulated_hits = sum(1 for kw in REGULATED_KEYWORDS if kw in text)
    score += min(regulated_hits * 4, 14)

    ai_hits = sum(1 for kw in AI_KEYWORDS if kw in text)
    score += min(ai_hits * 3, 8)

    vertical_hits = sum(1 for kw in VERTICAL_AI_KEYWORDS if kw in text)
    score += min(vertical_hits * 2, 3)

    return min(score, 25)


def score_year(year) -> int:
    if not year or year != year:  # nan check
        return 8
    y = int(year)
    if y >= 2024:
        return 20
    if y == 2023:
        return 16
    if y == 2022:
        return 10
    if y == 2021:
        return 6
    return 3


def compute_radar_score(company: dict) -> dict:
    domain_score = DOMAIN_SCORES.get(company.get("vc_domain", ""), 5)
    round_score = ROUND_SCORES.get(company.get("round_type", ""), 5)
    blurb_score = score_blurb(company.get("blurb", ""))
    year_score = score_year(company.get("year"))

    total = domain_score + round_score + blurb_score + year_score

    if total >= 78:
        label = "Strong Match"
        tier = 3
    elif total >= 58:
        label = "Worth Tracking"
        tier = 2
    elif total >= 38:
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
