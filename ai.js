// =========================================
// BLADE CLASH ARENA - FIGHTER AI
// 1인용 모드 지능형 전투 AI (직업별 전술 대응: 궁수/검사/핵폭탄)
// =========================================

class FighterAI {
  constructor(fighter, targetFighter) {
    this.fighter = fighter;
    this.target = targetFighter;
    this.difficulty = 'normal'; // 'easy', 'normal', 'hard'

    this.decisionTimer = 0;
    this.blockTimer = 0;
    this.attackCooldown = 0;
    this.retreatTimer = 0;
  }

  setDifficulty(level) {
    this.difficulty = level;
  }

  update() {
    if (this.fighter.isDead || this.target.isDead) {
      this.fighter.stopMove();
      this.fighter.stopBlock();
      return;
    }

    this.decisionTimer++;
    if (this.attackCooldown > 0) this.attackCooldown--;
    if (this.retreatTimer > 0) this.retreatTimer--;

    if (this.blockTimer > 0) {
      this.blockTimer--;
      if (this.blockTimer <= 0) {
        this.fighter.stopBlock();
      }
    }

    const dist = this.target.x - this.fighter.x;
    const absDist = Math.abs(dist);

    // 상대방을 바라보도록 즉시 방향 전환
    this.fighter.turnFace(dist > 0);

    // =========================================
    // ☢️ 핵폭탄 AI 전술: 6초 버티기 & 힐 연타
    // =========================================
    if (this.fighter.jobClass === 'nuke') {
      // 1. 아직 폭파 카운트다운을 안 켰다면 즉시 가동!
      if (this.fighter.nukeCountdown <= 0) {
        this.fighter.attackLight();
      }

      // 2. 힐 쿨타임이 돌았고 체력이 100 미만이면 즉시 힐(L 키) 사용!
      if (this.fighter.healCooldown <= 0 && this.fighter.hp < 95) {
        this.fighter.startBlock();
      }

      // 3. 6초 동안 살아남아야 하므로 상대로부터 전속력 후퇴 & 점프 회피!
      const retreatDir = dist > 0 ? -1 : 1;
      this.fighter.move(retreatDir);

      if (Math.random() < 0.05 && this.fighter.isGrounded) {
        this.fighter.jump();
      }
      return;
    }

    // =========================================
    // 🏹 궁수 AI 전술: 원거리 카이팅 & 화살 난사
    // =========================================
    if (this.fighter.jobClass === 'archer') {
      // 이상적인 거리: 260 ~ 450px
      if (absDist < 200) {
        // 너무 가까우면 뒤로 도망치거나 덤블링 회피
        const retreatDir = dist > 0 ? -1 : 1;
        this.fighter.move(retreatDir);
        if (Math.random() < 0.25 && this.fighter.stamina > 30) {
          this.fighter.startBlock(); // 덤블링
        } else if (Math.random() < 0.08 && this.fighter.isGrounded) {
          this.fighter.jump();
        }
      } else if (absDist > 550) {
        // 너무 멀면 전진
        this.fighter.move(dist > 0 ? 1 : -1);
      } else {
        // 적정 거리: 정지 후 화살 조준 발사!
        this.fighter.stopMove();
      }

      // 화살 발사 타이밍
      if (this.attackCooldown <= 0) {
        if (Math.random() < 0.35) {
          this.fighter.attackSpecial(); // 3연발
          this.attackCooldown = this.difficulty === 'hard' ? 24 : 36;
        } else {
          this.fighter.attackLight(); // 단발
          this.attackCooldown = this.difficulty === 'hard' ? 14 : 22;
        }
      }
      return;
    }

    // =========================================
    // ⚔️ 검사 AI 전술: 근접 칼싸움 & 가드
    // =========================================
    const attackReach = (this.fighter.weaponConfig.length || 70) + 20;

    // 플레이어 공격 시 리액티브 가드
    const guardChance = this.difficulty === 'hard' ? 0.85 : (this.difficulty === 'normal' ? 0.6 : 0.25);
    if (this.target.isAttacking && absDist < attackReach + 40 && this.fighter.stamina > 20) {
      if (Math.random() < guardChance && !this.fighter.isBlocking && !this.fighter.isAttacking) {
        this.fighter.startBlock();
        this.blockTimer = Math.floor(Math.random() * 20 + 15);
        return;
      }
    }

    // 스태미나 부족 시 후퇴
    if (this.fighter.stamina < 25 && absDist < 120) {
      this.fighter.stopBlock();
      const retreatDir = dist > 0 ? -1 : 1;
      this.fighter.move(retreatDir);
      if (Math.random() < 0.08 && this.fighter.isGrounded) {
        this.fighter.jump();
      }
      return;
    }

    // 거리별 접근 및 베기
    if (absDist > attackReach + 10) {
      this.fighter.stopBlock();
      this.fighter.move(dist > 0 ? 1 : -1);

      if (this.target.y < this.fighter.y - 40 && this.fighter.isGrounded && Math.random() < 0.15) {
        this.fighter.jump();
      } else if (absDist > 160 && absDist < 260 && Math.random() < 0.05 && this.fighter.stamina > 30) {
        this.fighter.attackSpecial();
      }
    } else {
      this.fighter.stopMove();

      if (this.attackCooldown <= 0 && !this.fighter.isBlocking) {
        const rand = Math.random();
        if (rand < 0.25 && this.fighter.isGrounded && Math.random() < 0.3) {
          this.fighter.jump();
          setTimeout(() => {
            if (!this.fighter.isDead) this.fighter.attackLight();
          }, 120);
          this.attackCooldown = this.difficulty === 'hard' ? 18 : 28;
        } else if (rand < 0.45 && this.fighter.stamina > 30) {
          this.fighter.attackSpecial();
          this.attackCooldown = this.difficulty === 'hard' ? 24 : 40;
        } else {
          this.fighter.attackLight();
          if (this.difficulty !== 'easy') {
            setTimeout(() => {
              if (this.fighter.canCombo && !this.fighter.isDead) {
                this.fighter.attackLight();
              }
            }, 180);
          }
          this.attackCooldown = this.difficulty === 'hard' ? 15 : 28;
        }
      }
    }
  }
}
