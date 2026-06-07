import httpx
import os
from dotenv import load_dotenv

load_dotenv()

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
GOOGLE_CSE_ID = os.getenv("GOOGLE_CSE_ID")


async def google_search(query: str, num: int = 5) -> list[dict]:
    if not GOOGLE_API_KEY or not GOOGLE_CSE_ID:
        return []
    url = "https://www.googleapis.com/customsearch/v1"
    params = {
        "key": GOOGLE_API_KEY,
        "cx": GOOGLE_CSE_ID,
        "q": query,
        "num": num,
    }
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(url, params=params)
        if resp.status_code == 403:
            raise ValueError("Google API key not authorized for Custom Search. Enable it at console.cloud.google.com.")
        if resp.status_code == 429:
            raise ValueError("Google API daily quota exceeded (100 free searches/day).")
        resp.raise_for_status()
        data = resp.json()
    items = data.get("items", [])
    return [
        {"title": i.get("title"), "link": i.get("link"), "snippet": i.get("snippet")}
        for i in items
    ]


async def enrich_company(company_name: str, website: str = "") -> dict:
    try:
        query = f"{company_name} startup AI funding investors"
        results = await google_search(query)
        news_query = f"{company_name} AI company news 2024 2025"
        news = await google_search(news_query, num=3)
        return {"search_results": results, "news": news, "source": "Google Custom Search API"}
    except ValueError as e:
        return {"search_results": [], "news": [], "error": str(e)}
    except Exception as e:
        return {"search_results": [], "news": [], "error": f"Search failed: {str(e)}"}
