
export function getDistanceKm(lat1, lng1, lat2, lng2) {
  return calculateGroundDistance(lat1, lng1, lat2, lng2).groundDistance;
}

export function getAerialDistanceKm(lat1, lng1, lat2, lng2) {
  return calculateGroundDistance(lat1, lng1, lat2, lng2).aerialDistance;
}

function calculateGroundDistance(
    sourceLat,
    sourceLon,
    destinationLat,
    destinationLon,
    factor = 1.22
) {
    const R = 6371; // Earth radius in KM

    const toRadians = (degree) => degree * Math.PI / 180;

    const lat1 = toRadians(sourceLat);
    const lat2 = toRadians(destinationLat);

    const dLat = toRadians(destinationLat - sourceLat);
    const dLon = toRadians(destinationLon - sourceLon);

    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1) *
        Math.cos(lat2) *
        Math.sin(dLon / 2) ** 2;

    const c = 2 * Math.atan2(
        Math.sqrt(a),
        Math.sqrt(1 - a)
    );

    const aerialDistance = R * c;

    const groundDistance = aerialDistance * factor;

    return {
        aerialDistance: Number(aerialDistance.toFixed(2)),
        groundDistance: Number(groundDistance.toFixed(2))
    };
}
