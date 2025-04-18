import React, { useEffect, useRef, useState } from 'react';

interface Pizza {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  img: HTMLImageElement;
  grabbed: boolean;
}

interface GyroData {
  beta: number; // X축 기울기 (앞뒤)
  gamma: number; // Y축 기울기 (좌우)
}

const BOUNCE = 0.99;
const FRICTION = 0.995;
const GYRO_SENSITIVITY = 0.1; // 자이로 데이터의 민감도 조정

const PizzaCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pizzasRef = useRef<Pizza[]>([]);
  const [grabbedIndex, setGrabbedIndex] = useState<number | null>(null);
  const mouse = useRef({ x: 0, y: 0 });
  const hasMounted = useRef(false);
  const logoInfo = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const [gyroData, setGyroData] = useState<GyroData>({ beta: 0, gamma: 0 });
  const [hasPermission, setHasPermission] = useState<boolean>(false);

  const imageModules = import.meta.glob('../assets/pizza_imgs/*.{png,jpg,jpeg}', {
    eager: true,
  }) as Record<string, { default: string }>;

  // 자이로스코프 권한 요청
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
      setHasPermission(true); // Android 등 권한 없이 사용 가능
    }
  };

  useEffect(() => {
    // 컴포넌트 마운트 시 권한 요청
    if (!hasMounted.current) {
      requestPermission();
    }

    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    if (hasMounted.current) return;
    hasMounted.current = true;

    const logoImg = new Image();
    logoImg.src = '/pizza_school_logo.png';

    const imageUrls = Object.values(imageModules).map((mod) => mod.default);

    const loadImages = async () => {
      const promises = imageUrls.map(
        (src) =>
          new Promise<void>((resolve) => {
            const img = new Image();
            img.src = src;
            img.onload = () => {
              pizzasRef.current.push({
                x: Math.random() * (canvas.width - 100) + 50,
                y: Math.random() * (canvas.height / 2),
                vx: Math.random() * 4 - 2,
                vy: Math.random() * 2,
                radius: 40,
                img,
                grabbed: false,
              });
              resolve();
            };
            img.onerror = () => {
              console.error(`Failed to load image: ${src}`);
              resolve();
            };
          })
      );
      await Promise.all(promises);
    };

    logoImg.onload = () => {
      loadImages().then(() => {
        const animate = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          const logoWidth = logoImg.width * 0.3;
          const logoHeight = logoImg.height * 0.3;
          const logoX = (canvas.width - logoWidth) / 2;
          const logoY = (canvas.height - logoHeight) / 2 - 50;

          logoInfo.current = { x: logoX, y: logoY, width: logoWidth, height: logoHeight };

          ctx.drawImage(logoImg, logoX, logoY, logoWidth, logoHeight);

          ctx.font = '10px Arial';
          ctx.fillStyle = 'black';
          ctx.fillText('Image Source: http://pizzaschool.net/menu/', 10, 20);

          // 자이로 데이터로 가속도 계산
          const ax = gyroData.gamma * GYRO_SENSITIVITY; // 좌우 기울기 -> X축 가속도
          const ay = gyroData.beta * GYRO_SENSITIVITY; // 앞뒤 기울기 -> Y축 가속도

          pizzasRef.current.forEach((pizza) => {
            if (!pizza.grabbed) {
              pizza.vx += ax; // 자이로 기반 X축 가속도
              pizza.vy += ay; // 자이로 기반 Y축 가속도
              pizza.x += pizza.vx;
              pizza.y += pizza.vy;

              // 바닥 충돌
              if (pizza.y + pizza.radius > canvas.height) {
                pizza.y = canvas.height - pizza.radius;
                pizza.vy *= -BOUNCE;
                pizza.vx *= FRICTION;
              }
              // 천장 충돌
              if (pizza.y - pizza.radius < 0) {
                pizza.y = pizza.radius;
                pizza.vy *= -BOUNCE;
                pizza.vx *= FRICTION;
              }
              // 좌우 벽 충돌
              if (pizza.x - pizza.radius < 0 || pizza.x + pizza.radius > canvas.width) {
                pizza.x = Math.max(pizza.radius, Math.min(pizza.x, canvas.width - pizza.radius));
                pizza.vx *= -BOUNCE;
              }
            } else {
              pizza.x = mouse.current.x;
              pizza.y = mouse.current.y;
              pizza.vx = 0;
              pizza.vy = 0;
            }
          });

          pizzasRef.current.forEach((pizza) => {
            ctx.save();
            ctx.beginPath();
            ctx.arc(pizza.x, pizza.y, pizza.radius, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();

            ctx.drawImage(
              pizza.img,
              pizza.x - pizza.radius,
              pizza.y - pizza.radius,
              pizza.radius * 2,
              pizza.radius * 2
            );

            ctx.restore();
          });

          // 피자 간 충돌 처리
          for (let i = 0; i < pizzasRef.current.length; i++) {
            for (let j = i + 1; j < pizzasRef.current.length; j++) {
              const a = pizzasRef.current[i];
              const b = pizzasRef.current[j];
              const dx = b.x - a.x;
              const dy = b.y - a.y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              const minDist = a.radius + b.radius;

              if (dist < minDist) {
                const angle = Math.atan2(dy, dx);
                const overlap = (minDist - dist) / 2;
                const offsetX = Math.cos(angle) * overlap;
                const offsetY = Math.sin(angle) * overlap;

                if (!a.grabbed) {
                  a.x -= offsetX;
                  a.y -= offsetY;
                }
                if (!b.grabbed) {
                  b.x += offsetX;
                  b.y += offsetY;
                }

                const normalX = dx / dist;
                const normalY = dy / dist;
                const relativeVelocityX = b.vx - a.vx;
                const relativeVelocityY = b.vy - a.vy;
                const dotProduct = relativeVelocityX * normalX + relativeVelocityY * normalY;

                if (dotProduct < 0) {
                  const bounce = 0.9;
                  const impulse = (2 * dotProduct) / 2;

                  if (!a.grabbed) {
                    a.vx += impulse * normalX * bounce;
                    a.vy += impulse * normalY * bounce;
                  }
                  if (!b.grabbed) {
                    b.vx -= impulse * normalX * bounce;
                    b.vy -= impulse * normalY * bounce;
                  }
                }
              }
            }
          }

          requestAnimationFrame(animate);
        };

        animate();
      });
    };

    // 자이로스코프 이벤트 리스너
    if (hasPermission) {
      const handleOrientation = (event: DeviceOrientationEvent) => {
        setGyroData({
          beta: event.beta ?? 0,
          gamma: event.gamma ?? 0,
        });
      };

      window.addEventListener('deviceorientation', handleOrientation);
      return () => {
        window.removeEventListener('deviceorientation', handleOrientation);
      };
    }

    // Cleanup
    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [hasPermission]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const handleMouseDown = (e: MouseEvent) => {
      mouse.current.x = e.clientX;
      mouse.current.y = e.clientY;

      pizzasRef.current.forEach((pizza, i) => {
        const dx = e.clientX - pizza.x;
        const dy = e.clientY - pizza.y;
        if (Math.sqrt(dx * dx + dy * dy) < pizza.radius) {
          setGrabbedIndex(i);
          pizza.grabbed = true;
        }
      });
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.current.x = e.clientX;
      mouse.current.y = e.clientY;
    };

    const handleMouseUp = () => {
      if (grabbedIndex !== null) {
        pizzasRef.current[grabbedIndex].grabbed = false;
        setGrabbedIndex(null);
      }
    };

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [grabbedIndex]);

  return (
    <div>
      {hasPermission && (
        <div
          style={{
            position: 'absolute',
            top: '20px',
            left: '20px',
            background: 'rgba(255, 255, 255, 0.8)',
            padding: '10px',
            borderRadius: '5px',
          }}
        >
          <p>Beta (X-axis): {gyroData.beta.toFixed(2)}</p>
          <p>Gamma (Y-axis): {gyroData.gamma.toFixed(2)}</p>
        </div>
      )}
      <canvas ref={canvasRef} style={{ background: '#fffbe0' }} />
    </div>
  );
};

export default PizzaCanvas;