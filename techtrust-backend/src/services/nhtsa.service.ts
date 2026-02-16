/**
 * NHTSA vPIC API Service
 * Serviço para decodificação de VIN usando a API da NHTSA (National Highway Traffic Safety Administration)
 * Documentação: https://vpic.nhtsa.dot.gov/api/
 */

import axios from "axios";

const NHTSA_API_BASE = "https://vpic.nhtsa.dot.gov/api/vehicles";

interface NHTSAVariable {
  Variable: string;
  Value: string | null;
  ValueId: string | null;
}

interface NHTSAResponse {
  Count: number;
  Message: string;
  SearchCriteria: string;
  Results: NHTSAVariable[];
}

export interface DecodedVehicleData {
  success: boolean;
  data?: {
    make: string;
    model: string;
    year: number;
    engineType?: string;
    fuelType?: string;
    bodyType?: string;
    trim?: string;
    driveType?: string;
    numberOfRows?: number;
    seatingCapacity?: number;
    countryOfManufacturer?: string;
    category?: string;
    transmission?: string;
    displacementL?: string;
    engineCylinders?: string;
    vin: string;
  };
  error?: string;
}

/**
 * Decodifica um VIN usando a API da NHTSA
 */
export async function decodeVIN(vin: string): Promise<DecodedVehicleData> {
  try {
    // Validar VIN (deve ter 17 caracteres)
    const cleanVIN = vin.trim().toUpperCase();
    if (cleanVIN.length !== 17) {
      return {
        success: false,
        error: "VIN deve ter exatamente 17 caracteres",
      };
    }

    // Chamar API da NHTSA
    const response = await axios.get<NHTSAResponse>(
      `${NHTSA_API_BASE}/DecodeVin/${cleanVIN}?format=json`,
      {
        timeout: 10000, // 10 segundos
      },
    );

    if (!response.data || !response.data.Results) {
      return {
        success: false,
        error: "Resposta inválida da API NHTSA",
      };
    }

    // Extrair dados relevantes
    const results = response.data.Results;

    // Função auxiliar para buscar valor por variável
    const getValue = (variableName: string): string | null => {
      const item = results.find((r) => r.Variable === variableName);
      return item?.Value || null;
    };

    // Extrair informações principais
    const make = getValue("Make");
    const rawModel = getValue("Model");
    const series = getValue("Series");
    const yearStr = getValue("Model Year");
    const engineModel = getValue("Engine Model") || null;
    const displacementL = getValue("Displacement (L)");
    const engineCylinders = getValue("Engine Number of Cylinders");
    const fuelType = getValue("Fuel Type - Primary");
    const bodyType = getValue("Body Class");
    const trim = getValue("Trim");
    const driveType = getValue("Drive Type");
    const numberOfRowsStr = getValue("Number of Seat Rows");
    const seatingCapacityStr = getValue("Number of Seats");
    const countryOfManufacturer = getValue("Plant Country");
    const category = getValue("Vehicle Type");
    const transmissionStyle = getValue("Transmission Style");
    const transmissionSpeeds = getValue("Transmission Speeds");

    // Build readable engine string: "5.3L V8" or "5.3L V8 (L84)"
    let engineType: string | null = null;
    if (displacementL && engineCylinders) {
      const dispNum = parseFloat(displacementL);
      const cylNum = parseInt(engineCylinders, 10);
      if (!isNaN(dispNum) && !isNaN(cylNum)) {
        engineType = `${dispNum}L V${cylNum}`;
        if (engineModel) engineType += ` (${engineModel})`;
      } else {
        engineType = engineModel || engineCylinders;
      }
    } else {
      engineType =
        engineModel ||
        (engineCylinders ? `${engineCylinders} Cylinders` : null);
    }

    // Build readable transmission string: "10-Speed Automatic"
    let transmission: string | null = null;
    if (transmissionStyle) {
      if (transmissionSpeeds) {
        transmission = `${transmissionSpeeds}-Speed ${transmissionStyle}`;
      } else {
        transmission = transmissionStyle;
      }
    }

    // Combine model with series for full model name (e.g., "Sierra" + "1500" = "Sierra 1500")
    // Only append series if it's different from trim and not already in the model name
    let model = rawModel;
    if (model && series && series !== trim && !model.includes(series)) {
      model = `${model} ${series}`;
    }

    // Verificar se pelo menos Make, Model e Year foram encontrados
    if (!make || !model || !yearStr) {
      return {
        success: false,
        error:
          "VIN não pôde ser decodificado. Verifique se o VIN está correto.",
      };
    }

    const year = parseInt(yearStr, 10);
    if (isNaN(year)) {
      return {
        success: false,
        error: "Ano do veículo inválido no VIN",
      };
    }

    return {
      success: true,
      data: {
        make,
        model,
        year,
        engineType: engineType || undefined,
        fuelType: fuelType || undefined,
        bodyType: bodyType || undefined,
        trim: trim || undefined,
        driveType: driveType || undefined,
        numberOfRows: numberOfRowsStr
          ? parseInt(numberOfRowsStr, 10) || undefined
          : undefined,
        seatingCapacity: seatingCapacityStr
          ? parseInt(seatingCapacityStr, 10) || undefined
          : undefined,
        countryOfManufacturer: countryOfManufacturer || undefined,
        category: category || undefined,
        transmission: transmission || undefined,
        displacementL: displacementL || undefined,
        engineCylinders: engineCylinders || undefined,
        vin: cleanVIN,
      },
    };
  } catch (error: any) {
    console.error("Erro ao decodificar VIN:", error);

    if (error.code === "ECONNABORTED") {
      return {
        success: false,
        error: "Timeout ao conectar com a API NHTSA",
      };
    }

    return {
      success: false,
      error: error.message || "Erro ao decodificar VIN",
    };
  }
}

/**
 * Valida formato de VIN
 */
export function isValidVINFormat(vin: string): boolean {
  const cleanVIN = vin.trim().toUpperCase();

  // VIN deve ter 17 caracteres alfanuméricos (sem I, O, Q)
  const vinRegex = /^[A-HJ-NPR-Z0-9]{17}$/;

  return vinRegex.test(cleanVIN);
}

/**
 * NHTSA Recalls API
 * Checks for manufacturer safety recalls by make/model/year
 * API: https://api.nhtsa.gov/recalls/recallsByVehicle
 */
export interface RecallItem {
  nhtsaCampaignNumber: string;
  component: string;
  summary: string;
  consequence: string;
  remedy: string;
  manufacturer: string;
  reportReceivedDate: string;
}

export interface RecallsResult {
  success: boolean;
  data?: RecallItem[];
  count?: number;
  error?: string;
}

export async function getRecallsByVehicle(
  make: string,
  model: string,
  year: number,
): Promise<RecallsResult> {
  try {
    const response = await axios.get(
      `https://api.nhtsa.gov/recalls/recallsByVehicle`,
      {
        params: { make, model, modelYear: year },
        timeout: 10000,
      },
    );

    const results = response.data?.results || [];

    const recalls: RecallItem[] = results.map((r: any) => ({
      nhtsaCampaignNumber: r.NHTSACampaignNumber || "",
      component: r.Component || "",
      summary: r.Summary || "",
      consequence: r.Consequence || "",
      remedy: r.Remedy || "",
      manufacturer: r.Manufacturer || "",
      reportReceivedDate: r.ReportReceivedDate || "",
    }));

    return {
      success: true,
      data: recalls,
      count: recalls.length,
    };
  } catch (error: any) {
    console.error("Error fetching NHTSA recalls:", error.message);
    return {
      success: false,
      error: error.message || "Failed to fetch recall data",
    };
  }
}
