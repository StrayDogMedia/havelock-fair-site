document.addEventListener("DOMContentLoaded", () => {
  // Mobile menu toggle
  const toggle = document.querySelector(".nav-toggle");
  const menu = document.querySelector(".nav-menu");
  if (toggle && menu) {
    toggle.addEventListener("click", () => {
      menu.classList.toggle("open");
      toggle.classList.toggle("open");
      toggle.setAttribute("aria-expanded", menu.classList.contains("open"));
    });
    menu.querySelectorAll("a").forEach(link => {
      link.addEventListener("click", () => {
        menu.classList.remove("open");
        toggle.classList.remove("open");
      });
    });
  }

  // Navbar scroll effect
  const nav = document.querySelector(".navbar");
  if (nav) {
    window.addEventListener("scroll", () => {
      nav.classList.toggle("scrolled", window.scrollY > 50);
    });
  }

  // Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener("click", e => {
      const target = document.querySelector(anchor.getAttribute("href"));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });

  // Intersection Observer for scroll animations
  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
  );

  document.querySelectorAll(".fade-in").forEach(el => observer.observe(el));
});
