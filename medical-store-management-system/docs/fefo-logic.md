# Phase 2: FEFO (First Expiry, First Out) Recommendation Engine

## Overview
The FEFO engine calculates the optimal batch allocation for a requested quantity of medicine. It ensures that batches expiring soonest are dispensed first, minimizing expired stock waste while guaranteeing that no expired or quarantined inventory is ever recommended.

## 1. Regulatory & Quality Rules
1. **Never Recommend Expired Batches**:
   Batches whose expiry date is $\le \text{today}$ (calculated in the store's business timezone `Asia/Kolkata`) are strictly filtered out.
2. **Never Recommend Zero or Negative Balance**:
   Only batches with positive available stock on hand are candidates.
3. **Quarantine Exclusion**:
   Batches in `QUARANTINED` or `DEPLETED` status are excluded.
4. **No Side-Effects During Preview**:
   FEFO recommendation is an analytical query. It DOES NOT reserve, lock, or decrement inventory.

---

## 2. Sorting & Tie-Breaking Rules
Eligible candidate batches are sorted using the following strict deterministic order:
1. **Primary Sort**: `expiryDate` ASC (earliest expiration first).
2. **Secondary Sort**: `manufacturingDate` ASC (older stock first if expiry dates are identical).
3. **Tertiary Sort**: `batchNumber` ASC (lexicographical tie-break).
4. **Quaternary Sort**: `id` ASC (database primary key stability).

---

## 3. Multi-Batch Splitting Algorithm
When the requested quantity exceeds the stock available in the earliest batch, the algorithm automatically splits the allocation across subsequent eligible batches until the requirement is satisfied or available stock is exhausted.

### Algorithmic Definition
```typescript
interface BatchCandidate {
  batchId: string;
  batchNumber: string;
  expiryDate: string | Date;
  availableQuantity: number;
  mrp: number;
  sellingPrice: number;
}

function recommendBatchAllocation(
  candidates: BatchCandidate[],
  requestedQuantity: number,
  referenceDate: Date = new Date()
): {
  isFullyAllocated: boolean;
  totalAllocated: number;
  shortageQuantity: number;
  allocations: Array<{
    batchId: string;
    batchNumber: string;
    allocatedQuantity: number;
    remainingBatchQuantity: number;
    expiryDate: string;
    sellingPrice: number;
  }>;
}
```

### Allocation Step Walkthrough
Suppose a customer requires **150 tablets** of Medicine X:
- **Batch B1**: Expiry: `2026-12-31`, Available: `100` units.
- **Batch B2**: Expiry: `2027-06-30`, Available: `80` units.
- **Batch B3**: Expiry: `2026-05-01` (Expired), Available: `50` units.

1. **Filter**: Batch B3 is expired $\rightarrow$ Excluded.
2. **Sort**: B1 (`2026-12-31`) precedes B2 (`2027-06-30`).
3. **Allocate B1**: Takes all `100` units. Remaining needed = `50`. Remaining in B1 = `0`.
4. **Allocate B2**: Takes `50` units. Remaining needed = `0`. Remaining in B2 = `30`.
5. **Result**: `isFullyAllocated = true`, `totalAllocated = 150`, `shortageQuantity = 0`.

---

## 4. API Endpoints
- **Preview Endpoint**: `GET /api/v1/fefo/preview?medicineId=<UUID>&quantity=<number>`
- **Response**:
```json
{
  "success": true,
  "data": {
    "medicineId": "...",
    "requestedQuantity": 150,
    "allocatedQuantity": 150,
    "unallocatedQuantity": 0,
    "isFullyAllocated": true,
    "allocations": [
      {
        "batchId": "...",
        "batchNumber": "BATCH-001",
        "allocatedQuantity": 100,
        "remainingStock": 0,
        "expiryDate": "2026-12-31"
      },
      {
        "batchId": "...",
        "batchNumber": "BATCH-002",
        "allocatedQuantity": 50,
        "remainingStock": 30,
        "expiryDate": "2027-06-30"
      }
    ]
  }
}
```
