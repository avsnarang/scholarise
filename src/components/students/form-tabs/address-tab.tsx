import { useEffect, useState } from "react";
import { useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Combobox } from "@/components/ui/combobox";
import { Button } from "@/components/ui/button";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription
} from "@/components/ui/form";
import type { StudentFormValues } from "../enhanced-student-form";
import { Country, State, City } from "country-state-city";
import { ChevronDown, ChevronUp, MapPin, Search } from "lucide-react";

export function AddressTab() {
  const { control, watch, setValue } = useFormContext<StudentFormValues>();

  // Watch all address fields for both permanent and correspondence
  const sameAsPermAddress = watch("sameAsPermAddress");
  const permanentAddress = watch("permanentAddress" as any);
  const permanentCity = watch("permanentCity" as any);
  const permanentState = watch("permanentState" as any);
  const permanentCountry = watch("permanentCountry" as any) || "";
  const permanentZipCode = watch("permanentZipCode" as any);

  // States for options
  const [countries, setCountries] = useState<{ value: string; label: string }[]>([]);
  const [permanentStateOptions, setPermanentStateOptions] = useState<{ value: string; label: string }[]>([]);
  const [permanentCityOptions, setPermanentCityOptions] = useState<{ value: string; label: string }[]>([]);

  // Initialize countries on component mount
  useEffect(() => {
    const allCountries = Country.getAllCountries().map(country => ({
      value: country.isoCode,
      label: country.name
    }));
    setCountries(allCountries);
    
    // Set India as default country if not already set
    if (!permanentCountry) {
      const india = allCountries.find(c => c.label === "India");
      if (india) {
        setValue("permanentCountry" as any, india.value);
        setValue("correspondenceCountry" as any, india.value);
      }
    }
  }, [setValue, permanentCountry]);

  // Update state options when country changes
  useEffect(() => {
    if (permanentCountry) {
      const states = State.getStatesOfCountry(permanentCountry).map(state => ({
        value: state.isoCode,
        label: state.name
      }));
      
      setPermanentStateOptions(states);
      
      // Reset state and city when country changes
      if (watch("permanentState")) {
        setValue("permanentState", "");
        setValue("permanentCity", "");
      }
    } else {
      setPermanentStateOptions([]);
    }
  }, [permanentCountry, setValue, watch]);

  // Update city options when state changes
  useEffect(() => {
    if (permanentCountry && permanentState) {
      const cities = City.getCitiesOfState(permanentCountry, permanentState).map(city => ({
        value: city.name,
        label: city.name
      }));
      
      // Create a set of unique city names and sort them
      const uniqueCities = Array.from(new Set(cities.map(city => city.label)))
        .sort()
        .map(cityName => ({
          value: cityName,
          label: cityName
        }));
      
      setPermanentCityOptions(uniqueCities);
      
      // Reset city when state changes
      if (watch("permanentCity")) {
        setValue("permanentCity", "");
      }
    } else {
      setPermanentCityOptions([]);
    }
  }, [permanentCountry, permanentState, setValue, watch]);

  // Watch correspondence address fields
  const correspondenceCountry = watch("correspondenceCountry");
  const correspondenceState = watch("correspondenceState");

  // States for correspondence options
  const [stateOptions, setStateOptions] = useState<{ value: string; label: string }[]>([]);
  const [cityOptions, setCityOptions] = useState<{ value: string; label: string }[]>([]);

  // Update correspondence state options when country changes
  useEffect(() => {
    if (!sameAsPermAddress && correspondenceCountry) {
      const states = State.getStatesOfCountry(correspondenceCountry).map(state => ({
        value: state.isoCode,
        label: state.name
      }));
      
      setStateOptions(states);
      
      // Reset state and city when country changes
      if (watch("correspondenceState")) {
        setValue("correspondenceState", "");
        setValue("correspondenceCity", "");
      }
    } else {
      setStateOptions([]);
    }
  }, [correspondenceCountry, setValue, sameAsPermAddress, watch]);

  // Update correspondence city options when state changes
  useEffect(() => {
    if (!sameAsPermAddress && correspondenceCountry && correspondenceState) {
      const cities = City.getCitiesOfState(correspondenceCountry, correspondenceState).map(city => ({
        value: city.name,
        label: city.name
      }));
      
      // Create a set of unique city names and sort them
      const uniqueCities = Array.from(new Set(cities.map(city => city.label)))
        .sort()
        .map(cityName => ({
          value: cityName,
          label: cityName
        }));
      
      setCityOptions(uniqueCities);
      
      // Reset city when state changes
      if (watch("correspondenceCity")) {
        setValue("correspondenceCity", "");
      }
    } else {
      setCityOptions([]);
    }
  }, [correspondenceCountry, correspondenceState, setValue, sameAsPermAddress, watch]);

  // Update correspondence address when checkbox is checked/unchecked
  useEffect(() => {
    if (sameAsPermAddress) {
      // Copy permanent address to correspondence address
      setValue("correspondenceAddress", permanentAddress);
      setValue("correspondenceCity", permanentCity);
      setValue("correspondenceState", permanentState);
      setValue("correspondenceCountry", permanentCountry);
      setValue("correspondenceZipCode", permanentZipCode);
    }
  }, [
    sameAsPermAddress,
    setValue,
    permanentAddress,
    permanentCity,
    permanentState,
    permanentCountry,
    permanentZipCode
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-4 text-lg font-medium">Permanent Address</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Address */}
          <FormField
            control={control}
            name="permanentAddress"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Address</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value || ""} placeholder="Street address, apartment, etc." />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Country */}
          <FormField
            control={control}
            name="permanentCountry"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Country</FormLabel>
                <Combobox
                  options={countries}
                  value={field.value}
                  placeholder="Search or select country"
                  onChange={field.onChange}
                  emptyMessage="No country found"
                  className="w-full"
                />
                <FormMessage />
              </FormItem>
            )}
          />

          {/* State */}
          <FormField
            control={control}
            name="permanentState"
            render={({ field }) => (
              <FormItem>
                <FormLabel>State</FormLabel>
                <Combobox
                  options={permanentStateOptions}
                  value={field.value}
                  placeholder={permanentCountry ? "Search or select state" : "Select country first"}
                  onChange={field.onChange}
                  emptyMessage={permanentCountry ? "No state found" : "Select a country first"}
                  className="w-full"
                />
                <FormMessage />
              </FormItem>
            )}
          />

          {/* City */}
          <FormField
            control={control}
            name="permanentCity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>City</FormLabel>
                <Combobox
                  options={permanentCityOptions}
                  value={field.value}
                  placeholder={permanentState ? "Search or select city" : "Select state first"}
                  onChange={field.onChange}
                  emptyMessage={permanentState ? "No city found" : "Select a state first"}
                  className="w-full"
                />
                <FormMessage />
              </FormItem>
            )}
          />

          {/* ZIP Code */}
          <FormField
            control={control}
            name="permanentZipCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>ZIP/PIN Code</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value || ""} placeholder="110001" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      {/* Same as Permanent Address checkbox */}
      <FormField
        control={control}
        name="sameAsPermAddress"
        render={({ field }) => (
          <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4 shadow-sm">
            <FormControl>
              <Checkbox
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            </FormControl>
            <div className="space-y-1 leading-none">
              <FormLabel>Correspondence address same as permanent</FormLabel>
              <FormDescription>
                Check this if the correspondence address is the same as permanent address
              </FormDescription>
            </div>
          </FormItem>
        )}
      />

      {/* Correspondence Address */}
      {!sameAsPermAddress && (
        <div>
          <h3 className="mb-4 text-lg font-medium">Correspondence Address</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Address */}
            <FormField
              control={control}
              name="correspondenceAddress"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value || ""} placeholder="Street address, apartment, etc." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Country */}
            <FormField
              control={control}
              name="correspondenceCountry"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Country</FormLabel>
                  <Combobox
                    options={countries}
                    value={field.value}
                    placeholder="Search or select country"
                    onChange={field.onChange}
                    emptyMessage="No country found"
                    className="w-full"
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* State */}
            <FormField
              control={control}
              name="correspondenceState"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>State</FormLabel>
                  <Combobox
                    options={stateOptions}
                    value={field.value}
                    placeholder={correspondenceCountry ? "Search or select state" : "Select country first"}
                    onChange={field.onChange}
                    emptyMessage={correspondenceCountry ? "No state found" : "Select a country first"}
                    className="w-full"
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* City */}
            <FormField
              control={control}
              name="correspondenceCity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>City</FormLabel>
                  <Combobox
                    options={cityOptions}
                    value={field.value}
                    placeholder={correspondenceState ? "Search or select city" : "Select state first"}
                    onChange={field.onChange}
                    emptyMessage={correspondenceState ? "No city found" : "Select a state first"}
                    className="w-full"
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* ZIP Code */}
            <FormField
              control={control}
              name="correspondenceZipCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ZIP/PIN Code</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value || ""} placeholder="110001" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
      )}
    </div>
  );
}
