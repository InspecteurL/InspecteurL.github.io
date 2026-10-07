/* mobile-nav.js : menu déroulant mobile pour les pages avec <nav> */
(function () {
  const nav = document.querySelector('nav');
  if (!nav || nav.dataset.mobileReady) return;
  nav.dataset.mobileReady = '1';

  // ---------- CSS ----------
  const style = document.createElement('style');
  style.textContent = `
    /* PC : le conteneur est "invisible", la navbar reste identique */
    .nav-menu { display: contents; }
    .nav-burger { display: none; }

    @media (max-width: 768px) {
      nav { padding: 0 1rem; justify-content: space-between; }
      nav .nav-logo { font-size: 1.3rem; }

      .nav-burger {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        background: rgba(255,255,255,.06);
        border: 1px solid var(--border, #2a2a3d);
        border-radius: 8px;
        color: var(--text, #e8e8f0);
        font-size: 1.2rem;
        cursor: pointer;
      }

      .nav-menu {
        display: none;
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        flex-direction: column;
        background: rgba(10,10,15,.98);
        backdrop-filter: blur(12px);
        border-bottom: 1px solid var(--border, #2a2a3d);
        box-shadow: 0 16px 30px rgba(0,0,0,.6);
      }
      .nav-menu.open { display: flex; }

      .nav-menu a {
        display: block;
        padding: 15px 20px;
        font-size: 1rem;
        border-bottom: 1px solid var(--border, #2a2a3d);
      }
      .nav-menu a:last-child { border-bottom: none; }
      .nav-menu a.active {
        border-left: 3px solid var(--accent, #e8b84b);
        background: rgba(232,184,75,.06);
      }
    }
  `;
  document.head.appendChild(style);

  // ---------- Structure : on range les liens dans un conteneur ----------
  const logo = nav.querySelector('.nav-logo');
  const menu = document.createElement('div');
  menu.className = 'nav-menu';
  menu.id = 'navMenu';
  [...nav.children].forEach(el => { if (el !== logo) menu.appendChild(el); });
  nav.appendChild(menu);

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

  // Fermer : clic en dehors, touche Échap, ou retour en grand écran
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
