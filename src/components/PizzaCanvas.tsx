import React, { useEffect, useRef, useState } from 'react';
import { Pizza } from '../classes/Pizza';
import { handleCollisions } from '../utils/handleCollisions';

const GRAVITY = 0.25;
const BOUNCE = 0.99;
const FRICTION = 0.995;

const PizzaCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pizzasRef = useRef<Pizza[]>([]);
  const [grabbedIndex, setGrabbedIndex] = useState<number | null>(null);
  const mouse = useRef({ x: 0, y: 0 });
  const hasMounted = useRef(false);
  const logoInfo = useRef({ x: 0, y: 0, width: 0, height: 0 });

  const imageModules = import.meta.glob('../assets/pizza_imgs/*.{png,jpg,jpeg}', {
    eager: true,
  }) as Record<string, { default: string }>;

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
              pizzasRef.current.push(
                new Pizza(
                  Math.random() * (canvas.width - 100) + 50,
                  Math.random() * (canvas.height / 2),
                  Math.random() * 4 - 2,
                  Math.random() * 2,
                  40,
                  img
                )
              );
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

          pizzasRef.current.forEach((pizza) => {
            pizza.update(canvas.width, canvas.height, GRAVITY, BOUNCE, FRICTION, mouse.current);
            pizza.draw(ctx);
          });

          handleCollisions(pizzasRef.current);

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
          pizzasRef.current.push(
            new Pizza(
              clickX,
              clickY,
              Math.random() * 4 - 2,
              Math.random() * 2,
              40,
              newImg
            )
          );
        };
      }
    });

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

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [grabbedIndex]);

  return <canvas ref={canvasRef} style={{ background: '#fffbe0' }} />;
};

export default PizzaCanvas;
