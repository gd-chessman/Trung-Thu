/**
 * TriviaModal.js
 * Mid-Autumn Folklore Stories & Interactive Trivia Quiz with 3D fireworks reward
 */

import { audioManager } from '../audio/AudioManager.js';

export class TriviaModal {
  constructor(sceneManager, showToastFn) {
    this.sceneManager = sceneManager;
    this.showToast = showToastFn;

    this.overlay = document.getElementById('trivia-modal');
    this.closeBtn = document.getElementById('btn-close-trivia');

    this.tabStoriesBtn = document.getElementById('tab-btn-stories');
    this.tabQuizBtn = document.getElementById('tab-btn-quiz');
    this.contentStories = document.getElementById('content-stories');
    this.contentQuiz = document.getElementById('content-quiz');

    this.initEvents();
    this.initQuiz();
  }

  initEvents() {
    this.closeBtn.addEventListener('click', () => this.close());
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.close();
    });

    // Tab switching
    this.tabStoriesBtn.addEventListener('click', () => {
      this.tabStoriesBtn.classList.add('active');
      this.tabQuizBtn.classList.remove('active');
      this.contentStories.classList.add('active');
      this.contentQuiz.classList.remove('active');
    });

    this.tabQuizBtn.addEventListener('click', () => {
      this.tabQuizBtn.classList.add('active');
      this.tabStoriesBtn.classList.remove('active');
      this.contentQuiz.classList.add('active');
      this.contentStories.classList.remove('active');
    });
  }

  initQuiz() {
    const quizData = [
      {
        question: "1. Đèn ông sao truyền thống thường có bao nhiêu cánh và tượng trưng cho điều gì?",
        options: [
          { text: "A. 4 cánh - Tượng trưng cho 4 mùa Xuân Hạ Thu Đông", correct: false },
          { text: "B. 5 cánh - Tượng trưng cho Ngũ hành (Kim, Mộc, Thủy, Hỏa, Thổ)", correct: true },
          { text: "C. 6 cánh - Tượng trưng cho lục hợp", correct: false }
        ]
      },
      {
        question: "2. Theo sự tích dân gian Việt Nam, ai là người gắn liền với cây đa trên cung trăng?",
        options: [
          { text: "A. Thần Nông", correct: false },
          { text: "B. Chú Cuội", correct: true },
          { text: "C. Thạch Sanh", correct: false }
        ]
      },
      {
        question: "3. Chiếc bánh nướng Trung Thu truyền thống có ý nghĩa biểu trưng sâu sắc nào?",
        options: [
          { text: "A. Biểu tượng cho sự đoàn viên sum vầy, tri ân tổ tiên và tình thân", correct: true },
          { text: "B. Chỉ dùng để thi cỗ trăng rằm", correct: false },
          { text: "C. Để dự trữ cho mùa đông lạnh giá", correct: false }
        ]
      },
      {
        question: "4. Hoạt động biểu diễn náo nhiệt nhất thường thấy vào đêm rước đèn Trung Thu là gì?",
        options: [
          { text: "A. Múa rồng, múa lân sư rồng cùng tiếng trống hội tùng dinh", correct: true },
          { text: "B. Đua thuyền rồng", correct: false },
          { text: "C. Hát xoan đầu đình", correct: false }
        ]
      }
    ];

    const quizContainer = document.getElementById('quiz-list');
    quizContainer.innerHTML = '';

    quizData.forEach((q, qIndex) => {
      const card = document.createElement('div');
      card.className = 'quiz-card';

      const qTitle = document.createElement('div');
      qTitle.className = 'quiz-question';
      qTitle.textContent = q.question;
      card.appendChild(qTitle);

      const optGroup = document.createElement('div');
      optGroup.className = 'quiz-options';

      q.options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'quiz-opt-btn';
        btn.textContent = opt.text;

        btn.addEventListener('click', () => {
          // Disable all sibling buttons
          const siblings = optGroup.querySelectorAll('.quiz-opt-btn');
          siblings.forEach(b => b.style.pointerEvents = 'none');

          if (opt.correct) {
            btn.classList.add('correct');
            audioManager.playChime(1046, 0.4);
            // Reward with 3D fireworks in the background!
            this.sceneManager.shootFirework();
            if (this.showToast) {
              this.showToast('🎉 Chính xác! Bạn nhận được một chùm pháo hoa chúc mừng!');
            }
          } else {
            btn.classList.add('wrong');
            // Highlight the correct one
            siblings.forEach(b => {
              if (b.textContent.includes('B. 5 cánh') || b.textContent.includes('B. Chú Cuội') || b.textContent.includes('A. Biểu tượng') || b.textContent.includes('A. Múa rồng')) {
                b.classList.add('correct');
              }
            });
          }
        });

        optGroup.appendChild(btn);
      });

      card.appendChild(optGroup);
      quizContainer.appendChild(card);
    });
  }

  open() {
    this.overlay.classList.add('active');
  }

  close() {
    this.overlay.classList.remove('active');
  }
}
