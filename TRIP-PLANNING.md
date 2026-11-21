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
```

Stops without a `publicId` are added (reusing the trip's place with the same key); saved stops missing from the list are removed.
