export interface GermanAddressFields {
  customer_address: string;
  customer_zip: string;
  customer_city: string;
  customer_country: string;
}

export type AddressRegionScope = "DE" | "WORLD";

const BOOTSTRAP_SCRIPT_ID = "google-maps-bootstrap";
const LEGACY_SCRIPT_SELECTOR = 'script[data-google-maps="places"]';

const isDev = process.env.NODE_ENV === "development";

function devLog(message: string, detail?: unknown): void {
  if (!isDev) return;
  if (detail !== undefined) {
    console.log(`[Google Places] ${message}`, detail);
  } else {
    console.log(`[Google Places] ${message}`);
  }
}

function devError(message: string, error: unknown): void {
  if (!isDev) return;
  console.error(`[Google Places] ${message}`, error);
}

// Official bootstrap loader with loading=async (Places API New via importLibrary).
// Requires NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in .env.local
const GOOGLE_MAPS_BOOTSTRAP =
  '(g=>{var h,a,k,p="The Google Maps JavaScript API",c="google",l="importLibrary",q="__ib__",m=document,b=window;b=b[c]||(b[c]={});var d=b.maps||(b.maps={}),r=new Set,e=new URLSearchParams,u=()=>h||(h=new Promise(async(f,n)=>{await (a=m.createElement("script"));e.set("libraries",[...r]+"");for(k in g)e.set(k.replace(/[A-Z]/g,t=>"_"+t[0].toLowerCase()),g[k]);e.set("callback",c+".maps."+q);a.src="https://maps."+c+"apis.com/maps/api/js?"+e;d[q]=f;a.onerror=()=>h=n(Error(p+" could not load."));a.nonce=m.querySelector("script[nonce]")?.nonce||"";m.head.append(a)}));d[l]?console.warn(p+" only loads once. Ignoring:",g):d[l]=(f,...n)=>r.add(f)&&u().then(()=>d[l](f,...n))})';

export function isGoogleMapsConfigured(): boolean {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();
  const configured = Boolean(key && !key.includes("your_"));
  if (configured && isDev) {
    devLog("Google API key exists");
  }
  return configured;
}

let loadPromise: Promise<void> | null = null;

function hasImportLibrary(): boolean {
  return typeof window.google?.maps?.importLibrary === "function";
}

function removeLegacyMapsScripts(): void {
  document.querySelectorAll(LEGACY_SCRIPT_SELECTOR).forEach((node) => node.remove());
}

function injectBootstrapLoader(apiKey: string): void {
  if (typeof window === "undefined") return;
  if (hasImportLibrary()) return;

  removeLegacyMapsScripts();

  if (document.getElementById(BOOTSTRAP_SCRIPT_ID)) return;

  const script = document.createElement("script");
  script.id = BOOTSTRAP_SCRIPT_ID;
  script.text = `${GOOGLE_MAPS_BOOTSTRAP}(${JSON.stringify({
    key: apiKey,
    v: "weekly",
    loading: "async",
    language: "de",
    region: "DE",
  })});`;
  document.head.appendChild(script);
}

function waitForImportLibrary(timeoutMs = 10000): Promise<void> {
  if (hasImportLibrary()) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const started = Date.now();

    const tick = () => {
      if (hasImportLibrary()) {
        devLog("Google Maps bootstrap loaded");
        resolve();
        return;
      }
      if (Date.now() - started > timeoutMs) {
        reject(new Error("Google Maps ImportLibrary nicht verfügbar."));
        return;
      }
      window.setTimeout(tick, 50);
    };

    tick();
  });
}

export function loadGoogleMapsPlaces(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Maps kann nur im Browser geladen werden."));
  }

  if (hasImportLibrary() && loadPromise) {
    return loadPromise;
  }

  if (hasImportLibrary()) {
    return window.google!.maps.importLibrary("places").then(() => {
      devLog("Places library imported");
      return undefined;
    });
  }

  if (loadPromise) {
    return loadPromise;
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();
  if (!apiKey) {
    return Promise.reject(
      new Error("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY fehlt in .env.local")
    );
  }

  devLog("Google API key exists");
  injectBootstrapLoader(apiKey);

  loadPromise = waitForImportLibrary()
    .then(() => window.google!.maps.importLibrary("places"))
    .then(() => {
      devLog("Places library imported");
      return undefined;
    })
    .catch((err: Error) => {
      devError("Failed to load Google Maps Places", err);
      loadPromise = null;
      throw err;
    });

  return loadPromise;
}

export async function createPlaceAutocompleteElement(
  regionScope: AddressRegionScope = "DE"
): Promise<google.maps.places.PlaceAutocompleteElement> {
  try {
    const { PlaceAutocompleteElement } = (await loadGoogleMapsPlaces().then(() =>
      window.google!.maps.importLibrary("places")
    )) as google.maps.PlacesLibrary;

    const element =
      regionScope === "DE"
        ? new PlaceAutocompleteElement({ includedRegionCodes: ["de"] })
        : new PlaceAutocompleteElement();

    if (regionScope === "DE") {
      element.includedRegionCodes = ["de"];
    }

    devLog("PlaceAutocompleteElement created", { regionScope });
    return element;
  } catch (error) {
    devError("PlaceAutocompleteElement creation failed", error);
    throw error;
  }
}

function getAddressComponent(
  components: google.maps.places.AddressComponent[],
  type: string,
  nameType: "longText" | "shortText" = "longText"
): string {
  const match = components.find((c) => c.types.includes(type));
  return match?.[nameType] ?? "";
}

function getPlaceDisplayName(place: google.maps.places.Place): string {
  const displayName = place.displayName;
  if (!displayName) return "";
  if (typeof displayName === "string") return displayName.trim();
  return displayName.text?.trim() ?? "";
}

export function parsePlaceAddressComponents(
  place: google.maps.places.Place
): GermanAddressFields {
  const components = place.addressComponents ?? [];
  const route =
    getAddressComponent(components, "route", "longText") ||
    getAddressComponent(components, "route", "shortText");
  const streetNumber =
    getAddressComponent(components, "street_number", "longText") ||
    getAddressComponent(components, "street_number", "shortText");

  const customer_address =
    [route, streetNumber].filter(Boolean).join(" ").trim() ||
    getPlaceDisplayName(place) ||
    "";

  const customer_zip = getAddressComponent(components, "postal_code");
  const customer_city =
    getAddressComponent(components, "locality") ||
    getAddressComponent(components, "postal_town") ||
    getAddressComponent(components, "administrative_area_level_3");

  const countryLong = getAddressComponent(components, "country");
  const customer_country =
    countryLong === "Germany" || countryLong === "Deutschland"
      ? "Deutschland"
      : countryLong || "Deutschland";

  return {
    customer_address,
    customer_zip,
    customer_city,
    customer_country,
  };
}

export function parseMultilineCustomerAddress(address: string): GermanAddressFields {
  const lines = address
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return {
      customer_address: "",
      customer_zip: "",
      customer_city: "",
      customer_country: "Deutschland",
    };
  }

  const customer_address = lines[0];
  let customer_zip = "";
  let customer_city = "";
  let customer_country = "Deutschland";

  if (lines.length >= 2) {
    const zipCityMatch = lines[1].match(/^(\d{5})\s+(.+)$/);
    if (zipCityMatch) {
      customer_zip = zipCityMatch[1];
      customer_city = zipCityMatch[2];
      if (lines.length >= 3) {
        customer_country = lines[lines.length - 1];
      }
    } else if (lines.length === 2) {
      customer_country = lines[1];
    }
  }

  return {
    customer_address,
    customer_zip,
    customer_city,
    customer_country,
  };
}

export function germanAddressFieldsToMultiline(fields: GermanAddressFields): string {
  const cityLine = [fields.customer_zip.trim(), fields.customer_city.trim()]
    .filter(Boolean)
    .join(" ");
  return [fields.customer_address.trim(), cityLine, fields.customer_country.trim()]
    .filter(Boolean)
    .join("\n");
}
