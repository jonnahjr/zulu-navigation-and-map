import { useState } from 'react';
import { RouteStep } from '../types/navigation';

export const useDirections = () => {
  // Placeholder: Replace with real directions fetching logic
  const [steps] = useState<RouteStep[]>([
    { instruction: 'Head north on Main St', distance: '200m', duration: '2 min' },
    { instruction: 'Turn right onto 2nd Ave', distance: '500m', duration: '5 min' },
    { instruction: 'Destination will be on the left', distance: '100m', duration: '1 min' },
  ]);
  return { steps };
};
