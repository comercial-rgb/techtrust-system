/**
 * US States & Cities Data
 * Shared across all screens that need state/city selection.
 * Cities are seeded for active marketplace states.
 * Other states show a free-text city input.
 */

// All 50 US states + DC
export const US_STATES: Array<{ code: string; name: string }> = [
  { code: "AL", name: "Alabama" },
  { code: "AK", name: "Alaska" },
  { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" },
  { code: "CA", name: "California" },
  { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" },
  { code: "DE", name: "Delaware" },
  { code: "DC", name: "District of Columbia" },
  { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" },
  { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" },
  { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" },
  { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" },
  { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" },
  { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" },
  { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" },
  { code: "NH", name: "New Hampshire" },
  { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" },
  { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" },
  { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" },
  { code: "PA", name: "Pennsylvania" },
  { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" },
  { code: "SD", name: "South Dakota" },
  { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" },
  { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" },
  { code: "VA", name: "Virginia" },
  { code: "WA", name: "Washington" },
  { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" },
  { code: "WY", name: "Wyoming" },
];

// State codes only (for quick lookups)
export const STATE_CODES = US_STATES.map((s) => s.code);

// Get state name from code
export const getStateName = (code: string): string => {
  return US_STATES.find((s) => s.code === code)?.name || code;
};

// Cities by state (seeded for active marketplace states)
// For states without seeded cities, the UI shows a free-text city input
export const CITIES_BY_STATE: Record<string, string[]> = {
  FL: [
    "Alachua", "Altamonte Springs", "Apopka", "Aventura", "Boca Raton",
    "Bonita Springs", "Boynton Beach", "Bradenton", "Brandon", "Cape Coral",
    "Casselberry", "Clearwater", "Clermont", "Cocoa", "Cocoa Beach",
    "Coconut Creek", "Cooper City", "Coral Gables", "Coral Springs",
    "Crestview", "Dania Beach", "Davie", "Daytona Beach", "DeBary",
    "Deerfield Beach", "DeLand", "Delray Beach", "Deltona", "Destin",
    "Doral", "Dunedin", "Edgewater", "Estero", "Eustis", "Fort Lauderdale",
    "Fort Myers", "Fort Pierce", "Fort Walton Beach", "Gainesville",
    "Greenacres", "Haines City", "Hallandale Beach", "Hialeah",
    "Hialeah Gardens", "Hollywood", "Homestead", "Immokalee",
    "Jacksonville", "Jupiter", "Key West", "Kissimmee", "Lake Mary",
    "Lake Wales", "Lake Worth Beach", "Lakeland", "Largo", "Lauderdale Lakes",
    "Lauderhill", "Leesburg", "Lehigh Acres", "Longwood",
    "Margate", "Melbourne", "Merritt Island", "Miami", "Miami Beach",
    "Miami Gardens", "Miami Lakes", "Miramar", "Naples", "New Smyrna Beach",
    "Niceville", "North Fort Myers", "North Lauderdale", "North Miami",
    "North Miami Beach", "North Port", "Oakland Park", "Ocala", "Ocoee",
    "Orlando", "Ormond Beach", "Oviedo", "Palatka", "Palm Bay",
    "Palm Beach Gardens", "Palm Coast", "Palm Harbor", "Palmetto Bay",
    "Panama City", "Pembroke Pines", "Pensacola", "Pinecrest",
    "Pinellas Park", "Plant City", "Plantation", "Pompano Beach",
    "Port Charlotte", "Port Orange", "Port St. Lucie", "Riviera Beach",
    "Rockledge", "Royal Palm Beach", "Sanford", "Sarasota", "Sebastian",
    "Seminole", "Spring Hill", "St. Augustine", "St. Cloud",
    "St. Petersburg", "Stuart", "Sunny Isles Beach", "Sunrise",
    "Sweetwater", "Tallahassee", "Tamarac", "Tampa", "Tarpon Springs",
    "Temple Terrace", "The Villages", "Titusville", "Venice",
    "Vero Beach", "Wellington", "Wesley Chapel", "West Melbourne",
    "West Palm Beach", "Weston", "Winter Garden", "Winter Haven",
    "Winter Park", "Winter Springs",
  ].sort(),
};

/**
 * Check if a state has a seeded cities list.
 * States without seeded cities show a free-text input instead of a dropdown.
 */
export const hasSeededCities = (stateCode: string): boolean => {
  return !!(CITIES_BY_STATE[stateCode] && CITIES_BY_STATE[stateCode].length > 0);
};

/**
 * Get cities for a state. Returns empty array if not seeded.
 */
export const getCitiesForState = (stateCode: string): string[] => {
  return CITIES_BY_STATE[stateCode] || [];
};
