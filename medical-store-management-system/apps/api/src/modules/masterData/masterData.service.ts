import { prisma } from '../../config/database.js';
import { ConflictError, NotFoundError } from '../../utils/errors.js';
import type {
  CreateCategoryInput,
  UpdateCategoryInput,
  CreateManufacturerInput,
  UpdateManufacturerInput,
  CreateDosageFormInput,
  CreateAdministrationRouteInput,
  CreateMeasurementUnitInput,
  CreateCompositionInput,
} from '@medstore/shared';

export class MasterDataService {
  // ─── Categories ─────────────────────────────────────────────────────────────
  async listCategories(includeInactive = false) {
    return prisma.medicineCategory.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async getCategoryById(id: number) {
    const cat = await prisma.medicineCategory.findUnique({ where: { id } });
    if (!cat) throw new NotFoundError('Category not found');
    return cat;
  }

  async createCategory(input: CreateCategoryInput) {
    const existing = await prisma.medicineCategory.findFirst({
      where: { OR: [{ code: input.code }, { name: input.name }] },
    });
    if (existing) {
      throw new ConflictError(
        existing.code === input.code
          ? `Category with code "${input.code}" already exists`
          : `Category with name "${input.name}" already exists`,
      );
    }
    return prisma.medicineCategory.create({ data: input });
  }

  async updateCategory(id: number, input: UpdateCategoryInput) {
    await this.getCategoryById(id);
    if (input.code || input.name) {
      const existing = await prisma.medicineCategory.findFirst({
        where: {
          AND: [
            { id: { not: id } },
            { OR: [{ code: input.code }, { name: input.name }] },
          ],
        },
      });
      if (existing) throw new ConflictError('Category name or code already in use');
    }
    return prisma.medicineCategory.update({
      where: { id },
      data: input,
    });
  }

  // ─── Manufacturers ──────────────────────────────────────────────────────────
  async listManufacturers(includeInactive = false) {
    return prisma.manufacturer.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async getManufacturerById(id: number) {
    const mfg = await prisma.manufacturer.findUnique({ where: { id } });
    if (!mfg) throw new NotFoundError('Manufacturer not found');
    return mfg;
  }

  async createManufacturer(input: CreateManufacturerInput) {
    const existing = await prisma.manufacturer.findFirst({
      where: { OR: [{ code: input.code }, { name: input.name }] },
    });
    if (existing) {
      throw new ConflictError(
        existing.code === input.code
          ? `Manufacturer with code "${input.code}" already exists`
          : `Manufacturer with name "${input.name}" already exists`,
      );
    }
    return prisma.manufacturer.create({ data: input });
  }

  async updateManufacturer(id: number, input: UpdateManufacturerInput) {
    await this.getManufacturerById(id);
    if (input.code || input.name) {
      const existing = await prisma.manufacturer.findFirst({
        where: {
          AND: [
            { id: { not: id } },
            { OR: [{ code: input.code }, { name: input.name }] },
          ],
        },
      });
      if (existing) throw new ConflictError('Manufacturer name or code already in use');
    }
    return prisma.manufacturer.update({
      where: { id },
      data: input,
    });
  }

  // ─── Dosage Forms ───────────────────────────────────────────────────────────
  async listDosageForms() {
    return prisma.dosageForm.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async createDosageForm(input: CreateDosageFormInput) {
    const existing = await prisma.dosageForm.findFirst({
      where: { OR: [{ code: input.code }, { name: input.name }] },
    });
    if (existing) throw new ConflictError('Dosage form with this code or name already exists');
    return prisma.dosageForm.create({ data: input });
  }

  // ─── Administration Routes ──────────────────────────────────────────────────
  async listAdministrationRoutes() {
    return prisma.administrationRoute.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async createAdministrationRoute(input: CreateAdministrationRouteInput) {
    const existing = await prisma.administrationRoute.findFirst({
      where: { OR: [{ code: input.code }, { name: input.name }] },
    });
    if (existing) throw new ConflictError('Administration route with this code or name already exists');
    return prisma.administrationRoute.create({ data: input });
  }

  // ─── Measurement Units ──────────────────────────────────────────────────────
  async listMeasurementUnits() {
    return prisma.measurementUnit.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async createMeasurementUnit(input: CreateMeasurementUnitInput) {
    const existing = await prisma.measurementUnit.findFirst({
      where: { OR: [{ symbol: input.symbol }, { name: input.name }] },
    });
    if (existing) throw new ConflictError('Measurement unit with this symbol or name already exists');
    return prisma.measurementUnit.create({ data: input });
  }

  // ─── Compositions ───────────────────────────────────────────────────────────
  async listCompositions(search?: string) {
    return prisma.composition.findMany({
      where: {
        isActive: true,
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { name: 'asc' },
      take: 100,
    });
  }

  async createComposition(input: CreateCompositionInput) {
    const existing = await prisma.composition.findFirst({
      where: { name: { equals: input.name, mode: 'insensitive' } },
    });
    if (existing) throw new ConflictError(`Composition "${input.name}" already exists`);
    return prisma.composition.create({ data: input });
  }
}

export const masterDataService = new MasterDataService();
