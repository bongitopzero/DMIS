import { useEffect } from 'react';
import { useMap } from 'react-leaflet';

/**
 * Custom hook to handle Leaflet map resizing
 * Fixes issues where map doesn't display properly on mount/update
 * 
 * Usage in component:
 * const MapContent = () => {
 *   useMapResize();
 *   return <markers... />;
 * };
 * 
 * <MapContainer...>
 *   <MapContent />
 * </MapContainer>
 */
export const useMapResize = () => {
  const map = useMap();

  useEffect(() => {
    // Invalidate map size immediately on mount
    setTimeout(() => {
      map.invalidateSize();
    }, 100);

    // Also invalidate on window resize
    const handleResize = () => {
      map.invalidateSize();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [map]);

  return map;
};

export default useMapResize;
