import { quizData } from './quizData.js';

export class QuizController {
  constructor() {
    this.quizModal = document.getElementById('quiz-modal');
    this.questionText = document.getElementById('quiz-question');
    this.optionsContainer = document.getElementById('quiz-options');
    this.quizProgress = document.getElementById('quiz-progress');
    this.quizScore = document.getElementById('quiz-score');
    this.closeBtn = document.getElementById('close-quiz-btn');
    this.restartBtn = document.getElementById('restart-quiz-btn');
    this.quizResultPanel = document.getElementById('quiz-result');
    this.quizGamePanel = document.getElementById('quiz-game');
    
    this.currentQuestionIndex = 0;
    this.score = 0;
    this.questions = [];
    
    this.initEvents();
  }

  initEvents() {
    const startBtn = document.getElementById('quiz-btn');
    if (startBtn) {
      startBtn.addEventListener('click', () => this.startQuiz());
    }

    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', () => this.closeQuiz());
    }

    if (this.restartBtn) {
      this.restartBtn.addEventListener('click', () => this.startQuiz());
    }
  }

  startQuiz() {
    // Shuffle and pick 20 questions (all of them)
    this.questions = [...quizData].sort(() => Math.random() - 0.5);
    this.currentQuestionIndex = 0;
    this.score = 0;
    
    this.quizGamePanel.classList.remove('hidden');
    this.quizResultPanel.classList.add('hidden');
    this.quizModal.classList.remove('hidden');
    
    this.renderQuestion();
  }

  renderQuestion() {
    if (this.currentQuestionIndex >= this.questions.length) {
      this.showResult();
      return;
    }

    const q = this.questions[this.currentQuestionIndex];
    this.quizProgress.innerText = `سوال ${this.currentQuestionIndex + 1} از ${this.questions.length}`;
    this.questionText.innerText = q.question;
    
    this.optionsContainer.innerHTML = '';
    
    q.options.forEach((opt, index) => {
      const btn = document.createElement('button');
      btn.className = 'quiz-option-btn';
      btn.innerText = opt;
      btn.addEventListener('click', () => this.checkAnswer(index, btn, q.correctAnswer));
      this.optionsContainer.appendChild(btn);
    });
  }

  checkAnswer(selectedIndex, btnElement, correctIndex) {
    // Disable all options so they can't click twice
    const allBtns = this.optionsContainer.querySelectorAll('.quiz-option-btn');
    allBtns.forEach(b => b.disabled = true);

    if (selectedIndex === correctIndex) {
      btnElement.classList.add('correct');
      this.score++;
    } else {
      btnElement.classList.add('wrong');
      allBtns[correctIndex].classList.add('correct');
    }

    // Move to next question after 1.5 seconds
    setTimeout(() => {
      this.currentQuestionIndex++;
      this.renderQuestion();
    }, 1500);
  }

  showResult() {
    this.quizGamePanel.classList.add('hidden');
    this.quizResultPanel.classList.remove('hidden');
    
    const percentage = Math.round((this.score / this.questions.length) * 100);
    let message = '';
    if (percentage === 100) message = 'فوق‌العاده! شما یک کیهان‌شناس هستید! 🌌';
    else if (percentage >= 80) message = 'عالی بود! اطلاعات فضایی شما خیلی خوبه! 🚀';
    else if (percentage >= 50) message = 'خوب بود، ولی بازم به سیاره‌ها سر بزن! 🔭';
    else message = 'باید بیشتر روی اطلاعات فضایی‌ت کار کنی! 👽';

    this.quizScore.innerHTML = `
      <h3>امتیاز شما: ${this.score} از ${this.questions.length}</h3>
      <p style="font-size: 1.2rem; margin-top: 10px; color: var(--accent-cyan)">${message}</p>
    `;
  }

  closeQuiz() {
    this.quizModal.classList.add('hidden');
  }
}
