/* === EXTENSIBLE MISSION AND PLANET CATALOG === */
/* This data-only module defines each planet and the surface or orbital artifacts it can reveal. */
export const solarSystemData = [
  {
    name: "Mercury",
    category: "TERRESTRIAL PLANET",
    descriptor: "THE SWIFT PLANET",
    distance: "0.39 AU FROM THE SUN",
    orbit: 8,
    angle: -10,
    radius: 0.62,
    color: "#b7a294",
    texture: "mercury",
    rotation: 0.12,
    missions: [
      { id: "messenger", name: "MESSENGER", title: "MESSENGER Orbiter", type: "ORBITER / IMPACT", year: "2004 — 2015", status: "HISTORIC ARTIFACT", agency: "NASA / APL", latitude: 18, longitude: 15, summary: "After mapping Mercury for four years, MESSENGER ended its mission by impacting the planet's surface.", location: "CALORIS BASIN", telemetry: "4,104 ORBITS" }
    ]
  },
  {
    name: "Venus",
    category: "TERRESTRIAL PLANET",
    descriptor: "EARTH'S TWIN",
    distance: "0.72 AU FROM THE SUN",
    orbit: 12,
    angle: 90,
    radius: 0.92,
    color: "#e1b877",
    texture: "venus",
    rotation: 0.035,
    missions: [
      { id: "venera13", name: "VENERA 13", title: "Venera 13 Lander", type: "LANDER", year: "1981 — 1982", status: "HISTORIC ARTIFACT", agency: "SOVIET SPACE PROGRAM", latitude: -7.5, longitude: 303, summary: "Venera 13 returned the first color images from Venus's surface and survived its crushing atmosphere for 127 minutes.", location: "PHOEBE REGIO", telemetry: "127 MINUTES ON SURFACE" }
    ]
  },
  {
    name: "Earth",
    category: "TERRESTRIAL PLANET",
    descriptor: "OUR PALE BLUE DOT",
    distance: "1.00 AU FROM THE SUN",
    orbit: 16,
    angle: 180,
    radius: 1.04,
    color: "#4b8db9",
    texture: "earth",
    rotation: 0.19,
    missions: [
      { id: "iss", name: "ISS", title: "International Space Station", type: "ORBITAL STATION", year: "1998 — PRESENT", status: "ACTIVE", agency: "NASA / ESA / JAXA / CSA / ROSCOSMOS", latitude: 28.5, longitude: -35, altitude: 1.16, summary: "A continuously crewed orbital laboratory that has hosted international research above Earth for more than two decades.", location: "LOW EARTH ORBIT", telemetry: "400 KM ALTITUDE" }
    ]
  },
  {
    name: "Mars",
    category: "TERRESTRIAL PLANET",
    descriptor: "THE RED PLANET",
    distance: "1.52 AU FROM THE SUN",
    orbit: 20,
    angle: -50,
    radius: 0.78,
    color: "#d56f4c",
    texture: "mars",
    rotation: 0.16,
    missions: [
      { id: "opportunity", name: "OPPORTUNITY", title: "Opportunity Rover", type: "ROVER", year: "2004 — 2018", status: "HISTORIC ARTIFACT", agency: "NASA / JPL", latitude: -1.95, longitude: -5.5, summary: "Built for 90 sols, Opportunity explored Mars for nearly 15 years and found evidence of ancient liquid water.", location: "MERIDIANI PLANUM", telemetry: "45.16 KM TRAVELLED" },
      { id: "viking1", name: "VIKING 1", title: "Viking 1 Lander", type: "LANDER", year: "1976 — 1982", status: "HISTORIC ARTIFACT", agency: "NASA", latitude: 22.48, longitude: -47.97, summary: "The first U.S. spacecraft to land and operate successfully on Mars, returning landmark surface imagery and science.", location: "CHRYSE PLANITIA", telemetry: "2,245 SOLS ACTIVE" },
      { id: "insight", name: "INSIGHT", title: "InSight Lander", type: "LANDER / SEISMOLOGY", year: "2018 — 2022", status: "HISTORIC ARTIFACT", agency: "NASA / JPL", latitude: 4.5, longitude: 135.9, summary: "A robotic geophysicist that detected more than 1,300 marsquakes and revealed new details about the planet's interior.", location: "ELYSIUM PLANITIA", telemetry: "1,300+ MARSQUAKES" }
    ]
  },
  {
    name: "Jupiter",
    category: "GAS GIANT",
    descriptor: "KING OF THE PLANETS",
    distance: "5.20 AU FROM THE SUN",
    orbit: 25,
    angle: 130,
    radius: 2.45,
    color: "#d9a77d",
    texture: "jupiter",
    rotation: 0.25,
    missions: [
      { id: "galileo", name: "GALILEO", title: "Galileo Probe", type: "ATMOSPHERIC PROBE", year: "1989 — 2003", status: "HISTORIC ARTIFACT", agency: "NASA / JPL", latitude: -6, longitude: 28, summary: "Galileo's atmospheric probe descended into Jupiter's cloud layers, returning the first direct measurements from a gas giant.", location: "JUPITER ATMOSPHERE", telemetry: "58 MINUTES OF DATA" }
    ]
  },
  {
    name: "Saturn",
    category: "GAS GIANT",
    descriptor: "THE RINGED WORLD",
    distance: "9.58 AU FROM THE SUN",
    orbit: 30,
    angle: -15,
    radius: 2.02,
    color: "#d8c294",
    texture: "saturn",
    rotation: 0.22,
    // Keep Saturn's globe and ring system slightly understated in both overview and close-up.
    visualScale: 0.60,
    hasRings: true,
    missions: [
      { id: "cassini", name: "CASSINI", title: "Cassini Orbiter", type: "ORBITER / DEBRIS", year: "1997 — 2017", status: "MISSION DEBRIS", agency: "NASA / ESA / ASI", latitude: 0, longitude: 90, summary: "After 13 years exploring Saturn, Cassini made a deliberate final plunge into the planet's atmosphere.", location: "SATURN ATMOSPHERE", telemetry: "294 SATURN ORBITS" }
    ]
  },
  {
    name: "Uranus",
    category: "ICE GIANT",
    descriptor: "THE TILTED WORLD",
    distance: "19.2 AU FROM THE SUN",
    orbit: 35,
    angle: 200,
    radius: 1.48,
    color: "#8dd8d8",
    texture: "ice",
    rotation: 0.13,
    missions: [
      { id: "voyager2-uranus", name: "VOYAGER 2", title: "Voyager 2 Flyby", type: "FLYBY / PROBE", year: "1977 — 1986", status: "INTERSTELLAR", agency: "NASA / JPL", latitude: -20, longitude: 45, summary: "The only spacecraft to visit Uranus discovered 10 new moons and measured its unusually tilted magnetic field.", location: "URANUS SYSTEM", telemetry: "81,500 KM CLOSEST APPROACH" }
    ]
  },
  {
    name: "Neptune",
    category: "ICE GIANT",
    descriptor: "THE BLUE FRONTIER",
    distance: "30.1 AU FROM THE SUN",
    orbit: 40,
    angle: 35,
    radius: 1.42,
    color: "#5277e7",
    texture: "neptune",
    rotation: 0.18,
    missions: [
      { id: "voyager2-neptune", name: "VOYAGER 2", title: "Voyager 2 Flyby", type: "FLYBY / PROBE", year: "1977 — 1989", status: "INTERSTELLAR", agency: "NASA / JPL", latitude: -28, longitude: -35, summary: "Voyager 2 revealed Neptune's dynamic atmosphere, Great Dark Spot, and a system of rings and moons.", location: "NEPTUNE SYSTEM", telemetry: "4,950 KM CLOSEST APPROACH" }
    ]
  }
];

/* Lunar surface records are kept separate from the eight-planet catalog for Moon navigation. */
export const moonData = {
  name: "Moon",
  category: "NATURAL SATELLITE",
  descriptor: "EARTH'S MOON",
  distance: "384,400 KM FROM EARTH",
  radius: 0.27,
  missions: [
    { id: "apollo11", name: "APOLLO 11", title: "Apollo 11 Landing Site", type: "HISTORIC LANDING", year: "1969", status: "HISTORIC ARTIFACT", agency: "NASA", latitude: 0.6741, longitude: 23.473, summary: "The Sea of Tranquility landing site marks humanity's first crewed landing on another world.", location: "MARE TRANQUILLITATIS", telemetry: "FIRST CREWED LUNAR LANDING" },
    { id: "luna2", name: "LUNA 2", title: "Luna 2 Impact Region", type: "PROBE / IMPACT SITE", year: "1959", status: "HISTORIC ARTIFACT", agency: "SOVIET SPACE PROGRAM", latitude: 29.1, longitude: -0.1, summary: "The first human-made object to reach the Moon, impacting near the boundary of Mare Imbrium and Mare Serenitatis.", location: "PALUS PUTREDINIS", telemetry: "FIRST LUNAR IMPACT" },
    { id: "change4", name: "CHANG'E 4", title: "Chang'e 4 Lander & Yutu-2", type: "LANDER / ROVER", year: "2019 — PRESENT", status: "ACTIVE", agency: "CNSA", latitude: -45.4446, longitude: 177.5991, summary: "The first soft landing on the lunar far side, exploring the Von Kármán crater with the Yutu-2 rover.", location: "VON KÁRMÁN CRATER", telemetry: "LUNAR FAR SIDE" }
  ]
};
