class Particle {
  constructor({ x, y, size = 1, radius = 1.2 } = {}) {
    this.x = x
    this.y = y
    this.size = size
    this.rate = Math.random() //微粒速度（0,1]
    this.angle = Math.PI * 2 * Math.random() //微粒便宜角度

    //每次微粒移动速度分解为横纵坐标的移动
    this.vx = radius * Math.cos(this.angle) * this.rate
    this.vy = radius * Math.sin(this.angle) * this.rate
  }

  go() {
      this.x += this.vx
      this.y += this.vy
      this.vy += 0.02 //重力影响 y越偏下

      //空气阻力
      this.vx *= 0.98
      this.vy *= 0.98
  }
  render(ctx){
      this.go()
      ctx.beginPath()
      ctx.arc(this.x, this.y, this.size,0,Math.PI * 2, false)
      ctx.fill()  
  }
}
