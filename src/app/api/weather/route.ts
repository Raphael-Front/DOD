import { NextRequest, NextResponse } from "next/server";

// Open-Meteo: API gratuita, sem necessidade de chave
const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

// Mapeamento de códigos WMO para descrição em português
const WEATHER_LABELS: Record<number, string> = {
  0: "Céu limpo",
  1: "Principalmente limpo",
  2: "Parcialmente nublado",
  3: "Nublado",
  45: "Neblina",
  48: "Neblina com geada",
  51: "Garoa leve",
  53: "Garoa moderada",
  55: "Garoa densa",
  61: "Chuva leve",
  63: "Chuva moderada",
  65: "Chuva forte",
  66: "Chuva congelante leve",
  67: "Chuva congelante forte",
  71: "Neve leve",
  73: "Neve moderada",
  75: "Neve forte",
  77: "Grãos de neve",
  80: "Pancadas de chuva leve",
  81: "Pancadas de chuva moderada",
  82: "Pancadas de chuva forte",
  85: "Pancadas de neve leve",
  86: "Pancadas de neve forte",
  95: "Tempestade",
  96: "Tempestade com granizo leve",
  99: "Tempestade com granizo forte",
};

function getWeatherLabel(code: number): string {
  return WEATHER_LABELS[code] ?? "Condições variáveis";
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const city = searchParams.get("city") || "São Paulo";
    const state = searchParams.get("state") || "";

    // Geocoding: cidade + estado para melhor precisão no Brasil
    const searchQuery = state ? `${city}, ${state}, Brasil` : `${city}, Brasil`;
    const geoRes = await fetch(
      `${GEOCODING_URL}?name=${encodeURIComponent(searchQuery)}&count=1&language=pt`
    );
    const geoData = await geoRes.json();

    if (!geoData.results?.[0]) {
      return NextResponse.json(
        { error: "Localização não encontrada" },
        { status: 404 }
      );
    }

    const { latitude, longitude } = geoData.results[0];

    // Previsão para os próximos 2 dias (hoje e amanhã)
    const forecastRes = await fetch(
      `${FORECAST_URL}?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=America/Sao_Paulo&forecast_days=2`
    );
    const forecastData = await forecastRes.json();

    if (!forecastData.daily?.time?.length) {
      return NextResponse.json(
        { error: "Previsão não disponível" },
        { status: 502 }
      );
    }

    // Dia seguinte = índice 1 (índice 0 é hoje)
    const tomorrowIndex = forecastData.daily.time.length > 1 ? 1 : 0;
    const tomorrow = {
      date: forecastData.daily.time[tomorrowIndex],
      tempMax: forecastData.daily.temperature_2m_max[tomorrowIndex],
      tempMin: forecastData.daily.temperature_2m_min[tomorrowIndex],
      weatherCode: forecastData.daily.weathercode[tomorrowIndex],
      description: getWeatherLabel(forecastData.daily.weathercode[tomorrowIndex]),
    };

    return NextResponse.json({
      location: { city, state, latitude, longitude },
      tomorrow,
    });
  } catch (error) {
    console.error("[API Weather]", error);
    return NextResponse.json(
      { error: "Erro ao buscar previsão do tempo" },
      { status: 500 }
    );
  }
}
