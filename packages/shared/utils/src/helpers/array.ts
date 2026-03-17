export const unique = <T>(array: T[]): T[] => [...new Set(array)];

export const head = <T>(array: T[]): T | undefined => array[0];
export const tail = <T>(array: T[]): T[] => {
  const [, ...rest] = array;
  return rest;
};
