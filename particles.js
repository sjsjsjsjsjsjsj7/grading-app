// =========================================
// BLADE CLASH ARENA - PARTICLES & FX
// 검기 궤적, 화살 투사체, 핵폭발, 힐 파티클, 방어막
// =========================================

class ParticleSystem {
  constructor() {
    this.particles = [];
    this.slashArcs = [];
    this.textPopups = [];
    this.shieldRings = [];
    this.arrows = []; // 궁수 화살 투사체들
    this.nukeExplosions = []; // 핵폭발 거대 버섯구름
  }

  reset() {
    this.particles = [];
    this.slashArcs = [];
    this.textPopups = [];
    this.shieldRings = [];
    this.arrows = [];
    this.nukeExplosions = [];
  }

  // 1. 궁수 화살 생성
  createArrow(ownerId, x, y, isFacingRight, isSpecial = false) {
    const dir = isFacingRight ? 1 : -1;
    const speed = isSpecial ? 18 : 14;
    this.arrows.push({
      ownerId, // 'p1' or 'p2'
      x,
      y,
      vx: dir * speed,
      vy: isSpecial ? (Math.random() * 2 - 1) : 0,
      damage: isSpecial ? 18 : 12,
      isSpecial,
      length: 32,
      glowColor: ownerId === 'p1' ? '#38bdf8' : '#f43f5e',
      life: 90
    });

    // 화살 발사 시 반짝임 파티클
    for (let i = 0; i < 5; i++) {
      this.particles.push({
        type: 'spark',
        x,
        y,
        vx: -dir * (Math.random() * 3 + 1),
        vy: (Math.random() - 0.5) * 2,
        color: ownerId === 'p1' ? '#38bdf8' : '#f43f5e',
        size: 2,
        alpha: 1,
        decay: 0.05
      });
    }
  }

  // 2. 피 회복 (Heal) 이펙트
  createHealEffect(x, y) {
    for (let i = 0; i < 16; i++) {
      this.particles.push({
        type: 'cross',
        x: x + (Math.random() * 40 - 20),
        y: y + (Math.random() * 60 - 20),
        vx: (Math.random() - 0.5) * 1.2,
        vy: -Math.random() * 2.5 - 1.5,
        color: '#00ff88',
        size: Math.random() * 4 + 3,
        alpha: 1,
        decay: 0.025
      });
    }
    this.addTextPopup(x, y - 25, "+20 HP HEAL", "#00ff88", 20);
  }

  // 3. 초대형 핵폭발 (Nuke Explosion) 이펙트
  createNukeExplosionEffect(x, y) {
    this.nukeExplosions.push({
      x,
      y,
      radius: 20,
      maxRadius: 280,
      alpha: 1,
      timer: 0
    });

    // 사방으로 뿜어져 나가는 80개의 불꽃 파편
    for (let i = 0; i < 80; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 18 + 4;
      this.particles.push({
        type: 'flame',
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: Math.random() > 0.3 ? '#ff0055' : '#ffaa00',
        size: Math.random() * 14 + 6,
        alpha: 1,
        decay: Math.random() * 0.025 + 0.015,
        gravity: 0.08
      });
    }

    this.addTextPopup(x, y - 60, "☢️ NUCLEAR BLAST!!", "#ff0055", 38);
  }

  // 4. 타격 스파크 및 충돌 파편
  createHitSparks(x, y, color = "#ff0055", count = 18, isHeavy = false) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * (isHeavy ? 10 : 6) + 2;
      this.particles.push({
        type: 'spark',
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (Math.random() * 2),
        color: Math.random() > 0.3 ? color : '#ffffff',
        size: Math.random() * 3.5 + 1.5,
        alpha: 1,
        decay: Math.random() * 0.035 + 0.02,
        gravity: 0.25
      });
    }
  }

  // 5. 방어(Block) 성공 충격파 & 파편
  createBlockSparks(x, y, color = "#00f0ff") {
    for (let i = 0; i < 14; i++) {
      const angle = (Math.random() - 0.5) * Math.PI + (color === '#00f0ff' ? -Math.PI/2 : Math.PI/2);
      const speed = Math.random() * 7 + 2;
      this.particles.push({
        type: 'spark',
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: '#00f0ff',
        size: 2.5,
        alpha: 1,
        decay: 0.04,
        gravity: 0.15
      });
    }

    this.shieldRings.push({
      x,
      y,
      radius: 10,
      maxRadius: 55,
      alpha: 1,
      color: '#00f0ff'
    });

    this.addTextPopup(x, y - 20, "BLOCKED!", "#00f0ff", 18);
  }

  // 6. 무기 오라 파티클
  createAuraParticle(x, y, auraType, glowColor) {
    if (auraType === 'none') return;

    if (auraType === 'fire') {
      this.particles.push({
        type: 'flame',
        x: x + (Math.random() * 8 - 4),
        y: y + (Math.random() * 8 - 4),
        vx: (Math.random() - 0.5) * 1.5,
        vy: -Math.random() * 2.5 - 0.5,
        color: Math.random() > 0.4 ? '#ff3300' : '#ffcc00',
        size: Math.random() * 5 + 3,
        alpha: 0.9,
        decay: 0.045
      });
    } else if (auraType === 'lightning') {
      this.particles.push({
        type: 'spark',
        x: x + (Math.random() * 12 - 6),
        y: y + (Math.random() * 12 - 6),
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4,
        color: Math.random() > 0.3 ? '#00e5ff' : '#ffffff',
        size: 2,
        alpha: 1,
        decay: 0.08
      });
    } else if (auraType === 'sakura') {
      this.particles.push({
        type: 'petal',
        x: x + (Math.random() * 6 - 3),
        y: y + (Math.random() * 6 - 3),
        vx: Math.random() * 1.5 - 0.5,
        vy: Math.random() * 1.2 + 0.3,
        color: '#ffb3d9',
        size: Math.random() * 4 + 2,
        alpha: 0.85,
        angle: Math.random() * Math.PI,
        spin: (Math.random() - 0.5) * 0.1,
        decay: 0.02
      });
    } else if (auraType === 'void') {
      this.particles.push({
        type: 'smoke',
        x: x + (Math.random() * 6 - 3),
        y: y + (Math.random() * 6 - 3),
        vx: (Math.random() - 0.5) * 0.8,
        vy: -Math.random() * 1.2,
        color: '#6b21a8',
        size: Math.random() * 6 + 4,
        alpha: 0.8,
        decay: 0.03
      });
    } else if (auraType === 'neon') {
      this.particles.push({
        type: 'spark',
        x: x + (Math.random() * 8 - 4),
        y: y + (Math.random() * 8 - 4),
        vx: (Math.random() - 0.5) * 1.2,
        vy: (Math.random() - 0.5) * 1.2,
        color: glowColor || '#00f0ff',
        size: 3,
        alpha: 0.9,
        decay: 0.04
      });
    }
  }

  // 7. 검기 베기 궤적 (Slash Arc)
  addSlashArc(x, y, radius, startAngle, endAngle, color = "#00f0ff", isSpecial = false) {
    this.slashArcs.push({
      x,
      y,
      radius,
      startAngle,
      endAngle,
      color,
      alpha: 1,
      lineWidth: isSpecial ? 16 : 8,
      isSpecial
    });
  }

  // 8. 플로팅 텍스트
  addTextPopup(x, y, text, color = "#ffcc00", fontSize = 16) {
    this.textPopups.push({
      x,
      y,
      text,
      color,
      fontSize,
      alpha: 1,
      vy: -2
    });
  }

  update() {
    // 1. 화살 투사체 업데이트
    for (let i = this.arrows.length - 1; i >= 0; i--) {
      const arr = this.arrows[i];
      arr.x += arr.vx;
      arr.y += arr.vy;
      arr.life--;

      // 화살 궤적 파티클
      if (Math.random() < 0.6) {
        this.particles.push({
          type: 'spark',
          x: arr.x,
          y: arr.y,
          vx: (Math.random() - 0.5) * 0.8,
          vy: (Math.random() - 0.5) * 0.8,
          color: arr.glowColor,
          size: 1.8,
          alpha: 0.8,
          decay: 0.08
        });
      }

      if (arr.life <= 0) {
        this.arrows.splice(i, 1);
      }
    }

    // 2. 핵폭발 구름 업데이트
    for (let i = this.nukeExplosions.length - 1; i >= 0; i--) {
      const exp = this.nukeExplosions[i];
      exp.radius += (exp.maxRadius - exp.radius) * 0.12;
      exp.timer++;
      if (exp.timer > 20) {
        exp.alpha -= 0.035;
      }
      if (exp.alpha <= 0) {
        this.nukeExplosions.splice(i, 1);
      }
    }

    // 3. 일반 파티클 업데이트
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      if (p.gravity) p.vy += p.gravity;
      if (p.spin) p.angle += p.spin;
      p.alpha -= p.decay;

      if (p.type === 'flame' || p.type === 'smoke') {
        p.size *= 0.96;
      }

      if (p.alpha <= 0 || p.size <= 0.5) {
        this.particles.splice(i, 1);
      }
    }

    // 4. 검기 궤적 업데이트
    for (let i = this.slashArcs.length - 1; i >= 0; i--) {
      const arc = this.slashArcs[i];
      arc.alpha -= arc.isSpecial ? 0.06 : 0.09;
      arc.lineWidth *= 0.92;
      if (arc.alpha <= 0) {
        this.slashArcs.splice(i, 1);
      }
    }

    // 5. 방어 충격파 링 업데이트
    for (let i = this.shieldRings.length - 1; i >= 0; i--) {
      const ring = this.shieldRings[i];
      ring.radius += 3.5;
      ring.alpha -= 0.06;
      if (ring.alpha <= 0 || ring.radius >= ring.maxRadius) {
        this.shieldRings.splice(i, 1);
      }
    }

    // 6. 텍스트 팝업 업데이트
    for (let i = this.textPopups.length - 1; i >= 0; i--) {
      const txt = this.textPopups[i];
      txt.y += txt.vy;
      txt.alpha -= 0.025;
      if (txt.alpha <= 0) {
        this.textPopups.splice(i, 1);
      }
    }
  }

  draw(ctx) {
    // 1. 핵폭발 거대 팽창 구름 (배경)
    ctx.save();
    for (const exp of this.nukeExplosions) {
      ctx.globalAlpha = Math.max(0, exp.alpha);
      const grad = ctx.createRadialGradient(exp.x, exp.y, exp.radius * 0.1, exp.x, exp.y, exp.radius);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.3, '#ffcc00');
      grad.addColorStop(0.7, '#ff0055');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(exp.x, exp.y, exp.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // 2. 화살 투사체 그리기
    ctx.save();
    for (const arr of this.arrows) {
      const dir = arr.vx > 0 ? 1 : -1;
      ctx.shadowColor = arr.glowColor;
      ctx.shadowBlur = arr.isSpecial ? 15 : 8;

      // 화살대
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(arr.x - (dir * arr.length), arr.y);
      ctx.lineTo(arr.x, arr.y);
      ctx.stroke();

      // 화살촉
      ctx.fillStyle = arr.glowColor;
      ctx.beginPath();
      ctx.moveTo(arr.x, arr.y);
      ctx.lineTo(arr.x - (dir * 8), arr.y - 4);
      ctx.lineTo(arr.x - (dir * 8), arr.y + 4);
      ctx.closePath();
      ctx.fill();

      // 화살 깃
      ctx.strokeStyle = arr.glowColor;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(arr.x - (dir * arr.length), arr.y - 4);
      ctx.lineTo(arr.x - (dir * (arr.length - 6)), arr.y);
      ctx.lineTo(arr.x - (dir * arr.length), arr.y + 4);
      ctx.stroke();
    }
    ctx.restore();

    // 3. 검기 궤적 그리기
    ctx.save();
    for (const arc of this.slashArcs) {
      ctx.beginPath();
      ctx.arc(arc.x, arc.y, arc.radius, arc.startAngle, arc.endAngle);
      ctx.strokeStyle = arc.color;
      ctx.globalAlpha = Math.max(0, arc.alpha);
      ctx.lineWidth = arc.lineWidth;
      ctx.lineCap = 'round';
      ctx.shadowColor = arc.color;
      ctx.shadowBlur = arc.isSpecial ? 25 : 12;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(arc.x, arc.y, arc.radius, arc.startAngle, arc.endAngle);
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = Math.max(1.5, arc.lineWidth * 0.35);
      ctx.stroke();
    }
    ctx.restore();

    // 4. 방어 충격파 링
    ctx.save();
    for (const ring of this.shieldRings) {
      ctx.beginPath();
      ctx.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2);
      ctx.strokeStyle = ring.color;
      ctx.lineWidth = 4;
      ctx.globalAlpha = Math.max(0, ring.alpha);
      ctx.shadowColor = ring.color;
      ctx.shadowBlur = 10;
      ctx.stroke();
    }
    ctx.restore();

    // 5. 일반 파티클 (스파크, 힐 십자가, 불꽃, 벚꽃)
    ctx.save();
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;

      if (p.type === 'cross') {
        // 힐 십자가
        const s = p.size;
        ctx.fillRect(p.x - s/2, p.y - s*1.5, s, s*3);
        ctx.fillRect(p.x - s*1.5, p.y - s/2, s*3, s);
      } else if (p.type === 'petal') {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size, p.size * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();

    // 6. 플로팅 텍스트
    ctx.save();
    for (const txt of this.textPopups) {
      ctx.font = `bold ${txt.fontSize}px 'Orbitron', 'Noto Sans KR', sans-serif`;
      ctx.fillStyle = txt.color;
      ctx.globalAlpha = Math.max(0, txt.alpha);
      ctx.shadowColor = txt.color;
      ctx.shadowBlur = 8;
      ctx.textAlign = 'center';
      ctx.fillText(txt.text, txt.x, txt.y);
    }
    ctx.restore();
  }
}

window.particleSystem = new ParticleSystem();
