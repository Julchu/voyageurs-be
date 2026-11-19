# Trips API

`/trips` stores the signed-in user's trips. Every PATCH sends the trip's current `version`: a stale one returns 409 and saves nothing. Each save runs in one transaction while holding the trip's row lock.

## Model

- **Place** (`trip_places`): a destination, once per trip, keyed by Mapbox ID or `lat,lng`. Every stop there shares its details.
- **Stop** (`trip_stops`): one row in the trip list, pointing at a place. Several stops can share one place.

Responses are `TripDto`: `places` (those with at least one stop, in trip order) and `stops` (place fields copied in, plus `placeId`). Create and PATCH also return `stopIdMap: { [clientId]: publicId }` for the stops they created. Never match new stops by array index.

## Save scopes

Each page saves on its own, so a PATCH `/trips/:publicId` holds one scope:

```ts
// Drawer: the name and/or the full stop list (array order sets positions)
{ version, name?, stops? }

// Calendar: dates, every visit, changed open hours (per stop), copies, and the full order.
// Temporary copy IDs may appear anywhere a stop ID does.
{ version, calendar: {
  startDate, endDate,
  visits: [{ stopId, date, startMinute, endMinute, locked }],
  availability: [{ publicId, availability: [{ day, startMinute, endMinute }] }],
  newStops: [{ clientId, sourceStopId }],
  order: [stopId, ...],
} }
```

Stops without a `publicId` are added (reusing the trip's place with the same key); saved stops missing from the list are removed.

## Calendar rules

The frontend plans moves; the backend only checks the result (`trip.schedule.ts`).

- A stop has at most one visit, stored on the stop row. `visits[].id` is the stop ID. For another visit to the same place, duplicate the stop (`newStops`): the copy shares the place, so it keeps its details and open hours.
- Visits sit inside one trip day in 30-minute steps, inside the place's open hours, without overlapping. Times are destination-local; weekdays run Sunday (0) to Saturday (6). Empty open hours mean open anytime.
- Scheduled stops stay in time order in the list. Drawer and calendar saves both check this; unscheduled stops can sit anywhere.
- A reserved (`locked`) visit keeps its time until unreserved. Removing it is allowed.
- Trip dates are both set or both empty, up to 366 days. Deleting a stop deletes its visit.
