document.addEventListener('DOMContentLoaded', () => {
    const imageUpload1 = document.getElementById('image-upload-1');
    const imageUpload2 = document.getElementById('image-upload-2');
    const aiPromptInput = document.getElementById('ai-prompt');
    const aiGenerateBtn1 = document.getElementById('ai-generate-1');
    const aiGenerateBtn2 = document.getElementById('ai-generate-2');
    const imagePreviewContainer = document.getElementById('image-preview-container');
    
    // image 1
    const wrapper1 = document.getElementById('wrapper-1');
    const imagePreview1 = document.getElementById('image-preview-1');
    const speechBubble1 = document.getElementById('speech-bubble-1');
    const jokeText1 = document.getElementById('joke-text-1');
    
    // image 2
    const wrapper2 = document.getElementById('wrapper-2');
    const imagePreview2 = document.getElementById('image-preview-2');
    const speechBubble2 = document.getElementById('speech-bubble-2');
    const jokeText2 = document.getElementById('joke-text-2');

    const generateBtn = document.getElementById('generate-btn');

    // === 性格別セリフデータ ===
    
    // 【標準】
    const standardSingle = [
        "お前のバナナ、黒ずんでるな🍌",
        "いやーん、えっち！🙈",
        "そんなに見つめられたら…濡れちゃう💦",
        "奥まで…見えそう…🫣",
        "今日、下着つけてないんだよね…🤫",
        "ふふっ、立派なモノ持ってるじゃん🍆",
        "えっ、もう入れちゃうの？😳"
    ];
    const standardConversations = [
        ["ねえ、今日どうする？", "…ホテル、行く？"],
        ["私、もう我慢できないかも…", "俺も…ギリギリだよ"],
        ["シャワー、一緒に入る？", "背中、流してあげる"],
        ["こんなところじゃ…誰か来ちゃう", "大丈夫、誰にも見られないから"],
        ["今日帰りたくないな…", "じゃあ、朝まで一緒にいようか"]
    ];

    // 【ドS】
    const sSingle = [
        "どこ見てるのよ、変態",
        "私の足、舐めたいんでしょ？",
        "ほら、どうしてほしいか言いなさいよ",
        "もっと啼きなさいよ…",
        "そんなモノで私を満足させられると思ってるの？",
        "調教してあげるから、そこに這いつくばりなさい",
        "ゾクゾクするんでしょ？痛めつけられるのが…"
    ];
    const sConversations = [
        ["もっと私を悦ばせなさいよ", "…はい、ご主人様…"],
        ["どこ見てるのよ変態", "すみません、もっと見せてください…"],
        ["ほら、舐めなさい", "ありがとうございます…！"],
        ["口答えするなんて、いい度胸ね", "ごめんなさい、お仕置きしてください…"],
        ["どう？私のヒールで踏まれる気分は", "最高です…もっと踏んでください…"]
    ];

    // 【ドM】
    const mSingle = [
        "ああっ…そこはダメぇ…",
        "もっと、いじめて…",
        "ごめんなさい、私がいけないんです…",
        "見ないで…恥ずかしい…",
        "ひっ…！そんなに激しくしないで…！",
        "私なんかのために…ありがとうございます…",
        "もっと…もっと乱暴にしてください…！"
    ];
    const mConversations = [
        ["ねえ、もっと激しくして…", "仕方ないな、泣くまでやってやるよ"],
        ["私、もうおかしくなっちゃう…", "まだまだこれからだろ？"],
        ["お仕置き、してください…", "いいだろう、たっぷり可愛がってやる"],
        ["やだっ…壊れちゃう…！", "俺のモノなんだから我慢しろ"],
        ["私を好きにして…", "言われなくても、めちゃくちゃにしてやるよ"]
    ];

    // 【今はその気分ではない（健全・お断り）】
    const noneSingle = [
        "今日はちょっと疲れちゃったな…",
        "ごめんね、また今度にしよう",
        "今はそっとしておいて…",
        "一緒にテレビでも見ない？",
        "お茶でも淹れようか？",
        "明日は早いから、もう寝よう",
        "ごめん、そういう気分じゃないの"
    ];
    const noneConversations = [
        ["ねえ、明日早いんだよね", "うん、早く寝ようか"],
        ["ごめん、今日はちょっと…", "わかった、ゆっくり休んでね"],
        ["ちょっと肩揉んでくれない？", "いいよ、疲れてるもんね"],
        ["映画でも観ない？", "いいね、ポップコーン持ってこようか"],
        ["今日はもう限界かも…", "無理しないで。おやすみ"]
    ];

    // Web Speech API Setup
    let voices = [];
    const updateVoices = () => {
        voices = window.speechSynthesis.getVoices();
    };
    if (window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = updateVoices;
        updateVoices();
    }

    function speakText(text, isFemaleVoice, onEndCallback) {
        if (!window.speechSynthesis) {
            // 音声が使えない場合は、指定時間後に次のコールバックを呼ぶ
            if (onEndCallback) setTimeout(onEndCallback, 2000);
            return;
        }

        const cleanText = text.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');

        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = 'ja-JP';
        
        const jaVoices = voices.filter(v => v.lang.includes('ja'));
        if (jaVoices.length > 0) {
            let voice;
            if (isFemaleVoice) {
                voice = jaVoices.find(v => v.name.includes('Haruka') || v.name.includes('Nanami') || v.name.includes('Female')) || jaVoices[0];
                // よりエロく、ねっとりとした艶のある声に調整
                utterance.pitch = 1.0; // 高すぎず、やや落ち着いた声
                utterance.rate = 0.65; // さらにゆっくりと囁くスピード
            } else {
                voice = jaVoices.find(v => v.name.includes('Keita') || v.name.includes('Male')) || jaVoices[0];
                // 男性の声も少し低くゆっくりに
                utterance.pitch = 0.75; 
                utterance.rate = 0.8;
            }
            utterance.voice = voice;
        }

        if (onEndCallback) {
            utterance.onend = onEndCallback;
        }

        window.speechSynthesis.speak(utterance);
    }

    let hasImage1 = false;
    let hasImage2 = false;
    let aiUrl1 = '';
    let aiUrl2 = '';
    let originalImgSrc1 = '';
    let originalImgSrc2 = '';

    function updatePreviewState() {
        window.speechSynthesis.cancel();
        speechBubble1.classList.remove('show');
        speechBubble2.classList.remove('show');
        setTimeout(() => {
            speechBubble1.classList.add('hidden');
            speechBubble2.classList.add('hidden');
        }, 400);

        if (hasImage1 || hasImage2) {
            imagePreviewContainer.classList.remove('hidden');
            generateBtn.disabled = false;
        } else {
            imagePreviewContainer.classList.add('hidden');
            generateBtn.disabled = true;
        }

        if (hasImage1) {
            wrapper1.classList.remove('hidden');
            document.getElementById('controls-1').classList.remove('hidden');
        } else {
            wrapper1.classList.add('hidden');
            document.getElementById('controls-1').classList.add('hidden');
        }

        if (hasImage2) {
            wrapper2.classList.remove('hidden');
            document.getElementById('controls-2').classList.remove('hidden');
        } else {
            wrapper2.classList.add('hidden');
            document.getElementById('controls-2').classList.add('hidden');
        }
    }

    // 画像自動生成（Pollinations API）
    function generateAIImage(prompt, imageNumber, btnElement) {
        if (!prompt) {
            alert('どんな画像を作りたいか入力してね！');
            aiPromptInput.focus();
            return;
        }

        const originalText = btnElement.innerHTML;
        btnElement.innerHTML = "生成中...⏳";
        btnElement.disabled = true;

        // リアル or 二次元のスタイル選択
        let stylePrompt = "";
        const styleSelect = document.getElementById('ai-style-type');
        if (styleSelect && styleSelect.value === "anime") {
            stylePrompt = ", anime style, 2d illustration, flat color";
        } else {
            stylePrompt = ", photorealistic, raw photo, realistic, 8k resolution";
        }

        // 日本語の特定キーワードを検知して、AIが理解しやすい英語のタグを追加する
        let extraKeywords = "";
        if (prompt.includes("制服")) extraKeywords += ", school uniform, sailor suit";
        if (prompt.includes("体操服")) extraKeywords += ", japanese gym uniform, gym shirt";
        if (prompt.includes("ブルマ")) extraKeywords += ", gym bloomers, buruma";
        if (prompt.includes("水着")) extraKeywords += ", swimsuit, bikini";
        if (prompt.includes("メイド")) extraKeywords += ", maid outfit";

        // フェチ入力欄の取得と反映
        const fetishInput = document.getElementById('fetish-prompt');
        let fetishPrompt = "";
        if (fetishInput && fetishInput.value.trim() !== "") {
            const fetish = fetishInput.value.trim();
            // 簡単な英訳（AIの理解度向上のため）
            let englishFetish = fetish;
            if (fetish.includes("ストッキング") || fetish.includes("タイツ")) englishFetish += ", pantyhose, stockings";
            if (fetish.includes("網タイツ")) englishFetish += ", fishnet pantyhose";
            if (fetish.includes("メガネ") || fetish.includes("眼鏡")) englishFetish += ", glasses";
            if (fetish.includes("足") || fetish.includes("脚")) englishFetish += ", beautiful legs, bare feet";
            
            fetishPrompt = ", focus on " + englishFetish;
        }

        // ユーザーの要望に加え、スタイル指定、フェチ、エロ（erotic）と露出度高めの要素を付与する隠しプロンプト
        const enhancedPrompt = prompt + stylePrompt + extraKeywords + fetishPrompt + ", masterpiece, best quality, highly detailed, erotic, revealing clothes";
        const encodedPrompt = encodeURIComponent(enhancedPrompt);
        const randomSeed = Math.floor(Math.random() * 1000000);
        const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=400&height=400&nologo=true&seed=${randomSeed}`;

        const img = new Image();
        img.onload = () => {
            if (imageNumber === 1) {
                imagePreview1.src = imageUrl;
                hasImage1 = true;
                aiUrl1 = imageUrl;
                originalImgSrc1 = imageUrl;
                document.getElementById('controls-1').querySelector('.mosaic-btn').innerHTML = '⬛';
                document.getElementById('image-preview-1').setAttribute('data-mosaiced', 'false');
            } else {
                imagePreview2.src = imageUrl;
                hasImage2 = true;
                aiUrl2 = imageUrl;
                originalImgSrc2 = imageUrl;
                document.getElementById('controls-2').querySelector('.mosaic-btn').innerHTML = '⬛';
                document.getElementById('image-preview-2').setAttribute('data-mosaiced', 'false');
            }
            updatePreviewState();
            btnElement.innerHTML = originalText;
            btnElement.disabled = false;
        };
        img.onerror = () => {
            alert('画像の生成に失敗しました。もう一度試してね。');
            btnElement.innerHTML = originalText;
            btnElement.disabled = false;
        };
        // 読み込み開始
        img.src = imageUrl;
    }

    if (imageUpload1 && imageUpload2 && generateBtn) {
        // ローカルアップロード処理
        imageUpload1.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                hasImage1 = true;
                aiUrl1 = ''; // ローカル画像はQR不可
                const reader = new FileReader();
                reader.onload = (event) => {
                    imagePreview1.src = event.target.result;
                    originalImgSrc1 = event.target.result;
                    document.getElementById('controls-1').querySelector('.mosaic-btn').innerHTML = '⬛';
                    document.getElementById('image-preview-1').setAttribute('data-mosaiced', 'false');
                    updatePreviewState();
                };
                reader.readAsDataURL(file);
            }
        });

        imageUpload2.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                hasImage2 = true;
                aiUrl2 = ''; // ローカル画像はQR不可
                const reader = new FileReader();
                reader.onload = (event) => {
                    imagePreview2.src = event.target.result;
                    originalImgSrc2 = event.target.result;
                    document.getElementById('controls-2').querySelector('.mosaic-btn').innerHTML = '⬛';
                    document.getElementById('image-preview-2').setAttribute('data-mosaiced', 'false');
                    updatePreviewState();
                };
                reader.readAsDataURL(file);
            }
        });

        // AI画像生成ボタン処理
        if (aiGenerateBtn1) {
            aiGenerateBtn1.addEventListener('click', () => {
                generateAIImage(aiPromptInput.value.trim(), 1, aiGenerateBtn1);
            });
        }

        if (aiGenerateBtn2) {
            aiGenerateBtn2.addEventListener('click', () => {
                generateAIImage(aiPromptInput.value.trim(), 2, aiGenerateBtn2);
            });
        }

        // セリフ生成処理
        generateBtn.addEventListener('click', () => {
            speechBubble1.classList.remove('show');
            speechBubble2.classList.remove('show');
            speechBubble1.classList.add('hidden');
            speechBubble2.classList.add('hidden');
            window.speechSynthesis.cancel();

            // 性格設定の取得
            const personalitySelect = document.getElementById('personality-select');
            const personality = personalitySelect ? personalitySelect.value : 'standard';
            
            let currentSingle = standardSingle;
            let currentConvo = standardConversations;
            let femaleVoicePitch = 1.0;
            let femaleVoiceRate = 0.65;
            let maleVoicePitch = 0.75;
            let maleVoiceRate = 0.8;

            if (personality === 's') {
                currentSingle = sSingle;
                currentConvo = sConversations;
                femaleVoicePitch = 1.2; // 少し高めで冷たい感じ
                femaleVoiceRate = 0.7;
                maleVoicePitch = 0.6; // 低く服従する感じ
                maleVoiceRate = 0.6;
            } else if (personality === 'm') {
                currentSingle = mSingle;
                currentConvo = mConversations;
                femaleVoicePitch = 1.5; // 高めで甘えた感じ
                femaleVoiceRate = 0.6;
                maleVoicePitch = 0.8; // 強気な感じ
                maleVoiceRate = 0.9;
            } else if (personality === 'none') {
                currentSingle = noneSingle;
                currentConvo = noneConversations;
                femaleVoicePitch = 1.0; // 普通のピッチ
                femaleVoiceRate = 1.0; // 普通の速度
                maleVoicePitch = 1.0;
                maleVoiceRate = 1.0;
            }

            // 音声設定を一時的に上書きするラッパー関数
            const speakCustomText = (text, isFemaleVoice, onEndCallback) => {
                if (!window.speechSynthesis) {
                    if (onEndCallback) setTimeout(onEndCallback, 2000);
                    return;
                }

                const cleanText = text.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');
                window.speechSynthesis.cancel();
                
                const utterance = new SpeechSynthesisUtterance(cleanText);
                utterance.lang = 'ja-JP';
                
                const jaVoices = voices.filter(v => v.lang.includes('ja'));
                if (jaVoices.length > 0) {
                    if (isFemaleVoice) {
                        utterance.voice = jaVoices.find(v => v.name.includes('Haruka') || v.name.includes('Nanami') || v.name.includes('Female')) || jaVoices[0];
                        utterance.pitch = femaleVoicePitch;
                        utterance.rate = femaleVoiceRate;
                    } else {
                        utterance.voice = jaVoices.find(v => v.name.includes('Keita') || v.name.includes('Male')) || jaVoices[0];
                        utterance.pitch = maleVoicePitch;
                        utterance.rate = maleVoiceRate;
                    }
                }

                if (onEndCallback) utterance.onend = onEndCallback;
                window.speechSynthesis.speak(utterance);
            };

            if (hasImage1 && hasImage2) {
                // 2枚の場合（掛け合い）
                generateBtn.disabled = true;
                const randomIndex = Math.floor(Math.random() * currentConvo.length);
                const convo = currentConvo[randomIndex];
                
                jokeText1.textContent = convo[0];
                jokeText2.textContent = convo[1];

                speechBubble1.classList.remove('hidden');
                setTimeout(() => { speechBubble1.classList.add('show'); }, 50);
                
                speakCustomText(convo[0], true, () => {
                    speechBubble2.classList.remove('hidden');
                    setTimeout(() => { speechBubble2.classList.add('show'); }, 50);
                    speakCustomText(convo[1], false, () => {
                        generateBtn.disabled = false;
                    });
                });
            } else if (hasImage1 || hasImage2) {
                // 1枚のみの場合
                const randomIndex = Math.floor(Math.random() * currentSingle.length);
                const selectedJoke = currentSingle[randomIndex];
                
                if (hasImage1) {
                    jokeText1.textContent = selectedJoke;
                    speechBubble1.classList.remove('hidden');
                    setTimeout(() => { speechBubble1.classList.add('show'); }, 50);
                } else {
                    jokeText2.textContent = selectedJoke;
                    speechBubble2.classList.remove('hidden');
                    setTimeout(() => { speechBubble2.classList.add('show'); }, 50);
                }
                speakCustomText(selectedJoke, true, null);
            }
        });
    }

    // ホテル検索ロジック
    const findHotelBtn = document.getElementById('find-hotel-btn');
    if (findHotelBtn) {
        findHotelBtn.addEventListener('click', () => {
            if ("geolocation" in navigator) {
                const originalText = findHotelBtn.innerHTML;
                findHotelBtn.innerHTML = "現在地を取得中... ⏳";
                findHotelBtn.disabled = true;

                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const lat = position.coords.latitude;
                        const lng = position.coords.longitude;
                        const mapUrl = `https://www.google.com/maps/search/ラブホテル/@${lat},${lng},15z`;
                        window.open(mapUrl, '_blank');
                        
                        findHotelBtn.innerHTML = originalText;
                        findHotelBtn.disabled = false;
                    }, 
                    (error) => {
                        console.error("Geolocation error:", error);
                        window.open('https://www.google.com/maps/search/ラブホテル/', '_blank');
                        findHotelBtn.innerHTML = originalText;
                        findHotelBtn.disabled = false;
                    },
                    { timeout: 5000 }
                );
            } else {
                window.open('https://www.google.com/maps/search/ラブホテル/', '_blank');
            }
        });
    }

    // 画像編集・保存・QRロジック
    document.querySelectorAll('.save-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const target = e.target.closest('.ctrl-btn').getAttribute('data-target');
            const img = document.getElementById(`image-preview-${target}`);
            if (!img.src) return;

            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth || img.width;
            canvas.height = img.naturalHeight || img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            
            try {
                const dataUrl = canvas.toDataURL('image/png');
                const link = document.createElement('a');
                link.download = `midnight-whisper-${Date.now()}.png`;
                link.href = dataUrl;
                link.click();
            } catch (err) {
                alert('画像データの取得に失敗しました。');
                console.error(err);
            }
        });
    });

    document.querySelectorAll('.mosaic-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const btnEl = e.target.closest('.ctrl-btn');
            const target = btnEl.getAttribute('data-target');
            const img = document.getElementById(`image-preview-${target}`);
            if (!img.src) return;

            const isMosaiced = img.getAttribute('data-mosaiced') === 'true';

            if (isMosaiced) {
                // モザイク解除（元の画像に戻す）
                img.src = target === '1' ? originalImgSrc1 : originalImgSrc2;
                img.setAttribute('data-mosaiced', 'false');
                btnEl.innerHTML = '⬛';
                btnEl.title = 'モザイク';
            } else {
                // Canvasを使ったモザイク処理
                const canvas = document.createElement('canvas');
                const w = img.naturalWidth || img.width;
                const h = img.naturalHeight || img.height;
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext('2d');
                
                // 縮小してピクセル化
                const mosaicSize = 0.05; // 5%に縮小
                const smallW = Math.max(1, Math.floor(w * mosaicSize));
                const smallH = Math.max(1, Math.floor(h * mosaicSize));
                
                ctx.drawImage(img, 0, 0, smallW, smallH);
                
                // 補間なしで拡大
                ctx.imageSmoothingEnabled = false;
                ctx.drawImage(canvas, 0, 0, smallW, smallH, 0, 0, w, h);
                
                try {
                    img.src = canvas.toDataURL('image/png');
                    img.setAttribute('data-mosaiced', 'true');
                    btnEl.innerHTML = '⬜';
                    btnEl.title = 'モザイク解除';
                } catch(err) {
                    alert('モザイク処理に失敗しました（CORSエラー等）。');
                    console.error(err);
                }
            }
        });
    });

    // QRモーダル
    const qrModal = document.getElementById('qr-modal');
    const qrImage = document.getElementById('qr-image');
    const closeQr = document.getElementById('close-qr');

    document.querySelectorAll('.qr-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const target = e.target.closest('.ctrl-btn').getAttribute('data-target');
            const url = target === '1' ? aiUrl1 : aiUrl2;
            if (!url) {
                alert('この画像はローカルからアップロードされたか、QRコード化できない画像です。AIで生成した画像のみ対応しています。');
                return;
            }
            // QRコード生成APIを呼び出し
            const encodedUrl = encodeURIComponent(url);
            qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodedUrl}`;
            qrModal.classList.remove('hidden');
        });
    });

    if (closeQr) {
        closeQr.addEventListener('click', () => {
            qrModal.classList.add('hidden');
        });
    }

    // 緊急回避機能 (Panic Mode)
    const panicBtn = document.getElementById('panic-btn');
    const returnBtn = document.getElementById('return-btn');
    const toggleSafeMode = () => {
        document.body.classList.toggle('safe-mode');
        window.speechSynthesis.cancel();
    };

    if (panicBtn) {
        panicBtn.addEventListener('click', toggleSafeMode);
    }
    if (returnBtn) {
        returnBtn.addEventListener('click', toggleSafeMode);
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            toggleSafeMode();
        }
    });
});
