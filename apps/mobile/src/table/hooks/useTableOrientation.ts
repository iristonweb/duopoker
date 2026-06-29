import { useEffect, useState } from 'react';
import { Dimensions, type ScaledSize } from 'react-native';

/** Matches web `PHONE_MAX_SHORT` — shortest edge ≤ this → phone layout. */
export const PHONE_MAX_SHORT = 767;

export type TableOrientation = {
  width: number;
  height: number;
  isLandscape: boolean;
  isPhone: boolean;
  showOrientationGate: boolean;
};

const compute = ({ width, height }: ScaledSize): TableOrientation => {
  const shortSide = Math.min(width, height);
  const isPhone = shortSide <= PHONE_MAX_SHORT;
  const isLandscape = width > height;
  return {
    width,
    height,
    isLandscape,
    isPhone,
    showOrientationGate: isPhone && !isLandscape
  };
};

export function useTableOrientation(): TableOrientation {
  const [orientation, setOrientation] = useState(() =>
    compute(Dimensions.get('window'))
  );

  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window }) => {
      setOrientation(compute(window));
    });
    return () => sub.remove();
  }, []);

  return orientation;
}
