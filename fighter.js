// =========================================
// BLADE CLASH ARENA - FIGHTER CLASS
// 물리, 직업 시스템 (궁수/검사/핵폭탄), 방향 전환, 전투
// =========================================

class Fighter {
  constructor(id, name, x, y, isFacingRight, colorTheme) {
    this.id = id; // 'p1' or 'p2'
    this.name = name;
    this.x = x;
    this.y = y;
    this.spawnX = x;
    this.spawnY = y;
    this.width = 46;
    this.height = 84;
    this.vx = 0;
    this.vy = 0;
    this.speed = 5.8;
    this.jumpPower = 15.8;
    this.gravity = 0.65;
    this.isFacingRight = isFacingRight;
    this.isGrounded = false;
    this.colorTheme = colorTheme; // { primary: '#00f0ff', secondary: '#0088ff' }

    // 직업: 'sword' (검사) | 'archer' (궁수) | 'nuke' (핵폭탄)
    this.jobClass = 'sword';

    // 스탯
    this.maxHp = 100;
    this.hp = 100;
    this.maxStamina = 100;
    this.stamina = 100;
    this.isDead = false;

    // 핵폭탄 고유 스킬 변수
    this.nukeCountdown = 0; // 0: 꺼짐, >0: 6초 카운트다운 (360프레임)
    this.nukeDetonated = false;
    this.healCooldown = 0; // 3초 쿨타임 (180프레임)

    // 궁수 쿨타임
    this.arrowCooldown = 0;

    // 전투 상태
    this.state = 'idle'; // 'idle', 'run', 'jump', 'attack_light', 'attack_heavy', 'block', 'roll', 'hurt', 'ko', 'stunned'
    this.stateTimer = 0;
    this.isBlocking = false;
    this.isAttacking = false;
    this.attackFrame = 0;
    this.comboStep = 0;
    this.canCombo = false;
    this.comboHits = 0;

    // 히트박스 & 피격 무적
    this.invulnerableTimer = 0;
    this.hitRegistered = false;

    // 무기 스킨 (검사 전용)
    this.weaponConfig = WeaponManager.getWeaponConfig(this.id);
    this.swordAngle = 0;

    // 애니메이션 보간용
    this.animTimer = Math.random() * 100;
  }

  setJobClass(job) {
    this.jobClass = job;
    this.updateHUDJobBadge();
  }

  reset(x = this.spawnX, isFacingRight = (this.id === 'p1')) {
    this.x = x;
    this.y = this.spawnY;
    this.vx = 0;
    this.vy = 0;
    this.hp = this.maxHp;
    this.stamina = this.maxStamina;
    this.state = 'idle';
    this.stateTimer = 0;
    this.isBlocking = false;
    this.isAttacking = false;
    this.attackFrame = 0;
    this.comboStep = 0;
    this.isDead = false;
    this.invulnerableTimer = 0;
    this.isFacingRight = isFacingRight;
    this.nukeCountdown = 0;
    this.nukeDetonated = false;
    this.healCooldown = 0;
    this.arrowCooldown = 0;
    this.weaponConfig = WeaponManager.getWeaponConfig(this.id);
    this.updateHUDJobBadge();
  }

  updateWeaponConfig() {
    this.weaponConfig = WeaponManager.getWeaponConfig(this.id);
  }

  updateHUDJobBadge() {
    const badge = document.getElementById(`${this.id}-job-badge`);
    if (badge) {
      badge.className = `job-badge ${this.jobClass}`;
      if (this.jobClass === 'archer') badge.textContent = '🏹 궁수';
      else if (this.jobClass === 'sword') badge.textContent = '⚔️ 검사';
      else if (this.jobClass === 'nuke') badge.textContent = '☢️ 핵폭탄';
    }

    const staminaLabel = document.getElementById(`${this.id}-stamina-label`);
    if (staminaLabel) {
      if (this.jobClass === 'nuke') {
        staminaLabel.textContent = '방어 기력 (회복 쿨타임 별도)';
      } else if (this.jobClass === 'archer') {
        staminaLabel.textContent = '덤블링 기동 스태미나';
      } else {
        staminaLabel.textContent = '가드 실드 (방어 에너지)';
      }
    }
  }

  // 방향 전환 (즉각적인 1프레임 스냅)
  turnFace(isRight) {
    if (this.state === 'ko') return;
    this.isFacingRight = isRight;
  }

  // 이동
  move(direction) {
    if (this.state === 'ko' || this.state === 'stunned') return;

    // 즉시 방향 전환
    this.isFacingRight = direction > 0;

    if (this.isBlocking) {
      this.vx = direction * (this.speed * 0.3);
      return;
    }
    if (this.isAttacking && this.jobClass === 'sword') {
      return;
    }

    this.vx = direction * this.speed;
    if (this.isGrounded && this.state !== 'attack_light' && this.state !== 'attack_heavy' && this.state !== 'roll') {
      this.state = 'run';
    }
  }

  stopMove() {
    if (this.state === 'run') {
      this.state = 'idle';
    }
    this.vx *= 0.4;
  }

  // 점프
  jump() {
    if (this.state === 'ko' || this.state === 'stunned' || this.state === 'roll') return;
    if (this.isGrounded && !this.isBlocking) {
      this.vy = -this.jumpPower;
      this.isGrounded = false;
      this.state = 'jump';
      if (window.soundEngine) soundEngine.playJump();

      for (let i = 0; i < 6; i++) {
        window.particleSystem.particles.push({
          type: 'spark',
          x: this.x + (Math.random() * 20 - 10),
          y: this.y + this.height,
          vx: (Math.random() - 0.5) * 4,
          vy: -Math.random() * 2,
          color: '#556677',
          size: 2,
          alpha: 0.6,
          decay: 0.05
        });
      }
    }
  }

  // 막기 / 힐 / 덤블링 (L 키)
  startBlock() {
    if (this.state === 'ko' || this.state === 'stunned') return;

    if (this.jobClass === 'nuke') {
      // ☢️ 핵폭탄: 피 회복 스킬! (전체 피에서 1/5인 20 HP 회복, 쿨타임 3초)
      this.useHealSkill();
      return;
    }

    if (this.jobClass === 'archer') {
      // 🏹 궁수: 회피 덤블링 구르기!
      this.useArcherRoll();
      return;
    }

    // ⚔️ 검사: 홀로그램 실드 가드
    if (this.stamina > 10 && !this.isAttacking) {
      this.isBlocking = true;
      this.state = 'block';
    }
  }

  stopBlock() {
    if (this.isBlocking) {
      this.isBlocking = false;
      if (this.state === 'block') {
        this.state = this.isGrounded ? 'idle' : 'jump';
      }
    }
  }

  // 일반 공격 (J 키)
  attackLight() {
    if (this.state === 'ko' || this.state === 'stunned' || this.isBlocking || this.state === 'roll') return;

    if (this.jobClass === 'nuke') {
      // ☢️ 핵폭탄: 6초 버티기 자폭 기폭 스킬!
      this.startNukeCountdown();
      return;
    }

    if (this.jobClass === 'archer') {
      // 🏹 궁수: 화살 발사!
      this.shootArrow(false);
      return;
    }

    // ⚔️ 검사: 칼 3단 베기
    if (this.isAttacking && !this.canCombo) return;
    this.isAttacking = true;
    this.state = 'attack_light';
    this.attackFrame = 0;
    this.hitRegistered = false;
    this.comboStep = (this.comboStep + 1) % 3;
    this.canCombo = false;

    if (window.soundEngine) soundEngine.playSwing(false);
    this.vx = (this.isFacingRight ? 1 : -1) * 3;
  }

  // 특수 공격 (K 키)
  attackSpecial() {
    if (this.state === 'ko' || this.state === 'stunned' || this.isBlocking || this.state === 'roll') return;

    if (this.jobClass === 'nuke') {
      // ☢️ 핵폭탄: 6초 버티기 자폭 기폭 스킬!
      this.startNukeCountdown();
      return;
    }

    if (this.jobClass === 'archer') {
      // 🏹 궁수: 3연발 관통 화살 발사!
      this.shootArrow(true);
      return;
    }

    // ⚔️ 검사: 회전 돌진베기
    if (this.isAttacking || this.stamina < 20) return;
    this.stamina -= 20;
    this.isAttacking = true;
    this.state = 'attack_heavy';
    this.attackFrame = 0;
    this.hitRegistered = false;

    if (window.soundEngine) soundEngine.playSpecial();
    this.vx = (this.isFacingRight ? 1 : -1) * 8.5;
  }

  // 🏹 궁수: 화살 발사 로직
  shootArrow(isSpecial = false) {
    if (this.arrowCooldown > 0) return;

    this.arrowCooldown = isSpecial ? 35 : 18;
    this.isAttacking = true;
    this.attackFrame = 0;
    this.state = 'attack_light';

    if (window.soundEngine) soundEngine.playArrowShoot();

    const handX = this.x + (this.isFacingRight ? this.width + 10 : -10);
    const handY = this.y + 36;

    if (isSpecial) {
      // 3연발 화살
      window.particleSystem.createArrow(this.id, handX, handY - 6, this.isFacingRight, true);
      setTimeout(() => {
        if (!this.isDead) window.particleSystem.createArrow(this.id, handX, handY, this.isFacingRight, true);
      }, 70);
      setTimeout(() => {
        if (!this.isDead) window.particleSystem.createArrow(this.id, handX, handY + 6, this.isFacingRight, true);
      }, 140);
    } else {
      // 단발 화살
      window.particleSystem.createArrow(this.id, handX, handY, this.isFacingRight, false);
    }
  }

  // 🏹 궁수: 회피 덤블링
  useArcherRoll() {
    if (this.stamina < 25 || this.state === 'roll') return;
    this.stamina -= 25;
    this.state = 'roll';
    this.stateTimer = 18;
    this.invulnerableTimer = 16; // 무적
    const dir = this.isFacingRight ? 1 : -1;
    this.vx = dir * 11;
    if (window.soundEngine) soundEngine.playJump();
  }

  // ☢️ 핵폭탄: 6초 카운트다운 자폭 스킬 시작
  startNukeCountdown() {
    if (this.nukeCountdown > 0) return; // 이미 카운트다운 진행 중
    this.nukeCountdown = 360; // 60fps * 6초 = 360프레임
    if (window.soundEngine) soundEngine.playNukeCountdown(6);
    window.particleSystem.addTextPopup(this.x + this.width / 2, this.y - 20, "⚠️ 기폭 타이머: 6초 버티기!", "#ff0055", 22);
  }

  // ☢️ 핵폭탄: 피 회복 스킬 (전체 체력의 1/5인 20 HP 즉시 회복, 쿨타임 3초)
  useHealSkill() {
    if (this.healCooldown > 0) {
      const secLeft = (this.healCooldown / 60).toFixed(1);
      window.particleSystem.addTextPopup(this.x + this.width / 2, this.y - 15, `쿨타임 ${secLeft}초`, "#94a3b8", 14);
      return;
    }

    // 전체 피(100)의 1/5 = 20 HP 회복
    const healAmount = Math.floor(this.maxHp / 5);
    this.hp = Math.min(this.maxHp, this.hp + healAmount);
    this.healCooldown = 180; // 3초 (60fps * 3 = 180프레임)

    if (window.soundEngine) soundEngine.playHeal();
    window.particleSystem.createHealEffect(this.x + this.width / 2, this.y + this.height / 2);
  }

  // 피격 처리
  takeDamage(amount, isHeavy, attacker) {
    if (this.isDead || this.invulnerableTimer > 0) return false;

    // 검사의 가드 성공 판정
    const attackerIsOnRight = attacker.x > this.x;
    const facingAttacker = (this.isFacingRight && attackerIsOnRight) || (!this.isFacingRight && !attackerIsOnRight);

    if (this.jobClass === 'sword' && this.isBlocking && facingAttacker && this.stamina > 10) {
      const guardCost = isHeavy ? 28 : 16;
      this.stamina = Math.max(0, this.stamina - guardCost);

      const reducedDamage = Math.floor(amount * 0.12);
      this.hp = Math.max(0, this.hp - reducedDamage);

      this.vx = (this.isFacingRight ? -1 : 1) * (isHeavy ? 6 : 3);
      if (window.soundEngine) soundEngine.playBlock();

      const shieldX = this.x + (this.isFacingRight ? this.width * 0.9 : 0);
      const shieldY = this.y + this.height * 0.45;
      window.particleSystem.createBlockSparks(shieldX, shieldY, this.colorTheme.primary);

      if (this.stamina <= 0) {
        this.state = 'stunned';
        this.stateTimer = 45;
        this.isBlocking = false;
        window.particleSystem.addTextPopup(this.x + this.width / 2, this.y - 10, "GUARD BREAK!", "#ff0055", 20);
      }
      return true;
    }

    // 피격
    this.hp = Math.max(0, this.hp - amount);
    this.invulnerableTimer = 18;
    this.isAttacking = false;
    this.isBlocking = false;
    this.state = 'hurt';
    this.stateTimer = isHeavy ? 22 : 14;

    const knockDir = attacker.isFacingRight ? 1 : -1;
    this.vx = knockDir * (isHeavy ? 9 : 5);
    this.vy = isHeavy ? -4 : -2;

    if (window.soundEngine) soundEngine.playHit(isHeavy);

    const sparkX = this.x + this.width / 2;
    const sparkY = this.y + this.height * 0.45;
    const sparkColor = attacker.weaponConfig ? attacker.weaponConfig.glowColor : attacker.colorTheme.primary;
    window.particleSystem.createHitSparks(sparkX, sparkY, sparkColor, isHeavy ? 24 : 14, isHeavy);
    window.particleSystem.addTextPopup(sparkX, sparkY - 20, isHeavy ? `CRITICAL -${amount}` : `-${amount}`, isHeavy ? "#ff0055" : "#ffcc00", isHeavy ? 22 : 16);

    // 사망 판정
    if (this.hp <= 0) {
      this.hp = 0;
      this.isDead = true;
      this.state = 'ko';
      this.nukeCountdown = 0; // 사망 시 핵폭발 중단
      if (window.soundEngine) soundEngine.playKO();
    }
    return true;
  }

  // 검사 근접 히트박스
  getAttackHitbox() {
    if (!this.isAttacking || this.jobClass !== 'sword') return null;
    const len = this.weaponConfig.length || 70;
    const reach = len + 15;
    const hx = this.isFacingRight ? this.x + this.width * 0.5 : this.x + this.width * 0.5 - reach;
    const hy = this.y + 10;
    return { x: hx, y: hy, w: reach, h: this.height * 0.8 };
  }

  // 피격박스
  getHurtbox() {
    return {
      x: this.x + 6,
      y: this.y,
      w: this.width - 12,
      h: this.height
    };
  }

  update(groundY, stageLeft, stageRight, opponent) {
    this.animTimer += 0.08;

    // 1. 무적 타이머
    if (this.invulnerableTimer > 0) this.invulnerableTimer--;

    // 2. 쿨타임 관리
    if (this.healCooldown > 0) this.healCooldown--;
    if (this.arrowCooldown > 0) this.arrowCooldown--;

    // 3. ☢️ 핵폭탄 카운트다운 로직 (6초 버티기)
    if (this.nukeCountdown > 0 && !this.isDead) {
      this.nukeCountdown--;

      // 매초(60프레임)마다 비프음
      if (this.nukeCountdown % 60 === 0 && this.nukeCountdown > 0) {
        const sec = Math.ceil(this.nukeCountdown / 60);
        if (window.soundEngine) soundEngine.playNukeCountdown(sec);
        window.particleSystem.addTextPopup(this.x + this.width / 2, this.y - 30, `☢️ ${sec}초!`, "#ff0055", 26);
      }

      // 6초를 버텨내어 0초 도달 -> 초대형 핵폭발 발동!
      if (this.nukeCountdown <= 0) {
        this.detonateNuke(opponent);
      }
    }

    // 4. 스태미나 자연 회복
    if (!this.isBlocking && this.stamina < this.maxStamina) {
      this.stamina = Math.min(this.maxStamina, this.stamina + 0.35);
    } else if (this.isBlocking) {
      this.stamina = Math.max(0, this.stamina - 0.08);
      if (this.stamina <= 0) this.stopBlock();
    }

    // 5. 상태 타이머
    if (this.stateTimer > 0) {
      this.stateTimer--;
      if (this.stateTimer <= 0) {
        if (this.state === 'hurt' || this.state === 'stunned' || this.state === 'roll') {
          this.state = this.isGrounded ? 'idle' : 'jump';
        }
      }
    }

    // 6. 공격 애니메이션
    if (this.isAttacking) {
      this.attackFrame++;
      const maxAttackFrames = (this.jobClass === 'sword' && this.state === 'attack_heavy') ? 26 : 18;

      if (this.jobClass === 'sword') {
        if (this.state === 'attack_light') {
          const p = this.attackFrame / maxAttackFrames;
          this.swordAngle = -1.2 + p * 3.1;
          if (p > 0.35 && p < 0.7) this.canCombo = true;

          if (this.attackFrame === 4) {
            const arcX = this.x + (this.isFacingRight ? this.width : 0);
            const arcY = this.y + this.height * 0.45;
            const sAngle = this.isFacingRight ? -Math.PI * 0.4 : Math.PI * 0.6;
            const eAngle = this.isFacingRight ? Math.PI * 0.3 : Math.PI * 1.3;
            window.particleSystem.addSlashArc(arcX, arcY, this.weaponConfig.length * 0.95, sAngle, eAngle, this.weaponConfig.glowColor, false);
          }
        } else if (this.state === 'attack_heavy') {
          const p = this.attackFrame / maxAttackFrames;
          this.swordAngle = p * Math.PI * 4;
          if (this.attackFrame % 3 === 0) {
            const arcX = this.x + this.width / 2;
            const arcY = this.y + this.height * 0.45;
            window.particleSystem.addSlashArc(arcX, arcY, this.weaponConfig.length * 1.1, 0, Math.PI * 2, this.weaponConfig.glowColor, true);
          }
        }
      }

      if (this.attackFrame >= maxAttackFrames) {
        this.isAttacking = false;
        this.state = this.isGrounded ? 'idle' : 'jump';
        this.swordAngle = 0;
      }
    }

    // 7. 물리 & 중력
    this.vy += this.gravity;
    this.x += this.vx;
    this.y += this.vy;

    if (this.isGrounded) {
      this.vx *= 0.82;
    } else {
      this.vx *= 0.95;
    }

    if (this.y + this.height >= groundY) {
      this.y = groundY - this.height;
      this.vy = 0;
      if (!this.isGrounded) {
        this.isGrounded = true;
        if (this.state === 'jump') this.state = 'idle';
      }
    } else {
      this.isGrounded = false;
    }

    if (this.x < stageLeft) {
      this.x = stageLeft;
      this.vx = 0;
    }
    if (this.x + this.width > stageRight) {
      this.x = stageRight - this.width;
      this.vx = 0;
    }

    this.updateSkillHUD();
  }

  // ☢️ 핵폭발 폭파!
  detonateNuke(opponent) {
    this.nukeDetonated = true;
    if (window.soundEngine) soundEngine.playNukeExplosion();

    const blastX = this.x + this.width / 2;
    const blastY = this.y + this.height / 2;
    window.particleSystem.createNukeExplosionEffect(blastX, blastY);

    // 상대방에게 9999 즉사급 대미지!
    if (opponent && !opponent.isDead) {
      opponent.hp = 0;
      opponent.isDead = true;
      opponent.state = 'ko';
    }

    // 본인도 자폭 K.O.
    this.hp = 0;
    this.isDead = true;
    this.state = 'ko';

    // 화면 번쩍임 플래시
    const container = document.getElementById('canvas-wrapper');
    if (container) {
      const flash = document.createElement('div');
      flash.className = 'nuke-screen-flash';
      flash.style.opacity = '1';
      container.appendChild(flash);
      setTimeout(() => {
        flash.style.opacity = '0';
        setTimeout(() => flash.remove(), 400);
      }, 200);
    }
  }

  // 스킬 HUD 갱신 (핵폭탄 카운트다운 & 힐 쿨타임)
  updateSkillHUD() {
    const hud = document.getElementById(`${this.id}-skill-hud`);
    if (!hud) return;

    if (this.jobClass === 'nuke') {
      let html = '';
      if (this.nukeCountdown > 0) {
        const sec = (this.nukeCountdown / 60).toFixed(1);
        html += `<div class="nuke-countdown-bar"><span>☢️ 핵폭발 카운트다운</span><span>${sec}s</span></div>`;
      } else {
        html += `<div class="nuke-countdown-bar" style="border-color:#666;color:#aaa;background:rgba(0,0,0,0.3);"><span>[J/K] 폭파스킬 준비완료</span><span>6초 버티기</span></div>`;
      }

      if (this.healCooldown > 0) {
        const sec = (this.healCooldown / 60).toFixed(1);
        html += `<div class="heal-cooldown-bar" style="opacity:0.7;"><span>[L] 피 회복 쿨타임</span><span>${sec}s</span></div>`;
      } else {
        html += `<div class="heal-cooldown-bar"><span>[L] 피 1/5 회복 준비완료</span><span>+20 HP</span></div>`;
      }
      hud.innerHTML = html;
    } else if (this.jobClass === 'archer') {
      hud.innerHTML = `<div style="font-size:10px;color:#38bdf8;">🏹 [J] 화살 발사 | [K] 3연발 | [L] 덤블링 회피</div>`;
    } else {
      hud.innerHTML = '';
    }
  }

  // 렌더링
  draw(ctx) {
    ctx.save();

    if (this.invulnerableTimer > 0 && Math.floor(this.invulnerableTimer / 2) % 2 === 0) {
      ctx.globalAlpha = 0.4;
    }

    const cx = this.x + this.width / 2;
    const cy = this.y + this.height / 2;
    const facing = this.isFacingRight ? 1 : -1;

    // 1. 발 아래 그림자
    ctx.beginPath();
    ctx.ellipse(cx, this.y + this.height + 2, this.width * 0.6, 6, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
    ctx.fill();

    // 2. 직업별 등 장비 (망토, 화살통, 핵반응로)
    if (this.jobClass === 'nuke') {
      // ☢️ 핵반응로 배낭 (등에 착용)
      ctx.fillStyle = "#ff0055";
      ctx.shadowColor = "#ff0055";
      ctx.shadowBlur = this.nukeCountdown > 0 ? 18 : 6;
      ctx.fillRect(cx - (facing * 20), this.y + 24, facing * 12, 30);
      ctx.shadowBlur = 0;

      // 방사능 심볼 마크
      ctx.fillStyle = "#fff";
      ctx.font = "12px sans-serif";
      ctx.fillText("☢", cx - (facing * 16), this.y + 44);

      // 머리 위 6초 카운트다운 홀로그램
      if (this.nukeCountdown > 0) {
        const sec = (this.nukeCountdown / 60).toFixed(1);
        ctx.font = "bold 16px 'Orbitron', monospace";
        ctx.fillStyle = "#ff0055";
        ctx.shadowColor = "#ff0055";
        ctx.shadowBlur = 10;
        ctx.textAlign = "center";
        ctx.fillText(`☢ ${sec}s`, cx, this.y - 12);
        ctx.shadowBlur = 0;
      }
    } else if (this.jobClass === 'archer') {
      // 🏹 화살통 (등에 대각선 착용)
      ctx.save();
      ctx.translate(cx - (facing * 10), this.y + 28);
      ctx.rotate(facing * 0.3);
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(-4, -15, 8, 32);
      // 삐져나온 화살 깃들
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-2, -15); ctx.lineTo(-2, -24);
      ctx.moveTo(2, -15); ctx.lineTo(2, -26);
      ctx.stroke();
      ctx.restore();
    } else {
      // ⚔️ 검사: 사이버 망토
      const capeSway = Math.sin(this.animTimer * 2.5) * 8 - (this.vx * 2.5);
      ctx.beginPath();
      ctx.moveTo(cx - (facing * 8), this.y + 24);
      ctx.quadraticCurveTo(cx - (facing * 28) + capeSway, this.y + 55, cx - (facing * 22) + capeSway * 1.3, this.y + this.height - 4);
      ctx.lineTo(cx - (facing * 4), this.y + 40);
      ctx.fillStyle = this.colorTheme.secondary || '#1e293b';
      ctx.fill();
    }

    // 3. 다리 (Legs)
    const legSwing = (this.state === 'run') ? Math.sin(this.animTimer * 12) * 14 : 0;
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.strokeStyle = "#1e2433";

    ctx.beginPath();
    ctx.moveTo(cx - 8, this.y + 52);
    ctx.lineTo(cx - 8 - legSwing, this.y + this.height);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx + 8, this.y + 52);
    ctx.lineTo(cx + 8 + legSwing, this.y + this.height);
    ctx.stroke();

    // 4. 몸통 (Torso)
    ctx.fillStyle = this.jobClass === 'nuke' ? "#26131c" : "#121724";
    if (ctx.roundRect) {
      ctx.roundRect(cx - 14, this.y + 22, 28, 34, 6);
    } else {
      ctx.rect(cx - 14, this.y + 22, 28, 34);
    }
    ctx.fill();

    // 네온 아머 라인
    const armorColor = this.jobClass === 'nuke' ? '#ff0055' : (this.jobClass === 'archer' ? '#38bdf8' : this.colorTheme.primary);
    ctx.strokeStyle = armorColor;
    ctx.lineWidth = 2.5;
    ctx.shadowColor = armorColor;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(cx - 10, this.y + 28);
    ctx.lineTo(cx, this.y + 46);
    ctx.lineTo(cx + 10, this.y + 28);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // 5. 머리 및 헬멧/후드
    ctx.fillStyle = "#1c2438";
    ctx.beginPath();
    ctx.arc(cx, this.y + 12, 12, 0, Math.PI * 2);
    ctx.fill();

    // 바이저 눈빛
    ctx.fillStyle = armorColor;
    ctx.shadowColor = armorColor;
    ctx.shadowBlur = 10;
    ctx.fillRect(cx + (facing * 2), this.y + 9, facing * 8, 4);
    ctx.shadowBlur = 0;

    // 6. 손 위치 무기 렌더링
    const handX = cx + (facing * 10);
    const handY = this.y + 36;

    ctx.save();
    ctx.translate(handX, handY);

    if (this.jobClass === 'sword') {
      // ⚔️ 검사: 칼 렌더링
      WeaponManager.drawBlade(ctx, this.weaponConfig, this.swordAngle, this.isFacingRight);
    } else if (this.jobClass === 'archer') {
      // 🏹 궁수: 사이버 에너지 활 렌더링
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 3.5;
      ctx.shadowColor = "#38bdf8";
      ctx.shadowBlur = 10;
      ctx.beginPath();
      // 활 곡선
      ctx.arc(facing * 8, 0, 22, -Math.PI * 0.45 * facing, Math.PI * 0.45 * facing, !this.isFacingRight);
      ctx.stroke();

      // 활 시위
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(facing * 8 + Math.cos(-Math.PI * 0.45 * facing) * 22, Math.sin(-Math.PI * 0.45 * facing) * 22);
      ctx.lineTo(facing * 8 + Math.cos(Math.PI * 0.45 * facing) * 22, Math.sin(Math.PI * 0.45 * facing) * 22);
      ctx.stroke();
      ctx.shadowBlur = 0;
    } else if (this.jobClass === 'nuke') {
      // ☢️ 핵폭탄: 기폭 스위치 리모컨 손에 쥐기
      ctx.fillStyle = "#ff0055";
      ctx.fillRect(0, -6, 8, 12);
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(4, -8, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // 주먹
    ctx.fillStyle = "#cbd5e1";
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 7. 검사의 가드 실드
    if (this.jobClass === 'sword' && this.isBlocking) {
      const shieldX = cx + (facing * 28);
      const shieldY = cy;

      ctx.save();
      ctx.strokeStyle = this.colorTheme.primary;
      ctx.fillStyle = "rgba(0, 240, 255, 0.25)";
      ctx.lineWidth = 3;
      ctx.shadowColor = this.colorTheme.primary;
      ctx.shadowBlur = 15;

      ctx.beginPath();
      const r = 40;
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI / 3);
        const sx = shieldX + Math.cos(angle) * (r * 0.45);
        const sy = shieldY + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();
  }
}
