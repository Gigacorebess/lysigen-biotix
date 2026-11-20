// Header colour follows whichever section sits under it. Works without GSAP.
const hdr = document.querySelector('.hdr');
const themed = [...document.querySelectorAll('main [data-theme], footer[data-theme]')];
function syncHeader() {
  const s = themed.find(s => { const r = s.getBoundingClientRect(); return r.top <= 60 && r.bottom > 60; });
  if (s) hdr.dataset.theme = s.dataset.theme;
  hdr.classList.toggle('solid', scrollY > 8);
}
let ticking = false;   // one header check per frame, not per scroll event
addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { ticking = false; syncHeader(); }); } }, { passive: true });
addEventListener('resize', syncHeader);
syncHeader();

// Close the mobile menu after picking a link.
document.querySelectorAll('.menu a').forEach(a => a.addEventListener('click', () => a.closest('details').open = false));
// Tapping the dimmed page behind the phone menu closes it.
const menu = document.querySelector('.menu');
document.addEventListener('click', e => { if (menu.open && !menu.contains(e.target)) menu.open = false; });
menu.addEventListener('click', e => { if (e.target === menu) menu.open = false; });   // the dimmed area is the menu's own ::before

// ---------- Contact panel: every Contact / Get in touch control opens it ----------
const talk = document.querySelector('.talk');
let lenis = null;   // smooth scroll, set up below when GSAP and Lenis load
document.querySelectorAll('a[href="#contact"], .touch').forEach(el => el.addEventListener('click', e => { e.preventDefault(); talk.showModal(); lenis?.stop(); }));
talk.addEventListener('close', () => lenis?.start());
talk.querySelector('.talk-x').addEventListener('click', () => talk.close());
talk.addEventListener('click', e => { if (e.target === talk) talk.close(); });   // click on the backdrop
talk.querySelector('form').addEventListener('submit', e => {
  e.preventDefault();
  // ponytail: opens the visitor's mail app. Swap for a form service (Formspree etc.) once contact@lysigenbiotix.com is live.
  const f = new FormData(e.target);
  const body = `${f.get('message')}\n\n${f.get('first')} ${f.get('last')}\n${f.get('company')}\n${f.get('phone')}\n${f.get('email')}`;
  location.href = `mailto:contact@lysigenbiotix.com?subject=${encodeURIComponent('Website enquiry: ' + f.get('subject'))}&body=${encodeURIComponent(body)}`;
  talk.querySelector('.note').textContent = 'Opening your email app. If nothing happens, write to contact@lysigenbiotix.com.';
});

// ---------- 3D helpers (three.js). Scenes render only when scroll changes them. ----------
const cssColor = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();   // palette tokens from styles.css
const GL = !!window.THREE && (() => { try { return !!document.createElement('canvas').getContext('webgl'); } catch { return false; } })();

function stage(canvas) {
  const r = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  r.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(30, 1, .1, 100);
  cam.position.z = 14;   // visible height at z=0 is 7.5 units
  scene.add(new THREE.HemisphereLight(0xffffff, 0x929da7, 1.050));
  const key = new THREE.DirectionalLight(0xffffff, .9); key.position.set(4, 6, 8); scene.add(key);
  const rim = new THREE.DirectionalLight(cssColor('--coral-ll'), .5); rim.position.set(-6, 2, -4); scene.add(rim);
  let w = 0, h = 0;
  return { scene, kill: () => r.dispose(), draw() {
    const cw = canvas.clientWidth, ch = canvas.clientHeight;
    if (!cw || !ch) return;
    if (cw !== w || ch !== h) { w = cw; h = ch; r.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
    r.render(scene, cam);
  } };
}

// A medicine vial: clear glass, a little teal liquid with tiny bubbles, a wrap-around label, metal collar, teal cap.
// About 4.1 units tall, centred on its middle.
function makeVial() {
  const g = new THREE.Group(), V = (x, y) => new THREE.Vector2(x, y);
  const add = (geo, mat, y = 0, order = 0) => { const m = new THREE.Mesh(geo, mat); m.position.y = y - 2.050; m.renderOrder = order; g.add(m); return m; };
  add(new THREE.CylinderGeometry(.93, .93, 1.900, 48), new THREE.MeshPhongMaterial({ color: cssColor('--accent-l'), transparent: true, opacity: .22, shininess: 80, depthWrite: false }), 1.050, 1);
  add(new THREE.CylinderGeometry(1.065, 1.065, 1.250, 48, 1, true, -1.300, 2.600), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .6, side: THREE.DoubleSide }), 1.500);
  const bubM = new THREE.MeshPhongMaterial({ color: 0xffffff, transparent: true, opacity: .6, shininess: 140, depthWrite: false });
  const bubG = new THREE.SphereGeometry(1, 12, 10);
  for (let i = 0; i < 22; i++) {
    const a = Math.random() * 6.283, d = Math.random() * .8;
    const b = add(bubG, bubM, .2 + Math.random() * 1.700, 1);
    b.scale.setScalar(.022 + Math.random() * .045); b.position.x = Math.sin(a) * d; b.position.z = Math.cos(a) * d;
  }
  add(new THREE.LatheGeometry([V(0, 0), V(.95, 0), V(1.050, .1), V(1.050, 2.600), V(.9, 2.950), V(.55, 3.150), V(.55, 3.450), V(.68, 3.500), V(.68, 3.650)], 64),
    new THREE.MeshPhongMaterial({ color: 0xe6eef0, transparent: true, opacity: .24, shininess: 170, specular: cssColor('--coral-ll'), side: THREE.DoubleSide, depthWrite: false }), 0, 2);
  add(new THREE.CylinderGeometry(.74, .74, .42, 48), new THREE.MeshStandardMaterial({ color: 0xd5dbe6, metalness: .6, roughness: .25 }), 3.620);
  add(new THREE.CylinderGeometry(.79, .79, .3, 48), new THREE.MeshStandardMaterial({ color: cssColor('--accent-d'), metalness: .35, roughness: .3 }), 3.960);
  return g;
}

// Everything below is enhancement: the page is complete and readable without it.
if (window.gsap && window.ScrollTrigger) {
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });   // no jump when the phone address bar hides
  const SCRUB = .5;   // seconds a scrubbed animation trails the scroll; Lenis adds the glide on top

  // Smooth, inertial scrolling (Lenis) driven by GSAP's ticker so pinned scenes move in step with the page.
  if (window.Lenis && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    lenis = new Lenis({ lerp: .085, wheelMultiplier: .9 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    document.querySelectorAll('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
      const id = a.getAttribute('href'), t = id.length > 1 && id !== '#contact' && document.querySelector(id);
      if (!t) return;
      e.preventDefault();
      lenis.scrollTo(t, { offset: -(parseFloat(getComputedStyle(t).scrollMarginTop) || 0), duration: 1.6 });
    }));
  }

  // Split [data-split] paragraphs into words for the scroll-driven reveal.
  document.querySelectorAll('[data-split]').forEach(p => {
    p.innerHTML = p.textContent.trim().split(/\s+/).map(w => `<span class="w">${w}</span>`).join(' ');
  });

  const mm = gsap.matchMedia();

  mm.add('(prefers-reduced-motion: no-preference)', () => {
    // Items entering together (cards, table rows) glide in one after another.
    gsap.set('.reveal', { autoAlpha: 0, y: 40 });
    ScrollTrigger.batch('.reveal', {
      start: 'top 92%', once: true,
      onEnter: els => gsap.to(els, { autoAlpha: 1, y: 0, duration: 1.4, ease: 'expo.out', stagger: .09, overwrite: true })
    });
    gsap.to('.lens', { yPercent: 30, ease: 'none', scrollTrigger: { trigger: '.life-hero', start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.from('.partner .tube', { yPercent: 60, ease: 'none', scrollTrigger: { trigger: '.partner', start: 'top bottom', end: 'bottom bottom', scrub: true } });
  });

  // Pinned, scrubbed sections: desktop only.
  mm.add('(prefers-reduced-motion: no-preference) and (min-width: 900px)', () => {
    const root = document.documentElement;
    root.classList.add('motion');
    root.classList.toggle('gl', GL);
    const stages = [];
    const mk = sel => { const s = stage(document.querySelector(sel)); stages.push(s); return s; };

    // ===== Hero (follows the reference video, 0-9 s):
    //   the gradient intro slides away -> teal statement -> a diamond window rises and fills the screen ->
    //   one glass bubble becomes two, they orbit and shrink -> small bubbles drift up -> a 3D vial sweeps past
    //   and settles in a glass frame -> a white page wipes up, the frame becomes a mist panel and opens out. =====
    const heroSec = document.querySelector('.hero');
    const dia = document.querySelector('.dia'), A = document.querySelector('.orb-a'), B = document.querySelector('.orb-b');
    const bubs = document.querySelector('.bubs'), vialCv = document.querySelector('.hero-vial');
    bubs.innerHTML = Array.from({ length: 16 }, () => {
      const d = 2 + Math.random() * 10;
      return `<i class="bub" style="width:${d}vh;height:${d}vh;left:${4 + Math.random() * 90}%;top:${12 + Math.random() * 80}%"></i>`;
    }).join('');
    // s: diamond scale, ty: 1 = diamond parked at the bottom (1.9 = out of sight), d/ang: polar offset of the two circles, sc: circle scale
    const st = { s: .35, ty: 1.9, d: 0, ang: 0, sc: 1, gx: 0, gy: 0 };
    const v = { sc: 5, x: -1.200, y: -1.500, rz: .5, ry: 0, o: 0 };   // hero vial
    const WIPE = 1.62;   // timeline time at which the white page starts to wipe up
    let heroStage, heroVial, heroTl;
    if (GL) { heroStage = mk('.hero-vial'); heroVial = makeVial(); heroStage.scene.add(heroVial); }
    const renderHero = () => {
      const W = innerWidth, H = innerHeight, m = Math.min(W, H);
      dia.style.setProperty('--s', st.s);
      dia.style.setProperty('--ty', st.ty * (.28 * H + .247 * m) + 'px');
      const k = Math.min(1, st.s * .9 * m / (.62 * H)) * st.sc, dx = Math.cos(st.ang) * st.d * H, dy = Math.sin(st.ang) * st.d * H;
      A.style.transform = `translate(${st.gx * W - dx}px,${st.gy * H - dy}px) scale(${k})`;
      B.style.transform = `translate(${st.gx * W + dx}px,${st.gy * H + dy}px) scale(${k})`;
      const theme = heroTl && heroTl.time() > WIPE + .1 ? 'light' : 'dark';   // header flips once the white page is up
      if (heroSec.dataset.theme !== theme) { heroSec.dataset.theme = theme; syncHeader(); }
      if (!GL) return;
      vialCv.style.opacity = v.o;
      if (v.o < .01) return;
      heroVial.scale.setScalar(v.sc); heroVial.position.set(v.x, v.y, 0); heroVial.rotation.set(0, v.ry, v.rz);
      heroStage.draw();
    };
    gsap.set('.hero-white', { clipPath: 'inset(100% 0% 0% 0%)' });
    heroTl = gsap.timeline({ defaults: { ease: 'power2.inOut' }, scrollTrigger: {
      trigger: '.hero-pin', start: 'top top', end: '+=540%', pin: true, scrub: SCRUB, onUpdate: renderHero, onRefresh: renderHero
    } })
      .to('.hero-intro', { yPercent: -100, ease: 'none', duration: .16 }, 0)
      .fromTo('.statement', { y: '22vh' }, { y: 0, ease: 'none', duration: .16 }, 0)
      .to(st, { ty: 1, ease: 'power2.out', duration: .1 }, .15)
      .to(st, { s: 2.700, ty: 0, duration: .2 }, .25)
      .to('.statement', { autoAlpha: 0, duration: .06 }, .37)
      .to(st, { d: .2, duration: .16 }, .46)
      .to(st, { ang: Math.PI / 2, d: .31, duration: .2 }, .63)
      .to(st, { ang: .6, d: .16, sc: .55, gx: .07, gy: -.04, duration: .2 }, .84)
      .to('.bub', { opacity: 1, duration: .1, stagger: .006 }, .9)
      .fromTo('.bub', { y: 120 }, { y: -160, ease: 'none', duration: .5 }, .9)
      .to('.hero-what, .hero-stats.a', { opacity: 1, duration: .1 }, .98);
    if (GL) heroTl
      .to('.orbs', { opacity: 0, duration: .12 }, 1.140)
      .to(v, { o: 1, duration: .06 }, 1.140)
      .to(v, { sc: .5, x: 0, y: .15, rz: -.32, ry: Math.PI * 2 + .5, duration: .4 }, 1.140)
      .to('.bub', { opacity: 0, duration: .1 }, 1.350)
      .fromTo('.hero-lens', { opacity: 0, scale: 2.600 }, { opacity: 1, scale: 1, duration: .24 }, 1.300)
      .to('.hero-stats.a', { opacity: 0, duration: .06 }, 1.360)
      .to('.hero-stats.b', { opacity: 1, duration: .08 }, 1.440);
    heroTl
      .to('.hero-white', { clipPath: 'inset(0% 0% 0% 0%)', duration: .2 }, WIPE)
      .to('.hero-what, .hero-stats', { autoAlpha: 0, duration: .08 }, WIPE)
      .fromTo('.hw-panel', { scale: 1 }, { scale: 1.900, duration: .2 }, WIPE + .2);   // then the next section scrolls it away

    // ===== We know → Our goal: the vial sharpens from a blur, then becomes a row of vials. =====
    const k = { blur: 16, sp: 0, ry: -.7 };
    const knowCv = document.querySelector('.know-vial');
    let knowStage, row = [];
    if (GL) { knowStage = mk('.know-vial'); row = [0, 1, 2, 3].map(() => { const g = makeVial(); knowStage.scene.add(g); return g; }); }
    const renderKnow = () => {
      if (!GL) return;
      row.forEach((g, i) => { g.scale.setScalar(.78 * (1 - i * .07)); g.position.set((i - 1.100) * k.sp, i * .04, -i * 1.200); g.rotation.y = k.ry; });
      knowCv.style.filter = k.blur > .3 ? `blur(${k.blur}px)` : 'none';
      knowStage.draw();
    };
    gsap.timeline({ scrollTrigger: { trigger: '.know-pin', start: 'top top', end: '+=200%', pin: true, scrub: SCRUB, onUpdate: renderKnow, onRefresh: renderKnow } })
      .to(k, { blur: 0, ry: 0, duration: .3 }, 0)
      .from('.s1 .know-label', { scale: 2.400, duration: .2, ease: 'power2.inOut' }, 0)   // video 9-10 s: big "We know" settles to its label size
      .from('.s1 .w', { opacity: .12, stagger: .02, duration: .05 }, .14)
      .to('.s1', { autoAlpha: 0, y: -40, duration: .12 }, '+=.1')
      .addLabel('goal')
      .from('.s2', { autoAlpha: 0, y: 40, duration: .12 }, 'goal')
      .to(k, { sp: .85, ry: .45, duration: .4 }, 'goal')
      .from('.s2 .w', { opacity: .12, stagger: .02, duration: .05 }, 'goal+=.1')
      .from('.s2 .extra', { autoAlpha: 0, y: 16, stagger: .05, duration: .1 })
      .to({}, { duration: .1 });

    // ===== Key pillars: scroll picks the active pillar, draws the ring, and twists a 3D helix of rods. =====
    let helixStage, rods = [], helix;
    if (GL) {
      helixStage = mk('.helix');
      helix = new THREE.Group(); helixStage.scene.add(helix);
      const tube = new THREE.CylinderGeometry(.3, .3, 3.600, 40, 1, true).rotateZ(Math.PI / 2);
      const bore = new THREE.CylinderGeometry(.25, .25, 3.600, 40, 1, true).rotateZ(Math.PI / 2);
      const lipG = new THREE.TorusGeometry(.275, .028, 10, 40).rotateY(Math.PI / 2);
      const glass = new THREE.MeshPhongMaterial({ color: 0xf3f8f8, specular: 0xffffff, shininess: 150 });
      const inside = new THREE.MeshPhongMaterial({ color: 0xc4b4b8, specular: 0xffffff, shininess: 60, side: THREE.BackSide });   // pink-grey bore, as in the video
      const lip = new THREE.MeshPhongMaterial({ color: cssColor('--coral-l'), specular: 0xffffff, shininess: 90 });
      for (let i = -7; i <= 7; i++) {
        const t = new THREE.Group();
        t.add(new THREE.Mesh(tube, glass), new THREE.Mesh(bore, inside));
        [-1.800, 1.800].forEach(x => { const l = new THREE.Mesh(lipG, lip); l.position.x = x; t.add(l); });
        t.position.y = i * .6; helix.add(t); rods.push(t);
      }
      helix.scale.setScalar(.95); helix.rotation.order = 'ZYX';   // spin about its own axis first, then tilt
    }
    const sets = ['.p-item', '.p-tabs li', '.p-stat', '.dots i'].map(q => [...document.querySelectorAll(q)]);
    const arc = document.querySelector('.ring .arc');
    let current = -1;
    const renderPillars = s => {
      const p = s.progress;
      arc.style.strokeDashoffset = 1 - p;
      if (GL) {
        const tw = .08 + .22 * (.5 - .5 * Math.cos(p * Math.PI * 3));   // twist breathes three times across the section
        rods.forEach((rod, n) => rod.rotation.y = (n - 7) * tw);
        helix.rotation.set(0, p * 5, .85 - p * 1.700);
        helixStage.draw();
      }
      const i = Math.min(3, Math.floor(p * 4));
      if (i === current) return;
      current = i;
      sets.forEach(set => set.forEach((el, n) => el.classList.toggle('is-active', n === i)));
    };
    ScrollTrigger.create({ trigger: '.pillars-pin', start: 'top top', end: '+=120%', pin: true, onUpdate: renderPillars, onRefresh: renderPillars });

    return () => {
      root.classList.remove('motion', 'gl');
      bubs.innerHTML = '';
      [dia, A, B, vialCv, knowCv].forEach(el => el.removeAttribute('style'));
      gsap.set('.hero-intro, .statement, .hero-white, .hw-panel, .hero-what, .hero-stats, .hero-lens, .orbs', { clearProps: 'all' });
      stages.forEach(s => s.kill());
    };
  });

  // Reveal triggers were created before the pins above them; re-measure in page order.
  ScrollTrigger.sort();
  ScrollTrigger.refresh();
}

// Design-option switcher (only shown when the URL has ?option=).
document.querySelector(`.palette a[href="?option=${document.documentElement.dataset.palette}"]`)?.setAttribute('aria-current', 'true');
