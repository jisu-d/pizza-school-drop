import React, { useState, useEffect } from 'react';

const Test: React.FC = () => {
  // 자이로스코프 데이터를 저장할 state
  const [gyroData, setGyroData] = useState({ alpha: 0, beta: 0, gamma: 0 });

  useEffect(() => {
    // 100ms마다 자이로스코프 데이터를 업데이트
    const interval = setInterval(() => {
      if (window.DeviceOrientationEvent) {
        // DeviceOrientationEvent를 통해 자이로스코프 값을 얻어옴
        window.addEventListener('deviceorientation', (event) => {
          setGyroData({
            alpha: event.alpha ?? 0,
            beta: event.beta ?? 0,
            gamma: event.gamma ?? 0,
          });
        });
      }
      console.log(gyroData);
      
    }, 100); // 100ms 간격으로

    // 컴포넌트가 unmount될 때 interval을 클리어
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <h1>Gyroscope Data</h1>
      <p>Alpha (Z-axis): {gyroData.alpha}</p>
      <p>Beta (X-axis): {gyroData.beta}</p>
      <p>Gamma (Y-axis): {gyroData.gamma}</p>
    </div>
  );
};

export default Test;
