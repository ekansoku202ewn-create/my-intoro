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

    // --- Gunshot & Page Transition Logic ---
    let clickCount = 0;
    const furuyaPage = document.getElementById('furuya-page');
    const hiradatePage = document.getElementById('hiradate-page');
    const effectsContainer = document.getElementById('effects-container');

    // 画面全体へのクリックイベント
    document.body.addEventListener('click', (e) => {
        // 既に切り替わっている、または処理中なら無視
        if (clickCount >= 3 || !furuyaPage || furuyaPage.style.display === 'none') return;

        clickCount++;

        // 弾痕を追加 (スクロールも考慮してpageX/pageYを使用)
        createBulletHole(e.pageX, e.pageY);
        // フラッシュ
        createFlash();

        if (clickCount === 3) {
            // 3回目：画面が砕け散る
            createShatterEffect(e.pageX, e.pageY);
            
            // Furuyaページに砕け散るアニメーションを適用
            furuyaPage.classList.add('shatter-animation');

            // アニメーション完了後にページ切り替え
            setTimeout(() => {
                furuyaPage.style.display = 'none';
                effectsContainer.innerHTML = ''; // エフェクトクリア
                
                hiradatePage.style.display = 'block';
                // 少し遅延させてopacityを1にし、フェードイン
                setTimeout(() => {
                    hiradatePage.style.opacity = '1';
                }, 50);

            }, 1200); // .shatter-animation の duration と合わせる
        }
    });

    function createBulletHole(x, y) {
        const hole = document.createElement('div');
        hole.className = 'bullet-hole';
        hole.style.left = `${x}px`;
        hole.style.top = `${y}px`;
        effectsContainer.appendChild(hole);
    }

    function createFlash() {
        const flash = document.createElement('div');
        flash.className = 'gun-flash';
        effectsContainer.appendChild(flash);
        setTimeout(() => flash.remove(), 150);
    }

    function createShatterEffect(x, y) {
        for (let i = 0; i < 25; i++) {
            const shard = document.createElement('div');
            shard.className = 'glass-shard';
            
            // 破片の形をランダムに
            const size1 = Math.random() * 40 + 10;
            const size2 = Math.random() * 40 + 10;
            const size3 = Math.random() * 60 + 30;
            shard.style.borderLeft = `${size1}px solid transparent`;
            shard.style.borderRight = `${size2}px solid transparent`;
            shard.style.borderBottom = `${size3}px solid rgba(255, 255, 255, 0.4)`;
            shard.style.left = `${x - size1}px`;
            shard.style.top = `${y - size3/2}px`;
            
            // 飛散アニメーション
            const tx = (Math.random() - 0.5) * 1000;
            const ty = (Math.random() - 0.5) * 1000;
            const rot = (Math.random() - 0.5) * 1080;
            
            shard.animate([
                { transform: 'translate(0, 0) rotate(0deg) scale(1)', opacity: 1 },
                { transform: `translate(${tx}px, ${ty}px) rotate(${rot}deg) scale(${Math.random()+0.5})`, opacity: 0 }
            ], {
                duration: 800 + Math.random() * 600,
                easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
                fill: 'forwards'
            });
            
            effectsContainer.appendChild(shard);
        }
    }
});
