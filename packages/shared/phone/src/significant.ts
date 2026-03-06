import { type Country, countries } from "./country";

export const getSignificantNumber = (
  phone: string,
  countryCode: Country["iso"],
): string | null => {
  // biome-ignore lint/style/noNonNullAssertion: if given a valid country code, the config will always be found
  const config = countries.find((country) => country.iso === countryCode)!;

  return config.getSignificantNumber(phone);
};
