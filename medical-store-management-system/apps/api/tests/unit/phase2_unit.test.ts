import { describe, it, expect } from 'vitest';
import {
  CreateMedicineSchema,
  CreateBatchSchema,
  CreateAdjustmentSchema,
  CreateTransferSchema,
  CreateStockCountSessionSchema,
  RecordStockCountItemSchema,
  parseDateLabelToCalendarEnd,
} from '@medstore/shared';
import { fefoEngine } from '../../src/modules/fefo/fefo.service.js';

describe('Phase 2 Unit Tests — Domain Logic & Validation', () => {
  describe('Medicine Validation Schema', () => {
    it('validates a correct medicine input', () => {
      const valid = {
        sku: 'MED-PARA-500',
        brandName: 'Dolo 650',
        genericName: 'Paracetamol',
        baseUnit: 'TABLET',
        packUnit: 'STRIP',
        unitsPerPack: 15,
        minStockLevel: 50,
        gstRate: 12.0,
        prescriptionRequired: false,
      };
      const result = CreateMedicineSchema.safeParse(valid);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sku).toBe('MED-PARA-500');
        expect(result.data.unitsPerPack).toBe(15);
      }
    });

    it('rejects empty brandName and invalid SKU format', () => {
      const invalid = {
        sku: 'M', // too short (<2)
        brandName: '', // empty (<2)
        genericName: 'Paracetamol',
      };
      const result = CreateMedicineSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('rejects negative unitsPerPack or negative minStockLevel', () => {
      const invalid = {
        sku: 'MED-TEST-01',
        brandName: 'Test Brand',
        genericName: 'Test Generic',
        unitsPerPack: -10,
        minStockLevel: -5,
      };
      const result = CreateMedicineSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('Batch Validation Schema & Expiry Date Rules', () => {
    it('validates a valid batch', () => {
      const valid = {
        medicineId: '123e4567-e89b-12d3-a456-426614174000',
        batchNumber: 'BATCH-2026-X1',
        manufacturingDate: '2026-01-01',
        expiryDate: '2027-01-01',
        mrp: 50.0,
        purchasePrice: 35.0,
        sellingPrice: 48.0,
        packConversionFactor: 1,
      };
      const result = CreateBatchSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('rejects batch where manufacturingDate is after expiryDate', () => {
      const invalid = {
        medicineId: '123e4567-e89b-12d3-a456-426614174000',
        batchNumber: 'BATCH-INVALID',
        manufacturingDate: '2027-05-01',
        expiryDate: '2026-01-01', // Before mfgDate
        mrp: 50.0,
        purchasePrice: 35.0,
        sellingPrice: 45.0,
      };
      const result = CreateBatchSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('rejects negative pricing values', () => {
      const invalid = {
        medicineId: '123e4567-e89b-12d3-a456-426614174000',
        batchNumber: 'BATCH-NEG-PRICE',
        manufacturingDate: '2026-01-01',
        expiryDate: '2027-01-01',
        mrp: -10,
        purchasePrice: -5,
        sellingPrice: 40,
      };
      const result = CreateBatchSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('correctly normalizes MM/YYYY manufacturer labels to calendar end in Asia/Kolkata timezone', () => {
      // Leap year February test
      const leapFeb = parseDateLabelToCalendarEnd('02/2028');
      expect(leapFeb).toBe('2028-02-29');

      // Non-leap year February test
      const nonLeapFeb = parseDateLabelToCalendarEnd('02/2027');
      expect(nonLeapFeb).toBe('2027-02-28');

      // 30-day month test
      const april = parseDateLabelToCalendarEnd('04/2026');
      expect(april).toBe('2026-04-30');

      // 31-day month test
      const dec = parseDateLabelToCalendarEnd('12/2026');
      expect(dec).toBe('2026-12-31');
    });
  });

  describe('FEFO Engine (First Expiry, First Out) Logic', () => {
    const candidateBatches = [
      {
        batchId: 'batch-exp-2026-08',
        batchNumber: 'B-AUG26',
        expiryDate: '2026-08-15',
        availableQuantity: 50,
        mrp: 100,
        sellingPrice: 95,
        locationId: 'loc-1',
        locationName: 'Shelf A1',
      },
      {
        batchId: 'batch-exp-2026-12',
        batchNumber: 'B-DEC26',
        expiryDate: '2026-12-31',
        availableQuantity: 100,
        mrp: 100,
        sellingPrice: 95,
        locationId: 'loc-1',
        locationName: 'Shelf A1',
      },
      {
        batchId: 'batch-exp-2026-05',
        batchNumber: 'B-MAY26',
        expiryDate: '2026-05-30',
        availableQuantity: 30,
        mrp: 100,
        sellingPrice: 95,
        locationId: 'loc-1',
        locationName: 'Shelf A1',
      },
      {
        batchId: 'batch-zero-stock',
        batchNumber: 'B-ZERO',
        expiryDate: '2026-04-01',
        availableQuantity: 0, // Zero stock
        mrp: 100,
        sellingPrice: 95,
        locationId: 'loc-1',
        locationName: 'Shelf A1',
      },
      {
        batchId: 'batch-already-expired',
        batchNumber: 'B-EXPIRED',
        expiryDate: '2026-01-01', // Already expired as of 2026-11
        availableQuantity: 200,
        mrp: 100,
        sellingPrice: 95,
        locationId: 'loc-1',
        locationName: 'Shelf A1',
      },
    ];

    it('allocates strictly from earliest non-expired batch with available stock', () => {
      const today = '2026-04-15';
      const result = fefoEngine.recommendBatchAllocation(
        candidateBatches,
        40, // requested quantity
        today
      );

      expect(result.fulfilled).toBe(true);
      expect(result.shortage).toBe(0);
      expect(result.allocations.length).toBe(2);

      // Earliest is B-MAY26 (avail: 30), takes full 30
      expect(result.allocations[0].batchNumber).toBe('B-MAY26');
      expect(result.allocations[0].allocatedQuantity).toBe(30);

      // Next is B-AUG26 (avail: 50), takes remaining 10
      expect(result.allocations[1].batchNumber).toBe('B-AUG26');
      expect(result.allocations[1].allocatedQuantity).toBe(10);
    });

    it('strictly excludes zero-stock and expired batches from allocation', () => {
      const today = '2026-06-01'; // B-MAY26 is now expired
      const result = fefoEngine.recommendBatchAllocation(
        candidateBatches,
        100,
        today
      );

      // B-MAY26, B-ZERO, and B-EXPIRED must not appear in allocations
      const allocatedBatchNumbers = result.allocations.map((a) => a.batchNumber);
      expect(allocatedBatchNumbers).not.toContain('B-MAY26');
      expect(allocatedBatchNumbers).not.toContain('B-ZERO');
      expect(allocatedBatchNumbers).not.toContain('B-EXPIRED');

      // First allocated should be B-AUG26 (50), followed by B-DEC26 (50)
      expect(result.allocations[0].batchNumber).toBe('B-AUG26');
      expect(result.allocations[0].allocatedQuantity).toBe(50);
      expect(result.allocations[1].batchNumber).toBe('B-DEC26');
      expect(result.allocations[1].allocatedQuantity).toBe(50);
      expect(result.fulfilled).toBe(true);
    });

    it('returns partial allocation and reports shortage when requested quantity exceeds available stock', () => {
      const today = '2026-04-15';
      const result = fefoEngine.recommendBatchAllocation(
        candidateBatches,
        500, // Total available across eligible batches is 30 + 50 + 100 = 180
        today
      );

      expect(result.fulfilled).toBe(false);
      expect(result.allocatedTotal).toBe(180);
      expect(result.shortage).toBe(320);
    });
  });

  describe('Stock Operations & Movement Validation', () => {
    it('validates Stock Adjustment schema', () => {
      const valid = {
        batchId: '123e4567-e89b-12d3-a456-426614174000',
        locationId: '123e4567-e89b-12d3-a456-426614174001',
        adjustmentType: 'INCREASE',
        quantity: 25,
        reason: 'Surplus found during internal audit',
      };
      const result = CreateAdjustmentSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('rejects Stock Transfer when quantity is zero or negative', () => {
      const invalid = {
        batchId: '123e4567-e89b-12d3-a456-426614174000',
        sourceLocationId: '123e4567-e89b-12d3-a456-426614174001',
        destinationLocationId: '123e4567-e89b-12d3-a456-426614174002',
        quantity: 0,
        reason: 'Relocating to refrigerator',
      };
      const result = CreateTransferSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('validates Physical Stock Count session and variance item', () => {
      const sessionValid = {
        locationId: '123e4567-e89b-12d3-a456-426614174001',
        notes: 'Monthly physical verification Shelf B2',
      };
      expect(CreateStockCountSessionSchema.safeParse(sessionValid).success).toBe(true);

      const itemsValid = {
        items: [
          {
            medicineId: '123e4567-e89b-12d3-a456-426614174099',
            batchId: '123e4567-e89b-12d3-a456-426614174000',
            countedQuantity: 95,
            notes: '5 units missing due to leakage',
          },
        ],
      };
      expect(RecordStockCountItemSchema.safeParse(itemsValid).success).toBe(true);
    });
  });
});
