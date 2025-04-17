import { Pizza } from '../classes/Pizza';

export function handleCollisions(pizzas: Pizza[]) {
  for (let i = 0; i < pizzas.length; i++) {
    for (let j = i + 1; j < pizzas.length; j++) {
      const a = pizzas[i];
      const b = pizzas[j];
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
        const relativeVelocityX = b.vx - a.vx; // 오타 수정
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
}