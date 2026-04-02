import { prisma } from "../src/lib/prisma";

async function main() {
  await prisma.owner.createMany({
    data: [
      { name: "You", role: "Main Owner" },
      { name: "Wife", role: "Provision Owner" },
      { name: "Mum", role: "Drinks & Extras Owner" },
    ],
    skipDuplicates: true,
  });

  await prisma.category.createMany({
    data: [
      {
        name: "Farm Produce",
        slug: "farm-produce",
        description: "Fresh and processed farm goods",
      },
      {
        name: "Provisions",
        slug: "provisions",
        description: "Packaged grocery and provisions",
      },
      {
        name: "Protein",
        slug: "protein",
        description: "Fish, bush meat, pork and related products",
      },
      {
        name: "Drinks",
        slug: "drinks",
        description: "Soft drinks and beverages",
      },
      { name: "Water", slug: "water", description: "Water products" },
      {
        name: "Oil",
        slug: "oil",
        description: "Cooking and palm oil products",
      },
      { name: "Milk", slug: "milk", description: "Milk products" },
      {
        name: "Seasoning",
        slug: "seasoning",
        description: "Maggi, salt, seasoning items",
      },
      {
        name: "Grains",
        slug: "grains",
        description: "Beans, rice, maize and related goods",
      },
      {
        name: "Automotive",
        slug: "automotive",
        description: "Engine oil and related products",
      },
    ],
    skipDuplicates: true,
  });

  await prisma.productUnit.createMany({
    data: [
      { name: "Pieces", symbol: "pcs" },
      { name: "Kg", symbol: "kg" },
      { name: "Bag", symbol: "bag" },
      { name: "Bottle", symbol: "bt" },
      { name: "Sachet", symbol: "sct" },
      { name: "Roll", symbol: "roll" },
      { name: "Pack", symbol: "pk" },
      { name: "Paint Bucket", symbol: "pb" },
      { name: "Cup", symbol: "cup" },
      { name: "Keg", symbol: "keg" },
    ],
    skipDuplicates: true,
  });

  console.log("Seed complete");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
