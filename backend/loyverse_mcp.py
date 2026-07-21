import os
import json
from pathlib import Path
from typing import Optional
import httpx
from mcp.server.fastmcp import FastMCP

_CONFIG_PATH = Path(__file__).parent / "mcp_config.json"
if _CONFIG_PATH.exists():
    _cfg = json.loads(_CONFIG_PATH.read_text())
    LOYVERSE_API_TOKEN = _cfg.get("loyverse_api_token", "")
else:
    LOYVERSE_API_TOKEN = os.environ.get("LOYVERSE_API_TOKEN", "")

BASE_URL = "https://api.loyverse.com/v1.0"

HEADERS = {
    "Authorization": f"Bearer {LOYVERSE_API_TOKEN}",
    "Content-Type": "application/json",
}

mcp = FastMCP("loyverse")


async def _get(endpoint: str, params: dict = None) -> dict:
    async with httpx.AsyncClient() as client:
        r = await client.get(f"{BASE_URL}{endpoint}", headers=HEADERS, params=params, timeout=15)
        r.raise_for_status()
        return r.json()


# ── Items ──────────────────────────────────────────────────────────────
@mcp.tool()
async def list_items(cursor: str = None, limit: int = 50, created_at_min: str = None, created_at_max: str = None, updated_at_min: str = None, updated_at_max: str = None) -> str:
    """List items (products) from Loyverse inventory"""
    params = {"limit": min(limit, 250)}
    if cursor: params["cursor"] = cursor
    if created_at_min: params["created_at_min"] = created_at_min
    if created_at_max: params["created_at_max"] = created_at_max
    if updated_at_min: params["updated_at_min"] = updated_at_min
    if updated_at_max: params["updated_at_max"] = updated_at_max
    return json.dumps(await _get("/items", params), indent=2, default=str)


@mcp.tool()
async def get_item(item_id: str) -> str:
    """Get a single item by ID"""
    return json.dumps(await _get(f"/items/{item_id}"), indent=2, default=str)


# ── Variants ──────────────────────────────────────────────────────────
@mcp.tool()
async def list_variants(cursor: str = None, limit: int = 50) -> str:
    """List item variants"""
    params = {"limit": min(limit, 250)}
    if cursor: params["cursor"] = cursor
    return json.dumps(await _get("/variants", params), indent=2, default=str)


@mcp.tool()
async def get_variant(variant_id: str) -> str:
    """Get a single item variant by ID"""
    return json.dumps(await _get(f"/variants/{variant_id}"), indent=2, default=str)


# ── Categories ────────────────────────────────────────────────────────
@mcp.tool()
async def list_categories(cursor: str = None, limit: int = 50) -> str:
    """List categories"""
    params = {"limit": min(limit, 250)}
    if cursor: params["cursor"] = cursor
    return json.dumps(await _get("/categories", params), indent=2, default=str)


@mcp.tool()
async def get_category(category_id: str) -> str:
    """Get a single category by ID"""
    return json.dumps(await _get(f"/categories/{category_id}"), indent=2, default=str)


# ── Inventory ─────────────────────────────────────────────────────────
@mcp.tool()
async def list_inventory(store_ids: str = None, variant_ids: str = None, cursor: str = None, limit: int = 50) -> str:
    """List inventory levels for item variants across stores.
    - store_ids: comma-separated store IDs to filter
    - variant_ids: comma-separated variant IDs to filter
    """
    params = {"limit": min(limit, 250)}
    if store_ids: params["store_ids"] = store_ids
    if variant_ids: params["variant_ids"] = variant_ids
    if cursor: params["cursor"] = cursor
    return json.dumps(await _get("/inventory", params), indent=2, default=str)


# ── Receipts ──────────────────────────────────────────────────────────
@mcp.tool()
async def list_receipts(cursor: str = None, limit: int = 50, created_at_min: str = None, created_at_max: str = None, store_id: str = None) -> str:
    """List sales receipts"""
    params = {"limit": min(limit, 250)}
    if cursor: params["cursor"] = cursor
    if created_at_min: params["created_at_min"] = created_at_min
    if created_at_max: params["created_at_max"] = created_at_max
    if store_id: params["store_id"] = store_id
    return json.dumps(await _get("/receipts", params), indent=2, default=str)


@mcp.tool()
async def get_receipt(receipt_number: str) -> str:
    """Get a single receipt by receipt number"""
    return json.dumps(await _get(f"/receipts/{receipt_number}"), indent=2, default=str)


# ── Customers ─────────────────────────────────────────────────────────
@mcp.tool()
async def list_customers(cursor: str = None, limit: int = 50, created_at_min: str = None, created_at_max: str = None) -> str:
    """List customers"""
    params = {"limit": min(limit, 250)}
    if cursor: params["cursor"] = cursor
    if created_at_min: params["created_at_min"] = created_at_min
    if created_at_max: params["created_at_max"] = created_at_max
    return json.dumps(await _get("/customers", params), indent=2, default=str)


@mcp.tool()
async def get_customer(customer_id: str) -> str:
    """Get a single customer by ID"""
    return json.dumps(await _get(f"/customers/{customer_id}"), indent=2, default=str)


# ── Stores ────────────────────────────────────────────────────────────
@mcp.tool()
async def list_stores() -> str:
    """List all stores"""
    return json.dumps(await _get("/stores"), indent=2, default=str)


@mcp.tool()
async def get_store(store_id: str) -> str:
    """Get a single store by ID"""
    return json.dumps(await _get(f"/stores/{store_id}"), indent=2, default=str)


# ── Employees ─────────────────────────────────────────────────────────
@mcp.tool()
async def list_employees(cursor: str = None, limit: int = 50) -> str:
    """List employees"""
    params = {"limit": min(limit, 250)}
    if cursor: params["cursor"] = cursor
    return json.dumps(await _get("/employees", params), indent=2, default=str)


@mcp.tool()
async def get_employee(employee_id: str) -> str:
    """Get a single employee by ID"""
    return json.dumps(await _get(f"/employees/{employee_id}"), indent=2, default=str)


# ── Suppliers ─────────────────────────────────────────────────────────
@mcp.tool()
async def list_suppliers(cursor: str = None, limit: int = 50) -> str:
    """List suppliers"""
    params = {"limit": min(limit, 250)}
    if cursor: params["cursor"] = cursor
    return json.dumps(await _get("/suppliers", params), indent=2, default=str)


@mcp.tool()
async def get_supplier(supplier_id: str) -> str:
    """Get a single supplier by ID"""
    return json.dumps(await _get(f"/suppliers/{supplier_id}"), indent=2, default=str)


# ── Merchant ──────────────────────────────────────────────────────────
@mcp.tool()
async def get_merchant_info() -> str:
    """Get merchant account information"""
    return json.dumps(await _get("/merchant"), indent=2, default=str)


# ── Payment Types ─────────────────────────────────────────────────────
@mcp.tool()
async def list_payment_types() -> str:
    """List payment types"""
    return json.dumps(await _get("/payment_types"), indent=2, default=str)


# ── Taxes ─────────────────────────────────────────────────────────────
@mcp.tool()
async def list_taxes() -> str:
    """List taxes"""
    return json.dumps(await _get("/taxes"), indent=2, default=str)


# ── Discounts ─────────────────────────────────────────────────────────
@mcp.tool()
async def list_discounts(cursor: str = None, limit: int = 50) -> str:
    """List discounts"""
    params = {"limit": min(limit, 250)}
    if cursor: params["cursor"] = cursor
    return json.dumps(await _get("/discounts", params), indent=2, default=str)


# ── Shifts ────────────────────────────────────────────────────────────
@mcp.tool()
async def list_shifts(cursor: str = None, limit: int = 50) -> str:
    """List shifts"""
    params = {"limit": min(limit, 250)}
    if cursor: params["cursor"] = cursor
    return json.dumps(await _get("/shifts", params), indent=2, default=str)


if __name__ == "__main__":
    mcp.run()
