/**
 * Starburst Renderer
 * Handles the canvas rendering with dependency injection
 */
class StarburstRenderer {
    /**
     * Create a new renderer instance
     * @param {HTMLCanvasElement} canvas - Canvas element to render on
     * @param {object} calculator - Shape calculator for distance calculations
     * @param {object} options - Initial configuration options
     */
    constructor(canvas, calculator, options = {}) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.calculator = calculator;
      this.options = this._mergeDefaults(options);
      this.lastRenderTime = 0;
      this.lastFrameTime = 0;
      this.isAnimating = false;
      this.animationDirection = 1;
      this.animationFrame = null;
      
      // Initialize
      this._setupCanvas();
      this._bindEvents();
      
      Logger.info('Starburst renderer initialized', { canvasSize: `${this.canvas.width}x${this.canvas.height}` });
    }
    
    /**
     * Merge provided options with defaults
     * @param {object} options - User-provided options
     * @returns {object} - Merged options
     */
    _mergeDefaults(options) {
      return {
        backgroundColor: '#000000',
        centerColor: '#ffffff',
        outerColor: '#aaaaaa',
        lineThickness: 1.5,
        numLines: 60,
        innerRadiusRatio: 0,
        rotation: 0,
        canvasRotation: 0,
        startShape: 'star',
        endShape: 'circle',
        morphProgress: 0,
        animationSpeed: 2,
        animationMode: 'twoShape',
        selectedShapes: ['star', 'circle'],
        currentShapeIndex: 0,
        nextShapeIndex: 1,
        // New displacement options
        displacementX: 0,
        displacementY: 0,
        // New options
        generationStrategy: 'starburst',
        centerStyle: 'none',
        centerSize: 2,
        centerGlowSize: 0,
        centerGlowOpacity: 0,
        cornerRadius: 0,
        cornerRadiusMethod: 'arc',
        // Temporarily removed: grid, symmetrical, fractal strategies
        scale: 1,
        showText: true,
        titleText: "STARBURST",
        subtitleText: "geometric designer",
        textSize: 40,
        textColor: "#ffffff",
        fontFamily: "metropolis",
        fontWeight: "regular",
        charSpacing: 0,
        lineSpacing: 1.5,
        textPosition: "center",
        textCase: "normal",
        ...options
      };
    }
    
    /**
     * Set up canvas for rendering
     */
    _setupCanvas() {
      this._resizeCanvas();
      window.addEventListener('resize', this._debouncedResize.bind(this));
    }
    
    /**
     * Debounced resize handler to prevent performance issues
     */
    _debouncedResize() {
      if (this.resizeTimeout) {
        clearTimeout(this.resizeTimeout);
      }
      
      this.resizeTimeout = setTimeout(() => {
        this._resizeCanvas();
        this.render();
      }, 250);
    }
    
    /**
     * Resize canvas to fit container
     */
    _resizeCanvas() {
      // Get window dimensions instead of container dimensions
      const dpr = window.devicePixelRatio || 1;
      
      // Set canvas to fill the entire window
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;
      
      // Set canvas dimensions
      this.canvas.width = windowWidth * dpr;
      this.canvas.height = windowHeight * dpr;
      this.canvas.style.width = `${windowWidth}px`;
      this.canvas.style.height = `${windowHeight}px`;
      
      // Scale context
      this.ctx.scale(dpr, dpr);
      
      Logger.debug('Canvas resized to full window', { 
        width: windowWidth, 
        height: windowHeight,
        dpr 
      });
    }
    
    /**
     * Bind event listeners
     */
    _bindEvents() {
      // Keyboard shortcuts
      window.addEventListener('keydown', (e) => {
        // Space to toggle animation
        if (e.code === 'Space' && document.activeElement.tagName !== 'INPUT') {
          e.preventDefault();
          this.toggleAnimation();
        }
        
        // Escape to stop animation
        if (e.code === 'Escape') {
          this.stopAnimation();
        }
      });
    }
    
    /**
     * Calculate morphed distance between shapes
     * @param {number} angle - The angle in radians
     * @returns {number} - The interpolated distance
     */
    _calculateMorphedDistance(angle) {
      try {
        const { 
          startShape, 
          endShape, 
          morphProgress, 
          animationMode, 
          selectedShapes, 
          currentShapeIndex, 
          nextShapeIndex,
          cornerRadius,
          cornerRadiusMethod
        } = this.options;
        
        // Determine which shapes to morph between based on animation mode
        let fromShape, toShape;
        
        if (animationMode === 'multiShape' && selectedShapes.length >= 2) {
          fromShape = selectedShapes[currentShapeIndex];
          toShape = selectedShapes[nextShapeIndex];
        } else {
          fromShape = startShape;
          toShape = endShape;
        }
        
        // Get base distances for the two shapes with cornerRadius option
        let startDist = this.calculator.getShapeDistance(fromShape, angle, { cornerRadius, cornerRadiusMethod });
        let endDist = this.calculator.getShapeDistance(toShape, angle, { cornerRadius, cornerRadiusMethod });
        
        // Normalize distances before interpolation for consistent scaling
        const normalizedStartDist = this.calculator.normalizeShapeDistance(fromShape, startDist);
        const normalizedEndDist = this.calculator.normalizeShapeDistance(toShape, endDist);
        
        // Use cubic easing function for smoother transitions
        // This makes the change more gradual at the beginning and end of the transition
        let easedProgress = morphProgress;
        if (animationMode === 'multiShape') {
          // Apply cubic easing: t³ for acceleration phase, then 1-(1-t)³ for deceleration phase
          if (morphProgress < 0.5) {
            // First half: accelerate the transition (ease-in)
            easedProgress = 4 * morphProgress * morphProgress * morphProgress;
          } else {
            // Second half: decelerate the transition (ease-out)
            const invT = 1 - morphProgress;
            easedProgress = 1 - 4 * invT * invT * invT;
          }
        }
        
        // Linear interpolation with eased progress
        return normalizedStartDist * (1 - easedProgress) + normalizedEndDist * easedProgress;
      } catch (error) {
        Logger.error('Error calculating morphed distance', error, { angle });
        return 1; // Fallback to circle
      }
    }
    
    /**
     * Update renderer options
     * @param {object} newOptions - New options to merge with existing ones
     * @returns {StarburstRenderer} - This renderer instance for chaining
     */
    updateOptions(newOptions) {
      this.options = { ...this.options, ...newOptions };
      return this;
    }
    
    /**
     * Toggle animation on/off
     * @returns {boolean} - New animation state
     */
    toggleAnimation() {
      this.isAnimating = !this.isAnimating;
      
      if (this.isAnimating) {
        this.startAnimation();
      } else {
        this.stopAnimation();
      }
      
      return this.isAnimating;
    }
    
    /**
     * Start animation loop
     */
    startAnimation() {
      if (this.animationFrame) {
        cancelAnimationFrame(this.animationFrame);
      }
      
      this.isAnimating = true;
      this.lastFrameTime = performance.now();
      this.animationFrame = requestAnimationFrame(this._animationLoop.bind(this));
      
      Logger.info('Animation started', { 
        speed: this.options.animationSpeed,
        startShape: this.options.startShape,
        endShape: this.options.endShape
      });
    }
    
    /**
     * Stop animation loop
     */
    stopAnimation() {
      if (this.animationFrame) {
        cancelAnimationFrame(this.animationFrame);
        this.animationFrame = null;
      }
      
      this.isAnimating = false;
      Logger.info('Animation stopped');
    }
    
    /**
     * Animation loop
     * @param {number} timestamp - Current animation frame timestamp
     */
    _animationLoop(timestamp) {
      try {
        // Calculate time delta
        const delta = timestamp - this.lastFrameTime;
        this.lastFrameTime = timestamp;
        
        // Calculate progress change based on animation speed and time delta
        const progressDelta = (this.options.animationSpeed / 100) * (delta / 16.67);
        
        // Multi-shape mode and two-shape mode have different animation logic
        if (this.options.animationMode === 'multiShape') {
          // For multi-shape mode, we always go from 0 to 1 and then switch shapes
          this.options.morphProgress += progressDelta;
          
          // When we reach 1, switch to the next shape pair
          if (this.options.morphProgress >= 1) {
            // Set up next shape transition
            const { selectedShapes, nextShapeIndex } = this.options;
            if (selectedShapes.length >= 2) {
              this.options.morphProgress = 0; // Reset progress
              this.options.currentShapeIndex = nextShapeIndex;
              this.options.nextShapeIndex = (nextShapeIndex + 1) % selectedShapes.length;
              
              Logger.debug('Switching to next shape', { 
                from: selectedShapes[this.options.currentShapeIndex],
                to: selectedShapes[this.options.nextShapeIndex]
              });
            }
          }
        } else {
          // For two-shape mode, we bounce back and forth
          this.options.morphProgress += progressDelta * this.animationDirection;
          
          if (this.options.morphProgress >= 1) {
            this.options.morphProgress = 1;
            this.animationDirection = -1;
          } else if (this.options.morphProgress <= 0) {
            this.options.morphProgress = 0;
            this.animationDirection = 1;
          }
        }
        
        // Update UI elements
        const progressSlider = document.getElementById('morphProgress');
        const progressValue = document.getElementById('morphProgressValue');
        
        if (progressSlider) {
          progressSlider.value = this.options.morphProgress;
        }
        
        if (progressValue) {
          progressValue.textContent = this.options.morphProgress.toFixed(2);
        }
        
        // Render the frame
        this.render();
        
        // Schedule next frame
        if (this.isAnimating) {
          this.animationFrame = requestAnimationFrame(this._animationLoop.bind(this));
        }
      } catch (error) {
        Logger.error('Error in animation loop', error);
        this.stopAnimation();
      }
    }
    
    /**
     * Render starburst to canvas
     * @returns {StarburstRenderer} - This renderer instance for chaining
     */
    render() {
      try {
        PerformanceMonitor.tick();
        
        const { width, height } = this.canvas;
        const dpr = window.devicePixelRatio || 1;
        const displayWidth = width / dpr;
        const displayHeight = height / dpr;
        
        // Apply displacement
        const { displacementX, displacementY } = this.options;
        const centerX = (displayWidth / 2) + displacementX;
        const centerY = (displayHeight / 2) + displacementY;
        
        const maxRadius = Math.min(displayWidth, displayHeight) * 0.45 * this.options.scale;
        
        // Extract options
        const {
          backgroundColor,
          centerColor,
          outerColor,
          lineThickness,
          numLines,
          innerRadiusRatio,
          rotation,
          canvasRotation,
          generationStrategy
        } = this.options;
        
        // Apply rotation in radians
        const rotationRadians = (rotation * Math.PI) / 180;
        // Convert canvas rotation from degrees to radians
        const canvasRotationRadians = (canvasRotation * Math.PI) / 180;
        
        // Clear canvas
        this.ctx.fillStyle = backgroundColor;
        this.ctx.fillRect(0, 0, displayWidth, displayHeight);
        
        // Save the original canvas state for text rendering later
        this.ctx.save();
        
        // Apply canvas rotation if needed
        if (canvasRotation !== 0) {
          this.ctx.translate(displayWidth/2, displayHeight/2); // Translate to canvas center
          this.ctx.rotate(canvasRotationRadians);
          this.ctx.translate(-displayWidth/2, -displayHeight/2); // Translate back
        }
        
        // Use the appropriate generation strategy
        // For now, only support starburst and concentric patterns
        switch (generationStrategy) {
          case 'starburst':
            this._renderStarburst(centerX, centerY, maxRadius, innerRadiusRatio, numLines, lineThickness, rotationRadians);
            break;
          case 'concentric':
            this._renderConcentric(centerX, centerY, maxRadius);
            break;
          // Temporarily disable other generation strategies
          default:
            // Default to starburst if unknown strategy
            this._renderStarburst(centerX, centerY, maxRadius, innerRadiusRatio, numLines, lineThickness, rotationRadians);
        }
        
        // Draw center based on selected style
        this._renderCenterStyle(centerX, centerY, maxRadius);
        
        // Restore to unrotated canvas state
        this.ctx.restore();
        
        // Render text elements (title and subtitle) without rotation
        this._renderText(displayWidth/2, displayHeight/2, maxRadius);
      } catch (error) {
        Logger.error('Render error', error);
        this._showStatusMessage('Error rendering design', 'error');
      }
      
      return this;
    }
    
    /**
     * Render the starburst pattern (original pattern)
     * @param {number} centerX - X coordinate of center
     * @param {number} centerY - Y coordinate of center
     * @param {number} maxRadius - Maximum radius
     * @param {number} innerRadiusRatio - Ratio for inner radius
     * @param {number} numLines - Number of lines
     * @param {number} lineThickness - Line thickness
     * @param {number} rotationRadians - Rotation in radians
     */
    _renderStarburst(centerX, centerY, maxRadius, innerRadiusRatio, numLines, lineThickness, rotationRadians) {
      // Calculate inner radius
      const innerRadius = maxRadius * innerRadiusRatio;
      
      // Draw lines
      const angleStep = (2 * Math.PI) / numLines;
      
      for (let i = 0; i < numLines; i++) {
        // Add rotation to the angle
        const angle = i * angleStep + rotationRadians;
        
        // Calculate morphed distance
        const dist = this._calculateMorphedDistance(angle);
        
        // Calculate line points
        const startX = centerX + Math.cos(angle) * innerRadius;
        const startY = centerY + Math.sin(angle) * innerRadius;
        const endX = centerX + Math.cos(angle) * maxRadius * dist;
        const endY = centerY + Math.sin(angle) * maxRadius * dist;
        
        // Create gradient for line
        const gradient = this.ctx.createLinearGradient(startX, startY, endX, endY);
        gradient.addColorStop(0, this.options.centerColor);
        gradient.addColorStop(1, this.options.outerColor);
        
        // Draw line
        this.ctx.beginPath();
        this.ctx.moveTo(startX, startY);
        this.ctx.lineTo(endX, endY);
        this.ctx.strokeStyle = gradient;
        this.ctx.lineWidth = lineThickness;
        this.ctx.stroke();
      }
    }
    
    /**
     * Render concentric shapes pattern
     * @param {number} centerX - X coordinate of center
     * @param {number} centerY - Y coordinate of center
     * @param {number} maxRadius - Maximum radius
     */
    _renderConcentric(centerX, centerY, maxRadius) {
      const { 
        concentricSpacing, 
        startShape, 
        endShape, 
        morphProgress, 
        lineThickness,
        numLines
      } = this.options;
      
      // LINE DENSITY DIRECTLY CONTROLS NUMBER OF RINGS
      // Use numLines as the number of concentric rings (with a reasonable minimum/maximum)
      const ringCount = Math.max(3, Math.min(Math.floor(numLines/2), 50));
      
      // Calculate the spacing between rings based on ring count
      const spacing = maxRadius / ringCount;
      
      // Fixed number of segments per ring for smooth appearance
      const segmentsPerRing = 72; // 5-degree steps
      const angleStep = (2 * Math.PI) / segmentsPerRing;
      
      // Draw each concentric ring
      for (let i = 1; i <= ringCount; i++) {
        const radius = i * spacing;
        const layerRatio = i / ringCount;
        
        // Interpolate between start and end shapes based on layer position
        const layerProgress = morphProgress * (1 - layerRatio) + layerRatio;
        
        // Draw shape for this layer
        this.ctx.beginPath();
        
        // Use the fixed angleStep for smooth rings
        for (let angle = 0; angle < 2 * Math.PI; angle += angleStep) {
          // Calculate morphed distance for this angle
          const dist = this._calculateMorphedDistance(angle);
          
          // Calculate point on the shape
          const x = centerX + Math.cos(angle) * radius * dist;
          const y = centerY + Math.sin(angle) * radius * dist;
          
          if (angle === 0) {
            this.ctx.moveTo(x, y);
          } else {
            this.ctx.lineTo(x, y);
          }
        }
        
        // Close the path
        this.ctx.closePath();
        
        // Create gradient for the layer
        const gradient = this.ctx.createRadialGradient(
          centerX, centerY, radius * (1 - concentricSpacing),
          centerX, centerY, radius
        );
        
        // Color gradient based on layer position
        const layerCenterColor = this._interpolateColor(
          this.options.centerColor, 
          this.options.outerColor, 
          layerRatio
        );
        
        gradient.addColorStop(0, layerCenterColor);
        gradient.addColorStop(1, this.options.outerColor);
        
        // Set line style
        this.ctx.strokeStyle = gradient;
        this.ctx.lineWidth = lineThickness;
        this.ctx.stroke();
      }
    }
    
    /**
     * Render center style based on settings
     * @param {number} centerX - X coordinate of center
     * @param {number} centerY - Y coordinate of center
     * @param {number} maxRadius - Maximum radius
     */
    _renderCenterStyle(centerX, centerY, maxRadius) {
      const { centerStyle, centerSize, centerGlowSize, centerGlowOpacity, centerColor, lineThickness, scale } = this.options;
      
      // Calculate adjusted center size based on the scale
      const adjustedCenterSize = centerSize * scale;
      const adjustedGlowSize = centerGlowSize * scale;
      
      // First, draw the glow effect if needed
      if (centerGlowSize > 0 && centerGlowOpacity > 0) {
        const gradient = this.ctx.createRadialGradient(
          centerX, centerY, 0,
          centerX, centerY, adjustedGlowSize
        );
        
        gradient.addColorStop(0, this._adjustColorOpacity(centerColor, centerGlowOpacity));
        gradient.addColorStop(1, this._adjustColorOpacity(centerColor, 0));
        
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, adjustedGlowSize, 0, 2 * Math.PI);
        this.ctx.fillStyle = gradient;
        this.ctx.fill();
      }
      
      // Draw center based on selected style
      switch (centerStyle) {
        case 'dot':
          // Draw center point
          this.ctx.beginPath();
          this.ctx.arc(centerX, centerY, adjustedCenterSize, 0, 2 * Math.PI);
          this.ctx.fillStyle = centerColor;
          this.ctx.fill();
          break;
          
        case 'hole':
          // Draw a hole (ring)
          this.ctx.beginPath();
          this.ctx.arc(centerX, centerY, adjustedCenterSize, 0, 2 * Math.PI);
          this.ctx.strokeStyle = centerColor;
          this.ctx.lineWidth = lineThickness;
          this.ctx.stroke();
          break;
          
        case 'custom':
          // Draw a custom shape (star)
          this.ctx.save();
          this.ctx.translate(centerX, centerY);
          
          const points = 5;
          const outerRadius = adjustedCenterSize;
          const innerRadius = adjustedCenterSize * 0.4;
          
          this.ctx.beginPath();
          for (let i = 0; i < points * 2; i++) {
            const radius = i % 2 === 0 ? outerRadius : innerRadius;
            const angle = (i * Math.PI) / points;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            
            if (i === 0) {
              this.ctx.moveTo(x, y);
            } else {
              this.ctx.lineTo(x, y);
            }
          }
          
          this.ctx.closePath();
          this.ctx.fillStyle = centerColor;
          this.ctx.fill();
          
          this.ctx.restore();
          break;
          
        case 'none':
          // Don't draw any center
          break;
      }
    }
    
    /**
     * Interpolate between two colors
     * @param {string} color1 - Start color (hex)
     * @param {string} color2 - End color (hex)
     * @param {number} ratio - Interpolation ratio (0-1)
     * @returns {string} - Interpolated color (hex)
     */
    _interpolateColor(color1, color2, ratio) {
      // Convert hex to RGB
      const r1 = parseInt(color1.substring(1, 3), 16);
      const g1 = parseInt(color1.substring(3, 5), 16);
      const b1 = parseInt(color1.substring(5, 7), 16);
      
      const r2 = parseInt(color2.substring(1, 3), 16);
      const g2 = parseInt(color2.substring(3, 5), 16);
      const b2 = parseInt(color2.substring(5, 7), 16);
      
      // Interpolate RGB values
      const r = Math.round(r1 * (1 - ratio) + r2 * ratio);
      const g = Math.round(g1 * (1 - ratio) + g2 * ratio);
      const b = Math.round(b1 * (1 - ratio) + b2 * ratio);
      
      // Convert back to hex
      return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }
    
    /**
     * Darken a color by a given amount
     * @param {string} color - Color to darken (hex)
     * @param {number} amount - Amount to darken (0-1)
     * @returns {string} - Darkened color (hex)
     */
    _darkenColor(color, amount) {
      // Convert hex to RGB
      const r = parseInt(color.substring(1, 3), 16);
      const g = parseInt(color.substring(3, 5), 16);
      const b = parseInt(color.substring(5, 7), 16);
      
      // Darken RGB values
      const newR = Math.max(0, Math.round(r * (1 - amount)));
      const newG = Math.max(0, Math.round(g * (1 - amount)));
      const newB = Math.max(0, Math.round(b * (1 - amount)));
      
      // Convert back to hex
      return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
    }
    
    /**
     * Adjust color opacity
     * @param {string} color - Color (hex)
     * @param {number} opacity - Opacity (0-1)
     * @returns {string} - Color with opacity (rgba)
     */
    _adjustColorOpacity(color, opacity) {
      // Convert hex to RGB
      const r = parseInt(color.substring(1, 3), 16);
      const g = parseInt(color.substring(3, 5), 16);
      const b = parseInt(color.substring(5, 7), 16);
      
      // Return rgba string
      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }
    
    /**
     * Export current design as SVG
     * @returns {string} - SVG content
     */
    exportSVG() {
      try {
        // Use window dimensions for SVG size
        const displayWidth = window.innerWidth;
        const displayHeight = window.innerHeight;
        const centerX = displayWidth / 2;
        const centerY = displayHeight / 2;
        const maxRadius = Math.min(displayWidth, displayHeight) * 0.45;
        const innerRadius = maxRadius * this.options.innerRadiusRatio;
        
        // Create SVG content
        let svgContent = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
  <svg width="${displayWidth}" height="${displayHeight}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${displayWidth}" height="${displayHeight}" fill="${this.options.backgroundColor}"/>
    
    <defs>
      <radialGradient id="centerGlow" cx="0.5" cy="0.5" r="0.5" fx="0.5" fy="0.5">
        <stop offset="0%" stop-color="${this.options.centerColor}" stop-opacity="1"/>
        <stop offset="100%" stop-color="${this.options.centerColor}" stop-opacity="0"/>
      </radialGradient>`;
        
        // Add lines
        const angleStep = (2 * Math.PI) / this.options.numLines;
        
        // Add gradient definitions
        for (let i = 0; i < this.options.numLines; i++) {
          const angle = i * angleStep;
          
          // Calculate morphed distance
          const dist = this._calculateMorphedDistance(angle);
          
          // Apply displacement
          const { displacementX, displacementY } = this.options;
          const adjustedCenterX = centerX + displacementX;
          const adjustedCenterY = centerY + displacementY;
          
          // Calculate line points
          const startX = adjustedCenterX + Math.cos(angle) * innerRadius;
          const startY = adjustedCenterY + Math.sin(angle) * innerRadius;
          const endX = adjustedCenterX + Math.cos(angle) * maxRadius * dist;
          const endY = adjustedCenterY + Math.sin(angle) * maxRadius * dist;
          
          // Add gradient definition
          const gradientId = `gradient-${i}`;
          svgContent += `
      <linearGradient id="${gradientId}" x1="${startX}" y1="${startY}" x2="${endX}" y2="${endY}" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="${this.options.centerColor}"/>
        <stop offset="100%" stop-color="${this.options.outerColor}"/>
      </linearGradient>`;
        }
        
        // Close defs section
        svgContent += `
    </defs>`;
        
        // Add lines
        for (let i = 0; i < this.options.numLines; i++) {
          const angle = i * angleStep;
          
          // Calculate morphed distance
          const dist = this._calculateMorphedDistance(angle);
          
          // Apply displacement
          const { displacementX, displacementY } = this.options;
          const adjustedCenterX = centerX + displacementX;
          const adjustedCenterY = centerY + displacementY;
          
          // Calculate line points
          const startX = adjustedCenterX + Math.cos(angle) * innerRadius;
          const startY = adjustedCenterY + Math.sin(angle) * innerRadius;
          const endX = adjustedCenterX + Math.cos(angle) * maxRadius * dist;
          const endY = adjustedCenterY + Math.sin(angle) * maxRadius * dist;
          
          // Add line
          svgContent += `
    <line x1="${startX}" y1="${startY}" x2="${endX}" y2="${endY}" stroke="url(#gradient-${i})" stroke-width="${this.options.lineThickness}"/>`;
        }
        
        // Add center glow
        const glowRadius = Math.max(5, maxRadius * 0.05);
        // Make sure we have adjustedCenterX and adjustedCenterY defined for these elements
        const { displacementX, displacementY } = this.options;
        const adjustedCenterX = centerX + displacementX;
        const adjustedCenterY = centerY + displacementY;
        
        svgContent += `
    <circle cx="${adjustedCenterX}" cy="${adjustedCenterY}" r="${glowRadius}" fill="url(#centerGlow)"/>`;
        
        // Add center point
        svgContent += `
    <circle cx="${adjustedCenterX}" cy="${adjustedCenterY}" r="${this.options.lineThickness}" fill="${this.options.centerColor}"/>`;
        
        // Add text elements if enabled
        if (this.options.showText && (this.options.titleText || this.options.subtitleText)) {
          // Get text options
          const { 
            titleText, 
            subtitleText,
            textSize,
            textColor,
            fontFamily,
            fontWeight,
            charSpacing,
            lineSpacing,
            textPosition,
            textCase
          } = this.options;
          
          // Set font family based on selection
          let fontFamilyValue;
          const isHandwritingFont = ['saintdelafield', 'herrvon', 'rougescript'].includes(fontFamily);
          
          switch (fontFamily) {
            case "metropolis":
              fontFamilyValue = "Metropolis, sans-serif";
              break;
            case "worksans":
              fontFamilyValue = "Work Sans, sans-serif";
              break;
            case "oswald":
              fontFamilyValue = "Oswald, sans-serif";
              break;
            case "roboto":
              fontFamilyValue = "Roboto, sans-serif";
              break;
            case "crimsonpro":
              fontFamilyValue = "Crimson Pro, serif";
              break;
            case "saintdelafield":
              fontFamilyValue = "Mrs Saint Delafield, cursive";
              break;
            case "herrvon":
              fontFamilyValue = "Herr Von Muellerhoff, cursive";
              break;
            case "rougescript":
              fontFamilyValue = "Rouge Script, cursive";
              break;
            default:
              fontFamilyValue = "Metropolis, sans-serif";
          }
          
          // Set font style
          let fontStyle = "";
          if (fontWeight === "bold") {
            fontStyle = "font-weight='bold'";
          } else if (fontWeight === "italic") {
            fontStyle = "font-style='italic'";
          }
          
          // Calculate title and subtitle size
          const titleFontSize = textSize;
          const subtitleFontSize = textSize / 3;
          
          // Apply text case transformation (for handwriting fonts, always use lowercase regardless of setting)
          let displayTitle = titleText;
          let displaySubtitle = subtitleText;
          
          if (isHandwritingFont) {
            // For handwriting fonts, always use lowercase
            displayTitle = titleText.toLowerCase();
            displaySubtitle = subtitleText.toLowerCase();
          } else if (textCase === "uppercase") {
            displayTitle = titleText.toUpperCase();
            displaySubtitle = subtitleText.toUpperCase();
          } else if (textCase === "lowercase") {
            displayTitle = titleText.toLowerCase();
            displaySubtitle = subtitleText.toLowerCase();
          } else if (textCase === "camelcase") {
            // Capitalize first letter of each word (Title Case / Camel Case)
            displayTitle = titleText.split(' ')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
              .join(' ');
            displaySubtitle = subtitleText.split(' ')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
              .join(' ');
          } else if (isHandwritingFont && textCase === "normal") {
            // For handwriting fonts with normal case, use lowercase
            displayTitle = titleText.toLowerCase();
            displaySubtitle = subtitleText.toLowerCase();
          }
          
          // Calculate positions based on the selected position option
          let titleX, titleY, subtitleX, subtitleY;
          const padding = maxRadius * 0.2; // Padding from edges
          
          if (textPosition === "vertical") {
            // For vertical text
            svgContent += `
    <g transform="translate(${centerX}, ${centerY}) rotate(-90)">`;
            
            if (displayTitle) {
              svgContent += `
      <text x="0" y="-10" font-family="${fontFamilyValue}" font-size="${titleFontSize}" ${fontStyle} fill="${textColor}" text-anchor="middle" letter-spacing="${charSpacing}em">${displayTitle}</text>`;
            }
            
            if (displaySubtitle) {
              svgContent += `
      <text x="0" y="${titleFontSize * lineSpacing}" font-family="${fontFamilyValue}" font-size="${subtitleFontSize}" ${fontStyle} fill="${textColor}" text-anchor="middle">${displaySubtitle}</text>`;
            }
            
            svgContent += `
    </g>`;
          } else {
            // For horizontal text positioning
            switch (textPosition) {
              case "top":
                titleY = padding;
                subtitleY = titleY + titleFontSize * lineSpacing;
                break;
              case "bottom":
                subtitleY = displayHeight - padding;
                titleY = subtitleY - titleFontSize * lineSpacing;
                break;
              case "center":
              default:
                titleY = centerY - (titleFontSize * lineSpacing) / 2;
                subtitleY = centerY + (titleFontSize * lineSpacing) / 2;
            }
            
            // Set horizontal position (center)
            titleX = centerX;
            subtitleX = centerX;
            
            // Add title
            if (displayTitle) {
              svgContent += `
    <text x="${titleX}" y="${titleY}" font-family="${fontFamilyValue}" font-size="${titleFontSize}" ${fontStyle} fill="${textColor}" text-anchor="middle" letter-spacing="${charSpacing}em">${displayTitle}</text>`;
            }
            
            // Add subtitle
            if (displaySubtitle) {
              svgContent += `
    <text x="${subtitleX}" y="${subtitleY}" font-family="${fontFamilyValue}" font-size="${subtitleFontSize}" ${fontStyle} fill="${textColor}" text-anchor="middle">${displaySubtitle}</text>`;
            }
          }
        }
        
        // Close SVG tag
        svgContent += `
  </svg>`;
        
        Logger.info('SVG export completed');
        this._showStatusMessage('SVG created successfully', 'success');
        
        return svgContent;
      } catch (error) {
        Logger.error('SVG export error', error);
        this._showStatusMessage('Error creating SVG', 'error');
        return null;
      }
    }
    
    /**
     * Save design as SVG file
     */
    saveAsSVG() {
      const svgContent = this.exportSVG();
      
      if (!svgContent) {
        this._showStatusMessage('Failed to generate SVG', 'error');
        return;
      }
      
      try {
        // Create download link
        const blob = new Blob([svgContent], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'starburst.svg';
        
        // Trigger download
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        // Clean up
        URL.revokeObjectURL(url);
        
        this._showStatusMessage('SVG file saved', 'success');
      } catch (error) {
        Logger.error('Failed to save SVG file', error);
        this._showStatusMessage('Failed to save SVG file', 'error');
      }
    }
    
    /**
     * Show status message
     * @param {string} message - Message to display
     * @param {string} type - Message type (info, success, error)
     */
    _showStatusMessage(message, type = 'info') {
      const statusElement = document.getElementById('statusMessage');
      
      if (statusElement) {
        statusElement.textContent = message;
        
        // Apply appropriate styling
        statusElement.className = 'status-message';
        if (type === 'error') {
          statusElement.classList.add('error-message');
        } else if (type === 'success') {
          statusElement.classList.add('success-message');
        }
        
        // Clear message after delay
        setTimeout(() => {
          statusElement.textContent = 'Ready';
          statusElement.className = 'status-message';
        }, 3000);
      }
    }
    
    /**
     * Render text elements (title and subtitle)
     * @param {number} centerX - X coordinate of center
     * @param {number} centerY - Y coordinate of center
     * @param {number} maxRadius - Maximum radius of the design
     */
    _renderText(centerX, centerY, maxRadius) {
      const { 
        showText = true,
        titleText = "STARBURST", 
        subtitleText = "geometric designer",
        textSize = 40,
        textColor = "#ffffff",
        fontFamily = "serif", 
        fontWeight = "regular",
        charSpacing = 0,
        lineSpacing = 1.5,
        textPosition = "center",
        textCase = "normal"
      } = this.options;
      
      // If text is disabled, return early
      if (!showText || (!titleText && !subtitleText)) return;
      
      // Save current canvas state
      this.ctx.save();
      
      // Set text properties
      this.ctx.textAlign = "center";
      this.ctx.fillStyle = textColor;
      
      // Set font family based on selection
      let fontFamilyValue;
      const isHandwritingFont = ['saintdelafield', 'herrvon', 'rougescript'].includes(fontFamily);
      
      switch (fontFamily) {
        case "metropolis":
          fontFamilyValue = "'Metropolis', sans-serif";
          break;
        case "worksans":
          fontFamilyValue = "'Work Sans', sans-serif";
          break;
        case "oswald":
          fontFamilyValue = "'Oswald', sans-serif";
          break;
        case "roboto":
          fontFamilyValue = "'Roboto', sans-serif";
          break;
        case "crimsonpro":
          fontFamilyValue = "'Crimson Pro', serif";
          break;
        case "saintdelafield":
          fontFamilyValue = "'Mrs Saint Delafield', cursive";
          break;
        case "herrvon":
          fontFamilyValue = "'Herr Von Muellerhoff', cursive";
          break;
        case "rougescript":
          fontFamilyValue = "'Rouge Script', cursive";
          break;
        default:
          fontFamilyValue = "'Metropolis', sans-serif";
      }
      
      // Set font weight/style
      let fontStyle = "";
      if (fontWeight === "bold") {
        fontStyle = "bold ";
      } else if (fontWeight === "italic") {
        fontStyle = "italic ";
      }
      
      // Calculate title and subtitle size (subtitle is 1/3 of title size)
      const titleFontSize = textSize;
      const subtitleFontSize = textSize / 3;
      
      // Apply text case transformation (for handwriting fonts, always use lowercase regardless of setting)
      let displayTitle = titleText;
      let displaySubtitle = subtitleText;
      
      if (isHandwritingFont) {
        // For handwriting fonts, always use lowercase
        displayTitle = titleText.toLowerCase();
        displaySubtitle = subtitleText.toLowerCase();
      } else if (textCase === "uppercase") {
        displayTitle = titleText.toUpperCase();
        displaySubtitle = subtitleText.toUpperCase();
      } else if (textCase === "lowercase") {
        displayTitle = titleText.toLowerCase();
        displaySubtitle = subtitleText.toLowerCase();
      } else if (textCase === "camelcase") {
        // Capitalize first letter of each word (Title Case / Camel Case)
        displayTitle = titleText.split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');
        displaySubtitle = subtitleText.split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');
      } else if (isHandwritingFont && textCase === "normal") {
        // For handwriting fonts with normal case, use lowercase
        displayTitle = titleText.toLowerCase();
        displaySubtitle = subtitleText.toLowerCase();
      }
      
      // Calculate positions based on the selected position option
      let titleX, titleY, subtitleX, subtitleY;
      const padding = maxRadius * 0.2; // Padding from edges
      
      if (textPosition === "vertical") {
        // Handle vertical text
        this.ctx.save();
        this.ctx.translate(centerX, centerY);
        this.ctx.rotate(-Math.PI/2);
        
        this.ctx.font = `${fontStyle}${titleFontSize}px ${fontFamilyValue}`;
        this.ctx.letterSpacing = `${charSpacing}em`;
        
        // Draw title
        if (displayTitle) {
          this.ctx.fillText(displayTitle, 0, -10);
        }
        
        // Draw subtitle
        if (displaySubtitle) {
          this.ctx.font = `${fontStyle}${subtitleFontSize}px ${fontFamilyValue}`;
          this.ctx.fillText(displaySubtitle, 0, titleFontSize * lineSpacing);
        }
        
        this.ctx.restore();
      } else {
        // For horizontal text positioning
        switch (textPosition) {
          case "top":
            titleY = padding;
            subtitleY = titleY + titleFontSize * lineSpacing;
            break;
          case "bottom":
            subtitleY = this.canvas.height / window.devicePixelRatio - padding;
            titleY = subtitleY - titleFontSize * lineSpacing;
            break;
          case "center":
          default:
            titleY = centerY - (titleFontSize * lineSpacing) / 2;
            subtitleY = centerY + (titleFontSize * lineSpacing) / 2;
        }
        
        // Set horizontal position (center)
        titleX = centerX;
        subtitleX = centerX;
        
        // Draw title
        if (displayTitle) {
          this.ctx.font = `${fontStyle}${titleFontSize}px ${fontFamilyValue}`;
          this.ctx.letterSpacing = `${charSpacing}em`;
          this.ctx.fillText(displayTitle, titleX, titleY);
        }
        
        // Draw subtitle
        if (displaySubtitle) {
          this.ctx.font = `${fontStyle}${subtitleFontSize}px ${fontFamilyValue}`;
          this.ctx.fillText(displaySubtitle, subtitleX, subtitleY);
        }
      }
      
      // Restore canvas state
      this.ctx.restore();
    }
  }