// ===================================================
// tutorial.js — Interactive Step-by-Step Guided Tour
// ===================================================

const Tutorial = {
    steps: [],
    currentStepIndex: 0,
    isActive: false,

    /**
     * Start a tutorial sequence.
     * @param {Array} steps - Array of { target: '#id', title: '...', text: '...', position: 'bottom|top|left|right' }
     */
    start: function (steps) {
        if (!_settings.tutorialMode) return;
        if (!steps || steps.length === 0) return;

        this.steps = steps;
        this.currentStepIndex = 0;
        this.isActive = true;

        this.createBackdrop();
        this.createPopover();
        this.showStep();
    },

    createBackdrop: function () {
        let backdrop = document.getElementById('tutorial-backdrop');
        if (!backdrop) {
            backdrop = document.createElement('div');
            backdrop.id = 'tutorial-backdrop';
            backdrop.style.cssText = `
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        z-index: 10000;
        display: none;
        transition: opacity 0.3s;
        opacity: 0;
      `;
            document.body.appendChild(backdrop);
        }
        backdrop.style.display = 'block';
        // Force reflow
        void backdrop.offsetWidth;
        backdrop.style.opacity = '1';
    },

    createPopover: function () {
        let popover = document.getElementById('tutorial-popover');
        if (!popover) {
            popover = document.createElement('div');
            popover.id = 'tutorial-popover';
            popover.style.cssText = `
        position: absolute;
        background: var(--bg);
        border: 1px solid var(--border);
        border-radius: var(--r-md);
        box-shadow: 0 10px 25px rgba(0,0,0,0.2);
        width: 300px;
        z-index: 10001;
        display: none;
        flex-direction: column;
        transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        opacity: 0;
        transform: translateY(10px);
      `;
            popover.innerHTML = `
        <div style="padding: 16px; border-bottom: 1px solid var(--border-light)">
          <div id="tutorial-title" style="font-weight: 700; font-size: 16px; color: var(--primary); margin-bottom: 8px"></div>
          <div id="tutorial-text" style="font-size: 13.5px; color: var(--text); line-height: 1.5"></div>
        </div>
        <div style="padding: 10px 16px; display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.02); border-radius: 0 0 var(--r-md) var(--r-md)">
          <div id="tutorial-counter" style="font-size: 12px; color: var(--text-muted); font-weight: 600"></div>
          <div style="display: flex; gap: 8px;">
            <button class="btn btn-sm btn-ghost" style="color: var(--text-muted)" onclick="Tutorial.stop()">${t('tut_skip') || 'ข้าม'}</button>
            <button class="btn btn-sm btn-primary" id="tutorial-next-btn" onclick="Tutorial.next()">${t('tut_next') || 'ถัดไป'}</button>
          </div>
        </div>
        <div id="tutorial-arrow" style="position: absolute; width: 0; height: 0; border-style: solid; border-color: transparent;"></div>
      `;
            document.body.appendChild(popover);
        }
        popover.style.display = 'flex';
    },

    showStep: function () {
        const step = this.steps[this.currentStepIndex];
        if (!step) {
            this.stop();
            return;
        }

        // Attempt to wait for modal animations or dynamic rendering
        setTimeout(() => {
            const targetEl = document.querySelector(step.target);
            if (!targetEl) {
                console.warn('Tutorial target not found:', step.target);
                // If element not found, just advance to next step
                this.next();
                return;
            }

            // Restore previous target styling if any
            document.querySelectorAll('.tutorial-highlight').forEach(el => {
                el.classList.remove('tutorial-highlight');
                el.style.position = el.dataset.origPos || '';
                el.style.zIndex = el.dataset.origZ || '';
                el.style.background = el.dataset.origBg || '';
            });

            // Highlight new target
            const computedStyle = window.getComputedStyle(targetEl);
            targetEl.dataset.origPos = computedStyle.position;
            targetEl.dataset.origZ = computedStyle.zIndex;
            targetEl.dataset.origBg = computedStyle.backgroundColor;

            if (computedStyle.position === 'static') targetEl.style.position = 'relative';
            targetEl.style.zIndex = '10002'; // Above backdrop
            if (computedStyle.backgroundColor === 'rgba(0, 0, 0, 0)' || computedStyle.backgroundColor === 'transparent') {
                targetEl.style.background = 'var(--bg)';
            }
            targetEl.classList.add('tutorial-highlight');

            // Ensure target is somewhat visible (scroll into view if needed gently)
            targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });

            // Update Popover content
            document.getElementById('tutorial-title').innerHTML = step.title;
            document.getElementById('tutorial-text').innerHTML = step.text;
            document.getElementById('tutorial-counter').innerText = \`\${this.currentStepIndex + 1} / \${this.steps.length}\`;
      
      const nextBtn = document.getElementById('tutorial-next-btn');
      if (this.currentStepIndex === this.steps.length - 1) {
        nextBtn.innerText = t('tut_finish') || 'เสร็จสิ้น';
      } else {
        nextBtn.innerText = t('tut_next') || 'ถัดไป';
      }

      // Position Popover
      this.positionPopover(targetEl, step.position || 'bottom');
    }, 150); // Small delay to allow Modals to open
  },

  positionPopover: function (targetEl, placement) {
    const popover = document.getElementById('tutorial-popover');
    const arrow = document.getElementById('tutorial-arrow');
    const targetRect = targetEl.getBoundingClientRect();
    const scrollY = window.scrollY || window.pageYOffset;
    const scrollX = window.scrollX || window.pageXOffset;
    
    // Quick sizing read
    popover.style.opacity = '0';
    popover.style.transform = 'translateY(0)';
    
    const popRect = popover.getBoundingClientRect();
    const margin = 12;
    let top = 0;
    let left = 0;
    
    // Calculate position
    switch (placement) {
      case 'top':
        top = targetRect.top + scrollY - popRect.height - margin;
        left = targetRect.left + scrollX + (targetRect.width / 2) - (popRect.width / 2);
        // Arrow
        arrow.style.borderWidth = '10px 10px 0 10px';
        arrow.style.borderTopColor = 'var(--bg)';
        arrow.style.bottom = '-10px';
        arrow.style.top = 'auto';
        arrow.style.left = 'calc(50% - 10px)';
        break;
      case 'bottom':
        top = targetRect.bottom + scrollY + margin;
        left = targetRect.left + scrollX + (targetRect.width / 2) - (popRect.width / 2);
        // Arrow
        arrow.style.borderWidth = '0 10px 10px 10px';
        arrow.style.borderBottomColor = 'var(--bg)';
        arrow.style.top = '-10px';
        arrow.style.bottom = 'auto';
        arrow.style.left = 'calc(50% - 10px)';
        break;
      case 'left':
        top = targetRect.top + scrollY + (targetRect.height / 2) - (popRect.height / 2);
        left = targetRect.left + scrollX - popRect.width - margin;
        // Arrow
        arrow.style.borderWidth = '10px 0 10px 10px';
        arrow.style.borderLeftColor = 'var(--bg)';
        arrow.style.right = '-10px';
        arrow.style.left = 'auto';
        arrow.style.top = 'calc(50% - 10px)';
        break;
      case 'right':
        top = targetRect.top + scrollY + (targetRect.height / 2) - (popRect.height / 2);
        left = targetRect.right + scrollX + margin;
        // Arrow
        arrow.style.borderWidth = '10px 10px 10px 0';
        arrow.style.borderRightColor = 'var(--bg)';
        arrow.style.left = '-10px';
        arrow.style.right = 'auto';
        arrow.style.top = 'calc(50% - 10px)';
        break;
    }

    // Keep within bounds
    if (left < 10) left = 10;
    if (left + popRect.width > window.innerWidth - 10) left = window.innerWidth - popRect.width - 10;
    if (top < scrollY + 10) top = scrollY + 10;
    
    // Only adjust top if it bleeds out bottom on mobile
    if (top + popRect.height > scrollY + window.innerHeight - 10) {
       top = Math.max(scrollY + 10, scrollY + window.innerHeight - popRect.height - 10);
    }

    popover.style.top = \`\${top}px\`;
    popover.style.left = \`\${left}px\`;
    
    // Show with animation
    requestAnimationFrame(() => {
      popover.style.opacity = '1';
    });
  },

  next: function () {
    this.currentStepIndex++;
    if (this.currentStepIndex >= this.steps.length) {
      this.stop();
    } else {
      this.showStep();
    }
  },

  stop: function () {
    this.isActive = false;
    
    // Clean up highlights
    document.querySelectorAll('.tutorial-highlight').forEach(el => {
      el.classList.remove('tutorial-highlight');
      el.style.position = el.dataset.origPos || '';
      el.style.zIndex = el.dataset.origZ || '';
      el.style.background = el.dataset.origBg || '';
      delete el.dataset.origPos;
      delete el.dataset.origZ;
      delete el.dataset.origBg;
    });

    const backdrop = document.getElementById('tutorial-backdrop');
    const popover = document.getElementById('tutorial-popover');
    
    if (backdrop) {
      backdrop.style.opacity = '0';
      setTimeout(() => backdrop.style.display = 'none', 300);
    }
    if (popover) {
      popover.style.opacity = '0';
      popover.style.transform = 'translateY(10px)';
      setTimeout(() => popover.style.display = 'none', 300);
    }
  }
};
