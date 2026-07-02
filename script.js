document.addEventListener('DOMContentLoaded', () => {

    const M = typeof Motion !== 'undefined' ? Motion : null;

    setTimeout(() => {
        document.getElementById('loader').classList.add('hidden');
    }, 1200);

    /* === NAVBAR === */
    const navbar = document.getElementById('navbar');
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('section[id]');
    const scrollProgress = document.getElementById('scrollProgress');

    window.addEventListener('scroll', () => {
        var sy = window.scrollY;
        navbar.classList.toggle('scrolled', sy > 60);
        var footerCurtain = document.getElementById('footerCurtain');
        if (footerCurtain) {
            var rect = footerCurtain.getBoundingClientRect();
            navbar.classList.toggle('at-bottom', rect.top <= window.innerHeight * 0.3);
        }

        /* Active nav link */
        var current = '';
        sections.forEach(function(s) {
            var top = s.offsetTop - 120;
            var bottom = top + s.offsetHeight;
            if (sy >= top && sy < bottom) current = s.getAttribute('id');
        });
        navLinks.forEach(function(l) {
            l.classList.toggle('active', l.getAttribute('href') === '#' + current);
        });

        /* Scroll progress bar */
        if (scrollProgress) {
            var docH = document.documentElement.scrollHeight - window.innerHeight;
            var pct = docH > 0 ? (sy / docH) * 100 : 0;
            scrollProgress.style.width = pct + '%';
        }
    }, { passive: true });

    const navToggle = document.getElementById('navToggle');
    let navOpen = false;
    if (navToggle) {
        navToggle.addEventListener('click', () => {
            navOpen = !navOpen;
            document.getElementById('navbar').classList.toggle('nav-open', navOpen);
        });
        document.querySelectorAll('.nav-link, .nav-cta-link').forEach(l => l.addEventListener('click', () => { if (navOpen) navToggle.click(); }));
    }

    document.querySelectorAll('a[href^="#"]').forEach(a => {
        a.addEventListener('click', e => {
            e.preventDefault();
            const t = document.querySelector(a.getAttribute('href'));
            if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    });

    /* === 3D SPHERE CANVAS === */
    var bgCanvas = document.getElementById('bgCanvas');
    var ctx = bgCanvas.getContext('2d');
    var W, H;
    function resizeBg() {
        W = bgCanvas.width = window.innerWidth;
        H = bgCanvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resizeBg);
    resizeBg();

    var SPHERE_LAT = 18, SPHERE_LON = 24;
    var sphereRotX = 0.3, sphereRotY = 0, mouseX = 0;
    var verts = [];
    for (var lat = 0; lat <= SPHERE_LAT; lat++) {
        for (var lon = 0; lon <= SPHERE_LON; lon++) {
            var theta = (lat / SPHERE_LAT) * Math.PI;
            var phi = (lon / SPHERE_LON) * Math.PI * 2;
            verts.push({ x: Math.sin(theta) * Math.cos(phi), y: Math.cos(theta), z: Math.sin(theta) * Math.sin(phi) });
        }
    }
    var edges = [];
    for (var lat = 0; lat < SPHERE_LAT; lat++) {
        for (var lon = 0; lon < SPHERE_LON; lon++) {
            var a = lat * (SPHERE_LON + 1) + lon, b = a + SPHERE_LON + 1;
            edges.push([a, b], [a, a + 1], [b, b + 1]);
        }
    }
    function rotX(v, a) { var c = Math.cos(a), s = Math.sin(a); return { x: v.x, y: v.y * c - v.z * s, z: v.y * s + v.z * c }; }
    function rotY(v, a) { var c = Math.cos(a), s = Math.sin(a); return { x: v.x * c + v.z * s, y: v.y, z: -v.x * s + v.z * c }; }
    function proj(x, y, z) { var s = 500 / (500 + z); return { x: x * s + W / 2, y: y * s + H / 2, z: s }; }

    var particles = [];
    for (var i = 0; i < 60; i++) {
        var theta = Math.random() * Math.PI * 2, phi = Math.acos(2 * Math.random() - 1);
        var dist = Math.min(W, H) * 0.22 * (1.3 + Math.random() * 0.8);
        particles.push({ x: Math.sin(phi) * Math.cos(theta) * dist, y: Math.sin(phi) * Math.sin(theta) * dist, z: Math.cos(phi) * dist, speed: 0.002 + Math.random() * 0.004, size: 0.5 + Math.random() * 1.5, phase: Math.random() * Math.PI * 2 });
    }
    var rays = [];
    for (var i = 0; i < 8; i++) {
        rays.push({ angle: (i / 8) * Math.PI * 2, speed: 0.003 + Math.random() * 0.005, phase: Math.random() * Math.PI * 2, width: 0.5 + Math.random() * 1 });
    }

    var bgAnimId = null;
    function drawSphere() {
        if (document.hidden) { bgAnimId = null; return; }
        ctx.clearRect(0, 0, W, H);
        var grad = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, H * 0.7);
        grad.addColorStop(0, 'rgba(196,149,122,0.15)');
        grad.addColorStop(0.5, 'rgba(196,149,122,0.04)');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);

        sphereRotY += 0.004;
        sphereRotX += Math.sin(Date.now() * 0.0003) * 0.001;
        var r = Math.min(W, H) * 0.2;

        var projVerts = verts.map(function(v) { var p = rotX(v, sphereRotX); p = rotY(p, sphereRotY + mouseX * 0.002); return proj(p.x * r, p.y * r, p.z * r); });

        for (var e = 0; e < edges.length; e++) {
            var p1 = projVerts[edges[e][0]], p2 = projVerts[edges[e][1]];
            if (!p1 || !p2 || p1.z < 0.15 || p2.z < 0.15) continue;
            var dist = Math.sqrt((p1.x - W / 2) * (p1.x - W / 2) + (p1.y - H / 2) * (p1.y - H / 2)) / (H * 0.5);
            var alpha = Math.max(0.08, 0.35 - dist * 0.05) * p1.z;
            ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = 'rgba(196,149,122,' + alpha + ')'; ctx.lineWidth = 0.7; ctx.stroke();
        }

        for (var v = 0; v < projVerts.length; v++) {
            var p = projVerts[v];
            if (p.z < 0.15) continue;
            var dist = Math.sqrt((p.x - W / 2) * (p.x - W / 2) + (p.y - H / 2) * (p.y - H / 2)) / (H * 0.5);
            var alpha = Math.max(0.15, 0.5 - dist * 0.1) * p.z;
            ctx.beginPath(); ctx.arc(p.x, p.y, 1.3, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(196,149,122,' + alpha + ')'; ctx.fill();
        }

        var glow = ctx.createRadialGradient(W / 2, H / 2, r * 0.5, W / 2, H / 2, r * 1.8);
        glow.addColorStop(0, 'rgba(196,149,122,0.15)'); glow.addColorStop(0.5, 'rgba(196,149,122,0.04)'); glow.addColorStop(1, 'rgba(196,149,122,0)');
        ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(W / 2, H / 2, r * 1.8, 0, Math.PI * 2); ctx.fill();

        for (var i = 0; i < rays.length; i++) {
            var ray = rays[i];
            var a = ray.angle + Date.now() * ray.speed;
            var len = r * (1.3 + Math.sin(Date.now() * 0.001 + ray.phase) * 0.3);
            var al = 0.06 + Math.sin(Date.now() * 0.002 + ray.phase) * 0.03;
            ctx.beginPath(); ctx.moveTo(W / 2, H / 2); ctx.lineTo(W / 2 + Math.cos(a) * len, H / 2 + Math.sin(a) * len);
            ctx.strokeStyle = 'rgba(196,149,122,' + Math.max(0, al) + ')'; ctx.lineWidth = ray.width; ctx.stroke();
        }

        for (var i = 0; i < particles.length; i++) {
            var pt = particles[i];
            var t = Date.now() * pt.speed + pt.phase;
            var px = pt.x * Math.cos(t) - pt.z * Math.sin(t);
            var pz = pt.x * Math.sin(t) + pt.z * Math.cos(t);
            var pp = proj(px, pt.y * Math.cos(t * 0.5), pz);
            if (pp.z > 0.1) {
                var alpha = 0.2 + Math.sin(t * 2) * 0.1;
                ctx.beginPath(); ctx.arc(pp.x, pp.y, pt.size * pp.z, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(196,149,122,' + Math.max(0.06, alpha * pp.z) + ')'; ctx.fill();
            }
        }
        bgAnimId = requestAnimationFrame(drawSphere);
    }
    drawSphere();
    document.addEventListener('visibilitychange', function() {
        if (document.hidden && bgAnimId) { cancelAnimationFrame(bgAnimId); bgAnimId = null; }
        else if (!document.hidden) drawSphere();
    });

    window.addEventListener('mousemove', function(e) { mouseX = (e.clientX / W - 0.5) * 2; });

    /* === MOTION ANIMATIONS === */
    if (M) {
        const { animate, scroll, inView, stagger } = M;

        /* Hero badge entrance */
        const badge = document.querySelector('.hero-badge');
        if (badge) animate(badge, { opacity: [0, 1], y: [-8, 0] }, { type: "spring", stiffness: 150, damping: 20, delay: 0.15 });

        /* Hero title entrance */
        const heroTitle = document.querySelector('.hero-title');
        if (heroTitle) animate(heroTitle, { opacity: [0, 1], y: [20, 0] }, { type: "spring", stiffness: 120, damping: 20, delay: 0.25 });

        /* Hero subtitle entrance */
        const heroSub = document.querySelector('.hero-sub');
        if (heroSub) animate(heroSub, { opacity: [0, 1], y: [20, 0] }, { type: "spring", stiffness: 120, damping: 20, delay: 0.35 });

        /* Hero actions entrance */
        const heroActions = document.querySelector('.hero-actions');
        if (heroActions) animate(heroActions, { opacity: [0, 1], y: [15, 0] }, { type: "spring", stiffness: 120, damping: 20, delay: 0.45 });

        /* Hero metrics entrance */
        const heroMetrics = document.querySelector('.hero-metrics');
        if (heroMetrics) animate(heroMetrics, { opacity: [0, 1], y: [15, 0] }, { type: "spring", stiffness: 120, damping: 20, delay: 0.55 });

        /* Hero parallax */
        const hero = document.getElementById('hero');
        try {
            scroll(
                ({ y }) => {
                    if (!y || typeof y.progress === 'undefined') return;
                    const p = Math.min(1, y.progress * 2);
                    const inner = hero.querySelector('.hero-inner');
                    if (inner) {
                        inner.style.transform = `translateY(${p * 30}px)`;
                        inner.style.opacity = 1 - p * 0.4;
                    }
                },
                { target: hero, offset: ["start start", "end start"] }
            );
        } catch (e) { console.warn('Scroll animation error:', e); }

        /* How section header + cards */
        inView('#how', () => {
            const howTag = document.querySelector('#how .section-tag');
            if (howTag) animate(howTag, { opacity: [0, 1], y: [-12, 0] }, { type: "spring", stiffness: 140, damping: 18, delay: 0 });
            const howTitle = document.querySelector('#how .section-title');
            if (howTitle) animate(howTitle, { opacity: [0, 1], y: [30, 0], scale: [0.92, 1] }, { type: "spring", stiffness: 100, damping: 16, delay: 0.1 });
            const howDesc = document.querySelector('#how .section-desc');
            if (howDesc) animate(howDesc, { opacity: [0, 1], y: [20, 0] }, { type: "spring", stiffness: 110, damping: 18, delay: 0.2 });
            animate(
                '#how .how-card',
                { opacity: [0, 1], y: [30, 0] },
                { type: "spring", stiffness: 100, damping: 18, delay: stagger(0.1) }
            );
            var howVideoRow = document.querySelector('.how-video-row');
            if (howVideoRow) animate(howVideoRow, { opacity: [0, 1], y: [20, 0] }, { type: "spring", stiffness: 100, damping: 20, delay: 0.4 });
            animate(
                '#how .shipping-card',
                { opacity: [0, 1], y: [20, 0] },
                { type: "spring", stiffness: 110, damping: 18, delay: stagger(0.1) }
            );
        }, { amount: 0.2 });

        /* Products section cards */
        inView('#products', () => {
            animate(
                '#products .product-card',
                { opacity: [0, 1], y: [24, 0], scale: [0.88, 1] },
                { type: "spring", stiffness: 220, damping: 18, delay: stagger(0.04) }
            );
        }, { amount: 0.25 });

        /* Testimonials section cards */
        inView('#testimonials', () => {
            animate(
                '#testimonials .testimonial-card',
                { opacity: [0, 1], y: [20, 0] },
                { type: "spring", stiffness: 100, damping: 22, delay: stagger(0.1) }
            );
        }, { amount: 0.3 });

        /* CTA section */
        inView('#cta', () => {
            const tag = document.querySelector('#cta .section-tag');
            if (tag) animate(tag, { opacity: [0, 1], y: [-12, 0] }, { type: "spring", stiffness: 140, damping: 18, delay: 0 });
            const title = document.querySelector('#cta .section-title');
            if (title) animate(title, { opacity: [0, 1], y: [30, 0], scale: [0.92, 1] }, { type: "spring", stiffness: 100, damping: 16, delay: 0.1 });
            const desc = document.querySelector('#cta .section-desc');
            if (desc) animate(desc, { opacity: [0, 1], y: [20, 0] }, { type: "spring", stiffness: 110, damping: 18, delay: 0.2 });
            animate(
                '#cta .cta-socials .btn-social',
                { opacity: [0, 1], y: [12, 0] },
                { type: "spring", stiffness: 120, damping: 18, delay: stagger(0.07) }
            );
        }, { amount: 0.2 });

        /* Products header */
        inView('#products', () => {
            const tag = document.querySelector('#products .section-tag');
            if (tag) animate(tag, { opacity: [0, 1], y: [-12, 0] }, { type: "spring", stiffness: 140, damping: 18, delay: 0 });
            const title = document.querySelector('#products .section-title');
            if (title) animate(title, { opacity: [0, 1], y: [30, 0], scale: [0.92, 1] }, { type: "spring", stiffness: 100, damping: 16, delay: 0.1 });
            const desc = document.querySelector('#products .section-desc');
            if (desc) animate(desc, { opacity: [0, 1], y: [20, 0] }, { type: "spring", stiffness: 110, damping: 18, delay: 0.2 });
        }, { amount: 0.2 });

        /* Testimonials header */
        inView('#testimonials', () => {
            const tag = document.querySelector('#testimonials .section-tag');
            if (tag) animate(tag, { opacity: [0, 1], y: [-12, 0] }, { type: "spring", stiffness: 140, damping: 18, delay: 0 });
            const title = document.querySelector('#testimonials .section-title');
            if (title) animate(title, { opacity: [0, 1], y: [30, 0], scale: [0.92, 1] }, { type: "spring", stiffness: 100, damping: 16, delay: 0.1 });
            const desc = document.querySelector('#testimonials .section-desc');
            if (desc) animate(desc, { opacity: [0, 1], y: [20, 0] }, { type: "spring", stiffness: 110, damping: 18, delay: 0.2 });
        }, { amount: 0.2 });
    }

    /* === COUNTER ANIMATION === */
    var counterObserver = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (entry.isIntersecting) {
                var el = entry.target;
                var target = parseInt(el.getAttribute('data-target'));
                if (!target) return;
                var current = 0;
                var step = Math.ceil(target / 40);
                var timer = setInterval(function() {
                    current += step;
                    if (current >= target) { current = target; clearInterval(timer); }
                    el.textContent = current;
                }, 30);
                counterObserver.unobserve(el);
            }
        });
    }, { threshold: 0.5 });
    document.querySelectorAll('.countup').forEach(function(el) { counterObserver.observe(el); });

    /* === PROGRESS RING === */
    var progressRing = document.getElementById('progressRing');
    var progressArc = document.getElementById('progressArc');
    var circumference = 119.38;
    if (progressRing && progressArc) {
        window.addEventListener('scroll', function() {
            var scrollTop = window.scrollY;
            var docHeight = document.documentElement.scrollHeight - window.innerHeight;
            var progress = docHeight > 0 ? scrollTop / docHeight : 0;
            progressArc.setAttribute('stroke-dashoffset', circumference * (1 - progress));
            if (scrollTop > 400) progressRing.classList.add('visible');
            else progressRing.classList.remove('visible');
        }, { passive: true });
        progressRing.addEventListener('click', function() {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    /* === SCROLL REVEAL === */
    var revealObserver = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                revealObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });
    document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale').forEach(function(el) {
        revealObserver.observe(el);
    });

    /* === ANIMEJS ENHANCEMENTS === */
    if (typeof anime !== 'undefined') {
        /* Icon hover pulse on product cards */
        document.querySelectorAll('.product-card[data-tilt]').forEach(function(card) {
            card.addEventListener('mouseenter', function() {
                var icon = card.querySelector('.product-icon');
                if (icon) {
                    anime({
                        targets: icon,
                        scale: [1.15, 1.25],
                        duration: 600,
                        easing: 'easeOutBack',
                        direction: 'alternate',
                        loop: 2
                    });
                }
            });
        });
    }

    /* === MAP CANVAS === */
    const mapCanvas = document.getElementById('mapCanvas');
    if (mapCanvas) {
        const mctx = mapCanvas.getContext('2d');
        function resizeMap() {
            const rect = mapCanvas.parentElement.getBoundingClientRect();
            mapCanvas.width = rect.width * 2;
            mapCanvas.height = rect.height * 2;
            mctx.scale(2, 2);
        }
        resizeMap();
        window.addEventListener('resize', resizeMap);

        let planeProgress = 0;

        function drawMap() {
            const w = mapCanvas.width / 2;
            const h = mapCanvas.height / 2;
            mctx.clearRect(0, 0, w, h);

            mctx.strokeStyle = 'rgba(255,255,255,0.04)';
            mctx.lineWidth = 0.5;
            for (let x = -24; x < w + 24; x += 24) {
                mctx.beginPath(); mctx.moveTo(x, 0); mctx.lineTo(x - h * 0.3, h); mctx.stroke();
            }
            for (let y = -24; y < h + 24; y += 24) {
                mctx.beginPath(); mctx.moveTo(0, y); mctx.lineTo(w, y + w * 0.3); mctx.stroke();
            }

            mctx.fillStyle = 'rgba(196,149,122,0.08)';
            mctx.beginPath(); mctx.ellipse(w * 0.26, h * 0.26, 65, 50, 0.2, 0, Math.PI * 2); mctx.fill();
            mctx.beginPath(); mctx.ellipse(w * 0.66, h * 0.70, 50, 75, -0.3, 0, Math.PI * 2); mctx.fill();

            const ox = w * 0.26, oy = h * 0.26, dx = w * 0.66, dy = h * 0.70;
            const cpx = w * 0.30, cpy = h * 0.70;

            mctx.shadowColor = 'rgba(196,149,122,0.3)'; mctx.shadowBlur = 30;
            mctx.beginPath(); mctx.moveTo(ox, oy); mctx.quadraticCurveTo(cpx, cpy, dx, dy);
            mctx.strokeStyle = 'rgba(196,149,122,0.2)'; mctx.lineWidth = 8; mctx.stroke();
            mctx.shadowBlur = 0;

            mctx.setLineDash([8, 10]);
            mctx.beginPath(); mctx.moveTo(ox, oy); mctx.quadraticCurveTo(cpx, cpy, dx, dy);
            mctx.strokeStyle = 'rgba(196,149,122,0.4)'; mctx.lineWidth = 2; mctx.stroke();
            mctx.setLineDash([]);

            const speed = 0.006;
            planeProgress += speed;
            if (planeProgress > 1) planeProgress = 0;
            const t = planeProgress, tt = 1 - t;
            const px = tt * tt * ox + 2 * tt * t * cpx + t * t * dx;
            const py = tt * tt * oy + 2 * tt * t * cpy + t * t * dy;

            const osc = Math.sin(Date.now() * 0.01) * 2;
            mctx.beginPath(); mctx.arc(px, py + osc, 8, 0, Math.PI * 2);
            mctx.fillStyle = 'rgba(196,149,122,0.2)'; mctx.fill();
            mctx.beginPath(); mctx.arc(px, py + osc, 4, 0, Math.PI * 2);
            mctx.fillStyle = 'rgba(196,149,122,0.4)'; mctx.fill();

            const plane = document.getElementById('mapPlane');
            if (plane) {
                const rect = mapCanvas.parentElement.getBoundingClientRect();
                const sx = rect.width / w, sy = rect.height / h;
                plane.style.left = (px * sx - 22) + 'px';
                plane.style.top = (py * sy - 22 + osc) + 'px';
                const dt = 0.001;
                const t2 = Math.min(1, t + dt);
                const tt2 = 1 - t2;
                const pdx = tt2 * tt2 * ox + 2 * tt2 * t2 * cpx + t2 * t2 * dx;
                const pdy = tt2 * tt2 * oy + 2 * tt2 * t2 * cpy + t2 * t2 * dy;
                const angle = Math.atan2(pdy - py, pdx - px);
                plane.style.transform = `rotate(${angle + Math.PI/2}rad)`;
            }

            for (let i = 1; i <= 10; i++) {
                const trailT = Math.max(0, planeProgress - i * 0.02);
                const t3 = trailT, tt3 = 1 - t3;
                const tx = tt3 * tt3 * ox + 2 * tt3 * t3 * cpx + t3 * t3 * dx;
                const ty = tt3 * tt3 * oy + 2 * tt3 * t3 * cpy + t3 * t3 * dy;
                const alpha = 0.35 - i * 0.035;
                if (alpha > 0) {
                    mctx.beginPath(); mctx.arc(tx, ty, 4 - i * 0.3, 0, Math.PI * 2);
                    mctx.fillStyle = `rgba(196,149,122,${alpha})`;
                    mctx.fill();
                }
            }
            requestAnimationFrame(drawMap);
        }
        drawMap();
    }

    /* === TILT + SPOTLIGHT (product cards) === */
    document.querySelectorAll('[data-tilt]').forEach(function(card) {
        card.addEventListener('mousemove', function(e) {
            var rect = card.getBoundingClientRect();
            var x = e.clientX - rect.left;
            var y = e.clientY - rect.top;
            var cx = x / rect.width;
            var cy = y / rect.height;
            var tiltX = (cy - 0.5) * -10;
            var tiltY = (cx - 0.5) * 10;
            card.style.setProperty('--mx', (cx * 100) + '%');
            card.style.setProperty('--my', (cy * 100) + '%');
            card.style.transform = 'translateY(-4px) perspective(600px) rotateX(' + tiltX + 'deg) rotateY(' + tiltY + 'deg)';
        });
        card.addEventListener('mouseleave', function() {
            card.style.transform = '';
        });
    });

    /* === MAGNETIC BUTTONS === */
    document.querySelectorAll('[data-magnetic]').forEach(function(el) {
        el.addEventListener('mousemove', function(e) {
            var rect = el.getBoundingClientRect();
            var x = e.clientX - rect.left - rect.width / 2;
            var y = e.clientY - rect.top - rect.height / 2;
            el.style.transition = 'none';
            el.style.transform = 'translate3d(' + (x * 0.25) + 'px,' + (y * 0.25) + 'px,0) scale(1.02)';
        });
        el.addEventListener('mouseleave', function() {
            el.style.transition = '';
            el.style.transform = '';
        });
    });

    /* === FOOTER === */
    document.getElementById('footerTop')?.addEventListener('click', function() {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    if (M) {
        var animate = M.animate, stagger = M.stagger, inView = M.inView;
        inView('#footerCurtain', function() {
            var heading = document.querySelector('.footer-heading');
            if (heading) animate(heading, { opacity: [0, 1], y: [30, 0] }, { type: "spring", stiffness: 100, damping: 18 });
            animate(
                '.footer-pills .glass-pill',
                { opacity: [0, 1], y: [20, 0] },
                { type: "spring", stiffness: 120, damping: 16, delay: stagger(0.08) }
            );
        }, { amount: 0.15 });
    }

    /* === MODAL === */
    var modalOverlay = document.getElementById('modalOverlay');
    var modalBody = document.getElementById('modalBody');
    var modalClose = document.getElementById('modalClose');
    var modals = {
        terminos: {
            title: 'Términos del Servicio',
            content: 'Al utilizar los servicios de JAMA (en adelante, "el Servicio"), usted acepta los siguientes términos. JAMA actúa como intermediario de compras en Estados Unidos para envío a Venezuela. No nos hacemos responsables por demoras aduanales, cambios en tasas de importación, ni daños causados por el courier una vez entregado el paquete al transportista. El cliente es responsable de proporcionar la dirección de entrega correcta. JAMA se reserva el derecho de rechazar pedidos de productos prohibidos o restringidos. Los precios y tiempos de envío son estimados y pueden variar. Al pagar, usted acepta estas condiciones.'
        },
        privacidad: {
            title: 'Política de Privacidad',
            content: 'En JAMA valoramos tu privacidad. Los datos personales que nos proporcionas (nombre, dirección, contacto) se utilizan exclusivamente para procesar tus pedidos y coordinar los envíos. No compartimos tu información con terceros no afiliados al servicio. Tus datos de pago se procesan a través de plataformas seguras y no almacenamos información de tarjetas de crédito. Puedes solicitar la eliminación de tus datos en cualquier momento contactándonos por Instagram. Al usar el Servicio, aceptas esta política.'
        }
    };
    document.querySelectorAll('[data-modal]').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var key = btn.getAttribute('data-modal');
            var data = modals[key];
            if (data) modalBody.innerHTML = '<h2>' + data.title + '</h2>' + data.content.split('\n').map(function(p) { return '<p>' + p.trim() + '</p>'; }).join('');
            modalOverlay.classList.add('open');
        });
    });
    if (modalClose) modalClose.addEventListener('click', function() { modalOverlay.classList.remove('open'); });
    if (modalOverlay) modalOverlay.addEventListener('click', function(e) { if (e.target === modalOverlay) modalOverlay.classList.remove('open'); });
});
