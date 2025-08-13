/**
 * 獨立的計時器組件
 * 包含邏輯和顯示的完整實作
 */

class Timer {
  constructor(containerId, options = {}) {
    this.containerId = containerId;
    this.options = {
      // 預設設定
      warningTime: 5,        // 警告時間閾值
      criticalTime: 3,       // 危險時間閾值
      onExpired: null,       // 時間到期的回調函數
      onUpdate: null,        // 每秒更新的回調函數
      hideOnExpired: false,  // 時間到期後是否隱藏計時器
      ...options
    };
    
    this.timer = null;
    this.timeLeft = 0;
    this.totalTime = 0;
    this.isRunning = false;
    
    this.createTimerElement();
  }
  
  /**
   * 創建計時器 DOM 元素
   */
  createTimerElement() {
    const container = document.getElementById(this.containerId);
    if (!container) {
      console.error(`❌ 找不到容器元素: ${this.containerId}`);
      return;
    }
    
    container.innerHTML = `
      <div class="timer-component" style="display: none;">
        <div class="timer-display-wrapper">
          <div class="timer-number">0</div>
          <div class="timer-label">秒</div>
        </div>
        <div class="timer-progress-container">
          <div class="timer-progress-bar">
            <div class="timer-progress-fill"></div>
          </div>
        </div>
      </div>
    `;
    
    this.elements = {
      container: container.querySelector('.timer-component'),
      number: container.querySelector('.timer-number'),
      label: container.querySelector('.timer-label'),
      progressContainer: container.querySelector('.timer-progress-container'),
      progressBar: container.querySelector('.timer-progress-bar'),
      progressFill: container.querySelector('.timer-progress-fill')
    };
  }
  
  /**
   * 開始計時
   * @param {number} seconds - 計時秒數
   */
  start(seconds) {
    if (seconds <= 0) {
      console.log('🔥 計時設定為0或負數，不啟動計時器');
      return;
    }
    
    console.log('🔥 開始計時器，時間:', seconds, '秒');
    
    // 停止現有計時器
    this.stop();
    
    // 設定初始值
    this.timeLeft = seconds;
    this.totalTime = seconds;
    this.isRunning = true;
    
    // 顯示計時器
    this.show();
    
    // 初始更新
    this.updateDisplay();
    
    // 啟動計時器
    this.timer = setInterval(() => {
      this.timeLeft--;
      this.updateDisplay();
      
      // 觸發更新回調
      if (this.options.onUpdate) {
        this.options.onUpdate(this.timeLeft, this.totalTime);
      }
      
      if (this.timeLeft <= 0) {
        this.onExpired();
      }
    }, 1000);
  }
  
  /**
   * 停止計時器
   */
  stop() {
    console.log('🔥 停止計時器');
    
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    
    this.isRunning = false;
    this.hide();
  }
  
  /**
   * 暫停計時器
   */
  pause() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      this.isRunning = false;
    }
  }
  
  /**
   * 恢復計時器
   */
  resume() {
    if (!this.isRunning && this.timeLeft > 0) {
      this.start(this.timeLeft);
    }
  }
  
  /**
   * 顯示計時器
   */
  show() {
    if (this.elements.container) {
      this.elements.container.style.display = 'block';
    }
  }
  
  /**
   * 隱藏計時器
   */
  hide() {
    if (this.elements.container) {
      this.elements.container.style.display = 'none';
    }
  }
  
  /**
   * 更新顯示
   */
  updateDisplay() {
    if (!this.elements.number || !this.elements.progressFill) {
      return;
    }
    
    // 更新數字顯示
    this.elements.number.textContent = this.timeLeft;
    
    // 更新進度條
    const progress = (this.totalTime - this.timeLeft) / this.totalTime;
    const progressPercent = Math.min(100, Math.max(0, progress * 100));
    this.elements.progressFill.style.width = `${progressPercent}%`;
    
    // 更新狀態樣式
    this.updateStateStyles();
    
    console.log('🔥 計時器更新:', this.timeLeft, '秒剩餘, 進度:', progressPercent.toFixed(1) + '%');
  }
  
  /**
   * 更新狀態樣式（顏色變化）
   */
  updateStateStyles() {
    const container = this.elements.container;
    const progressFill = this.elements.progressFill;
    
    // 移除所有狀態類
    container.classList.remove('timer-warning', 'timer-critical');
    
    // 根據剩餘時間添加狀態類
    if (this.timeLeft <= this.options.criticalTime) {
      container.classList.add('timer-critical');
      progressFill.style.backgroundColor = '#f44336';
    } else if (this.timeLeft <= this.options.warningTime) {
      container.classList.add('timer-warning');
      progressFill.style.backgroundColor = '#ff9800';
    } else {
      progressFill.style.backgroundColor = '#4CAF50';
    }
  }
  
  /**
   * 計時器到期處理
   */
  onExpired() {
    console.log('🔥 計時器到期！');
    
    // 停止計時器
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    
    this.isRunning = false;
    
    // 根據設定決定是否隱藏
    if (this.options.hideOnExpired) {
      this.hide();
    } else {
      // 保留在 0 的狀態
      this.updateDisplay();
    }
    
    // 觸發到期回調
    if (this.options.onExpired) {
      this.options.onExpired();
    }
  }
  
  /**
   * 獲取當前狀態
   */
  getState() {
    return {
      timeLeft: this.timeLeft,
      totalTime: this.totalTime,
      isRunning: this.isRunning,
      progress: this.totalTime > 0 ? (this.totalTime - this.timeLeft) / this.totalTime : 0
    };
  }
  
  /**
   * 設定選項
   */
  setOptions(newOptions) {
    this.options = { ...this.options, ...newOptions };
  }
  
  /**
   * 銷毀計時器
   */
  destroy() {
    this.stop();
    if (this.elements.container && this.elements.container.parentNode) {
      this.elements.container.parentNode.removeChild(this.elements.container);
    }
  }
}

// 導出 Timer 類別
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Timer;
} else if (typeof window !== 'undefined') {
  window.Timer = Timer;
}