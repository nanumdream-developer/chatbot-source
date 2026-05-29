document.addEventListener("DOMContentLoaded", () => {
    chatbotJsPkg.init();
});

const chatbotJsPkg = {
    config: {
        cdnImgPath: "https://cdn.jsdelivr.net/gh/nanumdream-developer/chatbot-source@main/image",
        serverUrl: "https://nanumdream.com/chatbot"
    },
    state: {
        requestTimes: []
    },
    init: function() {
        if (!document.getElementById("chatbot")) {
            this.injectWidgetHTML();
        }
        this.bindEvents();
        this.loadHistory();
        this.optionFontsize();

        const chatbotEl = document.getElementById("chatbot");
        if(window.innerWidth > 678 && localStorage.getItem("chat_open") === "1"){
            chatbotEl.classList.add("open");
        }
        
        const savedFontSize = localStorage.getItem('chatFontSize');
        if(savedFontSize) {
            document.querySelector(".chat-cont").style.fontSize = `${savedFontSize}px`;
        }
    },
    injectWidgetHTML: function(){

        //css
        if(!document.getElementById("wavedream-chatbot-style")){
            const cssLink = document.createElement("link");
            cssLink.id = "wavedream-chatbot-style";
            cssLink.rel = "stylesheet";
            document.head.appendChild(cssLink);

        }
        
        const widgetHTML = `
        <div id="chatbot">
            <div class="chatbot__chat">
                <div class="chat-header">
                    <span><img src="${this.config.cdnImgPath}/wavedream_logo_symbol.png" alt="웨이브드림"></span>
                    <p>WD AI 상담원</p>
                    <div class="font-size">
                        <div class="font-size-btn down"><span>가 -</span></div>
                        <div class="font-size-btn up"><span>가 +</span></div>
                    </div>
                    <div class="close">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="size-6">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                    </div>
                </div>

                <div class="chat-cont">
                    <div class="chat-cont__msg ai-msg">안녕하세요, 무엇을 도와드릴까요?</div>
                </div>

                <div class="chat-input">
                    <div class="chat-input__wr">
                        <input type="text" id="user-input" placeholder="질문을 남겨주세요">
                        <button id="send-btn">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="size-6">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 10.5 12 3m0 0 7.5 7.5M12 3v18" />
                            </svg>
                        </button>
                    </div>
                    <p class="chat-input__notice">AI는 한정된 데이터에 기반하니 <br>상세 내용은 고객센터로 문의해 주세요.</p>
                </div>
            </div>
            <div class="chatbot__btn">
                <div class="chatbot__btn-open"><img src="${this.config.cdnImgPath}/chat_img.png" alt="챗봇 열기"></div>
                <div class="chatbot__btn-close"><img src="${this.config.cdnImgPath}/chat_img_close.png" alt="챗봇 닫기"></div>
            </div>
        </div>
        `;

        document.body.insertAdjacentHTML('beforeend', widgetHTML);
    },
    loadHistory: function() {
        const chatHistory = JSON.parse(sessionStorage.getItem('chatHistory')) || [];
        const chatCont = document.querySelector(".chat-cont");

        if(chatHistory.length > 0) {
            chatHistory.forEach(msg => {
                const text = msg.parts[0].text;
                if(msg.role === "user") {
                    chatCont.insertAdjacentHTML('beforeend', `<div class="chat-cont__msg user-msg">${text}</div>`);
                } else if (msg.role === "model") {
                    const parsedText = this.parseMarkdown(text);
                    chatCont.insertAdjacentHTML('beforeend', `<div class="chat-cont__msg ai-msg">${parsedText}</div>`);
                }
            });
            this.scrollToBottom();
        }
    },
    bindEvents: function() {
        // 이벤트 위임 (jQuery의 $(document).on 역할)
        document.addEventListener("click", (e) => {
            // 챗봇 열기/닫기 토글
            if (e.target.closest(".chatbot__btn") || e.target.closest("#chatbot .close")) {
                const chatbot = document.getElementById("chatbot");
                const isOpen = chatbot.classList.contains("open");
                
                if (isOpen) {
                    chatbot.classList.remove("open");
                    localStorage.setItem("chat_open", "0");
                    if (window.innerWidth <= 768) document.body.classList.remove("hold");
                } else {
                    chatbot.classList.add("open");
                    localStorage.setItem("chat_open", "1");
                    this.scrollToBottom();
                    if (window.innerWidth <= 768) document.body.classList.add("hold");
                }
            }

            // 전송 버튼 클릭
            if (e.target.closest("#send-btn")) {
                this.sendMessage();
            }
        });

        // 엔터키 입력
        document.addEventListener("keypress", (e) => {
            if (e.target.id === "user-input" && e.key === "Enter") {
                this.sendMessage();
            }
        });
    },
    sendMessage: function() {
        const input = document.getElementById("user-input");
        const messageText = input.value.trim();

        if(!messageText) return;
        
        const chatCont = document.querySelector(".chat-cont");

        // 사용자 말풍선 추가
        chatCont.insertAdjacentHTML('beforeend', `<div class="chat-cont__msg user-msg">${messageText}</div>`);
        input.value = "";
        this.scrollToBottom();
        
        chatCont.insertAdjacentHTML('beforeend', `
            <div class="chat-cont__msg ai-msg loading" id="loading-msg">
                <div class="ai-msg__icon"><img src="${this.config.cdnImgPath}/wavedream_logo_symbol.png" alt="웨이브드림"></div>
                <div class="typing-indicator">
                    <span></span><span></span><span></span>
                </div>
            </div>
        `);
        this.scrollToBottom();

        let chatHistory = JSON.parse(sessionStorage.getItem('chatHistory')) || [];
        chatHistory.push({
            "role" : "user",
            "parts":[{"text": messageText}]
        });

        const currentSiteId = (window.WavedreamChatConfig && window.WavedreamChatConfig.siteId) ? window.WavedreamChatConfig.siteId : 'wavedreamkr';

        fetch(`${this.config.serverUrl}/chat.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                history: chatHistory,
                site_id: currentSiteId
            })
        })
        .then(response => response.json())
        .then(data => {
            document.getElementById("loading-msg").remove();

            if (data.error) {
                console.error(`%c[Gemini API 에러] 코드: ${data.error.code} | 상태: ${data.error.status}\n메시지: ${data.error.message}`, "color: #ff4d4d; font-weight: bold;");
                chatHistory.pop();
                sessionStorage.setItem('chatHistory', JSON.stringify(chatHistory));
                
                const errMsg = data.error.code === 429 ? "죄송합니다. 현재 답변을 처리할 수 없습니다. 잠시 후 다시 질문해 주시거나 고객센터로 문의해 주세요." : `오류가 발생했습니다: ${data.error.message}`;
                chatCont.insertAdjacentHTML('beforeend', `<div class="chat-cont__msg ai-msg">${errMsg}</div>`);
                this.scrollToBottom();
                return;
            }

            if(data.candidates && data.candidates[0].content.parts[0].text){
                let aiReply = data.candidates[0].content.parts[0].text;

                chatHistory.push({
                    "role":"model",
                    "parts": [{"text": aiReply}]
                });
                sessionStorage.setItem('chatHistory', JSON.stringify(chatHistory));

                aiReply = this.parseMarkdown(aiReply);
                
                // aiBubble 요소 생성 후 추가
                const aiBubble = document.createElement('div');
                aiBubble.className = 'chat-cont__msg ai-msg';
                chatCont.appendChild(aiBubble);
                this.scrollToBottom();

                this.typeWrite(aiBubble, aiReply);
            } else {
                chatHistory.pop();
                sessionStorage.setItem('chatHistory', JSON.stringify(chatHistory));
                chatCont.insertAdjacentHTML('beforeend', `<div class="chat-cont__msg ai-msg">죄송합니다. 현재 답변을 처리할 수 없습니다. 잠시 후 다시 질문해 주시거나 고객센터로 문의해 주세요.</div>`);
            }
        })
        .catch(error => {
            const loadingMsg = document.getElementById("loading-msg");
            if(loadingMsg) loadingMsg.remove();
            chatHistory.pop();
            sessionStorage.setItem('chatHistory', JSON.stringify(chatHistory));
            chatCont.insertAdjacentHTML('beforeend', `<div class="chat-cont__msg ai-msg">통신 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.</div>`);
            this.scrollToBottom();
        });
    },
    parseMarkdown: function(text){
        return text
            .replace(/^### (.*$)/gim, '<strong style="display:block; font-size:1.1em; margin-top:10px; color:#333;">$1</strong>')
            .replace(/^## (.*$)/gim, '<strong style="display:block; font-size:1.2em; margin-top:12px; color:#222;">$1</strong>')
            .replace(/^# (.*$)/gim, '<strong style="display:block; font-size:1.3em; margin-top:14px; color:#000;">$1</strong>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/^\* (.*$)/gim, '<li>$1</li>')
            .replace(/\n/g, '<br>');
    },
    scrollToBottom: function(){
        const chatCont = document.querySelector(".chat-cont");
        if(chatCont){
            chatCont.scrollTop = chatCont.scrollHeight;
        }
    },
    typeWrite: function(element, htmlContent){
        let currentText = "";
        let index = 0;
        const length = htmlContent.length;

        const interval = setInterval(() => {
            if(index >= length){
                clearInterval(interval);
                return;
            }

            if(htmlContent[index] === '<'){
                const closingIndex = htmlContent.indexOf('>', index);
                if(closingIndex !== -1){
                    currentText += htmlContent.substring(index, closingIndex + 1);
                    index = closingIndex + 1;
                } else {
                    currentText += htmlContent[index];
                    index++;
                }
            } else {
                currentText += htmlContent[index];
                index++;
            }

            element.innerHTML = currentText;
            this.scrollToBottom();
        }, 20);
    },
    optionFontsize: function(){
        document.querySelectorAll(".font-size-btn").forEach(btn => {
            btn.addEventListener("click", function() {
                const chatCont = document.querySelector(".chat-cont");
                let chatSize = parseInt(window.getComputedStyle(chatCont).fontSize);
                let targetSize = this.classList.contains("up") ? chatSize + 1 : chatSize - 1;
                let finalSize = Math.max(14, Math.min(20, targetSize));

                chatCont.style.fontSize = `${finalSize}px`;
                localStorage.setItem('chatFontSize', finalSize);
            });
        });
    },
};