// =========================================
// BLADE CLASH ARENA - WEAPON CUSTOMIZER
// 칼 스킨 공방 & 실시간 3D 스타일 프리뷰
// =========================================

class WeaponCustomizer {
  constructor() {
    this.targetPlayer = 'p1';
    this.config = WeaponManager.getWeaponConfig('p1');
    
    // 프리뷰 캔버스 관련
    this.canvas = document.getElementById('weaponPreviewCanvas');
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.previewAngle = -Math.PI / 4;
    this.isRotating = true;
    this.isSwinging = false;
    this.swingFrame = 0;
    this.particles = [];

    this.initUI();
    this.startPreviewLoop();
  }

  initUI() {
    // 탭 전환 (1P / 2P)
    const tabP1 = document.getElementById('tab-p1-weapon');
    const tabP2 = document.getElementById('tab-p2-weapon');

    if (tabP1 && tabP2) {
      tabP1.addEventListener('click', () => {
        this.targetPlayer = 'p1';
        tabP1.classList.add('active');
        tabP2.classList.remove('active');
        this.loadConfig();
      });

      tabP2.addEventListener('click', () => {
        this.targetPlayer = 'p2';
        tabP2.classList.add('active');
        tabP1.classList.remove('active');
        this.loadConfig();
      });
    }

    // 무기 타입 선택
    document.querySelectorAll('.weapon-type-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.weapon-type-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.config.baseType = btn.getAttribute('data-type');
      });
    });

    // 컬러 피커
    const bladeColorInput = document.getElementById('blade-color');
    const glowColorInput = document.getElementById('blade-glow-color');
    const hiltColorInput = document.getElementById('hilt-color');

    if (bladeColorInput) {
      bladeColorInput.addEventListener('input', (e) => {
        this.config.bladeColor = e.target.value;
      });
    }
    if (glowColorInput) {
      glowColorInput.addEventListener('input', (e) => {
        this.config.glowColor = e.target.value;
      });
    }
    if (hiltColorInput) {
      hiltColorInput.addEventListener('input', (e) => {
        this.config.hiltColor = e.target.value;
      });
    }

    // 오라 선택
    document.querySelectorAll('.aura-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.aura-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.config.aura = btn.getAttribute('data-aura');
      });
    });

    // 슬라이더
    const lenInput = document.getElementById('blade-length');
    const lenVal = document.getElementById('blade-length-val');
    if (lenInput) {
      lenInput.addEventListener('input', (e) => {
        this.config.length = parseInt(e.target.value);
        if (lenVal) lenVal.textContent = e.target.value;
      });
    }

    const widthInput = document.getElementById('blade-width');
    const widthVal = document.getElementById('blade-width-val');
    if (widthInput) {
      widthInput.addEventListener('input', (e) => {
        this.config.width = parseInt(e.target.value);
        if (widthVal) widthVal.textContent = e.target.value;
      });
    }

    // 프리뷰 액션 버튼
    const btnSwing = document.getElementById('btn-preview-swing');
    if (btnSwing) {
      btnSwing.addEventListener('click', () => {
        this.isSwinging = true;
        this.swingFrame = 0;
        if (window.soundEngine) soundEngine.playSwing(false);
      });
    }

    const btnRotate = document.getElementById('btn-preview-rotate');
    if (btnRotate) {
      btnRotate.addEventListener('click', () => {
        this.isRotating = !this.isRotating;
      });
    }

    // 저장 버튼
    const btnSave = document.getElementById('btn-save-skin');
    if (btnSave) {
      btnSave.addEventListener('click', () => {
        WeaponManager.saveWeaponConfig(this.targetPlayer, this.config);
        // 인게임 파이터 업데이트
        if (window.gameInstance) {
          window.gameInstance.updateFighterWeapons();
        }
        // 피드백 텍스트
        btnSave.textContent = "✅ 장착 완료!";
        setTimeout(() => {
          btnSave.textContent = "💾 스킨 저장 및 장착";
          document.getElementById('customizer-modal').classList.add('hidden');
        }, 600);
      });
    }

    // 초기화 버튼
    const btnReset = document.getElementById('btn-reset-skin');
    if (btnReset) {
      btnReset.addEventListener('click', () => {
        const def = this.targetPlayer === 'p1' ? DEFAULT_WEAPON_CONFIG_P1 : DEFAULT_WEAPON_CONFIG_P2;
        this.config = { ...def };
        this.syncInputsWithConfig();
      });
    }
  }

  loadConfig() {
    this.config = WeaponManager.getWeaponConfig(this.targetPlayer);
    this.syncInputsWithConfig();
  }

  syncInputsWithConfig() {
    // 버튼 active 상태 맞추기
    document.querySelectorAll('.weapon-type-btn').forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-type') === this.config.baseType);
    });

    document.querySelectorAll('.aura-btn').forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-aura') === this.config.aura);
    });

    const bladeColorInput = document.getElementById('blade-color');
    if (bladeColorInput) bladeColorInput.value = this.config.bladeColor;

    const glowColorInput = document.getElementById('blade-glow-color');
    if (glowColorInput) glowColorInput.value = this.config.glowColor;

    const hiltColorInput = document.getElementById('hilt-color');
    if (hiltColorInput) hiltColorInput.value = this.config.hiltColor;

    const lenInput = document.getElementById('blade-length');
    const lenVal = document.getElementById('blade-length-val');
    if (lenInput) {
      lenInput.value = this.config.length;
      if (lenVal) lenVal.textContent = this.config.length;
    }

    const widthInput = document.getElementById('blade-width');
    const widthVal = document.getElementById('blade-width-val');
    if (widthInput) {
      widthInput.value = this.config.width;
      if (widthVal) widthVal.textContent = this.config.width;
    }
  }

  startPreviewLoop() {
    const loop = () => {
      this.renderPreview();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  renderPreview() {
    if (!this.ctx || !this.canvas) return;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.clearRect(0, 0, w, h);

    // 배경 그리드 링
    ctx.save();
    ctx.strokeStyle = "rgba(0, 240, 255, 0.08)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 110, 0, Math.PI * 2);
    ctx.arc(w / 2, h / 2, 150, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // 회전 또는 스윙 각도 계산
    let currentAngle = this.previewAngle;
    if (this.isSwinging) {
      this.swingFrame += 0.08;
      currentAngle = -Math.PI * 0.8 + Math.sin(this.swingFrame * Math.PI) * Math.PI * 1.5;
      if (this.swingFrame >= 1) {
        this.isSwinging = false;
        this.swingFrame = 0;
      }
    } else if (this.isRotating) {
      this.previewAngle += 0.015;
      currentAngle = this.previewAngle;
    }

    // 칼 렌더링 (중앙에 위치)
    ctx.save();
    ctx.translate(w / 2, h / 2 + 30);
    WeaponManager.drawBlade(ctx, this.config, currentAngle, true);

    // 칼끝에서 오라 파티클 생성
    const tipDist = this.config.length || 70;
    const tipX = Math.sin(currentAngle) * tipDist;
    const tipY = -Math.cos(currentAngle) * tipDist;

    if (Math.random() < 0.4 && this.config.aura !== 'none') {
      this.particles.push({
        x: w / 2 + tipX + (Math.random() * 8 - 4),
        y: h / 2 + 30 + tipY + (Math.random() * 8 - 4),
        vx: (Math.random() - 0.5) * 1.5,
        vy: -Math.random() * 2 - 0.5,
        color: this.config.glowColor,
        size: Math.random() * 4 + 2,
        alpha: 1
      });
    }
    ctx.restore();

    // 프리뷰 파티클 렌더링
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= 0.035;
      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}
