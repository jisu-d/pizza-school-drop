import React, { useState, useEffect } from 'react';

interface GyroData {
  alpha: number;
  beta: number;
  gamma: number;
}

const Test: React.FC = () => {
  const [gyroData, setGyroData] = useState<GyroData>({ alpha: 0, beta: 0, gamma: 0 });
  const [hasPermission, setHasPermission] = useState<boolean>(false);

  const requestPermission = async () => {
    if (
      typeof DeviceOrientationEvent !== 'undefined' &&
      typeof (DeviceOrientationEvent as any).requestPermission === 'function'
    ) {
      try {
        const permissionState = await (DeviceOrientationEvent as any).requestPermission();
        if (permissionState === 'granted') {
          setHasPermission(true);
        }
      } catch (error) {
        console.error('Permission error:', error);
      }
    } else {
      // Android 등 permission 없이 사용 가능한 경우
      setHasPermission(true);
    }
  };

  useEffect(() => {
    if (!hasPermission) return;

    const handleOrientation = (event: DeviceOrientationEvent) => {
      setGyroData({
        alpha: event.alpha ?? 0,
        beta: event.beta ?? 0,
        gamma: event.gamma ?? 0,
      });
    };

    window.addEventListener('deviceorientation', handleOrientation);

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, [hasPermission]);

  return (
    <div>
      <h1>Gyroscope Data</h1>
      {!hasPermission ? (
        <button onClick={requestPermission}>자이로센서 사용 허용</button>
      ) : (
        <div>
          <p>Alpha (Z-axis): {gyroData.alpha.toFixed(2)}</p>
          <p>Beta (X-axis): {gyroData.beta.toFixed(2)}</p>
          <p>Gamma (Y-axis): {gyroData.gamma.toFixed(2)}</p>
        </div>
      )}
    </div>
  );
};

export default Test;
