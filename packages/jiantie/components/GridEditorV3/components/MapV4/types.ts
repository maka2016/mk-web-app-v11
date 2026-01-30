export interface MkMapProps {
  zoom: number;
  latLng: {
    lat: number;
    lng: number;
  };
  address: string;
}

interface LatLng {
  lat: number;
  lng: number;
}
