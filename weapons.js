// =========================================
// BLADE CLASH ARENA - WEAPONS & SKINS
// 무기 모델링 및 실시간 절차적 렌더링
// =========================================

const DEFAULT_WEAPON_CONFIG_P1 = {
  baseType: 'katana',
  bladeColor: '#00f0ff',
  glowColor: '#0088ff',
  hiltColor: '#1e2433',
  aura: 'neon',
  length: 72,
  width: 7
};

const DEFAULT_WEAPON_CONFIG_P2 = {
  baseType: 'claymore',
  bladeColor: '#ff0055',
  glowColor: '#ff5500',
  hiltColor: '#2b1b22',
  aura: 'fire',
  length: 78,
  width: 9
};

class WeaponManager {
  static getWeaponConfig(playerId) {
    const key = `blade_clash_weapon_${playerId}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse weapon config:", e);
      }
    }
    return playerId === 'p1' ? { ...DEFAULT_WEAPON_CONFIG_P1 } : { ...DEFAULT_WEAPON_CONFIG_P2 };
  }

  static saveWeaponConfig(playerId, config) {
    const key = `blade_clash_weapon_${playerId}`;
    localStorage.setItem(key, JSON.stringify(config));
  }

  // 캔버스에 무기 그리기 (손잡이 기준 (0,0)에서 위/앞쪽으로 그림)
  static drawBlade(ctx, config, swingAngle = 0, isFacingRight = true) {
    ctx.save();
    
    // 좌우 반전 시 스케일 처리
    if (!isFacingRight) {
      ctx.scale(-1, 1);
    }

    ctx.rotate(swingAngle);

    const len = config.length || 70;
    const w = config.width || 7;
    const type = config.baseType || 'katana';
    const bladeColor = config.bladeColor || '#00f0ff';
    const glowColor = config.glowColor || '#0088ff';
    const hiltColor = config.hiltColor || '#1a1a24';

    // 1. 발광(Glow) 효과 세팅
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 12;

    // 2. 손잡이(자루/Hilt) 렌더링
    ctx.fillStyle = hiltColor;
    ctx.fillRect(-w * 0.7, 0, w * 1.4, 20); // 아래로 손잡이

    // 손잡이 끈(Ito) 패턴
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.lineWidth = 1.5;
    for (let y = 3; y < 18; y += 4) {
      ctx.beginPath();
      ctx.moveTo(-w * 0.7, y);
      ctx.lineTo(w * 0.7, y + 2);
      ctx.stroke();
    }

    // 3. 코등이 (Tsuba / Guard)
    ctx.fillStyle = "#e2e8f0";
    ctx.shadowBlur = 6;
    if (type === 'katana') {
      ctx.beginPath();
      ctx.ellipse(0, 0, w * 2.2, 3.5, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (type === 'claymore') {
      ctx.fillRect(-w * 3, -3, w * 6, 6);
    } else if (type === 'lightsaber') {
      ctx.fillStyle = "#718096";
      ctx.beginPath();
      ctx.arc(0, 0, w * 1.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (type === 'rapier') {
      ctx.beginPath();
      ctx.arc(0, 0, w * 2.8, 0, Math.PI);
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = "#cbd5e1";
      ctx.stroke();
    } else if (type === 'dragon') {
      ctx.fillStyle = "#b91c1c";
      ctx.beginPath();
      ctx.moveTo(-w * 2.5, 2);
      ctx.lineTo(0, -6);
      ctx.lineTo(w * 2.5, 2);
      ctx.closePath();
      ctx.fill();
    }

    // 4. 칼날 본체 렌더링 (위쪽 방향 -Y 축)
    ctx.beginPath();
    if (type === 'katana') {
      // 살짝 곡선 카타나
      ctx.moveTo(-w * 0.5, 0);
      ctx.quadraticCurveTo(w * 0.2, -len * 0.6, w * 0.5, -len);
      ctx.lineTo(0, -len - 8); // 칼끝
      ctx.quadraticCurveTo(-w * 0.8, -len * 0.5, -w * 0.5, 0);
    } else if (type === 'claymore') {
      // 대검: 곧고 넓은 양날
      ctx.moveTo(-w, 0);
      ctx.lineTo(-w * 1.1, -len * 0.85);
      ctx.lineTo(0, -len - 10);
      ctx.lineTo(w * 1.1, -len * 0.85);
      ctx.lineTo(w, 0);
    } else if (type === 'lightsaber') {
      // 광선검: 둥근 광선 코어
      ctx.moveTo(-w * 0.8, 0);
      ctx.lineTo(-w * 0.8, -len);
      ctx.arc(0, -len, w * 0.8, Math.PI, 0, false);
      ctx.lineTo(w * 0.8, 0);
    } else if (type === 'rapier') {
      // 레이피어: 가늘고 뾰족
      ctx.moveTo(-w * 0.4, 0);
      ctx.lineTo(-w * 0.15, -len);
      ctx.lineTo(0, -len - 12);
      ctx.lineTo(w * 0.15, -len);
      ctx.lineTo(w * 0.4, 0);
    } else if (type === 'dragon') {
      // 드래곤 팽: 톱니형 마검
      ctx.moveTo(-w * 0.6, 0);
      for (let s = 1; s <= 4; s++) {
        const segY = (-len / 4) * s;
        ctx.lineTo(-w * 1.5, segY + 6);
        ctx.lineTo(-w * 0.5, segY);
      }
      ctx.lineTo(0, -len - 10);
      for (let s = 4; s >= 1; s--) {
        const segY = (-len / 4) * s;
        ctx.lineTo(w * 0.5, segY);
        ctx.lineTo(w * 1.5, segY + 6);
      }
      ctx.lineTo(w * 0.6, 0);
    }

    ctx.closePath();
    ctx.fillStyle = bladeColor;
    ctx.fill();

    // 칼날 중앙 하이라이트/코어 빔
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -len);
    ctx.strokeStyle = type === 'lightsaber' ? "#ffffff" : "rgba(255, 255, 255, 0.65)";
    ctx.lineWidth = type === 'lightsaber' ? w * 0.7 : Math.max(1.5, w * 0.25);
    ctx.stroke();

    ctx.restore();
  }
}
