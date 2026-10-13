# BigInt Serialization Fix - Deployment Ready

## ✅ Issue Fixed

**Error:** `TypeError: Do not know how to serialize a BigInt`  
**Cause:** Pricing config caching tried to JSON.stringify data with BigInt values  
**File Fixed:** `src/lib/server/tours/pricing-config.ts`

---

## What Changed

### Added Serialization Helpers

```typescript
// Convert BigInt and Decimal to JSON-safe strings before caching
function serializePricingConfigs(configs: any[]) {
  return configs.map(config => ({
    ...config,
    id: config.id.toString(),
    basePricePerTour: config.basePricePerTour.toString(),
    pricePerAdditionalGuestBeyond: config.pricePerAdditionalGuestBeyond.toString(),
    driverCommissionPercentage: config.driverCommissionPercentage.toString()
  }));
}

// Convert back from strings when retrieving from cache
function deserializePricingConfigs(configs: any[]) {
  return configs.map(config => ({
    ...config,
    id: BigInt(config.id),
    basePricePerTour: new Decimal(config.basePricePerTour),
    // ... rest restored
  }));
}
```

### Updated getAllPricingConfigs()

```typescript
// OLD (broken)
await setInCache(CACHE_KEY_PRICING, configs, CACHE_TTL);  // ❌ BigInt can't serialize

// NEW (fixed)
const serialized = serializePricingConfigs(configs);
await setInCache(CACHE_KEY_PRICING, serialized, CACHE_TTL);  // ✅ Strings serialize fine
```

---

## 🚀 Deploy to Railway

### Step 1: Push Code
```bash
git add src/lib/server/tours/pricing-config.ts
git commit -m "fix: resolve BigInt serialization error in pricing config cache"
git push origin main
```

### Step 2: Railway Auto-Deploys
- Pulls latest code
- Rebuilds application
- Restarts service
- **Error should be gone!**

---

## ✅ Verify Fix

After deployment, check:
1. Application starts without BigInt errors
2. Load home page without 404 favicon error spam
3. Pricing configs load correctly
4. Tours can be booked

```bash
# In Railway logs, you should see:
Listening on http://0.0.0.0:8080
# No more BigInt serialization errors
```

---

## 🎯 Prevention for Future

When caching Prisma data with BigInt/Decimal:

✅ **DO THIS:**
```typescript
// Serialize before caching
const data = await prisma.model.findMany();
const serialized = data.map(d => ({
  ...d,
  id: d.id.toString(),  // Convert BigInt to string
  amount: d.amount.toString()  // Convert Decimal to string
}));
await setInCache(key, serialized);

// Deserialize when retrieving
const cached = await getFromCache(key);
const deserialized = cached.map(d => ({
  ...d,
  id: BigInt(d.id),
  amount: new Decimal(d.amount)
}));
```

❌ **DON'T DO THIS:**
```typescript
// Will crash - BigInt can't be JSON serialized
const data = await prisma.model.findMany();
await setInCache(key, data);  // ❌ BigInt throws error
```

---

## Summary

- **Status:** ✅ Fixed and ready to deploy
- **Risk Level:** Low (isolated to pricing cache)
- **Deployment Time:** ~2-3 minutes
- **User Impact:** None (same functionality, just no error)

**Deploy now - Railway will auto-fix the error!**
