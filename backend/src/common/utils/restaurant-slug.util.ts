import { PrismaService } from '../../prisma/prisma.service';

export function slugifyRestaurantName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

export async function generateUniqueRestaurantSlug(
  prisma: PrismaService,
  name: string,
  excludeId?: number,
): Promise<string> {
  const base = slugifyRestaurantName(name) || 'restaurant';
  let candidate = base;
  let suffix = 2;

  while (true) {
    const existing = await prisma.restaurant.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });

    if (!existing || (excludeId !== undefined && existing.id === excludeId)) {
      return candidate;
    }

    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
}
