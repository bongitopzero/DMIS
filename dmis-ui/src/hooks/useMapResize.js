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
    if (!map) return;

    try {
      // Wait longer for map pane to be fully initialized
      const timer = setTimeout(() => {
        try {
          // Check if map pane exists before invalidating
          if (map._mapPane && map._mapPane.offsetHeight > 0) {
            map.invalidateSize(false); // false = no animation
          }
        } catch (err) {
          console.warn("Map invalidateSize warning:", err.message);
        }
      }, 300); // Increased delay to 300ms

      // Also invalidate on window resize
      const handleResize = () => {
        try {
          if (map._mapPane && map._mapPane.offsetHeight > 0) {
            map.invalidateSize(false);
          }
        } catch (err) {
          console.warn("Map resize warning:", err.message);
        }
      };

      window.addEventListener('resize', handleResize);
      
      return () => {
        clearTimeout(timer);
        window.removeEventListener('resize', handleResize);
      };
    } catch (err) {
      console.warn("useMapResize error:", err.message);
    }
  }, [map]);

  return map;
};

export default useMapResize;
