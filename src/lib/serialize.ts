import { ObjectId } from "mongodb";

/** Maps a Mongo document's `_id` to a plain `id: string`, dropping `_id` and `userId` from the response. */
export function withId<T extends { _id: ObjectId; userId?: ObjectId }>(doc: T) {
  const { _id, userId, ...rest } = doc;

  return { id: _id.toString(), ...rest };
}

/** Parses a route `:id` param into an ObjectId, or returns null for a missing/invalid id. */
export function parseId(id: string | string[] | undefined): ObjectId | null {
  if (typeof id !== "string") return null;
  return ObjectId.isValid(id) ? new ObjectId(id) : null;
}
