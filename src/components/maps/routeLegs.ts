/**
 * The route split into one drawable line per leg, so each can take the colour of the stop it leaves.
 *
 * The router's own leg geometry is used when it lines up with the stops. Until it answers - and if
 * it never does - the stops are joined by straight lines instead, so a map is never an empty tile
 * grid and the colours still read correctly.
 */
export const routeLegs = (positions: [number, number][], legs: [number, number][][]): [number, number][][] => {
  if (positions.length < 2) return [];
  const usable = legs.length === positions.length - 1 && legs.every((leg) => leg.length >= 2);
  return usable ? legs : positions.slice(1).map((position, index) => [positions[index], position]);
};
