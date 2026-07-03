(() => {
  'use strict';

  /* ── State ── */
  let _ctx = null, _master = null;
  let _muted = localStorage.getItem('rj-snd') === '0';
  let _unlocked = false;
  let _ambGain = null, _ambRunning = false;
  let _noiseBuf = null;

  /* ── AudioContext (lazy) ── */
  function ac() {
    if (!_ctx) {
      _ctx = new (window.AudioContext || window.webkitAudioContext)();
      _master = _ctx.createGain();
      _master.gain.value = _muted ? 0 : 0.75;
      _master.connect(_ctx.destination);
    }
    if (_ctx.state === 'suspended') _ctx.resume();
    return _ctx;
  }

  /* ── Pink noise buffer (computed once after unlock) ── */
  function mkNoise() {
    if (_noiseBuf) return _noiseBuf;
    const c = ac(), len = c.sampleRate * 4;
    _noiseBuf = c.createBuffer(1, len, c.sampleRate);
    const d = _noiseBuf.getChannelData(0);
    let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99886*b0 + w*0.0555179;
      b1 = 0.99332*b1 + w*0.0750759;
      b2 = 0.96900*b2 + w*0.1538520;
      b3 = 0.86650*b3 + w*0.3104856;
      b4 = 0.55000*b4 + w*0.5329522;
      b5 = -0.7616*b5  - w*0.0168980;
      d[i] = (b0+b1+b2+b3+b4+b5+b6 + w*0.5362) / 9;
      b6 = w * 0.115926;
    }
    return _noiseBuf;
  }

  /* ── Ambient: deep room tone + sub hum, modulated by scroll speed ── */
  let _ambLp = null, _ambSub = null, _scrollVel = 0;

  function startAmbient() {
    if (_ambRunning) return;
    _ambRunning = true;
    const c = ac(), now = c.currentTime;

    _ambGain = c.createGain();
    _ambGain.gain.value = 0;
    _ambGain.connect(_master);

    /* Pink noise → low-pass → deep room presence */
    const ns = c.createBufferSource();
    ns.buffer = mkNoise(); ns.loop = true;
    _ambLp = c.createBiquadFilter();
    _ambLp.type = 'lowpass'; _ambLp.frequency.value = 260; _ambLp.Q.value = 0.6;
    ns.connect(_ambLp); _ambLp.connect(_ambGain); ns.start();

    /* Sub sine hum — almost felt, barely heard */
    _ambSub = c.createOscillator();
    _ambSub.type = 'sine'; _ambSub.frequency.value = 48;
    const sg = c.createGain(); sg.gain.value = 0.028;
    _ambSub.connect(sg); sg.connect(_ambGain); _ambSub.start();

    /* Slow fade-in over 5 s */
    _ambGain.gain.setTargetAtTime(0.058, now, 5.0);
  }

  /* Scroll drives ambient: filter opens up and pitch rises with speed */
  function onScroll(speed) {
    if (!_ambRunning || !_ambLp) return;
    const c = ac(), now = c.currentTime;
    const clamped = Math.min(speed / 18, 1);          // 0–1 normalised
    const targetFreq = 260 + clamped * 1100;           // 260 Hz idle → 1360 Hz fast
    const targetVol  = 0.058 + clamped * 0.10;        // ambient swells with speed
    const targetPitch = 48 + clamped * 28;             // sub rises from 48→76 Hz
    _ambLp.frequency.setTargetAtTime(targetFreq,  now, 0.18);
    _ambGain.gain.setTargetAtTime(targetVol,      now, 0.18);
    _ambSub.frequency.setTargetAtTime(targetPitch, now, 0.18);
  }

  /* Decay scroll velocity back to rest each frame */
  setInterval(() => {
    if (_scrollVel <= 0) return;
    _scrollVel *= 0.88;
    if (_scrollVel < 0.1) _scrollVel = 0;
    onScroll(_scrollVel);
  }, 16);

  /* ── One-shot synthesised sound ── */
  function oneshot({ freq=440, type='sine', dur=0.2, vol=0.1, bend=null, noisy=false }) {
    if (!_unlocked) return;
    const c = ac(), now = c.currentTime;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    g.connect(_master);

    if (noisy) {
      const ns = c.createBufferSource();
      ns.buffer = mkNoise(); ns.loop = true;
      const bp = c.createBiquadFilter();
      bp.type = 'bandpass'; bp.frequency.value = freq; bp.Q.value = 1.4;
      ns.connect(bp); bp.connect(g);
      ns.start(); ns.stop(now + dur);
    } else {
      const o = c.createOscillator();
      o.type = type;
      o.frequency.setValueAtTime(freq, now);
      if (bend) o.frequency.exponentialRampToValueAtTime(bend, now + dur);
      o.connect(g); o.start(); o.stop(now + dur);
    }
  }

  /* ── Named sounds ── */
  const SND = {
    artHover:  () => oneshot({ freq:2100, type:'sine',     dur:0.22, vol:0.048 }),
    artDrag:   () => oneshot({ freq:210,  type:'sine',     dur:0.15, vol:0.085, bend:130 }),
    section:   () => oneshot({ freq:620,  noisy:true,      dur:0.44, vol:0.062 }),
    svcOpen:   () => oneshot({ freq:340,  type:'triangle', dur:0.28, vol:0.088, bend:490 }),
    svcClose:  () => oneshot({ freq:490,  type:'triangle', dur:0.28, vol:0.088, bend:270 }),
    nameHover: () => oneshot({ freq:1350, type:'sine',     dur:0.30, vol:0.030, bend:950 }),
    roleHover: () => oneshot({ freq:1850, type:'sine',     dur:0.17, vol:0.036 }),
  };

  /* ── Mute toggle ── */
  function setMute(on) {
    _muted = on;
    localStorage.setItem('rj-snd', on ? '0' : '1');
    if (_master) _master.gain.setTargetAtTime(on ? 0 : 0.75, ac().currentTime, 0.28);
    const btn = document.getElementById('snd-toggle');
    if (btn) {
      btn.setAttribute('aria-label', on ? 'Unmute sound' : 'Mute sound');
      btn.classList.toggle('is-muted', on);
    }
  }

  /* ── Unlock AudioContext on first real interaction ── */
  function unlock() {
    if (_unlocked) return;
    _unlocked = true;
    startAmbient();
  }
  ['click', 'keydown', 'wheel', 'touchstart'].forEach(ev =>
    document.addEventListener(ev, unlock, { passive: true })
  );

  /* ── Mute button wiring (runs after DOM ready) ── */
  function wireButton() {
    const btn = document.getElementById('snd-toggle');
    if (!btn) return;
    btn.classList.toggle('is-muted', _muted);
    btn.setAttribute('aria-label', _muted ? 'Unmute sound' : 'Mute sound');
    btn.addEventListener('click', () => setMute(!_muted));
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wireButton);
  } else {
    wireButton();
  }

  /* ── Scroll → ambient swell (silenced when any panel is open) ── */
  window.addEventListener('wheel', e => {
    if (!_unlocked) return;
    if (window.isPanelOpen && window.isPanelOpen()) return;
    _scrollVel = Math.min(_scrollVel + Math.abs(e.deltaY) * 0.18, 28);
    onScroll(_scrollVel);
  }, { passive: true });

  /* ── Section switch ── */
  window.addEventListener('portfolio:modechange', () => SND.section());

  /* ── Services panel open / close ── */
  let _wasSvc = false;
  new MutationObserver(() => {
    const open = document.body.classList.contains('svc-open');
    if (open && !_wasSvc) SND.svcOpen();
    if (!open && _wasSvc) SND.svcClose();
    _wasSvc = open;
  }).observe(document.body, { attributes: true, attributeFilter: ['class'] });

  /* ── Name + role hover (silent when a panel is open) ── */
  document.addEventListener('mouseover', e => {
    if (window.isPanelOpen && window.isPanelOpen()) return;
    const cl = e.target.classList;
    if (cl.contains('role-item'))                                      SND.roleHover();
    else if (cl.contains('first-name') || cl.contains('last-name'))   SND.nameHover();
  });

  /* ── Public API (artwork-3d-bg.js calls these) ── */
  window.SoundEngine = { ...SND, setMute, isMuted: () => _muted };
})();
