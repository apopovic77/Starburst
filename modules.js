/**
 * Logger Module
 * Handles all logging with different severity levels
 */
const Logger = (function() {
    // Log levels
    const LOG_LEVELS = {
      DEBUG: 0,
      INFO: 1,
      WARN: 2,
      ERROR: 3
    };
    
    // Current log level
    let currentLogLevel = LOG_LEVELS.INFO;
    
    // Log history for debug panel
    const logHistory = [];
    const MAX_HISTORY = 50;
    
    // Format timestamp
    function formatTime() {
      const now = new Date();
      return `${now.toLocaleTimeString('en-US', { hour12: false })}.${
               now.getMilliseconds().toString().padStart(3, '0')}`;
    }
    
    // Add entry to log history
    function addToHistory(level, message, data) {
      logHistory.unshift({
        timestamp: new Date(),
        level,
        message,
        data: data || ''
      });
      
      if (logHistory.length > MAX_HISTORY) {
        logHistory.pop();
      }
    }
    
    // Public API
    return {
      setLogLevel(level) {
        if (LOG_LEVELS[level] !== undefined) {
          currentLogLevel = LOG_LEVELS[level];
          this.info(`Log level set to ${level}`);
        } else {
          console.error(`Invalid log level: ${level}`);
        }
        return this;
      },
      
      debug(message, data) {
        if (currentLogLevel <= LOG_LEVELS.DEBUG) {
          console.debug(`[DEBUG ${formatTime()}] ${message}`, data || '');
          addToHistory('DEBUG', message, data);
        }
        return this;
      },
      
      info(message, data) {
        if (currentLogLevel <= LOG_LEVELS.INFO) {
          console.info(`[INFO ${formatTime()}] ${message}`, data || '');
          addToHistory('INFO', message, data);
        }
        return this;
      },
      
      warn(message, data) {
        if (currentLogLevel <= LOG_LEVELS.WARN) {
          console.warn(`[WARN ${formatTime()}] ${message}`, data || '');
          addToHistory('WARN', message, data);
        }
        return this;
      },
      
      error(message, error, additionalData) {
        if (currentLogLevel <= LOG_LEVELS.ERROR) {
          console.error(`[ERROR ${formatTime()}] ${message}`);
          
          if (error instanceof Error) {
            console.error(error);
            addToHistory('ERROR', message, {
              name: error.name,
              message: error.message,
              stack: error.stack,
              additionalData
            });
          } else {
            addToHistory('ERROR', message, { error, additionalData });
          }
        }
        return this;
      },
      
      getHistory() {
        return [...logHistory];
      },
      
      clearHistory() {
        logHistory.length = 0;
        return this;
      }
    };
  })();
  
  /**
   * Custom Error Types
   */
  class ShapeError extends Error {
    constructor(message) {
      super(message);
      this.name = 'ShapeError';
    }
  }
  
  class RenderError extends Error {
    constructor(message) {
      super(message);
      this.name = 'RenderError';
    }
  }
  
  /**
   * Shape Calculator Module
   * Handles all shape-specific calculations with pure functions
   */
  const ShapeCalculator = (function() {
    // Private constants for shape calculations
    const TRIANGLE_HEIGHT_FACTOR = Math.sqrt(3) / 2; // Equilateral triangle height factor
    
    /**
     * Apply corner radius to shape distance
     * @param {number} distance - Original distance from center to edge
     * @param {number} angle - Angle in radians
     * @param {number} cornerRadius - Corner radius (0-1)
     * @param {number} corners - Number of corners in the shape
     * @param {string} method - Method to use for corner radius ('arc', 'blend', or 'alternative')
     * @returns {number} - Modified distance with corner radius applied
     */
    function applyCornerRadius(distance, angle, cornerRadius, corners = 4, method = 'arc') {
      if (cornerRadius <= 0) return distance; // No corner radius
      
      // Enhance corner radius effect for shapes with fewer corners
      // This makes the rounding effect more pronounced on triangles and squares
      let enhancedCornerRadius = cornerRadius;
      if (corners <= 4) {
        enhancedCornerRadius = Math.min(1, cornerRadius * 1.5);
      }
      
      // Use different methods based on parameter
      switch (method) {
        case 'arc':
          return applyArcCornerRadius(distance, angle, enhancedCornerRadius, corners);
        case 'blend':
          return applyBlendCornerRadius(distance, angle, cornerRadius, corners);
        case 'alternative':
          return applyAlternativeCornerRadius(distance, angle, cornerRadius, corners);
        default:
          return applyArcCornerRadius(distance, angle, enhancedCornerRadius, corners);
      }
    }
    
    /**
     * Apply corner radius using arc method (current approach)
     * Creates proper geometric arcs at corners
     */
    function applyArcCornerRadius(distance, angle, cornerRadius, corners) {
      if (cornerRadius <= 0) return distance;
      
      // Calculate the angle to each corner - important: offset angles based on shape type
      const segmentAngle = (2 * Math.PI) / corners;
      
      // Different shapes have different angle offsets for corners
      let angleOffset = 0;
      // For square, the corners are at 45°, 135°, 225°, 315° (π/4, 3π/4, 5π/4, 7π/4)
      if (corners === 4) {
        angleOffset = Math.PI / 4; // 45 degrees
      } else if (corners === 3) {
        angleOffset = Math.PI / 6; // 30 degrees for triangle
      } else if (corners === 5) {
        angleOffset = Math.PI / 5; // For pentagon
      } else if (corners === 6) {
        angleOffset = 0; // For hexagon (corners at 0, 60, 120, etc.)
      }
      
      // Find the nearest corner angular position with correct offset
      const cornerAngles = [];
      for (let i = 0; i < corners; i++) {
        cornerAngles.push((i * segmentAngle) + angleOffset);
      }
      
      // Find the closest corner
      let closestCornerAngle = cornerAngles[0];
      let minAngularDistance = Math.abs(((angle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI) - cornerAngles[0]);
      if (minAngularDistance > Math.PI) {
        minAngularDistance = 2 * Math.PI - minAngularDistance;
      }
      
      for (let i = 1; i < cornerAngles.length; i++) {
        const cornerAngle = cornerAngles[i];
        const normalizedAngle = ((angle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        
        // Calculate angular distance, handling wrap-around
        let angDist = Math.abs(normalizedAngle - cornerAngle);
        if (angDist > Math.PI) {
          angDist = 2 * Math.PI - angDist;
        }
        
        if (angDist < minAngularDistance) {
          minAngularDistance = angDist;
          closestCornerAngle = cornerAngle;
        }
      }
      
      // The maximum effect distance (angular) is proportional to corner radius
      const maxAngularEffect = (segmentAngle / 2) * cornerRadius;
      
      // If we're not within the effect zone of a corner, return the original distance
      if (minAngularDistance > maxAngularEffect) {
        return distance;
      }
      
      // The actual corner point distance from center
      const cornerPointDistance = calculateDistanceAtCorner(closestCornerAngle, corners);
      
      // Calculate how much to reduce the distance at the exact corner point
      // This is what creates the rounding effect
      const reductionAmount = cornerPointDistance * cornerRadius * 0.35;
      
      // Calculate the reduction based on angular distance from corner
      // Use a quadratic falloff for smoother transition (1 at corner, 0 at edge of effect)
      const falloff = 1 - Math.pow(minAngularDistance / maxAngularEffect, 2);
      
      // Apply reduction scaled by falloff
      return distance - (reductionAmount * falloff);
    }
    
    /**
     * Calculate the precise distance from center to corner for a regular polygon
     */
    function calculateDistanceAtCorner(angle, corners) {
      // For regular polygons, all corners are at the same distance
      // Vertices lie on a circle with radius 1/cos(π/n) relative to the inscribed circle
      return 1 / Math.cos(Math.PI / corners);
    }
    
    /**
     * Apply corner radius using blend method
     * Blends between original shape and circle
     */
    function applyBlendCornerRadius(distance, angle, cornerRadius, corners) {
      if (cornerRadius >= 1) return 1; // Full corner radius (becomes circle)
      
      // Higher corners value = shape approaches circle faster
      // For shapes like square, pentagon, etc., smooth corners near the corners
      const segmentAngle = (2 * Math.PI) / corners;
      
      // Normalize angle to the current segment
      const angleInSegment = angle % segmentAngle;
      
      // Find position within segment (0 = corner, 0.5 = middle of edge)
      const positionInSegment = Math.min(
        angleInSegment / segmentAngle,
        (segmentAngle - angleInSegment) / segmentAngle
      ) * 2;
      
      // Calculate blend factor based on corner radius and position
      // Higher corner radius = more blending with circle
      // Closer to corner = more effect
      const blendFactor = Math.max(0, Math.min(1, (1 - positionInSegment) / cornerRadius));
      
      // Blend between original shape and circle (distance = 1)
      return distance * (1 - blendFactor) + 1 * blendFactor;
    }
    
    /**
     * Apply corner radius using alternative method
     * Uses inward displacement based on corner proximity
     */
    function applyAlternativeCornerRadius(distance, angle, cornerRadius, corners) {
      if (cornerRadius <= 0) return distance;
      
      // Calculate segment angle
      const segmentAngle = (2 * Math.PI) / corners;
      
      // Different shapes have different angle offsets for corners
      let angleOffset = 0;
      // For square, the corners are at 45°, 135°, 225°, 315° (π/4, 3π/4, 5π/4, 7π/4)
      if (corners === 4) {
        angleOffset = Math.PI / 4; // 45 degrees
      } else if (corners === 3) {
        angleOffset = Math.PI / 6; // 30 degrees for triangle
      } else if (corners === 5) {
        angleOffset = Math.PI / 5; // For pentagon
      } else if (corners === 6) {
        angleOffset = 0; // For hexagon (corners at 0, 60, 120, etc.)
      }
      
      // Get the exact angles of all corners with the correct offset
      const cornerAngles = [];
      for (let i = 0; i < corners; i++) {
        cornerAngles.push((i * segmentAngle) + angleOffset);
      }
      
      // Normalize input angle
      const normalizedAngle = ((angle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      
      // Find the closest corner by checking distance to each corner
      let closestCornerDist = Infinity;
      let closestCornerAngle = 0;
      
      for (let i = 0; i < cornerAngles.length; i++) {
        const cornerAngle = cornerAngles[i];
        
        // Calculate angular distance, handling wrap-around
        let angDist = Math.abs(normalizedAngle - cornerAngle);
        if (angDist > Math.PI) {
          angDist = 2 * Math.PI - angDist;
        }
        
        if (angDist < closestCornerDist) {
          closestCornerDist = angDist;
          closestCornerAngle = cornerAngle;
        }
      }
      
      // Calculate how far the corner effect extends
      const cornerEffectRadius = segmentAngle * 0.3 * cornerRadius;
      
      // If outside the corner effect, return original distance
      if (closestCornerDist >= cornerEffectRadius) {
        return distance;
      }
      
      // For corners: apply direct reduction based on corner proximity
      const cornerProximity = 1 - (closestCornerDist / cornerEffectRadius);
      
      // Use cubic ease-out curve for smoother transition from corner
      const smoothedFactor = cornerProximity * cornerProximity * (3 - 2 * cornerProximity);
      
      // The maximum reduction at corners - strong enough to be visible
      const maxReduction = distance * 0.5 * cornerRadius;
      
      // Calculate final reduced distance
      return distance - (maxReduction * smoothedFactor);
    }
    
    /**
     * Calculate distance from center to edge for a circle
     * @returns {number} Constant radius of 1
     */
    function calculateCircle() {
      return 1;
    }
    
    /**
     * Calculate distance from center to edge for a star shape
     * @param {number} angle - Angle in radians
     * @param {object} options - Configuration options
     * @returns {number} Radius at the given angle
     */
    function calculateStar(angle, options = {}) {
      try {
        const { points = 5, innerRadius = 0.4, cornerRadius = 0, cornerRadiusMethod = 'arc' } = options;
        
        if (points <= 0) {
          throw new ShapeError('Star points must be greater than 0');
        }
        
        if (innerRadius <= 0 || innerRadius >= 1) {
          throw new ShapeError('Star inner radius must be between 0 and 1');
        }
        
        // Normalize angle to the current segment
        const segmentAngle = (2 * Math.PI) / points;
        const angleInSegment = angle % segmentAngle;
        
        // Calculate distance using a power function for sharp transitions
        // cos(points * angle/2) oscillates between -1 and 1, with zeros at the star points
        const oscillation = Math.cos(points * angle / 2);
        
        // Take absolute value and invert the oscillation so star points are at maxima
        const pointPosition = 1 - Math.abs(oscillation);
        
        // Apply a power function to create sharper transitions (higher power = sharper)
        const power = 4;
        const sharpPointPosition = Math.pow(pointPosition, power);
        
        // Interpolate between inner and outer radius
        const distance = innerRadius + sharpPointPosition * (1 - innerRadius);
        
        // Apply corner radius effect at the points
        return applyCornerRadius(distance, angle, cornerRadius, points, cornerRadiusMethod);
      } catch (error) {
        Logger.error('Error calculating star shape', error);
        return 1; // Fallback to circle
      }
    }
    
    /**
     * Calculate distance from center to edge for a triangle shape
     * @param {number} angle - Angle in radians
     * @param {object} options - Configuration options
     * @returns {number} Radius at the given angle
     */
    function calculateTriangle(angle, options = {}) {
      try {
        const { cornerRadius = 0, cornerRadiusMethod = 'arc' } = options;
        const sectorAngle = 2 * Math.PI / 3;
        // Shift angle to align with a corner at 0
        const shiftedAngle = angle + Math.PI / 6;
        // Get angle within the nearest sector
        const sectorPosition = shiftedAngle % sectorAngle;
        // Calculate distance from center to side
        const cosValue = Math.cos(Math.abs(sectorPosition - sectorAngle/2));
        // Ensure we don't divide by zero
        if (Math.abs(cosValue) < 0.001) {
          return 100; // Safe fallback value
        }
        
        const distance = 1 / (cosValue * TRIANGLE_HEIGHT_FACTOR);
        
        // Apply corner radius (3 corners for triangle)
        return applyCornerRadius(distance, shiftedAngle, cornerRadius, 3, cornerRadiusMethod);
      } catch (error) {
        Logger.error('Error calculating triangle shape', error);
        return 1; // Fallback to circle
      }
    }
    
    /**
     * Calculate distance from center to edge for a square shape
     * @param {number} angle - Angle in radians
     * @param {object} options - Configuration options 
     * @returns {number} Radius at the given angle
     */
    function calculateSquare(angle, options = {}) {
      try {
        const { cornerRadius = 0, cornerRadiusMethod = 'arc' } = options;
        const cosVal = Math.abs(Math.cos(angle));
        const sinVal = Math.abs(Math.sin(angle));
        const divisor = Math.max(cosVal, sinVal);
        
        // Avoid division by zero
        if (divisor < 0.001) {
          Logger.warn('Near-zero divisor in square calculation', { angle, divisor });
          return 100; // Fallback
        }
        
        const distance = 1 / divisor;
        
        // Apply corner radius (4 corners for square)
        return applyCornerRadius(distance, angle, cornerRadius, 4, cornerRadiusMethod);
      } catch (error) {
        Logger.error('Error calculating square shape', error);
        return 1; // Fallback to circle
      }
    }
    
    /**
     * Calculate distance from center to edge for a pentagon shape
     * @param {number} angle - Angle in radians
     * @param {object} options - Configuration options
     * @returns {number} Radius at the given angle
     */
    function calculatePentagon(angle, options = {}) {
      try {
        const { cornerRadius = 0, cornerRadiusMethod = 'arc' } = options;
        const sides = 5;
        const sectorAngle = 2 * Math.PI / sides;
        // Align with a corner
        const shiftedAngle = angle + sectorAngle / 2;
        // Get angle within current sector
        const sectorPosition = shiftedAngle % sectorAngle;
        // Calculate distance
        const apothem = Math.cos(Math.PI / sides);
        const cosVal = Math.cos(Math.abs(sectorPosition - sectorAngle/2));
        // Avoid division by zero
        if (Math.abs(cosVal * apothem) < 0.001) {
          return 100; // Fallback
        }
        
        const distance = 1 / (cosVal * apothem);
        
        // Apply corner radius (5 corners for pentagon)
        return applyCornerRadius(distance, shiftedAngle, cornerRadius, 5, cornerRadiusMethod);
      } catch (error) {
        Logger.error('Error calculating pentagon shape', error);
        return 1; // Fallback to circle
      }
    }
    
    /**
     * Calculate distance from center to edge for a hexagon shape
     * @param {number} angle - Angle in radians
     * @param {object} options - Configuration options
     * @returns {number} Radius at the given angle
     */
    function calculateHexagon(angle, options = {}) {
      try {
        const { cornerRadius = 0, cornerRadiusMethod = 'arc' } = options;
        const sides = 6;
        const sectorAngle = 2 * Math.PI / sides;
        // Get angle within current sector
        const sectorPosition = angle % sectorAngle;
        // Calculate distance
        const apothem = Math.cos(Math.PI / sides);
        const cosVal = Math.cos(Math.abs(sectorPosition - sectorAngle/2));
        // Avoid division by zero
        if (Math.abs(cosVal * apothem) < 0.001) {
          return 100; // Fallback
        }
        
        const distance = 1 / (cosVal * apothem);
        
        // Apply corner radius (6 corners for hexagon)
        return applyCornerRadius(distance, angle, cornerRadius, 6, cornerRadiusMethod);
      } catch (error) {
        Logger.error('Error calculating hexagon shape', error);
        return 1; // Fallback to circle
      }
    }
    
    // Public API
    return {
      /**
       * Calculate the radius for a specific shape at a given angle
       * @param {string} shape - The shape name
       * @param {number} angle - The angle in radians
       * @param {object} options - Optional configuration
       * @returns {number} - The calculated radius
       */
      getShapeDistance: function(shape, angle, options = {}) {
        if (!shape || typeof shape !== 'string') {
          Logger.warn('Invalid shape parameter', { shape });
          return 1; // Fallback to circle
        }
        
        if (typeof angle !== 'number' || isNaN(angle)) {
          Logger.warn('Invalid angle parameter', { angle });
          return 1; // Fallback to circle
        }
        
        // Normalize angle
        let normalizedAngle = angle;
        while (normalizedAngle < 0) normalizedAngle += 2 * Math.PI;
        normalizedAngle = normalizedAngle % (2 * Math.PI);
        
        Logger.debug('Calculating shape distance', { shape, angle: normalizedAngle });
        
        // Shape-specific calculations
        try {
          let result;
          const { cornerRadius = 0, cornerRadiusMethod = 'arc' } = options;
          
          switch(shape.toLowerCase()) {
            case 'circle': result = calculateCircle(); break;
            case 'star': result = calculateStar(normalizedAngle, { ...options, cornerRadiusMethod }); break;
            case 'triangle': result = calculateTriangle(normalizedAngle, { ...options, cornerRadiusMethod }); break;
            case 'square': result = calculateSquare(normalizedAngle, { ...options, cornerRadiusMethod }); break;
            case 'pentagon': result = calculatePentagon(normalizedAngle, { ...options, cornerRadiusMethod }); break;
            case 'hexagon': result = calculateHexagon(normalizedAngle, { ...options, cornerRadiusMethod }); break;
            default:
              Logger.warn(`Unknown shape: ${shape}, using circle`);
              result = calculateCircle();
          }
          
          // Validate result
          if (!isFinite(result) || isNaN(result)) {
            Logger.warn(`Invalid calculation result for ${shape}`, { result, angle: normalizedAngle });
            return 1; // Fallback to circle
          }
          
          return result;
        } catch (error) {
          Logger.error('Error in shape calculation', error, { shape, angle });
          return 1; // Fallback to circle
        }
      },
      
      /**
       * Normalize shape distances for consistent visual sizing
       * @param {string} shape - The shape name
       * @param {number} distance - Raw calculated distance
       * @returns {number} - Normalized distance
       */
      normalizeShapeDistance: function(shape, distance) {
        // These factors help maintain consistent visual size when morphing
        const normalizationFactors = {
          'circle': 1,
          'star': 0.85, // Star peaks are slightly reduced
          'triangle': 0.75, // Triangle corners are reduced more
          'square': 0.75, // Square corners reduced
          'pentagon': 0.8, // Pentagon corners slightly reduced
          'hexagon': 0.85 // Hexagon is closer to circle
        };
        
        // Get the normalization factor for this shape, default to 1 if not defined
        const factor = normalizationFactors[shape] || 1;
        
        // Apply normalization to ensure consistent visual size
        // This helps avoid "jumping" when transitioning between shapes
        return distance * factor;
      }
    };
  })();
  
  /**
   * Performance Monitor
   * Tracks frame rate and performance metrics
   */
  const PerformanceMonitor = (function() {
    let frameCount = 0;
    let lastTime = performance.now();
    let fps = 0;
    
    return {
      /**
       * Update FPS counter
       */
      tick: function() {
        frameCount++;
        
        const now = performance.now();
        const elapsed = now - lastTime;
        
        if (elapsed >= 1000) {
          fps = Math.round((frameCount * 1000) / elapsed);
          frameCount = 0;
          lastTime = now;
          
          // Update FPS display
          const fpsCounter = document.getElementById('fpsCounter');
          if (fpsCounter) {
            fpsCounter.textContent = `${fps} FPS`;
            
            // Highlight performance issues
            if (fps < 30) {
              fpsCounter.style.color = '#f55';
            } else if (fps < 50) {
              fpsCounter.style.color = '#ff5';
            } else {
              fpsCounter.style.color = '#5f5';
            }
          }
        }
        
        return fps;
      },
      
      /**
       * Get current FPS
       * @returns {number} Current frames per second
       */
      getFPS: function() {
        return fps;
      }
    };
  })();
  
  /**
   * Configuration Manager Module
   * Handles saving, loading, and sharing settings
   */
  const ConfigManager = (function() {
    // Storage key for settings
    const STORAGE_KEY = 'starburst_settings';
    
    // List of serializable settings
    const SERIALIZABLE_SETTINGS = [
      'numLines', 'lineThickness', 'innerRadiusRatio', 'rotation', 'canvasRotation', 'scale',
      'morphProgress', 'startShape', 'endShape',
      'centerColor', 'outerColor', 'backgroundColor',
      'animationSpeed', 'animationMode', 'selectedShapes', 'toggleAnimDuration',
      'cornerRadius', 'cornerRadiusMethod', 'displacementX', 'displacementY',
      // Typography settings
      'showText', 'titleText', 'subtitleText', 'textSize', 'textColor', 
      'fontFamily', 'fontWeight', 'charSpacing', 'lineSpacing', 'textPosition', 'textCase',
      // New settings
      'generationStrategy', 'centerStyle', 'centerSize', 'centerGlowSize', 'centerGlowOpacity',
      'concentricLayers', 'concentricSpacing', 'gridSize', 'gridStyle',
      'symmetryFactor', 'symmetryType', 'fractalDepth', 'fractalScale'
    ];
    
    // Validate settings object
    function validateSettings(settings) {
      // Deep copy to avoid modifying original
      const validSettings = JSON.parse(JSON.stringify(settings || {}));
      
      // Validate and sanitize numeric values
      if ('numLines' in validSettings) {
        validSettings.numLines = Math.max(10, Math.min(200, parseInt(validSettings.numLines) || 60));
      }
      
      if ('lineThickness' in validSettings) {
        validSettings.lineThickness = Math.max(0.5, Math.min(5, parseFloat(validSettings.lineThickness) || 1.5));
      }
      
      if ('innerRadiusRatio' in validSettings) {
        validSettings.innerRadiusRatio = Math.max(0, Math.min(0.9, parseFloat(validSettings.innerRadiusRatio) || 0));
      }
      
      if ('rotation' in validSettings) {
        validSettings.rotation = Math.max(0, Math.min(360, parseInt(validSettings.rotation) || 0));
      }
      
      if ('canvasRotation' in validSettings) {
        validSettings.canvasRotation = Math.max(0, Math.min(360, parseInt(validSettings.canvasRotation) || 0));
      }
      
      if ('scale' in validSettings) {
        validSettings.scale = Math.max(0.1, Math.min(2, parseFloat(validSettings.scale) || 1));
      }
      
      if ('morphProgress' in validSettings) {
        validSettings.morphProgress = Math.max(0, Math.min(1, parseFloat(validSettings.morphProgress) || 0.5));
      }
      
      // Validate animation speed
      if ('animationSpeed' in validSettings) {
        validSettings.animationSpeed = Math.max(0.5, Math.min(5, parseFloat(validSettings.animationSpeed) || 2));
      }
      
      // Validate toggle animation duration
      if ('toggleAnimDuration' in validSettings) {
        validSettings.toggleAnimDuration = Math.max(1, Math.min(10, parseFloat(validSettings.toggleAnimDuration) || 3));
      }
      
      // Validate new settings
      if ('centerSize' in validSettings) {
        validSettings.centerSize = Math.max(0, Math.min(20, parseFloat(validSettings.centerSize) || 2));
      }
      
      if ('centerGlowSize' in validSettings) {
        validSettings.centerGlowSize = Math.max(0, Math.min(50, parseFloat(validSettings.centerGlowSize) || 5));
      }
      
      if ('centerGlowOpacity' in validSettings) {
        validSettings.centerGlowOpacity = Math.max(0, Math.min(1, parseFloat(validSettings.centerGlowOpacity) || 0.5));
      }
      
      if ('concentricLayers' in validSettings) {
        validSettings.concentricLayers = Math.max(2, Math.min(20, parseInt(validSettings.concentricLayers) || 5));
      }
      
      if ('concentricSpacing' in validSettings) {
        validSettings.concentricSpacing = Math.max(0.1, Math.min(1, parseFloat(validSettings.concentricSpacing) || 0.5));
      }
      
      if ('gridSize' in validSettings) {
        validSettings.gridSize = Math.max(2, Math.min(20, parseInt(validSettings.gridSize) || 5));
      }
      
      if ('symmetryFactor' in validSettings) {
        validSettings.symmetryFactor = Math.max(2, Math.min(12, parseInt(validSettings.symmetryFactor) || 4));
      }
      
      if ('fractalDepth' in validSettings) {
        validSettings.fractalDepth = Math.max(1, Math.min(5, parseInt(validSettings.fractalDepth) || 3));
      }
      
      if ('fractalScale' in validSettings) {
        validSettings.fractalScale = Math.max(0.1, Math.min(0.7, parseFloat(validSettings.fractalScale) || 0.5));
      }
      
      // Validate shape settings
      const validShapes = ['circle', 'star', 'triangle', 'square', 'pentagon', 'hexagon'];
      
      if (validShapes.includes(validSettings.startShape)) {
        validSettings.startShape = validSettings.startShape;
      }
      
      if (validShapes.includes(validSettings.endShape)) {
        validSettings.endShape = validSettings.endShape;
      }
      
      // Validate animation mode
      const validModes = ['twoShape', 'multiShape'];
      if (validModes.includes(validSettings.animationMode)) {
        validSettings.animationMode = validSettings.animationMode;
      }
      
      // Validate generation strategy
      const validStrategies = ['starburst', 'concentric', 'grid', 'symmetrical', 'fractal'];
      if (validStrategies.includes(validSettings.generationStrategy)) {
        validSettings.generationStrategy = validSettings.generationStrategy;
      }
      
      // Validate center style
      const validCenterStyles = ['dot', 'none', 'hole', 'custom'];
      if (validCenterStyles.includes(validSettings.centerStyle)) {
        validSettings.centerStyle = validSettings.centerStyle;
      }
      
      // Validate grid style
      const validGridStyles = ['square', 'hexagonal', 'triangular'];
      if (validGridStyles.includes(validSettings.gridStyle)) {
        validSettings.gridStyle = validSettings.gridStyle;
      }
      
      // Validate symmetry type
      const validSymmetryTypes = ['radial', 'reflective', 'translational'];
      if (validSymmetryTypes.includes(validSettings.symmetryType)) {
        validSettings.symmetryType = validSettings.symmetryType;
      }
      
      // Validate selected shapes array for multi-shape mode
      if (Array.isArray(validSettings.selectedShapes)) {
        validSettings.selectedShapes = validSettings.selectedShapes.filter(shape => 
          validShapes.includes(shape)
        );
        
        // Ensure at least 2 shapes
        if (validSettings.selectedShapes.length < 2) {
          validSettings.selectedShapes = ['circle', 'star'];
        }
      }
      
      // Validate color settings (simple validation, just check if it looks like a valid color)
      const colorRegex = /^#[0-9A-F]{6}$/i;
      
      if (typeof validSettings.centerColor === 'string' && colorRegex.test(validSettings.centerColor)) {
        validSettings.centerColor = validSettings.centerColor;
      }
      
      if (typeof validSettings.outerColor === 'string' && colorRegex.test(validSettings.outerColor)) {
        validSettings.outerColor = validSettings.outerColor;
      }
      
      if (typeof validSettings.backgroundColor === 'string' && colorRegex.test(validSettings.backgroundColor)) {
        validSettings.backgroundColor = validSettings.backgroundColor;
      }
      
      return validSettings;
    }
    
    /**
     * Save settings to localStorage
     * @param {object} settings - Settings to save
     */
    function saveSettings(settings) {
      try {
        const validSettings = validateSettings(settings);
        
        // Only store essential settings
        const storableSettings = {};
        SERIALIZABLE_SETTINGS.forEach(key => {
          if (validSettings[key] !== undefined) {
            storableSettings[key] = validSettings[key];
          }
        });
        
        localStorage.setItem(STORAGE_KEY, JSON.stringify(storableSettings));
        return true;
      } catch (error) {
        Logger.error('Failed to save settings', error);
        return false;
      }
    }
    
    /**
     * Load settings from local storage
     * @returns {object|null} - Loaded settings or null if not found
     */
    function loadSettings() {
      try {
        const data = localStorage.getItem(STORAGE_KEY);
        
        if (!data) {
          Logger.info('No saved settings found');
          return null;
        }
        
        const settings = JSON.parse(data);
        Logger.info('Settings loaded from local storage');
        return settings;
      } catch (error) {
        Logger.error('Failed to load settings', error);
        return null;
      }
    }
    
    /**
     * Create a shareable URL with settings encoded in query parameters
     * @param {object} settings - Settings to encode in URL
     * @returns {string} - URL with encoded settings
     */
    function createShareableURL(settings) {
      try {
        const validSettings = validateSettings(settings);
        const params = new URLSearchParams();
        
        // Add validated settings to URL
        if (validSettings.numLines) params.append('numLines', validSettings.numLines);
        if (validSettings.lineThickness) params.append('lineThickness', validSettings.lineThickness);
        if (validSettings.innerRadiusRatio) params.append('innerRadiusRatio', validSettings.innerRadiusRatio);
        if (validSettings.rotation) params.append('rotation', validSettings.rotation);
        if (validSettings.canvasRotation) params.append('canvasRotation', validSettings.canvasRotation);
        if (validSettings.scale) params.append('scale', validSettings.scale);
        if (validSettings.morphProgress) params.append('morphProgress', validSettings.morphProgress);
        if (validSettings.startShape) params.append('startShape', validSettings.startShape);
        if (validSettings.endShape) params.append('endShape', validSettings.endShape);
        if (validSettings.centerColor) params.append('centerColor', validSettings.centerColor);
        if (validSettings.outerColor) params.append('outerColor', validSettings.outerColor);
        if (validSettings.backgroundColor) params.append('backgroundColor', validSettings.backgroundColor);
        if (validSettings.animationSpeed) params.append('animationSpeed', validSettings.animationSpeed);
        if (validSettings.animationMode) params.append('animationMode', validSettings.animationMode);
        if (Array.isArray(validSettings.selectedShapes)) {
          params.append('selectedShapes', JSON.stringify(validSettings.selectedShapes));
        }
        
        const url = new URL(window.location.href);
        url.search = params.toString();
        
        Logger.info('Generated shareable URL');
        return url.toString();
      } catch (error) {
        Logger.error('Failed to create shareable URL', error);
        return window.location.href;
      }
    }
    
    /**
     * Parse settings from URL parameters
     * @returns {object|null} - Parsed settings or null if none found
     */
    function parseURLParams() {
      try {
        const params = new URLSearchParams(window.location.search);
        
        if (params.size === 0) {
          return null;
        }
        
        const settings = {};
        
        // Parse each parameter into the settings object
        for (const [key, value] of params) {
          // Convert string values to appropriate types
          if (value === 'true') {
            settings[key] = true;
          } else if (value === 'false') {
            settings[key] = false;
          } else if (!isNaN(Number(value))) {
            settings[key] = Number(value);
          } else if (value.startsWith('[') && value.endsWith(']')) {
            // Handle array parameters (like selectedShapes)
            try {
              settings[key] = JSON.parse(value);
            } catch (e) {
              settings[key] = value;
            }
          } else {
            settings[key] = value;
          }
        }
        
        Logger.info('Parsed settings from URL', settings);
        return settings;
      } catch (error) {
        Logger.error('Failed to parse URL parameters', error);
        return null;
      }
    }
    
    /**
     * Save settings to cookies for persistence across sessions
     * @param {object} settings - Settings to save
     * @returns {boolean} - Success status
     */
    function saveSettingsToCookies(settings) {
      try {
        // Only save essential settings to cookies to avoid size limitations
        const cookieSettings = {
          fontFamily: settings.fontFamily,
          textSize: settings.textSize,
          textPosition: settings.textPosition,
          displacementX: settings.displacementX,
          displacementY: settings.displacementY,
          cornerRadius: settings.cornerRadius,
          cornerRadiusMethod: settings.cornerRadiusMethod,
          startShape: settings.startShape,
          endShape: settings.endShape,
          generationStrategy: settings.generationStrategy,
          scale: settings.scale
        };
        
        // Convert to JSON string
        const settingsJson = JSON.stringify(cookieSettings);
        
        // Set cookie that expires in 30 days
        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + 30);
        
        document.cookie = `starburstSettings=${encodeURIComponent(settingsJson)}; expires=${expirationDate.toUTCString()}; path=/; SameSite=Strict`;
        
        Logger.debug('Settings saved to cookie');
        return true;
      } catch (error) {
        Logger.error('Failed to save settings to cookie', error);
        return false;
      }
    }
    
    /**
     * Load settings from cookies
     * @returns {object|null} - Loaded settings or null if not found
     */
    function loadSettingsFromCookies() {
      try {
        // Get all cookies
        const cookies = document.cookie.split(';');
        
        // Find the settings cookie
        for (let i = 0; i < cookies.length; i++) {
          const cookie = cookies[i].trim();
          
          // Check if this is the settings cookie
          if (cookie.startsWith('starburstSettings=')) {
            // Extract the value
            const cookieValue = cookie.substring('starburstSettings='.length, cookie.length);
            
            // Parse the JSON
            const settings = JSON.parse(decodeURIComponent(cookieValue));
            
            Logger.debug('Settings loaded from cookie', settings);
            return settings;
          }
        }
        
        // No settings found
        return null;
      } catch (error) {
        Logger.error('Failed to load settings from cookie', error);
        return null;
      }
    }
    
    // Public API
    return {
      saveSettings,
      loadSettings,
      createShareableURL,
      parseURLParams,
      saveSettingsToCookies,
      loadSettingsFromCookies
    };
  })();
  
  // TestManager - Handles comprehensive testing of all application functions
  const TestManager = {
    tests: {},
    results: {},
    settings: null, // Reference to the settings object
    
    /**
     * Register a test for a specific module or feature
     * @param {string} category - The category/module being tested
     * @param {string} name - Test name
     * @param {Function} testFn - Test function that returns {success: boolean, message: string}
     */
    registerTest(category, name, testFn) {
      if (!this.tests[category]) {
        this.tests[category] = {};
      }
      this.tests[category][name] = testFn;
      Logger.debug(`Registered test: ${category}.${name}`);
    },
    
    /**
     * Set the settings object reference for tests to use
     * @param {object} settingsObj - The settings object
     */
    setSettings(settingsObj) {
      this.settings = settingsObj;
      Logger.debug('Settings reference set for TestManager');
    },
    
    /**
     * Automatically discover testable UI elements and register tests for them
     */
    discoverUIElements() {
      // Find all input elements that would affect settings
      const inputs = document.querySelectorAll('input[type="range"], input[type="color"], select:not([id$="Mode"])');
      
      inputs.forEach(input => {
        const id = input.id;
        if (!id) return;
        
        // Create test based on element type
        if (input.type === 'range') {
          this.registerTest('UI', `${id}_update`, () => this.testRangeControl(id));
        } else if (input.type === 'color') {
          this.registerTest('UI', `${id}_update`, () => this.testColorControl(id));
        } else if (input.tagName.toLowerCase() === 'select') {
          this.registerTest('UI', `${id}_update`, () => this.testSelectControl(id));
        }
      });
    },
    
    /**
     * Test a range input control
     * @param {string} id - Element ID
     */
    testRangeControl(id) {
      const control = document.getElementById(id);
      if (!control) {
        return { success: false, message: `Control not found: ${id}` };
      }
      
      // Store original value
      const originalValue = parseFloat(control.value);
      
      // Get the step value
      const step = parseFloat(control.step) || 1;
      
      // Test with a different value that's aligned to the step
      const range = parseFloat(control.max) - parseFloat(control.min);
      let testValue = originalValue === parseFloat(control.max) ? 
        parseFloat(control.min) : 
        originalValue + range / 4;
      
      // Round the test value to the nearest step
      testValue = Math.round(testValue / step) * step;
      
      // Format the value according to step precision
      const decimalPlaces = step.toString().includes('.') ? 
        step.toString().split('.')[1].length : 0;
      
      // Format the test value to match the step precision
      const formattedTestValue = parseFloat(testValue.toFixed(decimalPlaces));
      
      // Set the value and dispatch event
      control.value = formattedTestValue;
      control.dispatchEvent(new Event('input'));
      
      // Get the actual value from settings
      const settingValue = parseFloat(this.settings[id]);
      
      // Round the actual value to the nearest step value for comparison
      const roundedSettingValue = Math.round(settingValue / step) * step;
      const roundedTestValue = Math.round(formattedTestValue / step) * step;
      
      // Compare the rounded values
      const settingUpdated = Math.abs(roundedSettingValue - roundedTestValue) < 0.0001;
      
      // Restore original value
      control.value = originalValue;
      control.dispatchEvent(new Event('input'));
      
      return { 
        success: settingUpdated, 
        message: settingUpdated ? 
          `${id} setting successfully updated to ${formattedTestValue}` : 
          `${id} setting failed to update to ${formattedTestValue} (actual: ${settingValue})`
      };
    },
    
    /**
     * Test a color input control
     * @param {string} id - Element ID
     */
    testColorControl(id) {
      const control = document.getElementById(id);
      if (!control) {
        return { success: false, message: `Control not found: ${id}` };
      }
      
      // Store original value
      const originalValue = control.value;
      
      // Test with a different color
      const testValue = originalValue === '#ffffff' ? '#000000' : '#ffffff';
      
      control.value = testValue;
      control.dispatchEvent(new Event('input'));
      
      // Check if setting was updated
      const settingUpdated = this.settings[id] === testValue;
      
      // Restore original value
      control.value = originalValue;
      control.dispatchEvent(new Event('input'));
      
      return { 
        success: settingUpdated, 
        message: settingUpdated ? 
          `${id} color successfully updated to ${testValue}` : 
          `${id} color failed to update to ${testValue}`
      };
    },
    
    /**
     * Test a select control
     * @param {string} id - Element ID
     */
    testSelectControl(id) {
      const control = document.getElementById(id);
      if (!control) {
        return { success: false, message: `Control not found: ${id}` };
      }
      
      // Store original value
      const originalValue = control.value;
      
      // Find a different option to test with
      let testValue = null;
      for (let i = 0; i < control.options.length; i++) {
        if (control.options[i].value !== originalValue) {
          testValue = control.options[i].value;
          break;
        }
      }
      
      if (!testValue) {
        return { success: false, message: `No alternative options found for ${id}` };
      }
      
      // Test with different option
      control.value = testValue;
      control.dispatchEvent(new Event('change'));
      
      // Check if setting was updated
      const settingUpdated = this.settings[id] === testValue;
      
      // Restore original value
      control.value = originalValue;
      control.dispatchEvent(new Event('change'));
      
      return { 
        success: settingUpdated, 
        message: settingUpdated ? 
          `${id} setting successfully updated to ${testValue}` : 
          `${id} setting failed to update to ${testValue}`
      };
    },
    
    /**
     * Register tests for renderer functionality
     * @param {StarburstRenderer} renderer - The renderer instance
     */
    registerRendererTests(renderer) {
      if (!renderer) return;
      
      this.registerTest('Renderer', 'render', () => {
        try {
          renderer.render();
          return { success: true, message: 'Renderer.render() succeeded' };
        } catch (error) {
          return { success: false, message: `Renderer.render() failed: ${error.message}` };
        }
      });
      
      this.registerTest('Renderer', 'toggleAnimation', () => {
        try {
          const initialState = renderer.isAnimating;
          renderer.toggleAnimation();
          const toggled = renderer.isAnimating !== initialState;
          renderer.toggleAnimation(); // Toggle back to original state
          return { 
            success: toggled, 
            message: toggled ? 
              'Animation toggle succeeded' : 
              'Animation toggle failed to change state' 
          };
        } catch (error) {
          return { success: false, message: `toggleAnimation() failed: ${error.message}` };
        }
      });
      
      // Add more renderer function tests here
    },
    
    /**
     * Register tests for shape calculation functions
     */
    registerShapeTests() {
      // Test each shape calculation function
      const shapes = ['circle', 'star', 'triangle', 'square', 'pentagon', 'hexagon'];
      
      shapes.forEach(shape => {
        this.registerTest('ShapeCalculator', shape, () => {
          try {
            // Use the proper API: getShapeDistance with a test angle
            const distance = ShapeCalculator.getShapeDistance(shape, Math.PI/4);
            const success = typeof distance === 'number' && isFinite(distance);
            return { 
              success, 
              message: success ? 
                `${shape} calculation returned valid distance: ${distance}` : 
                `${shape} calculation failed to return valid distance` 
            };
          } catch (error) {
            return { success: false, message: `${shape} calculation error: ${error.message}` };
          }
        });
      });
    },
    
    /**
     * Register tests for utility functions
     */
    registerUtilTests() {
      // Test ConfigManager functions
      this.registerTest('ConfigManager', 'createShareableURL', () => {
        try {
          const url = ConfigManager.createShareableURL({numLines: 60});
          const success = url && url.includes('numLines=60');
          return { 
            success, 
            message: success ? 
              'createShareableURL succeeded' : 
              'createShareableURL failed to include settings' 
          };
        } catch (error) {
          return { success: false, message: `createShareableURL error: ${error.message}` };
        }
      });
      
      this.registerTest('ConfigManager', 'saveLoadSettings', () => {
        try {
          // Save a unique test value to settings
          const testTime = new Date().getTime();
          const testSettings = {
            numLines: 200,
            centerColor: '#ff0000',
            testIdentifier: `test-${testTime}`
          };
          
          // Save the test settings
          const saveResult = ConfigManager.saveSettings(testSettings);
          if (!saveResult) {
            return { success: false, message: 'Failed to save settings' };
          }
          
          // Load the settings back
          const loaded = ConfigManager.loadSettings();
          
          // Since ConfigManager only saves SERIALIZABLE_SETTINGS, testIdentifier won't be there
          // We'll check only for the standard properties that should be saved
          const success = loaded && 
                         loaded.numLines === testSettings.numLines && 
                         loaded.centerColor === testSettings.centerColor;
          
          return { 
            success, 
            message: success ? 
              'Settings successfully saved and loaded' : 
              `Settings save and load failed - loaded: ${JSON.stringify(loaded)}`
          };
        } catch (error) {
          return { success: false, message: `Settings test error: ${error.message}` };
        }
      });
    },
    
    /**
     * Run a specific test by category and name
     * @param {string} category - Test category
     * @param {string} name - Test name
     * @returns {Object} Test result {success, message}
     */
    runTest(category, name) {
      if (!this.tests[category] || !this.tests[category][name]) {
        return { success: false, message: `Test not found: ${category}.${name}` };
      }
      
      try {
        Logger.debug(`Running test: ${category}.${name}`);
        const result = this.tests[category][name]();
        this.results[`${category}.${name}`] = result;
        return result;
      } catch (error) {
        const result = { success: false, message: `Test threw error: ${error.message}` };
        this.results[`${category}.${name}`] = result;
        return result;
      }
    },
    
    /**
     * Run all tests in a specific category
     * @param {string} category - Test category to run
     * @returns {Object} Results object with counts
     */
    runCategory(category) {
      if (!this.tests[category]) {
        return { success: false, message: `Category not found: ${category}`, passed: 0, failed: 0, total: 0 };
      }
      
      const results = { passed: 0, failed: 0, total: 0 };
      for (const name in this.tests[category]) {
        const result = this.runTest(category, name);
        if (result.success) {
          results.passed++;
        } else {
          results.failed++;
        }
        results.total++;
      }
      
      results.success = results.failed === 0;
      results.message = `${category}: ${results.passed}/${results.total} tests passed`;
      return results;
    },
    
    /**
     * Run all registered tests
     * @returns {Object} Results with counts of passed/failed tests
     */
    runAllTests() {
      Logger.info('Running all tests');
      
      const results = { passed: 0, failed: 0, total: 0, categories: {} };
      
      for (const category in this.tests) {
        const categoryResults = this.runCategory(category);
        results.passed += categoryResults.passed;
        results.failed += categoryResults.failed;
        results.total += categoryResults.total;
        results.categories[category] = categoryResults;
      }
      
      results.success = results.failed === 0;
      Logger.info(`Test results: ${results.passed}/${results.total} tests passed`);
      
      // Display results in the debug panel
      const debugContent = document.getElementById('debugContent');
      if (debugContent) {
        let testSummary = `=========== TEST RESULTS ===========\n`;
        testSummary += `Overall: ${results.passed}/${results.total} passed\n\n`;
        
        for (const category in results.categories) {
          const cat = results.categories[category];
          testSummary += `${category}: ${cat.passed}/${cat.total} passed\n`;
        }
        
        // Show failed tests
        if (results.failed > 0) {
          testSummary += `\nFailed Tests:\n`;
          for (const key in this.results) {
            if (!this.results[key].success) {
              testSummary += `- ${key}: ${this.results[key].message}\n`;
            }
          }
        }
        
        debugContent.textContent = testSummary;
      }
      
      return results;
    },
    
    /**
     * Initialize the test manager and register all tests
     * @param {StarburstRenderer} renderer - The renderer instance
     */
    initialize(renderer) {
      // Clear any existing tests
      this.tests = {};
      this.results = {};
      
      // Register tests for each component
      this.discoverUIElements();
      this.registerRendererTests(renderer);
      this.registerShapeTests();
      this.registerUtilTests();
      
      Logger.info(`Test initialization complete. ${Object.keys(this.tests).length} test categories registered`);
    }
  };
  
  // Export modules
  window.Logger = Logger;
  window.ConfigManager = ConfigManager;
  window.ShapeCalculator = ShapeCalculator;
  window.TestManager = TestManager;
  