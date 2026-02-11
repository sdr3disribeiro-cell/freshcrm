import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Company } from '../types';

// Fix for default marker icon in Leaflet with Webpack/Vite
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface MapComponentProps {
    companies: Company[];
}

// Component to update map view when companies change
const MapUpdater: React.FC<{ companies: Company[] }> = ({ companies }) => {
    const map = useMap();

    useEffect(() => {
        if (companies.length === 0) return;

        const bounds = L.latLngBounds(companies.map(c => {
            if (c.lat && c.lng) {
                return [c.lat, c.lng] as [number, number];
            }
            // Mock coordinates if not present (In a real app, you'd need geocoding)
            return getCoordinates(c);
        }));

        map.fitBounds(bounds, { padding: [50, 50] });
    }, [companies, map]);

    return null;
};

// Helper to generate consistent mock coordinates for Brazil based on string hash
// In production this should be replaced by real Geocoding API data stored in Company
const getCoordinates = (c: Company): [number, number] => {
    // Brazil center approx: -14.2350, -51.9253
    // We'll use the city name to offset from center to show them distributed
    const str = (c.city || '') + (c.state || '');
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }

    // Normalize hash to create a spread
    const latOffset = (hash % 1000) / 100;
    const lonOffset = ((hash >> 10) % 1000) / 100;

    // Base roughly on a center point in Brazil (e.g., Minas/Goias)
    // -15 deg Lat, -50 deg Lon
    return [-15 + latOffset, -50 + lonOffset];
};

const MapComponent: React.FC<MapComponentProps> = ({ companies }) => {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return <div className="h-full w-full bg-slate-100 animate-pulse flex items-center justify-center text-slate-400">Carregando Mapa...</div>;

    const positions = companies.map(c => ({
        pos: (c.lat && c.lng) ? [c.lat, c.lng] as [number, number] : getCoordinates(c),
        company: c
    }));

    const polylinePositions = positions.map(p => p.pos);

    return (
        <MapContainer center={[-15, -50]} zoom={4} style={{ height: '100%', width: '100%', zIndex: 0 }}>
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapUpdater companies={companies} />

            {positions.map((item, idx) => (
                <Marker key={item.company.id} position={item.pos}>
                    <Popup>
                        <div className="text-sm">
                            <strong>{item.company.fantasyName || item.company.name}</strong><br />
                            {item.company.city} - {item.company.state}<br />
                            {item.company.address}
                        </div>
                    </Popup>
                </Marker>
            ))}

            <Polyline positions={polylinePositions} color="blue" weight={3} opacity={0.7} dashArray="10, 10" />
        </MapContainer>
    );
};

export default MapComponent;
