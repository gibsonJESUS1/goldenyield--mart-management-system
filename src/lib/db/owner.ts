import { prisma } from "@/lib/prisma";

export async function getOwners() {
  return prisma.owner.findMany({
    orderBy: { createdAt: "desc" },
  });
}

export async function createOwner(name: string, role?: string) {
  return prisma.owner.create({
    data: {
      name,
      role,
    },
  });
}

export async function updateOwner(id: string, name: string, role?: string) {
  return prisma.owner.update({
    where: { id },
    data: {
      name,
      role,
    },
  });
}
