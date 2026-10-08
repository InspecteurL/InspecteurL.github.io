
/* mobile-nav.js (v2) : menu déroulant mobile pour les pages avec <nav> */
(function () {
  const nav = document.querySelector('nav');
  if (!nav || nav.dataset.mobileReady) return;
  nav.dataset.mobileReady = '1';
  nav.classList.add('has-burger');
  if (getComputedStyle(nav).position === 'static') nav.style.position = 'relative';

  // ---------- CSS ----------
  const style = document.createElement('style');
  style.textContent = `
    .has-burger .nav-menu { display: contents; }
    .has-burger .nav-burger { display: none; }

    @media (max-width: 768px) {
      nav.has-burger {
        padding-left: 1rem;
        padding-right: 1rem;
        gap: .75rem;
        justify-content: space-between;
      }
      nav.has-burger .nav-logo { font-size: 1.3rem; }
      nav.has-burger .nav-balance { margin-left: auto; padding: 6px 10px; font-size: .9rem; }

      nav.has-burger .nav-burger {
        display: flex;
        flex: 0 0 auto;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        margin: 0;
        padding: 0;
        letter-spacing: 0;
        text-transform: none;
        background: rgba(255,255,255,.06);
        border: 1px solid var(--border, #2a2a3d);
        border-radius: 8px;
        color: var(--text, #e8e8f0);
        font-size: 1.2rem;
        line-height: 1;
        cursor: pointer;
      }

      nav.has-burger .nav-menu {
        display: none;
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        flex-direction: column;
        background: rgba(10,10,15,.98);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border-bottom: 1px solid var(--border, #2a2a3d);
        box-shadow: 0 16px 30px rgba(0,0,0,.6);
        z-index: 5;
      }
      nav.has-burger .nav-menu.open { display: flex; }

      nav.has-burger .nav-menu a {
        display: block;
        margin: 0;
        padding: 15px 20px;
        font-size: 1rem;
        border-bottom: 1px solid var(--border, #2a2a3d);
      }
      nav.has-burger .nav-menu a:last-child { border-bottom: none; }
      nav.has-burger .nav-menu a.active {
        border-left: 3px solid var(--accent, #e8b84b);
        background: rgba(232,184,75,.06);
      }
    }
  `;
  document.head.appendChild(style);

  // ---------- Structure : liens rangés dans un conteneur ----------
  const logo = nav.querySelector('.nav-logo');
  const aGarder = el => el === logo || el.classList.contains('nav-balance');
  const aDeplacer = [...nav.children].filter(el => !aGarder(el));
  if (!aDeplacer.length) return;

  const menu = document.createElement('div');
  menu.className = 'nav-menu';
  menu.id = 'navMenu';
  nav.insertBefore(menu, aDeplacer[0]);
  aDeplacer.forEach(el => menu.appendChild(el));

  // ---------- Bouton burger ----------
  const burger = document.createElement('button');
  burger.type = 'button';
  burger.className = 'nav-burger';
  burger.textContent = '☰';
  burger.setAttribute('aria-label', 'Ouvrir le menu');
  burger.setAttribute('aria-expanded', 'false');
  burger.setAttribute('aria-controls', 'navMenu');
  nav.appendChild(burger);

  function setOpen(open) {
    menu.classList.toggle('open', open);
    burger.textContent = open ? '✕' : '☰';
    burger.setAttribute('aria-expanded', String(open));
  }

  burger.addEventListener('click', e => {
    e.stopPropagation();
    setOpen(!menu.classList.contains('open'));
  });
  document.addEventListener('click', e => {
    if (!e.target.closest('.nav-menu')) setOpen(false);
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') setOpen(false);
  });
  window.addEventListener('resize', () => {
    if (window.innerWidth > 768) setOpen(false);
  });
})();
