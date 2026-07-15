from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.scrapers.makro import MakroScraper

router = APIRouter(prefix="/api/scrape", tags=["scrape"])

SCRAPERS = {
    "makro": MakroScraper,
}


@router.post("/{store}")
async def scrape_store(store: str, db: Session = Depends(get_db)):
    scraper_class = SCRAPERS.get(store.lower())
    if not scraper_class:
        raise HTTPException(status_code=404, detail=f"Unknown store: {store}. Available: {list(SCRAPERS.keys())}")
    scraper = scraper_class()
    count = await scraper.run_scrape(db)
    return {"store": store, "products_saved": count}
