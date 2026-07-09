"use client";

import { useEffect, useRef, useState } from "react";
import { Box, Stack, Typography } from "@mui/material";
import Grid from "@mui/material/Grid";
import { useTranslations } from "next-intl";
import { ImsAlert, ImsTextField } from "@/components/forms/ims";
import {
  type GermanAddressFields,
  type AddressRegionScope,
  createPlaceAutocompleteElement,
  isGoogleMapsConfigured,
  loadGoogleMapsPlaces,
  parsePlaceAddressComponents,
} from "@/lib/google-places";
import { imsColors } from "@/theme/imsTheme";

export type { GermanAddressFields, AddressRegionScope };

const isDev = process.env.NODE_ENV === "development";

interface GermanAddressAutocompleteProps {
  values: GermanAddressFields;
  onChange: (values: GermanAddressFields) => void;
  className?: string;
  disabled?: boolean;
  regionScope?: AddressRegionScope;
}

export function GermanAddressAutocomplete({
  values,
  onChange,
  disabled = false,
  regionScope = "DE",
}: GermanAddressAutocompleteProps) {
  const t = useTranslations("address");
  const autocompleteContainerRef = useRef<HTMLDivElement>(null);
  const autocompleteElementRef =
    useRef<google.maps.places.PlaceAutocompleteElement | null>(null);
  const onChangeRef = useRef(onChange);
  const valuesRef = useRef(values);
  const [mapsReady, setMapsReady] = useState(false);
  const [mapsError, setMapsError] = useState<string | null>(null);
  const [elementError, setElementError] = useState<string | null>(null);
  const [autocompleteMounted, setAutocompleteMounted] = useState(false);

  useEffect(() => {
    onChangeRef.current = onChange;
    valuesRef.current = values;
  });

  const apiKeyConfigured = isGoogleMapsConfigured();

  useEffect(() => {
    if (!apiKeyConfigured || disabled) return;

    let cancelled = false;

    loadGoogleMapsPlaces()
      .then(() => {
        if (!cancelled) {
          setMapsReady(true);
          setMapsError(null);
        }
      })
      .catch((err: Error) => {
        if (isDev) {
          console.error("[Google Places] Failed to load Google Maps Places", err);
        }
        if (!cancelled) {
          setMapsError(err.message);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [apiKeyConfigured, disabled]);

  useEffect(() => {
    if (!apiKeyConfigured || !mapsReady || disabled || mapsError) {
      return;
    }

    let mounted = true;

    const handleSelect = async (event: Event) => {
      if (isDev) {
        console.log("[Google Places] gmp-select fired");
      }

      const { placePrediction } = event as google.maps.places.PlacePredictionSelectEvent;
      if (!placePrediction) return;

      try {
        const place = placePrediction.toPlace();
        await place.fetchFields({
          fields: ["addressComponents", "formattedAddress", "displayName"],
        });

        onChangeRef.current(parsePlaceAddressComponents(place));
      } catch (err) {
        if (isDev) {
          console.error("[Google Places] gmp-select handler failed", err);
        }
      }
    };

    const handleInput = () => {
      const element = autocompleteElementRef.current;
      if (!element) return;
      onChangeRef.current({
        ...valuesRef.current,
        customer_address: element.value,
      });
    };

    void createPlaceAutocompleteElement(regionScope)
      .then((element) => {
        if (!mounted || !autocompleteContainerRef.current) {
          return;
        }

        element.className = "german-address-autocomplete-host";
        element.setAttribute("aria-label", t("streetAndNumber"));
        if (valuesRef.current.customer_address) {
          element.value = valuesRef.current.customer_address;
        }

        element.addEventListener("gmp-select", handleSelect);
        element.addEventListener("input", handleInput);

        autocompleteContainerRef.current.replaceChildren(element);
        autocompleteElementRef.current = element;
        setElementError(null);
        setAutocompleteMounted(true);
      })
      .catch((err: Error) => {
        if (isDev) {
          console.error("[Google Places] PlaceAutocompleteElement creation failed", err);
        }
        if (mounted) {
          setElementError(t("searchUnavailable"));
          setAutocompleteMounted(false);
        }
      });

    return () => {
      mounted = false;
      setAutocompleteMounted(false);
      const element = autocompleteElementRef.current;
      if (element) {
        element.removeEventListener("gmp-select", handleSelect);
        element.removeEventListener("input", handleInput);
        element.remove();
      }
      autocompleteElementRef.current = null;
    };
  }, [apiKeyConfigured, mapsReady, disabled, mapsError, regionScope, t]);

  useEffect(() => {
    const element = autocompleteElementRef.current;
    if (!element || document.activeElement === element) return;
    if (element.value !== values.customer_address) {
      element.value = values.customer_address;
    }
  }, [values.customer_address, autocompleteMounted]);

  function updateField<K extends keyof GermanAddressFields>(
    field: K,
    value: GermanAddressFields[K]
  ) {
    onChange({ ...values, [field]: value });
  }

  const showManualStreet =
    !apiKeyConfigured || !autocompleteMounted || Boolean(mapsError) || Boolean(elementError);
  const streetWarning = elementError ?? (mapsError && apiKeyConfigured ? mapsError : null);

  return (
    <Stack spacing={2.25}>
      {!apiKeyConfigured ? (
        <ImsAlert tone="warning">{t("autocompleteDisabledExtended")}</ImsAlert>
      ) : null}

      {streetWarning && apiKeyConfigured ? <ImsAlert tone="warning">{streetWarning}</ImsAlert> : null}

      <Stack spacing={0.75}>
        <Typography sx={{ fontSize: 13, fontWeight: 500, color: imsColors.textMuted }}>
          {t("streetAndNumber")}
        </Typography>

        {apiKeyConfigured ? (
          <Box
            ref={autocompleteContainerRef}
            id={showManualStreet ? undefined : "customer_address_autocomplete"}
            className={showManualStreet ? undefined : "german-address-autocomplete-wrapper"}
            sx={{ display: showManualStreet ? "none" : "block" }}
            aria-hidden={showManualStreet}
          />
        ) : null}

        {showManualStreet ? (
          <ImsTextField
            id="customer_address_autocomplete"
            name="customer_address"
            value={values.customer_address}
            onChange={(e) => updateField("customer_address", e.target.value)}
            disabled={disabled}
            placeholder={t("enterAddressPlaceholder")}
            slotProps={{ htmlInput: { autoComplete: "off" } }}
          />
        ) : null}

        {apiKeyConfigured && autocompleteMounted && !streetWarning ? (
          <Typography sx={{ fontSize: 12, color: imsColors.textMuted }}>
            {t("autocompleteHint")}
          </Typography>
        ) : null}
      </Stack>

      <Grid container spacing={2.25}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <ImsTextField
            label={t("postalCode")}
            name="customer_zip"
            value={values.customer_zip}
            onChange={(e) => updateField("customer_zip", e.target.value)}
            disabled={disabled}
            placeholder="12345"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <ImsTextField
            label={t("city")}
            name="customer_city"
            value={values.customer_city}
            onChange={(e) => updateField("customer_city", e.target.value)}
            disabled={disabled}
            placeholder="Berlin"
          />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <ImsTextField
            label={t("country")}
            name="customer_country"
            value={values.customer_country}
            onChange={(e) => updateField("customer_country", e.target.value)}
            disabled={disabled}
          />
        </Grid>
      </Grid>
    </Stack>
  );
}
