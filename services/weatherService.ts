export interface City {
    id: number;
    name: string;
    latitude: number;
    longitude: number;
    admin1?: string; // State/Region
    country?: string;
}

export interface WeatherData {
    temperature: number;
    weatherCode: number;
    windSpeed: number;
    isDay: boolean; // 1 = day, 0 = night
}

// Map WMO Weather Codes to readable strings/icons
// https://open-meteo.com/en/docs
export const getWeatherDescription = (code: number): string => {
    switch (code) {
        case 0: return 'Céu Limpo';
        case 1: return 'Principalmente Limpo';
        case 2: return 'Parcialmente Nublado';
        case 3: return 'Encoberto';
        case 45: case 48: return 'Nevoeiro';
        case 51: case 53: case 55: return 'Garoa';
        case 61: case 63: case 65: return 'Chuva';
        case 71: case 73: case 75: return 'Neve';
        case 95: return 'Tempestade';
        default: return 'Desconhecido';
    }
};

export const searchCities = async (query: string): Promise<City[]> => {
    if (!query || query.length < 3) return [];

    try {
        const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=pt&format=json`);
        const data = await response.json();

        if (!data.results) return [];

        return data.results.map((item: any) => ({
            id: item.id,
            name: item.name,
            latitude: item.latitude,
            longitude: item.longitude,
            admin1: item.admin1,
            country: item.country
        }));
    } catch (error) {
        console.error("Error searching cities:", error);
        return [];
    }
};

export const getCurrentWeather = async (lat: number, lon: number): Promise<WeatherData | null> => {
    try {
        const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
        const data = await response.json();

        if (!data.current_weather) return null;

        return {
            temperature: data.current_weather.temperature,
            weatherCode: data.current_weather.weathercode,
            windSpeed: data.current_weather.windspeed,
            isDay: data.current_weather.is_day === 1
        };
    } catch (error) {
        console.error("Error fetching weather:", error);
        return null;
    }
};
