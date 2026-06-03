import vehiclePhotoFallback from '../assets/real/verified_vehicle_clean.png';

export const LUSAKA_CENTER = [-15.4167, 28.2833];
export const OPERATIONAL_REFRESH_MS = 7000;

const ROUTES = [
  {
    id: 'matero-town',
    routeName: 'Matero → Town',
    coordinates: [
      [-15.3728, 28.2476],
      [-15.3814, 28.255],
      [-15.3896, 28.2628],
      [-15.3986, 28.2708],
      [-15.4078, 28.2778],
      [-15.4168, 28.2829],
    ],
    color: '#168a45',
  },
  {
    id: 'kanyama-town',
    routeName: 'Kanyama → Town',
    coordinates: [
      [-15.4414, 28.2484],
      [-15.4353, 28.2544],
      [-15.4284, 28.2623],
      [-15.4212, 28.2702],
      [-15.4162, 28.2778],
      [-15.4128, 28.2842],
    ],
    color: '#1f8f4a',
  },
  {
    id: 'chelstone-town',
    routeName: 'Chelstone → Town',
    coordinates: [
      [-15.3564, 28.3274],
      [-15.364, 28.3205],
      [-15.3722, 28.3123],
      [-15.3812, 28.3031],
      [-15.3912, 28.2946],
      [-15.401, 28.2875],
      [-15.4098, 28.2827],
    ],
    color: '#22a05a',
  },
  {
    id: 'chilenje-town',
    routeName: 'Chilenje → Town',
    coordinates: [
      [-15.4326, 28.3031],
      [-15.427, 28.2982],
      [-15.423, 28.2926],
      [-15.4192, 28.288],
      [-15.4165, 28.2831],
    ],
    color: '#0f9f6e',
  },
];

const VEHICLE_SEEDS = [
  {
    id: 'veh-2481',
    registrationNumber: 'LSK 2481',
    routeId: 'matero-town',
    operatorName: 'Lusaka Minibus Co-op',
    vehicleType: 'Minibus',
    vehicleColor: 'White and green',
    baseProgress: 0.16,
    speed: 0.0135,
    phase: 0.12,
  },
  {
    id: 'veh-3094',
    registrationNumber: 'LSK 3094',
    routeId: 'matero-town',
    operatorName: 'Lusaka Minibus Co-op',
    vehicleType: 'Minibus',
    vehicleColor: 'White and green',
    baseProgress: 0.58,
    speed: 0.011,
    phase: 0.28,
  },
  {
    id: 'veh-7816',
    registrationNumber: 'LSK 7816',
    routeId: 'chelstone-town',
    operatorName: 'SAFE City Link',
    vehicleType: 'Minibus',
    vehicleColor: 'White and green',
    baseProgress: 0.24,
    speed: 0.0105,
    phase: 0.44,
  },
  {
    id: 'veh-4328',
    registrationNumber: 'LSK 4328',
    routeId: 'kanyama-town',
    operatorName: 'Kanyama Shuttle Union',
    vehicleType: 'Minibus',
    vehicleColor: 'White and green',
    baseProgress: 0.36,
    speed: 0.0122,
    phase: 0.63,
  },
  {
    id: 'veh-5569',
    registrationNumber: 'LSK 5569',
    routeId: 'chilenje-town',
    operatorName: 'SAFE Corridor Transport',
    vehicleType: 'Minibus',
    vehicleColor: 'White and green',
    baseProgress: 0.72,
    speed: 0.0095,
    phase: 0.81,
  },
  {
    id: 'veh-2047',
    registrationNumber: 'LSK 2047',
    routeId: 'chelstone-town',
    operatorName: 'SAFE City Link',
    vehicleType: 'Minibus',
    vehicleColor: 'White and green',
    baseProgress: 0.61,
    speed: 0.0088,
    phase: 0.95,
  },
];

const STATION_SEEDS = [
  {
    id: 'sta-matero',
    name: 'Matero Market',
    lat: -15.3736,
    lng: 28.2492,
    routeIds: ['matero-town'],
    radiusMeters: 1900,
  },
  {
    id: 'sta-kanyama',
    name: 'Kanyama Roundabout',
    lat: -15.439,
    lng: 28.2496,
    routeIds: ['kanyama-town'],
    radiusMeters: 1800,
  },
  {
    id: 'sta-chelstone',
    name: 'Chelstone Bus Stop',
    lat: -15.3576,
    lng: 28.3285,
    routeIds: ['chelstone-town'],
    radiusMeters: 1800,
  },
  {
    id: 'sta-chilenje',
    name: 'Chilenje Market',
    lat: -15.4311,
    lng: 28.3016,
    routeIds: ['chilenje-town'],
    radiusMeters: 1700,
  },
  {
    id: 'sta-town',
    name: 'Town Interchange',
    lat: -15.4162,
    lng: 28.2834,
    routeIds: ['matero-town', 'kanyama-town', 'chelstone-town', 'chilenje-town'],
    radiusMeters: 1600,
  },
];

function wrapProgress(value) {
  const wrapped = value % 1;
  return wrapped < 0 ? wrapped + 1 : wrapped;
}

function toRad(value) {
  return (value * Math.PI) / 180;
}

function distanceMeters(a, b) {
  if (!a || !b) return Infinity;
  const R = 6371000;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function bearingDegrees(a, b) {
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);
  const dLng = toRad(b[1] - a[1]);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  const bearing = (Math.atan2(y, x) * 180) / Math.PI;
  return (bearing + 360) % 360;
}

function interpolateRoute(coordinates, progress) {
  if (!Array.isArray(coordinates) || coordinates.length === 0) {
    return { lat: LUSAKA_CENTER[0], lng: LUSAKA_CENTER[1], heading: 0 };
  }
  if (coordinates.length === 1) {
    return { lat: coordinates[0][0], lng: coordinates[0][1], heading: 0 };
  }

  const segments = [];
  let total = 0;

  for (let index = 0; index < coordinates.length - 1; index += 1) {
    const start = coordinates[index];
    const end = coordinates[index + 1];
    const length = distanceMeters(start, end);
    segments.push({ start, end, length });
    total += length;
  }

  if (total <= 0) {
    const last = coordinates[coordinates.length - 1];
    return { lat: last[0], lng: last[1], heading: 0 };
  }

  const target = total * wrapProgress(progress);
  let traveled = 0;

  for (const segment of segments) {
    const nextTravel = traveled + segment.length;
    if (target <= nextTravel || segment === segments[segments.length - 1]) {
      const inner = segment.length > 0 ? (target - traveled) / segment.length : 0;
      return {
        lat: segment.start[0] + (segment.end[0] - segment.start[0]) * inner,
        lng: segment.start[1] + (segment.end[1] - segment.start[1]) * inner,
        heading: bearingDegrees(segment.start, segment.end),
      };
    }
    traveled = nextTravel;
  }

  const lastSegment = segments[segments.length - 1];
  return {
    lat: lastSegment.end[0],
    lng: lastSegment.end[1],
    heading: bearingDegrees(lastSegment.start, lastSegment.end),
  };
}

export function buildOperationalMapSnapshot(tick = 0, currentLocation = null) {
  const nowIso = new Date().toISOString();

  const vehicles = VEHICLE_SEEDS.map((seed, index) => {
    const route = ROUTES.find((item) => item.id === seed.routeId) ?? ROUTES[0];
    const position = interpolateRoute(
      route.coordinates,
      seed.baseProgress + tick * seed.speed + seed.phase * 0.01 * index,
    );

    return {
      id: seed.id,
      registrationNumber: seed.registrationNumber,
      routeName: route.routeName,
      operatorName: seed.operatorName,
      lat: position.lat,
      lng: position.lng,
      heading: position.heading,
      status: 'SAFE approved',
      vehiclePhotoUrl: vehiclePhotoFallback,
      vehicleType: seed.vehicleType,
      vehicleColor: seed.vehicleColor,
      driverName: null,
      driverPhotoUrl: null,
      lastUpdatedAt: nowIso,
      routeId: route.id,
    };
  });

  const routes = ROUTES.map((route) => ({
    id: route.id,
    routeName: route.routeName,
    coordinates: route.coordinates,
    activeVehicleCount: vehicles.filter((vehicle) => vehicle.routeId === route.id).length,
    color: route.color,
  }));

  const stations = STATION_SEEDS.map((station) => {
    const nearbyVehicles = vehicles.filter(
      (vehicle) => distanceMeters([vehicle.lat, vehicle.lng], [station.lat, station.lng]) <= station.radiusMeters,
    );
    return {
      id: station.id,
      name: station.name,
      lat: station.lat,
      lng: station.lng,
      activeVehicleCount: nearbyVehicles.length,
      routes: station.routeIds
        .map((routeId) => routes.find((route) => route.id === routeId)?.routeName)
        .filter(Boolean),
      nearbyVehicles,
    };
  });

  return {
    userLocation: currentLocation,
    vehicles,
    stations,
    routes,
    updatedAt: nowIso,
  };
}

export function getInitialMapPoints(snapshot, userLocation) {
  const points = [];
  snapshot.routes.forEach((route) => {
    route.coordinates.forEach((coord) => points.push(coord));
  });
  snapshot.vehicles.forEach((vehicle) => {
    points.push([vehicle.lat, vehicle.lng]);
  });
  snapshot.stations.forEach((station) => {
    points.push([station.lat, station.lng]);
  });
  if (userLocation?.lat != null && userLocation?.lng != null) {
    points.push([userLocation.lat, userLocation.lng]);
  }
  return points;
}
