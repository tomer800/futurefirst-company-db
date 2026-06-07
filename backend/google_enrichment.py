import os
import httpx
from dotenv import load_dotenv

load_dotenv()

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
GOOGLE_CSE_ID = os.getenv("GOOGLE_CSE_ID")


async def ddg_search(query: str, num: int = 5) -> list[dict]:
    try:
        from ddgs import DDGS
        results = list(DDGS().text(query, max_results=num))
        return [
            {"title": r.get("title"), "link": r.get("href"), "snippet": r.get("body")}
            for r in results
        ]
    except Exception as e:
        return []


async def google_search(query: str, num: int = 5) -> list[dict]:
    if not GOOGLE_API_KEY or not GOOGLE_CSE_ID:
        return await ddg_search(query, num)
    url = "https://www.googleapis.com/customsearch/v1"
    params = {"key": GOOGLE_API_KEY, "cx": GOOGLE_CSE_ID, "q": query, "num": num}
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(url, params=params)
            if resp.status_code != 200:
                return await ddg_search(query, num)
            items = resp.json().get("items", [])
            return [
                {"title": i.get("title"), "link": i.get("link"), "snippet": i.get("snippet")}
                for i in items
            ]
    except Exception:
        return await ddg_search(query, num)


async def enrich_company(company_name: str, website: str = "") -> dict:
    try:
        results = await ddg_search(f"{company_name} startup funding investors", num=5)
        news = await ddg_search(f"{company_name} AI company news 2024 2025", num=3)
        return {"search_results": results, "news": news, "source": "DuckDuckGo Search"}
    except Exception as e:
        return {"search_results": [], "news": [], "error": str(e)}
