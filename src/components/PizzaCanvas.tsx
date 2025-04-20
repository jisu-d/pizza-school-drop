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
  alpha: number;
  beta: number;
  gamma: number;
}

const GRAVITY = 0.25;
const BOUNCE = 0.99;
const FRICTION = 0.995;

const GYRO_SENSITIVITY = 0.05; // 자이로 데이터의 민감도 조정

const getAdjustedGravity = (beta: number, gamma: number) => {
  const angle = window.orientation || 0;  // 화면 회전 각도 가져오기 (세로, 가로 모드)
  
  let ax = gamma;
  let ay = beta;

  // 세로 모드일 때
  if (angle === 0 || angle === 180) {
    ax = gamma;
    ay = beta;
  } 
  // 가로 모드일 때 (90도 또는 -90도 회전)
  else if (angle === 90 || angle === -90) {
    ax = -beta;  // 가로 모드에서는 gamma와 beta를 반대로 처리
    ay = gamma;
  }

  // 가로 모드에서 반전된 값을 복구
  if (window.innerWidth > window.innerHeight) {
    ax = -ax;
    ay = -ay;
  }

  // 값을 반환 (각각 부호 반전)
  return { ax: ax, ay: ay };
};



const PizzaCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pizzasRef = useRef<Pizza[]>([]);
  const [grabbedIndex, setGrabbedIndex] = useState<number | null>(null);
  const mouse = useRef({ x: 0, y: 0 });
  const hasMounted = useRef(false);
  const logoInfo = useRef({ x: 0, y: 0, width: 0, height: 0 });

  // const [gyroData, setGyroData] = useState<GyroData>({ alpha: 0, beta: 0, gamma: 0 });
  const gyroRef = useRef<GyroData>({ alpha: 0, beta: 0, gamma: 0 });
  // const [hasPermission, setHasPermission] = useState<boolean>(false);

  const imageModules = import.meta.glob('../assets/pizza_imgs/*.{png,jpg,jpeg}', {
    eager: true,
  }) as Record<string, { default: string }>;

  const requestPermission = async () => {
    if (
      typeof DeviceOrientationEvent !== 'undefined' &&
      typeof (DeviceOrientationEvent as any).requestPermission === 'function'
    ) {
      try {
        // const permissionState = await (DeviceOrientationEvent as any).requestPermission();
        // if (permissionState === 'granted') {
        //   setHasPermission(true);
        // }
      } catch (error) {
        console.error('Permission error:', error);
      }
    } else {
      // Android 등 permission 없이 사용 가능한 경우
      // setHasPermission(true);
    }
  };

  useEffect(() => {
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

    requestPermission()

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

          const { ax, ay } = getAdjustedGravity(
            gyroRef.current.beta,
            gyroRef.current.gamma
          );
          
          // 민감도 적용
          const adjustedAx = ax * GYRO_SENSITIVITY;
          const adjustedAy = ay * GYRO_SENSITIVITY;

          pizzasRef.current.forEach((pizza) => {
            if (!pizza.grabbed) {
              pizza.vx += adjustedAx;
              pizza.vy += adjustedAy;
              
              pizza.vy += GRAVITY;
              pizza.x += pizza.vx;
              pizza.y += pizza.vy;

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

    canvas.addEventListener('click', (e: MouseEvent) => {
      const { x, y, width, height } = logoInfo.current;
      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      if (clickX >= x && clickX <= x + width && clickY >= y && clickY <= y + height) {
        const randomIndex = Math.floor(Math.random() * imageUrls.length);
        const newImg = new Image();
        newImg.src = imageUrls[randomIndex];
        newImg.onload = () => {
          pizzasRef.current.push({
            x: clickX,
            y: clickY,
            vx: Math.random() * 4 - 2,
            vy: Math.random() * 2,
            radius: 40,
            img: newImg,
            grabbed: false,
          });
        };
      }
    });

    // Cleanup
    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

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

    const handleOrientation = (event: DeviceOrientationEvent) => {
      const newGyro = {
        alpha: event.alpha ?? 0,
        beta: event.beta ?? 0,
        gamma: event.gamma ?? 0,
      };
      // setGyroData(newGyro); 
      gyroRef.current = newGyro; // <- 애니메이션에서 바로 참조 가능
    };

    // 터치 이벤트 핸들러
    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      mouse.current.x = touch.clientX;
      mouse.current.y = touch.clientY;

      pizzasRef.current.forEach((pizza, i) => {
        const dx = touch.clientX - pizza.x;
        const dy = touch.clientY - pizza.y;
        if (Math.sqrt(dx * dx + dy * dy) < pizza.radius) {
          setGrabbedIndex(i);
          pizza.grabbed = true;
        }
      });
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;

      if (window.scrollY === 0 && e.touches[0].clientY > 0) {
        e.preventDefault();
      }
      const touch = e.touches[0];
      mouse.current.x = touch.clientX;
      mouse.current.y = touch.clientY;
    };

    const handleTouchEnd = () => {
      if (grabbedIndex !== null) {
        pizzasRef.current[grabbedIndex].grabbed = false;
        setGrabbedIndex(null);
      }
    };


    window.addEventListener('deviceorientation', handleOrientation);

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    canvas.addEventListener('touchstart', handleTouchStart);
    canvas.addEventListener('touchend', handleTouchEnd);

    document.addEventListener('touchmove', handleTouchMove, {
      passive: false,
    });

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.addEventListener('deviceorientation', handleOrientation);

      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchMove);
    };
  }, [grabbedIndex]);

  return (
    <div>
      <canvas ref={canvasRef} style={{ background: '#fffbe0' }} />
    </div>
  )
};

export default PizzaCanvas;
