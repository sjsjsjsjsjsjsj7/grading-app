// =========================================
// BLADE CLASH ARENA - AI API CHATBOT
// 실시간 LLM API (Gemini / OpenAI / 무료 오픈 AI) & API 키 인증 시스템
// =========================================

const BLADE_SYSTEM_PROMPT = `당신은 1대1 웹 대전 액션 격투 게임 '블레이드 아레나: 듀얼 오브 스틸 (Blade Clash Arena)'의 전설적인 검술 사부이자 실시간 아레나 해설가 '블레이드-AI'입니다.

[게임 시스템 핵심 정보]:
1. 조작 모드:
   - 1인용 (vs 지능형 전투 AI - 초급/중급/상급 난이도) 및 2인용 (로컬 1P vs 2P 키보드 대전).
2. 조작키:
   - 1P 기본: [A]/[D] 이동, [W] 점프, [J] 기본 3단 베기, [K] 특수 회전베기(대시), [L] 막기(홀로그램 실드)
   - 2P 기본: [←]/[→] 이동, [↑] 점프, [1] 기본 베기, [2] 특수 베기, [3] 막기
   - 상단 '키 설정' 버튼을 눌러 키보드의 어떤 키로든 100% 자유롭게 변경 가능.
3. 막기(Guard / Block):
   - 정면에서 오는 칼날을 막으면 대미지가 88% 감소하고 푸른 홀로그램 실드가 켜짐.
   - 막고 있으면 노란색 '가드 실드 게이지'가 소모되며, 0이 되면 '가드 브레이크(스턴)'에 걸려 무방비가 됨.
4. 점프(Jump):
   - 상대의 특수 돌진기를 점프로 회피하거나 공중 급습 베기 구사 가능.
5. 칼 스킨 공방 (Blade Forge):
   - 5종 무기 형태: 카타나, 대검(Claymore), 광선검(Lightsaber), 레이피어, 드래곤 마검
   - 칼날 색상, 네온 글로우, 손잡이 색상 커스텀
   - 5대 오라 파티클: 🔥 지옥불, ⚡ 뇌전, 🌸 벚꽃 바람, 🌌 공허, ✨ 사이버 네온
   - 칼 길이 및 두께 조절 가능
6. 화면 줌:
   - 마우스 휠 아래로 = 화면 축소(55% 줌아웃)
   - 마우스 휠 위로 = 화면 확대(180% 줌인)
   - 우클릭 드래그 = 화면 시점 이동(Pan)

[대화 원칙]:
- 항상 사이버 검객 사부이자 아레나 해설자 페르소나를 유지하세요.
- 친절하고, 박진감 넘치며, 위트 있는 한국어로 답변하세요.
- 게임 조작 질문이나 전술 질문에는 구체적인 키와 공략 비법을 명쾌하게 알려주세요.
- 마크다운(굵은 글씨, 이모지, 글머리 기호)을 적극 활용하여 가독성을 높이세요.`;

class BladeChatbot {
  constructor() {
    this.container = document.getElementById('chat-messages-container');
    this.input = document.getElementById('chat-input');
    this.form = document.getElementById('chat-form');
    this.sendBtn = document.getElementById('btn-send-chat');
    this.widget = document.getElementById('ai-chat-widget');
    this.minBtn = document.getElementById('btn-minimize-chat');
    this.toggleBtn = document.getElementById('btn-toggle-chat');

    // API 패널 요소
    this.apiPanel = document.getElementById('chat-api-panel');
    this.btnApiSettings = document.getElementById('btn-chat-api-settings');
    this.btnCloseApiPanel = document.getElementById('btn-close-api-panel');
    this.selectProvider = document.getElementById('api-provider');
    this.inputModel = document.getElementById('api-model');
    this.inputApiKey = document.getElementById('api-key-input');
    this.btnSaveApiKey = document.getElementById('btn-save-api-key');
    this.btnClearHistory = document.getElementById('btn-clear-chat-history');
    this.statusHint = document.getElementById('api-status-hint');

    // 인증 표시 뱃지 및 상태
    this.verifyBadge = document.getElementById('api-verify-badge');
    this.headerDot = document.getElementById('header-verify-dot');
    this.headerStatus = document.getElementById('bot-status-display');

    // 대화 내역 (LLM 컨텍스트 유지용)
    this.history = [];
    this.isGenerating = false;
    this.isVerifying = false;

    this.loadApiConfig();
    this.initUI();
    this.sendGreeting();
  }

  loadApiConfig() {
    this.provider = localStorage.getItem('blade_chat_provider') || 'gemini';
    this.apiKey = localStorage.getItem('blade_chat_api_key') || '';
    this.model = localStorage.getItem('blade_chat_model') || (
      this.provider === 'gemini' ? 'gemini-1.5-flash' : (this.provider === 'openai' ? 'gpt-4o-mini' : 'openai')
    );
    this.isVerified = localStorage.getItem('blade_chat_is_verified') === 'true';

    if (this.selectProvider) this.selectProvider.value = this.provider;
    if (this.inputModel) this.inputModel.value = this.model;
    if (this.inputApiKey) this.inputApiKey.value = this.apiKey;

    this.updateVerificationUI();
  }

  updateVerificationUI() {
    const keyRow = document.getElementById('api-key-row');

    if (this.provider === 'builtin') {
      if (this.verifyBadge) {
        this.verifyBadge.className = 'verify-badge verified';
        this.verifyBadge.textContent = '내장 엔진';
      }
      if (this.headerDot) this.headerDot.className = 'verify-dot active';
      if (this.headerStatus) this.headerStatus.textContent = '⚡ 오프라인 스마트 전술 가이드';
      if (this.statusHint) {
        this.statusHint.textContent = '⚡ 내장 스마트 전술 엔진 모드입니다. (별도 키 불필요)';
        this.statusHint.style.color = '#00f0ff';
      }
      if (keyRow) keyRow.style.opacity = '0.4';
      return;
    }

    if (this.provider === 'free_llm') {
      if (this.verifyBadge) {
        this.verifyBadge.className = 'verify-badge verified';
        this.verifyBadge.textContent = '인증 불필요';
      }
      if (this.headerDot) this.headerDot.className = 'verify-dot active';
      if (this.headerStatus) this.headerStatus.textContent = '🌐 무료 오픈 LLM AI 연결됨';
      if (this.statusHint) {
        this.statusHint.textContent = '🌐 [추천] 별도 키 발급 없이 무료 오픈 LLM API와 실시간으로 대화합니다!';
        this.statusHint.style.color = '#00ff88';
      }
      if (keyRow) keyRow.style.opacity = '0.4';
      return;
    }

    if (keyRow) keyRow.style.opacity = '1';

    const providerName = this.provider === 'gemini' ? 'Gemini' : 'OpenAI';

    if (this.isVerified && this.apiKey) {
      // ✅ 인증됨 상태
      if (this.verifyBadge) {
        this.verifyBadge.className = 'verify-badge verified';
        this.verifyBadge.textContent = '✅ 인증됨';
      }
      if (this.headerDot) this.headerDot.className = 'verify-dot active';
      if (this.headerStatus) this.headerStatus.textContent = `🟢 [인증됨] ${providerName} AI 가이드`;
      if (this.statusHint) {
        this.statusHint.textContent = `✅ ${providerName} API 키 인증 완료! 실제 ${this.model} 모델과 실시간 연결되어 있습니다.`;
        this.statusHint.style.color = '#00ff88';
      }
      const headerTag = document.getElementById('header-chat-verify-badge');
      if (headerTag) {
        headerTag.textContent = '인증됨 🟢';
        headerTag.className = 'chat-verify-tag verified';
      }
    } else if (this.apiKey) {
      // 키는 있으나 미인증 또는 검증 필요
      if (this.verifyBadge) {
        this.verifyBadge.className = 'verify-badge unverified';
        this.verifyBadge.textContent = '인증 필요';
      }
      if (this.headerDot) this.headerDot.className = 'verify-dot';
      if (this.headerStatus) this.headerStatus.textContent = `⚠️ [미인증] ${providerName} 키 확인 필요`;
      if (this.statusHint) {
        this.statusHint.textContent = `💡 [키 검증 및 인증] 버튼을 눌러 API 키 유효성을 확인해 주세요.`;
        this.statusHint.style.color = '#ffcc00';
      }
      const headerTag = document.getElementById('header-chat-verify-badge');
      if (headerTag) {
        headerTag.textContent = '미인증';
        headerTag.className = 'chat-verify-tag';
      }
    } else {
      // 키 없음
      if (this.verifyBadge) {
        this.verifyBadge.className = 'verify-badge unverified';
        this.verifyBadge.textContent = '미입력';
      }
      if (this.headerDot) this.headerDot.className = 'verify-dot';
      if (this.headerStatus) this.headerStatus.textContent = `💡 ${providerName} 키 등록 대기`;
      if (this.statusHint) {
        this.statusHint.textContent = `💡 ${providerName} API 키를 입력하고 인증하면 실제 최신 LLM이 실시간 답변합니다!`;
        this.statusHint.style.color = '#94a3b8';
      }
    }
  }


  initUI() {
    // 1. 폼 전송 이벤트
    if (this.form) {
      this.form.addEventListener('submit', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.submitInput();
      });
    }

    // 전송 버튼 직접 클릭 지원
    if (this.sendBtn) {
      this.sendBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.submitInput();
      });
    }

    // 입력창에서 게임 단축키 격리
    if (this.input) {
      this.input.addEventListener('keydown', (e) => {
        e.stopPropagation();
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.submitInput();
        }
      });
      this.input.addEventListener('keyup', (e) => e.stopPropagation());
    }

    // API Key 입력 시 상태 변경
    if (this.inputApiKey) {
      this.inputApiKey.addEventListener('input', () => {
        this.isVerified = false;
        localStorage.setItem('blade_chat_is_verified', 'false');
        if (this.verifyBadge) {
          this.verifyBadge.className = 'verify-badge unverified';
          this.verifyBadge.textContent = '인증 필요';
        }
      });
    }

    // 2. 빠른 질문 버튼 클릭
    document.querySelectorAll('.btn-quick').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const query = btn.getAttribute('data-msg');
        if (query && !this.isGenerating) {
          this.handleUserMessage(query);
        }
      });
    });

    // 3. 최소화 / 복원 버튼
    if (this.minBtn) {
      this.minBtn.addEventListener('click', () => {
        this.widget.classList.toggle('minimized');
        this.minBtn.innerHTML = this.widget.classList.contains('minimized') ? '&#9633;' : '&minus;';
      });
    }

    // 4. 헤더 상단 챗봇 열기 토글 버튼
    if (this.toggleBtn) {
      this.toggleBtn.addEventListener('click', () => {
        this.widget.classList.toggle('hidden');
        if (!this.widget.classList.contains('hidden')) {
          this.widget.classList.remove('minimized');
          if (this.minBtn) this.minBtn.innerHTML = '&minus;';
          setTimeout(() => this.input?.focus(), 150);
        }
      });
    }

    // 5. API 설정 패널 토글
    if (this.btnApiSettings) {
      this.btnApiSettings.addEventListener('click', (e) => {
        e.stopPropagation();
        this.apiPanel.classList.toggle('hidden');
      });
    }

    if (this.btnCloseApiPanel) {
      this.btnCloseApiPanel.addEventListener('click', () => {
        this.apiPanel.classList.add('hidden');
      });
    }

    // 6. 제공자 셀렉트 변경 시 모델 추천값 자동 동기화
    if (this.selectProvider) {
      this.selectProvider.addEventListener('change', (e) => {
        const val = e.target.value;
        this.provider = val;
        if (val === 'gemini') {
          this.inputModel.value = 'gemini-1.5-flash';
        } else if (val === 'openai') {
          this.inputModel.value = 'gpt-4o-mini';
        } else if (val === 'free_llm') {
          this.inputModel.value = 'openai';
        }
        this.isVerified = false;
        this.updateVerificationUI();
      });
    }

    // 7. [키 검증 및 인증] 버튼 클릭 -> 실제 유효성 검사 수행!
    if (this.btnSaveApiKey) {
      this.btnSaveApiKey.addEventListener('click', (e) => {
        e.preventDefault();
        this.verifyAndSaveApiKey();
      });
    }

    // 8. 대화 리셋 버튼
    if (this.btnClearHistory) {
      this.btnClearHistory.addEventListener('click', () => {
        this.history = [];
        this.container.innerHTML = '';
        this.sendGreeting();
        this.apiPanel.classList.add('hidden');
      });
    }
  }

  // API 키 실제 서버 핑 검증 및 저장
  async verifyAndSaveApiKey() {
    if (this.isVerifying) return;

    this.provider = this.selectProvider.value;
    this.apiKey = this.inputApiKey.value.trim();
    this.model = this.inputModel.value.trim() || (
      this.provider === 'gemini' ? 'gemini-1.5-flash' : (this.provider === 'openai' ? 'gpt-4o-mini' : 'openai')
    );

    // 1. 무료 오픈 AI나 내장 엔진인 경우 검증 통과 처리
    if (this.provider === 'free_llm' || this.provider === 'builtin') {
      this.isVerified = true;
      localStorage.setItem('blade_chat_provider', this.provider);
      localStorage.setItem('blade_chat_model', this.model);
      localStorage.setItem('blade_chat_is_verified', 'true');
      this.updateVerificationUI();
      this.btnSaveApiKey.textContent = '✅ 설정 완료!';
      setTimeout(() => {
        this.btnSaveApiKey.textContent = '🔑 키 검증 및 인증';
        this.apiPanel.classList.add('hidden');
      }, 1000);
      return;
    }

    // 2. 키 미입력 체크
    if (!this.apiKey) {
      if (this.statusHint) {
        this.statusHint.textContent = '⚠️ API 키를 입력한 후 인증 버튼을 눌러주세요.';
        this.statusHint.style.color = '#ff3344';
      }
      if (this.verifyBadge) {
        this.verifyBadge.className = 'verify-badge failed';
        this.verifyBadge.textContent = '키 필요';
      }
      return;
    }

    // 3. 실제 검증 요청 진행
    this.isVerifying = true;
    this.btnSaveApiKey.disabled = true;
    this.btnSaveApiKey.textContent = '🔄 인증 확인 중...';
    if (this.verifyBadge) {
      this.verifyBadge.className = 'verify-badge verifying';
      this.verifyBadge.textContent = '확인 중...';
    }
    if (this.statusHint) {
      this.statusHint.textContent = `🔄 ${this.provider === 'gemini' ? 'Google Gemini' : 'OpenAI'} 서버와 통신하여 키를 검증하고 있습니다...`;
      this.statusHint.style.color = '#ffcc00';
    }

    try {
      if (this.provider === 'gemini') {
        await this.testGeminiKey(this.apiKey, this.model);
      } else if (this.provider === 'openai') {
        await this.testOpenAIKey(this.apiKey, this.model);
      }

      // 검증 성공!
      this.isVerified = true;
      localStorage.setItem('blade_chat_provider', this.provider);
      localStorage.setItem('blade_chat_api_key', this.apiKey);
      localStorage.setItem('blade_chat_model', this.model);
      localStorage.setItem('blade_chat_is_verified', 'true');

      this.updateVerificationUI();

      this.btnSaveApiKey.textContent = '✅ 인증 성공!';
      this.btnSaveApiKey.style.background = '#00ff88';
      this.btnSaveApiKey.style.color = '#000';

      this.addBotMessage(`🎉 **API Key 인증 완료!**\n- 엔진: **${this.provider === 'gemini' ? 'Google Gemini' : 'OpenAI'}**\n- 상태: <span style="color:#00ff88;font-weight:bold;">[✅ 인증됨]</span>\n- 모델: \`${this.model}\`\n\n이제 실제 최신 생성형 AI 모델과 실시간으로 대화하실 수 있습니다! ⚔️`);

      setTimeout(() => {
        this.btnSaveApiKey.textContent = '🔑 키 검증 및 인증';
        this.btnSaveApiKey.style.background = '';
        this.btnSaveApiKey.style.color = '';
        this.btnSaveApiKey.disabled = false;
        this.isVerifying = false;
        this.apiPanel.classList.add('hidden');
      }, 1200);

    } catch (err) {
      // 검증 실패
      console.error("Verification failed:", err);
      this.isVerified = false;
      localStorage.setItem('blade_chat_is_verified', 'false');

      if (this.verifyBadge) {
        this.verifyBadge.className = 'verify-badge failed';
        this.verifyBadge.textContent = '❌ 인증 실패';
      }
      if (this.headerDot) this.headerDot.className = 'verify-dot';
      if (this.headerStatus) this.headerStatus.textContent = '❌ API 키 인증 실패';

      if (this.statusHint) {
        this.statusHint.textContent = `❌ 인증 실패: ${err.message}`;
        this.statusHint.style.color = '#ff3344';
      }

      this.btnSaveApiKey.textContent = '❌ 재시도';
      this.btnSaveApiKey.disabled = false;
      this.isVerifying = false;
    }
  }

  // Gemini API 키 테스트 호출
  async testGeminiKey(apiKey, model) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${apiKey}`;
    const body = {
      contents: [{
        role: 'user',
        parts: [{ text: 'ping' }]
      }],
      generationConfig: {
        maxOutputTokens: 5
      }
    };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        const msg = errJson.error?.message || `HTTP ${res.status}`;
        throw new Error(`[Gemini 오류] ${msg}`);
      }

      const data = await res.json();
      if (!data.candidates || data.candidates.length === 0) {
        throw new Error("Gemini 응답 없음");
      }
      return true;
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') throw new Error("서버 응답 시간 초과 (타임아웃)");
      throw err;
    }
  }

  // OpenAI API 키 테스트 호출
  async testOpenAIKey(apiKey, model) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      const res = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        const msg = errJson.error?.message || `HTTP ${res.status}`;
        throw new Error(`[OpenAI 오류] ${msg}`);
      }
      return true;
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') throw new Error("서버 응답 시간 초과 (타임아웃)");
      throw err;
    }
  }

  submitInput() {
    if (!this.input) return;
    const text = this.input.value.trim();
    if (text && !this.isGenerating) {
      this.input.value = '';
      this.handleUserMessage(text);
    }
  }

  sendGreeting() {
    const statusText = this.isVerified ? `[✅ 인증됨: ${this.provider.toUpperCase()}]` : `[${this.provider === 'free_llm' ? '🌐 무료 오픈 LLM' : '💡 API 키 등록 대기'}]`;
    this.addBotMessage(`반갑습니다, 검객님! 저는 전투 코치 AI **'블레이드-AI'**입니다. ⚔️\n현재 AI 상태: **${statusText}**\n\n상단 **[⚙️ API 설정]**에서 API 키를 등록하고 인증하시면 실시간 최신 LLM이 직접 답변해 드립니다!`);
  }

  addUserMessage(text) {
    const div = document.createElement('div');
    div.className = 'msg user';
    div.textContent = text;
    this.container.appendChild(div);
    this.scrollToBottom();
  }

  addBotMessage(text) {
    const div = document.createElement('div');
    div.className = 'msg bot';
    
    // 안전한 마크다운 파싱
    const formatted = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/`([^`]+)`/g, '<code style="background:rgba(255,255,255,0.15);padding:1px 4px;border-radius:3px;font-family:monospace;">$1</code>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');
    
    div.innerHTML = formatted;
    this.container.appendChild(div);
    this.scrollToBottom();
    return div;
  }

  showThinking() {
    const div = document.createElement('div');
    div.className = 'msg bot thinking';
    div.id = 'bot-thinking-msg';
    div.innerHTML = `<span>블레이드-AI 생각 중</span> <span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span>`;
    this.container.appendChild(div);
    this.scrollToBottom();
  }

  removeThinking() {
    const el = document.getElementById('bot-thinking-msg');
    if (el) el.remove();
  }

  scrollToBottom() {
    setTimeout(() => {
      if (this.container) {
        this.container.scrollTop = this.container.scrollHeight;
      }
    }, 50);
  }

  async handleUserMessage(text) {
    this.addUserMessage(text);
    this.isGenerating = true;
    this.showThinking();

    try {
      let reply = '';

      if (this.provider === 'gemini' && this.apiKey && this.isVerified) {
        reply = await this.callGeminiAPI(text);
      } else if (this.provider === 'openai' && this.apiKey && this.isVerified) {
        reply = await this.callOpenAIAPI(text);
      } else if (this.provider === 'free_llm') {
        reply = await this.callFreeOpenAI(text);
      } else {
        // 미인증 상태이거나 내장 엔진인 경우: 지능형 로컬 전술 엔진
        await new Promise(r => setTimeout(r, 400));
        reply = this.generateLocalResponse(text);
      }

      this.removeThinking();
      this.addBotMessage(reply);

      // 대화 히스토리 업데이트
      this.history.push({ role: 'user', text: text });
      this.history.push({ role: 'model', text: reply });
      if (this.history.length > 12) this.history = this.history.slice(-12);

    } catch (err) {
      console.warn("AI API Request Failed, falling back to local engine:", err);
      this.removeThinking();

      // 오류 발생 시 지능형 로컬 전술 엔진으로 즉시 대체 답변
      const fallbackReply = this.generateLocalResponse(text);
      this.addBotMessage(`💡 *(네트워크 지연으로 전술 엔진 자동 전환)*\n\n${fallbackReply}`);
    } finally {
      this.isGenerating = false;
    }
  }

  // 1. 무료 오픈 LLM API (Pollinations)
  async callFreeOpenAI(userQuery) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 9000);

    try {
      let promptContext = `${BLADE_SYSTEM_PROMPT}\n\n[이전 대화]:\n`;
      for (const h of this.history.slice(-4)) {
        promptContext += `${h.role === 'user' ? '플레이어' : '블레이드-AI'}: ${h.text}\n`;
      }
      promptContext += `\n플레이어 질문: ${userQuery}\n블레이드-AI 답변:`;

      const url = `https://text.pollinations.ai/${encodeURIComponent(promptContext)}?model=openai&seed=${Math.floor(Math.random() * 10000)}`;

      const res = await fetch(url, {
        method: 'GET',
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!res.ok) throw new Error(`Status ${res.status}`);
      const reply = await res.text();
      if (!reply || reply.trim().length === 0) throw new Error("Empty response");

      return reply.trim();
    } catch (e) {
      clearTimeout(timeoutId);
      throw e;
    }
  }

  // 2. Google Gemini API 호출
  async callGeminiAPI(userQuery) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const modelName = this.model || 'gemini-1.5-flash';
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelName)}:generateContent?key=${this.apiKey}`;

    const contents = [];
    contents.push({
      role: 'user',
      parts: [{ text: `System Instruction: ${BLADE_SYSTEM_PROMPT}` }]
    });
    contents.push({
      role: 'model',
      parts: [{ text: "알겠습니다! 저는 전설의 검객 사부 블레이드-AI로서 플레이어를 지도하고 조언하겠습니다." }]
    });

    for (const h of this.history.slice(-6)) {
      contents.push({
        role: h.role === 'user' ? 'user' : 'model',
        parts: [{ text: h.text }]
      });
    }
    contents.push({
      role: 'user',
      parts: [{ text: userQuery }]
    });

    const body = {
      contents: contents,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 600
      }
    };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error?.message || `HTTP ${res.status}`);
    }

    const data = await res.json();
    const candidate = data.candidates?.[0];
    if (candidate?.content?.parts?.[0]?.text) {
      return candidate.content.parts[0].text;
    }
    throw new Error("Gemini 응답 텍스트 없음");
  }

  // 3. OpenAI API 호출
  async callOpenAIAPI(userQuery) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const endpoint = 'https://api.openai.com/v1/chat/completions';
    const messages = [
      { role: 'system', content: BLADE_SYSTEM_PROMPT }
    ];

    for (const h of this.history.slice(-6)) {
      messages.push({
        role: h.role === 'user' ? 'user' : 'assistant',
        content: h.text
      });
    }
    messages.push({ role: 'user', content: userQuery });

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.model || 'gpt-4o-mini',
        messages: messages,
        temperature: 0.7,
        max_tokens: 600
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error?.message || `HTTP ${res.status}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || "응답이 비어있습니다.";
  }

  // 4. 내장 스마트 전술 엔진
  generateLocalResponse(query) {
    const q = query.toLowerCase();

    // 0. 직업 관련 질문
    if (q.includes('직업') || q.includes('궁수') || q.includes('검사') || q.includes('핵폭탄') || q.includes('클래스')) {
      return "🛡️ **3대 전투 직업 가이드:**\n- 🏹 **궁수 (Archer)**: 원거리 특화! 활로 고속 화살을 쏘아 적을 요격하며, [K]로 3연발 관통 사격, [L]로 회피 덤블링을 합니다.\n- ⚔️ **검사 (Swordsman)**: 정통 근접 검술! 3단 콤보 베기와 회전 돌진, 그리고 홀로그램 가드 실드(대미지 88% 감소)를 자랑합니다. 칼 스킨 공방 이용 가능!\n- ☢️ **핵폭탄 (Nuker)**: 자폭 & 회복 특화! 다른 무기 없이 [J/K]로 폭파스킬 가동 후 **6초를 버티면 초대형 핵폭발로 자폭**하여 승리합니다. [L] 키로 **3초마다 피 1/5(20 HP)을 즉시 회복**할 수 있습니다!\n\n상단 **'🏹 직업 선택'** 버튼에서 언제든 직업을 바꿀 수 있습니다.";
    }

    if (q.includes('막기') || q.includes('방어') || q.includes('가드') || q.includes('실드') || q.includes('block')) {
      return "🛡️ **막기(방어) 비법 가이드:**\n- 기본 조작키는 **[L] 키** (2P는 [3]번 키)입니다.\n- 공격이 닿기 직전 가드를 올리면 대미지가 **88% 감소**합니다!\n- 정면 공격만 막을 수 있으며, 지속 가드 시 **가드 게이지가 소진되어 가드 브레이크**에 걸리니 타이밍에 맞춰 끊어 막는 것이 핵심입니다.";
    }

    if (q.includes('점프') || q.includes('공중') || q.includes('높이') || q.includes('jump')) {
      return "🦘 **점프 & 공중 기동 전략:**\n- **[W] 키**로 도약할 수 있습니다.\n- 상대가 특수 회전 베기로 돌진해올 때 점프로 넘어가 뒤를 잡는 전술이 매우 유효합니다!\n- 점프 중 공격([J] 키)을 누르면 빠른 공중 급습 베기가 나갑니다.";
    }

    if (q.includes('스킨') || q.includes('칼') || q.includes('무기') || q.includes('색') || q.includes('오라') || q.includes('추천')) {
      const skins = [
        "🔥 **지옥불 대검 세팅:** 무기 형태 'Claymore' + 칼날 색상 진홍색(#ff0055) + 오라 '지옥불(Hellfire)'! 묵직하고 파괴적인 느낌을 줍니다.",
        "⚡ **사이버 라이트세이버:** 무기 형태 'Lightsaber' + 칼날 네온 시안(#00f0ff) + 오라 '뇌전(Lightning)'! 미래형 고에너지 검객 스타일입니다.",
        "🌸 **풍운의 사쿠라 카타나:** 무기 형태 'Katana' + 칼날 벚꽃 핑크 + 오라 '벚꽃 바람(Sakura)'! 휘두를 때마다 꽃잎이 흩날립니다.",
        "🌌 **공허의 마검 드래곤:** 무기 형태 'Dragon' + 칼날 보라색 + 오라 '공허(Void)'! 어둠의 힘을 다루는 마검사의 포스를 뿜어냅니다."
      ];
      const pick = skins[Math.floor(Math.random() * skins.length)];
      return `🗡️ **추천 칼 스킨 조합:**\n${pick}\n\n상단의 **'🗡️ 칼 스킨 공방'** 버튼에서 바로 커스텀해 보세요!`;
    }

    if (q.includes('키') || q.includes('조작') || q.includes('버튼') || q.includes('바꾸') || q.includes('변경')) {
      return "⌨️ **조작키 변경 방법:**\n- 상단 메뉴의 **'⌨️ 키 설정'** 버튼을 클릭하세요.\n- 바꾸려는 액션 버튼을 누르고 원하는 키보드의 키(문자, 숫자, 화살표 등)를 누르면 실시간으로 리바인딩됩니다!\n- 1P와 2P 모두 각각 맞춤 설정이 가능합니다.";
    }

    if (q.includes('줌') || q.includes('마우스') || q.includes('확대') || q.includes('축소') || q.includes('화면')) {
      return "🔍 **화면 축소 & 줌 조작법:**\n- **마우스 휠을 아래로 굴리면 축소(Zoom Out)**되어 아레나 전체 전경을 볼 수 있습니다.\n- **마우스 휠을 위로 굴리면 확대(Zoom In)**되어 박진감 넘치는 칼싸움을 볼 수 있습니다.\n- 우측 상단 `초기화` 버튼으로 언제든 원래 배율로 복귀할 수 있습니다.";
    }

    if (q.includes('ai') || q.includes('비법') || q.includes('이기') || q.includes('승리') || q.includes('난이도')) {
      return "💡 **AI 공략 핵심 전술:**\n1. AI가 칼을 휘두를 때 **[L] 키로 침착하게 가드**하세요.\n2. 가드 성공 직후 딜레이 틈을 타 **[J]-[J] 콤보**로 반격하세요!\n3. AI가 스태미나 부족으로 후퇴할 때 **특수기([K] 키)**로 돌진하면 가드 브레이크와 함께 큰 대미지를 줄 수 있습니다!";
    }

    if (q.includes('안녕') || q.includes('하이') || q.includes('반가')) {
      return "반갑습니다, 멋진 검객님! 오늘 아레나에서 전설의 검술을 보여주실 준비가 되셨나요? ⚔️";
    }

    return `흥미로운 질문이군요! 현재 상단의 **[⚙️ API 설정]**에서 Gemini 또는 OpenAI API 키를 입력하고 인증하시면 실시간 최신 생성형 AI 모델과 심도 깊은 대화가 가능합니다! ⚔️`;
  }

  // 인게임 실시간 이벤트 중계 트리거
  triggerInGameEvent(type, data) {
    if (type === 'combo' && data.count >= 4) {
      this.addBotMessage(`🔥 **${data.player}의 화려한 ${data.count}연타 콤보!** 검선이 눈부십니다!`);
    } else if (type === 'guard_break') {
      this.addBotMessage(`⚠️ **${data.victim}의 가드가 파괴되었습니다!** 무방비 상태니 맹공을 퍼부으세요!`);
    } else if (type === 'ko') {
      this.addBotMessage(`🏆 **K.O.!** 이번 라운드의 승자는 **${data.winner}**입니다! 멋진 승부였습니다.`);
    }
  }
}
