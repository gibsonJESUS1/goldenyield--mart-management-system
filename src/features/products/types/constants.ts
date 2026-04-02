import type { OwnerId } from "./product";

export const OWNERS: { id: OwnerId; name: string }[] = [
  { id: "owner_you", name: "You" },
  { id: "owner_wife", name: "Wife" },
  { id: "owner_mum", name: "Mum" },
];

export const CATEGORIES = [
  "Farm Produce",
  "Provisions",
  "Protein",
  "Drinks",
  "Water",
  "Automotive",
  "Grains",
  "Milk",
  "Seasoning",
  "Oil",
];

export const UNITS = [
  "Pieces",
  "Kg",
  "Bag",
  "Bottle",
  "Sachet",
  "Roll",
  "Pack",
  "Paint Bucket",
  "Cup",
  "Keg",
];
