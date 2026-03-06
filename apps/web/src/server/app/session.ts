"use server";
import type { schema } from "../database";
import type { Document } from "../utils/repository";

export type Type = Document<typeof schema.session>;
