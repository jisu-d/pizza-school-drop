export interface Pizza {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  img: HTMLImageElement;
  grabbed: boolean;
}

export interface GyroData {
  alpha: number;
  beta: number;
  gamma: number;
}