export const normalizePhone = (value: string): string => {
  return value.replace(/\D/g, "").replace(/^0+/, ""); // Remove all non-digit characters and all leading zeros
};
