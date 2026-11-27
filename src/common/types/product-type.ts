export const ProductType = {
  PHYSICAL: 'PHYSICAL',
  DIGITAL: 'DIGITAL',
  SUBSCRIPTION: 'SUBSCRIPTION',
} as const;

export type ProductType = (typeof ProductType)[keyof typeof ProductType];
