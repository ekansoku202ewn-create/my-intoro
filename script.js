document.addEventListener('DOMContentLoaded', () => {
    // Intersection Observer for fade-in animations
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.15
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target); // 一度アニメーションしたら監視を解除
            }
        });
    }, observerOptions);

    const animatedElements = document.querySelectorAll('.fade-in-up');
    animatedElements.forEach(el => {
        observer.observe(el);
    });

    // Optional: Mouse movement parallax effect for hero section
    const hero = document.querySelector('.hero');
    const heroContent = document.querySelector('.hero-content');

    if (hero && heroContent) {
        hero.addEventListener('mousemove', (e) => {
            const xAxis = (window.innerWidth / 2 - e.pageX) / 25;
            const yAxis = (window.innerHeight / 2 - e.pageY) / 25;
            heroContent.style.transform = `translateY(${yAxis}px) translateX(${xAxis}px)`;
        });

        hero.addEventListener('mouseleave', () => {
            heroContent.style.transition = 'transform 0.5s ease';
            heroContent.style.transform = `translateY(0) translateX(0)`;
        });

        hero.addEventListener('mouseenter', () => {
            heroContent.style.transition = 'none'; // マウス移動中はトランジションを無効にして追従性を高める
        });
    }
});
