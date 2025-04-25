// Comprehensive hierarchical location data for India with districts and PIN code mapping

// Type definitions
export type IndiaLocationData = {
  states: {
    [stateCode: string]: {
      name: string;
      districts: {
        [districtCode: string]: {
          name: string;
          cities: {
            [cityCode: string]: {
              name: string;
              pinCodes: string[];
            }
          }
        }
      }
    }
  };
  // Mapping PIN codes to location
  pinCodeMap: {
    [pinCode: string]: {
      stateCode: string;
      districtCode: string;
      cityCode: string;
    }
  }
};

// Main data structure
export const indiaLocationData: IndiaLocationData = {
  states: {
    // Himachal Pradesh
    "HP": {
      name: "Himachal Pradesh",
      districts: {
        "SRM": {
          name: "Sirmaur",
          cities: {
            "PS": {
              name: "Paonta Sahib",
              pinCodes: ["173025"]
            },
            "NH": {
              name: "Nahan",
              pinCodes: ["173001"]
            }
          }
        },
        "SML": {
          name: "Shimla",
          cities: {
            "SML": {
              name: "Shimla",
              pinCodes: ["171001", "171002", "171003", "171004", "171005", "171006"]
            }
          }
        },
        "SLN": {
          name: "Solan",
          cities: {
            "SLN": {
              name: "Solan",
              pinCodes: ["173211", "173212", "173213"]
            },
            "BD": {
              name: "Baddi",
              pinCodes: ["173205"]
            }
          }
        }
      }
    },
    // Uttarakhand
    "UK": {
      name: "Uttarakhand",
      districts: {
        "DDN": {
          name: "Dehradun",
          cities: {
            "DDN": {
              name: "Dehradun",
              pinCodes: ["248001", "248002", "248003", "248004", "248005", "248006"]
            },
            "MSR": {
              name: "Mussoorie",
              pinCodes: ["248179"]
            }
          }
        },
        "HDW": {
          name: "Haridwar",
          cities: {
            "HDW": {
              name: "Haridwar",
              pinCodes: ["249401", "249402", "249403", "249404"]
            },
            "RKE": {
              name: "Roorkee",
              pinCodes: ["247667", "247668"]
            }
          }
        }
      }
    },
    // Delhi
    "DL": {
      name: "Delhi",
      districts: {
        "NDL": {
          name: "New Delhi",
          cities: {
            "NDL": {
              name: "New Delhi",
              pinCodes: ["110001", "110002", "110003", "110004", "110005", "110006", "110007"]
            }
          }
        },
        "SDH": {
          name: "South Delhi",
          cities: {
            "HKS": {
              name: "Hauz Khas",
              pinCodes: ["110016"]
            },
            "SKT": {
              name: "Saket",
              pinCodes: ["110017"]
            }
          }
        }
      }
    },
    // Punjab
    "PB": {
      name: "Punjab",
      districts: {
        "ASR": {
          name: "Amritsar",
          cities: {
            "ASR": {
              name: "Amritsar",
              pinCodes: ["143001", "143002", "143003", "143004", "143005"]
            }
          }
        },
        "LDH": {
          name: "Ludhiana",
          cities: {
            "LDH": {
              name: "Ludhiana",
              pinCodes: ["141001", "141002", "141003", "141004", "141005", "141006", "141007"]
            }
          }
        }
      }
    },
    // Haryana
    "HR": {
      name: "Haryana",
      districts: {
        "GGN": {
          name: "Gurugram",
          cities: {
            "GGN": {
              name: "Gurugram",
              pinCodes: ["122001", "122002", "122003", "122004", "122005", "122006", "122007", "122008"]
            }
          }
        },
        "FBD": {
          name: "Faridabad",
          cities: {
            "FBD": {
              name: "Faridabad",
              pinCodes: ["121001", "121002", "121003", "121004", "121005", "121006"]
            }
          }
        }
      }
    },
    // Uttar Pradesh
    "UP": {
      name: "Uttar Pradesh",
      districts: {
        "GBD": {
          name: "Ghaziabad",
          cities: {
            "GBD": {
              name: "Ghaziabad",
              pinCodes: ["201001", "201002", "201003", "201004", "201005", "201006", "201007"]
            }
          }
        },
        "NDA": {
          name: "Noida",
          cities: {
            "NDA": {
              name: "Noida",
              pinCodes: ["201301", "201303", "201304", "201305", "201306", "201307", "201308", "201309", "201310"]
            }
          }
        }
      }
    },
    // Maharashtra
    "MH": {
      name: "Maharashtra",
      districts: {
        "MUM": {
          name: "Mumbai",
          cities: {
            "MUM": {
              name: "Mumbai",
              pinCodes: ["400001", "400002", "400003", "400004", "400005", "400006", "400007", "400008", "400009", "400010"]
            }
          }
        },
        "PNE": {
          name: "Pune",
          cities: {
            "PNE": {
              name: "Pune",
              pinCodes: ["411001", "411002", "411003", "411004", "411005", "411006", "411007", "411008", "411009", "411010"]
            }
          }
        }
      }
    },
    // Karnataka
    "KA": {
      name: "Karnataka",
      districts: {
        "BLR": {
          name: "Bangalore",
          cities: {
            "BLR": {
              name: "Bangalore",
              pinCodes: ["560001", "560002", "560003", "560004", "560005", "560006", "560007", "560008", "560009", "560010"]
            }
          }
        },
        "MYS": {
          name: "Mysore",
          cities: {
            "MYS": {
              name: "Mysore",
              pinCodes: ["570001", "570002", "570003", "570004", "570005", "570006", "570007", "570008"]
            }
          }
        }
      }
    },
    // Tamil Nadu
    "TN": {
      name: "Tamil Nadu",
      districts: {
        "CHN": {
          name: "Chennai",
          cities: {
            "CHN": {
              name: "Chennai",
              pinCodes: ["600001", "600002", "600003", "600004", "600005", "600006", "600007", "600008", "600009", "600010"]
            }
          }
        },
        "CBE": {
          name: "Coimbatore",
          cities: {
            "CBE": {
              name: "Coimbatore",
              pinCodes: ["641001", "641002", "641003", "641004", "641005", "641006", "641007", "641008", "641009", "641010"]
            }
          }
        }
      }
    }
  },
  // PIN code to location mapping
  pinCodeMap: {
    // Himachal Pradesh
    "173025": { stateCode: "HP", districtCode: "SRM", cityCode: "PS" }, // Paonta Sahib
    "173001": { stateCode: "HP", districtCode: "SRM", cityCode: "NH" }, // Nahan
    "171001": { stateCode: "HP", districtCode: "SML", cityCode: "SML" }, // Shimla
    "171002": { stateCode: "HP", districtCode: "SML", cityCode: "SML" }, // Shimla
    "173211": { stateCode: "HP", districtCode: "SLN", cityCode: "SLN" }, // Solan
    "173205": { stateCode: "HP", districtCode: "SLN", cityCode: "BD" }, // Baddi
    
    // Uttarakhand
    "248001": { stateCode: "UK", districtCode: "DDN", cityCode: "DDN" }, // Dehradun
    "248002": { stateCode: "UK", districtCode: "DDN", cityCode: "DDN" }, // Dehradun
    "248179": { stateCode: "UK", districtCode: "DDN", cityCode: "MSR" }, // Mussoorie
    "249401": { stateCode: "UK", districtCode: "HDW", cityCode: "HDW" }, // Haridwar
    "247667": { stateCode: "UK", districtCode: "HDW", cityCode: "RKE" }, // Roorkee
    
    // Delhi
    "110001": { stateCode: "DL", districtCode: "NDL", cityCode: "NDL" }, // New Delhi
    "110002": { stateCode: "DL", districtCode: "NDL", cityCode: "NDL" }, // New Delhi
    "110016": { stateCode: "DL", districtCode: "SDH", cityCode: "HKS" }, // Hauz Khas
    "110017": { stateCode: "DL", districtCode: "SDH", cityCode: "SKT" }, // Saket
    
    // Punjab
    "143001": { stateCode: "PB", districtCode: "ASR", cityCode: "ASR" }, // Amritsar
    "143002": { stateCode: "PB", districtCode: "ASR", cityCode: "ASR" }, // Amritsar
    "141001": { stateCode: "PB", districtCode: "LDH", cityCode: "LDH" }, // Ludhiana
    "141002": { stateCode: "PB", districtCode: "LDH", cityCode: "LDH" }, // Ludhiana
    
    // Haryana
    "122001": { stateCode: "HR", districtCode: "GGN", cityCode: "GGN" }, // Gurugram
    "122002": { stateCode: "HR", districtCode: "GGN", cityCode: "GGN" }, // Gurugram
    "121001": { stateCode: "HR", districtCode: "FBD", cityCode: "FBD" }, // Faridabad
    "121002": { stateCode: "HR", districtCode: "FBD", cityCode: "FBD" }, // Faridabad
    
    // Uttar Pradesh
    "201001": { stateCode: "UP", districtCode: "GBD", cityCode: "GBD" }, // Ghaziabad
    "201002": { stateCode: "UP", districtCode: "GBD", cityCode: "GBD" }, // Ghaziabad
    "201301": { stateCode: "UP", districtCode: "NDA", cityCode: "NDA" }, // Noida
    "201302": { stateCode: "UP", districtCode: "NDA", cityCode: "NDA" }, // Noida
    
    // Maharashtra
    "400001": { stateCode: "MH", districtCode: "MUM", cityCode: "MUM" }, // Mumbai
    "400002": { stateCode: "MH", districtCode: "MUM", cityCode: "MUM" }, // Mumbai
    "411001": { stateCode: "MH", districtCode: "PNE", cityCode: "PNE" }, // Pune
    "411002": { stateCode: "MH", districtCode: "PNE", cityCode: "PNE" }, // Pune
    
    // Karnataka
    "560001": { stateCode: "KA", districtCode: "BLR", cityCode: "BLR" }, // Bangalore
    "560002": { stateCode: "KA", districtCode: "BLR", cityCode: "BLR" }, // Bangalore
    "570001": { stateCode: "KA", districtCode: "MYS", cityCode: "MYS" }, // Mysore
    "570002": { stateCode: "KA", districtCode: "MYS", cityCode: "MYS" }, // Mysore
    
    // Tamil Nadu
    "600001": { stateCode: "TN", districtCode: "CHN", cityCode: "CHN" }, // Chennai
    "600002": { stateCode: "TN", districtCode: "CHN", cityCode: "CHN" }, // Chennai
    "641001": { stateCode: "TN", districtCode: "CBE", cityCode: "CBE" }, // Coimbatore
    "641002": { stateCode: "TN", districtCode: "CBE", cityCode: "CBE" }, // Coimbatore
  }
};

// Helper functions
export function getStateByCode(stateCode: string) {
  return indiaLocationData.states[stateCode];
}

export function getDistrictByCode(stateCode: string, districtCode: string) {
  return indiaLocationData.states[stateCode]?.districts[districtCode];
}

export function getCityByCode(stateCode: string, districtCode: string, cityCode: string) {
  return indiaLocationData.states[stateCode]?.districts[districtCode]?.cities[cityCode];
}

export function getLocationByPinCode(pinCode: string) {
  const location = indiaLocationData.pinCodeMap[pinCode];
  if (!location) return null;
  
  const { stateCode, districtCode, cityCode } = location;
  
  return {
    state: getStateByCode(stateCode),
    district: getDistrictByCode(stateCode, districtCode),
    city: getCityByCode(stateCode, districtCode, cityCode),
    stateCode,
    districtCode,
    cityCode
  };
}

// Functions to get formatted options for dropdowns
export function getStateOptions() {
  return Object.entries(indiaLocationData.states).map(([code, state]) => ({
    value: code,
    label: state.name
  }));
}

export function getDistrictOptions(stateCode: string) {
  const state = indiaLocationData.states[stateCode];
  if (!state) return [];
  
  return Object.entries(state.districts).map(([code, district]) => ({
    value: code,
    label: district.name
  }));
}

export function getCityOptions(stateCode: string, districtCode: string) {
  const district = indiaLocationData.states[stateCode]?.districts[districtCode];
  if (!district) return [];
  
  return Object.entries(district.cities).map(([code, city]) => ({
    value: code,
    label: city.name
  }));
} 