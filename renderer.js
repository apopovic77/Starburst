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
        startShape: 'star',
        endShape: 'circle',
        morphProgress: 0,
        animationSpeed: 2,
        animationMode: 'twoShape',
        selectedShapes: ['star', 'circle'],
        currentShapeIndex: 0,
        nextShapeIndex: 1,
        // New options
        generationStrategy: 'starburst',
        centerStyle: 'dot',
        centerSize: 2,
        centerGlowSize: 5,
        centerGlowOpacity: 0.5,
        // Default values for different generation strategies
        concentricLayers: 5,
        concentricSpacing: 0.5,
        gridSize: 5,
        gridStyle: 'square',
        symmetryFactor: 4,
        symmetryType: 'radial',
        fractalDepth: 3,
        fractalScale: 0.5,
        scale: 1,
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
        const { startShape, endShape, morphProgress, animationMode, selectedShapes, currentShapeIndex, nextShapeIndex } = this.options;
        
        // Determine which shapes to morph between based on animation mode
        let fromShape, toShape;
        
        if (animationMode === 'multiShape' && selectedShapes.length >= 2) {
          fromShape = selectedShapes[currentShapeIndex];
          toShape = selectedShapes[nextShapeIndex];
        } else {
          fromShape = startShape;
          toShape = endShape;
        }
        
        // Get base distances for the two shapes
        let startDist = this.calculator.getShapeDistance(fromShape, angle);
        let endDist = this.calculator.getShapeDistance(toShape, angle);
        
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
        const centerX = displayWidth / 2;
        const centerY = displayHeight / 2;
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
          generationStrategy
        } = this.options;
        
        // Apply rotation in radians
        const rotationRadians = (rotation * Math.PI) / 180;
        
        // Clear canvas
        this.ctx.fillStyle = backgroundColor;
        this.ctx.fillRect(0, 0, displayWidth, displayHeight);
        
        // Use the appropriate generation strategy
        switch (generationStrategy) {
          case 'starburst':
            this._renderStarburst(centerX, centerY, maxRadius, innerRadiusRatio, numLines, lineThickness, rotationRadians);
            break;
          case 'concentric':
            this._renderConcentric(centerX, centerY, maxRadius);
            break;
          case 'grid':
            this._renderGrid(centerX, centerY, maxRadius);
            break;
          case 'symmetrical':
            this._renderSymmetrical(centerX, centerY, maxRadius);
            break;
          case 'fractal':
            this._renderFractal(centerX, centerY, maxRadius);
            break;
          default:
            // Default to starburst if unknown strategy
            this._renderStarburst(centerX, centerY, maxRadius, innerRadiusRatio, numLines, lineThickness, rotationRadians);
        }
        
        // Draw center based on selected style
        this._renderCenterStyle(centerX, centerY, maxRadius);
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
      const { concentricLayers, concentricSpacing, startShape, endShape, morphProgress, lineThickness } = this.options;
      
      // Calculate the spacing between layers
      const spacing = maxRadius / concentricLayers;
      
      // Draw each concentric layer
      for (let i = 1; i <= concentricLayers; i++) {
        const radius = i * spacing;
        const layerRatio = i / concentricLayers;
        
        // Interpolate between start and end shapes based on layer position
        const layerProgress = morphProgress * (1 - layerRatio) + layerRatio;
        
        // Draw shape for this layer
        this.ctx.beginPath();
        
        const angleStep = Math.PI / 36; // Draw in small segments for smooth curves
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
     * Render grid pattern
     * @param {number} centerX - X coordinate of center
     * @param {number} centerY - Y coordinate of center
     * @param {number} maxRadius - Maximum radius
     */
    _renderGrid(centerX, centerY, maxRadius) {
      const { gridSize, gridStyle, lineThickness } = this.options;
      
      // Set line style
      this.ctx.lineWidth = lineThickness;
      this.ctx.strokeStyle = this.options.outerColor;
      
      const cellSize = (maxRadius * 2) / gridSize;
      
      // Calculate grid bounds
      const startX = centerX - maxRadius;
      const startY = centerY - maxRadius;
      
      if (gridStyle === 'square') {
        // Draw vertical lines
        for (let i = 0; i <= gridSize; i++) {
          const x = startX + i * cellSize;
          this.ctx.beginPath();
          this.ctx.moveTo(x, startY);
          this.ctx.lineTo(x, startY + gridSize * cellSize);
          this.ctx.stroke();
        }
        
        // Draw horizontal lines
        for (let i = 0; i <= gridSize; i++) {
          const y = startY + i * cellSize;
          this.ctx.beginPath();
          this.ctx.moveTo(startX, y);
          this.ctx.lineTo(startX + gridSize * cellSize, y);
          this.ctx.stroke();
        }
        
        // Draw shape in each cell
        for (let i = 0; i < gridSize; i++) {
          for (let j = 0; j < gridSize; j++) {
            const cellX = startX + i * cellSize + cellSize / 2;
            const cellY = startY + j * cellSize + cellSize / 2;
            const cellRadius = cellSize * 0.4;
            
            // Use distance from center to determine which shape to draw
            const distFromCenter = Math.sqrt(
              Math.pow(cellX - centerX, 2) + Math.pow(cellY - centerY, 2)
            ) / maxRadius;
            
            // Progressively morph based on distance from center
            this._drawCellShape(cellX, cellY, cellRadius, distFromCenter);
          }
        }
      } else if (gridStyle === 'hexagonal') {
        // Hexagonal grid
        const hexHeight = cellSize;
        const hexWidth = hexHeight * Math.sqrt(3) / 2;
        
        for (let row = -gridSize; row <= gridSize; row++) {
          for (let col = -gridSize; col <= gridSize; col++) {
            const x = centerX + col * hexWidth * 1.5;
            const y = centerY + (row * hexHeight + (col % 2) * (hexHeight / 2));
            
            if (Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2)) <= maxRadius) {
              this._drawHexagon(x, y, hexHeight/2);
              
              // Draw shape in hexagon
              const distFromCenter = Math.sqrt(
                Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2)
              ) / maxRadius;
              
              this._drawCellShape(x, y, hexHeight * 0.3, distFromCenter);
            }
          }
        }
      } else if (gridStyle === 'triangular') {
        // Triangular grid
        const triHeight = cellSize;
        const triWidth = triHeight * Math.sqrt(3) / 2;
        
        for (let row = -gridSize; row <= gridSize; row++) {
          for (let col = -gridSize * 2; col <= gridSize * 2; col++) {
            const x = centerX + col * triWidth / 2;
            const y = centerY + row * triHeight * 0.75;
            
            if (Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2)) <= maxRadius) {
              const pointUp = (col + row) % 2 === 0;
              this._drawTriangle(x, y, triHeight/2, pointUp);
              
              // Draw shape in triangle
              const distFromCenter = Math.sqrt(
                Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2)
              ) / maxRadius;
              
              this._drawCellShape(x, y, triHeight * 0.2, distFromCenter);
            }
          }
        }
      }
    }
    
    /**
     * Draw a hexagon for the grid pattern
     */
    _drawHexagon(x, y, size) {
      this.ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3;
        const hx = x + size * Math.cos(angle);
        const hy = y + size * Math.sin(angle);
        
        if (i === 0) {
          this.ctx.moveTo(hx, hy);
        } else {
          this.ctx.lineTo(hx, hy);
        }
      }
      this.ctx.closePath();
      this.ctx.stroke();
    }
    
    /**
     * Draw a triangle for the grid pattern
     */
    _drawTriangle(x, y, size, pointUp) {
      this.ctx.beginPath();
      if (pointUp) {
        this.ctx.moveTo(x, y - size);
        this.ctx.lineTo(x - size * Math.sqrt(3)/2, y + size/2);
        this.ctx.lineTo(x + size * Math.sqrt(3)/2, y + size/2);
      } else {
        this.ctx.moveTo(x, y + size);
        this.ctx.lineTo(x - size * Math.sqrt(3)/2, y - size/2);
        this.ctx.lineTo(x + size * Math.sqrt(3)/2, y - size/2);
      }
      this.ctx.closePath();
      this.ctx.stroke();
    }
    
    /**
     * Draw a shape within a grid cell
     */
    _drawCellShape(x, y, radius, progress) {
      // Use the morphing calculations to draw the shape
      const { startShape, endShape, morphProgress } = this.options;
      
      // Combine the cell's position-based progress with the overall morph progress
      const combinedProgress = (morphProgress + progress) % 1;
      
      // Draw shape
      this.ctx.beginPath();
      const angleStep = Math.PI / 18; // Draw in small segments for smooth curves
      
      for (let angle = 0; angle < 2 * Math.PI; angle += angleStep) {
        // Get base distances for the two shapes
        let startDist = this.calculator.getShapeDistance(startShape, angle);
        let endDist = this.calculator.getShapeDistance(endShape, angle);
        
        // Normalize distances
        const normalizedStartDist = this.calculator.normalizeShapeDistance(startShape, startDist);
        const normalizedEndDist = this.calculator.normalizeShapeDistance(endShape, endDist);
        
        // Linear interpolation
        const dist = normalizedStartDist * (1 - combinedProgress) + normalizedEndDist * combinedProgress;
        
        // Calculate point on the shape
        const pointX = x + Math.cos(angle) * radius * dist;
        const pointY = y + Math.sin(angle) * radius * dist;
        
        if (angle === 0) {
          this.ctx.moveTo(pointX, pointY);
        } else {
          this.ctx.lineTo(pointX, pointY);
        }
      }
      
      // Close the path
      this.ctx.closePath();
      
      // Create gradient
      const gradient = this.ctx.createRadialGradient(
        x, y, 0,
        x, y, radius
      );
      
      // Color based on position and morph progress
      const cellColor = this._interpolateColor(
        this.options.centerColor,
        this.options.outerColor,
        progress
      );
      
      gradient.addColorStop(0, cellColor);
      gradient.addColorStop(1, this.options.outerColor);
      
      this.ctx.fillStyle = gradient;
      this.ctx.fill();
    }
    
    /**
     * Render symmetrical pattern
     * @param {number} centerX - X coordinate of center
     * @param {number} centerY - Y coordinate of center
     * @param {number} maxRadius - Maximum radius
     */
    _renderSymmetrical(centerX, centerY, maxRadius) {
      const { symmetryFactor, symmetryType, lineThickness } = this.options;
      
      if (symmetryType === 'radial') {
        // Radial symmetry - similar to starburst but with filled shapes
        const angleStep = (2 * Math.PI) / symmetryFactor;
        
        for (let i = 0; i < symmetryFactor; i++) {
          const angle = i * angleStep;
          
          // Draw each symmetrical segment
          this.ctx.save();
          this.ctx.translate(centerX, centerY);
          this.ctx.rotate(angle);
          
          // Draw the shape for this segment
          this._drawSymmetricalSegment(0, 0, maxRadius);
          
          this.ctx.restore();
        }
      } else if (symmetryType === 'reflective') {
        // Reflective symmetry across multiple axes
        for (let i = 0; i < symmetryFactor; i++) {
          const angle = (i * Math.PI) / symmetryFactor;
          
          // Draw reflective pairs across each axis
          this.ctx.save();
          this.ctx.translate(centerX, centerY);
          
          // First side of reflection
          this.ctx.rotate(angle);
          this._drawSymmetricalSegment(0, 0, maxRadius);
          
          // Second (reflected) side
          this.ctx.scale(-1, 1);
          this._drawSymmetricalSegment(0, 0, maxRadius);
          
          this.ctx.restore();
        }
      } else if (symmetryType === 'translational') {
        // Translational symmetry - repeated pattern in a grid
        const patternSize = maxRadius / (symmetryFactor / 2);
        
        for (let x = -symmetryFactor; x <= symmetryFactor; x++) {
          for (let y = -symmetryFactor; y <= symmetryFactor; y++) {
            const posX = centerX + x * patternSize;
            const posY = centerY + y * patternSize;
            
            // Only draw if within the overall radius
            if (Math.sqrt(Math.pow(posX - centerX, 2) + Math.pow(posY - centerY, 2)) <= maxRadius) {
              this._drawTranslationalUnit(posX, posY, patternSize * 0.4);
            }
          }
        }
      }
    }
    
    /**
     * Draw a symmetrical segment for radial or reflective symmetry
     */
    _drawSymmetricalSegment(x, y, maxRadius) {
      const { startShape, endShape, morphProgress, lineThickness } = this.options;
      
      // Create a path that represents a segment
      this.ctx.beginPath();
      
      // Start at center
      this.ctx.moveTo(0, 0);
      
      // Draw arc from 0 to the segment angle
      const segmentAngle = Math.PI / (this.options.symmetryFactor);
      const steps = 20;
      const angleStep = segmentAngle / steps;
      
      for (let i = 0; i <= steps; i++) {
        const angle = i * angleStep;
        
        // Calculate morphed distance for this angle
        let startDist = this.calculator.getShapeDistance(startShape, angle);
        let endDist = this.calculator.getShapeDistance(endShape, angle);
        
        // Normalize distances
        const normalizedStartDist = this.calculator.normalizeShapeDistance(startShape, startDist);
        const normalizedEndDist = this.calculator.normalizeShapeDistance(endShape, endDist);
        
        // Linear interpolation
        const dist = normalizedStartDist * (1 - morphProgress) + normalizedEndDist * morphProgress;
        
        // Calculate point on the shape
        const px = Math.cos(angle) * maxRadius * dist;
        const py = Math.sin(angle) * maxRadius * dist;
        
        this.ctx.lineTo(px, py);
      }
      
      // Close path back to center
      this.ctx.lineTo(0, 0);
      
      // Fill with gradient
      const gradient = this.ctx.createRadialGradient(
        0, 0, 0,
        0, 0, maxRadius
      );
      
      gradient.addColorStop(0, this.options.centerColor);
      gradient.addColorStop(1, this.options.outerColor);
      
      this.ctx.fillStyle = gradient;
      this.ctx.fill();
      
      // Stroke the outline
      this.ctx.lineWidth = lineThickness;
      this.ctx.strokeStyle = this._darkenColor(this.options.outerColor, 0.2);
      this.ctx.stroke();
    }
    
    /**
     * Draw a unit for translational symmetry
     */
    _drawTranslationalUnit(x, y, size) {
      const { morphProgress, startShape, endShape, lineThickness } = this.options;
      
      // Draw shape
      this.ctx.beginPath();
      const angleStep = Math.PI / 18;
      
      for (let angle = 0; angle < 2 * Math.PI; angle += angleStep) {
        // Get base distances for the two shapes
        let startDist = this.calculator.getShapeDistance(startShape, angle);
        let endDist = this.calculator.getShapeDistance(endShape, angle);
        
        // Normalize distances
        const normalizedStartDist = this.calculator.normalizeShapeDistance(startShape, startDist);
        const normalizedEndDist = this.calculator.normalizeShapeDistance(endShape, endDist);
        
        // Linear interpolation
        const dist = normalizedStartDist * (1 - morphProgress) + normalizedEndDist * morphProgress;
        
        // Calculate point on the shape
        const pointX = x + Math.cos(angle) * size * dist;
        const pointY = y + Math.sin(angle) * size * dist;
        
        if (angle === 0) {
          this.ctx.moveTo(pointX, pointY);
        } else {
          this.ctx.lineTo(pointX, pointY);
        }
      }
      
      this.ctx.closePath();
      
      // Create gradient
      const gradient = this.ctx.createRadialGradient(
        x, y, 0,
        x, y, size
      );
      
      gradient.addColorStop(0, this.options.centerColor);
      gradient.addColorStop(1, this.options.outerColor);
      
      this.ctx.fillStyle = gradient;
      this.ctx.fill();
      
      // Stroke the outline
      this.ctx.lineWidth = lineThickness;
      this.ctx.strokeStyle = this._darkenColor(this.options.outerColor, 0.2);
      this.ctx.stroke();
    }
    
    /**
     * Render fractal pattern
     * @param {number} centerX - X coordinate of center
     * @param {number} centerY - Y coordinate of center
     * @param {number} maxRadius - Maximum radius
     */
    _renderFractal(centerX, centerY, maxRadius) {
      const { fractalDepth, fractalScale, startShape, endShape, morphProgress, lineThickness } = this.options;
      
      // Draw the base shape
      this._drawFractalShape(centerX, centerY, maxRadius, 0, fractalDepth);
    }
    
    /**
     * Recursively draw fractal shapes
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {number} size - Size of the shape
     * @param {number} depth - Current recursion depth
     * @param {number} maxDepth - Maximum recursion depth
     */
    _drawFractalShape(x, y, size, depth, maxDepth) {
      const { fractalScale, startShape, endShape, morphProgress, lineThickness } = this.options;
      
      if (depth >= maxDepth) {
        return;
      }
      
      // Calculate progress based on depth
      const depthProgress = depth / maxDepth;
      const combinedProgress = (morphProgress + depthProgress) % 1;
      
      // Draw the shape at this level
      this.ctx.beginPath();
      const angleStep = Math.PI / 18;
      
      // Calculate points around the shape
      const points = [];
      
      for (let angle = 0; angle < 2 * Math.PI; angle += angleStep) {
        // Get base distances for the two shapes
        let startDist = this.calculator.getShapeDistance(startShape, angle);
        let endDist = this.calculator.getShapeDistance(endShape, angle);
        
        // Normalize distances
        const normalizedStartDist = this.calculator.normalizeShapeDistance(startShape, startDist);
        const normalizedEndDist = this.calculator.normalizeShapeDistance(endShape, endDist);
        
        // Linear interpolation
        const dist = normalizedStartDist * (1 - combinedProgress) + normalizedEndDist * combinedProgress;
        
        // Calculate point on the shape
        const pointX = x + Math.cos(angle) * size * dist;
        const pointY = y + Math.sin(angle) * size * dist;
        
        if (angle === 0) {
          this.ctx.moveTo(pointX, pointY);
        } else {
          this.ctx.lineTo(pointX, pointY);
        }
        
        // Store point for recursive shapes
        if (angle % (2 * angleStep) === 0) {
          points.push({ x: pointX, y: pointY });
        }
      }
      
      this.ctx.closePath();
      
      // Create gradient
      const gradient = this.ctx.createRadialGradient(
        x, y, 0,
        x, y, size
      );
      
      // Color based on depth and morph progress
      const levelColor = this._interpolateColor(
        this.options.centerColor,
        this.options.outerColor,
        depthProgress
      );
      
      gradient.addColorStop(0, depthProgress === 0 ? this.options.centerColor : levelColor);
      gradient.addColorStop(1, this.options.outerColor);
      
      this.ctx.fillStyle = gradient;
      this.ctx.fill();
      
      this.ctx.lineWidth = lineThickness * (1 - depthProgress * 0.5);
      this.ctx.strokeStyle = this._darkenColor(this.options.outerColor, 0.2);
      this.ctx.stroke();
      
      // Recursively draw smaller shapes at each point
      if (depth < maxDepth - 1) {
        // Extract key points for child shapes (e.g., vertices)
        const childPoints = [];
        
        // For more controlled fractal, choose specific points
        if (startShape === 'star' || endShape === 'star') {
          // For star-like shapes, place children at the points
          for (let i = 0; i < points.length; i += 2) {
            childPoints.push(points[i]);
          }
        } else if (startShape === 'square' || endShape === 'square') {
          // For square-like shapes, place at corners
          for (let i = 0; i < points.length; i += points.length / 4) {
            childPoints.push(points[Math.floor(i)]);
          }
        } else {
          // Default: distribute evenly
          for (let i = 0; i < points.length; i += Math.max(1, Math.floor(points.length / 5))) {
            childPoints.push(points[i]);
          }
        }
        
        // Draw children at each point
        for (const point of childPoints) {
          this._drawFractalShape(point.x, point.y, size * fractalScale, depth + 1, maxDepth);
        }
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
        
        gradient.addColorStop(0, this._addAlpha(centerColor, centerGlowOpacity));
        gradient.addColorStop(1, this._addAlpha(centerColor, 0));
        
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
          
          // Calculate line points
          const startX = centerX + Math.cos(angle) * innerRadius;
          const startY = centerY + Math.sin(angle) * innerRadius;
          const endX = centerX + Math.cos(angle) * maxRadius * dist;
          const endY = centerY + Math.sin(angle) * maxRadius * dist;
          
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
          
          // Calculate line points
          const startX = centerX + Math.cos(angle) * innerRadius;
          const startY = centerY + Math.sin(angle) * innerRadius;
          const endX = centerX + Math.cos(angle) * maxRadius * dist;
          const endY = centerY + Math.sin(angle) * maxRadius * dist;
          
          // Add line
          svgContent += `
    <line x1="${startX}" y1="${startY}" x2="${endX}" y2="${endY}" stroke="url(#gradient-${i})" stroke-width="${this.options.lineThickness}"/>`;
        }
        
        // Add center glow
        const glowRadius = Math.max(5, maxRadius * 0.05);
        svgContent += `
    <circle cx="${centerX}" cy="${centerY}" r="${glowRadius}" fill="url(#centerGlow)"/>`;
        
        // Add center point
        svgContent += `
    <circle cx="${centerX}" cy="${centerY}" r="${this.options.lineThickness}" fill="${this.options.centerColor}"/>
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
  }