import { z } from "zod";
import { ObjectId } from "mongodb";

export const StringObjectId = z
  .string()
  .transform((s) => new ObjectId(s))
  .pipe(z.instanceof(ObjectId));
