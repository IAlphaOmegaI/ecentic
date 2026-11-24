"use server";

import * as Checks from "./recharge-offer-check";

export const request = async (input: { store: string }) =>
  Checks.request(input);
