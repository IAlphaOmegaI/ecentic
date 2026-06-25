import { al } from "./countries/al";
import { de } from "./countries/de";
import { gb } from "./countries/gb";
import { us } from "./countries/us";

export type Countries = [typeof al, typeof de, typeof gb, typeof us];
export type Country = Countries[number];

export const countries: Countries = [al, de, gb, us] as const;
