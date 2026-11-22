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
// Each scene owns its WebGL resources. Resizing across the layout breakpoint releases them.
const GL = !!window.THREE && (() => {
  const probe = document.createElement('canvas').getContext('webgl');
  probe?.getExtension('WEBGL_lose_context')?.loseContext();
  return !!probe;
})();

function stage(canvas) {
  const r = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
  r.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(30, 1, .1, 100);
  cam.position.z = 14;
  scene.add(new THREE.HemisphereLight(0xffffff, 0x929da7, 1.050));
  const key = new THREE.DirectionalLight(0xffffff, .9);
  key.position.set(4, 6, 8);
  scene.add(key);
  const rim = new THREE.DirectionalLight(cssColor('--coral-ll'), .5);   // pink glints on glass, as in the reference video
  rim.position.set(-6, 2, -4);
  scene.add(rim);
  let w = 0, h = 0;
  function draw() {
    if (!canvas.clientWidth || !canvas.clientHeight) return;
    if (canvas.clientWidth !== w || canvas.clientHeight !== h) {
      w = canvas.clientWidth; h = canvas.clientHeight;
      r.setSize(w, h, false);
      cam.aspect = w / h;
      cam.updateProjectionMatrix();
    }
    if (r.getContext().isContextLost()) return false;
    r.render(scene, cam);
    return true;
  }
  function kill() {
    const resources = new Set();
    scene.traverse(obj => {
      if (!obj.isMesh) return;
      resources.add(obj.geometry);
      resources.add(obj.material);
      if (obj.material.map) resources.add(obj.material.map);
    });
    resources.forEach(resource => resource.dispose());
    r.dispose();
  }
  return { scene, draw, kill };
}

function vialLabel() {
  const label = document.createElement('canvas');
  label.width = 512; label.height = 224;
  const ctx = label.getContext('2d');
  ctx.fillStyle = '#f3f8f6'; ctx.fillRect(0, 0, 512, 224);
  ctx.fillStyle = cssColor('--accent-d'); ctx.fillRect(0, 188, 512, 36);
  ctx.textAlign = 'center';
  ctx.font = 'bold 54px Arial'; ctx.fillText('lysigen', 256, 103);
  ctx.font = '26px Arial'; ctx.fillText('B I O T I X', 256, 149);
  return new THREE.CanvasTexture(label);
}

// A medicine vial: clear glass, a little teal liquid with tiny bubbles, a wrap-around label, metal collar, teal cap.
// About 4.1 units tall, centred on its middle.
function makeVial() {
  const g = new THREE.Group(), V = (x, y) => new THREE.Vector2(x, y);
  const add = (geo, mat, y = 0, order = 0) => { const m = new THREE.Mesh(geo, mat); m.position.y = y - 2.050; m.renderOrder = order; g.add(m); return m; };
  add(new THREE.CylinderGeometry(.93, .93, 1.900, 48), new THREE.MeshPhongMaterial({ color: cssColor('--accent'), transparent: true, opacity: .46, shininess: 80, depthWrite: false }), 1.050, 1);
  add(new THREE.CylinderGeometry(1.065, 1.065, 1.250, 48, 1, true, -1.300, 2.600), new THREE.MeshStandardMaterial({ map: vialLabel(), roughness: .58, side: THREE.DoubleSide }), 1.500);
  const seal = new THREE.MeshStandardMaterial({ color: cssColor('--accent-d'), metalness: .2, roughness: .3 });
  add(new THREE.TorusGeometry(.925, .022, 8, 48).rotateX(Math.PI / 2), seal, 2.0, 1);
  const bubM = new THREE.MeshPhongMaterial({ color: 0xffffff, transparent: true, opacity: .6, shininess: 140, depthWrite: false });
  const bubG = new THREE.SphereGeometry(1, 12, 10);
  for (let i = 0; i < 12; i++) {
    const a = i * 2.4, d = .35 + (i % 4) * .14;
    const b = add(bubG, bubM, .24 + ((i * 7) % 12) * .14, 1);
    b.scale.setScalar(.026 + (i % 3) * .014); b.position.x = Math.sin(a) * d; b.position.z = Math.cos(a) * d;
  }
  add(new THREE.LatheGeometry([V(0, 0), V(.95, 0), V(1.050, .1), V(1.050, 2.600), V(.9, 2.950), V(.55, 3.150), V(.55, 3.450), V(.68, 3.500), V(.68, 3.650)], 64),
    new THREE.MeshPhongMaterial({ color: 0xc1d4d5, transparent: true, opacity: .19, shininess: 170, specular: cssColor('--coral-ll'), side: THREE.DoubleSide, depthWrite: false }), 0, 2);
  add(new THREE.CylinderGeometry(.74, .74, .42, 48), new THREE.MeshStandardMaterial({ color: 0xd5dbe6, metalness: .6, roughness: .25 }), 3.620);
  add(new THREE.CylinderGeometry(.79, .79, .3, 48), new THREE.MeshStandardMaterial({ color: cssColor('--accent-d'), metalness: .35, roughness: .3 }), 3.960);
  const foot = new THREE.MeshPhongMaterial({ color: 0x96b7b8, transparent: true, opacity: .54, depthWrite: false });
  add(new THREE.TorusGeometry(.97, .043, 8, 48).rotateX(Math.PI / 2), foot, .10, 2);
  add(new THREE.TorusGeometry(.744, .024, 8, 48).rotateX(Math.PI / 2), seal, 3.81);
  return g;
}

function makeHelix() {
  const helix = new THREE.Group(), rods = [];
  const tube = new THREE.CylinderGeometry(.3, .3, 3.600, 40, 1, true).rotateZ(Math.PI / 2);
  const bore = new THREE.CylinderGeometry(.25, .25, 3.600, 40, 1, true).rotateZ(Math.PI / 2);
  const lipG = new THREE.TorusGeometry(.275, .028, 10, 40).rotateY(Math.PI / 2);
  const glass = new THREE.MeshPhongMaterial({ color: 0xf3f8f8, specular: 0xffffff, shininess: 150 });   // white glass tubes
  const inside = new THREE.MeshPhongMaterial({ color: 0xc4b4b8, specular: 0xffffff, shininess: 60, side: THREE.BackSide });   // pink-grey bore, as in the video
  const lip = new THREE.MeshPhongMaterial({ color: cssColor('--coral-l'), specular: 0xffffff, shininess: 90 });   // pink rims
  const strand = new THREE.MeshPhongMaterial({ color: cssColor('--accent-l'), specular: 0xffffff, shininess: 90 });
  for (let i = -7; i <= 7; i++) {
    const t = new THREE.Group();
    t.add(new THREE.Mesh(tube, glass), new THREE.Mesh(bore, inside));
    [-1.800, 1.800].forEach(x => { const l = new THREE.Mesh(lipG, lip); l.position.x = x; t.add(l); });
    t.position.y = i * .6; helix.add(t); rods.push(t);
  }
  helix.scale.setScalar(.80); helix.rotation.order = 'ZYX';   // spin about its own axis first, then tilt
  // One instanced mesh connects both ends of successive rungs into two fine strands.
  const links = new THREE.InstancedMesh(new THREE.CylinderGeometry(.075, .075, 1, 10), strand, (rods.length - 1) * 2);
  helix.add(links);
  const link = new THREE.Object3D(), start = new THREE.Vector3(), end = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0), direction = new THREE.Vector3();
  let previousTwist;
  function twist(angle) {
    if (angle === previousTwist) return;
    previousTwist = angle;
    rods.forEach((rod, i) => { rod.rotation.y = (i - 7) * angle; });
    for (let i = 0; i < rods.length - 1; i++) {
      for (let side = 0; side < 2; side++) {
        const x = side ? 1.72 : -1.72;
        start.set(x, 0, 0).applyQuaternion(rods[i].quaternion).add(rods[i].position);
        end.set(x, 0, 0).applyQuaternion(rods[i+1].quaternion).add(rods[i+1].position);
        direction.subVectors(end, start);
        link.scale.y = direction.length();
        link.quaternion.setFromUnitVectors(up, direction.normalize());
        link.position.lerpVectors(start, end, .5);
        link.updateMatrix();
        links.setMatrixAt(2 * i + side, link.matrix);
      }
    }
    links.instanceMatrix.needsUpdate = true;
  }
  return { helix, twist };
}

// Pipeline: a rack of six glass test tubes, one per programme, filled to different levels.
// The levels are decorative, not a stage chart.
function makePipeline() {
  const group = new THREE.Group();
  const glass = new THREE.MeshPhongMaterial({ color: 0xe6eef0, transparent: true, opacity: .3, shininess: 170, specular: cssColor('--coral-ll'), side: THREE.DoubleSide, depthWrite: false });
  const liquid = new THREE.MeshPhongMaterial({ color: cssColor('--accent-d'), transparent: true, opacity: .82, shininess: 60, depthWrite: false });
  const surface = new THREE.MeshPhongMaterial({ color: cssColor('--accent-l'), shininess: 120 });
  const lip = new THREE.MeshPhongMaterial({ color: cssColor('--coral-l'), specular: 0xffffff, shininess: 90 });
  const metal = new THREE.MeshStandardMaterial({ color: 0xc6d4d5, metalness: .3, roughness: .3 });
  const cap = new THREE.MeshStandardMaterial({ color: cssColor('--accent-d'), metalness: .35, roughness: .3 });
  const R = .26, H = 2.900, r = .225;
  const wall = new THREE.CylinderGeometry(R, R, H, 40, 1, true);
  const bottom = new THREE.SphereGeometry(R, 40, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
  const fluid = new THREE.CylinderGeometry(r, r, 1, 40);
  const fluidEnd = new THREE.SphereGeometry(r, 40, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
  const top = new THREE.CircleGeometry(r, 40).rotateX(-Math.PI / 2);
  const rimG = new THREE.TorusGeometry(R + .012, .03, 10, 40).rotateX(Math.PI / 2);
  const capG = new THREE.CylinderGeometry(R + .045, R + .045, .34, 40);
  const levels = [.42, .66, .86, .58, .34, .24], capped = [false, true, false, false, true, false];
  levels.forEach((level, i) => {
    const t = new THREE.Group(), x = (i - 2.500) * .74;
    const add = (geo, mat, y, order = 0) => { const m = new THREE.Mesh(geo, mat); m.position.y = y; m.renderOrder = order; t.add(m); return m; };
    const h = level * (H - .3);
    const col = add(fluid, liquid, h / 2, 1); col.scale.y = h;
    add(fluidEnd, liquid, 0, 1);
    add(top, surface, h + .002, 1);
    add(wall, glass, H / 2, 2);
    add(bottom, glass, 0, 2);
    if (capped[i]) add(capG, cap, H + .1); else add(rimG, lip, H);
    t.position.set(x, -1.450, 0);
    group.add(t);
  });
  // Rack: a base, two rails the tubes pass through, and end posts.
  const box = (w, h, d, y, z = 0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), metal); m.position.set(0, y, z); group.add(m); };
  box(4.900, .12, 1.100, -1.700);
  box(4.900, .07, .8, -.700);
  box(4.900, .07, .8, .350);
  [-2.400, 2.400].forEach(x => { const post = new THREE.Mesh(new THREE.BoxGeometry(.09, 2.150, .8), metal); post.position.set(x, -.600, 0); group.add(post); });
  return group;
}

// Inline models track native scrolling. A poster remains visible until the first frame.
function inlineScenes(compact) {
  const containers = [...document.querySelectorAll(compact
    ? '.intro-model, .know-art, .d-inner, .pipe-model' : '.pipe-model')];
  const active = new Set(), models = new Map();
  let frame = 0;
  function render() {
    frame = 0;
    for (const host of active) {
      let entry = models.get(host);
      if (!entry) {
        const canvas = host.querySelector('canvas');
        let view;
        try {
          view = stage(canvas);
        } catch {
          visibility.unobserve(host);
          active.delete(host);
          continue;
        }
        const pipe = host.matches('.pipe-model'), dna = host.matches('.d-inner');
        const assembly = dna ? makeHelix() : null;
        const object = pipe ? makePipeline() : dna ? assembly.helix : makeVial();
        view.scene.add(object);
        const lost = () => host.classList.remove('model-ready');
        canvas.addEventListener('webglcontextlost', lost);
        canvas.addEventListener('webglcontextrestored', schedule);
        entry = { view, object, pipe, assembly, canvas, lost };
        models.set(host, entry);
      }
      const { view, object, pipe, assembly } = entry;
      const rect = host.getBoundingClientRect();
      const progress = Math.max(0, Math.min(1, (innerHeight - rect.top) / (innerHeight + rect.height)));
      if (assembly) {
        assembly.twist(.32);
        object.rotation.set(.04, .3 + progress * 1.25, -.36);
        object.scale.setScalar(.68);
      } else if (pipe) {
        object.rotation.set(.22, -.62 + progress * .5, 0);
        object.scale.setScalar(.98);
      } else {
        object.rotation.set(.08, -.34 + progress * .65, host.matches('.intro-model') ? -.32 : .23);
        object.scale.setScalar(1.28);
      }
      host.classList.toggle('model-ready', !!view.draw());
    }
  }
  function schedule() {
    if (active.size && !frame) frame = requestAnimationFrame(render);
  }
  const visibility = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.isIntersecting) active.add(entry.target);
      else active.delete(entry.target);
    }
    schedule();
  });
  const sizes = new ResizeObserver(schedule);
  containers.forEach(host => { visibility.observe(host); sizes.observe(host); });
  addEventListener('scroll', schedule, { passive: true });
  return () => {
    cancelAnimationFrame(frame);
    visibility.disconnect(); sizes.disconnect();
    removeEventListener('scroll', schedule);
    models.forEach(({ view, canvas, lost }, host) => {
      canvas.removeEventListener('webglcontextlost', lost);
      canvas.removeEventListener('webglcontextrestored', schedule);
      host.classList.remove('model-ready');
      view.kill();
    });
  };
}

if (GL) {
  const compact = matchMedia('(max-width: 899px), (max-height: 599px)');
  const motion = matchMedia('(prefers-reduced-motion: no-preference)');
  let cleanup;
  function configureInlineModels() {
    cleanup?.();
    cleanup = motion.matches ? inlineScenes(compact.matches) : null;
  }
  compact.addEventListener('change', configureInlineModels);
  motion.addEventListener('change', configureInlineModels);
  configureInlineModels();
}

// Everything below is enhancement: the page is complete and readable without it.
if (window.gsap && window.ScrollTrigger) {
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });   // no jump when the phone address bar hides
  const SCRUB = .5;   // seconds a scrubbed animation trails the scroll; Lenis adds the glide on top

  // Smooth, inertial scrolling (Lenis) driven by GSAP's ticker so pinned scenes move in step with the page.
  const mm = gsap.matchMedia();
  mm.add('(min-width: 900px) and (min-height: 600px) and (pointer: fine) and (prefers-reduced-motion: no-preference)', () => {
    if (!window.Lenis) return;
    lenis = new Lenis({ lerp: .085, wheelMultiplier: .9 });
    lenis.on('scroll', ScrollTrigger.update);
    const tick = time => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    const followAnchor = event => {
      const anchor = event.target.closest('a[href^="#"]');
      const id = anchor?.getAttribute('href');
      if (!id || id === '#' || id === '#contact') return;
      const target = document.getElementById(id.slice(1));
      if (!target) return;
      event.preventDefault();
      lenis.scrollTo(target, { offset: -(parseFloat(getComputedStyle(target).scrollMarginTop) || 0), duration: 1.6 });
    };
    document.addEventListener('click', followAnchor);
    return () => {
      document.removeEventListener('click', followAnchor);
      gsap.ticker.remove(tick);
      lenis.destroy(); lenis = null;
    };
  });

  // Split [data-split] paragraphs into words for the scroll-driven reveal.
  document.querySelectorAll('[data-split]').forEach(p => {
    p.innerHTML = p.textContent.trim().split(/\s+/).map(w => `<span class="w">${w}</span>`).join(' ');
  });

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
  mm.add('(prefers-reduced-motion: no-preference) and (min-width: 900px) and (min-height: 600px)', () => {
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
    heroTl = gsap.timeline({ defaults: { ease: 'power2.inOut' }, onUpdate: renderHero, scrollTrigger: {
      trigger: '.hero-pin', start: 'top top', end: '+=540%', pin: true, scrub: SCRUB, onRefresh: renderHero
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
    gsap.timeline({ onUpdate: renderKnow, scrollTrigger: { trigger: '.know-pin', start: 'top top', end: '+=200%', pin: true, scrub: SCRUB, onRefresh: renderKnow } })
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
    let helixStage, twist, helix;
    if (GL) {
      helixStage = mk('.helix');
      ({ helix, twist } = makeHelix());
      helixStage.scene.add(helix);
    }
    const sets = ['.p-item', '.p-tabs li', '.p-stat', '.dots i'].map(q => [...document.querySelectorAll(q)]);
    const arc = document.querySelector('.ring .arc');
    let current = -1;
    const renderPillars = s => {
      const p = s.progress;
      arc.style.strokeDashoffset = 1 - p;
      if (GL) {
        const tw = .08 + .22 * (.5 - .5 * Math.cos(p * Math.PI * 3));   // twist breathes three times across the section
        twist(tw);
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
      heroSec.dataset.theme = 'dark';
      syncHeader();
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
