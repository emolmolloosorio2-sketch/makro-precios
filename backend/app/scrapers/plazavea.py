import asyncio
import json
import re
from typing import Optional
import httpx
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import Product, PriceHistory


class PlazaVeaScraper:
    STORE_NAME = "PlazaVea"
    BASE_URL = "https://www.plazavea.com.pe"

    SEARCH_TERMS = [
        "laptop", "celular", "televisor", "tablet", "audifonos",
        "zapatillas", "ropa", "refrigeradora", "lavadora", "microondas",
        "colchon", "mueble", "juguete", "perfume", "reloj",
    ]

    async def search_products(self, term: str, limit: int = 30):
        api_url = f"{self.BASE_URL}/api/catalog_system/pub/products/search?ft={term}&_from=0&_to={limit - 1}"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "application/json",
        }

        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            try:
                response = await client.get(api_url, headers=headers)
                return response.json()
            except Exception as e:
                print(f"[PlazaVea] Exception for term '{term}': {e}")
                return []

    def parse_product(self, raw: dict) -> Optional[dict]:
        try:
            product_name = raw.get("productName", "")
            if not product_name:
                return None

            brand = raw.get("brand", "")
            sku = str(raw.get("productId", ""))

            items = raw.get("items", [])
            if not items:
                return None

            first_item = items[0]
            images = first_item.get("images", [])
            image_url = images[0].get("imageUrl", "") if images else None

            sellers = first_item.get("sellers", [])
            if not sellers:
                return None

            commertial_offer = sellers[0].get("commertialOffer", {})
            price = commertial_offer.get("Price", 0)
            list_price = commertial_offer.get("ListPrice", 0)
            discount = commertial_offer.get("DiscountPercentage", 0)

            product_url = f"{self.BASE_URL}/{raw.get('linkText', '')}/p"

            return {
                "name": product_name,
                "brand": brand,
                "sku": sku,
                "image_url": image_url,
                "product_url": product_url,
                "price": price,
                "original_price": list_price if list_price > price else None,
                "discount_percentage": discount,
                "category": raw.get("categories", [None])[0] if raw.get("categories") else None,
            }
        except Exception as e:
            print(f"[PlazaVea] Parse error: {e}")
            return None

    async def run_scrape(self, db: Session):
        print("[PlazaVea] Starting scrape...")
        all_products = []

        for term in self.SEARCH_TERMS:
            raw_products = await self.search_products(term, limit=20)
            for raw in raw_products:
                parsed = self.parse_product(raw)
                if parsed:
                    all_products.append(parsed)

            await asyncio.sleep(0.5)

        saved_count = 0
        for pdata in all_products:
            existing = db.query(Product).filter(
                Product.sku == pdata["sku"],
                Product.store == self.STORE_NAME
            ).first()

            if existing:
                existing.name = pdata["name"]
                existing.brand = pdata["brand"]
                existing.image_url = pdata["image_url"]
                existing.product_url = pdata["product_url"]
                existing.category = pdata["category"]
                product = existing
            else:
                product = Product(
                    name=pdata["name"],
                    brand=pdata["brand"],
                    sku=pdata["sku"],
                    image_url=pdata["image_url"],
                    product_url=pdata["product_url"],
                    category=pdata["category"],
                    store=self.STORE_NAME,
                )
                db.add(product)
                db.flush()

            price_entry = PriceHistory(
                product_id=product.id,
                price=pdata["price"],
                original_price=pdata["original_price"],
                discount_percentage=pdata["discount_percentage"],
            )
            db.add(price_entry)
            saved_count += 1

        db.commit()
        print(f"[PlazaVea] Saved {saved_count} products with prices")
        return saved_count


async def scrape_plazavea():
    db = SessionLocal()
    try:
        scraper = PlazaVeaScraper()
        return await scraper.run_scrape(db)
    finally:
        db.close()
