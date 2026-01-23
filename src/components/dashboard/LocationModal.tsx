import { useState, useEffect } from 'react';
import { toast } from 'sonner';

interface LocationModalProps {
  propertyName: string;
  address: string;
  latitude?: number;
  longitude?: number;
  onClose: () => void;
}

interface Coordinates {
  lat: number;
  lng: number;
}

export function LocationModal({ propertyName, address, latitude, longitude, onClose }: LocationModalProps) {
  const [coordinates, setCoordinates] = useState<Coordinates | null>(
    // Use provided coordinates immediately if available
    latitude && longitude ? { lat: latitude, lng: longitude } : null
  );
  const [loading, setLoading] = useState(!latitude || !longitude);

  // Only geocode if no coordinates provided
  useEffect(() => {
    // If we already have coordinates from props, don't geocode
    if (latitude && longitude) {
      setCoordinates({ lat: latitude, lng: longitude });
      setLoading(false);
      return;
    }

    const geocodeAddress = async () => {
      if (!address) {
        setLoading(false);
        return;
      }

      try {
        const encodedAddress = encodeURIComponent(address);
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1`,
          {
            headers: {
              'Accept-Language': 'pt-BR',
            },
          }
        );
        const data = await response.json();

        if (data && data.length > 0) {
          setCoordinates({
            lat: parseFloat(data[0].lat),
            lng: parseFloat(data[0].lon),
          });
        }
      } catch (error) {
        console.error('Error geocoding address:', error);
      } finally {
        setLoading(false);
      }
    };

    geocodeAddress();
  }, [address, latitude, longitude]);

  const getMapUrl = () => {
    if (coordinates) {
      // Create bounding box around the coordinates (small area for zoom)
      const delta = 0.005;
      const bbox = `${coordinates.lng - delta}%2C${coordinates.lat - delta}%2C${coordinates.lng + delta}%2C${coordinates.lat + delta}`;
      return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${coordinates.lat}%2C${coordinates.lng}`;
    }
    // Fallback to Brazil view
    return `https://www.openstreetmap.org/export/embed.html?bbox=-70%2C-35%2C-30%2C5&layer=mapnik`;
  };

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(address || '');
    toast.success('Endereço copiado!');
  };

  const handleOpenRoute = () => {
    if (coordinates) {
      // Use coordinates for more accurate routing
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${coordinates.lat},${coordinates.lng}`, '_blank');
    } else {
      // Fallback to address
      const encodedAddress = encodeURIComponent(address || '');
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`, '_blank');
    }
  };

  // Split address into street and city
  const addressParts = address?.split(',') || [];
  const streetAddress = addressParts[0]?.trim() || address || 'Endereço não disponível';
  const cityAddress = addressParts.slice(1).join(',').trim() || '';

  return (
    <div className="fixed inset-0 z-[60] bg-background font-display text-foreground antialiased">
      <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden">
        {/* Header */}
        <header className="absolute top-0 left-0 right-0 z-30 flex items-center bg-background/90 px-4 py-4 backdrop-blur-md border-b border-border shadow-sm safe-area-inset-top">
          <button 
            onClick={onClose}
            className="flex items-center justify-center rounded-full p-2 transition-colors hover:bg-accent mr-2"
          >
            <span className="material-symbols-outlined text-foreground">arrow_back</span>
          </button>
          <div className="flex flex-col">
            <h2 className="text-lg font-bold leading-none tracking-tight text-foreground">Localização</h2>
            <span className="text-xs font-medium text-muted-foreground">{propertyName}</span>
          </div>
        </header>

        {/* Map */}
        <main className="relative flex-1 w-full h-full bg-muted z-0">
          {loading ? (
            <div className="flex items-center justify-center w-full h-full">
              <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-muted-foreground">Carregando mapa...</span>
              </div>
            </div>
          ) : (
            <iframe 
              className="w-full h-full object-cover dark:invert dark:grayscale dark:hue-rotate-180 dark:brightness-[0.8] dark:contrast-[1.2] transition-all duration-500" 
              frameBorder="0" 
              scrolling="no" 
              src={getMapUrl()}
              style={{ border: 0 }}
            />
          )}
          
          {/* Gradient overlay */}
          <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-background/20 to-transparent pointer-events-none z-10" />
          
          {/* Location marker overlay - only show when coordinates are loaded */}
          {coordinates && !loading && (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-full -mt-4 z-20 flex flex-col items-center group cursor-pointer">
              <div className="mb-2 opacity-0 transform translate-y-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0">
                <div className="bg-foreground text-background text-[10px] font-bold px-2 py-1 rounded shadow-lg">
                  Propriedade
                </div>
                <div className="w-2 h-2 bg-foreground transform rotate-45 mx-auto -mt-1" />
              </div>
              <div className="relative">
                <span className="material-symbols-outlined filled text-primary text-5xl drop-shadow-lg filter">location_on</span>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-primary/30 rounded-full animate-ping -z-10" />
                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-3 h-1 bg-foreground/30 rounded-full blur-[2px]" />
              </div>
            </div>
          )}

          {/* Address Card */}
          <div className="absolute bottom-28 left-4 right-4 z-20 max-w-md mx-auto">
            <div className="bg-card rounded-2xl p-4 shadow-xl border border-border flex items-center gap-4 animate-fade-in-up">
              <div className="h-12 w-12 shrink-0 rounded-xl bg-muted flex items-center justify-center border border-border">
                <span className="material-symbols-outlined text-primary text-2xl">apartment</span>
              </div>
              <div className="flex flex-col flex-1 min-w-0">
                <h3 className="text-sm font-bold text-foreground truncate">{streetAddress}</h3>
                {cityAddress && (
                  <p className="text-xs text-muted-foreground truncate">{cityAddress}</p>
                )}
              </div>
              <button 
                onClick={handleCopyAddress}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-accent hover:text-primary transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">content_copy</span>
              </button>
            </div>
          </div>
        </main>

        {/* Footer Button */}
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border p-4 pb-safe shadow-[0_-4px_20px_-2px_rgba(0,0,0,0.1)]">
          <div className="max-w-md mx-auto">
            <button 
              onClick={handleOpenRoute}
              className="group relative flex w-full items-center justify-center gap-3 rounded-xl bg-primary py-4 text-base font-bold text-primary-foreground shadow-lg transition-all hover:bg-primary/90 active:scale-[0.98]"
            >
              <span className="material-symbols-outlined">near_me</span>
              <span>Traçar Rota</span>
              <span className="absolute right-4 opacity-0 transition-opacity group-hover:opacity-100">
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
