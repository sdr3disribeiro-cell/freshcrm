import React, { useState, useEffect } from 'react';
import { Cloud, Sun, CloudRain, Wind, MapPin, Search, Loader2, CloudLightning, CloudSnow, Plus, X, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getCurrentWeather, searchCities, City, WeatherData } from '../services/weatherService';

interface SavedCity extends City {
    weather?: WeatherData | null;
    lastUpdated?: number;
}

const WeatherWidget: React.FC = () => {
    const [cities, setCities] = useState<SavedCity[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<City[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    // Load cities on mount
    useEffect(() => {
        const saved = localStorage.getItem('freshcrm_weather_cities');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setCities(parsed);
                refreshWeather(parsed);
            } catch (e) {
                console.error("Failed to parse cities", e);
            }
        } else {
            // Default city if none
            const defaultCity: SavedCity = {
                id: 3448439, name: 'São Paulo', latitude: -23.5475, longitude: -46.6361, country: 'Brasil'
            };
            setCities([defaultCity]);
            refreshWeather([defaultCity]);
        }
    }, []);

    // Save on change
    useEffect(() => {
        if (cities.length > 0) {
            localStorage.setItem('freshcrm_weather_cities', JSON.stringify(cities));
        }
    }, [cities]);

    const refreshWeather = async (cityList: SavedCity[]) => {
        setLoading(true);
        const updated = await Promise.all(cityList.map(async (c) => {
            // Cache simple: 30 mins
            if (c.weather && c.lastUpdated && Date.now() - c.lastUpdated < 1800000) return c;

            const w = await getCurrentWeather(c.latitude, c.longitude);
            return { ...c, weather: w, lastUpdated: Date.now() };
        }));
        setCities(updated);
        setLoading(false);
    };

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;

        setLoading(true);
        const results = await searchCities(searchQuery);
        setSearchResults(results);
        setLoading(false);
    };

    const addCity = async (city: City) => {
        if (cities.some(c => c.latitude === city.latitude)) {
            setIsSearching(false);
            setSearchQuery('');
            setSearchResults([]);
            return;
        }

        const weather = await getCurrentWeather(city.latitude, city.longitude);
        const newCity: SavedCity = { ...city, weather, lastUpdated: Date.now() };

        setCities(prev => [...prev, newCity]);
        setIsSearching(false);
        setSearchQuery('');
        setSearchResults([]);
    };

    const removeCity = (lat: number) => {
        setCities(prev => prev.filter(c => c.latitude !== lat));
    };

    const getIcon = (code: number, isDay: boolean) => {
        if (code <= 1) return isDay ? <Sun className="text-yellow-500" size={32} /> : <Sun className="text-slate-400" size={32} />;
        if (code <= 3) return <Cloud className="text-slate-400" size={32} />;
        if (code >= 51) return <CloudRain className="text-blue-500" size={32} />;
        return <Cloud className="text-slate-400" size={32} />;
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
                <h3 className="text-white font-bold flex items-center gap-2">
                    <Cloud size={18} className="text-orange-500" />
                    Clima
                </h3>
                <button
                    onClick={() => setIsSearching(!isSearching)}
                    className="text-xs text-orange-400 hover:text-orange-300 flex items-center gap-1 bg-orange-500/10 px-2 py-1 rounded-md transition-colors"
                >
                    {isSearching ? <X size={14} /> : <Plus size={14} />}
                    {isSearching ? 'Fechar' : 'Adicionar'}
                </button>
            </div>

            <AnimatePresence>
                {isSearching && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <form onSubmit={handleSearch} className="flex gap-2 mb-2">
                            <input
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Buscar cidade..."
                                className="w-full bg-[#18181b] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-orange-500 outline-none"
                                autoFocus
                            />
                            <button type="submit" disabled={loading} className="bg-orange-600 px-3 rounded-lg text-white">
                                {loading ? <Loader2 className="animate-spin" size={16} /> : <Search size={16} />}
                            </button>
                        </form>

                        {searchResults.length > 0 && (
                            <div className="bg-[#18181b] border border-slate-800 rounded-lg overflow-hidden mb-4">
                                {searchResults.map(city => (
                                    <button
                                        key={city.id}
                                        onClick={() => addCity(city)}
                                        className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white border-b border-slate-800 last:border-0"
                                    >
                                        {city.name} - {city.country}
                                    </button>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
                <AnimatePresence>
                    {cities.map((city) => (
                        <motion.div
                            key={city.id} // Assuming ID is technically unique, or layout+long
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="bg-gradient-to-br from-[#18181b] to-[#0F1115] rounded-xl border border-slate-800 p-4 shadow-lg group relative overflow-hidden shrink-0"
                        >
                            <button
                                onClick={() => removeCity(city.latitude)}
                                className="absolute top-2 right-2 text-slate-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all z-20"
                            >
                                <Trash2 size={14} />
                            </button>

                            <div className="flex items-center justify-between relative z-10">
                                <div>
                                    <div className="flex items-center gap-1 text-slate-400 text-xs font-medium mb-1">
                                        <MapPin size={12} className="text-orange-500" />
                                        {city.name}
                                    </div>
                                    {city.weather ? (
                                        <div>
                                            <div className="text-2xl font-bold text-white">
                                                {Math.round(city.weather.temperature)}°
                                            </div>
                                            <div className="text-xs text-slate-500">
                                                Vento: {city.weather.windSpeed} km/h
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 text-slate-500 text-xs py-2">
                                            <Loader2 size={12} className="animate-spin" /> Carregando...
                                        </div>
                                    )}
                                </div>

                                <div>
                                    {city.weather && getIcon(city.weather.weatherCode, city.weather.isDay)}
                                </div>
                            </div>

                            {/* Decor */}
                            <div className="absolute -bottom-4 -right-4 w-16 h-16 bg-orange-500/5 rounded-full blur-xl pointer-events-none" />
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default WeatherWidget;
