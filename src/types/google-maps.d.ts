export {};

declare global {
  namespace google.maps {
    interface MapsLibrary {
      Map: unknown;
    }

    interface PlacesLibrary {
      PlaceAutocompleteElement: typeof places.PlaceAutocompleteElement;
      Place: typeof places.Place;
    }

    interface ImportLibraryOptions {
      key?: string;
      v?: string;
      language?: string;
      region?: string;
    }

    interface CoreLibrary {
      importLibrary(
        library: "places",
        options?: ImportLibraryOptions
      ): Promise<PlacesLibrary>;
      importLibrary(
        library: string,
        options?: ImportLibraryOptions
      ): Promise<unknown>;
    }

    const importLibrary: CoreLibrary["importLibrary"];
  }

  namespace google.maps.places {
    interface LocalizedText {
      text?: string;
      languageCode?: string;
    }

    interface AddressComponent {
      longText?: string;
      shortText?: string;
      types: string[];
    }

    interface PlacePrediction {
      toPlace(): Place;
    }

    interface PlacePredictionSelectEvent extends Event {
      placePrediction: PlacePrediction;
    }

    interface PlaceAutocompleteElementOptions {
      includedRegionCodes?: string[];
    }

    class Place {
      addressComponents?: AddressComponent[];
      displayName?: string | LocalizedText;
      formattedAddress?: string;
      fetchFields(options: { fields: string[] }): Promise<void>;
    }

    class PlaceAutocompleteElement extends HTMLElement {
      includedRegionCodes: string[];
      value: string;
      constructor(options?: PlaceAutocompleteElementOptions);
    }
  }

  interface Window {
    google?: {
      maps: {
        importLibrary: google.maps.CoreLibrary["importLibrary"];
        places?: typeof google.maps.places;
      };
    };
  }

  const google: {
    maps: {
      importLibrary: google.maps.CoreLibrary["importLibrary"];
      places?: typeof google.maps.places;
    };
  };
}
