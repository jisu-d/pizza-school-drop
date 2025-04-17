export class Pizza {
    x: number;
    y: number;
    vx: number;
    vy: number;
    radius: number;
    img: HTMLImageElement;
    grabbed: boolean;
  
    constructor(
      x: number,
      y: number,
      vx: number,
      vy: number,
      radius: number,
      img: HTMLImageElement
    ) {
      this.x = x;
      this.y = y;
      this.vx = vx;
      this.vy = vy;
      this.radius = radius;
      this.img = img;
      this.grabbed = false;
    }
  
    update(
      canvasWidth: number,
      canvasHeight: number,
      gravity: number,
      bounce: number,
      friction: number,
      mouse: { x: number; y: number }
    ) {
      if (!this.grabbed) {
        this.vy += gravity;
        this.x += this.vx;
        this.y += this.vy;
  
        if (this.y + this.radius > canvasHeight) {
          this.y = canvasHeight - this.radius;
          this.vy *= -bounce;
          this.vx *= friction;
        }
  
        if (this.x - this.radius < 0 || this.x + this.radius > canvasWidth) {
          this.x = Math.max(this.radius, Math.min(this.x, canvasWidth - this.radius));
          this.vx *= -bounce;
        }
      } else {
        this.x = mouse.x;
        this.y = mouse.y;
        this.vx = 0;
        this.vy = 0;
      }
    }
  
    draw(ctx: CanvasRenderingContext2D) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(
        this.img,
        this.x - this.radius,
        this.y - this.radius,
        this.radius * 2,
        this.radius * 2
      );
      ctx.restore();
    }
  }
  