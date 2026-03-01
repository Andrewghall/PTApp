/* ============================================
   Elevate Gym - Website JavaScript
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {

  // ---- Sticky Nav ----
  const nav = document.getElementById('nav');
  const hero = document.getElementById('hero');

  if (hero) {
    // Home page: toggle nav style based on hero visibility
    const navObserver = new IntersectionObserver(
      ([entry]) => {
        nav.classList.toggle('scrolled', !entry.isIntersecting);
      },
      { threshold: 0.1 }
    );
    navObserver.observe(hero);
  } else {
    // Inner pages: nav is always in scrolled state (set via HTML class)
    nav.classList.add('scrolled');
  }

  // ---- Mobile Menu Toggle ----
  const navToggle = document.getElementById('navToggle');
  const navMenu = document.getElementById('navMenu');

  navToggle.addEventListener('click', () => {
    navToggle.classList.toggle('active');
    navMenu.classList.toggle('open');
    document.body.style.overflow = navMenu.classList.contains('open') ? 'hidden' : '';
  });

  // Close mobile menu on link click
  navMenu.querySelectorAll('.nav-link, .nav-login').forEach(link => {
    link.addEventListener('click', () => {
      navToggle.classList.remove('active');
      navMenu.classList.remove('open');
      document.body.style.overflow = '';
    });
  });

  // ---- Active Nav Link (pathname-based) ----
  const navLinks = document.querySelectorAll('.nav-link');
  const currentPath = window.location.pathname;

  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPath || href === currentPath.replace(/\/$/, '')) {
      link.classList.add('active');
    }
  });

  // ---- Scroll Reveal ----
  const revealElements = document.querySelectorAll('.reveal');

  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry, index) => {
        if (entry.isIntersecting) {
          // Stagger animations within the same parent
          const siblings = entry.target.parentElement.querySelectorAll('.reveal');
          let delay = 0;
          siblings.forEach((sibling, i) => {
            if (sibling === entry.target) {
              delay = i * 100;
            }
          });
          setTimeout(() => {
            entry.target.classList.add('visible');
          }, delay);
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
  );

  revealElements.forEach(el => revealObserver.observe(el));

  // Force-reveal elements already in viewport on page load (inner pages)
  requestAnimationFrame(() => {
    revealElements.forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        el.classList.add('visible');
        revealObserver.unobserve(el);
      }
    });
  });

  // ---- WhatsApp Float - Always visible immediately ----
  const whatsappFloat = document.getElementById('whatsappFloat');
  if (whatsappFloat) {
    whatsappFloat.classList.add('visible');
  }

});
