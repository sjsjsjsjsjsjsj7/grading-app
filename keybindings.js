// =========================================
// BLADE CLASH ARENA - KEY BINDINGS MANAGER
// 조작키 자유 리바인딩 & 로컬스토리지 저장
// =========================================

const DEFAULT_KEY_BINDINGS = {
  p1: {
    left: 'KeyA',
    right: 'KeyD',
    jump: 'KeyW',
    attack: 'KeyJ',
    special: 'KeyK',
    block: 'KeyL'
  },
  p2: {
    left: 'ArrowLeft',
    right: 'ArrowRight',
    jump: 'ArrowUp',
    attack: 'Digit1',
    special: 'Digit2',
    block: 'Digit3'
  }
};

class KeyBindingsManager {
  constructor() {
    this.bindings = this.loadBindings();
    this.activeListeningBtn = null;
    this.listeningPlayer = null;
    this.listeningAction = null;
  }

  loadBindings() {
    const saved = localStorage.getItem('blade_clash_key_bindings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse saved key bindings:", e);
      }
    }
    return JSON.parse(JSON.stringify(DEFAULT_KEY_BINDINGS));
  }

  saveBindings() {
    localStorage.setItem('blade_clash_key_bindings', JSON.stringify(this.bindings));
    this.updateUI();
    this.updateHints();
  }

  resetToDefault() {
    this.bindings = JSON.parse(JSON.stringify(DEFAULT_KEY_BINDINGS));
    this.saveBindings();
  }

  // 사람이 읽기 쉬운 키 라벨로 변환
  static formatKeyName(code) {
    if (!code) return 'None';
    if (code.startsWith('Key')) return code.slice(3);
    if (code.startsWith('Digit')) return code.slice(5);
    if (code.startsWith('Numpad')) return 'Num' + code.slice(6);
    if (code === 'ArrowLeft') return '←';
    if (code === 'ArrowRight') return '→';
    if (code === 'ArrowUp') return '↑';
    if (code === 'ArrowDown') return '↓';
    if (code === 'Space') return 'Space';
    if (code === 'ShiftLeft' || code === 'ShiftRight') return 'Shift';
    if (code === 'ControlLeft' || code === 'ControlRight') return 'Ctrl';
    return code;
  }

  initUI() {
    this.updateUI();
    this.updateHints();

    // 키 버튼 클릭 이벤트 리스너 등록
    document.querySelectorAll('.key-binding-row').forEach(row => {
      const player = row.getAttribute('data-player');
      const action = row.getAttribute('data-action');
      const btn = row.querySelector('.key-btn');

      if (btn) {
        btn.addEventListener('click', () => {
          this.startListening(btn, player, action);
        });
      }
    });

    // 글로벌 키 입력 감지 리스너 (키 변경 중일 때 가로챔)
    window.addEventListener('keydown', (e) => {
      if (this.activeListeningBtn && this.listeningPlayer && this.listeningAction) {
        e.preventDefault();
        e.stopPropagation();

        const newCode = e.code;
        this.bindings[this.listeningPlayer][this.listeningAction] = newCode;
        this.stopListening();
        this.saveBindings();
      }
    }, true);
  }

  startListening(btn, player, action) {
    if (this.activeListeningBtn) {
      this.stopListening();
    }
    this.activeListeningBtn = btn;
    this.listeningPlayer = player;
    this.listeningAction = action;
    btn.classList.add('listening');
    btn.textContent = '입력 대기...';
  }

  stopListening() {
    if (this.activeListeningBtn) {
      this.activeListeningBtn.classList.remove('listening');
      this.activeListeningBtn = null;
      this.listeningPlayer = null;
      this.listeningAction = null;
    }
  }

  updateUI() {
    ['p1', 'p2'].forEach(player => {
      for (const action in this.bindings[player]) {
        const btn = document.getElementById(`key-${player}-${action}`);
        if (btn) {
          const code = this.bindings[player][action];
          btn.textContent = KeyBindingsManager.formatKeyName(code);
        }
      }
    });
  }

  updateHints() {
    const p1 = this.bindings.p1;
    const p2 = this.bindings.p2;

    const p1Hint = document.getElementById('hint-p1-keys');
    if (p1Hint) {
      p1Hint.textContent = `이동 [${KeyBindingsManager.formatKeyName(p1.left)}/${KeyBindingsManager.formatKeyName(p1.right)}] | 점프 [${KeyBindingsManager.formatKeyName(p1.jump)}] | 공격 [${KeyBindingsManager.formatKeyName(p1.attack)}] | 특수기 [${KeyBindingsManager.formatKeyName(p1.special)}] | 막기 [${KeyBindingsManager.formatKeyName(p1.block)}]`;
    }

    const p2Hint = document.getElementById('hint-p2-keys');
    if (p2Hint) {
      p2Hint.textContent = `이동 [${KeyBindingsManager.formatKeyName(p2.left)}/${KeyBindingsManager.formatKeyName(p2.right)}] | 점프 [${KeyBindingsManager.formatKeyName(p2.jump)}] | 공격 [${KeyBindingsManager.formatKeyName(p2.attack)}] | 특수기 [${KeyBindingsManager.formatKeyName(p2.special)}] | 막기 [${KeyBindingsManager.formatKeyName(p2.block)}]`;
    }
  }

  // 특정 키코드가 어떤 플레이어의 어떤 액션인지 확인
  getActionForCode(code) {
    const actions = [];
    for (const player of ['p1', 'p2']) {
      for (const action in this.bindings[player]) {
        if (this.bindings[player][action] === code) {
          actions.push({ player, action });
        }
      }
    }
    return actions;
  }
}

window.keyBindingsManager = new KeyBindingsManager();
