// =========================================
// BLADE CLASH ARENA - MAIN GAME ENGINE
// 캔버스 렌더링, 카메라 줌/팬, 물리, 직업 시스템, 전투 루프
// =========================================

class BladeArenaGame {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');

    // 게임 모드: '1p' (vs AI) or '2p' (1P vs 2P)
    this.mode = '1p';
    this.aiDifficulty = 'normal';

    // 매치 상태
    this.round = 1;
    this.p1Score = 0;
    this.p2Score = 0;
    this.isMatchOver = false;
    this.roundEndTimer = 0;

    // 선택된 직업 (기본값: 1P 검사, 2P 검사)
    this.p1Job = 'sword';
    this.p2Job = 'sword';

    // 일시정지 상태
    this.isPaused = false;


    // 아레나 크기 및 바닥 높이
    this.stageWidth = 1400;
    this.stageHeight = 720;
    this.groundY = 600;
    this.stageLeft = 40;
    this.stageRight = 1360;

    // 카메라 및 줌 컨트롤 (마우스 휠로 축소/확대)
    this.camera = {
      x: 0,
      y: 0,
      zoom: 1.0,
      targetZoom: 1.0,
      minZoom: 0.55,
      maxZoom: 1.8,
      panX: 0,
      panY: 0,
      isPanning: false,
      lastMouseX: 0,
      lastMouseY: 0
    };

    // 파이터 인스턴스 생성
    this.p1 = new Fighter(
      'p1',
      '블레이드 마스터',
      350,
      this.groundY - 84,
      true,
      { primary: '#00f0ff', secondary: '#0055ff' }
    );

    this.p2 = new Fighter(
      'p2',
      '사이버 섀도우 (AI)',
      950,
      this.groundY - 84,
      false,
      { primary: '#ff0055', secondary: '#880033' }
    );

    // AI 인스턴스
    this.ai = new FighterAI(this.p2, this.p1);

    // 활성화된 키보드 키 Set
    this.activeKeys = new Set();

    // 슬로우 모션 효과
    this.timeScale = 1.0;
    this.slowMoTimer = 0;

    // 콤보 타이머
    this.p1ComboCount = 0;
    this.p2ComboCount = 0;
    this.p1ComboTimer = 0;
    this.p2ComboTimer = 0;

    // 챗봇 인스턴스
    this.chatbot = new BladeChatbot();

    // 커스텀 공방 인스턴스
    this.customizer = new WeaponCustomizer();

    this.initEvents();
    this.initZoomEvents();
    this.initModals();
    this.initJobModal();
    this.resizeCanvas();
    this.startLoop();
  }

  resizeCanvas() {
    const wrapper = document.getElementById('canvas-wrapper');
    if (!wrapper) return;
    this.canvas.width = wrapper.clientWidth;
    this.canvas.height = wrapper.clientHeight;
  }

  // 1. 마우스 휠을 통한 화면 축소 / 확대 기능 & 팬
  initZoomEvents() {
    const wrapper = document.getElementById('canvas-wrapper');
    if (!wrapper) return;

    // 휠 스크롤: 줌 인 / 줌 아웃 (축소)
    wrapper.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
      this.camera.targetZoom = Math.max(
        this.camera.minZoom,
        Math.min(this.camera.maxZoom, this.camera.targetZoom * zoomFactor)
      );
      this.updateZoomDisplay();
    }, { passive: false });

    // 우클릭 드래그: 화면 시점 이동 (Pan)
    wrapper.addEventListener('mousedown', (e) => {
      if (e.button === 2) {
        e.preventDefault();
        this.camera.isPanning = true;
        this.camera.lastMouseX = e.clientX;
        this.camera.lastMouseY = e.clientY;
      } else if (e.button === 0) {
        // 좌클릭: 마우스 위치를 향해 즉시 방향 전환 (조준 공격 지원)
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const p1ScreenX = (this.p1.x + this.p1.width / 2) * this.camera.zoom + (this.canvas.width / 2) * (1 - this.camera.zoom) + this.camera.panX;
        this.p1.turnFace(mouseX > p1ScreenX);
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (this.camera.isPanning) {
        const dx = e.clientX - this.camera.lastMouseX;
        const dy = e.clientY - this.camera.lastMouseY;
        this.camera.panX += dx;
        this.camera.panY += dy;
        this.camera.lastMouseX = e.clientX;
        this.camera.lastMouseY = e.clientY;
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 2) {
        this.camera.isPanning = false;
      }
    });

    wrapper.addEventListener('contextmenu', (e) => e.preventDefault());

    // 줌 버튼 컨트롤 바 이벤트
    const btnIn = document.getElementById('btn-zoom-in');
    const btnOut = document.getElementById('btn-zoom-out');
    const btnReset = document.getElementById('btn-zoom-reset');

    if (btnIn) {
      btnIn.addEventListener('click', () => {
        this.camera.targetZoom = Math.min(this.camera.maxZoom, this.camera.targetZoom * 1.15);
        this.updateZoomDisplay();
      });
    }

    if (btnOut) {
      btnOut.addEventListener('click', () => {
        this.camera.targetZoom = Math.max(this.camera.minZoom, this.camera.targetZoom * 0.85);
        this.updateZoomDisplay();
      });
    }

    if (btnReset) {
      btnReset.addEventListener('click', () => {
        this.camera.targetZoom = 1.0;
        this.camera.panX = 0;
        this.camera.panY = 0;
        this.updateZoomDisplay();
      });
    }
  }

  updateZoomDisplay() {
    const textEl = document.getElementById('zoom-level-text');
    if (textEl) {
      const pct = Math.round(this.camera.targetZoom * 100);
      textEl.textContent = `🔍 줌: ${pct}%`;
    }
  }

  // 2. 키보드 및 상단 메뉴 이벤트
  initEvents() {
    window.addEventListener('resize', () => this.resizeCanvas());

    // 키보드 누름/뗌 이벤트
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;

      this.activeKeys.add(e.code);

      // 다음 라운드 진행 (Space)
      if (e.code === 'Space' && this.isMatchOver) {
        this.nextRound();
      }

      // 단발성 키 입력 처리
      this.handleKeyPress(e.code);
    });

    window.addEventListener('keyup', (e) => {
      this.activeKeys.delete(e.code);
      this.handleKeyRelease(e.code);
    });

    // 1인용 / 2인용 모드 전환
    const btn1p = document.getElementById('btn-mode-1p');
    const btn2p = document.getElementById('btn-mode-2p');
    const diffContainer = document.getElementById('ai-diff-container');
    const p2Tag = document.getElementById('p2-tag-label');
    const p2Name = document.getElementById('p2-name-display');
    const p2JobTitle = document.getElementById('p2-job-section-title');

    if (btn1p && btn2p) {
      btn1p.addEventListener('click', () => {
        this.mode = '1p';
        btn1p.classList.add('active');
        btn2p.classList.remove('active');
        if (diffContainer) diffContainer.style.display = 'flex';
        if (p2Tag) { p2Tag.textContent = 'AI'; p2Tag.className = 'fighter-tag p2-tag'; }
        if (p2Name) p2Name.textContent = '사이버 섀도우 (AI)';
        if (p2JobTitle) p2JobTitle.textContent = '🤖 2P (AI) 직업 선택';
        this.resetMatch();
      });

      btn2p.addEventListener('click', () => {
        this.mode = '2p';
        btn2p.classList.add('active');
        btn1p.classList.remove('active');
        if (diffContainer) diffContainer.style.display = 'none';
        if (p2Tag) { p2Tag.textContent = 'P2'; p2Tag.className = 'fighter-tag p2-tag'; }
        if (p2Name) p2Name.textContent = '섀도우 블레이더 (2P)';
        if (p2JobTitle) p2JobTitle.textContent = '🎮 2P 플레이어 직업 선택';
        this.resetMatch();
      });
    }

    // AI 난이도 선택
    const diffSelect = document.getElementById('ai-difficulty');
    if (diffSelect) {
      diffSelect.addEventListener('change', (e) => {
        this.aiDifficulty = e.target.value;
        this.ai.setDifficulty(this.aiDifficulty);
      });
    }

    // 소리 켜기/끄기
    const btnSound = document.getElementById('btn-toggle-sound');
    if (btnSound) {
      btnSound.addEventListener('click', () => {
        if (window.soundEngine) {
          const isMuted = soundEngine.toggleMute();
          btnSound.textContent = isMuted ? '🔇' : '🔊';
        }
      });
    }

    // 경기 리셋 & 다음 라운드 버튼
    document.getElementById('btn-restart-match')?.addEventListener('click', () => this.resetMatch());
    document.getElementById('btn-next-round')?.addEventListener('click', () => this.nextRound());

    // 일시정지 버튼
    document.getElementById('btn-pause-game')?.addEventListener('click', () => this.togglePause());
  }

  // 일시정지 토글
  togglePause() {
    this.isPaused = !this.isPaused;
    const overlay = document.getElementById('pause-overlay');
    const btn = document.getElementById('btn-pause-game');
    if (this.isPaused) {
      overlay?.classList.remove('hidden');
      if (btn) btn.textContent = '▶ 재개';
    } else {
      overlay?.classList.add('hidden');
      if (btn) btn.textContent = '⏸ 정지';
    }
  }


  // 3. 직업 선택 모달 로직
  initJobModal() {
    const jobModal = document.getElementById('job-modal');
    const btnOpenJobs = document.getElementById('btn-open-jobs');
    const btnCloseJobs = document.getElementById('btn-close-jobs');
    const btnStartDuel = document.getElementById('btn-start-battle-with-jobs');

    if (btnOpenJobs) {
      btnOpenJobs.addEventListener('click', () => {
        jobModal?.classList.remove('hidden');
      });
    }

    if (btnCloseJobs) {
      btnCloseJobs.addEventListener('click', () => {
        jobModal?.classList.add('hidden');
      });
    }

    // 직업 카드 선택 이벤트 (1P & 2P)
    document.querySelectorAll('.job-card').forEach(card => {
      card.addEventListener('click', () => {
        const player = card.getAttribute('data-player');
        const job = card.getAttribute('data-job');

        // 같은 플레이어 카드들의 active 제거 후 선택한 카드 active
        document.querySelectorAll(`.job-card[data-player="${player}"]`).forEach(c => c.classList.remove('active'));
        card.classList.add('active');

        if (player === 'p1') this.p1Job = job;
        else this.p2Job = job;
      });
    });

    if (btnStartDuel) {
      btnStartDuel.addEventListener('click', () => {
        this.p1.setJobClass(this.p1Job);
        this.p2.setJobClass(this.p2Job);
        jobModal?.classList.add('hidden');
        this.resetMatch();
      });
    }
  }

  // 모달 제어 (키 설정, 칼 스킨 공방)
  initModals() {
    const keysModal = document.getElementById('keys-modal');
    const customModal = document.getElementById('customizer-modal');

    document.getElementById('btn-open-keys')?.addEventListener('click', () => {
      keysModal?.classList.remove('hidden');
    });

    document.getElementById('btn-open-customizer')?.addEventListener('click', () => {
      customModal?.classList.remove('hidden');
      this.customizer.loadConfig();
    });

    document.getElementById('btn-close-keys')?.addEventListener('click', () => {
      keysModal?.classList.add('hidden');
      window.keyBindingsManager.stopListening();
    });

    document.getElementById('btn-save-keys')?.addEventListener('click', () => {
      keysModal?.classList.add('hidden');
      window.keyBindingsManager.stopListening();
    });

    document.getElementById('btn-close-customizer')?.addEventListener('click', () => {
      customModal?.classList.add('hidden');
    });

    document.getElementById('btn-reset-default-keys')?.addEventListener('click', () => {
      window.keyBindingsManager.resetToDefault();
    });

    window.keyBindingsManager.initUI();
  }

  // 플레이어 입력 액션 라우팅 (방향 전환 즉각 반응 적용!)
  handleKeyPress(code) {
    // 일시정지 토글 (P 또는 Escape)
    if (code === 'KeyP' || code === 'Escape') {
      this.togglePause();
      return;
    }

    // 일시정지 중에는 다른 키 입력 무시
    if (this.isPaused) return;

    const bindings = window.keyBindingsManager.bindings;


    // 1P 방향 전환 즉시 반응!
    if (code === bindings.p1.left) this.p1.turnFace(false);
    if (code === bindings.p1.right) this.p1.turnFace(true);

    // 1P 단발 키
    if (code === bindings.p1.jump) this.p1.jump();
    if (code === bindings.p1.attack) this.p1.attackLight();
    if (code === bindings.p1.special) this.p1.attackSpecial();
    if (code === bindings.p1.block) this.p1.startBlock();

    // 2P 단발 키 (2인용 모드일 때만)
    if (this.mode === '2p') {
      if (code === bindings.p2.left) this.p2.turnFace(false);
      if (code === bindings.p2.right) this.p2.turnFace(true);
      if (code === bindings.p2.jump) this.p2.jump();
      if (code === bindings.p2.attack) this.p2.attackLight();
      if (code === bindings.p2.special) this.p2.attackSpecial();
      if (code === bindings.p2.block) this.p2.startBlock();
    }
  }

  handleKeyRelease(code) {
    const bindings = window.keyBindingsManager.bindings;

    if (code === bindings.p1.block) this.p1.stopBlock();
    if (this.mode === '2p' && code === bindings.p2.block) this.p2.stopBlock();
  }

  // 지속 키 입력 (이동 등)
  processContinuousInput() {
    const bindings = window.keyBindingsManager.bindings;

    // 1P 이동
    let p1Move = 0;
    if (this.activeKeys.has(bindings.p1.left)) p1Move -= 1;
    if (this.activeKeys.has(bindings.p1.right)) p1Move += 1;

    if (p1Move !== 0) {
      this.p1.move(p1Move);
    } else if (!this.p1.isAttacking) {
      this.p1.stopMove();
    }

    // 2P 이동
    if (this.mode === '2p') {
      let p2Move = 0;
      if (this.activeKeys.has(bindings.p2.left)) p2Move -= 1;
      if (this.activeKeys.has(bindings.p2.right)) p2Move += 1;

      if (p2Move !== 0) {
        this.p2.move(p2Move);
      } else if (!this.p2.isAttacking) {
        this.p2.stopMove();
      }
    }
  }

  updateFighterWeapons() {
    this.p1.updateWeaponConfig();
    this.p2.updateWeaponConfig();
  }

  // 대전 전투 판정 (칼싸움, 히트박스, 화살 투사체)
  checkCombatCollisions() {
    if (this.p1.isDead || this.p2.isDead) return;

    const p1Hitbox = this.p1.getAttackHitbox();
    const p2Hitbox = this.p2.getAttackHitbox();
    const p1Hurtbox = this.p1.getHurtbox();
    const p2Hurtbox = this.p2.getHurtbox();

    // 1. 칼 맞부딪힘 (Blade Clash)
    if (p1Hitbox && p2Hitbox && !this.p1.hitRegistered && !this.p2.hitRegistered) {
      if (this.isBoxColliding(p1Hitbox, p2Hitbox)) {
        this.p1.hitRegistered = true;
        this.p2.hitRegistered = true;

        this.p1.vx = (this.p1.isFacingRight ? -1 : 1) * 7;
        this.p2.vx = (this.p2.isFacingRight ? -1 : 1) * 7;
        this.p1.vy = -3;
        this.p2.vy = -3;

        const clashX = (this.p1.x + this.p2.x) / 2 + 20;
        const clashY = (this.p1.y + this.p2.y) / 2 + 20;

        if (window.soundEngine) soundEngine.playClash();
        window.particleSystem.createHitSparks(clashX, clashY, "#ffffff", 26, true);
        window.particleSystem.addTextPopup(clashX, clashY - 25, "CLASH!!", "#00f0ff", 22);
        return;
      }
    }

    // 2. 검사 근접 공격 판정 (P1 -> P2)
    if (p1Hitbox && !this.p1.hitRegistered) {
      if (this.isBoxColliding(p1Hitbox, p2Hurtbox)) {
        this.p1.hitRegistered = true;
        const isHeavy = this.p1.state === 'attack_heavy';
        const dmg = isHeavy ? 24 : 12;
        const hitSuccess = this.p2.takeDamage(dmg, isHeavy, this.p1);
        if (hitSuccess) this.registerCombo('p1');
      }
    }

    // 3. 검사 근접 공격 판정 (P2 -> P1)
    if (p2Hitbox && !this.p2.hitRegistered) {
      if (this.isBoxColliding(p2Hitbox, p1Hurtbox)) {
        this.p2.hitRegistered = true;
        const isHeavy = this.p2.state === 'attack_heavy';
        const dmg = isHeavy ? 24 : 12;
        const hitSuccess = this.p1.takeDamage(dmg, isHeavy, this.p2);
        if (hitSuccess) this.registerCombo('p2');
      }
    }

    // 4. 🏹 궁수 화살 투사체(Arrows) 충돌 판정
    const arrows = window.particleSystem.arrows;
    for (let i = arrows.length - 1; i >= 0; i--) {
      const arr = arrows[i];
      const arrowBox = { x: arr.x - 10, y: arr.y - 6, w: 20, h: 12 };

      // P1이 쏜 화살 -> P2 피격
      if (arr.ownerId === 'p1' && !this.p2.isDead) {
        if (this.isBoxColliding(arrowBox, p2Hurtbox)) {
          arrows.splice(i, 1);
          const hitSuccess = this.p2.takeDamage(arr.damage, arr.isSpecial, this.p1);
          if (hitSuccess) this.registerCombo('p1');
          if (window.soundEngine) soundEngine.playArrowHit();
          continue;
        }
      }

      // P2가 쏜 화살 -> P1 피격
      if (arr.ownerId === 'p2' && !this.p1.isDead) {
        if (this.isBoxColliding(arrowBox, p1Hurtbox)) {
          arrows.splice(i, 1);
          const hitSuccess = this.p1.takeDamage(arr.damage, arr.isSpecial, this.p2);
          if (hitSuccess) this.registerCombo('p2');
          if (window.soundEngine) soundEngine.playArrowHit();
          continue;
        }
      }
    }
  }

  isBoxColliding(b1, b2) {
    return (
      b1.x < b2.x + b2.w &&
      b1.x + b1.w > b2.x &&
      b1.y < b2.y + b2.h &&
      b1.y + b1.h > b2.y
    );
  }

  registerCombo(player) {
    if (player === 'p1') {
      this.p1ComboCount++;
      this.p1ComboTimer = 90;
      const box = document.getElementById('p1-combo-box');
      const num = document.getElementById('p1-combo-num');
      if (box && num) {
        num.textContent = this.p1ComboCount;
        box.classList.add('show');
      }
      if (this.p1ComboCount >= 4) {
        this.chatbot.triggerInGameEvent('combo', { player: 'Player 1', count: this.p1ComboCount });
      }
    } else {
      this.p2ComboCount++;
      this.p2ComboTimer = 90;
      const box = document.getElementById('p2-combo-box');
      const num = document.getElementById('p2-combo-num');
      if (box && num) {
        num.textContent = this.p2ComboCount;
        box.classList.add('show');
      }
      if (this.p2ComboCount >= 4) {
        this.chatbot.triggerInGameEvent('combo', { player: 'Player 2 (AI)', count: this.p2ComboCount });
      }
    }
  }

  updateCombos() {
    if (this.p1ComboTimer > 0) {
      this.p1ComboTimer--;
      if (this.p1ComboTimer <= 0) {
        this.p1ComboCount = 0;
        document.getElementById('p1-combo-box')?.classList.remove('show');
      }
    }

    if (this.p2ComboTimer > 0) {
      this.p2ComboTimer--;
      if (this.p2ComboTimer <= 0) {
        this.p2ComboCount = 0;
        document.getElementById('p2-combo-box')?.classList.remove('show');
      }
    }
  }

  // 승패 및 라운드 처리
  checkMatchStatus() {
    if (this.isMatchOver) return;

    if (this.p1.isDead || this.p2.isDead) {
      this.isMatchOver = true;
      this.slowMoTimer = 40;
      this.timeScale = 0.25;

      let winner = '';
      if (!this.p1.isDead && this.p2.isDead) {
        winner = 'PLAYER 1 WINS';
        this.p1Score++;
      } else if (this.p1.isDead && !this.p2.isDead) {
        winner = (this.mode === '1p' ? 'AI WINS' : 'PLAYER 2 WINS');
        this.p2Score++;
      } else {
        // 둘 다 죽은 경우 (핵폭발 동귀어진)
        winner = this.p1.nukeDetonated ? 'PLAYER 1 NUKE VICTORY!' : 'PLAYER 2 NUKE VICTORY!';
        if (this.p1.nukeDetonated) this.p1Score++;
        else this.p2Score++;
      }

      document.getElementById('p1-score').textContent = this.p1Score;
      document.getElementById('p2-score').textContent = this.p2Score;

      setTimeout(() => {
        const banner = document.getElementById('match-banner');
        const subtitle = document.getElementById('banner-subtitle');
        if (banner && subtitle) {
          subtitle.textContent = winner;
          banner.classList.remove('hidden');
        }
        this.chatbot.triggerInGameEvent('ko', { winner });
      }, 700);
    }
  }

  nextRound() {
    this.round++;
    document.getElementById('round-badge').textContent = `ROUND ${this.round}`;
    document.getElementById('match-banner')?.classList.add('hidden');
    this.isMatchOver = false;
    this.timeScale = 1.0;
    this.p1.reset(350, true);
    this.p2.reset(950, false);
    this.p1.setJobClass(this.p1Job);
    this.p2.setJobClass(this.p2Job);
    window.particleSystem.reset();
  }

  resetMatch() {
    this.round = 1;
    this.p1Score = 0;
    this.p2Score = 0;
    document.getElementById('round-badge').textContent = `ROUND 1`;
    document.getElementById('p1-score').textContent = '0';
    document.getElementById('p2-score').textContent = '0';
    document.getElementById('match-banner')?.classList.add('hidden');
    this.isMatchOver = false;
    this.timeScale = 1.0;
    this.p1.reset(350, true);
    this.p2.reset(950, false);
    this.p1.setJobClass(this.p1Job);
    this.p2.setJobClass(this.p2Job);
    window.particleSystem.reset();
  }

  // 헤더 챗봇 인증 뱃지 동기화
  updateVerifyTag() {
    const tag = document.getElementById('header-chat-verify-badge');
    if (!tag) return;
    const isVerified = localStorage.getItem('blade_chat_is_verified') === 'true';
    if (isVerified) {
      tag.textContent = '인증됨 🟢';
      tag.className = 'chat-verify-tag verified';
    } else {
      tag.textContent = '미인증';
      tag.className = 'chat-verify-tag';
    }
  }

  // HUD 갱신
  updateHUD() {
    const p1HpPct = (this.p1.hp / this.p1.maxHp) * 100;
    document.getElementById('p1-hp-bar').style.width = `${p1HpPct}%`;
    document.getElementById('p1-hp-delay').style.width = `${p1HpPct}%`;
    document.getElementById('p1-hp-text').textContent = `${Math.ceil(this.p1.hp)} / ${this.p1.maxHp}`;
    document.getElementById('p1-stamina-bar').style.width = `${(this.p1.stamina / this.p1.maxStamina) * 100}%`;

    const p2HpPct = (this.p2.hp / this.p2.maxHp) * 100;
    document.getElementById('p2-hp-bar').style.width = `${p2HpPct}%`;
    document.getElementById('p2-hp-delay').style.width = `${p2HpPct}%`;
    document.getElementById('p2-hp-text').textContent = `${Math.ceil(this.p2.hp)} / ${this.p2.maxHp}`;
    document.getElementById('p2-stamina-bar').style.width = `${(this.p2.stamina / this.p2.maxStamina) * 100}%`;

    this.updateVerifyTag();
  }

  // 메인 업데이트
  update() {
    // 카메라 줌 보간은 일시정지 중에도 유지
    this.camera.zoom += (this.camera.targetZoom - this.camera.zoom) * 0.1;

    // 일시정지 중에는 게임 로직 실행 안 함
    if (this.isPaused) return;

    if (this.slowMoTimer > 0) {
      this.slowMoTimer--;
      if (this.slowMoTimer <= 0) {
        this.timeScale = 1.0;
      }
    }

    this.processContinuousInput();

    if (this.mode === '1p') {
      this.ai.update();
    }

    // 상대방 참조를 넘겨서 핵폭발 등 판정 지원
    this.p1.update(this.groundY, this.stageLeft, this.stageRight, this.p2);
    this.p2.update(this.groundY, this.stageLeft, this.stageRight, this.p1);

    this.checkCombatCollisions();

    window.particleSystem.update();

    this.updateCombos();
    this.checkMatchStatus();

    this.updateHUD();
  }

  // 렌더링
  render() {
    const ctx = this.ctx;
    const cw = this.canvas.width;
    const ch = this.canvas.height;

    ctx.clearRect(0, 0, cw, ch);

    ctx.save();

    ctx.translate(cw / 2 + this.camera.panX, ch / 2 + this.camera.panY);
    ctx.scale(this.camera.zoom, this.camera.zoom);
    ctx.translate(-cw / 2, -ch / 2);

    this.renderArenaBackground(ctx, cw, ch);

    window.particleSystem.draw(ctx);

    this.p1.draw(ctx);
    this.p2.draw(ctx);

    ctx.restore();
  }

  // 아레나 배경
  renderArenaBackground(ctx, cw, ch) {
    const skyGrad = ctx.createLinearGradient(0, 0, 0, this.groundY);
    skyGrad.addColorStop(0, '#0a0d18');
    skyGrad.addColorStop(1, '#151d2f');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, this.stageWidth, this.groundY);

    ctx.save();
    ctx.fillStyle = '#0f1422';
    const buildings = [
      { x: 80, w: 90, h: 260 },
      { x: 210, w: 120, h: 320 },
      { x: 380, w: 100, h: 220 },
      { x: 530, w: 140, h: 360 },
      { x: 720, w: 110, h: 280 },
      { x: 890, w: 150, h: 340 },
      { x: 1080, w: 90, h: 250 },
      { x: 1210, w: 120, h: 300 }
    ];

    for (const b of buildings) {
      ctx.fillRect(b.x, this.groundY - b.h, b.w, b.h);

      ctx.strokeStyle = "rgba(0, 240, 255, 0.4)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(b.x + b.w / 2, this.groundY - b.h);
      ctx.lineTo(b.x + b.w / 2, this.groundY - b.h - 30);
      ctx.stroke();

      ctx.fillStyle = "#ff0055";
      ctx.beginPath();
      ctx.arc(b.x + b.w / 2, this.groundY - b.h - 30, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = "rgba(0, 240, 255, 0.08)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(this.stageWidth / 2, this.groundY - 140, 180, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(this.stageWidth / 2, this.groundY - 140, 220, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    const groundGrad = ctx.createLinearGradient(0, this.groundY, 0, ch);
    groundGrad.addColorStop(0, '#1c2438');
    groundGrad.addColorStop(1, '#090c14');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, this.groundY, this.stageWidth, ch - this.groundY + 100);

    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 4;
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(0, this.groundY);
    ctx.lineTo(this.stageWidth, this.groundY);
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.strokeStyle = "rgba(255, 255, 255, 0.07)";
    ctx.lineWidth = 1;
    for (let x = 60; x < this.stageWidth; x += 60) {
      ctx.beginPath();
      ctx.moveTo(x, this.groundY);
      ctx.lineTo(x, this.groundY + 80);
      ctx.stroke();
    }

    ctx.strokeStyle = "rgba(255, 0, 85, 0.4)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(this.stageLeft, 0);
    ctx.lineTo(this.stageLeft, this.groundY);
    ctx.moveTo(this.stageRight, 0);
    ctx.lineTo(this.stageRight, this.groundY);
    ctx.stroke();
  }

  // 메인 루프
  startLoop() {
    const loop = () => {
      this.update();
      this.render();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.gameInstance = new BladeArenaGame();
});
