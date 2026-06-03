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

    // 1枚のみアップロードされた場合のセリフ
    const singleJokes = [
        "お前のバナナ、黒ずんでるな🍌",
        "ちょっと！どこ触ってんのよ！😡",
        "いやーん、えっち！🙈",
        "そんなに見つめられたら…濡れちゃう💦",
        "奥まで…見えそう…🫣",
        "今日、下着つけてないんだよね…🤫",
        "もっと激しくして…！🔥",
        "ふふっ、立派なモノ持ってるじゃん🍆",
        "あぁん…そこはダメっ…！🔞",
        "えっ、もう入れちゃうの？😳"
    ];

    // 2枚アップロードされた場合の掛け合いセリフ
    const conversations = [
        ["ねえ、今日どうする？", "…ホテル、行く？"],
        ["どこ見てるのよ…変態", "いや、見えそうだったからつい…"],
        ["私、もう我慢できないかも…", "俺も…ギリギリだよ"],
        ["シャワー、一緒に入る？", "背中、流してあげる"],
        ["こんなところじゃ…誰か来ちゃう", "大丈夫、誰にも見られないから"],
        ["えっ…そんなに大きいの…？", "お前のせいだぞ…"],
        ["優しくしてね…", "任せろ、可愛がってやるよ"],
        ["もしかして、感じてる？", "…うるさい、見ないでよ…"],
        ["今日帰りたくないな…", "じゃあ、朝まで一緒にいようか"]
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
        } else {
            wrapper1.classList.add('hidden');
        }

        if (hasImage2) {
            wrapper2.classList.remove('hidden');
        } else {
            wrapper2.classList.add('hidden');
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

        // ユーザーの要望に加え、スタイル指定、エロ（erotic）と露出度高めの要素を付与する隠しプロンプト
        const enhancedPrompt = prompt + stylePrompt + extraKeywords + ", masterpiece, best quality, highly detailed, erotic, revealing clothes";
        const encodedPrompt = encodeURIComponent(enhancedPrompt);
        const randomSeed = Math.floor(Math.random() * 1000000);
        const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=400&height=400&nologo=true&seed=${randomSeed}`;

        const img = new Image();
        img.onload = () => {
            if (imageNumber === 1) {
                imagePreview1.src = imageUrl;
                hasImage1 = true;
            } else {
                imagePreview2.src = imageUrl;
                hasImage2 = true;
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
                const reader = new FileReader();
                reader.onload = (event) => {
                    imagePreview1.src = event.target.result;
                    updatePreviewState();
                };
                reader.readAsDataURL(file);
            }
        });

        imageUpload2.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                hasImage2 = true;
                const reader = new FileReader();
                reader.onload = (event) => {
                    imagePreview2.src = event.target.result;
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

            if (hasImage1 && hasImage2) {
                // 2枚の場合（掛け合い）
                generateBtn.disabled = true;
                const randomIndex = Math.floor(Math.random() * conversations.length);
                const convo = conversations[randomIndex];
                
                jokeText1.textContent = convo[0];
                jokeText2.textContent = convo[1];

                speechBubble1.classList.remove('hidden');
                setTimeout(() => { speechBubble1.classList.add('show'); }, 50);
                
                speakText(convo[0], true, () => {
                    speechBubble2.classList.remove('hidden');
                    setTimeout(() => { speechBubble2.classList.add('show'); }, 50);
                    speakText(convo[1], false, () => {
                        generateBtn.disabled = false;
                    });
                });
            } else if (hasImage1 || hasImage2) {
                // 1枚のみの場合
                const randomIndex = Math.floor(Math.random() * singleJokes.length);
                const selectedJoke = singleJokes[randomIndex];
                
                if (hasImage1) {
                    jokeText1.textContent = selectedJoke;
                    speechBubble1.classList.remove('hidden');
                    setTimeout(() => { speechBubble1.classList.add('show'); }, 50);
                } else {
                    jokeText2.textContent = selectedJoke;
                    speechBubble2.classList.remove('hidden');
                    setTimeout(() => { speechBubble2.classList.add('show'); }, 50);
                }
                speakText(selectedJoke, true, null);
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
});
