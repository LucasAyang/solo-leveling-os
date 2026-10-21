/**
 * ==========================================
 * CONFIGURAÇÕES DO SUPABASE (RLS SECURITY)
 * ==========================================
 */
const SUPABASE_URL = 'https://wfcxmhwncrgbfokirttu.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Na62n57oBXv5_YKkj8VfJQ_O7Sh1n2m';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const LEGACY_STORAGE_KEY = 'soloLevelingOS_Save_v4';
const AWAKENING_SESSION_KEY = 'soloLevelingOS_Awakened_Session';
const SOUND_MUTE_STORAGE_KEY = 'lifeOS_SoundMuted';

// Quantidades obrigatórias para liberar as Lootboxes (3 Dailies / 3 Weeklies)
const DAILY_QUOTA = 3;
const WEEKLY_QUOTA = 3;
const CATEGORY_MIN_QUOTA = 3;

// Memória anti-repetição (guarda os últimos 5 dias de Dailies e 3 semanas de Weeklies)
const MAX_DAILY_HISTORY_CODES = 15;
const MAX_WEEKLY_HISTORY_CODES = 9;

// Intervalo de sincronização automática silenciosa (12 segundos)
const AUTO_SYNC_INTERVAL_MS = 12000;

/**
 * ==========================================
 * SINTETIZADOR DE ÁUDIO NATIVO 2.0 (WEB AUDIO API)
 * ==========================================
 */
const SoundFX = {
    ctx: null,
    muted: localStorage.getItem(SOUND_MUTE_STORAGE_KEY) === 'true',

    init() {
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) this.ctx = new AudioCtx();
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    },

    playTone(freq, type = 'sine', duration = 0.1, volume = 0.12, startTimeOffset = 0, endFreq = null) {
        if (this.muted) return;
        try {
            this.init();
            if (!this.ctx) return;

            const now = this.ctx.currentTime + startTimeOffset;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = type;
            osc.frequency.setValueAtTime(freq, now);
            if (endFreq) {
                osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);
            }

            gain.gain.setValueAtTime(0.0001, now);
            gain.gain.linearRampToValueAtTime(volume, now + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + duration + 0.02);
        } catch (e) {}
    },

    click() {
        this.playTone(900, 'sine', 0.035, 0.05, 0, 600);
    },

    notifyPing() {
        this.playTone(1046.50, 'sine', 0.07, 0.07, 0);
        this.playTone(1567.98, 'triangle', 0.16, 0.08, 0.06);
    },

    boot() {
        this.playTone(220, 'sawtooth', 0.18, 0.08, 0, 880);
        this.playTone(880, 'sine', 0.35, 0.12, 0.15, 1760);
    },

    questComplete() {
        this.playTone(587.33, 'triangle', 0.12, 0.12, 0);
        this.playTone(880.00, 'triangle', 0.25, 0.14, 0.09);
        this.playTone(1174.66, 'sine', 0.35, 0.10, 0.18);
    },

    streakUp() {
        [392.00, 523.25, 659.25, 783.99, 1046.50].forEach((f, idx) => {
            this.playTone(f, 'sawtooth', 0.18, 0.08, idx * 0.05, f * 1.15);
        });
    },

    equip() {
        this.playTone(320, 'square', 0.06, 0.09, 0, 180);
        this.playTone(640, 'triangle', 0.12, 0.11, 0.06, 960);
    },

    rouletteTick() {
        this.playTone(1350, 'triangle', 0.022, 0.09, 0, 420);
    },

    lootReveal(isGod = false) {
        if (isGod) {
            [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98].forEach((f, i) => {
                this.playTone(f, 'sawtooth', 0.75, 0.08, i * 0.055);
                this.playTone(f * 1.5, 'sine', 0.85, 0.06, i * 0.055);
            });
        } else {
            [440, 554.37, 659.25, 880].forEach((f, i) => {
                this.playTone(f, 'triangle', 0.4, 0.1, i * 0.06);
            });
        }
    },

    levelUp() {
        const notes = [440, 554.37, 659.25, 880, 1108.73, 1318.51];
        notes.forEach((f, idx) => {
            this.playTone(f, 'triangle', 0.35, 0.13, idx * 0.075);
        });
    },

    classEvolution() {
        const notes = [220, 277.18, 329.63, 440, 659.25, 880, 1318.51];
        notes.forEach((f, idx) => {
            this.playTone(f, 'sawtooth', 0.55, 0.09, idx * 0.065);
            this.playTone(f * 0.5, 'sine', 0.65, 0.10, idx * 0.065);
        });
    },

    penaltyAlarm() {
        this.playTone(190, 'sawtooth', 0.3, 0.14, 0, 130);
        this.playTone(190, 'sawtooth', 0.35, 0.14, 0.35, 120);
    },

    error() {
        this.playTone(240, 'sawtooth', 0.12, 0.1, 0, 160);
    }
};

function toggleSoundFX() {
    SoundFX.muted = !SoundFX.muted;
    localStorage.setItem(SOUND_MUTE_STORAGE_KEY, String(SoundFX.muted));
    updateSoundButtonUI();
    if (!SoundFX.muted) {
        SoundFX.click();
        showSystemNotification('Áudio do Sistema ativado.', 'success');
    } else {
        showSystemNotification('Áudio do Sistema silenciado.', 'success');
    }
}

function updateSoundButtonUI() {
    const btn = document.getElementById('sound-toggle-btn');
    if (!btn) return;
    btn.innerText = SoundFX.muted ? '🔇' : '🔊';
    btn.className = SoundFX.muted
        ? 'px-2.5 py-1 rounded bg-black/60 border border-gray-800 text-xs text-gray-500 transition-all'
        : 'px-2.5 py-1 rounded bg-black/60 border border-blue-900 hover:border-cyan-400 text-xs text-cyan-300 transition-all';
}

/**
 * ==========================================
 * GERADOR DE FALLBACK VETORIAL (CASO ALGUMA IMAGEM AINDA NÃO EXISTA)
 * ==========================================
 */
function svgToDataUri(svgString) {
    return `data:image/svg+xml;utf8,${encodeURIComponent(svgString.trim())}`;
}

function buildEquipmentSvgUri(slot, hexColor = '#00d4ff', isGod = false) {
    const glowFilter = `<defs>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="${isGod ? '3.5' : '2'}" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#ffffff" stop-opacity="${isGod ? '0.95' : '0.45'}" />
            <stop offset="50%" stop-color="${hexColor}" stop-opacity="0.9" />
            <stop offset="100%" stop-color="#050814" stop-opacity="0.95" />
        </linearGradient>
    </defs>`;

    let shape = '';
    switch (slot) {
        case 'capacete':
            shape = `<path d="M18 36 L18 24 C18 14 46 14 46 24 L46 36 L40 48 L32 44 L24 48 Z" fill="url(#grad)" stroke="${hexColor}" stroke-width="2" filter="url(#glow)"/>
                     <polygon points="22,28 30,32 22,35" fill="#ffffff"/><polygon points="42,28 34,32 42,35" fill="#ffffff"/>`;
            break;
        case 'peitoral':
            shape = `<path d="M16 18 L24 14 L32 20 L40 14 L48 18 L52 28 L44 32 L42 50 L32 54 L22 50 L20 32 L12 28 Z" fill="url(#grad)" stroke="${hexColor}" stroke-width="2" filter="url(#glow)"/>
                     <polygon points="32,24 38,32 32,44 26,32" fill="#ffffff" opacity="0.85"/>`;
            break;
        case 'botas':
            shape = `<path d="M22 14 L36 14 L36 36 L48 44 L48 50 L18 50 L18 40 L22 34 Z" fill="url(#grad)" stroke="${hexColor}" stroke-width="2" filter="url(#glow)"/>`;
            break;
        case 'capa':
            shape = `<path d="M20 14 C28 18 36 18 44 14 L50 48 L39 44 L32 52 L25 44 L14 48 Z" fill="url(#grad)" stroke="${hexColor}" stroke-width="2" filter="url(#glow)"/>`;
            break;
        case 'arma_principal':
            shape = `<path d="M48 12 L52 16 L26 42 L20 42 L20 36 Z" fill="url(#grad)" stroke="${hexColor}" stroke-width="2" filter="url(#glow)"/>
                     <path d="M16 32 L32 48 M18 44 L12 50" stroke="${hexColor}" stroke-width="3" stroke-linecap="round"/>`;
            break;
        default:
            shape = `<path d="M32 12 L48 18 L46 36 C44 45 32 52 32 52 C32 52 20 45 18 36 L16 18 Z" fill="url(#grad)" stroke="${hexColor}" stroke-width="2" filter="url(#glow)"/>`;
            break;
    }

    return svgToDataUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${glowFilter}${shape}</svg>`);
}

function buildHunterAvatarSvgUri(rankName = 'E', primaryHex = '#00d4ff', secondaryHex = '#0077ff', hasCrown = false) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 200">
        <defs>
            <filter id="aura" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="5" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#121a2d"/><stop offset="60%" stop-color="#070b14"/><stop offset="100%" stop-color="#020307"/>
            </linearGradient>
            <linearGradient id="energyGrad" x1="0%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stop-color="${secondaryHex}" stop-opacity="0.1"/>
                <stop offset="50%" stop-color="${primaryHex}" stop-opacity="0.65"/>
                <stop offset="100%" stop-color="#ffffff" stop-opacity="0.95"/>
            </linearGradient>
        </defs>
        <ellipse cx="60" cy="182" rx="44" ry="9" fill="none" stroke="${primaryHex}" stroke-width="2" stroke-dasharray="8 4" filter="url(#aura)"/>
        <path d="M22 178 Q12 120 30 75 Q18 40 42 20 Q60 4 78 20 Q102 40 90 75 Q108 120 98 178 Z" fill="none" stroke="${primaryHex}" stroke-width="1.5" opacity="0.45" filter="url(#aura)"/>
        <path d="M36 56 L60 46 L84 56 L96 112 L86 176 L68 176 L64 130 L56 130 L52 176 L34 176 L24 112 Z" fill="url(#bodyGrad)" stroke="${primaryHex}" stroke-width="2" filter="url(#aura)"/>
        <polygon points="60,64 70,78 60,104 50,78" fill="url(#energyGrad)" opacity="0.85" filter="url(#aura)"/>
        <path d="M44 48 C44 26 76 26 76 48 L70 58 L50 58 Z" fill="#060911" stroke="${primaryHex}" stroke-width="2"/>
        <polygon points="49,43 57,46 50,48" fill="#ffffff" stroke="${primaryHex}" stroke-width="1" filter="url(#aura)"/>
        <polygon points="71,43 63,46 70,48" fill="#ffffff" stroke="${primaryHex}" stroke-width="1" filter="url(#aura)"/>
        ${hasCrown ? `<polygon points="44,30 52,14 60,26 68,14 76,30" fill="url(#energyGrad)" stroke="#ffffff" stroke-width="1.2" filter="url(#aura)"/>` : ''}
    </svg>`;
    return svgToDataUri(svg);
}

/**
 * ==========================================
 * MOTOR DE IMAGENS PERSONALIZADAS (CONFIG_IMAGENS)
 * ==========================================
 * Configurado automaticamente com o padrão:
 * - img/fundo_penalidade.png
 * - img/padrao_<slot>.png
 * - img/<raridade>_<slot>.png
 */
const IMG_FOLDER = 'img/';
const IMG_EXT = '.png';

const CONFIG_IMAGENS = {
    personagem: {
        padrao: buildHunterAvatarSvgUri('E', '#00d4ff', '#0077ff', false),
        porRank: {
            E:        buildHunterAvatarSvgUri('E', '#9ca3af', '#4b5563', false),
            D:        buildHunterAvatarSvgUri('D', '#4ade80', '#16a34a', false),
            C:        buildHunterAvatarSvgUri('C', '#60a5fa', '#2563eb', false),
            B:        buildHunterAvatarSvgUri('B', '#c084fc', '#7e22ce', false),
            A:        buildHunterAvatarSvgUri('A', '#f87171', '#dc2626', false),
            S:        buildHunterAvatarSvgUri('S', '#facc15', '#ca8a04', true),
            Nacional: buildHunterAvatarSvgUri('Nacional', '#f472b6', '#db2777', true),
            Global:   buildHunterAvatarSvgUri('Global', '#00d4ff', '#7c3aed', true),
            Monarca:  buildHunterAvatarSvgUri('Monarca', '#ffffff', '#b388ff', true)
        }
    },
    fundoPenalidade: `${IMG_FOLDER}fundo_penalidade${IMG_EXT}`,
    equipamentosPadrao: {
        capacete:        `${IMG_FOLDER}padrao_capacete${IMG_EXT}`,
        peitoral:        `${IMG_FOLDER}padrao_peitoral${IMG_EXT}`,
        botas:           `${IMG_FOLDER}padrao_botas${IMG_EXT}`,
        capa:            `${IMG_FOLDER}padrao_capa${IMG_EXT}`,
        arma_principal:  `${IMG_FOLDER}padrao_arma_principal${IMG_EXT}`,
        arma_secundaria: `${IMG_FOLDER}padrao_arma_secundaria${IMG_EXT}`
    },
    equipamentosPorRaridade: {
        comum: {
            capacete: `${IMG_FOLDER}comum_capacete${IMG_EXT}`,
            peitoral: `${IMG_FOLDER}comum_peitoral${IMG_EXT}`,
            botas: `${IMG_FOLDER}comum_botas${IMG_EXT}`,
            capa: `${IMG_FOLDER}comum_capa${IMG_EXT}`,
            arma_principal: `${IMG_FOLDER}comum_arma_principal${IMG_EXT}`,
            arma_secundaria: `${IMG_FOLDER}comum_arma_secundaria${IMG_EXT}`
        },
        incomum: {
            capacete: `${IMG_FOLDER}incomum_capacete${IMG_EXT}`,
            peitoral: `${IMG_FOLDER}incomum_peitoral${IMG_EXT}`,
            botas: `${IMG_FOLDER}incomum_botas${IMG_EXT}`,
            capa: `${IMG_FOLDER}incomum_capa${IMG_EXT}`,
            arma_principal: `${IMG_FOLDER}incomum_arma_principal${IMG_EXT}`,
            arma_secundaria: `${IMG_FOLDER}incomum_arma_secundaria${IMG_EXT}`
        },
        raro: {
            capacete: `${IMG_FOLDER}raro_capacete${IMG_EXT}`,
            peitoral: `${IMG_FOLDER}raro_peitoral${IMG_EXT}`,
            botas: `${IMG_FOLDER}raro_botas${IMG_EXT}`,
            capa: `${IMG_FOLDER}raro_capa${IMG_EXT}`,
            arma_principal: `${IMG_FOLDER}raro_arma_principal${IMG_EXT}`,
            arma_secundaria: `${IMG_FOLDER}raro_arma_secundaria${IMG_EXT}`
        },
        epico: {
            capacete: `${IMG_FOLDER}epico_capacete${IMG_EXT}`,
            peitoral: `${IMG_FOLDER}epico_peitoral${IMG_EXT}`,
            botas: `${IMG_FOLDER}epico_botas${IMG_EXT}`,
            capa: `${IMG_FOLDER}epico_capa${IMG_EXT}`,
            arma_principal: `${IMG_FOLDER}epico_arma_principal${IMG_EXT}`,
            arma_secundaria: `${IMG_FOLDER}epico_arma_secundaria${IMG_EXT}`
        },
        lendario: {
            capacete: `${IMG_FOLDER}lendario_capacete${IMG_EXT}`,
            peitoral: `${IMG_FOLDER}lendario_peitoral${IMG_EXT}`,
            botas: `${IMG_FOLDER}lendario_botas${IMG_EXT}`,
            capa: `${IMG_FOLDER}lendario_capa${IMG_EXT}`,
            arma_principal: `${IMG_FOLDER}lendario_arma_principal${IMG_EXT}`,
            arma_secundaria: `${IMG_FOLDER}lendario_arma_secundaria${IMG_EXT}`
        },
        mitico: {
            capacete: `${IMG_FOLDER}mitico_capacete${IMG_EXT}`,
            peitoral: `${IMG_FOLDER}mitico_peitoral${IMG_EXT}`,
            botas: `${IMG_FOLDER}mitico_botas${IMG_EXT}`,
            capa: `${IMG_FOLDER}mitico_capa${IMG_EXT}`,
            arma_principal: `${IMG_FOLDER}mitico_arma_principal${IMG_EXT}`,
            arma_secundaria: `${IMG_FOLDER}mitico_arma_secundaria${IMG_EXT}`
        },
        exotico: {
            capacete: `${IMG_FOLDER}exotico_capacete${IMG_EXT}`,
            peitoral: `${IMG_FOLDER}exotico_peitoral${IMG_EXT}`,
            botas: `${IMG_FOLDER}exotico_botas${IMG_EXT}`,
            capa: `${IMG_FOLDER}exotico_capa${IMG_EXT}`,
            arma_principal: `${IMG_FOLDER}exotico_arma_principal${IMG_EXT}`,
            arma_secundaria: `${IMG_FOLDER}exotico_arma_secundaria${IMG_EXT}`
        },
        divino: {
            capacete: `${IMG_FOLDER}divino_capacete${IMG_EXT}`,
            peitoral: `${IMG_FOLDER}divino_peitoral${IMG_EXT}`,
            botas: `${IMG_FOLDER}divino_botas${IMG_EXT}`,
            capa: `${IMG_FOLDER}divino_capa${IMG_EXT}`,
            arma_principal: `${IMG_FOLDER}divino_arma_principal${IMG_EXT}`,
            arma_secundaria: `${IMG_FOLDER}divino_arma_secundaria${IMG_EXT}`
        },
        hack: {
            capacete: `${IMG_FOLDER}hack_capacete${IMG_EXT}`,
            peitoral: `${IMG_FOLDER}hack_peitoral${IMG_EXT}`,
            botas: `${IMG_FOLDER}hack_botas${IMG_EXT}`,
            capa: `${IMG_FOLDER}hack_capa${IMG_EXT}`,
            arma_principal: `${IMG_FOLDER}hack_arma_principal${IMG_EXT}`,
            arma_secundaria: `${IMG_FOLDER}hack_arma_secundaria${IMG_EXT}`
        },
        break: {
            capacete: `${IMG_FOLDER}break_capacete${IMG_EXT}`,
            peitoral: `${IMG_FOLDER}break_peitoral${IMG_EXT}`,
            botas: `${IMG_FOLDER}break_botas${IMG_EXT}`,
            capa: `${IMG_FOLDER}break_capa${IMG_EXT}`,
            arma_principal: `${IMG_FOLDER}break_arma_principal${IMG_EXT}`,
            arma_secundaria: `${IMG_FOLDER}break_arma_secundaria${IMG_EXT}`
        }
    }
};

/**
 * Fallback inteligente: se a imagem não for encontrada em img/nome.png,
 * tenta na raiz ./nome.png, depois .webp, .jpg e por último usa o SVG embutido.
 */
function handleCustomImageError(imgEl, slot, hexColor = '#00d4ff', isGod = false) {
    if (!imgEl) return;
    const step = parseInt(imgEl.dataset.fallbackStep || '0', 10);
    const currentSrc = imgEl.getAttribute('src') || '';

    if (step === 0 && currentSrc.startsWith('img/')) {
        // Tenta na pasta raiz caso o usuário tenha colocado fora de img/
        imgEl.dataset.fallbackStep = '1';
        imgEl.src = currentSrc.replace(/^img\//, '');
        return;
    }
    if (step === 1 && currentSrc.endsWith('.png')) {
        // Tenta extensão .webp em img/
        imgEl.dataset.fallbackStep = '2';
        imgEl.src = 'img/' + currentSrc.replace(/\.png$/, '.webp');
        return;
    }
    if (step === 2 && currentSrc.endsWith('.webp')) {
        // Tenta extensão .jpg em img/
        imgEl.dataset.fallbackStep = '3';
        imgEl.src = currentSrc.replace(/\.webp$/, '.jpg');
        return;
    }

    // Fallback final: Arte Vetorial SVG embutida (nunca deixa ícone quebrado)
    imgEl.onerror = null;
    imgEl.src = buildEquipmentSvgUri(slot || 'arma_principal', hexColor, isGod);
}
window.handleCustomImageError = handleCustomImageError;

function resolveEquipmentImageUrl(item) {
    if (!item) return "";
    const rarityId = item.rarity?.id;
    const slot = item.slot;
    // Prioriza sempre o arquivo configurado em CONFIG_IMAGENS para carregar suas artes novas
    if (rarityId && slot && CONFIG_IMAGENS.equipamentosPorRaridade?.[rarityId]?.[slot]) {
        return CONFIG_IMAGENS.equipamentosPorRaridade[rarityId][slot];
    }
    if (item.imageUrl && !String(item.imageUrl).startsWith('data:image/svg+xml')) {
        return item.imageUrl;
    }
    if (slot && CONFIG_IMAGENS.equipamentosPadrao?.[slot]) {
        return CONFIG_IMAGENS.equipamentosPadrao[slot];
    }
    return buildEquipmentSvgUri(slot || 'arma_principal', item.rarity?.hex || '#00d4ff', Boolean(item.rarity?.isGod));
}

/**
 * ==========================================
 * SISTEMA VISUAL DE TIERS (ROMANOS + ESTRELAS + TEXTURA ALBION)
 * ==========================================
 */
const ROMAN_TIERS = {
    1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V',
    6: 'VI', 7: 'VII', 8: 'VIII', 9: 'IX', 10: 'X', 11: 'XI'
};

function getTierRomanLabel(item) {
    if (!item) return '';
    if (item.rarity?.isGod) return 'GOD';
    const t = item.tier || 11;
    return ROMAN_TIERS[t] || `T${t}`;
}

function getTierRefinementHTML(item, sizeContext = 'slot') {
    if (!item) return '';
    const isGod = Boolean(item.rarity?.isGod);
    const t = item.tier || 11;
    const hex = item.rarity?.hex || '#00d4ff';
    const fontSizeClass = sizeContext === 'modal' ? 'text-sm tracking-widest my-1' : 'text-[8px]';

    if (isGod) {
        return `<div class="item-refinement-bar ${fontSizeClass} text-white" style="text-shadow: 0 0 8px ${hex}, 0 0 14px #fff;">✦✦✦✦✦</div>`;
    }
    if (t === 1) {
        return `<div class="item-refinement-bar ${fontSizeClass} text-yellow-300" style="text-shadow: 0 0 6px #facc15;">★★★★★</div>`;
    }
    if (t === 2) {
        return `<div class="item-refinement-bar ${fontSizeClass}" style="color: ${hex}; text-shadow: 0 0 5px ${hex};">◆◆◆◆</div>`;
    }
    if (t <= 5) {
        return `<div class="item-refinement-bar ${fontSizeClass}" style="color: ${hex};">◆◆◆</div>`;
    }
    if (t <= 8) {
        return `<div class="item-refinement-bar ${fontSizeClass} text-gray-300">◆◆</div>`;
    }
    return `<div class="item-refinement-bar ${fontSizeClass} text-gray-500">◆</div>`;
}

function getSlotSurfaceInlineStyle(item) {
    if (!item) return '';
    const hex = item.rarity?.hex || '#00d4ff';
    const isGod = Boolean(item.rarity?.isGod);
    const t = item.tier || 11;

    // Quanto mais próximo do Tier 1 (ou God Tier), mais intensa é a aura e a iluminação de fundo
    const glowAlpha = isGod ? '66' : t === 1 ? '55' : t <= 3 ? '40' : t <= 7 ? '28' : '1a';
    const outerShadow = isGod
        ? `0 0 18px ${hex}88, inset 0 0 22px ${hex}66`
        : t === 1
            ? `0 0 14px #facc1566, inset 0 0 18px ${hex}55`
            : `0 0 8px ${hex}33, inset 0 0 14px ${hex}${glowAlpha}`;

    return `background: radial-gradient(circle at 50% 42%, ${hex}${glowAlpha} 0%, rgba(8, 12, 22, 0.94) 78%); box-shadow: ${outerShadow};`;
}

function renderEquipmentVisualHTML(item, sizeContext = 'slot') {
    const imgUrl = resolveEquipmentImageUrl(item);
    const hex = item?.rarity?.hex || '#00d4ff';
    const isGod = Boolean(item?.rarity?.isGod);
    const slot = item?.slot || 'arma_principal';
    const t = item?.tier || 11;

    const romanBadge = getTierRomanLabel(item);
    const badgeClass = isGod ? 'badge-god' : t === 1 ? 'badge-t1' : 'text-gray-200';
    const showCornerBadge = sizeContext !== 'modal';

    // Intensidade da aura (drop-shadow) estilo Albion Online
    const auraStrength = isGod
        ? `drop-shadow(0 0 10px ${hex}) drop-shadow(0 0 18px #ffffffaa)`
        : t === 1
            ? `drop-shadow(0 0 9px ${hex}) drop-shadow(0 0 14px #facc15aa)`
            : t <= 4
                ? `drop-shadow(0 0 8px ${hex})`
                : `drop-shadow(0 0 5px ${hex}aa)`;

    const sizeClasses = sizeContext === 'modal'
        ? 'w-24 h-24 md:w-28 md:h-28'
        : sizeContext === 'roulette'
            ? 'w-11 h-11'
            : 'w-11 h-11 md:w-12 md:h-12';

    return `
        ${isGod ? '<div class="god-particles-layer"></div>' : ''}
        ${showCornerBadge ? `<div class="item-tier-badge ${badgeClass}" style="border-color: ${isGod ? '#fff' : t === 1 ? '#facc15' : hex}88">${romanBadge}</div>` : ''}
        <img src="${imgUrl}" 
             alt="${item?.name || slot}" 
             onerror="handleCustomImageError(this, '${slot}', '${hex}', ${isGod})"
             class="${sizeClasses} object-contain relative z-10 transition-transform duration-200" 
             style="filter: ${auraStrength}">
        ${getTierRefinementHTML(item, sizeContext)}
    `;
}

function resolveCharacterAvatarUrl() {
    const byRank = CONFIG_IMAGENS.personagem?.porRank?.[player.rank];
    if (byRank) return byRank;
    return CONFIG_IMAGENS.personagem?.padrao || "";
}

/**
 * ==========================================
 * TABELA DE DIFICULDADES E XP BALANCEADO
 * ==========================================
 */
const DIFFICULTY_CONFIG = {
    'Fácil':   { minXp: 8,  maxXp: 15, color: 'text-green-400 border-green-600 bg-green-950' },
    'Médio':   { minXp: 18, maxXp: 30, color: 'text-blue-400 border-blue-600 bg-blue-950' },
    'Difícil': { minXp: 35, maxXp: 55, color: 'text-purple-400 border-purple-600 bg-purple-950' },
    'Extremo': { minXp: 65, maxXp: 100, color: 'text-red-400 border-red-600 bg-red-950' }
};

function rollXpForDifficulty(diff) {
    const cfg = DIFFICULTY_CONFIG[diff] || DIFFICULTY_CONFIG['Fácil'];
    return Math.floor(Math.random() * (cfg.maxXp - cfg.minXp + 1)) + cfg.minXp;
}

/**
 * ==========================================
 * BANCO DE HÁBITOS UNIVERSAIS (DIÁRIOS, SEMANAIS E PENALIDADES)
 * ==========================================
 */
const DAILY_HABITS_POOL = [
    { code: 'dh1',  text: 'Beber pelo menos 2 litros de água ao longo do dia', diff: 'Fácil' },
    { code: 'dh2',  text: 'Tomar 1 copo grande de água logo após acordar', diff: 'Fácil' },
    { code: 'dh3',  text: 'Consumir pelo menos 2 porções de frutas ou verduras hoje', diff: 'Fácil' },
    { code: 'dh4',  text: 'Evitar refrigerantes, doces ou bebidas açucaradas hoje', diff: 'Médio' },
    { code: 'dh5',  text: 'Fazer uma refeição principal equilibrada e sem ultraprocessados', diff: 'Médio' },
    { code: 'dh6',  text: 'Evitar comer alimentos pesados pelo menos 2 horas antes de dormir', diff: 'Médio' },
    { code: 'dh7',  text: 'Expor-se à luz natural do sol por pelo menos 10 minutos', diff: 'Fácil' },
    { code: 'dh8',  text: 'Fazer higiene bucal completa (incluindo fio dental) após as refeições', diff: 'Fácil' },
    { code: 'dh9',  text: 'Fazer 10 a 15 minutos de alongamento físico e mobilidade', diff: 'Fácil' },
    { code: 'dh10', text: 'Realizar 30 minutos de caminhada ou atividade física', diff: 'Médio' },
    { code: 'dh11', text: 'Fazer uma série rápida de ativação física (polichinelos, agachamentos ou flexões)', diff: 'Médio' },
    { code: 'dh12', text: 'Cuidar da postura corporal e levantar para se esticar a cada hora sentado', diff: 'Fácil' },
    { code: 'dh13', text: 'Optar por caminhar mais ou usar escadas sempre que possível hoje', diff: 'Fácil' },
    { code: 'dh14', text: 'Dedicar 15 minutos para relaxar a musculatura do pescoço, ombros e costas', diff: 'Fácil' },
    { code: 'dh15', text: 'Arrumar a cama logo após acordar', diff: 'Fácil' },
    { code: 'dh16', text: 'Organizar o próprio espaço ou mesa antes de iniciar as atividades do dia', diff: 'Fácil' },
    { code: 'dh17', text: 'Não deixar louça ou copos sujos acumulados ao final do dia', diff: 'Fácil' },
    { code: 'dh18', text: 'Dedicar 10 minutos para guardar objetos fora do lugar no quarto ou na casa', diff: 'Fácil' },
    { code: 'dh19', text: 'Separar a roupa e os itens que vai precisar para o dia seguinte', diff: 'Fácil' },
    { code: 'dh20', text: 'Eliminar 3 itens inúteis (lixo, papéis antigos ou embalagens vazias) do ambiente', diff: 'Fácil' },
    { code: 'dh21', text: 'Definir as 3 tarefas mais importantes do dia e concluir pelo menos a primeira', diff: 'Médio' },
    { code: 'dh22', text: 'Realizar 30 minutos de foco total em uma tarefa importante sem olhar o celular', diff: 'Médio' },
    { code: 'dh23', text: 'Resolver uma pequena pendência que você estava adiando há dias', diff: 'Médio' },
    { code: 'dh24', text: 'Começar o dia sem abrir redes sociais nos primeiros 30 minutos após acordar', diff: 'Difícil' },
    { code: 'dh25', text: 'Desligar telas ou ficar sem redes sociais 40 minutos antes de dormir', diff: 'Difícil' },
    { code: 'dh26', text: 'Cumprir um horário planejado para ir para a cama hoje', diff: 'Médio' },
    { code: 'dh27', text: 'Levantar da cama no primeiro toque do despertador (sem usar o botão soneca)', diff: 'Difícil' },
    { code: 'dh28', text: 'Anotar os compromissos ou prioridades de amanhã antes de encerrar o dia', diff: 'Fácil' },
    { code: 'dh29', text: 'Passar pelo menos 1 hora com as notificações de redes sociais silenciadas', diff: 'Médio' },
    { code: 'dh30', text: 'Ler pelo menos 5 a 10 páginas de qualquer livro ou leitura construtiva', diff: 'Médio' },
    { code: 'dh31', text: 'Dedicar 20 minutos para aprender algo novo (curso, vídeo educativo, idioma ou leitura)', diff: 'Médio' },
    { code: 'dh32', text: 'Praticar 5 a 10 minutos de respiração profunda ou silêncio mental', diff: 'Fácil' },
    { code: 'dh33', text: 'Anotar 1 ideia, reflexão ou aprendizado positivo que teve hoje', diff: 'Fácil' },
    { code: 'dh34', text: 'Passar o dia mantendo a calma e evitando reclamar de pequenos imprevistos', diff: 'Difícil' },
    { code: 'dh35', text: 'Ouvir um conteúdo construtivo, educativo ou música relaxante durante o dia', diff: 'Fácil' },
    { code: 'dh36', text: 'Fazer uma pausa consciente de 10 minutos longe de telas para descansar a vista', diff: 'Fácil' },
    { code: 'dh37', text: 'Conferir os gastos realizados nas últimas 24h para manter controle financeiro', diff: 'Fácil' },
    { code: 'dh38', text: 'Passar o dia inteiro com zero compras por impulso ou gastos desnecessários', diff: 'Médio' },
    { code: 'dh39', text: 'Preparar as próprias refeições ou lanches em casa hoje em vez de pedir delivery', diff: 'Médio' },
    { code: 'dh40', text: 'Enviar uma mensagem atenciosa ou conversar com um amigo ou familiar', diff: 'Fácil' },
    { code: 'dh41', text: 'Fazer um elogio sincero ou gesto de gentileza para alguém hoje', diff: 'Fácil' },
    { code: 'dh42', text: 'Dedicar 15 minutos exclusivos ao autocuidado (pele, cabelo, banho relaxante ou aparência)', diff: 'Fácil' },
    { code: 'dh43', text: 'Fazer uma refeição com atenção plena, mastigando devagar e sem pressa', diff: 'Fácil' },
    { code: 'dh44', text: 'Dedicar 20 minutos a um hobby pessoal criativo ou relaxante fora das redes sociais', diff: 'Fácil' },
    { code: 'dh45', text: 'Concluir 100% de uma tarefa começada hoje sem deixá-la pela metade', diff: 'Médio' }
];

const WEEKLY_HABITS_POOL = [
    { code: 'wh1',  text: 'Realizar pelo menos 3 sessões de exercício físico ou caminhada nesta semana', diff: 'Difícil' },
    { code: 'wh2',  text: 'Dormir pelo menos 7 horas por noite em 5 dias desta semana', diff: 'Difícil' },
    { code: 'wh3',  text: 'Passar pelo menos 4 dias da semana sem consumir delivery ou fast-food', diff: 'Difícil' },
    { code: 'wh4',  text: 'Atingir a meta de beber 2 litros de água em pelo menos 5 dias da semana', diff: 'Médio' },
    { code: 'wh5',  text: 'Fazer uma atividade ao ar livre (parque, caminhada longa ou esporte) na semana', diff: 'Médio' },
    { code: 'wh6',  text: 'Ficar 3 dias da semana sem consumir doces ou bebidas açucaradas', diff: 'Difícil' },
    { code: 'wh7',  text: 'Realizar uma limpeza e organização geral no quarto ou ambiente principal', diff: 'Médio' },
    { code: 'wh8',  text: 'Trocar a roupa de cama e as toalhas de banho da semana', diff: 'Fácil' },
    { code: 'wh9',  text: 'Lavar, secar e guardar todas as roupas acumuladas', diff: 'Médio' },
    { code: 'wh10', text: 'Organizar uma gaveta, armário ou prateleira que esteja bagunçada', diff: 'Fácil' },
    { code: 'wh11', text: 'Limpar e higienizar os aparelhos de uso diário (celular, teclado, mesa ou fones)', diff: 'Fácil' },
    { code: 'wh12', text: 'Verificar alimentos na geladeira/armário e planejar as refeições da semana', diff: 'Médio' },
    { code: 'wh13', text: 'Revisar os gastos da semana e atualizar seu controle financeiro', diff: 'Médio' },
    { code: 'wh14', text: 'Planejar a agenda, compromissos e 3 metas principais para a próxima semana', diff: 'Fácil' },
    { code: 'wh15', text: 'Limpar arquivos desnecessários, fotos repetidas ou downloads no celular/PC', diff: 'Fácil' },
    { code: 'wh16', text: 'Resolver a pendência mais chata da sua semana sem deixar para a próxima', diff: 'Difícil' },
    { code: 'wh17', text: 'Verificar contas, boletos ou assinaturas do mês para evitar juros ou esquecimentos', diff: 'Fácil' },
    { code: 'wh18', text: 'Acumular pelo menos 2 horas de estudo ou aprendizado de uma habilidade na semana', diff: 'Difícil' },
    { code: 'wh19', text: 'Finalizar a leitura de um capítulo inteiro de livro ou artigo aprofundado', diff: 'Médio' },
    { code: 'wh20', text: 'Dedicar um momento de qualidade presencial e sem celular com família, parceiro(a) ou amigos', diff: 'Fácil' },
    { code: 'wh21', text: 'Fazer um período de detox digital (pelo menos 3 horas seguidas longe das redes sociais)', diff: 'Médio' },
    { code: 'wh22', text: 'Tirar 1 hora na semana exclusiva para lazer produtivo, descanso mental ou autocuidado', diff: 'Fácil' },
    { code: 'wh23', text: 'Dar andamento prático em uma meta pessoal de médio/longo prazo nesta semana', diff: 'Médio' },
    { code: 'wh24', text: 'Organizar sua caixa de entrada de e-mails ou mensagens pendentes importantes', diff: 'Fácil' },
    { code: 'wh25', text: 'Fazer um balanço da semana: anotar 3 conquistas e 1 ponto a melhorar', diff: 'Fácil' }
];

const PENALTY_QUESTS_POOL = [
    '💀 [PENALIDADE] Zona de Sobrevivência: 40 Polichinelos + 30 Agachamentos + 1L de Água',
    '💀 [PENALIDADE] Disciplina Forçada: 40 minutos de foco produtivo ou leitura com celular longe',
    '💀 [PENALIDADE] Purificação Física: 30 minutos de caminhada/exercício + zero açúcar hoje',
    '💀 [PENALIDADE] Ordem Absoluta: Faxina e organização completa no quarto/mesa + 20 Flexões',
    '💀 [PENALIDADE] Detox do Sistema: Ficar 2 horas seguidas sem abrir redes sociais ou jogos',
    '💀 [PENALIDADE] Resistência Física: 15 minutos de alongamento + 3 séries de prancha abdominal',
    '💀 [PENALIDADE] Restauração de Ambiente: Lavar toda a louça + organizar uma gaveta/armário',
    '💀 [PENALIDADE] Controle Mental: 15 minutos de silêncio absoluto/respiração + planejar o dia no papel',
    '💀 [PENALIDADE] Hidratação de Emergência: Beber 2,5L de água hoje + 25 minutos de atividade física',
    '💀 [PENALIDADE] Protocolo Anti-Procrastinação: Concluir imediatamente 1 tarefa adiada + 30 Polichinelos'
];

/**
 * ==========================================
 * STATE DO JOGO E DADOS (+ SANDBOX ENGINE)
 * ==========================================
 */
let currentUser = null;
let authMode = 'login';
let preselectedCategoryForRequest = null;
let collapsedCompletedState = {};
let isSyncingSupabase = false;
let hasInitialSyncCompleted = false;
let hasShownPenaltyModalThisSession = false;
let lastAutoSyncTime = 0;
let realtimeChannel = null;

// Controle de Sandbox (Ambiente de Testes sem gravação no Banco)
let isSandboxMode = false;
let sandboxBackupSnapshot = null;

let player = {
    username: "Caçador",
    level: 1,
    xp: 0,
    maxXp: 200,
    power: 0,
    rank: "E",
    playerClass: "Nenhuma",
    streak: 0,
    isAdmin: false,
    equipment: { capacete: null, peitoral: null, botas: null, capa: null, arma_principal: null, arma_secundaria: null }
};

let categoryTallies = {
    'saude': 0, 'estudo': 0, 'trabalho': 0, 'casa': 0, 
    'roupa': 0, 'lazer': 0, 'vicio': 0, 'familia': 0, 
    'amigos': 0, 'financeiro': 0
};

let resetTimestamps = {
    daily: new Date().toDateString(),
    weekly: getWeekNumber(new Date()),
    monthly: new Date().getMonth(),
    yearly: new Date().getFullYear(),
    last_daily_codes: [],
    last_weekly_codes: [],
    locked_category: null,
    locked_categories: [],
    last_streak_date: null,
    streak_count: 0
};

const ranks = { 1: "E", 15: "D", 30: "C", 50: "B", 75: "A", 100: "S", 150: "Nacional", 200: "Global", 250: "Monarca" };
const evolutionLevels = [5, 20, 50, 80, 100];
const classEvolutions = {
    'saude': { 5: 'Guerreiro', 20: 'Cavaleiro', 50: 'Comandante', 80: 'Mestre de Armas', 100: 'Deus da Guerra' },
    'estudo': { 5: 'Estudioso', 20: 'Mago', 50: 'Sábio', 80: 'Arquimago', 100: 'Onisciente' },
    'trabalho': { 5: 'Tecnomante', 20: 'Engenheiro', 50: 'Arquiteto de Sistemas', 80: 'Cyber Lord', 100: 'Hack' },
    'casa': { 5: 'Construtor', 20: 'Lorde do Domínio', 50: 'Soberano', 80: 'Arquiteto de Mundos', 100: 'Criador' },
    'roupa': { 5: 'Explorador', 20: 'Aristocrata', 50: 'Lorde do Estilo', 80: 'Doutrinador', 100: 'Imperador' },
    'lazer': { 5: 'Aventureiro', 20: 'Bardo', 50: 'Mestre do Horizonte', 80: 'Andarilho Dimensional', 100: 'Viajante Astral' },
    'vicio': { 5: 'Monge', 20: 'Ascendente', 50: 'Iluminado', 80: 'Eremita Supremo', 100: 'Mestre da Mente' },
    'familia': { 5: 'Protetor', 20: 'Guardião', 50: 'Paladino Divino', 80: 'Guardião Astral', 100: 'Aegis Divino' },
    'amigos': { 5: 'Carismático', 20: 'Emissário', 50: 'Líder de Guilda', 80: 'Comandante Supremo', 100: 'Monarca Soberano' },
    'financeiro': { 5: 'Mercador', 20: 'Barão', 50: 'Magnata', 80: 'Soberano Econômico', 100: 'Rei de Ouro' }
};

let activeCategoryId = 'geral';

const categories = {
    'geral': { title: 'Visão Geral', icon: '🌐', isSystem: true, isOverview: true },
    'saude': { title: 'Saúde', icon: '⚕️', type: 'category', tasks: [], boxClaimed: false },
    'estudo': { title: 'Estudo', icon: '📚', type: 'category', tasks: [], boxClaimed: false },
    'trabalho': { title: 'Trabalho', icon: '💼', type: 'category', tasks: [], boxClaimed: false },
    'casa': { title: 'Casa', icon: '🏠', type: 'category', tasks: [], boxClaimed: false },
    'roupa': { title: 'Roupa', icon: '👕', type: 'category', tasks: [], boxClaimed: false },
    'lazer': { title: 'Lazer', icon: '🎯', type: 'category', tasks: [], boxClaimed: false },
    'vicio': { title: 'Vício', icon: '🎮', type: 'category', tasks: [], boxClaimed: false },
    'familia': { title: 'Família', icon: '❤️', type: 'category', tasks: [], boxClaimed: false },
    'amigos': { title: 'Amigos', icon: '🤝', type: 'category', tasks: [], boxClaimed: false },
    'financeiro': { title: 'Financeiro', icon: '💰', type: 'category', tasks: [], boxClaimed: false },
    'ranking': { title: 'Ranking', icon: '🏆', isSystem: true },
    'inventario': { title: 'Inventário', icon: '🎒', isSystem: true },
    'admin': { title: 'Administração', icon: '⚙️', isSystem: true }
};

const periodicQuests = {
    'daily': { list: [], boxClaimed: false },
    'weekly': { list: [], boxClaimed: false },
    'monthly': { list: [], boxClaimed: false },
    'yearly': { list: [], boxClaimed: false }
};

/**
 * ==========================================
 * GERENCIADOR DE BLOQUEIO MULTI-CATEGORIAS & PENALIDADES
 * ==========================================
 */
function getLockedCategoriesArray() {
    let list = [];
    if (Array.isArray(resetTimestamps.locked_categories)) {
        list = [...resetTimestamps.locked_categories];
    }
    if (resetTimestamps.locked_category && !list.includes(resetTimestamps.locked_category)) {
        list.push(resetTimestamps.locked_category);
    }
    return list.filter(k => categories[k] && !categories[k].isSystem);
}

function isCategoryLocked(catKey) {
    return getLockedCategoriesArray().includes(catKey);
}

function hasActivePenaltyQuests() {
    return periodicQuests.daily.list.some(t => t.isPenalty && !t.done);
}

function getActivePenaltyQuestsCount() {
    return periodicQuests.daily.list.filter(t => t.isPenalty && !t.done).length;
}

function syncLockedCategoriesWithActivePenalties() {
    const activePenalties = getActivePenaltyQuestsCount();
    const mainCatKeys = Object.keys(categories).filter(k => !categories[k].isSystem);
    const targetLocksCount = Math.min(activePenalties, mainCatKeys.length);

    let currentLocks = getLockedCategoriesArray();
    let changed = false;

    if (targetLocksCount === 0) {
        if (currentLocks.length > 0 || resetTimestamps.locked_category !== null) {
            currentLocks = [];
            changed = true;
        }
    } else if (currentLocks.length < targetLocksCount) {
        const available = mainCatKeys.filter(k => !currentLocks.includes(k));
        while (currentLocks.length < targetLocksCount && available.length > 0) {
            const randIdx = Math.floor(Math.random() * available.length);
            currentLocks.push(available.splice(randIdx, 1)[0]);
            changed = true;
        }
    } else if (currentLocks.length > targetLocksCount) {
        currentLocks = currentLocks.slice(0, targetLocksCount);
        changed = true;
    }

    resetTimestamps.locked_categories = currentLocks;
    resetTimestamps.locked_category = currentLocks[0] || null;
    return changed;
}

function getLockedCategoriesTitlesText() {
    const locks = getLockedCategoriesArray();
    if (locks.length === 0) return 'Nenhuma';
    return locks.map(k => categories[k]?.title || k).join(', ');
}

/**
 * ==========================================
 * TELA DE DESPERTAR & AUTENTICAÇÃO SUPABASE
 * ==========================================
 */
async function checkInitialAuthAndAwakening() {
    const screen = document.getElementById('awakening-screen');
    const { data: { session } } = await supabaseClient.auth.getSession();

    if (session && session.user) {
        currentUser = session.user;
        await syncAllFromSupabase(false);
        setupRealtimeSubscriptions();

        if (sessionStorage.getItem(AWAKENING_SESSION_KEY) === 'true') {
            screen.classList.add('hidden');
        }
    } else {
        setSyncStatus('offline');
    }
}

async function acceptAwakening() {
    SoundFX.boot();
    const screen = document.getElementById('awakening-screen');
    const box = document.getElementById('awakening-box');
    const stepInvite = document.getElementById('awakening-step-invite');
    const stepAuth = document.getElementById('awakening-step-auth');
    const headerTitle = document.getElementById('awakening-header-title');

    sessionStorage.setItem(AWAKENING_SESSION_KEY, 'true');

    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session && session.user) {
        currentUser = session.user;
        box.classList.add('system-boot-out');
        setTimeout(async () => {
            screen.classList.add('hidden');
            box.classList.remove('system-boot-out');
            if (!hasInitialSyncCompleted) {
                await syncAllFromSupabase(false);
                setupRealtimeSubscriptions();
            }
            showSystemNotification(`Bem-vindo de volta, Caçador ${player.username}.`, 'success');
        }, 420);
    } else {
        headerTitle.innerText = "HUNTER ACCESS";
        stepInvite.classList.add('hidden');
        stepAuth.classList.remove('hidden');
    }
}

function rejectAwakening() {
    SoundFX.penaltyAlarm();
    const box = document.getElementById('awakening-box');
    const warning = document.getElementById('awakening-warning');
    const timer = document.getElementById('awakening-timer');
    const noBtn = document.getElementById('awakening-no-btn');

    box.classList.add('glitch-fx');
    warning.classList.remove('hidden');
    timer.innerText = "0.01 seconds";
    noBtn.innerText = "Yes";
    noBtn.onclick = acceptAwakening;
    noBtn.classList.add('text-glow', 'text-white');

    setTimeout(() => box.classList.remove('glitch-fx'), 600);
}

function switchAuthMode(mode) {
    SoundFX.click();
    authMode = mode;
    const tabLogin = document.getElementById('tab-auth-login');
    const tabRegister = document.getElementById('tab-auth-register');
    const usernameGroup = document.getElementById('auth-username-group');
    const submitBtn = document.getElementById('auth-submit-btn');
    const errorMsg = document.getElementById('auth-error-msg');

    errorMsg.classList.add('hidden');

    if (mode === 'login') {
        tabLogin.className = "w-1/2 py-2 text-center font-bold uppercase tracking-widest text-sm border-b-2 border-cyan-400 text-white text-glow";
        tabRegister.className = "w-1/2 py-2 text-center font-bold uppercase tracking-widest text-sm border-b-2 border-transparent text-gray-500 hover:text-cyan-200";
        usernameGroup.classList.add('hidden');
        submitBtn.innerText = "Acessar Sistema";
    } else {
        tabRegister.className = "w-1/2 py-2 text-center font-bold uppercase tracking-widest text-sm border-b-2 border-cyan-400 text-white text-glow";
        tabLogin.className = "w-1/2 py-2 text-center font-bold uppercase tracking-widest text-sm border-b-2 border-transparent text-gray-500 hover:text-cyan-200";
        usernameGroup.classList.remove('hidden');
        submitBtn.innerText = "Despertar Caçador";
    }
}

async function handleAuthSubmit(e) {
    e.preventDefault();
    SoundFX.click();
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;
    const usernameInput = document.getElementById('auth-username').value.trim();
    const submitBtn = document.getElementById('auth-submit-btn');
    const errorMsg = document.getElementById('auth-error-msg');

    errorMsg.classList.add('hidden');
    submitBtn.disabled = true;
    const oldBtnText = submitBtn.innerText;
    submitBtn.innerText = "Sincronizando...";

    try {
        if (authMode === 'register') {
            if (!usernameInput) throw new Error("Escolha um Nome de Caçador para o Ranking.");
            
            const { data, error } = await supabaseClient.auth.signUp({
                email,
                password,
                options: { data: { username: usernameInput } }
            });

            if (error) throw error;
            if (data.user && !data.session) {
                throw new Error("Conta criada! Desative 'Confirm Email' em Authentication -> Providers -> Email no Supabase.");
            }

            currentUser = data.user;
            await ensurePlayerProfile(usernameInput);
        } else {
            const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
            if (error) throw error;
            currentUser = data.user;
            await ensurePlayerProfile();
        }

        await syncAllFromSupabase(false);
        setupRealtimeSubscriptions();
        SoundFX.boot();

        const screen = document.getElementById('awakening-screen');
        const box = document.getElementById('awakening-box');
        box.classList.add('system-boot-out');
        setTimeout(() => {
            screen.classList.add('hidden');
            box.classList.remove('system-boot-out');
            showSystemNotification(`Acesso liberado. Bem-vindo, ${player.username}!`, 'success');
        }, 420);

    } catch (err) {
        SoundFX.error();
        console.error("Erro de autenticação:", err);
        errorMsg.innerText = err.message || "Falha na autenticação.";
        errorMsg.classList.remove('hidden');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = oldBtnText;
    }
}

async function handleLogout() {
    SoundFX.click();
    if (realtimeChannel) {
        supabaseClient.removeChannel(realtimeChannel);
        realtimeChannel = null;
    }
    await supabaseClient.auth.signOut();
    sessionStorage.removeItem(AWAKENING_SESSION_KEY);
    location.reload();
}

function triggerAwakeningScreenManual() {
    SoundFX.click();
    const screen = document.getElementById('awakening-screen');
    const stepInvite = document.getElementById('awakening-step-invite');
    const stepAuth = document.getElementById('awakening-step-auth');
    const warning = document.getElementById('awakening-warning');
    const timer = document.getElementById('awakening-timer');
    const noBtn = document.getElementById('awakening-no-btn');
    const headerTitle = document.getElementById('awakening-header-title');

    headerTitle.innerText = "NOTIFICATION";
    stepAuth.classList.add('hidden');
    stepInvite.classList.remove('hidden');
    warning.classList.add('hidden');
    timer.innerText = "0.02 seconds";
    noBtn.innerText = "No";
    noBtn.onclick = rejectAwakening;
    noBtn.classList.remove('text-glow', 'text-white');
    screen.classList.remove('hidden');
}

/**
 * ==========================================
 * MOTOR DE SINCRONIZAÇÃO AUTOMÁTICA & REALTIME
 * ==========================================
 */
function setupRealtimeSubscriptions() {
    if (!currentUser || realtimeChannel) return;

    try {
        realtimeChannel = supabaseClient
            .channel('system-os-realtime-sync')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'quests' }, () => {
                if (!isSandboxMode && !isSyncingSupabase && !isProcessingReset && !isRouletteSpinning) {
                    syncAllFromSupabase(true);
                }
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'players', filter: `id=eq.${currentUser.id}` }, () => {
                if (!isSandboxMode && !isSyncingSupabase && !isProcessingReset && !isRouletteSpinning) {
                    syncAllFromSupabase(true);
                }
            })
            .subscribe();
    } catch (e) {
        console.warn("Realtime fallback para polling ativo:", e);
    }
}

/**
 * ==========================================
 * GERADOR DE HÁBITOS, STREAK E TELA DE PENALIDADE
 * ==========================================
 */
function openPenaltyModalUI(detailsArray = null) {
    SoundFX.penaltyAlarm();
    const modal = document.getElementById('penalty-modal');
    const box = document.getElementById('penalty-window-box');
    const detailsEl = document.getElementById('penalty-modal-details');

    if (CONFIG_IMAGENS.fundoPenalidade) {
        // Suporta tanto img/fundo_penalidade.png quanto ./fundo_penalidade.png na raiz
        box.style.backgroundImage = `linear-gradient(180deg, rgba(10, 20, 24, 0.84) 0%, rgba(5, 10, 14, 0.92) 100%), url("${CONFIG_IMAGENS.fundoPenalidade}"), url("fundo_penalidade.png")`;
        box.style.backgroundSize = 'cover';
        box.style.backgroundPosition = 'center';
    }

    if (detailsEl && Array.isArray(detailsArray) && detailsArray.length > 0) {
        detailsEl.innerHTML = detailsArray.map(p => `<div>${p}</div>`).join('');
    }

    updatePenaltyCountdownDisplay();
    modal.classList.remove('hidden');
}

function closePenaltyModal() {
    SoundFX.click();
    document.getElementById('penalty-modal').classList.add('hidden');
}

function updatePenaltyCountdownDisplay() {
    const el = document.getElementById('penalty-live-countdown');
    if (!el) return;

    const now = new Date();
    const nextMidnight = new Date(now);
    nextMidnight.setHours(24, 0, 0, 0);
    const diff = Math.max(0, nextMidnight - now);

    const h = Math.floor(diff / (1000 * 60 * 60));
    const m = Math.floor((diff / (1000 * 60)) % 60);
    const s = Math.floor((diff / 1000) % 60);

    el.innerText = `${h} HOURS, ${m} MINUTES, ${s} SECONDS`;
}

async function generateRandomPeriodicQuests(periodType) {
    if (!currentUser && !isSandboxMode) return;
    const isDaily = periodType === 'daily';
    const pool = isDaily ? DAILY_HABITS_POOL : WEEKLY_HABITS_POOL;
    const count = isDaily ? DAILY_QUOTA : WEEKLY_QUOTA;
    const lastCodesKey = isDaily ? 'last_daily_codes' : 'last_weekly_codes';
    const maxHistory = isDaily ? MAX_DAILY_HISTORY_CODES : MAX_WEEKLY_HISTORY_CODES;
    const lastCodes = Array.isArray(resetTimestamps[lastCodesKey]) ? resetTimestamps[lastCodesKey] : [];

    let available = pool.filter(item => !lastCodes.includes(item.code));
    if (available.length < count) available = [...pool];

    for (let i = available.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [available[i], available[j]] = [available[j], available[i]];
    }

    const selected = available.slice(0, count);
    const updatedHistory = [...lastCodes, ...selected.map(s => s.code)];
    resetTimestamps[lastCodesKey] = updatedHistory.slice(-maxHistory);

    const penaltyTasks = periodicQuests[periodType].list.filter(t => t.isPenalty);

    if (isSandboxMode) {
        const simulatedTasks = selected.map((s, idx) => ({
            id: `sandbox_${periodType}_${Date.now()}_${idx}`,
            text: s.text,
            xp: rollXpForDifficulty(s.diff),
            done: false,
            dificuldade: s.diff,
            subtarefas: [],
            aprovada: true,
            isPenalty: false,
            created_at: new Date().toISOString()
        }));
        periodicQuests[periodType].list = [...penaltyTasks, ...simulatedTasks];
        periodicQuests[periodType].boxClaimed = false;
        updateBoxIcon(periodType, false);
        return;
    }

    const oldIds = periodicQuests[periodType].list
        .filter(t => !t.isPenalty)
        .map(t => t.id);

    await supabaseClient
        .from('quests')
        .delete()
        .eq('user_id', currentUser.id)
        .eq('tipo', isDaily ? 'Daily' : 'Weekly');

    if (oldIds.length > 0) {
        await supabaseClient.from('quests').delete().in('id', oldIds);
    }

    const newRows = selected.map(s => ({
        user_id: currentUser.id,
        username: player.username,
        quest: s.text,
        categoria: 'Saúde',
        tipo: isDaily ? 'Daily' : 'Weekly',
        dificuldade: s.diff,
        xp: rollXpForDifficulty(s.diff),
        concluida: false,
        aprovada: true,
        subtarefas: []
    }));

    const { data: inserted } = await supabaseClient.from('quests').insert(newRows).select();

    periodicQuests[periodType].list = [
        ...penaltyTasks,
        ...(inserted || []).map(row => mapRowToTaskObj(row))
    ];
    periodicQuests[periodType].boxClaimed = false;
    updateBoxIcon(periodType, false);
}

async function topUpPeriodicQuests(periodType) {
    if (!currentUser || isSandboxMode) return false;
    const isDaily = periodType === 'daily';
    const targetQuota = isDaily ? DAILY_QUOTA : WEEKLY_QUOTA;
    const pool = isDaily ? DAILY_HABITS_POOL : WEEKLY_HABITS_POOL;
    const lastCodesKey = isDaily ? 'last_daily_codes' : 'last_weekly_codes';
    const maxHistory = isDaily ? MAX_DAILY_HISTORY_CODES : MAX_WEEKLY_HISTORY_CODES;

    const currentNonPenalty = periodicQuests[periodType].list.filter(t => !t.isPenalty);
    if (currentNonPenalty.length >= targetQuota) return false;

    const missingCount = targetQuota - currentNonPenalty.length;
    const existingTexts = currentNonPenalty.map(t => normalizeStr(t.text));
    const lastCodes = Array.isArray(resetTimestamps[lastCodesKey]) ? resetTimestamps[lastCodesKey] : [];

    let available = pool.filter(item => 
        !existingTexts.includes(normalizeStr(item.text)) && !lastCodes.includes(item.code)
    );
    if (available.length < missingCount) {
        available = pool.filter(item => !existingTexts.includes(normalizeStr(item.text)));
    }

    for (let i = available.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [available[i], available[j]] = [available[j], available[i]];
    }

    const selected = available.slice(0, missingCount);
    if (selected.length === 0) return false;

    const updatedHistory = [...new Set([...lastCodes, ...selected.map(s => s.code)])];
    resetTimestamps[lastCodesKey] = updatedHistory.slice(-maxHistory);

    const newRows = selected.map(s => ({
        user_id: currentUser.id,
        username: player.username,
        quest: s.text,
        categoria: 'Saúde',
        tipo: isDaily ? 'Daily' : 'Weekly',
        dificuldade: s.diff,
        xp: rollXpForDifficulty(s.diff),
        concluida: false,
        aprovada: true,
        subtarefas: []
    }));

    const { data: inserted } = await supabaseClient.from('quests').insert(newRows).select();
    if (inserted && inserted.length > 0) {
        inserted.forEach(row => periodicQuests[periodType].list.push(mapRowToTaskObj(row)));
        periodicQuests[periodType].boxClaimed = false;
        updateBoxIcon(periodType, false);
        return true;
    }
    return false;
}

async function applyDailyPenalty() {
    if (!currentUser && !isSandboxMode) return;
    const penaltiesApplied = [];

    if (player.streak > 0) {
        penaltiesApplied.push(`• Ofensiva Quebrada: Sua sequência de 🔥 ${player.streak} dias foi zerada!`);
    }
    player.streak = 0;
    resetTimestamps.streak_count = 0;

    const xpLoss = Math.floor(player.xp * 0.35);
    if (player.xp > 0 && xpLoss > 0) {
        player.xp = Math.max(0, player.xp - xpLoss);
        penaltiesApplied.push(`• Dreno de Energia por Falha Diária: -${xpLoss} EXP (-35%)`);
    } else if (player.level > 1) {
        player.level--;
        player.xp = 0;
        penaltiesApplied.push(`• Regressão Dimensional: Caiu para o Level ${player.level}!`);
    } else {
        player.xp = 0;
        penaltiesApplied.push(`• EXP reduzido a 0.`);
    }

    const existingPenaltyTexts = periodicQuests.daily.list
        .filter(t => t.isPenalty && !t.done)
        .map(t => normalizeStr(t.text));

    let availablePenalties = PENALTY_QUESTS_POOL.filter(p => !existingPenaltyTexts.includes(normalizeStr(p)));
    if (availablePenalties.length === 0) availablePenalties = [...PENALTY_QUESTS_POOL];

    const penaltyText = availablePenalties[Math.floor(Math.random() * availablePenalties.length)];

    if (isSandboxMode) {
        periodicQuests.daily.list.unshift({
            id: `sandbox_pen_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            text: penaltyText,
            xp: 15,
            done: false,
            dificuldade: 'Difícil',
            subtarefas: [],
            aprovada: true,
            isPenalty: true,
            created_at: new Date().toISOString()
        });
    } else {
        const { data: penRow } = await supabaseClient.from('quests').insert([{
            user_id: currentUser.id,
            username: player.username,
            quest: penaltyText,
            categoria: 'Saúde',
            tipo: 'Penalty',
            dificuldade: 'Difícil',
            xp: 15,
            concluida: false,
            aprovada: true,
            subtarefas: []
        }]).select().single();

        if (penRow) {
            periodicQuests.daily.list.unshift(mapRowToTaskObj(penRow));
        }
    }

    syncLockedCategoriesWithActivePenalties();
    const lockedNames = getLockedCategoriesTitlesText();

    penaltiesApplied.push(`• Categorias Bloqueadas (${getLockedCategoriesArray().length}): [${lockedNames}] 🔒`);
    penaltiesApplied.push(`• Daily Quests Bloqueadas: Cumpra a punição antes de liberar as Dailies do dia!`);
    penaltiesApplied.push(`• Nova Penalidade: "${penaltyText}"`);

    hasShownPenaltyModalThisSession = true;
    openPenaltyModalUI(penaltiesApplied);
}

/**
 * ==========================================
 * BANCO DE DADOS SUPABASE (PLAYERS & QUESTS)
 * ==========================================
 */
function getBoxesClaimedObject() {
    const boxes = {
        daily: periodicQuests.daily.boxClaimed,
        weekly: periodicQuests.weekly.boxClaimed,
        monthly: periodicQuests.monthly.boxClaimed,
        yearly: periodicQuests.yearly.boxClaimed
    };
    Object.keys(categories).forEach(k => {
        if (!categories[k].isSystem) boxes[k] = categories[k].boxClaimed;
    });
    return boxes;
}

function applyBoxesClaimedObject(boxes) {
    if (!boxes || typeof boxes !== 'object') return;
    ['daily', 'weekly', 'monthly', 'yearly'].forEach(t => {
        if (boxes[t] !== undefined) periodicQuests[t].boxClaimed = Boolean(boxes[t]);
    });
    Object.keys(categories).forEach(k => {
        if (!categories[k].isSystem && boxes[k] !== undefined) {
            categories[k].boxClaimed = Boolean(boxes[k]);
        }
    });
}

function mapRowToTaskObj(row) {
    const normTipo = normalizeStr(row.tipo);
    const isDailyOrWeekly = normTipo.includes('daily') || normTipo.includes('diaria') || normTipo.includes('weekly') || normTipo.includes('semanal') || normTipo.includes('penalty');
    return {
        id: row.id,
        text: String(row.quest).trim(),
        xp: row.xp ?? 15,
        done: Boolean(row.concluida),
        dificuldade: row.dificuldade || 'Fácil',
        subtarefas: Array.isArray(row.subtarefas) ? row.subtarefas : [],
        aprovada: isDailyOrWeekly ? true : (row.aprovada !== undefined ? Boolean(row.aprovada) : true),
        isPenalty: normTipo.includes('penalty') || String(row.quest).includes('[PENALIDADE]'),
        created_at: row.created_at || null
    };
}

async function ensurePlayerProfile(preferredUsername = null) {
    if (!currentUser || isSandboxMode) return null;

    const { data: existing } = await supabaseClient
        .from('players')
        .select('*')
        .eq('id', currentUser.id)
        .maybeSingle();

    if (existing) return existing;

    const finalUsername = preferredUsername 
        || currentUser.user_metadata?.username 
        || currentUser.email?.split('@')[0] 
        || 'Caçador';

    const newProfile = {
        id: currentUser.id,
        username: finalUsername,
        level: 1,
        xp: 0,
        max_xp: 200,
        power: 0,
        rank: 'E',
        player_class: 'Nenhuma',
        streak: 0,
        equipment: player.equipment,
        category_tallies: categoryTallies,
        reset_timestamps: resetTimestamps,
        boxes_claimed: getBoxesClaimedObject()
    };

    const { data: inserted } = await supabaseClient
        .from('players')
        .insert([newProfile])
        .select()
        .single();

    return inserted || newProfile;
}

async function syncAllFromSupabase(isSilent = false) {
    if (isSandboxMode) {
        setSyncStatus('sandbox');
        return;
    }
    if (!currentUser || isSyncingSupabase || isProcessingReset || isRouletteSpinning) return;
    isSyncingSupabase = true;
    lastAutoSyncTime = Date.now();
    if (!isSilent) setSyncStatus('syncing');

    try {
        const profile = await ensurePlayerProfile();
        if (profile) {
            player.username = profile.username || 'Caçador';
            player.level = profile.level ?? 1;
            player.xp = profile.xp ?? 0;
            player.maxXp = profile.max_xp ?? 200;
            player.power = profile.power ?? 0;
            player.rank = profile.rank || 'E';
            player.playerClass = profile.player_class || 'Nenhuma';
            player.isAdmin = Boolean(profile.is_admin);
            player.equipment = profile.equipment || { capacete: null, peitoral: null, botas: null, capa: null, arma_principal: null, arma_secundaria: null };

            if (profile.category_tallies) categoryTallies = { ...categoryTallies, ...profile.category_tallies };
            if (profile.reset_timestamps && Object.keys(profile.reset_timestamps).length > 0) {
                resetTimestamps = { ...resetTimestamps, ...profile.reset_timestamps };
            }
            if (profile.boxes_claimed) applyBoxesClaimedObject(profile.boxes_claimed);

            player.streak = profile.streak ?? resetTimestamps.streak_count ?? 0;
        }

        const { data: questsData, error: questsErr } = await supabaseClient
            .from('quests')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: true });

        if (questsErr) throw questsErr;

        Object.keys(categories).forEach(k => { if (!categories[k].isSystem) categories[k].tasks = []; });
        Object.keys(periodicQuests).forEach(k => { periodicQuests[k].list = []; });

        (questsData || []).forEach(row => {
            if (!row.quest || !String(row.quest).trim()) return;
            const taskObj = mapRowToTaskObj(row);
            const normTipo = normalizeStr(row.tipo);

            if (normTipo.includes('daily') || normTipo.includes('diaria') || taskObj.isPenalty) {
                periodicQuests.daily.list.push(taskObj);
            } else if (normTipo.includes('weekly') || normTipo.includes('semanal')) {
                periodicQuests.weekly.list.push(taskObj);
            } else if (normTipo.includes('monthly') || normTipo.includes('mensal')) {
                periodicQuests.monthly.list.push(taskObj);
            } else if (normTipo.includes('yearly') || normTipo.includes('anual')) {
                periodicQuests.yearly.list.push(taskObj);
            } else {
                const matchedCatId = matchCategoryKey(row.categoria);
                categories[matchedCatId].tasks.push(taskObj);
            }
        });

        await checkPeriodicResets(new Date());

        const todayStr = new Date().toDateString();
        const currentNonPenDailies = periodicQuests.daily.list.filter(t => !t.isPenalty);
        const todayDailies = currentNonPenDailies.filter(t => t.created_at && new Date(t.created_at).toDateString() === todayStr);

        if (todayDailies.length >= DAILY_QUOTA && currentNonPenDailies.length > DAILY_QUOTA) {
            const sortedToday = [...todayDailies].sort((a, b) => Number(b.done) - Number(a.done));
            const keepIds = new Set(sortedToday.slice(0, DAILY_QUOTA).map(t => t.id));
            const extraIds = currentNonPenDailies.filter(t => !keepIds.has(t.id)).map(t => t.id);
            if (extraIds.length > 0) {
                await supabaseClient.from('quests').delete().in('id', extraIds);
                periodicQuests.daily.list = periodicQuests.daily.list.filter(t => t.isPenalty || keepIds.has(t.id));
            }
        }

        let needsSave = false;
        if (await topUpPeriodicQuests('daily')) needsSave = true;
        if (await topUpPeriodicQuests('weekly')) needsSave = true;

        if (syncLockedCategoriesWithActivePenalties()) {
            needsSave = true;
        }

        const nonPenDailies = periodicQuests.daily.list.filter(t => !t.isPenalty);
        if (nonPenDailies.length >= DAILY_QUOTA && periodicQuests.daily.list.every(t => t.done) && resetTimestamps.last_streak_date !== todayStr) {
            player.streak = Math.max(1, (player.streak || 0) + 1);
            resetTimestamps.last_streak_date = todayStr;
            resetTimestamps.streak_count = player.streak;
            needsSave = true;
        }

        if (needsSave) await savePlayerToSupabase();

        hasInitialSyncCompleted = true;

        const activePenCount = getActivePenaltyQuestsCount();
        if (activePenCount > 0 && !hasShownPenaltyModalThisSession) {
            hasShownPenaltyModalThisSession = true;
            openPenaltyModalUI([
                `• Você possui ${activePenCount} missão(ões) de [PENALIDADE] ativa(s)!`,
                `• Categorias Bloqueadas (${getLockedCategoriesArray().length}): [${getLockedCategoriesTitlesText()}] 🔒`,
                `• Suas Daily Quests estão bloqueadas até que você cumpra todas as punições pendentes.`
            ]);
        } else if (activePenCount === 0) {
            hasShownPenaltyModalThisSession = false;
        }

        updatePlayerUI();
        recalcPower();
        renderTabs();

        const isTypingInAdmin = isSilent && activeCategoryId === 'admin' && document.getElementById('admin-task-name');
        if (isTypingInAdmin) {
            if (player.isAdmin) loadMasterPendingQueue();
        } else {
            renderCategory(activeCategoryId);
        }

        renderPeriodicQuests();
        setSyncStatus('online');
    } catch (err) {
        console.error("Erro ao sincronizar:", err);
        setSyncStatus('offline');
    } finally {
        isSyncingSupabase = false;
    }
}

async function savePlayerToSupabase() {
    let totalPower = 0;
    Object.values(player.equipment).forEach(eq => { if (eq) totalPower += eq.power; });
    player.power = totalPower;
    resetTimestamps.streak_count = player.streak;

    if (isSandboxMode) {
        console.info('%c[SANDBOX OFF-DB] Alteração simulada localmente (não enviada ao Supabase).', 'color:#c084fc;font-weight:bold;');
        setSyncStatus('sandbox');
        return;
    }

    if (!currentUser) return;
    setSyncStatus('syncing');

    try {
        const updatePayload = {
            username: player.username,
            level: player.level,
            xp: Math.floor(player.xp),
            max_xp: player.maxXp,
            power: totalPower,
            rank: player.rank,
            player_class: player.playerClass,
            streak: player.streak,
            equipment: player.equipment,
            category_tallies: categoryTallies,
            reset_timestamps: resetTimestamps,
            boxes_claimed: getBoxesClaimedObject(),
            updated_at: new Date().toISOString()
        };

        const { error } = await supabaseClient
            .from('players')
            .update(updatePayload)
            .eq('id', currentUser.id);

        if (error) {
            delete updatePayload.streak;
            await supabaseClient.from('players').update(updatePayload).eq('id', currentUser.id);
        }
        setSyncStatus('online');
    } catch (err) {
        console.error("Falha ao salvar perfil:", err);
        setSyncStatus('offline');
    }
}

async function criarMissaoNoSupabase(text, categoriaTitle, tipoTitle, dificuldade, subtarefas, aprovada) {
    const rolledXp = rollXpForDifficulty(dificuldade);

    if (isSandboxMode) {
        console.info('%c[SANDBOX OFF-DB] Missão criada apenas na memória local.', 'color:#c084fc;font-weight:bold;');
        return {
            id: `sandbox_quest_${Date.now()}`,
            quest: text,
            categoria: categoriaTitle,
            tipo: tipoTitle,
            dificuldade: dificuldade,
            subtarefas: subtarefas,
            xp: rolledXp,
            concluida: false,
            aprovada: true,
            created_at: new Date().toISOString()
        };
    }

    if (!currentUser) return null;
    setSyncStatus('syncing');

    try {
        const payload = {
            user_id: currentUser.id,
            username: player.username,
            quest: text,
            categoria: categoriaTitle,
            tipo: tipoTitle,
            dificuldade: dificuldade,
            subtarefas: subtarefas,
            xp: rolledXp,
            concluida: false,
            aprovada: aprovada
        };

        const { data, error } = await supabaseClient
            .from('quests')
            .insert([payload])
            .select()
            .single();

        if (error) throw error;
        setSyncStatus('online');
        return data;
    } catch (err) {
        console.error("Erro ao criar missão:", err);
        setSyncStatus('offline');
        return null;
    }
}

async function atualizarMissaoNoSupabase(taskId, updates) {
    if (isSandboxMode || !currentUser) return;
    try {
        await supabaseClient
            .from('quests')
            .update(updates)
            .eq('id', taskId);
    } catch (err) {
        console.warn("Erro ao atualizar missão:", err);
    }
}

async function deletarMissao(taskId, listType, categoryId = null) {
    if (!currentUser && !isSandboxMode) return;
    SoundFX.click();

    if (listType === 'category' && categories[categoryId]) {
        categories[categoryId].tasks = categories[categoryId].tasks.filter(t => t.id !== taskId);
        renderCategory(activeCategoryId);
    } else if (periodicQuests[listType]) {
        periodicQuests[listType].list = periodicQuests[listType].list.filter(t => t.id !== taskId);
        syncLockedCategoriesWithActivePenalties();
        renderPeriodicQuests();
    }
    renderTabs();

    if (isSandboxMode) {
        showSystemNotification('🧪 [SANDBOX] Missão removida localmente.', 'success');
        return;
    }

    setSyncStatus('syncing');
    try {
        await supabaseClient.from('quests').delete().eq('id', taskId);
        await savePlayerToSupabase();
        setSyncStatus('online');
        showSystemNotification('Missão removida.', 'success');
    } catch (err) {
        setSyncStatus('offline');
    }
}

/**
 * ==========================================
 * NOTIFICAÇÕES E UTILITÁRIOS
 * ==========================================
 */
function showSystemNotification(message, type = 'success') {
    const container = document.getElementById('system-notification-container');
    if (!container) return;

    if (type === 'success') SoundFX.notifyPing();
    
    const toast = document.createElement('div');
    const isSuccess = type === 'success';
    const borderColor = isSuccess ? 'border-cyan-400' : 'border-red-500';
    const textColor = isSuccess ? 'text-cyan-400' : 'text-red-400';
    const shadowColor = isSuccess ? 'rgba(0,212,255,0.3)' : 'rgba(239,68,68,0.3)';
    const title = isSuccess ? '[ ALERTA DO SISTEMA ]' : '[ ERRO DO SISTEMA ]';
    
    toast.className = `p-4 border border-t-0 border-r-0 border-b-0 border-l-4 ${borderColor} bg-gray-900 bg-opacity-95 rounded-r shadow-[0_0_15px_${shadowColor}] toast-enter relative pointer-events-auto backdrop-blur-md`;
    toast.innerHTML = `
        <div class="text-xs font-bold ${textColor} mb-1 tracking-widest uppercase blink">${title}</div>
        <div class="text-sm text-gray-200">${message}</div>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.remove('toast-enter');
        toast.classList.add('toast-exit');
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

function setSyncStatus(status) {
    const led = document.getElementById('sync-led');
    const text = document.getElementById('sync-text');
    if (!led || !text) return;

    if (isSandboxMode || status === 'sandbox') {
        led.className = 'w-2.5 h-2.5 rounded-full bg-purple-400 animate-pulse shadow-[0_0_10px_#c084fc]';
        text.innerText = '🧪 SANDBOX (OFF-DB)';
        text.className = 'text-purple-300 font-mono font-bold';
        return;
    }

    if (status === 'syncing') {
        led.className = 'w-2.5 h-2.5 rounded-full bg-yellow-400 animate-ping';
        text.innerText = 'Sincronizando...';
        text.className = 'text-yellow-400 font-mono hidden sm:inline';
    } else if (status === 'online') {
        led.className = 'w-2.5 h-2.5 rounded-full bg-green-400 shadow-[0_0_8px_#4ade80]';
        text.innerText = 'Online';
        text.className = 'text-green-400 font-mono hidden sm:inline';
    } else {
        led.className = 'w-2.5 h-2.5 rounded-full bg-red-500';
        text.innerText = 'Offline';
        text.className = 'text-red-400 font-mono hidden sm:inline';
    }
}

function normalizeStr(str) {
    return (str || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

function matchCategoryKey(rawCategoryName) {
    const normCat = normalizeStr(rawCategoryName);
    if (!normCat) return 'saude';
    if (normCat.includes('saude')) return 'saude';
    if (normCat.includes('estud')) return 'estudo';
    if (normCat.includes('trabalh') || normCat.includes('pdi')) return 'trabalho';
    if (normCat.includes('casa') || normCat.includes('mobilia')) return 'casa';
    if (normCat.includes('roupa')) return 'roupa';
    if (normCat.includes('lazer')) return 'lazer';
    if (normCat.includes('vicio')) return 'vicio';
    if (normCat.includes('familia')) return 'familia';
    if (normCat.includes('amigo')) return 'amigos';
    if (normCat.includes('financ')) return 'financeiro';

    return Object.keys(categories).find(k => 
        !categories[k].isSystem && normalizeStr(categories[k].title) === normCat
    ) || 'saude';
}

function goToRequestQuest() {
    SoundFX.click();
    if (!categories[activeCategoryId]?.isSystem) {
        preselectedCategoryForRequest = `cat_${activeCategoryId}`;
    }
    activeCategoryId = 'admin';
    renderTabs();
    renderCategory('admin');
}

function jumpToCategory(catKey) {
    SoundFX.click();
    activeCategoryId = catKey;
    renderTabs();
    renderCategory(catKey);
}

/**
 * ==========================================
 * SISTEMA DE LOOT & ROLETA CS:GO (COM SOM FÍSICO & TIER VISUAL)
 * ==========================================
 */
const equipSlots = ['capacete', 'peitoral', 'botas', 'capa', 'arma_principal', 'arma_secundaria'];
const slotIcons = { 'capacete': '🪖', 'peitoral': '🥋', 'botas': '👢', 'capa': '🦹', 'arma_principal': '⚔️', 'arma_secundaria': '🛡️' };

const rarities = [
    { id: 'comum', name: 'Comum', basePower: 10, isGod: false, colorClass: 'text-gray-400', borderClass: 'border-gray-500', hex: '#9ca3af' },
    { id: 'incomum', name: 'Incomum', basePower: 50, isGod: false, colorClass: 'text-green-400', borderClass: 'border-green-500', hex: '#4ade80' },
    { id: 'raro', name: 'Raro', basePower: 150, isGod: false, colorClass: 'text-blue-400', borderClass: 'border-blue-500', hex: '#60a5fa' },
    { id: 'epico', name: 'Épico', basePower: 400, isGod: false, colorClass: 'text-purple-400', borderClass: 'border-purple-500', hex: '#c084fc' },
    { id: 'lendario', name: 'Lendário', basePower: 1000, isGod: false, colorClass: 'text-yellow-400', borderClass: 'border-yellow-500', hex: '#facc15' },
    { id: 'mitico', name: 'Mítico', basePower: 2500, isGod: false, colorClass: 'text-red-500', borderClass: 'border-red-600', hex: '#ef4444' },
    { id: 'exotico', name: 'Exótico', basePower: 5000, isGod: false, colorClass: 'text-pink-400', borderClass: 'border-pink-500', hex: '#f472b6' },
    { id: 'divino', name: 'Divino', basePower: 20000, isGod: true, colorClass: 'text-glow-god', borderClass: 'border-white', hex: '#ffffff' },
    { id: 'hack', name: 'Hack', basePower: 50000, isGod: true, colorClass: 'text-green-300 glitch-fx', borderClass: 'border-green-400 border-dashed', hex: '#86efac' },
    { id: 'break', name: 'Break System', basePower: 99999, isGod: true, colorClass: 'text-red-600 glitch-fx font-black', borderClass: 'border-red-600 border-double', hex: '#dc2626' }
];

const dropWeights = {
    'daily':    [7500, 2000, 400, 80,  15,  4,   1,   0.5, 0.3, 0.1],
    'weekly':   [4000, 3500, 1500, 700, 200, 70,  20,  5,   3,   2],
    'monthly':  [1000, 3000, 3000, 1800, 800, 300, 80,  15,  10,  5],
    'yearly':   [0,    500,  2000, 3500, 2500, 1000, 400, 100, 50, 20],
    'category': [5000, 3000, 1200, 500, 150, 40,  10,  3,   1,   0.5] 
};

let currentLootItem = null;
let currentLootBoxType = 'daily';
let isRouletteSpinning = false;

function checkLootboxTriggers(completedListType, completedCategoryId = null) {
    if (['daily', 'weekly', 'monthly', 'yearly'].includes(completedListType)) {
        const group = periodicQuests[completedListType];
        if (!group) return;

        const nonPenaltyApproved = group.list.filter(t => t.aprovada && !t.isPenalty);
        const allTasksInGroup = group.list.filter(t => t.aprovada);

        const minRequired = completedListType === 'daily'
            ? DAILY_QUOTA
            : completedListType === 'weekly'
                ? WEEKLY_QUOTA
                : CATEGORY_MIN_QUOTA;

        if (nonPenaltyApproved.length >= minRequired && allTasksInGroup.every(t => t.done)) {
            if (completedListType === 'daily') {
                const todayStr = new Date().toDateString();
                if (resetTimestamps.last_streak_date !== todayStr) {
                    player.streak = (player.streak || 0) + 1;
                    resetTimestamps.last_streak_date = todayStr;
                    resetTimestamps.streak_count = player.streak;
                    SoundFX.streakUp();
                    showSystemNotification(`🔥 Ofensiva Diária aumentou para ${player.streak} dias seguidos!`, 'success');
                }
            }

            if (!group.boxClaimed) {
                group.boxClaimed = true;
                updateBoxIcon(completedListType, true);
                initiateLootbox(completedListType);
            }
        }
        return;
    }

    if (completedListType === 'category' && completedCategoryId && categories[completedCategoryId]) {
        const cat = categories[completedCategoryId];
        if (cat.isSystem || cat.boxClaimed) return;

        const approvedTasks = cat.tasks.filter(t => t.aprovada);
        if (approvedTasks.length >= CATEGORY_MIN_QUOTA && approvedTasks.every(t => t.done)) {
            cat.boxClaimed = true;
            initiateLootbox('category', cat.title);
        }
    }
}

function initiateLootbox(boxType, customName = null, forcedRarityId = null, forcedSlot = null, forcedTier = null) {
    const modal = document.getElementById('lootbox-modal');
    const phase1 = document.getElementById('lootbox-phase-1');
    const phaseRoulette = document.getElementById('lootbox-phase-roulette');
    const phase2 = document.getElementById('lootbox-phase-2');
    const title = document.getElementById('lootbox-title');
    
    try {
        currentLootBoxType = boxType;
        currentLootItem = generateLoot(boxType, forcedRarityId, forcedSlot, forcedTier);
        isRouletteSpinning = false;
        
        const boxName = customName ? `${customName} Box` : `${boxType.toUpperCase()} Box`;
        title.innerText = `${boxName} Obtida!`;
        
        phase1.classList.remove('hidden');
        phaseRoulette.classList.add('hidden');
        phase2.classList.add('hidden');
        modal.classList.remove('hidden');
    } catch (error) {
        console.error("Erro no sistema de loot:", error);
    }
}

function openLootbox() {
    if (isRouletteSpinning) return;
    isRouletteSpinning = true;
    SoundFX.boot();

    const phase1 = document.getElementById('lootbox-phase-1');
    const phaseRoulette = document.getElementById('lootbox-phase-roulette');
    const track = document.getElementById('roulette-track');
    const viewport = document.getElementById('roulette-viewport');

    phase1.classList.add('hidden');
    phaseRoulette.classList.remove('hidden');

    const WINNING_INDEX = 38;
    const TOTAL_CARDS = 45;
    track.innerHTML = '';
    track.style.transition = 'none';
    track.style.transform = 'translateX(0px)';

    for (let i = 0; i < TOTAL_CARDS; i++) {
        const item = (i === WINNING_INDEX) ? currentLootItem : generateLoot(currentLootBoxType);
        const card = document.createElement('div');
        const isMasterpiece = item.rarity.isGod || item.tier === 1;
        card.className = `roulette-card item-tier-surface border-2 ${item.rarity.borderClass} ${isMasterpiece ? 'tier-masterpiece-frame' : ''}`;
        card.style.cssText = getSlotSurfaceInlineStyle(item);
        card.innerHTML = `
            <div class="w-full flex flex-col items-center justify-center pt-1 relative">
                ${renderEquipmentVisualHTML(item, 'roulette')}
            </div>
            <div class="w-full text-center relative z-10">
                <div class="text-[10px] font-bold uppercase ${item.rarity.colorClass} truncate w-full">${item.rarity.name}</div>
                <div class="text-[9px] text-gray-400 uppercase truncate w-full">${item.slotName}</div>
            </div>
        `;
        track.appendChild(card);
    }

    void track.offsetWidth;

    const cardWidth = 112;
    const gap = 8;
    const step = cardWidth + gap;
    const viewportWidth = viewport.clientWidth || 600;
    const jitter = Math.floor(Math.random() * 50) - 25;
    const targetOffset = (WINNING_INDEX * step) + (cardWidth / 2) - (viewportWidth / 2) + jitter;

    track.style.transition = 'transform 5.2s cubic-bezier(0.08, 0.82, 0.17, 1)';
    track.style.transform = `translateX(-${targetOffset}px)`;

    let lastCardIndexUnderLaser = -1;
    const spinStartTime = performance.now();

    function monitorRouletteTicks(now) {
        if (!isRouletteSpinning) return;
        const style = window.getComputedStyle(track);
        const matrix = new DOMMatrixReadOnly(style.transform);
        const currentTranslateX = Math.abs(matrix.m41);
        const laserPositionInTrack = currentTranslateX + (viewportWidth / 2);
        const currentCardIndex = Math.floor(laserPositionInTrack / step);

        if (currentCardIndex !== lastCardIndexUnderLaser && currentCardIndex >= 0) {
            lastCardIndexUnderLaser = currentCardIndex;
            SoundFX.rouletteTick();
        }

        if (now - spinStartTime < 5250) {
            requestAnimationFrame(monitorRouletteTicks);
        }
    }
    requestAnimationFrame(monitorRouletteTicks);

    setTimeout(() => {
        revealFinalLootItem();
    }, 5450);
}

function revealFinalLootItem() {
    const phaseRoulette = document.getElementById('lootbox-phase-roulette');
    const phase2 = document.getElementById('lootbox-phase-2');
    const normalContent = document.getElementById('loot-content-normal');
    const errorContent = document.getElementById('loot-content-error');

    phaseRoulette.classList.add('hidden');
    phase2.classList.remove('hidden');

    try {
        const item = currentLootItem;
        if (!item) throw new Error("Item inexistente.");

        SoundFX.lootReveal(Boolean(item.rarity?.isGod));
        
        normalContent.classList.remove('hidden');
        errorContent.classList.add('hidden');

        const iconEl = document.getElementById('loot-icon');
        const rarityEl = document.getElementById('loot-rarity-label');
        const nameEl = document.getElementById('loot-name');
        const statsEl = document.getElementById('loot-stats');
        const actionMsg = document.getElementById('loot-action-msg');
        
        iconEl.className = `w-36 h-36 rounded-lg border-2 ${item.rarity.borderClass} item-tier-surface flex flex-col items-center justify-center mb-4 loot-reveal relative overflow-hidden`;
        iconEl.style.cssText = getSlotSurfaceInlineStyle(item);
        iconEl.innerHTML = renderEquipmentVisualHTML(item, 'modal');

        const roman = getTierRomanLabel(item);
        rarityEl.innerText = item.rarity.isGod ? `${item.rarity.name} [GOD TIER]` : `${item.rarity.name} • Tier ${roman} (T${item.tier})`;
        rarityEl.className = `text-xs uppercase tracking-widest font-bold mb-1 ${item.rarity.colorClass}`;
        
        const tierText = item.rarity.isGod ? "" : ` [${roman}]`;
        nameEl.innerText = `${item.rarity.name} ${item.slotName}${tierText}`;
        nameEl.className = `text-2xl md:text-3xl font-bold uppercase tracking-wider mb-2 loot-reveal ${item.rarity.colorClass}`;
        statsEl.innerText = `Power: +${item.power.toLocaleString()}`;
        
        phase2.className = `sys-modal p-8 rounded-lg text-center flex flex-col items-center max-w-md w-full border-4 ${item.rarity.borderClass}`;

        const currentEquip = player.equipment[item.slot];
        if (!currentEquip || item.power > currentEquip.power) {
            player.equipment[item.slot] = item;
            SoundFX.equip();
            actionMsg.innerText = currentEquip ? `Substituiu [${currentEquip.name}]` : "Novo Item Equipado!";
            actionMsg.className = "p-2 w-full text-sm font-bold bg-green-900 bg-opacity-50 border border-green-500 text-green-300 rounded mb-6";
            renderInventory();
            recalcPower();
        } else {
            const bonusXp = Math.max(10, Math.min(45, Math.floor(item.power * 0.15)));
            actionMsg.innerText = `Inferior ao atual (Convertido em +${bonusXp} XP)`;
            actionMsg.className = "p-2 w-full text-sm font-bold bg-gray-900 bg-opacity-50 border border-gray-600 text-gray-400 rounded mb-6";
            player.xp += bonusXp;
            updatePlayerUI();
        }
        savePlayerToSupabase();
    } catch (error) {
        normalContent.classList.add('hidden');
        errorContent.classList.remove('hidden');
        phase2.className = `sys-modal p-8 rounded-lg text-center flex flex-col items-center max-w-md w-full border-4 border-red-600 glitch-fx`;
    }
}

function closeLootbox() {
    SoundFX.click();
    isRouletteSpinning = false;
    document.getElementById('lootbox-modal').classList.add('hidden');
    if (player.xp >= player.maxXp) processLevelUp();
}

function generateLoot(boxType, forcedRarityId = null, forcedSlot = null, forcedTier = null) {
    let rarity = null;
    if (forcedRarityId) {
        rarity = rarities.find(r => r.id === normalizeStr(forcedRarityId)) || null;
    }

    if (!rarity) {
        const weights = dropWeights[boxType] || dropWeights['daily'];
        const totalWeight = weights.reduce((a, b) => a + b, 0);
        let rand = Math.random() * totalWeight;
        let rarityIndex = 0;
        for (let i = 0; i < weights.length; i++) {
            if (rand < weights[i]) { rarityIndex = i; break; }
            rand -= weights[i];
        }
        rarity = rarities[rarityIndex];
    }

    const slot = (forcedSlot && equipSlots.includes(forcedSlot))
        ? forcedSlot
        : equipSlots[Math.floor(Math.random() * equipSlots.length)];
    
    let tier = null;
    let power = rarity.basePower;
    
    if (!rarity.isGod) {
        if (forcedTier && forcedTier >= 1 && forcedTier <= 11) {
            tier = parseInt(forcedTier, 10);
        } else {
            const tierRand = Math.random();
            tier = Math.floor(Math.pow(tierRand, 2) * 11) + 1;
        }
        power += (13 - tier) * Math.floor(rarity.basePower * 0.1);
    } else {
        power += Math.floor(Math.random() * (rarity.basePower * 0.5));
    }

    const itemObj = {
        id: 'eq_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        slot: slot,
        slotName: slot.replace('_', ' '),
        rarity: rarity,
        tier: tier,
        power: power,
        name: rarity.isGod ? rarity.name : `${rarity.name} ${slot.replace('_', ' ')}`,
        imageUrl: null
    };
    itemObj.imageUrl = resolveEquipmentImageUrl(itemObj) || null;
    return itemObj;
}

function recalcPower() {
    let total = 0;
    Object.values(player.equipment).forEach(eq => { if (eq) total += eq.power; });
    player.power = total;
    document.getElementById('player-power').innerText = total.toLocaleString();
}

function updateBoxIcon(type, isClaimed) {
    const el = document.getElementById(`${type}-box-status`);
    if (el) {
        if (isClaimed) {
            el.classList.remove('opacity-50'); el.classList.add('text-glow', 'text-xl'); el.innerText = '✨📦✨';
        } else {
            el.classList.add('opacity-50'); el.classList.remove('text-glow', 'text-xl'); el.innerText = '🎁';
        }
    }
}

/**
 * ==========================================
 * UI RENDERING & LOGIC (COM EVOLUÇÃO DE STREAK)
 * ==========================================
 */
const DOM = {
    level: document.getElementById('player-level'),
    nameDisplay: document.getElementById('player-name-display'),
    architectBadge: document.getElementById('architect-badge'),
    streakBadge: document.getElementById('streak-badge'),
    streakText: document.getElementById('player-streak'),
    rank: document.getElementById('player-rank'),
    xpBar: document.getElementById('xp-bar'),
    xpText: document.getElementById('xp-text'),
    tabs: document.getElementById('category-tabs'),
    catTitle: document.getElementById('active-category-title'),
    catBadge: document.getElementById('category-badge'),
    catList: document.getElementById('category-task-list'),
    modal: document.getElementById('level-up-alert'),
    inventoryContainer: document.getElementById('inventory-container'),
    headerRequestBtn: document.getElementById('header-request-btn')
};

function init() {
    updateSoundButtonUI();
    renderTabs();
    renderCategory(activeCategoryId);
    renderPeriodicQuests();
    updatePlayerUI();
    recalcPower();
    startTimers();
    checkInitialAuthAndAwakening();
}

function updateStreakVisualBadge() {
    const s = player.streak || 0;
    const badge = document.getElementById('streak-badge');
    if (!badge) return;

    const milestones = [7, 14, 30, 60, 100, 365];
    const nextGoal = milestones.find(m => m > s) || (s + 30);

    let flameIcon = '🔥';
    let tierName = 'Chama Inicial';
    let styleClasses = 'bg-orange-950/60 border-orange-500/60 text-orange-300 shadow-[0_0_10px_rgba(249,115,22,0.25)]';

    if (s >= 30) {
        flameIcon = '👑';
        tierName = 'Chama do Monarca';
        styleClasses = 'bg-purple-950/80 border-purple-400 text-purple-200 shadow-[0_0_15px_rgba(192,132,252,0.5)]';
    } else if (s >= 14) {
        flameIcon = '💜';
        tierName = 'Chama das Sombras';
        styleClasses = 'bg-indigo-950/80 border-indigo-400 text-indigo-200 shadow-[0_0_12px_rgba(129,140,248,0.4)]';
    } else if (s >= 7) {
        flameIcon = '⚡';
        tierName = 'Chama Azul Desperta';
        styleClasses = 'bg-cyan-950/80 border-cyan-400 text-cyan-200 shadow-[0_0_12px_rgba(0,212,255,0.4)]';
    }

    badge.className = `flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs font-bold transition-all ${styleClasses}`;
    badge.title = `Ofensiva Diária (${tierName}): ${s} dias seguidos | Próxima Meta: ${nextGoal} dias`;
    badge.innerHTML = `
        <span class="text-sm">${flameIcon}</span>
        <span id="player-streak">${s}</span>
        <span class="text-[10px] uppercase tracking-wider opacity-85 hidden sm:inline">/ ${nextGoal}d</span>
    `;
}

function updatePlayerUI() {
    DOM.level.innerText = `L${player.level}`;
    DOM.nameDisplay.innerText = `Player: ${player.username}${isSandboxMode ? ' [SANDBOX]' : ''}`;
    updateStreakVisualBadge();

    if (DOM.architectBadge) {
        if (player.isAdmin) DOM.architectBadge.classList.remove('hidden');
        else DOM.architectBadge.classList.add('hidden');
    }

    let currentRank = "E";
    Object.keys(ranks).forEach(lvl => {
        if (player.level >= parseInt(lvl)) currentRank = ranks[lvl];
    });
    player.rank = currentRank;
    DOM.rank.innerText = `Classe: ${player.playerClass} | Rank: ${player.rank}`;
    
    DOM.xpText.innerText = `${Math.floor(player.xp)} / ${player.maxXp}`;
    const percent = Math.min((player.xp / player.maxXp) * 100, 100);
    DOM.xpBar.style.width = `${percent}%`;
}

async function handleTaskToggle(taskId, isDone, xp, listType, categoryId = null) {
    let task;
    if (listType === 'category') {
        task = categories[categoryId]?.tasks.find(t => t.id === taskId);
    } else {
        task = periodicQuests[listType]?.list.find(t => t.id === taskId);
    }

    if (!task || task.done || !isDone || !task.aprovada) return;

    if (listType === 'daily' && !task.isPenalty && hasActivePenaltyQuests()) {
        SoundFX.error();
        showSystemNotification('⚠️ Daily Quests bloqueadas! Conclua todas as missões de [PENALIDADE] primeiro!', 'error');
        renderPeriodicQuests();
        return;
    }

    if (listType === 'category' && categoryId && isCategoryLocked(categoryId)) {
        SoundFX.error();
        showSystemNotification('⚠️ Esta categoria está bloqueada por penalidade!', 'error');
        renderCategory(activeCategoryId);
        return;
    }

    if (task.dificuldade === 'Extremo' && task.subtarefas && task.subtarefas.length > 0) {
        if (!task.subtarefas.every(st => st.done)) {
            SoundFX.error();
            showSystemNotification('Conclua todas as subtarefas antes de finalizar uma missão Extrema!', 'error');
            renderCategory(activeCategoryId);
            return;
        }
    }

    const previousLocks = getLockedCategoriesArray();
    task.done = true;
    SoundFX.questComplete();

    if (listType === 'category' && categoryId !== 'admin' && categoryTallies[categoryId] !== undefined) {
        categoryTallies[categoryId]++;
    }

    if (task.isPenalty) {
        syncLockedCategoriesWithActivePenalties();
        const currentLocks = getLockedCategoriesArray();
        const unlockedKey = previousLocks.find(k => !currentLocks.includes(k));
        const unlockedTitle = categories[unlockedKey]?.title || 'Categoria';
        const remainingPenalties = getActivePenaltyQuestsCount();

        if (remainingPenalties === 0) {
            hasShownPenaltyModalThisSession = false;
            showSystemNotification(`✅ Todas as penalidades cumpridas! [${unlockedTitle}] e as Daily Quests foram desbloqueadas!`, 'success');
        } else {
            showSystemNotification(`Penalidade cumprida! [${unlockedTitle}] desbloqueada! Restam ${remainingPenalties} penalidade(s).`, 'success');
        }
    }

    player.xp += xp;
    if (player.xp >= player.maxXp) setTimeout(processLevelUp, 300);

    checkLootboxTriggers(listType, categoryId);

    updatePlayerUI();
    renderTabs();
    renderCategory(activeCategoryId);
    renderPeriodicQuests();

    await atualizarMissaoNoSupabase(task.id, { concluida: true, subtarefas: task.subtarefas || [] });
    await savePlayerToSupabase();
}

async function handleSubtaskToggle(taskId, subIdx, listType, categoryId = null) {
    let task;
    if (listType === 'category') {
        task = categories[categoryId]?.tasks.find(t => t.id === taskId);
    } else {
        task = periodicQuests[listType]?.list.find(t => t.id === taskId);
    }

    if (!task || task.done || !task.aprovada || !task.subtarefas?.[subIdx]) return;
    if (task.subtarefas[subIdx].done) return;

    if (listType === 'daily' && !task.isPenalty && hasActivePenaltyQuests()) {
        SoundFX.error();
        showSystemNotification('⚠️ Conclua as missões de [PENALIDADE] antes de progredir nas Daily Quests!', 'error');
        renderPeriodicQuests();
        return;
    }

    task.subtarefas[subIdx].done = true;
    SoundFX.click();

    if (task.subtarefas.every(st => st.done)) {
        showSystemNotification(`Todas as etapas concluídas! Missão Extrema finalizada (+${task.xp} XP)!`, 'success');
        await handleTaskToggle(taskId, true, task.xp, listType, categoryId);
    } else {
        renderCategory(activeCategoryId);
        renderPeriodicQuests();
        await atualizarMissaoNoSupabase(task.id, { subtarefas: task.subtarefas });
    }
}

function processLevelUp() {
    if (player.xp < player.maxXp) return;

    const oldLvl = player.level;
    player.level++;
    player.xp = Math.max(0, player.xp - player.maxXp);
    player.maxXp = Math.floor(player.maxXp * 1.35 + 150); 

    let evolutionHtml = "";
    let evolvedClass = false;
    let currentEvoLevel = evolutionLevels.slice().reverse().find(l => player.level >= l);

    if (currentEvoLevel) {
        let maxCat = 'saude';
        let maxVal = -1;
        for (const cat in categoryTallies) {
            if (categoryTallies[cat] > maxVal && classEvolutions[cat]) { 
                maxVal = categoryTallies[cat]; 
                maxCat = cat; 
            }
        }

        let isBalanced = maxVal > 0 && Object.values(categoryTallies).filter(v => v >= maxVal * 0.4).length >= 4;
        let newClass = classEvolutions[maxCat]?.[currentEvoLevel] || player.playerClass;

        if (isBalanced) {
            if (currentEvoLevel >= 100) newClass = "Deus Absoluto";
            else if (currentEvoLevel >= 80) newClass = "Monarca das Sombras";
            else if (currentEvoLevel >= 50) newClass = "Aventureiro Classe S";
            else if (currentEvoLevel >= 20) newClass = "Desperto Múltiplo";
        }

        if (player.playerClass !== newClass) {
            player.playerClass = newClass;
            evolvedClass = true;
            evolutionHtml = `
                <div class="mt-6 p-4 border-2 border-purple-500 bg-purple-900 bg-opacity-30 rounded shadow-[0_0_20px_rgba(179,136,255,0.4)]">
                    <p class="text-sm text-purple-300 uppercase tracking-widest mb-1 blink">Avanço de Classe Realizado!</p>
                    <p class="text-2xl font-bold text-glow-purple text-white">Nova Classe: <span class="text-glow-god">${player.playerClass}</span></p>
                </div>`;
        }
    }

    if (evolvedClass) {
        SoundFX.classEvolution();
    } else {
        SoundFX.levelUp();
    }

    document.getElementById('alert-old-level').innerText = oldLvl;
    document.getElementById('alert-new-level').innerText = player.level;
    document.getElementById('evolution-alert-container').innerHTML = evolutionHtml;

    DOM.modal.classList.remove('hidden');
    updatePlayerUI();
    savePlayerToSupabase();
}

function closeLevelUpModal() {
    SoundFX.click();
    DOM.modal.classList.add('hidden');
    if (player.xp >= player.maxXp) setTimeout(processLevelUp, 400); 
}

function getTotalActiveTasksCount() {
    let total = 0;
    Object.keys(categories).forEach(k => {
        if (!categories[k].isSystem) {
            total += categories[k].tasks.filter(t => !t.done && t.aprovada).length;
        }
    });
    return total;
}

function renderTabs() {
    DOM.tabs.innerHTML = '';
    for (const [key, data] of Object.entries(categories)) {
        const btn = document.createElement('button');
        const isActive = key === activeCategoryId;
        const isLocked = isCategoryLocked(key);
        
        let taskCount = null;
        if (data.isOverview) {
            taskCount = getTotalActiveTasksCount();
        } else if (!data.isSystem) {
            taskCount = data.tasks.filter(t => !t.done && t.aprovada).length;
        }
        
        btn.className = `tab-btn w-full text-left px-4 py-3 text-sm flex items-center justify-between ${isLocked ? 'text-red-500 opacity-75' : 'text-gray-400 hover:text-blue-200'} ${isActive ? 'active' : ''} ${key === 'geral' ? 'border-b border-blue-900/50 text-cyan-300' : ''} ${key === 'ranking' ? 'mt-2 border-t border-gray-800 text-yellow-300' : ''}`;
        btn.innerHTML = `
            <div class="flex items-center gap-3">
                <span class="text-lg">${isLocked ? '🔒' : data.icon}</span> 
                <span class="uppercase tracking-wider font-semibold">${data.title}</span>
            </div>
            ${taskCount ? `<span class="text-xs bg-blue-900 bg-opacity-40 text-blue-300 px-1.5 py-0.5 rounded border border-blue-800">${taskCount}</span>` : ''}
        `;
        btn.onclick = () => {
            SoundFX.click();
            activeCategoryId = key;
            renderTabs();
            renderCategory(key);
        };
        DOM.tabs.appendChild(btn);
    }
}

function toggleCompletedAccordion(sectionKey) {
    SoundFX.click();
    const current = collapsedCompletedState[sectionKey] !== undefined ? collapsedCompletedState[sectionKey] : true;
    collapsedCompletedState[sectionKey] = !current;
    renderCategory(activeCategoryId);
}

function createCompletedAccordionElement(completedTasks, sectionKey, isReadOnlyOverview = false) {
    const isCollapsed = collapsedCompletedState[sectionKey] !== undefined ? collapsedCompletedState[sectionKey] : true;
    const wrapper = document.createElement('li');
    wrapper.className = 'pt-4 mt-4 border-t border-blue-900/40 list-none';

    const toggleBtn = document.createElement('button');
    toggleBtn.type = 'button';
    toggleBtn.onclick = () => toggleCompletedAccordion(sectionKey);
    toggleBtn.className = 'w-full flex items-center justify-between px-3 py-2 rounded bg-black/50 border border-gray-800 hover:border-blue-800 text-xs text-gray-400 hover:text-blue-300 uppercase tracking-wider font-bold transition-all';
    toggleBtn.innerHTML = `
        <span class="flex items-center gap-2">
            <span>${isCollapsed ? '▶' : '▼'}</span>
            <span>Missões Concluídas (${completedTasks.length})</span>
        </span>
        <span class="text-[10px] text-gray-500 font-mono">${isCollapsed ? 'Clique para mostrar' : 'Clique para recolher'}</span>
    `;
    wrapper.appendChild(toggleBtn);

    if (!isCollapsed) {
        const subUl = document.createElement('ul');
        subUl.className = 'space-y-2 mt-2 pl-1';
        completedTasks.forEach(item => {
            const catId = item._catKey || sectionKey;
            const badge = isReadOnlyOverview ? `${categories[catId]?.icon || ''} ${categories[catId]?.title || ''}` : null;
            subUl.appendChild(createTaskElement(item, 'category', catId, isReadOnlyOverview, badge));
        });
        wrapper.appendChild(subUl);
    }

    return wrapper;
}

function renderGeneralOverview() {
    DOM.catBadge.innerText = 'Somente Visualização';
    DOM.headerRequestBtn.classList.remove('hidden');

    const allActive = [];
    const allCompleted = [];

    Object.keys(categories).forEach(catKey => {
        const cat = categories[catKey];
        if (!cat.isSystem) {
            cat.tasks.forEach(t => {
                const copy = { ...t, _catKey: catKey };
                if (t.done) allCompleted.push(copy);
                else allActive.push(copy);
            });
        }
    });

    const infoBanner = document.createElement('li');
    infoBanner.className = 'p-3 rounded bg-blue-950/30 border border-cyan-800/50 text-xs text-cyan-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-2 mb-2';
    infoBanner.innerHTML = `
        <div>
            <span class="font-bold uppercase text-cyan-400">🌐 Painel Geral de Monitoramento:</span>
            Visualize todas as suas missões ativas em um só lugar. Para concluir uma missão, acesse a categoria específica dela.
        </div>
        <div class="text-[11px] font-mono text-gray-400 flex-shrink-0">
            Ativas: <b class="text-white">${allActive.length}</b> | Concluídas: <b class="text-green-400">${allCompleted.length}</b>
        </div>
    `;
    DOM.catList.appendChild(infoBanner);

    if (allActive.length === 0) {
        const emptyLi = document.createElement('li');
        emptyLi.className = 'text-center text-gray-500 py-8 text-sm italic';
        emptyLi.innerText = 'Nenhuma missão pendente em nenhuma categoria no momento.';
        DOM.catList.appendChild(emptyLi);
    } else {
        allActive.forEach(task => {
            const cat = categories[task._catKey];
            const isCatLocked = isCategoryLocked(task._catKey);
            const badgeLabel = `${isCatLocked ? '🔒' : cat.icon} ${cat.title}`;
            DOM.catList.appendChild(createTaskElement(task, 'category', task._catKey, true, badgeLabel));
        });
    }

    if (allCompleted.length > 0) {
        DOM.catList.appendChild(createCompletedAccordionElement(allCompleted, 'geral', true));
    }
}

function renderCategory(categoryId) {
    const cat = categories[categoryId];
    DOM.catTitle.innerText = `${cat.icon} ${cat.title}`;
    DOM.catList.innerHTML = '';
    
    DOM.catList.classList.remove('hidden');
    DOM.inventoryContainer.classList.add('hidden');
    DOM.catBadge.innerText = cat.isSystem ? 'System Menu' : 'Main Quest';

    if (cat.isSystem && !cat.isOverview) {
        DOM.headerRequestBtn.classList.add('hidden');
    } else {
        DOM.headerRequestBtn.classList.remove('hidden');
    }

    if (categoryId === 'geral') {
        renderGeneralOverview();
        return;
    } else if (categoryId === 'admin') {
        renderAdminPanel();
        return;
    } else if (categoryId === 'inventario') {
        DOM.catList.classList.add('hidden');
        DOM.inventoryContainer.classList.remove('hidden');
        renderInventory();
        return;
    } else if (categoryId === 'ranking') {
        DOM.catBadge.innerText = 'Global Leaderboard';
        renderLeaderboard();
        return;
    }

    if (isCategoryLocked(categoryId)) {
        const activePenCount = getActivePenaltyQuestsCount();
        DOM.catList.innerHTML = `
            <div class="p-8 border-2 border-red-600 bg-red-950 bg-opacity-30 rounded-lg text-center space-y-3 my-4">
                <div class="text-5xl">🔒</div>
                <h3 class="text-xl font-bold text-glow-red uppercase tracking-widest">Categoria Bloqueada por Penalidade</h3>
                <p class="text-sm text-red-200 max-w-md mx-auto">
                    O acesso às missões de <b>${cat.title}</b> está suspenso. Você possui <b>${activePenCount}</b> missão(ões) de penalidade ativa(s) (${getLockedCategoriesArray().length} categoria(s) bloqueada(s)).
                </p>
                <p class="text-xs text-yellow-300 font-mono uppercase pt-2">
                    ➔ Cada missão [💀 PENALIDADE] concluída na aba Daily Quests desbloqueia 1 categoria!
                </p>
            </div>
        `;
        return;
    }

    const activeTasks = cat.tasks.filter(t => !t.done);
    const completedTasks = cat.tasks.filter(t => t.done);

    if (activeTasks.length === 0 && completedTasks.length === 0) {
        DOM.catList.innerHTML = `<li class="text-center text-gray-500 py-8 text-sm italic">Nenhuma missão nesta categoria. Clique em "+ Solicitar Missão" acima para adicionar.</li>`;
        return;
    }

    if (activeTasks.length === 0) {
        const doneMsg = document.createElement('li');
        doneMsg.className = 'text-center text-cyan-400/70 py-6 text-sm italic border border-dashed border-cyan-900/40 rounded';
        doneMsg.innerText = '✨ Todas as missões ativas desta categoria foram concluídas!';
        DOM.catList.appendChild(doneMsg);
    } else {
        activeTasks.forEach(task => {
            DOM.catList.appendChild(createTaskElement(task, 'category', categoryId, false, null));
        });
    }

    if (completedTasks.length > 0) {
        DOM.catList.appendChild(createCompletedAccordionElement(completedTasks, categoryId, false));
    }
}

/**
 * ==========================================
 * LEADERBOARD / RANKING DE CAÇADORES
 * ==========================================
 */
async function renderLeaderboard() {
    DOM.catList.innerHTML = `
        <div class="text-center py-8 text-cyan-400 animate-pulse font-mono text-sm">
            Consultando Associação de Caçadores...
        </div>
    `;

    try {
        const { data: hunters, error } = await supabaseClient
            .from('players')
            .select('*')
            .order('level', { ascending: false })
            .order('power', { ascending: false })
            .order('xp', { ascending: false })
            .limit(50);

        if (error) throw error;

        if (!hunters || hunters.length === 0) {
            DOM.catList.innerHTML = `<div class="text-center py-8 text-gray-500">Nenhum caçador registrado ainda.</div>`;
            return;
        }

        const rankBadgeColors = {
            'E': 'border-gray-500 text-gray-300',
            'D': 'border-green-500 text-green-400',
            'C': 'border-blue-500 text-blue-400',
            'B': 'border-purple-500 text-purple-400',
            'A': 'border-red-500 text-red-400',
            'S': 'border-yellow-400 text-yellow-300 text-glow-gold',
            'Nacional': 'border-pink-500 text-pink-300 text-glow',
            'Global': 'border-cyan-400 text-cyan-200 text-glow',
            'Monarca': 'border-white text-white text-glow-god'
        };

        let html = `
            <div class="space-y-3">
                <div class="flex justify-between items-center text-xs text-gray-400 px-3 pb-1 border-b border-blue-900 border-opacity-40 uppercase tracking-wider">
                    <span>Posição / Caçador</span>
                    <span>Status de Combate</span>
                </div>
        `;

        hunters.forEach((h, idx) => {
            const pos = idx + 1;
            const isMe = currentUser && h.id === currentUser.id;
            const medal = pos === 1 ? '🥇' : pos === 2 ? '🥈' : pos === 3 ? '🥉' : `#${pos}`;
            const rColor = rankBadgeColors[h.rank] || 'border-gray-500 text-gray-300';
            const hunterStreak = h.streak ?? h.reset_timestamps?.streak_count ?? 0;

            html += `
                <div class="flex items-center justify-between p-3 rounded border ${isMe ? 'bg-blue-950 bg-opacity-40 border-cyan-400 shadow-[0_0_12px_rgba(0,212,255,0.2)]' : 'bg-gray-900 bg-opacity-50 border-blue-900 border-opacity-30'}">
                    <div class="flex items-center gap-3">
                        <div class="w-8 text-center font-bold ${pos <= 3 ? 'text-xl' : 'text-sm text-gray-500 font-mono'}">
                            ${medal}
                        </div>
                        <div>
                            <div class="flex items-center gap-2 flex-wrap">
                                <span class="font-bold text-base ${isMe ? 'text-white text-glow' : 'text-blue-100'}">${h.username}</span>
                                ${h.is_admin ? '<span class="text-[9px] bg-purple-950 text-purple-300 border border-purple-500 px-1.5 py-0.2 rounded uppercase font-bold">👑 Arquiteto</span>' : ''}
                                ${isMe ? '<span class="text-[10px] bg-cyan-900 text-cyan-200 px-1.5 py-0.2 rounded uppercase font-bold">Você</span>' : ''}
                                <span class="text-[10px] font-bold px-1.5 py-0.2 rounded border ${rColor}">Rank ${h.rank || 'E'}</span>
                                ${hunterStreak > 0 ? `<span class="text-[10px] font-bold px-1.5 py-0.2 rounded bg-orange-950/80 border border-orange-500/60 text-orange-300">🔥 ${hunterStreak}d</span>` : ''}
                            </div>
                            <div class="text-xs text-gray-400">
                                Classe: <span class="text-purple-300">${h.player_class || 'Nenhuma'}</span>
                            </div>
                        </div>
                    </div>

                    <div class="text-right">
                        <div class="text-sm font-bold text-yellow-400">Level ${h.level || 1}</div>
                        <div class="text-xs text-purple-300 font-mono">⚡ ${(h.power || 0).toLocaleString()} PWR</div>
                    </div>
                </div>
            `;
        });

        html += `</div>`;
        DOM.catList.innerHTML = html;

    } catch (err) {
        DOM.catList.innerHTML = `<div class="text-center py-8 text-red-400 text-sm">Erro ao carregar o Ranking Global.</div>`;
    }
}

/**
 * ==========================================
 * RENDERIZADOR DO INVENTÁRIO (COM MOLDURA ALBION + TAG ROMANA + REFINAMENTO)
 * ==========================================
 */
function renderInventory() {
    const charContainer = document.getElementById('character-avatar-container');
    const avatarUrl = resolveCharacterAvatarUrl();
    if (charContainer) {
        if (avatarUrl !== "") {
            charContainer.innerHTML = `<img src="${avatarUrl}" alt="Personagem" class="w-full h-full object-contain drop-shadow-[0_0_18px_rgba(0,212,255,0.65)]" />`;
            charContainer.classList.remove('text-7xl', 'md:text-9xl'); 
        } else {
            charContainer.innerHTML = `🧍‍♂️`; 
            charContainer.classList.add('text-7xl', 'md:text-9xl'); 
        }
    }

    equipSlots.forEach(slot => {
        const eq = player.equipment[slot];
        const slotEl = document.getElementById(`slot-${slot}`);
        const defaultSlotImg = CONFIG_IMAGENS.equipamentosPadrao?.[slot] || "";

        if (eq) {
            const isMasterpiece = eq.rarity.isGod || eq.tier === 1;
            const romanTxt = getTierRomanLabel(eq);
            slotEl.innerHTML = `
                ${renderEquipmentVisualHTML(eq, 'slot')}
                <div class="text-[9px] font-bold uppercase ${eq.rarity.colorClass} truncate w-full text-center px-1 relative z-10">${eq.rarity.name}</div>
            `;
            slotEl.className = `equip-slot filled item-tier-surface w-20 h-20 md:w-24 md:h-24 rounded flex flex-col items-center justify-end pb-1 cursor-help border-2 ${eq.rarity.borderClass} ${isMasterpiece ? 'tier-masterpiece-frame' : ''}`;
            slotEl.style.cssText = getSlotSurfaceInlineStyle(eq);
            slotEl.title = `${eq.name} [${romanTxt}]\nPoder: +${eq.power.toLocaleString()} PWR\nRaridade: ${eq.rarity.name}${eq.tier ? ` (Tier ${eq.tier})` : ' (God Tier)'}`;
        } else {
            const visualElement = defaultSlotImg 
                ? `<img src="${defaultSlotImg}" alt="${slot}" onerror="handleCustomImageError(this, '${slot}', '#4a5568', false)" class="w-12 h-12 md:w-14 md:h-14 object-contain opacity-30 grayscale">` 
                : `<span class="text-gray-600 opacity-30 text-2xl">${slotIcons[slot]}</span>`;

            slotEl.innerHTML = visualElement;
            slotEl.className = `equip-slot w-20 h-20 md:w-24 md:h-24 rounded flex flex-col items-center justify-center cursor-help`;
            slotEl.style.cssText = '';
            slotEl.title = `Slot Vazio (${slot.replace('_', ' ')})`;
        }
    });
}

/**
 * ==========================================
 * AMBIENTE DE TESTES / SANDBOX (SPRINT 2)
 * ==========================================
 */
function enterSandboxMode() {
    if (!isSandboxMode) {
        sandboxBackupSnapshot = JSON.parse(JSON.stringify({
            player,
            categoryTallies,
            resetTimestamps,
            periodicQuests,
            categoriesTasks: Object.fromEntries(
                Object.keys(categories).filter(k => !categories[k].isSystem).map(k => [k, categories[k].tasks])
            )
        }));
        isSandboxMode = true;
        setSyncStatus('sandbox');
        updatePlayerUI();
        console.log('%c🧪 [MODO SANDBOX ATIVADO] Todas as gravações no Supabase estão bloqueadas!', 'background:#3b0764;color:#e9d5ff;padding:4px 8px;border-radius:4px;font-weight:bold;');
    }
}

async function exitSandboxMode() {
    SoundFX.click();
    if (!isSandboxMode) {
        showSystemNotification('Você já está no modo Online normal.', 'success');
        return;
    }

    if (sandboxBackupSnapshot) {
        player = sandboxBackupSnapshot.player;
        categoryTallies = sandboxBackupSnapshot.categoryTallies;
        resetTimestamps = sandboxBackupSnapshot.resetTimestamps;
        Object.keys(sandboxBackupSnapshot.periodicQuests).forEach(k => {
            periodicQuests[k] = sandboxBackupSnapshot.periodicQuests[k];
        });
        Object.keys(sandboxBackupSnapshot.categoriesTasks).forEach(k => {
            if (categories[k]) categories[k].tasks = sandboxBackupSnapshot.categoriesTasks[k];
        });
        sandboxBackupSnapshot = null;
    }

    isSandboxMode = false;
    hasShownPenaltyModalThisSession = false;
    setSyncStatus('online');
    updatePlayerUI();
    recalcPower();
    renderTabs();
    renderCategory(activeCategoryId);
    renderPeriodicQuests();

    if (currentUser) {
        await syncAllFromSupabase(true);
    }
    showSystemNotification('✅ Modo Sandbox encerrado! Dados reais do Supabase restaurados.', 'success');
}

const SysTest = {
    help() {
        console.log('%c🧪 LIFE OS — CONSOLE DE TESTES (SANDBOX OFF-DB)', 'background:#00d4ff;color:#000;font-weight:bold;padding:4px 8px;border-radius:4px;');
        console.table([
            { Comando: "SysTest.loot('lendario', null, 1)", Descricao: "Abre a Roleta CS:GO forçando Raridade e Tier (ex: Tier 1 Obra-Prima)" },
            { Comando: "SysTest.equipSet('raro', 1)", Descricao: "Equipa os 6 slots com uma Raridade e Tier (1 a 11) e abre o Inventário" },
            { Comando: "SysTest.levelUp(50, 'trabalho')", Descricao: "Simula salto para o Nível X e testa evolução de Classe (ou 'balanced')" },
            { Comando: "SysTest.streak(30)", Descricao: "Testa o visual e o som da Ofensiva Diária para X dias seguidos" },
            { Comando: "SysTest.penalty(3)", Descricao: "Simula X missões de penalidade ativas trancando X categorias e as Daily Quests" },
            { Comando: "SysTest.rank('Monarca')", Descricao: "Testa o Avatar do Caçador em qualquer Rank (E até Monarca)" },
            { Comando: "SysTest.exit()", Descricao: "Sai do Sandbox e restaura 100% os dados reais do Supabase" }
        ]);
        return "Digite qualquer comando acima. Nada será salvo no banco!";
    },

    loot(rarityId = 'lendario', slot = null, tier = null) {
        enterSandboxMode();
        const rId = normalizeStr(rarityId);
        const parsedTier = tier ? parseInt(tier, 10) : null;
        showSystemNotification(`🧪 [SANDBOX] Testando Roleta CS:GO (${rId.toUpperCase()}${parsedTier ? ' T' + parsedTier : ''})`, 'success');
        initiateLootbox('daily', `Sandbox (${rId.toUpperCase()})`, rId, slot, parsedTier);
    },

    equipSet(rarityId = 'divino', tier = 1) {
        enterSandboxMode();
        const rId = normalizeStr(rarityId);
        const parsedTier = tier ? parseInt(tier, 10) : 1;
        equipSlots.forEach(slot => {
            player.equipment[slot] = generateLoot('yearly', rId, slot, parsedTier);
        });
        SoundFX.equip();
        recalcPower();
        updatePlayerUI();
        activeCategoryId = 'inventario';
        renderTabs();
        renderCategory('inventario');
        showSystemNotification(`🧪 [SANDBOX] Set [${rId.toUpperCase()} - Tier ${parsedTier}] equipado localmente!`, 'success');
    },

    levelUp(targetLevel = null, focusCategory = 'trabalho') {
        enterSandboxMode();
        const nextLvl = targetLevel ? Math.max(2, parseInt(targetLevel)) : (player.level + 1);
        player.level = nextLvl - 1;

        if (focusCategory === 'balanced') {
            Object.keys(categoryTallies).forEach(k => { categoryTallies[k] = 25; });
        } else if (categoryTallies[focusCategory] !== undefined) {
            Object.keys(categoryTallies).forEach(k => { categoryTallies[k] = 2; });
            categoryTallies[focusCategory] = 50;
        }

        player.xp = player.maxXp;
        processLevelUp();
        if (activeCategoryId === 'admin' || activeCategoryId === 'inventario') renderCategory(activeCategoryId);
    },

    streak(days = 7) {
        enterSandboxMode();
        player.streak = parseInt(days) || 0;
        resetTimestamps.streak_count = player.streak;
        SoundFX.streakUp();
        updatePlayerUI();
        if (activeCategoryId === 'admin') renderCategory('admin');
        showSystemNotification(`🧪 [SANDBOX] Ofensiva simulada para 🔥 ${player.streak} dias!`, 'success');
    },

    async penalty(count = 1) {
        enterSandboxMode();
        const total = Math.max(1, Math.min(10, parseInt(count) || 1));
        for (let i = 0; i < total; i++) {
            await applyDailyPenalty();
        }
        updatePlayerUI();
        renderTabs();
        renderCategory(activeCategoryId);
        renderPeriodicQuests();
    },

    rank(rankName = 'Monarca') {
        enterSandboxMode();
        const rankToLevel = { 'E': 1, 'D': 15, 'C': 30, 'B': 50, 'A': 75, 'S': 100, 'Nacional': 150, 'Global': 200, 'Monarca': 250 };
        player.level = rankToLevel[rankName] || 250;
        SoundFX.classEvolution();
        updatePlayerUI();
        activeCategoryId = 'inventario';
        renderTabs();
        renderCategory('inventario');
        showSystemNotification(`🧪 [SANDBOX] Visualizando Avatar Rank [${rankName}] (Level ${player.level})!`, 'success');
    },

    sound(soundName = 'notifyPing') {
        switch (soundName) {
            case 'click': SoundFX.click(); break;
            case 'boot': SoundFX.boot(); break;
            case 'notifyPing': SoundFX.notifyPing(); break;
            case 'questComplete': SoundFX.questComplete(); break;
            case 'streakUp': SoundFX.streakUp(); break;
            case 'equip': SoundFX.equip(); break;
            case 'rouletteTick': SoundFX.rouletteTick(); break;
            case 'lootNormal': SoundFX.lootReveal(false); break;
            case 'lootGod': SoundFX.lootReveal(true); break;
            case 'levelUp': SoundFX.levelUp(); break;
            case 'classEvolution': SoundFX.classEvolution(); break;
            case 'penaltyAlarm': SoundFX.penaltyAlarm(); break;
            case 'error': SoundFX.error(); break;
            default: SoundFX.notifyPing();
        }
    },

    exit() {
        return exitSandboxMode();
    }
};

window.SysTest = SysTest;

/**
 * ==========================================
 * PAINEL DE ADMINISTRAÇÃO + LABORATÓRIO SANDBOX (SPRINT 2)
 * ==========================================
 */
function renderAdminPanel() {
    const defaultDest = preselectedCategoryForRequest || 'cat_saude';
    preselectedCategoryForRequest = null;

    DOM.catList.innerHTML = `
        <div class="space-y-6 text-sm">
            <!-- 1. Solicitação de Nova Missão -->
            <div class="bg-black bg-opacity-50 p-4 rounded border border-blue-900 border-opacity-50">
                <div class="flex justify-between items-center border-b border-blue-900 pb-2 mb-4">
                    <h3 class="text-blue-400 font-bold uppercase tracking-wider">
                        ${player.isAdmin ? '⚡ Criar Missão (Modo Arquiteto - Auto Aprovada)' : '📩 Solicitar Nova Missão ao Arquiteto'}
                    </h3>
                    <span class="text-[10px] px-2 py-0.5 rounded border ${player.isAdmin ? 'border-purple-500 text-purple-300 bg-purple-950' : 'border-yellow-600 text-yellow-400'} uppercase font-bold">
                        ${player.isAdmin ? '👑 Permissão Master (Servidor)' : 'Requer Aprovação do Arquiteto'}
                    </span>
                </div>

                <div class="space-y-4">
                    <div>
                        <label class="block text-gray-400 text-xs mb-1">Título da Missão</label>
                        <input type="text" id="admin-task-name" placeholder="Ex: Finalizar projeto da faculdade..." class="w-full bg-black bg-opacity-80 border border-blue-800 rounded px-3 py-2 text-blue-100 placeholder-gray-700 focus:outline-none focus:border-blue-400">
                    </div>

                    <div class="flex flex-col md:flex-row gap-4">
                        <div class="w-full md:w-1/2">
                            <label class="block text-gray-400 text-xs mb-1">Categoria / Destino</label>
                            <select id="admin-task-type" class="w-full bg-black bg-opacity-80 border border-blue-800 rounded px-3 py-2 text-blue-100 focus:outline-none focus:border-blue-400">
                                <optgroup label="Main Quests (Categorias)">
                                    ${Object.keys(categories).filter(k => !categories[k].isSystem).map(k => `<option value="cat_${k}" ${defaultDest === 'cat_'+k ? 'selected' : ''}>${categories[k].title}</option>`).join('')}
                                </optgroup>
                                <optgroup label="Metas de Longo Prazo">
                                    <option value="per_monthly">Monthly Quest (Mensal)</option>
                                    <option value="per_yearly">Yearly Quest (Anual)</option>
                                </optgroup>
                            </select>
                        </div>

                        <div class="w-full md:w-1/2">
                            <label class="block text-gray-400 text-xs mb-1">Nível de Dificuldade (XP Sorteado pelo Sistema)</label>
                            <select id="admin-task-difficulty" onchange="toggleSubtasksBuilder()" class="w-full bg-black bg-opacity-80 border border-blue-800 rounded px-3 py-2 text-blue-100 focus:outline-none focus:border-blue-400">
                                <option value="Fácil">🟢 Fácil (8 ~ 15 XP)</option>
                                <option value="Médio">🔵 Médio (18 ~ 30 XP)</option>
                                <option value="Difícil">🟣 Difícil (35 ~ 55 XP)</option>
                                <option value="Extremo">🔴 Extremo (65 ~ 100 XP | Exige Subtarefas)</option>
                            </select>
                        </div>
                    </div>

                    <div id="subtasks-builder-container" class="hidden p-3 rounded bg-red-950 bg-opacity-20 border border-red-800 space-y-2">
                        <div class="flex justify-between items-center">
                            <label class="text-xs font-bold text-red-400 uppercase tracking-wider">⚠️ Subtarefas Obrigatórias (Mínimo 2 etapas para nível Extremo)</label>
                            <button type="button" onclick="addSubtaskInputRow()" class="text-xs bg-red-900 bg-opacity-50 hover:bg-red-800 text-red-200 px-2 py-1 rounded border border-red-600 font-bold uppercase">
                                + Etapa
                            </button>
                        </div>
                        <div id="subtasks-inputs-list" class="space-y-2">
                            <input type="text" placeholder="Etapa 1..." class="subtask-input-row w-full bg-black bg-opacity-80 border border-red-900 rounded px-2.5 py-1.5 text-xs text-red-100 focus:outline-none focus:border-red-500">
                            <input type="text" placeholder="Etapa 2..." class="subtask-input-row w-full bg-black bg-opacity-80 border border-red-900 rounded px-2.5 py-1.5 text-xs text-red-100 focus:outline-none focus:border-red-500">
                        </div>
                    </div>

                    <button id="admin-submit-btn" onclick="handleAdminSubmit()" class="w-full mt-2 bg-blue-900 bg-opacity-40 border border-blue-500 hover:bg-blue-700 hover:bg-opacity-50 px-4 py-3 rounded text-blue-300 font-bold uppercase transition-all shadow-[0_0_10px_rgba(0,212,255,0.2)]">
                        ${player.isAdmin ? '⚡ Injetar Missão Aprovada' : '📨 Enviar Requisição para Aprovação'}
                    </button>
                </div>
            </div>

            <!-- 2. Terminal do Arquiteto -->
            ${player.isAdmin ? `
                <div class="bg-black bg-opacity-60 p-4 rounded border border-purple-500 shadow-[0_0_15px_rgba(179,136,255,0.2)]">
                    <div class="flex justify-between items-center border-b border-gray-800 pb-2 mb-3">
                        <h3 class="text-purple-400 font-bold uppercase tracking-wider">
                            👑 Fila Global de Aprovação do Arquiteto
                        </h3>
                        <span class="text-[10px] text-purple-300/70 font-mono uppercase">Atualização Automática Ativa</span>
                    </div>
                    <div id="master-pending-queue" class="space-y-2">
                        <div class="text-xs text-gray-400 animate-pulse font-mono">Buscando requisições pendentes de todos os caçadores...</div>
                    </div>
                </div>
            ` : `
                <div class="bg-black bg-opacity-40 p-3 rounded border border-gray-800 text-xs text-gray-500 flex items-center justify-between">
                    <span>🔒 Terminal de Aprovação de Missões</span>
                    <span class="font-mono uppercase text-[10px] text-gray-600">[ Acesso Exclusivo ao Arquiteto do Sistema ]</span>
                </div>
            `}

            <!-- 3. LABORATÓRIO DE TESTES / SANDBOX (SPRINT 2 - 100% OFF-DB) -->
            <div class="bg-gray-950/90 p-4 rounded border-2 ${isSandboxMode ? 'border-purple-400 shadow-[0_0_20px_rgba(192,132,252,0.35)]' : 'border-cyan-800/80'} space-y-4">
                <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 border-b border-gray-800 pb-3">
                    <div>
                        <h3 class="text-cyan-300 font-bold uppercase tracking-wider flex items-center gap-2">
                            <span>🧪 Laboratório de Testes (Modo Sandbox — Sprint 2)</span>
                            ${isSandboxMode ? '<span class="text-[10px] px-2 py-0.5 rounded bg-purple-900 text-purple-200 border border-purple-400 blink">SANDBOX ATIVO (OFF-DB)</span>' : '<span class="text-[10px] px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-700">100% Seguro (Não salva no Supabase)</span>'}
                        </h3>
                        <p class="text-xs text-gray-400 mt-0.5">
                            Inspecione suas novas imagens, Tiers (<code class="text-yellow-300">XI</code> a <code class="text-yellow-300">I</code>) e estrelas de refinamento sem afetar o banco.
                        </p>
                    </div>
                    ${isSandboxMode ? `
                        <button onclick="exitSandboxMode()" class="px-3 py-1.5 bg-green-900/70 hover:bg-green-700 border border-green-400 text-green-100 rounded text-xs font-bold uppercase tracking-wider shadow-[0_0_12px_rgba(74,222,128,0.4)]">
                            🔄 Sair do Sandbox & Restaurar Banco
                        </button>
                    ` : ''}
                </div>

                <!-- 3.1 Teste de Roleta CS:GO, Raridades e Tiers (T11 a T1) -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div class="p-3 rounded bg-black/60 border border-gray-800 space-y-2">
                        <div class="text-xs font-bold text-yellow-400 uppercase tracking-wider">🎰 1. Testar Imagens, Raridade & Tier (XI a I)</div>
                        <div class="flex gap-2">
                            <select id="sandbox-loot-rarity" class="flex-grow bg-black border border-gray-700 rounded px-2 py-1.5 text-xs text-white">
                                ${rarities.map(r => `<option value="${r.id}">${r.name} (+${r.basePower} PWR)</option>`).join('')}
                            </select>
                            <select id="sandbox-loot-tier" class="w-28 bg-black border border-gray-700 rounded px-2 py-1.5 text-xs text-yellow-300 font-bold">
                                <option value="1">Tier I (T1 ★)</option>
                                <option value="2">Tier II (T2)</option>
                                <option value="4">Tier IV (T4)</option>
                                <option value="7">Tier VII (T7)</option>
                                <option value="11">Tier XI (T11)</option>
                            </select>
                        </div>
                        <div class="flex gap-2 pt-1">
                            <button onclick="SysTest.loot(document.getElementById('sandbox-loot-rarity').value, null, document.getElementById('sandbox-loot-tier').value)" class="flex-1 px-2 py-1.5 border border-yellow-500 text-yellow-300 hover:bg-yellow-950 rounded text-[11px] font-bold uppercase">
                                🎰 Girar na Roleta
                            </button>
                            <button onclick="SysTest.equipSet(document.getElementById('sandbox-loot-rarity').value, document.getElementById('sandbox-loot-tier').value)" class="flex-1 px-2 py-1.5 bg-blue-950/60 hover:bg-blue-900 border border-blue-500 text-blue-200 rounded text-[11px] font-bold uppercase">
                                🛡️ Equipar Set no Inventário
                            </button>
                        </div>
                    </div>

                    <!-- 3.2 Teste de Level Up, Evolução de Classe e Avatar Rank -->
                    <div class="p-3 rounded bg-black/60 border border-gray-800 space-y-2">
                        <div class="text-xs font-bold text-purple-400 uppercase tracking-wider">⚡ 2. Testar Level Up, Classes & Avatar</div>
                        <div class="flex flex-wrap gap-1.5">
                            <button onclick="SysTest.levelUp(5, 'trabalho')" class="px-2.5 py-1 border border-purple-700 hover:bg-purple-950 text-purple-200 rounded text-xs font-bold">Lv.5 (Classe 1)</button>
                            <button onclick="SysTest.levelUp(20, 'saude')" class="px-2.5 py-1 border border-purple-700 hover:bg-purple-950 text-purple-200 rounded text-xs font-bold">Lv.20</button>
                            <button onclick="SysTest.levelUp(50, 'estudo')" class="px-2.5 py-1 border border-purple-700 hover:bg-purple-950 text-purple-200 rounded text-xs font-bold">Lv.50</button>
                            <button onclick="SysTest.levelUp(80, 'balanced')" class="px-2.5 py-1 border border-purple-500 hover:bg-purple-900 text-white rounded text-xs font-bold">Lv.80 (Monarca)</button>
                            <button onclick="SysTest.levelUp(100, 'balanced')" class="px-2.5 py-1 border border-white hover:bg-purple-800 text-white rounded text-xs font-bold">Lv.100 (Deus)</button>
                        </div>
                        <div class="flex gap-1.5 pt-1 items-center">
                            <span class="text-[11px] text-gray-400">Ver Avatar Rank:</span>
                            <button onclick="SysTest.rank('E')" class="px-2 py-0.5 border border-gray-600 text-gray-300 rounded text-[11px]">E</button>
                            <button onclick="SysTest.rank('B')" class="px-2 py-0.5 border border-purple-600 text-purple-300 rounded text-[11px]">B</button>
                            <button onclick="SysTest.rank('S')" class="px-2 py-0.5 border border-yellow-500 text-yellow-300 rounded text-[11px]">S</button>
                            <button onclick="SysTest.rank('Global')" class="px-2 py-0.5 border border-cyan-500 text-cyan-300 rounded text-[11px]">Global</button>
                            <button onclick="SysTest.rank('Monarca')" class="px-2 py-0.5 border border-white text-white rounded text-[11px] font-bold">Monarca</button>
                        </div>
                    </div>
                </div>

                <!-- 3.3 Teste de Penalidades, Ofensiva (Streak) e Mesa de Som -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div class="p-3 rounded bg-black/60 border border-gray-800 space-y-2">
                        <div class="text-xs font-bold text-orange-400 uppercase tracking-wider">🔥 3. Testar Ofensiva (Streak) & Penalidades</div>
                        <div class="flex flex-wrap gap-1.5">
                            <button onclick="SysTest.streak(3)" class="px-2 py-1 border border-orange-700 text-orange-300 hover:bg-orange-950 rounded text-xs">🔥 3d</button>
                            <button onclick="SysTest.streak(7)" class="px-2 py-1 border border-cyan-600 text-cyan-300 hover:bg-cyan-950 rounded text-xs">⚡ 7d (Azul)</button>
                            <button onclick="SysTest.streak(14)" class="px-2 py-1 border border-indigo-500 text-indigo-300 hover:bg-indigo-950 rounded text-xs">💜 14d (Sombra)</button>
                            <button onclick="SysTest.streak(30)" class="px-2 py-1 border border-purple-400 text-purple-200 hover:bg-purple-950 rounded text-xs font-bold">👑 30d (Monarca)</button>
                        </div>
                        <div class="flex flex-wrap gap-1.5 pt-1">
                            <button onclick="SysTest.penalty(1)" class="flex-1 px-2 py-1 bg-red-950/60 hover:bg-red-900 border border-red-600 text-red-200 rounded text-[11px] font-bold uppercase">
                                💀 +1 Penalidade (Ver fundo_penalidade)
                            </button>
                            <button onclick="SysTest.penalty(3)" class="flex-1 px-2 py-1 bg-red-950/60 hover:bg-red-900 border border-red-500 text-red-100 rounded text-[11px] font-bold uppercase">
                                💀 +3 Penalidades
                            </button>
                        </div>
                    </div>

                    <div class="p-3 rounded bg-black/60 border border-gray-800 space-y-2">
                        <div class="text-xs font-bold text-cyan-400 uppercase tracking-wider">🔊 4. Mesa de Som (Web Audio Synth 2.0)</div>
                        <div class="flex flex-wrap gap-1.5">
                            <button onclick="SysTest.sound('notifyPing')" class="px-2 py-1 border border-cyan-800 hover:border-cyan-400 text-cyan-200 rounded text-[11px]">🔔 Ping</button>
                            <button onclick="SysTest.sound('questComplete')" class="px-2 py-1 border border-cyan-800 hover:border-cyan-400 text-cyan-200 rounded text-[11px]">✅ Quest</button>
                            <button onclick="SysTest.sound('streakUp')" class="px-2 py-1 border border-cyan-800 hover:border-cyan-400 text-cyan-200 rounded text-[11px]">🔥 Streak</button>
                            <button onclick="SysTest.sound('equip')" class="px-2 py-1 border border-cyan-800 hover:border-cyan-400 text-cyan-200 rounded text-[11px]">🛡️ Equipar</button>
                            <button onclick="SysTest.sound('rouletteTick')" class="px-2 py-1 border border-cyan-800 hover:border-cyan-400 text-cyan-200 rounded text-[11px]">🎰 Tick</button>
                            <button onclick="SysTest.sound('lootGod')" class="px-2 py-1 border border-yellow-600 hover:border-yellow-400 text-yellow-200 rounded text-[11px]">✨ Drop God</button>
                            <button onclick="SysTest.sound('classEvolution')" class="px-2 py-1 border border-purple-600 hover:border-purple-400 text-purple-200 rounded text-[11px]">👑 Evolução</button>
                            <button onclick="SysTest.sound('penaltyAlarm')" class="px-2 py-1 border border-red-700 hover:border-red-400 text-red-300 rounded text-[11px]">🚨 Alarme</button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 4. Configurações de Conta -->
            <div class="bg-black bg-opacity-50 p-4 rounded border border-gray-800 space-y-4">
                <div>
                    <label class="block text-gray-400 text-xs mb-2 uppercase">Identidade do Caçador no Ranking</label>
                    <div class="flex gap-2">
                        <input type="text" id="admin-hunter-name" value="${player.username}" class="flex-grow bg-black bg-opacity-80 border border-blue-800 rounded px-3 py-1.5 text-blue-100 focus:outline-none focus:border-blue-400">
                        <button onclick="updateHunterName()" class="px-4 py-1.5 border border-blue-500 text-blue-300 hover:bg-blue-900 rounded text-xs uppercase font-bold">
                            Salvar Nome
                        </button>
                    </div>
                </div>

                <div class="border-t border-gray-800 pt-4 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div class="text-xs text-gray-400">
                        Conta conectada: <span class="text-cyan-300 font-mono">${currentUser?.email || 'Nenhuma'}</span>
                    </div>
                    <div class="flex flex-wrap gap-2 w-full md:w-auto">
                        <button onclick="openPenaltyModalUI()" class="flex-1 md:flex-initial px-3 py-2 border border-red-600 text-red-400 hover:bg-red-950 rounded text-xs uppercase font-bold">
                            💀 Ver Janela Penalidade
                        </button>
                        <button onclick="triggerAwakeningScreenManual()" class="flex-1 md:flex-initial px-3 py-2 border border-purple-600 text-purple-400 hover:bg-purple-950 rounded text-xs uppercase font-bold">
                            ⚡ Tela Inicial
                        </button>
                        <button onclick="handleLogout()" class="flex-1 md:flex-initial px-3 py-2 border border-gray-600 text-gray-300 hover:bg-gray-800 rounded text-xs uppercase font-bold">
                            🚪 Sair
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    if (player.isAdmin && !isSandboxMode) {
        loadMasterPendingQueue();
    }
}

function toggleSubtasksBuilder() {
    SoundFX.click();
    const diff = document.getElementById('admin-task-difficulty')?.value;
    const container = document.getElementById('subtasks-builder-container');
    if (!container) return;
    if (diff === 'Extremo') {
        container.classList.remove('hidden');
    } else {
        container.classList.add('hidden');
    }
}

function addSubtaskInputRow() {
    SoundFX.click();
    const list = document.getElementById('subtasks-inputs-list');
    if (!list) return;
    const count = list.querySelectorAll('.subtask-input-row').length + 1;
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = `Etapa ${count}...`;
    input.className = 'subtask-input-row w-full bg-black bg-opacity-80 border border-red-900 rounded px-2.5 py-1.5 text-xs text-red-100 focus:outline-none focus:border-red-500';
    list.appendChild(input);
}

async function loadMasterPendingQueue() {
    const queueEl = document.getElementById('master-pending-queue');
    if (!queueEl || !player.isAdmin) return;

    try {
        const { data: pendingList, error } = await supabaseClient
            .from('quests')
            .select('*')
            .eq('aprovada', false)
            .order('created_at', { ascending: true });

        if (error) throw error;

        if (!pendingList || pendingList.length === 0) {
            queueEl.innerHTML = `<div class="text-xs text-gray-500 italic py-2">Nenhuma missão aguardando aprovação no momento.</div>`;
            return;
        }

        queueEl.innerHTML = pendingList.map(item => {
            const diffColor = DIFFICULTY_CONFIG[item.dificuldade || 'Fácil']?.color || 'text-gray-300 border-gray-600';
            const subs = Array.isArray(item.subtarefas) && item.subtarefas.length > 0
                ? `<div class="text-[11px] text-gray-400 mt-1 pl-2 border-l border-red-800">Etapas: ${item.subtarefas.map(s => s.text).join(' ➔ ')}</div>`
                : '';

            return `
                <div class="p-3 rounded bg-gray-900 border border-purple-900 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                    <div>
                        <div class="flex items-center gap-2 flex-wrap">
                            <span class="text-xs font-bold bg-purple-950 text-purple-300 px-2 py-0.5 rounded border border-purple-700">Caçador: ${item.username || 'Amigo'}</span>
                            <span class="text-[10px] font-bold px-2 py-0.5 rounded border ${diffColor}">${item.dificuldade || 'Fácil'} (+${item.xp} XP)</span>
                            <span class="text-[10px] text-gray-400 uppercase">[${item.categoria} / ${item.tipo}]</span>
                        </div>
                        <div class="text-white font-semibold mt-1">${item.quest}</div>
                        ${subs}
                    </div>
                    <div class="flex gap-2 w-full md:w-auto">
                        <button onclick="approveQuestMaster('${item.id}')" class="flex-1 md:flex-initial px-3 py-1.5 bg-green-900 bg-opacity-60 hover:bg-green-700 border border-green-500 text-green-200 rounded text-xs font-bold uppercase">
                            ✅ Aprovar
                        </button>
                        <button onclick="rejectQuestMaster('${item.id}')" class="flex-1 md:flex-initial px-3 py-1.5 bg-red-900 bg-opacity-60 hover:bg-red-700 border border-red-500 text-red-200 rounded text-xs font-bold uppercase">
                            ❌ Recusar
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    } catch (err) {
        queueEl.innerHTML = `<div class="text-xs text-red-400">Erro ao carregar fila.</div>`;
    }
}

async function approveQuestMaster(questId) {
    if (!player.isAdmin || isSandboxMode) return;
    SoundFX.questComplete();
    try {
        const { error } = await supabaseClient
            .from('quests')
            .update({ aprovada: true })
            .eq('id', questId);
        if (error) throw error;
        showSystemNotification('Missão aprovada e liberada para o Caçador!', 'success');
        await syncAllFromSupabase(true);
    } catch (err) {
        showSystemNotification('Erro ao aprovar missão.', 'error');
    }
}

async function rejectQuestMaster(questId) {
    if (!player.isAdmin || isSandboxMode) return;
    SoundFX.click();
    try {
        const { error } = await supabaseClient
            .from('quests')
            .delete()
            .eq('id', questId);
        if (error) throw error;
        showSystemNotification('Requisição recusada e removida.', 'success');
        await syncAllFromSupabase(true);
    } catch (err) {
        showSystemNotification('Erro ao recusar missão.', 'error');
    }
}

async function updateHunterName() {
    const input = document.getElementById('admin-hunter-name');
    const newName = input?.value.trim();
    if (!newName) return;
    SoundFX.click();
    player.username = newName;
    updatePlayerUI();
    await savePlayerToSupabase();
    showSystemNotification(`Nome de Caçador atualizado para "${newName}"!`, 'success');
}

async function handleAdminSubmit() {
    const nameInput = document.getElementById('admin-task-name');
    const typeInput = document.getElementById('admin-task-type');
    const diffInput = document.getElementById('admin-task-difficulty');
    const btn = document.getElementById('admin-submit-btn');
    
    const text = nameInput.value.trim();
    if (!text) {
        SoundFX.error();
        showSystemNotification('Digite o título da missão.', 'error');
        return;
    }
    
    const dificuldade = diffInput.value || 'Fácil';
    const typeVal = typeInput.value;

    let subtarefas = [];
    if (dificuldade === 'Extremo') {
        const subInputs = document.querySelectorAll('.subtask-input-row');
        subInputs.forEach(inp => {
            if (inp.value.trim()) {
                subtarefas.push({ text: inp.value.trim(), done: false });
            }
        });
        if (subtarefas.length < 2) {
            SoundFX.error();
            showSystemNotification('Missões de nível Extremo exigem pelo menos 2 subtarefas preenchidas!', 'error');
            return;
        }
    }

    let categoriaDb = "Saúde";
    let tipoDb = "Main Quest";
    let targetCatId = null;
    let targetPerId = null;

    if (typeVal.startsWith('cat_')) {
        targetCatId = typeVal.replace('cat_', '');
        categoriaDb = categories[targetCatId].title;
        tipoDb = "Main Quest";
    } else if (typeVal.startsWith('per_')) {
        targetPerId = typeVal.replace('per_', '');
        categoriaDb = "Saúde"; 
        tipoDb = targetPerId.charAt(0).toUpperCase() + targetPerId.slice(1);
    }

    const autoApprove = Boolean(player.isAdmin);
    const oldText = btn.innerText;
    btn.innerText = "Registrando...";
    btn.disabled = true;

    const inserted = await criarMissaoNoSupabase(text, categoriaDb, tipoDb, dificuldade, subtarefas, autoApprove);

    btn.disabled = false;
    btn.innerText = oldText;

    if (inserted) {
        SoundFX.questComplete();
        const newTask = mapRowToTaskObj(inserted);
        if (targetCatId) {
            categories[targetCatId].tasks.push(newTask);
            if (autoApprove) categories[targetCatId].boxClaimed = false;
        } else if (targetPerId) {
            periodicQuests[targetPerId].list.push(newTask);
            if (autoApprove) {
                periodicQuests[targetPerId].boxClaimed = false;
                updateBoxIcon(targetPerId, false);
            }
        }
        nameInput.value = '';
        document.querySelectorAll('.subtask-input-row').forEach(inp => { inp.value = ''; });
        renderTabs();
        renderPeriodicQuests();
        if (player.isAdmin && !isSandboxMode) loadMasterPendingQueue();
        savePlayerToSupabase();

        if (autoApprove) {
            showSystemNotification(`Missão "${text}" (${dificuldade}: +${newTask.xp} XP) injetada!`, 'success');
        } else {
            showSystemNotification(`Requisição enviada! Aguardando aprovação do Arquiteto.`, 'success');
        }
    } else {
        SoundFX.error();
        showSystemNotification(`Erro ao registrar missão.`, 'error');
    }
}

function renderPeriodicQuests() {
    const renderList = (group, domElement, type) => {
        domElement.innerHTML = '';
        if (group.list.length === 0) {
            domElement.innerHTML = `<li class="text-xs text-gray-600 italic py-1">Sem missões.</li>`;
        } else {
            if (type === 'daily' && hasActivePenaltyQuests()) {
                const lockNotice = document.createElement('li');
                lockNotice.className = 'p-2 rounded bg-red-950/60 border border-red-600/80 text-[11px] text-red-200 font-bold text-center uppercase tracking-wider mb-1';
                lockNotice.innerHTML = `🔒 Cumpra a(s) Penalidade(s) abaixo para liberar as Daily Quests!`;
                domElement.appendChild(lockNotice);
            }

            group.list.forEach(task => {
                domElement.appendChild(createTaskElement(task, type));
            });
        }
        updateBoxIcon(type, group.boxClaimed);
    };

    renderList(periodicQuests.daily, document.getElementById('daily-list'), 'daily');
    renderList(periodicQuests.weekly, document.getElementById('weekly-list'), 'weekly');
    renderList(periodicQuests.monthly, document.getElementById('monthly-list'), 'monthly');
    renderList(periodicQuests.yearly, document.getElementById('yearly-list'), 'yearly');
}

function createTaskElement(task, listType, categoryId = null, isReadOnlyOverview = false, categoryBadgeLabel = null) {
    const li = document.createElement('li');
    const isPending = !task.aprovada;
    const isExtremeWithSubs = task.dificuldade === 'Extremo' && Array.isArray(task.subtarefas) && task.subtarefas.length > 0;
    const diffCfg = DIFFICULTY_CONFIG[task.dificuldade || 'Fácil'] || DIFFICULTY_CONFIG['Fácil'];

    const isLockedByPenalty = listType === 'daily' && !task.isPenalty && !task.done && hasActivePenaltyQuests();

    let borderStyle = 'border-blue-900 border-opacity-30 hover:border-blue-500';
    if (task.done) borderStyle = 'completed border-gray-800 opacity-60';
    else if (task.isPenalty) borderStyle = 'border-red-600 bg-red-950 bg-opacity-30 shadow-[0_0_10px_rgba(220,38,38,0.2)]';
    else if (isLockedByPenalty) borderStyle = 'border-red-900/50 bg-black/50 opacity-55';
    else if (isPending) borderStyle = 'border-yellow-700 border-dashed opacity-75';

    li.className = `quest-item group flex flex-col gap-2 p-2.5 rounded bg-gray-900 bg-opacity-40 border ${borderStyle} transition-all`;
    
    const topRow = document.createElement('div');
    topRow.className = 'flex items-start gap-3 w-full';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'quest-checkbox mt-0.5';
    checkbox.checked = Boolean(task.done);
    checkbox.disabled = Boolean(task.done) || isPending || isReadOnlyOverview || (isExtremeWithSubs && !task.subtarefas.every(s => s.done));

    if (isReadOnlyOverview && !task.done) {
        checkbox.title = "Modo Visualização: Clique em 'Ir ➔' para abrir a categoria e concluir a missão.";
    } else if (isLockedByPenalty) {
        checkbox.title = "Bloqueada! Conclua todas as missões de [PENALIDADE] primeiro.";
    }

    checkbox.addEventListener('change', (e) => {
        if (isLockedByPenalty) {
            e.target.checked = false;
            SoundFX.error();
            showSystemNotification('⚠️ Daily Quests bloqueadas! Conclua todas as missões de [PENALIDADE] primeiro!', 'error');
            return;
        }
        if (!e.target.checked) {
            e.target.checked = true;
            return;
        }
        handleTaskToggle(task.id, true, task.xp, listType, categoryId);
    });

    const spanText = document.createElement('div');
    spanText.className = 'flex-grow leading-tight';
    spanText.innerHTML = `
        <span class="task-text ${task.isPenalty ? 'text-red-300 font-bold' : isLockedByPenalty ? 'text-gray-400' : 'text-blue-100'}">${isLockedByPenalty ? '🔒 ' : ''}${task.text}</span>
        <div class="flex items-center gap-1.5 mt-1 flex-wrap">
            ${categoryBadgeLabel ? `<span class="text-[9px] uppercase font-bold px-1.5 py-0.2 rounded bg-blue-950 text-cyan-300 border border-blue-800">${categoryBadgeLabel}</span>` : ''}
            <span class="text-[9px] uppercase font-bold px-1.5 py-0.2 rounded border ${diffCfg.color}">${task.dificuldade || 'Fácil'}</span>
            ${isLockedByPenalty ? '<span class="text-[9px] uppercase font-bold px-1.5 py-0.2 rounded border border-red-700 text-red-400 bg-red-950/80">🔒 Cumpra a Penalidade Primeiro</span>' : ''}
            ${isPending ? '<span class="text-[9px] uppercase font-bold px-1.5 py-0.2 rounded border border-yellow-600 text-yellow-400 bg-yellow-950">⏳ Aguardando Arquiteto</span>' : ''}
            ${task.done ? '<span class="text-[9px] uppercase font-bold text-gray-500">🔒 Concluída</span>' : ''}
        </div>
    `;

    const spanXp = document.createElement('span');
    spanXp.className = `text-[10px] font-bold ${task.done ? 'text-gray-600' : 'text-blue-400'} bg-black px-1.5 py-0.5 rounded border border-blue-900 flex-shrink-0`;
    spanXp.textContent = `+${task.xp} XP`;

    topRow.appendChild(checkbox);
    topRow.appendChild(spanText);
    topRow.appendChild(spanXp);

    if (isReadOnlyOverview && categoryId && !task.done) {
        const goBtn = document.createElement('button');
        goBtn.type = 'button';
        goBtn.className = 'text-[10px] text-cyan-400 hover:text-white border border-cyan-800 hover:bg-cyan-900 px-2 py-0.5 rounded uppercase font-bold flex-shrink-0 transition-all';
        goBtn.innerText = 'Ir ➔';
        goBtn.title = 'Ir para a categoria desta missão';
        goBtn.onclick = () => jumpToCategory(categoryId);
        topRow.appendChild(goBtn);
    }

    if ((player.isAdmin || isPending) && !isReadOnlyOverview) {
        const delBtn = document.createElement('button');
        delBtn.className = 'text-xs text-gray-600 hover:text-red-400 opacity-40 group-hover:opacity-100 transition-opacity px-1';
        delBtn.title = 'Excluir missão';
        delBtn.innerText = '🗑️';
        delBtn.onclick = () => deletarMissao(task.id, listType, categoryId);
        topRow.appendChild(delBtn);
    }

    li.appendChild(topRow);

    if (isExtremeWithSubs) {
        const subList = document.createElement('div');
        subList.className = 'pl-7 pt-1 space-y-1.5 border-t border-gray-800 mt-1';
        task.subtarefas.forEach((st, idx) => {
            const subRow = document.createElement('label');
            subRow.className = `flex items-center gap-2 text-xs ${st.done ? 'line-through text-gray-500' : 'text-gray-300'} ${isPending || st.done || isReadOnlyOverview || isLockedByPenalty ? 'cursor-not-allowed' : 'cursor-pointer'}`;
            
            const subCheck = document.createElement('input');
            subCheck.type = 'checkbox';
            subCheck.className = 'w-3.5 h-3.5 accent-cyan-400';
            subCheck.checked = Boolean(st.done);
            subCheck.disabled = Boolean(st.done) || Boolean(task.done) || isPending || isReadOnlyOverview || isLockedByPenalty;
            subCheck.addEventListener('change', () => {
                handleSubtaskToggle(task.id, idx, listType, categoryId);
            });

            const subSpan = document.createElement('span');
            subSpan.textContent = st.text;

            subRow.appendChild(subCheck);
            subRow.appendChild(subSpan);
            subList.appendChild(subRow);
        });
        li.appendChild(subList);
    }

    return li;
}

/**
 * ==========================================
 * SISTEMA DE TIMERS, GERADOR E PENALIDADE
 * ==========================================
 */
function getWeekNumber(d) {
    const localDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    if (localDate.getDay() === 0) {
        localDate.setDate(localDate.getDate() + 1);
    }
    const utc = new Date(Date.UTC(localDate.getFullYear(), localDate.getMonth(), localDate.getDate()));
    utc.setUTCDate(utc.getUTCDate() + 4 - (utc.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
    return Math.ceil((((utc - yearStart) / 86400000) + 1) / 7);
}

let isProcessingReset = false;

async function checkPeriodicResets(now) {
    if (!currentUser || isProcessingReset || isSandboxMode) return;
    const currentDayStr = now.toDateString();
    const currentWeek = getWeekNumber(now);
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let changed = false;
    isProcessingReset = true;

    try {
        if (resetTimestamps.daily !== currentDayStr) {
            const nonPenaltyDailies = periodicQuests.daily.list.filter(t => !t.isPenalty);

            const todayDailies = nonPenaltyDailies.filter(t => 
                t.created_at && new Date(t.created_at).toDateString() === currentDayStr
            );

            if (todayDailies.length >= DAILY_QUOTA) {
                resetTimestamps.daily = currentDayStr;
                const oldDayIds = nonPenaltyDailies
                    .filter(t => t.created_at && new Date(t.created_at).toDateString() !== currentDayStr)
                    .map(t => t.id);

                if (oldDayIds.length > 0) {
                    await supabaseClient.from('quests').delete().in('id', oldDayIds);
                    periodicQuests.daily.list = periodicQuests.daily.list.filter(t => !oldDayIds.includes(t.id));
                }
                changed = true;
            } else {
                const yesterdayDailies = nonPenaltyDailies.filter(t => 
                    !t.created_at || new Date(t.created_at).toDateString() !== currentDayStr
                );
                const failedYesterday = yesterdayDailies.length > 0 && yesterdayDailies.some(t => !t.done);

                resetTimestamps.daily = currentDayStr;
                if (failedYesterday) {
                    await applyDailyPenalty();
                }
                await generateRandomPeriodicQuests('daily');
                changed = true;
            }
        }

        if (resetTimestamps.weekly !== currentWeek) {
            const nonPenaltyWeeklies = periodicQuests.weekly.list.filter(t => !t.isPenalty);
            const todayWeeklies = nonPenaltyWeeklies.filter(t =>
                t.created_at && getWeekNumber(new Date(t.created_at)) === currentWeek
            );

            if (todayWeeklies.length >= WEEKLY_QUOTA) {
                resetTimestamps.weekly = currentWeek;
                const oldWeekIds = nonPenaltyWeeklies
                    .filter(t => t.created_at && getWeekNumber(new Date(t.created_at)) !== currentWeek)
                    .map(t => t.id);
                if (oldWeekIds.length > 0) {
                    await supabaseClient.from('quests').delete().in('id', oldWeekIds);
                    periodicQuests.weekly.list = periodicQuests.weekly.list.filter(t => !oldWeekIds.includes(t.id));
                }
            } else {
                resetTimestamps.weekly = currentWeek;
                await generateRandomPeriodicQuests('weekly');
            }
            changed = true;
        }

        if (resetTimestamps.monthly !== currentMonth) {
            resetTimestamps.monthly = currentMonth;
            periodicQuests.monthly.boxClaimed = false;
            changed = true;
        }

        if (resetTimestamps.yearly !== currentYear) {
            resetTimestamps.yearly = currentYear;
            periodicQuests.yearly.boxClaimed = false;
            changed = true;
        }

        if (changed) {
            syncLockedCategoriesWithActivePenalties();
            await savePlayerToSupabase();
            updatePlayerUI();
            renderTabs();
            renderCategory(activeCategoryId);
            renderPeriodicQuests();
        }
    } finally {
        isProcessingReset = false;
    }
}

function startTimers() {
    setInterval(updateTimers, 1000);
    updateTimers();

    setInterval(() => {
        if (!isSandboxMode && document.visibilityState === 'visible' && currentUser && hasInitialSyncCompleted && !isSyncingSupabase && !isProcessingReset && !isRouletteSpinning) {
            syncAllFromSupabase(true);
        }
    }, AUTO_SYNC_INTERVAL_MS);

    document.addEventListener('visibilitychange', () => {
        if (!isSandboxMode && document.visibilityState === 'visible' && currentUser && !isSyncingSupabase && (Date.now() - lastAutoSyncTime > 3000)) {
            syncAllFromSupabase(true);
        }
    });

    window.addEventListener('focus', () => {
        if (!isSandboxMode && currentUser && !isSyncingSupabase && (Date.now() - lastAutoSyncTime > 3000)) {
            syncAllFromSupabase(true);
        }
    });
}

function updateTimers() {
    const now = new Date();
    if (
        !isSandboxMode &&
        currentUser &&
        hasInitialSyncCompleted &&
        !isSyncingSupabase &&
        !isProcessingReset &&
        (resetTimestamps.daily !== now.toDateString() || resetTimestamps.weekly !== getWeekNumber(now))
    ) {
        syncAllFromSupabase(true);
    }

    updatePenaltyCountdownDisplay();
    
    const nextDay = new Date(now); nextDay.setHours(24, 0, 0, 0);
    document.getElementById('timer-daily').innerText = formatTimeDiff(nextDay - now);

    const nextSunday = new Date(now); 
    nextSunday.setDate(now.getDate() + ((7 - now.getDay()) % 7));
    if (now.getDay() === 0) nextSunday.setDate(now.getDate() + 7);
    nextSunday.setHours(0, 0, 0, 0);
    document.getElementById('timer-weekly').innerText = formatTimeDiffDays(nextSunday - now);

    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0);
    document.getElementById('timer-monthly').innerText = formatTimeDiffDays(nextMonth - now);

    const nextYear = new Date(now.getFullYear() + 1, 0, 1, 0, 0, 0);
    document.getElementById('timer-yearly').innerText = formatTimeDiffDays(nextYear - now);
}

function formatTimeDiff(ms) {
    let s = Math.floor((ms / 1000) % 60), m = Math.floor((ms / (1000 * 60)) % 60), h = Math.floor((ms / (1000 * 60 * 60)) % 24);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}
function formatTimeDiffDays(ms) {
    let d = Math.floor(ms / (1000 * 60 * 60 * 24)), h = Math.floor((ms / (1000 * 60 * 60)) % 24), m = Math.floor((ms / (1000 * 60)) % 60);
    return `${d}d ${h.toString().padStart(2, '0')}h ${m.toString().padStart(2, '0')}m`;
}

init();
