import React, { useEffect, useRef, useState } from 'react';
import type { Pizza, GyroData } from '../types/Pizza';

const GRAVITY = 0.9;
const BOUNCE = 0.99;
const FRICTION = 0.995;
const GYRO_SENSITIVITY = 0.1;

const isMobileDevice = () => {
  return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
};

const getAdjustedGravity = (beta: number, gamma: number) => {
  const angle = window.orientation || 0;
  let ax = gamma;
  let ay = beta;

  if (angle === 90 || angle === -90) {
    ax = -beta;
    ay = gamma;
  }

  if (window.innerWidth > window.innerHeight) {
    ax = -ax;
    ay = -ay;
  }

  return { ax: ax, ay: ay };
};

const PizzaCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pizzasRef = useRef<Pizza[]>([]);
  const [grabbedIndex, setGrabbedIndex] = useState<number | null>(null);
  const mouse = useRef({ x: 0, y: 0 });
  const hasMounted = useRef(false);
  const logoInfo = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const gyroRef = useRef<GyroData>({ alpha: 0, beta: 0, gamma: 0 });
  const [hasPermission, setHasPermission] = useState<boolean>(!isMobileDevice() ? true : false);

  const imageModules = import.meta.glob('../assets/pizza_imgs/*.{png,jpg,jpeg}', {
    eager: true,
  }) as Record<string, { default: string }>;

  const requestPermission = async () => {
    if (
      typeof DeviceOrientationEvent !== 'undefined' &&
      typeof (DeviceOrientationEvent as any).requestPermission === 'function'
    ) {
      try {
        const permissionState = await (DeviceOrientationEvent as any).requestPermission();
        if (permissionState === 'granted') {
          setHasPermission(true);
          alert('성ㅇ공야')
          
        } else{
          alert('실패여')
        } 
      } catch (error) {
        console.error('Permission error:', error);
        alert('실패여2')
      }
    } else {
      setHasPermission(true);
    }
  }; 

  useEffect(() => {
    // if (!hasPermission) return;

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


    alert(isMobileDevice())
    if (isMobileDevice()) {
      requestPermission();
    }

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

    const loadImage = (src: string) => {
      return new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
      });
    };

    async function startAnimation() {
      try {
        const logoImg = await loadImage('/pizza_school_logo.png');
        await loadImages();
        runAnimationLoop(logoImg);
      } catch (error) {
        console.error('이미지 로딩 실패:', error);
      }
    }

    const runAnimationLoop = (logoImg: HTMLImageElement) => {
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


        ctx.font = '12px Arial';
        ctx.fillStyle = 'blue';
        ctx.fillText(`Alpha: ${gyroRef.current.alpha.toFixed(2)}`, 10, 40);
        ctx.fillText(`Beta: ${gyroRef.current.beta.toFixed(2)}`, 10, 60);
        ctx.fillText(`Gamma: ${gyroRef.current.gamma.toFixed(2)}`, 10, 80);

        // const { ax, ay } = getAdjustedGravity(gyroRef.current.beta, gyroRef.current.gamma);
        let adjustedAx = 0;
        let adjustedAy = 0;

        if (hasPermission && isMobileDevice()) {
          // 모바일 자이로 기반 중력
          const { ax, ay } = getAdjustedGravity(
            gyroRef.current.beta,
            gyroRef.current.gamma
          );
          adjustedAx = ax * GYRO_SENSITIVITY;
          adjustedAy = ay * GYRO_SENSITIVITY;
        } else {
          // 데스크탑은 아래 GRAVITY만 적용
          adjustedAx = 0;
          adjustedAy = 0;
        }

        pizzasRef.current.forEach((pizza) => {
          if (!pizza.grabbed) {
            pizza.vx += adjustedAx;
            pizza.vy += adjustedAy;

            if (adjustedAx === 0 && adjustedAy === 0) {
              pizza.vy += GRAVITY;
            }

            pizza.x += pizza.vx;
            pizza.y += pizza.vy;

            if (pizza.y + pizza.radius > canvas.height) {
              pizza.y = canvas.height - pizza.radius;
              pizza.vy *= -BOUNCE;
              pizza.vx *= FRICTION;
            }

            if (pizza.y - pizza.radius < 0) {
              pizza.y = pizza.radius;
              pizza.vy *= -BOUNCE;
              pizza.vx *= FRICTION;
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
    };

    canvas.addEventListener('click', (e: MouseEvent) => {
      const { x, y, width, height } = logoInfo.current;
      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      if (clickX >= x && clickX <= x + width && clickY >= y && clickY <= y + height) {
        const imageUrls = Object.values(imageModules).map((mod) => mod.default);
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

    startAnimation();

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

    const handleOrientation = (event: DeviceOrientationEvent) => {
      if (!isMobileDevice()) return;
      gyroRef.current = {
        alpha: event.alpha ?? 0,
        beta: event.beta ?? 0,
        gamma: event.gamma ?? 0,
      };
    };

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

    if (isMobileDevice()) {
      window.addEventListener('deviceorientation', handleOrientation);
    }

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('touchstart', handleTouchStart);
    canvas.addEventListener('touchend', handleTouchEnd);
    document.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      if (isMobileDevice()) {
        window.removeEventListener('deviceorientation', handleOrientation);
      }
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('touchmove', handleTouchMove);
    };
  }, [grabbedIndex]);

  return (
    <div>
      <canvas ref={canvasRef} style={{ background: '#fffbe0' }} />
    </div>
  );
};

export default PizzaCanvas;
