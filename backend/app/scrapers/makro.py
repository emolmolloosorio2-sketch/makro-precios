import asyncio
import json
import re
from typing import Optional
import httpx
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import Product, PriceHistory


class MakroScraper:
    STORE_NAME = "Makro"
    BASE_URL = "https://www.makro.pe"
    VTEX_BASE = "https://www.makro.plazavea.com.pe"

    GROCERY_TERMS = [
        "arroz", "aceite", "leche", "azucar", "fideo", "pasta", "harina",
        "atun", "gaseosa", "agua", "galleta", "cafe", "te", "chocolate",
        "conserva", "mermelada", "mantequilla", "queso", "yogurt",
        "detergente", "jabon", "shampoo", "papel higienico", "lavavajilla",
        "cerveza", "vino", "espumante",
        "pollo", "carne", "embutido", "cerdo",
        "fruta", "verdura", "papa", "cebolla",
        "menestra", "lenteja", "frijol", "garbanzo",
        "salsa", "mayonesa", "ketchup", "mostaza",
        "caldo", "sazon", "especia",
        "paneton", "dulce", "caramelo", "chicle",
        "pilas", "foco", "bolsa", "plato", "vaso",
    ]

    async def search_vtex_catalog(self, client: httpx.AsyncClient, term: str, limit: int = 30):
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept": "application/json",
        }
        page_size = min(limit, 50)
        all_items = []
        from_val = 0
        while len(all_items) < limit:
            to_val = from_val + page_size - 1
            url = f"{self.VTEX_BASE}/api/catalog_system/pub/products/search?ft={term}&_from={from_val}&_to={to_val}"
            try:
                r = await client.get(url, headers=headers, timeout=15)
                items = r.json()
                if not isinstance(items, list) or len(items) == 0:
                    break
                all_items.extend(items)
                if len(items) < page_size:
                    break
                from_val += page_size
                await asyncio.sleep(0.2)
            except Exception as e:
                print(f"[MakroVTEX] Error searching '{term}' at offset {from_val}: {e}")
                break
        return all_items[:limit]

    def parse_vtex_product(self, raw: dict) -> Optional[dict]:
        try:
            name = raw.get("productName", "")
            if not name:
                return None
            brand = raw.get("brand", "")
            sku = str(raw.get("productId", ""))
            items = raw.get("items", [])
            if not items:
                return None
            first = items[0]
            images = first.get("images", [])
            image_url = images[0].get("imageUrl", "") if images else None
            sellers = first.get("sellers", [])
            if not sellers:
                return None
            offer = sellers[0].get("commertialOffer", {})
            price = offer.get("Price", 0)
            list_price = offer.get("ListPrice", 0)
            discount = offer.get("DiscountPercentage", 0)
            categories = raw.get("categories", [])
            category = categories[0] if categories else None
            link_text = raw.get("linkText", "")
            product_url = f"{self.VTEX_BASE}/{link_text}/p" if link_text else None

            promo_data = None
            for t in offer.get("Teasers", []):
                name_t = t.get("<Name>k__BackingField") or t.get("Name", "")
                if "bi-precio" not in name_t.lower() and "cantidad" not in name_t.lower():
                    continue
                eff = t.get("<Effects>k__BackingField") or t.get("Effects", {})
                params = eff.get("<Parameters>k__BackingField") or eff.get("Parameters", [])
                cond = t.get("<Conditions>k__BackingField") or t.get("Conditions", {})
                bi_precio_qty = raw.get("CantidadBiPrecioMK")
                if bi_precio_qty and len(bi_precio_qty) > 0:
                    try:
                        min_qty = int(bi_precio_qty[0])
                    except (ValueError, IndexError):
                        min_qty = max(cond.get("<MinimumQuantity>k__BackingField") or cond.get("MinimumQuantity", 0), 2)
                else:
                    min_qty = max(cond.get("<MinimumQuantity>k__BackingField") or cond.get("MinimumQuantity", 0), 2)
                discount_val = 0.0
                for p in params:
                    pv = p.get("<Value>k__BackingField") or p.get("Value", "0")
                    pn = p.get("<Name>k__BackingField") or p.get("Name", "")
                    if "discount" in pn.lower():
                        discount_val = float(pv)
                if discount_val > 0:
                    bi_precio_unit_price = list_price - discount_val
                    if 0 < bi_precio_unit_price < price:
                        savings_per_unit = price - bi_precio_unit_price
                        total_discount = round(savings_per_unit * min_qty, 2)
                        promo_data = {
                            "type": "quantity_discount",
                            "min_quantity": min_qty,
                            "total_discount": total_discount,
                            "discount_per_unit": round(savings_per_unit, 2),
                            "discounted_price_per_unit": round(bi_precio_unit_price, 2),
                        }
                        break
            for t in offer.get("PromotionTeasers", []):
                if promo_data:
                    break
                name_t = t.get("Name", "")
                if "bi-precio" not in name_t.lower() and "cantidad" not in name_t.lower():
                    continue
                cond = t.get("Conditions", {})
                min_qty = cond.get("MinimumQuantity", 0)
                eff = t.get("Effects", {})
                params = eff.get("Parameters", [])
                discount_val = 0.0
                for p in params:
                    pn = p.get("Name", "")
                    pv = p.get("Value", "0")
                    if "discount" in pn.lower():
                        discount_val = float(pv)
                if discount_val > 0:
                    bi_precio_qty = raw.get("CantidadBiPrecioMK")
                    if bi_precio_qty and len(bi_precio_qty) > 0:
                        try:
                            min_qty = int(bi_precio_qty[0])
                        except (ValueError, IndexError):
                            min_qty = max(min_qty, 2)
                    else:
                        min_qty = max(min_qty, 2)
                    bi_precio_unit_price = list_price - discount_val
                    if 0 < bi_precio_unit_price < price:
                        savings_per_unit = price - bi_precio_unit_price
                        total_discount = round(savings_per_unit * min_qty, 2)
                        promo_data = {
                            "type": "quantity_discount",
                            "min_quantity": min_qty,
                            "total_discount": total_discount,
                            "discount_per_unit": round(savings_per_unit, 2),
                            "discounted_price_per_unit": round(bi_precio_unit_price, 2),
                        }

            return {
                "name": name,
                "brand": brand,
                "sku": sku,
                "image_url": image_url,
                "product_url": product_url,
                "price": price,
                "original_price": list_price if list_price and list_price > price else None,
                "discount_percentage": discount,
                "category": category,
                "in_store_only": 0,
                "description": None,
                "promotion_data": promo_data,
            }
        except Exception as e:
            return None

    async def get_build_id(self, client: httpx.AsyncClient) -> str | None:
        try:
            r = await client.get(f"{self.BASE_URL}/makroahorro", timeout=15)
            match = re.search(
                r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>',
                r.text, re.DOTALL
            )
            if match:
                data = json.loads(match.group(1))
                return data.get("buildId")
        except Exception as e:
            print(f"[Makro] Error getting build ID: {e}")
        return None

    async def lookup_vtex_url(self, client: httpx.AsyncClient, name: str, brand: str, description: str = "") -> tuple[str | None, str | None]:
        try:
            stop = {'x', 'kg', 'g', 'ml', 'l', 'lt', 'unid', 'unids', 'unds', 'pack', 'bolsa', 'saco', 'caja', 'plancha',
                    'de', 'del', 'en', 'por', 'y', 'e', 'a', 'la', 'el', 'los', 'las',
                    'todas', 'variedades', 'cu', 'c/u', '|', '-'}
            _clean_name = name.split('|')[0].strip()
            _clean_name = re.sub(r'\*[^*]+$', '', _clean_name).strip()
            _clean_name = re.sub(r'^•\s*', '', _clean_name).strip()
            _qty_token = re.compile(r'^\d+[.]?\d*(ml|kg|g|l|lb|oz|unid|botella|paquete|bolsa|bot|pack|lt)$', re.I)
            def _clean_w(w):
                w2 = w.strip('.,;:¡!¿?•*"\'()[]{}').rstrip('/')
                return w2.replace('/', '') if '/' in w2 else w2
            words = _clean_name.split()
            search_words = [w for w in (_clean_w(w) for w in words) if w.lower() not in stop and not w.isdigit() and not _qty_token.match(w) and len(w) > 0]
            if brand and brand.lower().strip() not in [w.lower() for w in search_words]:
                search_words.append(brand.strip())
            if not search_words:
                search_words = words[:3]
            search_term = ' '.join(search_words[:5])
            url = f"{self.VTEX_BASE}/api/catalog_system/pub/products/search?ft={search_term}&_from=0&_to=20"
            headers = {"User-Agent": "Mozilla/5.0", "Accept": "application/json"}
            r = await client.get(url, headers=headers, timeout=15)
            products = r.json()
            if not isinstance(products, list):
                return None, None, None
            name_lower = _clean_name.lower()
            brand_lower = brand.lower().strip()
            name_words = [w for w in (_clean_w(w) for w in name_lower.split()) if w not in stop and not w.isdigit() and not _qty_token.match(w) and len(w) > 0]
            name_words_set = set(name_words)
            first_word = name_words[0] if name_words else ""

            def _extract_qty(txt):
                nums = re.findall(r'(\d+)\s*(ml|kg|g|l|lb|oz|unid|botella|paquete|bolsa)', txt)
                out = []
                for v, u in nums:
                    v = int(v)
                    if u == 'kg': v *= 1000; u = 'g'
                    elif u == 'l': v *= 1000; u = 'ml'
                    elif u == 'lb': v = int(v * 453.6); u = 'g'
                    elif u == 'oz': v = int(v * 28.35); u = 'g'
                    out.append((u, v))
                return out

            def _qty_ok(a, b):
                if not a or not b:
                    return True
                for ua, va in a:
                    for ub, vb in b:
                        if ua != ub:
                            continue
                        if va == vb:
                            return True
                        if va > 0 and vb > 0 and min(va, vb) / max(va, vb) >= 0.7:
                            return True
                        return False
                return True

            _clean_desc = (description or '').split('|')[0].strip()
            name_qty = _extract_qty(name_lower + ' ' + _clean_desc.lower())
            best_url = None
            best_score = 0.0
            best_sku = None
            for p in products:
                pn = (p.get("productName", "") or "").lower()
                pb = (p.get("brand", "") or "").lower()
                lt = p.get("linkText", "")
                pid = str(p.get("productId", ""))
                if not lt or (brand_lower and brand_lower not in pn and brand_lower not in pb):
                    continue
                if not _qty_ok(name_qty, _extract_qty(pn)):
                    continue
                pn_words = [w for w in (_clean_w(w) for w in pn.split()) if w not in stop and not w.isdigit() and not _qty_token.match(w) and len(w) > 0]
                pn_words_set = set(pn_words)
                score = 0.0
                if brand_lower and brand_lower in pn:
                    score += 8
                score += sum(1 for w in name_words_set if w in pn) * 3
                common = name_words_set & pn_words_set
                coverage = len(common) / max(len(name_words_set), 1)
                score += coverage * 15
                if first_word and pn_words and first_word not in pn_words_set:
                    score -= 10
                if common:
                    diff = (name_words_set | pn_words_set) - common
                    size_kw = {'saco', 'bolsa', 'caja', 'plancha', 'pack', 'balde', 'tubo', 'botella', 'galon'}
                    if diff & size_kw:
                        score -= 8
                if ' sin ' in name_lower and ' sin ' not in pn:
                    score -= 12
                if ' con ' in name_lower and ' con ' not in pn:
                    score -= 12
                if ' light ' in name_lower and ' light ' not in pn and ' light ' not in lt and ' zero ' not in pn and ' ligero ' not in pn:
                    score -= 8
                if 'caja' in name_lower and 'bolsa' in pn:
                    score -= 12
                if 'bolsa' in name_lower and 'caja' in pn:
                    score -= 12
                variety_words = {'zero', 'light', 'ligero', 'chocolatada', 'deslactosado', 'semidescremada'}
                for vw in variety_words:
                    if (vw in pn or vw in lt) and vw not in name_lower and vw not in description.lower():
                        score -= 8
                if '|' in description:
                    extra = description.split('|', 1)[1].lower()
                    for vw in variety_words:
                        if vw in extra and (vw in pn or vw in lt):
                            score += 4
                if score > best_score:
                    best_score = score
                    best_url = f"{self.VTEX_BASE}/{lt}/p"
                    best_sku = pid
            if best_score >= 12:
                return best_url, best_sku
            return None, None
        except Exception:
            return None, None

    async def fetch_promotions(self, client: httpx.AsyncClient, build_id: str) -> list:
        url = f"{self.BASE_URL}/_next/data/{build_id}/makroahorro.json"
        try:
            r = await client.get(url, timeout=15)
            if r.status_code != 200:
                return []
            data = r.json()
            products_data = data.get("pageProps", {}).get("productsData", {})
            categories = products_data.get("products", [])
            all_items = []
            for cat in categories:
                items = cat.get("items", [])
                for item in items:
                    item["_category"] = cat.get("categoryName", "")
                all_items.extend(items)
            return all_items
        except Exception as e:
            print(f"[Makro] Error fetching promotions: {e}")
            return []

    def parse_promotion(self, raw: dict, vtex_url: str | None = None) -> Optional[dict]:
        try:
            name = raw.get("name", "")
            if not name:
                return None
            brand = raw.get("brand", "")
            sku = str(raw.get("sku", raw.get("slug", "")))
            description = raw.get("description", "")
            image_url = raw.get("image", "")
            price_str = raw.get("price_regular", "0")
            try:
                price = float(price_str)
            except (ValueError, TypeError):
                price = 0.0
            category = raw.get("_category", "Abarrotes")
            full_name = f"{name} - {description}" if description else name

            is_in_store = not vtex_url

            return {
                "name": full_name,
                "brand": brand,
                "sku": sku,
                "image_url": image_url,
                "product_url": vtex_url,
                "price": price,
                "original_price": None,
                "discount_percentage": 0,
                "category": category,
                "in_store_only": 1 if is_in_store else 0,
                "description": description,
                "promotion_data": None,
            }
        except Exception as e:
            return None

    def save_product(self, db: Session, data: dict) -> int:
        existing = db.query(Product).filter(
            Product.sku == data["sku"],
            Product.store == self.STORE_NAME
        ).first()

        if existing:
            existing.name = data["name"]
            existing.brand = data["brand"]
            existing.image_url = data["image_url"]
            existing.product_url = data["product_url"]
            existing.category = data["category"]
            existing.in_store_only = data.get("in_store_only", 0)
            existing.description = data.get("description") or existing.description
            existing.promotion_data = data.get("promotion_data")
            product = existing
        else:
            product = Product(
                name=data["name"],
                brand=data["brand"],
                sku=data["sku"],
                image_url=data["image_url"],
                product_url=data["product_url"],
                category=data["category"],
                store=self.STORE_NAME,
                in_store_only=data.get("in_store_only", 0),
                description=data.get("description"),
                promotion_data=data.get("promotion_data"),
            )
            db.add(product)
            db.flush()

        last_price = (
            db.query(PriceHistory.price)
            .filter(PriceHistory.product_id == product.id)
            .order_by(PriceHistory.id.desc())
            .first()
        )
        if last_price is None or last_price[0] != data["price"]:
            price_entry = PriceHistory(
                product_id=product.id,
                price=data["price"],
                original_price=data["original_price"],
                discount_percentage=data["discount_percentage"],
            )
            db.add(price_entry)
            return 1
        return 0

    async def run_scrape(self, db: Session):
        print("[Makro] Starting scrape (VTEX catalog + promotions)...")
        total_saved = 0
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        }

        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True, headers=headers) as client:
            seen_skus = set()

            for term in self.GROCERY_TERMS:
                raw = await self.search_vtex_catalog(client, term, limit=150)
                for item in raw:
                    parsed = self.parse_vtex_product(item)
                    if parsed and parsed["price"] > 0 and parsed["sku"] not in seen_skus:
                        seen_skus.add(parsed["sku"])
                        total_saved += self.save_product(db, parsed)
                await asyncio.sleep(0.3)

            build_id = await self.get_build_id(client)
            if build_id:
                promos = await self.fetch_promotions(client, build_id)
                for item in promos:
                    pn = item.get("name", "")
                    pb = item.get("brand", "")
                    pd = item.get("description", "")
                    vtex_url, vtex_sku = await self.lookup_vtex_url(client, pn, pb, pd)
                    if vtex_url:
                        await asyncio.sleep(0.2)
                        if vtex_sku and vtex_sku in seen_skus:
                            continue
                    parsed = self.parse_promotion(item, vtex_url)
                    if parsed and parsed["price"] > 0 and parsed["sku"] not in seen_skus:
                        seen_skus.add(parsed["sku"])
                        total_saved += self.save_product(db, parsed)

        db.commit()
        print(f"[Makro] Saved {total_saved} products (VTEX + promotions)")
        return total_saved


async def scrape_makro():
    db = SessionLocal()
    try:
        scraper = MakroScraper()
        return await scraper.run_scrape(db)
    finally:
        db.close()
