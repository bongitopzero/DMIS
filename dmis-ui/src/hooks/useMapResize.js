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
    if (!map) {
      console.warn("⚠️  useMapResize: map is null");
      return;
    }

    const attemptResize = () => {
      try {
        if (map._mapPane && map._mapPane.offsetHeight > 0) {
          console.log("✅ useMapResize: Calling invalidateSize with pane height:", map._mapPane.offsetHeight);
          map.invalidateSize(false);
        } else {
          console.warn("⚠️  useMapResize: Map pane not ready, height:", map._mapPane?.offsetHeight);
        }
      } catch (err) {
        console.warn("useMapResize error:", err.message);
      }
    };

    // Multiple attempts to ensure resize happens
    const timer1 = setTimeout(attemptResize, 100);
    const timer2 = setTimeout(attemptResize, 300);
    const timer3 = setTimeout(attemptResize, 500);

    // Also invalidate on window resize
    const handleResize = () => {
      try {
        if (map._mapPane && map._mapPane.offsetHeight > 0) {
          console.log("📐 useMapResize: Window resize, calling invalidateSize");
          map.invalidateSize(false);
        }
      } catch (err) {
        console.warn("Map resize warning:", err.message);
      }
    };

    window.addEventListener('resize', handleResize);
    
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      window.removeEventListener('resize', handleResize);
    };
  }, [map]);
};

export default useMapResize;
