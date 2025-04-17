import React, { useEffect, useRef, useState } from 'react';
import {Pizza} from '../classes/Pizza';
import { handleCollisions } from '../utils/handleCollisions';

const BOUNCE = 0.99;
const FRICTION = 0.995;

const PizzaCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pizzasRef = useRef<Pizza[]>([]);
  const gravityRef = useRef({ x: 0, y: 0.25 }); // 초기 중력 설정
  const [grabbedIndex, setGrabbedIndex] = useState<number | null>(null);
  const hasMounted = useRef(false);
  const mouse = useRef({ x: 0, y: 0 });
  const logoInfo = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const gyroValues = useRef({ gamma: 0, beta: 0 });

  const imageModules = import.meta.glob('../assets/pizza_imgs/*.{png,jpg,jpeg}', {
    eager: true,
  }) as Record<string, { default: string }>;

  const imageUrls = Object.values(imageModules).map((mod) => mod.default);

  // 화면 회전 방지 (CSS로 처리)
  useEffect(() => {
    document.body.style.setProperty('orientation', 'portrait');
    window.addEventListener('orientationchange', () => {
      // 화면 방향 고정 로직 (필요 시 추가)
      if (window.orientation !== 0) {
        // 브라우저에 따라 화면 고정 요청
        alert('Please keep the device in portrait mode.');
      }
    });
  }, []);

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
            gravityRef.current = { x: 0, y: 0.25 }; // 기본 중력
          }
        })
        .catch((error: Error) => {
          console.error('Error requesting device orientation permission:', error);
          gravityRef.current = { x: 0, y: 0.25 };
        });
    } else {
      window.addEventListener('deviceorientation', handleDeviceOrientation);
    }
  };

  const handleDeviceOrientation = (e: DeviceOrientationEvent) => {
    const gamma = e.gamma ?? 0; // 좌우 기울기 (-90 ~ 90)
    const beta = e.beta ?? 0;   // 앞뒤 기울기 (-180 ~ 180)

    gyroValues.current = { gamma, beta };

    // 기울기를 중력 벡터로 변환
    let x = Math.sin((gamma * Math.PI) / 180); // 좌우 중력
    let y = Math.sin((beta * Math.PI) / 180);   // 상하 중력

    // 흔들기 감지: 기울기가 임계값 이상일 때 중력 증폭
    const shakeThreshold = 30; // 기울기 임계값
    const shakeAmplifier = 1.5; // 흔들기 가속도 배율
    if (Math.abs(gamma) > shakeThreshold || Math.abs(beta) > shakeThreshold) {
      y *= shakeAmplifier;
      x *= shakeAmplifier;
    }

    // 작은 기울기에서는 중력을 0으로 설정해 정지 상태 유지
    if (Math.abs(beta) < 10) {
      y = 0;
    }

    gravityRef.current = { x: x * 0.8, y: y * 0.8 }; // 중력 스케일링
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

    gravityRef.current = { x: 0, y: 0.25 }; // 초기 중력
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

        // 자이로센서 및 중력 정보 표시
        ctx.fillStyle = 'black';
        ctx.font = '16px Arial';
        ctx.fillText(`Gyro: γ=${gyroValues.current.gamma.toFixed(1)}°, β=${gyroValues.current.beta.toFixed(1)}°`, 10, 40);
        ctx.fillText(`Gravity: x=${gravityRef.current.x.toFixed(2)}, y=${gravityRef.current.y.toFixed(2)}`, 10, 60);

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