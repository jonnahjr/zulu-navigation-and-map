declare module 'react-native-maps' {
  import { ComponentType } from 'react';
  import { ViewProps } from 'react-native';

  export const PROVIDER_GOOGLE: string;
  export type MapType = 'standard' | 'satellite' | 'terrain' | 'hybrid' | 'none' | 'mutedStandard';

  export const Marker: ComponentType<any>;
  export const Polyline: ComponentType<any>;
  const MapView: ComponentType<ViewProps & { mapType?: MapType; provider?: any; children?: any }>;
  export default MapView;
}
