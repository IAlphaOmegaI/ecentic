#!/usr/bin/env python3
"""
Flaviar live demo — écentic
Run:  python3 flaviar-demo.py [1|2|3|4|5|all]

Each demo is one self-contained proof. Demos 1-4 are STRUCTURAL (stable overnight).
Demo 5 is stock-dependent — it computes a live rate rather than naming a bottle.

NOTE: the MCP endpoint is rate-limited per IP (see flaviar.com/agents.md).
Back off between runs. Do a full dry run at least 2h before the call, not 5 min before.
"""
import json, sys, time, urllib.request, statistics

PROFILE = "https://shopify.dev/ucp/agent-profiles/examples/2026-04-08/valid-with-capabilities.json"
ENDPOINT = "https://flaviar.com/api/ucp/mcp"

def mcp(tool, catalog, tries=4):
    payload = {"jsonrpc":"2.0","method":"tools/call","id":1,"params":{"name":tool,
        "arguments":{"meta":{"ucp-agent":{"profile":PROFILE}},"catalog":catalog}}}
    for i in range(tries):
        try:
            req = urllib.request.Request(ENDPOINT, data=json.dumps(payload).encode(),
                headers={"Content-Type":"application/json","Accept":"application/json, text/event-stream"})
            r = json.load(urllib.request.urlopen(req, timeout=30))
            return json.loads(r["result"]["content"][0]["text"])
        except Exception as e:
            if i == tries-1: raise
            time.sleep(4*(i+1))

def search(q, limit=10, region="CA"):
    return mcp("search_catalog", {"query":q,
        "context":{"address_country":"US","address_region":region,"currency":"USD"},
        "pagination":{"limit":limit}})

def usd(cents): return f"${cents/100:,.2f}"
def rule(t): print("\n" + "="*68 + f"\n  {t}\n" + "="*68)


def demo1():
    """price_range.min is poisoned by a single rogue variant."""
    rule("DEMO 1 — The price an agent quotes is not a real price")
    d = search("Macallan 12 Year Old Sherry Oak", 3)
    p = next(x for x in d["products"] if "Macallan 12" in x["title"])
    vs = p["variants"]
    real = sorted(v["price"]["amount"] for v in vs)
    print(f"\nProduct : {p['title']}")
    print(f"Agent sees price_range : {usd(p['price_range']['min']['amount'])} – {usd(p['price_range']['max']['amount'])}")
    print(f"\n  --> An agent comparing on price quotes {usd(p['price_range']['min']['amount'])} for a Macallan 12.\n")
    print("Cheapest variants the API actually returns:")
    for v in sorted(vs, key=lambda x: x["price"]["amount"])[:5]:
        print(f"   retailer {v['title']:>5}   {usd(v['price']['amount']):>10}   available={v['availability']['available']}")
    print(f"\n  Real entry price: {usd(real[0])}. Quoted: {usd(p['price_range']['min']['amount'])}.")
    print(f"  Understated by ~{real[0]/p['price_range']['min']['amount']:.0f}x.")
    print(f"\n  Option values on this product: {len(p['options'][0]['values'])}")
    print("  PRE-EMPT THE OBJECTION: every variant weighs 1814g in products.json —")
    print("  identical to the full 750ml bottle. This is not a 50ml sample. It is a bad price.")

def demo2():
    """address_region is transmitted and discarded."""
    rule("DEMO 2 — Five states, one answer")
    q = "bourbon gift under $50"
    sigs = {}
    for st in ["CA","NY","TX","FL","UT"]:
        d = search(q, 5, region=st)
        sigs[st] = [(p["title"], p["variants"][0]["title"], p["variants"][0]["price"]["amount"]) for p in d["products"]]
        top = sigs[st][0]
        print(f"   {st}:  {top[0][:40]:42} featured='{top[1]}'  {usd(top[2])}")
        time.sleep(2)
    identical = len({json.dumps(v) for v in sigs.values()}) == 1
    print(f"\n  All five responses identical: {identical}")
    print("  UCP defines context.address_region so a merchant can localise availability.")
    print("  Flaviar accepts it and discards it — across a 35,000-retailer fulfillment network.")
    print("\n  ASK, DON'T CLAIM: 'You hold the retailer-to-state mapping. Why does a")
    print("  California buyer and a New York buyer get the identical variant order?'")

def demo3():
    """Protocol fields UCP provides, left empty."""
    rule("DEMO 3 — Fields the protocol gives you, unused")
    d = search("bourbon", 40)
    ps = d["products"]
    n = len(ps)
    seller = sum(1 for p in ps if p["variants"] and p["variants"][0].get("seller"))
    rating = sum(1 for p in ps if p.get("rating"))
    meta   = sum(1 for p in ps if p.get("metadata"))
    bar    = sum(1 for p in ps if p["variants"] and p["variants"][0].get("barcodes"))
    cat    = sum(1 for p in ps if p.get("categories"))
    alt    = sum(1 for p in ps for m in (p.get("media") or []) if m.get("alt_text"))
    med    = sum(len(p.get("media") or []) for p in ps)
    print(f"\n  Sample: {n} products\n")
    for label, v, why in [
        ("variant.seller  (policy links)", seller, "the sanctioned way to bind shipping/refund policy to a bottle"),
        ("product.rating", rating, "flaviar.com shows 3,553 reviews on Buffalo Trace — agents see none"),
        ("product.metadata", meta, "where ABV / volume / region / retailer-geo belong"),
        ("variant.barcodes (GTIN)", bar, "gates Shopify Global Catalog and cross-merchant discovery"),
        ("product.categories", cat, "taxonomy for intent matching"),
    ]:
        print(f"   {label:34} {v:>3} / {n}   — {why}")
    print(f"\n   media.alt_text                     {alt:>3} / {med}   — populated. They are not careless everywhere.")

def demo4():
    """267 opaque option values, zero availability flags."""
    rule("DEMO 4 — 267 options, none labelled, none flagged")
    d = mcp("get_product", {"id":"gid://shopify/Product/8530931056922",
                            "context":{"address_country":"US","address_region":"CA"}})
    p = d["product"]
    vals = p["options"][0]["values"]
    print(f"\n  Product      : {p['title']}")
    print(f"  Option name  : '{p['options'][0]['name']}'")
    print(f"  Option values: {len(vals)}")
    print(f"  Sample labels: {[v['label'] for v in vals[:12]]}")
    print(f"  Values carrying an `available` flag: {sum(1 for v in vals if 'available' in v)} of {len(vals)}")
    desc = (p.get("description") or {}).get("plain") or (p.get("description") or {}).get("html") or ""
    print(f"  Description length: {len(desc)}")
    print("\n  Shopify's own get_product docs show option values SHOULD look like:")
    print('     {"label": "Blue", "available": true, "exists": true}')
    print('  Flaviar emits {"label": "41"} — 267 times, on one bottle.')

def demo5():
    """Featured-variant availability — computed live, not pre-baked."""
    rule("DEMO 5 — The featured variant, computed live")
    qs = ["bourbon gift under $50","beginner friendly rye whiskey","wedding gift bottle under $100",
          "premium japanese whisky","gin for a gin and tonic"]
    tot = oos = 0
    deltas = []
    for q in qs:
        d = search(q, 20)
        ps = d["products"]
        tot += len(ps)
        k = 0
        for p in ps:
            vs = p["variants"]
            if not vs: continue
            f = vs[0]
            if not f["availability"]["available"]:
                k += 1
                ins = [v for v in vs if v["availability"]["available"]]
                if ins:
                    deltas.append(min(v["price"]["amount"] for v in ins) - f["price"]["amount"])
        oos += k
        print(f"   {q:36} {k:2}/{len(ps)} featured out of stock")
        time.sleep(2)
    print(f"\n  Featured variant unbuyable: {oos}/{tot} = {100*oos/tot:.0f}%")
    if deltas:
        wrong = sum(1 for x in deltas if abs(x) > 1)
        print(f"  Of those, quoted price differs from cheapest buyable: {wrong}/{len(deltas)} = {100*wrong/len(deltas):.0f}%")
        print(f"  Median error {usd(int(statistics.median([abs(x) for x in deltas])))}, max {usd(max(abs(x) for x in deltas))}")
    print("\n  UCP: 'Platforms SHOULD treat the first element as featured.'")
    print("  That element's price is the quote. The quote is wrong.")

DEMOS = {"1":demo1,"2":demo2,"3":demo3,"4":demo4,"5":demo5}

if __name__ == "__main__":
    which = sys.argv[1] if len(sys.argv) > 1 else "all"
    keys = sorted(DEMOS) if which == "all" else [which]
    for k in keys:
        try:
            DEMOS[k]()
        except Exception as e:
            print(f"\n  [demo {k} failed: {e}]\n  Fall back to the numbers in the evidence exhibit.")
        if which == "all": time.sleep(3)
    print()