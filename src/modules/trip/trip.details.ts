import { badRequest } from "../../lib/errors.ts";
import { type Tx, updatePlaceDetails } from "./trip.queries.ts";
import type { SaveResult } from "./trip.service.ts";
import type { PlaceDetailsInput } from "./trip.validation.ts";

/** The stops table saves details per place, so every stop there shows them. */
export const savePlaceDetails = async (
  tx: Tx,
  tripId: number,
  places: PlaceDetailsInput,
): Promise<SaveResult> => {
  const updated = await updatePlaceDetails(tx, tripId, places);
  if (updated !== places.length) throw badRequest("A place does not belong to this trip");
  return {};
};
