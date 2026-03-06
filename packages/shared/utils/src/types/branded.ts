export type Branded<Brand extends string, T = string> = T & {
  "~brand": Brand;
};
