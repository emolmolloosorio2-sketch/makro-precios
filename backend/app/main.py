from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from apscheduler.schedulers.asyncio import AsyncIOScheduler

from app.database import engine, Base, SessionLocal
from app.routers import products, alerts_api, scrape
from app.services.matcher import update_product_embeddings
from app.services.alerts import check_alerts
from app.scrapers.makro import MakroScraper

scheduler = AsyncIOScheduler()


async def scheduled_scrape():
    db = SessionLocal()
    try:
        scrapers = [MakroScraper()]
        for scraper in scrapers:
            count = await scraper.run_scrape(db)
            print(f"[Scheduler] Scraped {count} products from {scraper.STORE_NAME}")

        emb_count = update_product_embeddings(db)
        print(f"[Scheduler] Updated {emb_count} embeddings")

        triggered = check_alerts(db)
        if triggered:
            for t in triggered:
                print(f"[ALERT] {t['email']}: {t['product_name']} now at S/{t['current_price']}")
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)

    scheduler.add_job(scheduled_scrape, "interval", hours=1, id="scrape_job")
    scheduler.start()

    yield

    scheduler.shutdown()


app = FastAPI(
    title="Knasta Clone - Price Monitor",
    description="Monitoreo y comparación de precios de tiendas peruanas",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(products.router)
app.include_router(alerts_api.router)
app.include_router(scrape.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}


# Serve frontend (built SPA) from the same port
frontend_dist = Path(__file__).parent.parent.parent / "frontend" / "dist"
if frontend_dist.exists():
    app.mount("/assets", StaticFiles(directory=str(frontend_dist / "assets")), name="assets")

    @app.get("/")
    def serve_index():
        return FileResponse(str(frontend_dist / "index.html"))

    @app.get("/{path:path}")
    def serve_spa(path: str):
        if path.startswith("api/"):
            from fastapi.responses import JSONResponse
            return JSONResponse(status_code=404, content={"detail": "Not found"})
        return FileResponse(str(frontend_dist / "index.html"))



