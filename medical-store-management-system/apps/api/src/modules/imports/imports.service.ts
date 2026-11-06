import { prisma } from '../../config/database.js';
import { ValidationError, ConflictError } from '../../utils/errors.js';
import { auditService } from '../audit/audit.service.js';
import { inventoryService } from '../inventory/inventory.service.js';
import { AuditAction } from '@medstore/shared';

export interface MedicineCsvRow {
  sku: string;
  brandName: string;
  genericName: string;
  categoryCode?: string;
  manufacturerCode?: string;
  dosageFormCode?: string;
  baseUnit?: string;
  packUnit?: string;
  unitsPerPack?: number;
  minStockLevel?: number;
  gstRate?: number;
  prescriptionRequired?: boolean;
}

export interface RowError {
  row: number;
  sku?: string;
  errors: string[];
}

export class ImportsService {
  /**
   * Safe CSV parser supporting quoted strings and commas.
   */
  parseCsv(text: string): string[][] {
    const lines: string[][] = [];
    const rawLines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);

    for (const rawLine of rawLines) {
      const row: string[] = [];
      let inQuotes = false;
      let currentVal = '';

      for (let i = 0; i < rawLine.length; i++) {
        const char = rawLine[i];
        if (char === '"') {
          if (inQuotes && rawLine[i + 1] === '"') {
            currentVal += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          row.push(currentVal.trim());
          currentVal = '';
        } else {
          currentVal += char;
        }
      }
      row.push(currentVal.trim());
      lines.push(row);
    }

    return lines;
  }

  /**
   * Sanitizes text to prevent CSV formula injection (DDE / CSV injection in Excel/Calc).
   */
  sanitizeCsvCell(val: unknown): string {
    if (val === null || val === undefined) return '';
    let str = String(val).trim();
    if (/^[=+\-@\t\r]/.test(str)) {
      str = `'${str}`;
    }
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      str = `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  async previewMedicinesCsv(csvText: string) {
    const rows = this.parseCsv(csvText);
    if (rows.length < 2) {
      throw new ValidationError('CSV must contain a header row and at least one data row');
    }

    const headers = rows[0]!.map((h) => h.toLowerCase().trim());
    const skuIdx = headers.indexOf('sku');
    const brandIdx = headers.indexOf('brandname');
    const genericIdx = headers.indexOf('genericname');
    const catIdx = headers.indexOf('categorycode');
    const mfgIdx = headers.indexOf('manufacturercode');
    const dfIdx = headers.indexOf('dosageformcode');
    const baseUnitIdx = headers.indexOf('baseunit');
    const packUnitIdx = headers.indexOf('packunit');
    const unitsPerPackIdx = headers.indexOf('unitsperpack');
    const minStockIdx = headers.indexOf('minstocklevel');
    const gstIdx = headers.indexOf('gstrate');

    if (skuIdx === -1 || brandIdx === -1 || genericIdx === -1) {
      throw new ValidationError(
        'Missing required CSV columns: sku, brandName, and genericName are mandatory',
      );
    }

    // Preload reference tables for fast lookups
    const [categories, manufacturers, dosageForms, existingMedicines] = await Promise.all([
      prisma.medicineCategory.findMany(),
      prisma.manufacturer.findMany(),
      prisma.dosageForm.findMany(),
      prisma.medicine.findMany({ select: { sku: true } }),
    ]);

    const catMap = new Map(categories.map((c) => [c.code.toUpperCase(), c.id]));
    const mfgMap = new Map(manufacturers.map((m) => [m.code.toUpperCase(), m.id]));
    const dfMap = new Map(dosageForms.map((d) => [d.code.toUpperCase(), d.id]));
    const existingSkuSet = new Set(existingMedicines.map((m) => m.sku.toUpperCase()));

    const seenSkusInFile = new Set<string>();
    const validRows: any[] = [];
    const invalidRows: RowError[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i]!;
      const rowNum = i + 1;
      const errors: string[] = [];

      const sku = row[skuIdx]?.trim().toUpperCase() || '';
      const brandName = row[brandIdx]?.trim() || '';
      const genericName = row[genericIdx]?.trim() || '';

      if (!sku) errors.push('SKU is required');
      if (!brandName) errors.push('Brand name is required');
      if (!genericName) errors.push('Generic name is required');

      if (sku) {
        if (existingSkuSet.has(sku)) {
          errors.push(`SKU "${sku}" already exists in the database`);
        }
        if (seenSkusInFile.has(sku)) {
          errors.push(`Duplicate SKU "${sku}" found within this file`);
        }
        seenSkusInFile.add(sku);
      }

      let categoryId: number | null = null;
      if (catIdx !== -1 && row[catIdx]?.trim()) {
        const code = row[catIdx]!.trim().toUpperCase();
        if (catMap.has(code)) {
          categoryId = catMap.get(code)!;
        } else {
          errors.push(`Category code "${code}" not found`);
        }
      }

      let manufacturerId: number | null = null;
      if (mfgIdx !== -1 && row[mfgIdx]?.trim()) {
        const code = row[mfgIdx]!.trim().toUpperCase();
        if (mfgMap.has(code)) {
          manufacturerId = mfgMap.get(code)!;
        } else {
          errors.push(`Manufacturer code "${code}" not found`);
        }
      }

      let dosageFormId: number | null = null;
      if (dfIdx !== -1 && row[dfIdx]?.trim()) {
        const code = row[dfIdx]!.trim().toUpperCase();
        if (dfMap.has(code)) {
          dosageFormId = dfMap.get(code)!;
        } else {
          errors.push(`Dosage form code "${code}" not found`);
        }
      }

      const baseUnit = baseUnitIdx !== -1 && row[baseUnitIdx]?.trim() ? row[baseUnitIdx]!.trim().toUpperCase() : 'TABLET';
      const packUnit = packUnitIdx !== -1 && row[packUnitIdx]?.trim() ? row[packUnitIdx]!.trim().toUpperCase() : 'STRIP';
      const unitsPerPack = unitsPerPackIdx !== -1 && !isNaN(Number(row[unitsPerPackIdx])) ? Number(row[unitsPerPackIdx]) : 10.0;
      const minStockLevel = minStockIdx !== -1 && !isNaN(Number(row[minStockIdx])) ? Number(row[minStockIdx]) : 10.0;
      const gstRate = gstIdx !== -1 && !isNaN(Number(row[gstIdx])) ? Number(row[gstIdx]) : 12.0;

      if (errors.length > 0) {
        invalidRows.push({ row: rowNum, sku, errors });
      } else {
        validRows.push({
          sku,
          brandName,
          genericName,
          displayName: `${brandName} (${genericName})`,
          categoryId,
          manufacturerId,
          dosageFormId,
          baseUnit,
          packUnit,
          unitsPerPack,
          minStockLevel,
          gstRate,
        });
      }
    }

    return {
      totalRows: rows.length - 1,
      validCount: validRows.length,
      invalidCount: invalidRows.length,
      canCommit: invalidRows.length === 0 && validRows.length > 0,
      validRows,
      invalidRows,
    };
  }

  async commitMedicines(validRows: any[], actorId?: string) {
    if (!validRows || validRows.length === 0) {
      throw new ValidationError('No valid rows to commit');
    }

    const createdMedicines = await prisma.$transaction(async (tx) => {
      const results = [];
      for (const row of validRows) {
        const m = await tx.medicine.create({
          data: {
            sku: row.sku,
            brandName: row.brandName,
            genericName: row.genericName,
            displayName: row.displayName,
            categoryId: row.categoryId,
            manufacturerId: row.manufacturerId,
            dosageFormId: row.dosageFormId,
            baseUnit: row.baseUnit,
            packUnit: row.packUnit,
            unitsPerPack: row.unitsPerPack,
            minStockLevel: row.minStockLevel,
            gstRate: row.gstRate,
            createdById: actorId,
          },
        });
        results.push(m);
      }
      return results;
    });

    await auditService.log({
      actorId,
      action: AuditAction.DATA_IMPORTED,
      entityType: 'Medicine',
      newState: { importedCount: createdMedicines.length },
    });

    return {
      success: true,
      importedCount: createdMedicines.length,
    };
  }

  async exportInventoryCsv(): Promise<string> {
    const balances = await prisma.stockBalance.findMany({
      include: {
        medicine: {
          include: {
            category: true,
            manufacturer: true,
            dosageForm: true,
          },
        },
        batch: true,
        location: true,
      },
      orderBy: [{ medicine: { brandName: 'asc' } }, { batch: { expiryDate: 'asc' } }],
    });

    const headers = [
      'SKU',
      'Brand Name',
      'Generic Name',
      'Category',
      'Manufacturer',
      'Dosage Form',
      'Batch Number',
      'Mfg Date',
      'Expiry Date',
      'Location Code',
      'Location Name',
      'Quantity On Hand',
      'Base Unit',
      'MRP (INR)',
      'Purchase Price (INR)',
      'Selling Price (INR)',
      'Batch Status',
    ];

    const lines: string[] = [headers.join(',')];

    for (const b of balances) {
      const row = [
        this.sanitizeCsvCell(b.medicine.sku),
        this.sanitizeCsvCell(b.medicine.brandName),
        this.sanitizeCsvCell(b.medicine.genericName),
        this.sanitizeCsvCell(b.medicine.category?.name || ''),
        this.sanitizeCsvCell(b.medicine.manufacturer?.name || ''),
        this.sanitizeCsvCell(b.medicine.dosageForm?.name || ''),
        this.sanitizeCsvCell(b.batch.batchNumber),
        this.sanitizeCsvCell(b.batch.manufacturingDate.toISOString().split('T')[0]),
        this.sanitizeCsvCell(b.batch.expiryDate.toISOString().split('T')[0]),
        this.sanitizeCsvCell(b.location.code),
        this.sanitizeCsvCell(b.location.name),
        this.sanitizeCsvCell(Number(b.quantityOnHand)),
        this.sanitizeCsvCell(b.medicine.baseUnit),
        this.sanitizeCsvCell(Number(b.batch.mrp)),
        this.sanitizeCsvCell(Number(b.batch.purchasePrice)),
        this.sanitizeCsvCell(Number(b.batch.sellingPrice)),
        this.sanitizeCsvCell(b.batch.status),
      ];
      lines.push(row.join(','));
    }

    return lines.join('\n');
  }
}

export const importsService = new ImportsService();
