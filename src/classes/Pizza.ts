// Pizza.ts
export interface Pizza {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  img: HTMLImageElement;
  grabbed: boolean;
}

export class Pizza implements Pizza {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  img: HTMLImageElement;
  grabbed: boolean;

  constructor(x: number, y: number, vx: number, vy: number, img: HTMLImageElement) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.radius = 40;
    this.img = img;
    this.grabbed = false;
  }

  // 중력 및 물리 업데이트
  update(gravity: { x: number; y: number }, canvasWidth: number, canvasHeight: number, bounce: number, friction: number) {
    if (!this.grabbed) {
      // 중력 적용
      this.vx += gravity.x;
      this.vy += gravity.y;

      // 위치 업데이트
      this.x += this.vx;
      this.y += this.vy;

      // 바닥 충돌
      if (this.y + this.radius > canvasHeight) {
        this.y = canvasHeight - this.radius;
        this.vy *= -bounce;
        this.vx *= friction;
      }

      // 천장 충돌
      if (this.y - this.radius < 0) {
        this.y = this.radius;
        this.vy *= -bounce;
        this.vx *= friction;
      }

      // 좌우 벽 충돌
      if (this.x - this.radius < 0) {
        this.x = this.radius;
        this.vx *= -bounce;
      } else if (this.x + this.radius > canvasWidth) {
        this.x = canvasWidth - this.radius;
        this.vx *= -bounce;
      }
    }
  }

  // 위치 강제 설정 (잡혔을 때)
  setPosition(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
  }

  // 그리기
  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(this.img, this.x - this.radius, this.y - this.radius, this.radius * 2, this.radius * 2);
    ctx.restore();
  }
}