import React, { useEffect, useRef, useState } from 'react';
import Pizza from '../classes/Pizza';
import { handleCollisions } from '../utils/handleCollisions';

const BOUNCE = 0.99;
const FRICTION = 0.995;

const PizzaCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pizzasRef = useRef<Pizza[]>([]);
  const gravityRef = useRef({ x: 0, y: 0 });
  const [grabbedIndex, setGrabbedIndex] = useState<number | null>(null);
  const hasMounted = useRef(false);
  const mouse = useRef({ x: 0, y: 0 });
  const logoInfo = useRef({ x: 0, y: 0, width: 0, height: 0 });

  const imageModules = import.meta.glob('../assets/pizza_imgs/*.{png,jpg,jpeg}', {
    eager: true,
  }) as Record<string, { default: string }>;

  const imageUrls = Object.values(imageModules).map((mod) => mod.default);

  // ✅ DeviceOrientation 권한 요청 (iOS Safari 대응)
  const requestDeviceOrientationPermission = () => {
    if (
      typeof DeviceOrientationEvent !== 'undefined' &&
      // @ts-ignore
      typeof DeviceOrientationEvent.requestPermission === 'function'
    ) {
      // @ts-ignore
      DeviceOrientationEvent.requestPermission()
        .then((permissionState: string) => {
          if (permissionState === 'granted') {
            window.addEventListener('deviceorientation', handleDeviceOrientation);
          } else {
            console.warn('Device orientation permission denied');
            // 기본 중력 설정
            gravityRef.current = { x: 0, y: 0.25 };
          }
        })
        .catch((error: Error) => {
          console.error('Error requesting device orientation permission:', error);
          gravityRef.current = { x: 0, y: 0.25 };
        });
    } else {
      // 권한 요청이 필요 없는 경우 (Android 또는 데스크톱)
      window.addEventListener('deviceorientation', handleDeviceOrientation);
    }
  };

  // ✅ 기울기 감지 (중력 계산 개선)
  const handleDeviceOrientation = (e: DeviceOrientationEvent) => {
    const gamma = e.gamma ?? 0; // 좌우 기울기 (-90 ~ 90도)
    const beta = e.beta ?? 0; // 앞뒤 기울기 (-180 ~ 180도)

    // gamma와 beta를 사용하여 중력 벡터 계산
    // gamma: 좌우 기울기 -> x축 중력
    // beta: 앞뒤 기울기 -> y축 중력
    const x = Math.sin((gamma * Math.PI) / 180); // 좌우 기울기를 x축 중력으로 변환
    let y = Math.sin((beta * Math.PI) / 180); // 앞뒤 기울기를 y축 중력으로 변환

    // iOS에서 beta 값이 0도 근처일 때 부자연스러운 움직임을 방지
    if (Math.abs(beta) < 10) {
      y = 0; // 작은 기울기에서는 y축 중력을 0으로 설정
    }

    // 중력 크기 조정 (0.8은 중력의 강도를 조절)
    gravityRef.current = { x: x * 0.8, y: y * 0.8 };
  };

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const logoImg = new Image();
    logoImg.src = '/pizza_school_logo.png';

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // ✅ 최초 중력 설정 및 권한 요청
    gravityRef.current = { x: 0, y: 0.25 }; // 기본 중력 (아래로)
    requestDeviceOrientationPermission();

    if (hasMounted.current) return;
    hasMounted.current = true;

    const loadPizzas = () => {
      imageUrls.forEach((src) => {
        const img = new Image();
        img.src = src;
        img.onload = () => {
          pizzasRef.current.push(
            new Pizza(
              Math.random() * (canvas.width - 100) + 50,
              Math.random() * (canvas.height / 2),
              Math.random() * 4 - 2,
              Math.random() * 2,
              img
            )
          );
        };
      });
    };

    logoImg.onload = () => {
      loadPizzas();

      const animate = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const logoWidth = logoImg.width * 0.3;
        const logoHeight = logoImg.height * 0.3;
        const logoX = (canvas.width - logoWidth) / 2;
        const logoY = (canvas.height - logoHeight) / 2 - 50;

        logoInfo.current = { x: logoX, y: logoY, width: logoWidth, height: logoHeight };
        ctx.drawImage(logoImg, logoX, logoY, logoWidth, logoHeight);
        ctx.fillStyle = 'black';
        ctx.font = '10px Arial';
        ctx.fillText('Image Source: http://pizzaschool.net/menu/', 10, 20);

        pizzasRef.current.forEach((pizza) => {
          if (pizza.grabbed) {
            pizza.setPosition(mouse.current.x, mouse.current.y);
          } else {
            pizza.update(gravityRef.current, canvas.width, canvas.height, BOUNCE, FRICTION);
          }
          pizza.draw(ctx);
        });

        handleCollisions(pizzasRef.current);
        requestAnimationFrame(animate);
      };

      animate();
    };

    canvas.addEventListener('click', (e) => {
      const { x, y, width, height } = logoInfo.current;
      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      if (clickX >= x && clickX <= x + width && clickY >= y && clickY <= y + height) {
        const randomIndex = Math.floor(Math.random() * imageUrls.length);
        const newImg = new Image();
        newImg.src = imageUrls[randomIndex];
        newImg.onload = () => {
          pizzasRef.current.push(
            new Pizza(clickX, clickY, Math.random() * 4 - 2, Math.random() * 2, newImg)
          );
        };
      }
    });

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('deviceorientation', handleDeviceOrientation);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const getPointerPos = (e: MouseEvent | TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const y = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
      return { x: x - rect.left, y: y - rect.top };
    };

    const handleDown = (e: MouseEvent | TouchEvent) => {
      const { x, y } = getPointerPos(e);
      mouse.current = { x, y };
      pizzasRef.current.forEach((pizza, i) => {
        const dx = x - pizza.x;
        const dy = y - pizza.y;
        if (Math.sqrt(dx * dx + dy * dy) < pizza.radius) {
          setGrabbedIndex(i);
          pizza.grabbed = true;
        }
      });
    };

    const handleMove = (e: MouseEvent | TouchEvent) => {
      const { x, y } = getPointerPos(e);
      mouse.current = { x, y };
    };

    const handleUp = () => {
      if (grabbedIndex !== null) {
        pizzasRef.current[grabbedIndex].grabbed = false;
        setGrabbedIndex(null);
      }
    };

    canvas.addEventListener('mousedown', handleDown);
    canvas.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    canvas.addEventListener('touchstart', handleDown, { passive: false });
    canvas.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleUp);

    return () => {
      canvas.removeEventListener('mousedown', handleDown);
      canvas.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      canvas.removeEventListener('touchstart', handleDown);
      canvas.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleUp);
    };
  }, [grabbedIndex]);

  return <canvas ref={canvasRef} style={{ background: '#fffbe0', touchAction: 'none' }} />;
};

export default PizzaCanvas;