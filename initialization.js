// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Set up debug panel
    const debugPanel = document.getElementById('debugPanel');
    const debugContent = document.getElementById('debugContent');
    const debugToggle = document.getElementById('debugToggle');
    
    // Set up test panel
    const testPanel = document.getElementById('testPanel');
    const testCategories = document.getElementById('testCategories');
    const testToggle = document.getElementById('testToggle');
    const runAllTestsBtn = document.getElementById('runAllTestsBtn');
    const runFailedTestsBtn = document.getElementById('runFailedTestsBtn');
    const addCustomTestBtn = document.getElementById('addCustomTestBtn');
    const copyTestResultsBtn = document.getElementById('copyTestResultsBtn');
    
    // Shape selector elements
    const shapeSelector = document.getElementById('shapeSelector');
    const shapeIcons = document.querySelectorAll('.shape-icon');
    
    // Strategy selector elements
    const strategySelector = document.getElementById('strategySelector');
    const strategyIcons = document.querySelectorAll('.strategy-icon');
    
    // Dialog elements
    const controlsDialog = document.getElementById('controlsDialog');
    const dialogHeader = document.getElementById('dialogHeader');
    const minimizeBtn = document.getElementById('minimizeBtn');
    const maximizeBtn = document.getElementById('maximizeBtn');
    
    // Replace old test function with enhanced TestManager approach
    window.testControls = function() {
      Logger.info('Running test suite');
      return TestManager.runAllTests();
    };
    
    // Function to register tests for a new feature
    window.registerFeatureTests = function(featureName, controlIds = []) {
      Logger.info(`Registering tests for feature: ${featureName}`);
      
      // Create a test category for this feature
      if (controlIds.length > 0) {
        controlIds.forEach(id => {
          const element = document.getElementById(id);
          if (!element) {
            Logger.warn(`Control element not found: ${id}`);
            return;
          }
          
          // Based on element type, register appropriate test
          if (element.type === 'range') {
            TestManager.registerTest(featureName, `${id}_update`, () => TestManager.testRangeControl(id));
          } else if (element.type === 'color') {
            TestManager.registerTest(featureName, `${id}_update`, () => TestManager.testColorControl(id));
          } else if (element.tagName.toLowerCase() === 'select') {
            TestManager.registerTest(featureName, `${id}_update`, () => TestManager.testSelectControl(id));
          } else if (element.tagName.toLowerCase() === 'button') {
            TestManager.registerTest(featureName, `${id}_click`, () => {
              try {
                // Just verify the button exists and is clickable
                element.click();
                return { success: true, message: `${id} button clicked successfully` };
              } catch (error) {
                return { success: false, message: `${id} button click failed: ${error.message}` };
              }
            });
          }
        });
      }
      
      // Test the integration of this feature with the renderer
      TestManager.registerTest(featureName, 'renderer_integration', () => {
        try {
          // Try rendering with this feature active
          renderer.render();
          return { success: true, message: `Rendering with ${featureName} succeeded` };
        } catch (error) {
          return { success: false, message: `Rendering with ${featureName} failed: ${error.message}` };
        }
      });
      
      // Update test panel UI
      updateTestPanelUI();
    };
    
    // Test panel UI functions
    function updateTestPanelUI() {
      if (!testCategories) return;
      
      // Clear current content
      testCategories.innerHTML = '';
      
      // Add each test category
      for (const category in TestManager.tests) {
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'test-category';
        
        // Create header with category name and count
        const testsCount = Object.keys(TestManager.tests[category]).length;
        const header = document.createElement('div');
        header.className = 'category-header';
        header.innerHTML = `
          <span class="category-name">${category}</span>
          <span class="tests-count">${testsCount} tests</span>
        `;
        
        // Create container for tests
        const testList = document.createElement('div');
        testList.className = 'test-list';
        
        // Add each test in this category
        for (const testName in TestManager.tests[category]) {
          const testItem = document.createElement('div');
          testItem.className = 'test-item';
          
          // Find test result if it exists
          const resultKey = `${category}.${testName}`;
          const result = TestManager.results[resultKey];
          const resultClass = !result ? '' : result.success ? 'success' : 'failure';
          const resultText = !result ? 'Not run' : result.success ? 'Pass' : 'Fail';
          
          testItem.innerHTML = `
            <span class="test-name">${testName}</span>
            <button class="run-test-btn" data-category="${category}" data-test="${testName}">Run</button>
            <span class="test-result ${resultClass}">${resultText}</span>
          `;
          
          testList.appendChild(testItem);
        }
        
        // Toggle test list visibility when header is clicked
        header.addEventListener('click', () => {
          testList.style.display = testList.style.display === 'none' || testList.style.display === '' ? 'block' : 'none';
        });
        
        categoryDiv.appendChild(header);
        categoryDiv.appendChild(testList);
        testCategories.appendChild(categoryDiv);
      }
      
      // Add event listeners to run individual tests
      testCategories.querySelectorAll('.run-test-btn').forEach(button => {
        button.addEventListener('click', (e) => {
          e.stopPropagation(); // Prevent category toggle
          const category = button.dataset.category;
          const test = button.dataset.test;
          
          // Run the test
          const result = TestManager.runTest(category, test);
          
          // Update UI
          const resultSpan = button.nextElementSibling;
          resultSpan.textContent = result.success ? 'Pass' : 'Fail';
          resultSpan.className = `test-result ${result.success ? 'success' : 'failure'}`;
          
          // Show result in debug panel
          if (debugContent) {
            debugContent.textContent = `Test: ${category}.${test}\nResult: ${result.success ? 'PASS' : 'FAIL'}\nMessage: ${result.message}`;
            if (debugPanel.style.display === 'none') {
              debugToggle.click();
            }
          }
        });
      });
    }
    
    // Set up Test Panel toggle
    testToggle.addEventListener('click', function() {
      testPanel.style.display = testPanel.style.display === 'none' ? 'block' : 'none';
      
      if (testPanel.style.display === 'block') {
        updateTestPanelUI();
      }
    });
    
    // Set up test panel buttons
    runAllTestsBtn.addEventListener('click', () => {
      const results = TestManager.runAllTests();
      updateTestPanelUI();
      
      // Show summary in debug panel
      if (debugContent) {
        debugContent.textContent = `Test Summary: ${results.passed}/${results.total} tests passed\n`;
        if (results.failed > 0) {
          debugContent.textContent += `\nFailed tests: ${results.failed}`;
        }
        
        if (debugPanel.style.display === 'none') {
          debugToggle.click();
        }
      }
    });
    
    runFailedTestsBtn.addEventListener('click', () => {
      // Collect failed tests
      const failedTests = [];
      for (const key in TestManager.results) {
        if (TestManager.results[key] && !TestManager.results[key].success) {
          const [category, name] = key.split('.');
          failedTests.push({ category, name });
        }
      }
      
      // Re-run failed tests
      let passed = 0;
      failedTests.forEach(test => {
        const result = TestManager.runTest(test.category, test.name);
        if (result.success) passed++;
      });
      
      updateTestPanelUI();
      
      // Show summary
      if (debugContent) {
        debugContent.textContent = `Re-ran ${failedTests.length} failed tests\n${passed} now passing, ${failedTests.length - passed} still failing`;
        if (debugPanel.style.display === 'none') {
          debugToggle.click();
        }
      }
    });
    
    addCustomTestBtn.addEventListener('click', () => {
      // Prompt for test details
      const category = prompt('Enter test category (e.g., UI, Renderer):');
      if (!category) return;
      
      const name = prompt('Enter test name:');
      if (!name) return;
      
      const testCode = prompt('Enter test function body (will be wrapped in try/catch):', 
        'return { success: true, message: "Custom test passed" };');
      
      if (!testCode) return;
      
      // Create and register the test
      try {
        // Create function from code string
        const testFn = new Function(`
          try {
            ${testCode}
          } catch (error) {
            return { success: false, message: "Test error: " + error.message };
          }
        `);
        
        TestManager.registerTest(category, name, testFn);
        updateTestPanelUI();
        
        // Show confirmation
        debugContent.textContent = `Custom test added: ${category}.${name}`;
        if (debugPanel.style.display === 'none') {
          debugToggle.click();
        }
      } catch (error) {
        alert('Error creating test: ' + error.message);
      }
    });
    
    // Toggle test panel with Alt+T
    window.addEventListener('keydown', function(e) {
      if (e.altKey && e.key === 't') {
        testToggle.click();
      }
    });
    
    // Make the dialog draggable
    makeDraggable(controlsDialog, dialogHeader);
    
    // Dialog controls
    minimizeBtn.addEventListener('click', function() {
      controlsDialog.classList.toggle('minimized');
      minimizeBtn.textContent = controlsDialog.classList.contains('minimized') ? '+' : '−';
      minimizeBtn.title = controlsDialog.classList.contains('minimized') ? 'Expand' : 'Minimize';
      
      // Remove maximized class if minimizing
      if (controlsDialog.classList.contains('minimized')) {
        controlsDialog.classList.remove('maximized');
        maximizeBtn.textContent = '□';
        maximizeBtn.title = 'Maximize';
      }
    });
    
    maximizeBtn.addEventListener('click', function() {
      // Can't maximize if minimized
      if (controlsDialog.classList.contains('minimized')) {
        return;
      }
      
      controlsDialog.classList.toggle('maximized');
      maximizeBtn.textContent = controlsDialog.classList.contains('maximized') ? '❐' : '□';
      maximizeBtn.title = controlsDialog.classList.contains('maximized') ? 'Restore' : 'Maximize';
    });
    
    // Make element draggable
    function makeDraggable(element, handle) {
      let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
      
      if (handle) {
        // If handle is specified, make only the handle move the element
        handle.onmousedown = dragMouseDown;
      } else {
        // Otherwise, move from anywhere inside the element
        element.onmousedown = dragMouseDown;
      }
      
      function dragMouseDown(e) {
        e = e || window.event;
        e.preventDefault();
        
        // Don't drag if minimized or maximized
        if (element.classList.contains('minimized') || element.classList.contains('maximized')) {
          return;
        }
        
        // Get the mouse cursor position at startup
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
      }
      
      function elementDrag(e) {
        e = e || window.event;
        e.preventDefault();
        
        // Calculate the new cursor position
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        
        // Keep dialog within window bounds
        const dialogRect = element.getBoundingClientRect();
        const newTop = (element.offsetTop - pos2);
        const newLeft = (element.offsetLeft - pos1);
        
        // Ensure dialog stays within viewport
        const maxTop = window.innerHeight - 50; // Keep at least title bar visible
        const maxLeft = window.innerWidth - 50;
        
        element.style.top = Math.max(0, Math.min(newTop, maxTop)) + 'px';
        element.style.left = Math.max(0, Math.min(newLeft, maxLeft)) + 'px';
      }
      
      function closeDragElement() {
        // Stop moving when mouse button is released
        document.onmouseup = null;
        document.onmousemove = null;
      }
    }
    
    function updateDebugPanel() {
      if (debugPanel.style.display === 'block') {
        const logs = Logger.getHistory();
        
        debugContent.textContent = logs.map(entry => {
          const time = entry.timestamp.toLocaleTimeString();
          let dataStr = '';
          
          if (entry.data) {
            if (typeof entry.data === 'object') {
              dataStr = `\n  ${JSON.stringify(entry.data, null, 2).replace(/\n/g, '\n  ')}`;
            } else {
              dataStr = `\n  ${entry.data}`;
            }
          }
          
          return `[${entry.level} ${time}] ${entry.message}${dataStr}`;
        }).join('\n\n');
        
        // Auto-scroll to bottom
        debugContent.scrollTop = debugContent.scrollHeight;
      }
    }
    
    // Initialize debug toggle
    debugToggle.addEventListener('click', function() {
      debugPanel.style.display = debugPanel.style.display === 'none' ? 'block' : 'none';
      
      if (debugPanel.style.display === 'block') {
        updateDebugPanel();
        // Schedule updates while panel is visible
        const intervalId = setInterval(updateDebugPanel, 1000);
        debugPanel.dataset.intervalId = intervalId;
      } else if (debugPanel.dataset.intervalId) {
        clearInterval(parseInt(debugPanel.dataset.intervalId));
      }
    });
    
    // Also toggle debug panel with Alt+D
    window.addEventListener('keydown', function(e) {
      if (e.altKey && e.key === 'd') {
        debugToggle.click();
      }
      
      // Toggle controls dialog with Ctrl+H
      if (e.ctrlKey && e.key === 'h') {
        e.preventDefault(); // Prevent browser's history shortcut
        const isVisible = controlsDialog.style.display !== 'none';
        controlsDialog.style.display = isVisible ? 'none' : '';
      }
      
      // Run tests with Ctrl+T
      if (e.ctrlKey && e.key === 't') {
        e.preventDefault(); // Prevent new tab shortcut
        window.testControls();
      }
    });
    
    // Update keyboard shortcuts text
    document.querySelector('.keyboard-shortcuts').textContent = 
      'Press Alt+D to toggle debug panel | Alt+T for test panel | Ctrl+H to toggle controls | Ctrl+T to run tests';
    
    // Set up tab switching
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', function() {
        // Deactivate all tabs and tab contents
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        
        // Activate clicked tab and its content
        tab.classList.add('active');
        const tabId = tab.dataset.tab;
        document.getElementById(tabId).classList.add('active');
      });
    });
    
    // Get form controls
    const numLinesSlider = document.getElementById('numLines');
    const numLinesValue = document.getElementById('numLinesValue');
    const lineThicknessSlider = document.getElementById('lineThickness');
    const lineThicknessValue = document.getElementById('lineThicknessValue');
    const innerRadiusRatioSlider = document.getElementById('innerRadiusRatio');
    const innerRadiusRatioValue = document.getElementById('innerRadiusRatioValue');
    const rotationSlider = document.getElementById('rotation');
    const rotationValue = document.getElementById('rotationValue');
    const canvasRotationSlider = document.getElementById('canvasRotation');
    const canvasRotationValue = document.getElementById('canvasRotationValue');
    const scaleSlider = document.getElementById('scale');
    const scaleValue = document.getElementById('scaleValue');
    const morphProgressSlider = document.getElementById('morphProgress');
    const morphProgressValue = document.getElementById('morphProgressValue');
    const startShapeSelect = document.getElementById('startShape');
    const endShapeSelect = document.getElementById('endShape');
    const centerColorInput = document.getElementById('centerColor');
    const outerColorInput = document.getElementById('outerColor');
    const backgroundColorInput = document.getElementById('backgroundColor');
    const centerColorPreview = document.getElementById('centerColorPreview');
    const outerColorPreview = document.getElementById('outerColorPreview');
    const backgroundColorPreview = document.getElementById('backgroundColorPreview');
    const animateBtn = document.getElementById('animateBtn');
    const resetBtn = document.getElementById('resetBtn');
    const animationSpeedSlider = document.getElementById('animationSpeed');
    const animationSpeedValue = document.getElementById('animationSpeedValue');
    const toggleAnimationDurationInput = document.getElementById('toggleAnimDuration');
    const toggleAnimDurationValue = document.getElementById('toggleAnimDurationValue');
    const saveAsSVGBtn = document.getElementById('saveAsSVG');
    const shareBtn = document.getElementById('shareBtn');
    const canvas = document.getElementById('starburstCanvas');
    const animationModeSelect = document.getElementById('animationMode');
    const multiShapeControls = document.getElementById('multiShapeControls');
    const shapeCheckboxes = document.querySelectorAll('.checkbox-item input[type="checkbox"]');
    
    // New generation strategy controls
    const generationStrategySelect = document.getElementById('generationStrategy');
    const centerStyleSelect = document.getElementById('centerStyle');
    const centerSizeSlider = document.getElementById('centerSize');
    const centerSizeValue = document.getElementById('centerSizeValue');
    const centerGlowSizeSlider = document.getElementById('centerGlowSize');
    const centerGlowSizeValue = document.getElementById('centerGlowSizeValue');
    const centerGlowOpacitySlider = document.getElementById('centerGlowOpacity');
    const centerGlowOpacityValue = document.getElementById('centerGlowOpacityValue');
    const modeSpecificControls = document.getElementById('modeSpecificControls');
    
    // Corner radius control
    const cornerRadiusSlider = document.getElementById('cornerRadius');
    const cornerRadiusValue = document.getElementById('cornerRadiusValue');
    
    // Corner Radius Method Select
    const cornerRadiusMethodSelect = document.getElementById('cornerRadiusMethod');
    
    // Typography controls
    const titleTextInput = document.getElementById('titleText');
    const subtitleTextInput = document.getElementById('subtitleText');
    const fontButtons = document.querySelectorAll('.font-button');
    const fontWeightButtons = document.querySelectorAll('.font-weight-button');
    const textCaseToggle = document.getElementById('textCaseToggle');
    const positionButtons = document.querySelectorAll('.position-button');
    const textSizeSlider = document.getElementById('textSize');
    const textSizeValue = document.getElementById('textSizeValue');
    const charSpacingSlider = document.getElementById('charSpacing');
    const charSpacingValue = document.getElementById('charSpacingValue');
    const lineSpacingSlider = document.getElementById('lineSpacing');
    const lineSpacingValue = document.getElementById('lineSpacingValue');
    const textColorInput = document.getElementById('textColor');
    const textColorPreview = document.getElementById('textColorPreview');
    
    // Typography toolbar
    const typographyToolbar = document.getElementById('typographyToolbar');
    const typographyIcons = document.querySelectorAll('.typography-icon');
    
    // Displacement controls
    const displacementXSlider = document.getElementById('displacementX');
    const displacementXValue = document.getElementById('displacementXValue');
    const displacementYSlider = document.getElementById('displacementY');
    const displacementYValue = document.getElementById('displacementYValue');
    
    // Check if all required elements exist
    function verifyElementsExist() {
      const requiredElements = [
        { id: 'numLines', name: 'Number of Lines slider' },
        { id: 'numLinesValue', name: 'Number of Lines value display' },
        { id: 'lineThickness', name: 'Line Thickness slider' },
        { id: 'innerRadiusRatio', name: 'Inner Radius Ratio slider' },
        { id: 'rotation', name: 'Rotation slider' },
        { id: 'starburstCanvas', name: 'Canvas element' }
      ];
      
      let allFound = true;
      
      requiredElements.forEach(element => {
        const el = document.getElementById(element.id);
        if (!el) {
          Logger.error(`Required element not found: ${element.name} (id: ${element.id})`);
          allFound = false;
        }
      });
      
      return allFound;
    }
    
    // Verify all necessary elements exist
    if (!verifyElementsExist()) {
      const errorMsg = 'Some required UI elements are missing. The application may not function correctly.';
      alert(errorMsg);
      Logger.error(errorMsg);
      return;
    }
    
    if (!canvas) {
      Logger.error('Canvas element not found');
      return;
    }
    
    // Initialize settings
    let settings = {
      numLines: parseInt(numLinesSlider.value),
      lineThickness: parseFloat(lineThicknessSlider.value),
      innerRadiusRatio: parseFloat(innerRadiusRatioSlider.value),
      rotation: parseInt(rotationSlider.value),
      canvasRotation: parseInt(canvasRotationSlider.value),
      scale: parseFloat(scaleSlider.value),
      displacementX: 0,
      displacementY: 0,
      morphProgress: 0,
      startShape: 'triangle',
      endShape: 'circle',
      centerColor: centerColorInput.value,
      outerColor: outerColorInput.value,
      backgroundColor: backgroundColorInput.value,
      animationSpeed: parseFloat(animationSpeedSlider.value),
      animationMode: 'twoShape',
      selectedShapes: ['triangle', 'circle'],
      currentShapeIndex: 0,
      nextShapeIndex: 1,
      generationStrategy: 'starburst',
      centerStyle: 'none',
      centerSize: parseFloat(centerSizeSlider.value),
      centerGlowSize: 0,
      centerGlowOpacity: 0,
      cornerRadius: 0,
      cornerRadiusMethod: 'arc',
      showText: true,
      titleText: 'STARBURST',
      subtitleText: 'geometric designer',
      textSize: 40,
      textColor: '#ffffff',
      fontFamily: 'metropolis',
      fontWeight: 'regular',
      charSpacing: 0,
      lineSpacing: 1.5,
      textPosition: 'center',
      textCase: 'normal',
      concentricLayers: 5,
      concentricSpacing: 0.5,
      gridSize: 5,
      gridStyle: 'square',
      symmetryFactor: 4,
      symmetryType: 'radial',
      fractalDepth: 3,
      fractalScale: 0.5
    };
    
    // Helper function to apply a setting and update the renderer
    function applySetting(key, value, doRender = true) {
      try {
        // Update settings object
        settings[key] = value;
        
        // Update TestManager's reference to settings
        TestManager.setSettings(settings);
        
        // Update renderer with the setting
        if (renderer && doRender) {
          const updateObj = { [key]: value };
          Logger.debug(`Applying setting: ${key} = ${value}`, updateObj);
          renderer.updateOptions(updateObj).render();
        }
        
        // Save to cookies when important settings change
        const importantSettings = [
          'fontFamily', 'textSize', 'textPosition',
          'displacementX', 'displacementY',
          'cornerRadius', 'cornerRadiusMethod',
          'startShape', 'endShape', 'generationStrategy', 'scale'
        ];
        
        if (importantSettings.includes(key)) {
          ConfigManager.saveSettingsToCookies(settings);
        }
        
        return true;
      } catch (error) {
        Logger.error(`Failed to apply setting: ${key}`, error);
        return false;
      }
    }
    
    // Check for settings in URL
    const urlSettings = ConfigManager.parseURLParams();
    if (urlSettings) {
      settings = { ...settings, ...urlSettings };
      
      // Update UI to match URL settings
      if (urlSettings.numLines) numLinesSlider.value = urlSettings.numLines;
      if (urlSettings.lineThickness) lineThicknessSlider.value = urlSettings.lineThickness;
      if (urlSettings.innerRadiusRatio) innerRadiusRatioSlider.value = urlSettings.innerRadiusRatio;
      if (urlSettings.rotation) rotationSlider.value = urlSettings.rotation;
      if (urlSettings.canvasRotation) canvasRotationSlider.value = urlSettings.canvasRotation;
      if (urlSettings.morphProgress) morphProgressSlider.value = urlSettings.morphProgress;
      if (urlSettings.startShape) startShapeSelect.value = urlSettings.startShape;
      if (urlSettings.endShape) endShapeSelect.value = urlSettings.endShape;
      if (urlSettings.centerColor) centerColorInput.value = urlSettings.centerColor;
      if (urlSettings.outerColor) outerColorInput.value = urlSettings.outerColor;
      if (urlSettings.backgroundColor) backgroundColorInput.value = urlSettings.backgroundColor;
      if (urlSettings.animationSpeed) animationSpeedSlider.value = urlSettings.animationSpeed;
      
      // Handle animation mode from URL
      if (urlSettings.animationMode) {
        animationModeSelect.value = urlSettings.animationMode;
        if (urlSettings.animationMode === 'multiShape') {
          multiShapeControls.style.display = 'block';
        }
      }
      
      // Handle selected shapes for multi-shape mode
      if (Array.isArray(urlSettings.selectedShapes) && urlSettings.selectedShapes.length >= 2) {
        // First uncheck all checkboxes
        shapeCheckboxes.forEach(checkbox => {
          checkbox.checked = false;
        });
        
        // Then check only the ones that are in the selectedShapes array
        shapeCheckboxes.forEach(checkbox => {
          if (urlSettings.selectedShapes.includes(checkbox.value)) {
            checkbox.checked = true;
          }
        });
      }
    } else {
      // Check for saved settings in local storage
      const savedSettings = ConfigManager.loadSettings();
      if (savedSettings) {
        settings = { ...settings, ...savedSettings };
        
        // Update UI to match saved settings
        if (savedSettings.numLines) numLinesSlider.value = savedSettings.numLines;
        if (savedSettings.lineThickness) lineThicknessSlider.value = savedSettings.lineThickness;
        if (savedSettings.innerRadiusRatio) innerRadiusRatioSlider.value = savedSettings.innerRadiusRatio;
        if (savedSettings.rotation) rotationSlider.value = savedSettings.rotation;
        if (savedSettings.canvasRotation) canvasRotationSlider.value = savedSettings.canvasRotation;
        if (savedSettings.morphProgress) morphProgressSlider.value = savedSettings.morphProgress;
        if (savedSettings.startShape) startShapeSelect.value = savedSettings.startShape;
        if (savedSettings.endShape) endShapeSelect.value = savedSettings.endShape;
        if (savedSettings.centerColor) centerColorInput.value = savedSettings.centerColor;
        if (savedSettings.outerColor) outerColorInput.value = savedSettings.outerColor;
        if (savedSettings.backgroundColor) backgroundColorInput.value = savedSettings.backgroundColor;
        if (savedSettings.animationSpeed) animationSpeedSlider.value = savedSettings.animationSpeed;
        if (savedSettings.toggleAnimDuration) toggleAnimationDurationInput.value = savedSettings.toggleAnimDuration;
      }
      else {
        // Try loading from cookies
        const cookieSettings = ConfigManager.loadSettingsFromCookies();
        if (cookieSettings) {
          settings = { ...settings, ...cookieSettings };
          
          // Update UI with cookie settings
          if (cookieSettings.startShape) startShapeSelect.value = cookieSettings.startShape;
          if (cookieSettings.endShape) endShapeSelect.value = cookieSettings.endShape;
          if (cookieSettings.scale && scaleSlider) scaleSlider.value = cookieSettings.scale;
          if (cookieSettings.displacementX && displacementXSlider) displacementXSlider.value = cookieSettings.displacementX;
          if (cookieSettings.displacementY && displacementYSlider) displacementYSlider.value = cookieSettings.displacementY;
          if (cookieSettings.cornerRadius && cornerRadiusSlider) cornerRadiusSlider.value = cookieSettings.cornerRadius;
          if (cookieSettings.cornerRadiusMethod && cornerRadiusMethodSelect) cornerRadiusMethodSelect.value = cookieSettings.cornerRadiusMethod;
          
          // Show a status message that settings were restored from cookies
          setTimeout(() => {
            const statusMessage = document.getElementById('statusMessage');
            if (statusMessage) {
              statusMessage.textContent = 'Settings restored from cookies';
              setTimeout(() => {
                statusMessage.textContent = 'Ready';
              }, 2000);
            }
          }, 1000);
        }
      }
    }
    
    // Initialize renderer
    let renderer;
    try {
      renderer = new StarburstRenderer(canvas, ShapeCalculator, settings);
      Logger.info('Renderer initialized successfully');
      
      // Set settings reference in TestManager
      TestManager.setSettings(settings);
      
      // Initialize TestManager with the renderer
      TestManager.initialize(renderer);
    } catch (error) {
      Logger.error('Failed to initialize renderer', error);
      alert('Failed to initialize renderer. Check console for details.');
      return;
    }
    
    // Update UI values
    function updateUIValues() {
      numLinesValue.textContent = settings.numLines;
      lineThicknessValue.textContent = settings.lineThickness.toFixed(1);
      innerRadiusRatioValue.textContent = settings.innerRadiusRatio.toFixed(2);
      rotationValue.textContent = settings.rotation;
      canvasRotationValue.textContent = settings.canvasRotation;
      scaleValue.textContent = settings.scale.toFixed(2);
      morphProgressValue.textContent = settings.morphProgress.toFixed(2);
      animationSpeedValue.textContent = settings.animationSpeed.toFixed(1);
      if (toggleAnimDurationValue && 'toggleAnimDuration' in settings) {
        toggleAnimDurationValue.textContent = settings.toggleAnimDuration.toFixed(1);
      }
      
      // Update displacement value displays
      if (displacementXValue) {
        displacementXValue.textContent = settings.displacementX;
      }
      if (displacementYValue) {
        displacementYValue.textContent = settings.displacementY;
      }
      
      // Update corner radius value display
      if (cornerRadiusValue) {
        cornerRadiusValue.textContent = settings.cornerRadius.toFixed(2);
      }
      
      // New UI values
      centerSizeValue.textContent = settings.centerSize.toFixed(1);
      centerGlowSizeValue.textContent = settings.centerGlowSize;
      centerGlowOpacityValue.textContent = settings.centerGlowOpacity.toFixed(2);
      
      centerColorPreview.style.backgroundColor = settings.centerColor;
      outerColorPreview.style.backgroundColor = settings.outerColor;
      backgroundColorPreview.style.backgroundColor = settings.backgroundColor;
      
      // Update shape selector to match current startShape
      updateShapeSelector(settings.startShape);
    }
    
    // Update the shape selector to highlight the active shape
    function updateShapeSelector(shapeName) {
      shapeIcons.forEach(icon => {
        if (icon.dataset.shape === shapeName) {
          icon.classList.add('active');
        } else {
          icon.classList.remove('active');
        }
      });
      
      // Also update the drop-down selects for backward compatibility
      if (startShapeSelect) {
        startShapeSelect.value = shapeName;
      }
    }
    
    // Update the strategy selector to highlight the active strategy
    function updateStrategySelector(strategyName) {
      strategyIcons.forEach(icon => {
        if (icon.dataset.strategy === strategyName) {
          icon.classList.add('active');
        } else {
          icon.classList.remove('active');
        }
      });
      
      // Also update the drop-down select for backward compatibility
      if (generationStrategySelect) {
        generationStrategySelect.value = strategyName;
      }
    }
    
    // Initial UI update
    updateUIValues();
    
    // Also update strategy selector
    updateStrategySelector(settings.generationStrategy);
    
    // Shape selector click handler
    if (shapeSelector) {
      shapeIcons.forEach(icon => {
        setupControlListener(icon, 'click', () => {
          const shapeName = icon.dataset.shape;
          
          // Set the current shape
          applySetting('startShape', shapeName);
          
          // Update the UI
          updateShapeSelector(shapeName);
          
          // Log the change
          Logger.info(`Shape changed to: ${shapeName}`);
        });
      });
    }
    
    // Strategy selector click handler
    if (strategySelector) {
      strategyIcons.forEach(icon => {
        setupControlListener(icon, 'click', () => {
          const strategyName = icon.dataset.strategy;
          
          // Set the generation strategy
          applySetting('generationStrategy', strategyName);
          
          // Update the UI
          updateStrategySelector(strategyName);
          
          // Also update the dropdown in the dialog
          if (generationStrategySelect) {
            generationStrategySelect.value = strategyName;
          }
          
          // Update mode-specific controls
          updateModeSpecificControls();
          
          // Log the change
          Logger.info(`Generation strategy changed to: ${strategyName}`);
        });
      });
    }
    
    // Initial render
    try {
      renderer.render();
      Logger.info('Initial render completed');
    } catch (error) {
      Logger.error('Initial render failed', error);
      alert('Failed to render the design. Check console for details.');
    }
    
    // Set up event listeners for controls with added error handling
    function setupControlListener(element, eventType, callback) {
      if (!element) {
        Logger.error(`Cannot set up listener: Element not found`);
        return false;
      }
      
      try {
        element.addEventListener(eventType, callback);
        return true;
      } catch (error) {
        Logger.error(`Failed to set up listener for ${element.id || 'unknown'}`, error);
        return false;
      }
    }
    
    // Special handling for line density slider to make it appropriately affect all pattern types
    setupControlListener(numLinesSlider, 'input', () => {
      const value = parseInt(numLinesSlider.value);
      
      // Update settings
      settings.numLines = value;
      
      // Line Density has different meanings for different generation strategies:
      // - For starburst: literal number of lines radiating from center
      // - For concentric: number of concentric rings (divided by 2)
      // - For other patterns: controls detail level
      applySetting('numLines', value);
      
      // Update UI displays
      updateUIValues();
      
      Logger.debug(`Applied Line Density of ${value} to ${settings.generationStrategy} pattern`);
    });
    
    setupControlListener(lineThicknessSlider, 'input', () => {
      const value = parseFloat(lineThicknessSlider.value);
      applySetting('lineThickness', value);
      updateUIValues();
    });
    
    setupControlListener(innerRadiusRatioSlider, 'input', () => {
      const value = parseFloat(innerRadiusRatioSlider.value);
      applySetting('innerRadiusRatio', value);
      updateUIValues();
    });
    
    setupControlListener(rotationSlider, 'input', () => {
      const value = parseInt(rotationSlider.value);
      applySetting('rotation', value);
      updateUIValues();
    });
    
    setupControlListener(canvasRotationSlider, 'input', () => {
      const value = parseInt(canvasRotationSlider.value);
      applySetting('canvasRotation', value);
      updateUIValues();
    });
    
    setupControlListener(morphProgressSlider, 'input', () => {
      const value = parseFloat(morphProgressSlider.value);
      applySetting('morphProgress', value);
      updateUIValues();
    });
    
    setupControlListener(startShapeSelect, 'change', () => {
      applySetting('startShape', startShapeSelect.value);
      updateShapeSelector(startShapeSelect.value);
    });
    
    setupControlListener(endShapeSelect, 'change', () => {
      applySetting('endShape', endShapeSelect.value);
    });
    
    setupControlListener(centerColorInput, 'input', () => {
      applySetting('centerColor', centerColorInput.value);
      updateUIValues();
    });
    
    setupControlListener(outerColorInput, 'input', () => {
      applySetting('outerColor', outerColorInput.value);
      updateUIValues();
    });
    
    setupControlListener(backgroundColorInput, 'input', () => {
      applySetting('backgroundColor', backgroundColorInput.value);
      updateUIValues();
    });
    
    setupControlListener(animationSpeedSlider, 'input', () => {
      const value = parseFloat(animationSpeedSlider.value);
      applySetting('animationSpeed', value);
      updateUIValues();
    });
    
    // Add event listeners for new controls
    setupControlListener(generationStrategySelect, 'change', () => {
      applySetting('generationStrategy', generationStrategySelect.value);
      updateStrategySelector(generationStrategySelect.value);
      updateModeSpecificControls();
    });
    
    setupControlListener(centerStyleSelect, 'change', () => {
      applySetting('centerStyle', centerStyleSelect.value);
    });
    
    setupControlListener(centerSizeSlider, 'input', () => {
      const value = parseFloat(centerSizeSlider.value);
      applySetting('centerSize', value);
      updateUIValues();
    });
    
    setupControlListener(centerGlowSizeSlider, 'input', () => {
      const value = parseFloat(centerGlowSizeSlider.value);
      applySetting('centerGlowSize', value);
      updateUIValues();
    });
    
    setupControlListener(centerGlowOpacitySlider, 'input', () => {
      const value = parseFloat(centerGlowOpacitySlider.value);
      applySetting('centerGlowOpacity', value);
      updateUIValues();
    });
    
    // Animation buttons
    setupControlListener(animateBtn, 'click', () => {
      const isAnimating = renderer.toggleAnimation();
      animateBtn.textContent = isAnimating ? 'Stop Animation' : 'Animate Morph';
    });
    
    setupControlListener(resetBtn, 'click', () => {
      // Stop animation
      renderer.stopAnimation();
      animateBtn.textContent = 'Animate Morph';
      
      // Reset settings to defaults
      settings = {
        numLines: 60,
        lineThickness: 1.5,
        innerRadiusRatio: 0,
        rotation: 0,
        canvasRotation: 0,
        scale: 1,
        displacementX: 0,
        displacementY: 0,
        morphProgress: 0,
        startShape: 'triangle',
        endShape: 'circle',
        centerColor: '#ffffff',
        outerColor: '#aaaaaa',
        backgroundColor: '#000000',
        animationSpeed: 2,
        animationMode: 'twoShape',
        selectedShapes: ['triangle', 'circle'],
        currentShapeIndex: 0,
        nextShapeIndex: 1,
        generationStrategy: 'starburst',
        centerStyle: 'none',
        centerSize: 2,
        centerGlowSize: 0,
        centerGlowOpacity: 0,
        cornerRadius: 0,
        cornerRadiusMethod: 'arc',
        showText: true,
        titleText: 'STARBURST',
        subtitleText: 'geometric designer',
        textSize: 40,
        textColor: '#ffffff',
        fontFamily: 'metropolis',
        fontWeight: 'regular',
        charSpacing: 0,
        lineSpacing: 1.5,
        textPosition: 'center',
        textCase: 'normal',
        concentricLayers: 5,
        concentricSpacing: 0.5,
        gridSize: 5,
        gridStyle: 'square',
        symmetryFactor: 4,
        symmetryType: 'radial',
        fractalDepth: 3,
        fractalScale: 0.5
      };
      
      // Update UI controls
      numLinesSlider.value = settings.numLines;
      lineThicknessSlider.value = settings.lineThickness;
      innerRadiusRatioSlider.value = settings.innerRadiusRatio;
      rotationSlider.value = settings.rotation;
      canvasRotationSlider.value = settings.canvasRotation;
      scaleSlider.value = settings.scale;
      displacementXSlider.value = settings.displacementX;
      displacementYSlider.value = settings.displacementY;
      morphProgressSlider.value = settings.morphProgress;
      startShapeSelect.value = settings.startShape;
      endShapeSelect.value = settings.endShape;
      centerColorInput.value = settings.centerColor;
      outerColorInput.value = settings.outerColor;
      backgroundColorInput.value = settings.backgroundColor;
      animationSpeedSlider.value = settings.animationSpeed;
      animationModeSelect.value = settings.animationMode;
      
      // Update shape selector
      updateShapeSelector(settings.startShape);
      
      // Reset multi-shape mode
      multiShapeControls.style.display = 'none';
      
      // Reset checkboxes
      shapeCheckboxes.forEach(checkbox => {
        checkbox.checked = ['triangle', 'circle'].includes(checkbox.value);
      });
      
      // Update UI and renderer
      updateUIValues();
      renderer.updateOptions(settings).render();
      
      // Show status message
      const statusMessage = document.getElementById('statusMessage');
      if (statusMessage) {
        statusMessage.textContent = 'Settings reset to defaults';
        setTimeout(() => {
          statusMessage.textContent = 'Ready';
        }, 2000);
      }
    });
    
    // Export buttons
    setupControlListener(saveAsSVGBtn, 'click', () => {
      renderer.saveAsSVG();
    });
    
    // Share button
    setupControlListener(shareBtn, 'click', () => {
      try {
        const url = ConfigManager.createShareableURL(settings);
        
        // Try to use clipboard API if available
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(url)
            .then(() => {
              const statusMessage = document.getElementById('statusMessage');
              if (statusMessage) {
                statusMessage.textContent = 'Shareable URL copied to clipboard';
                statusMessage.className = 'status-message success-message';
                setTimeout(() => {
                  statusMessage.className = 'status-message';
                  statusMessage.textContent = 'Ready';
                }, 2000);
              }
            })
            .catch(error => {
              Logger.error('Failed to copy URL to clipboard', error);
              alert(`Shareable URL:\n${url}`);
            });
        } else {
          // Fallback for browsers without clipboard API
          alert(`Shareable URL:\n${url}`);
        }
        
        // Save current settings to local storage
        ConfigManager.saveSettings(settings);
      } catch (error) {
        Logger.error('Failed to create shareable URL', error);
        const statusMessage = document.getElementById('statusMessage');
        if (statusMessage) {
          statusMessage.textContent = 'Failed to create shareable URL';
          statusMessage.className = 'status-message error-message';
          setTimeout(() => {
            statusMessage.className = 'status-message';
            statusMessage.textContent = 'Ready';
          }, 2000);
        }
      }
    });
    
    // Toggle between two-shape and multi-shape modes
    setupControlListener(animationModeSelect, 'change', () => {
      settings.animationMode = animationModeSelect.value;
      
      // Show/hide multi-shape controls
      if (settings.animationMode === 'multiShape') {
        multiShapeControls.style.display = 'block';
        updateSelectedShapes();
      } else {
        multiShapeControls.style.display = 'none';
      }
      
      renderer.updateOptions({ animationMode: settings.animationMode }).render();
      Logger.info('Animation mode changed', { mode: settings.animationMode });
    });
    
    // Function to update mode-specific controls based on selected generation strategy
    function updateModeSpecificControls() {
      // Check if modeSpecificControls element exists
      if (!modeSpecificControls) {
        Logger.warn('modeSpecificControls element not found');
        return;
      }
      
      // Clear previous controls
      modeSpecificControls.innerHTML = '';
      
      // Don't add any mode-specific controls
      // We're using the Basic tab controls for all generation strategies
    }
    
    // Function to collect selected shapes from checkboxes and update settings
    function updateSelectedShapes() {
      settings.selectedShapes = [];
      shapeCheckboxes.forEach(checkbox => {
        if (checkbox.checked) {
          settings.selectedShapes.push(checkbox.value);
        }
      });
      
      // Ensure we have at least 2 shapes selected
      if (settings.selectedShapes.length < 2) {
        // If not enough shapes, select the first two shapes
        const defaultShapes = ['circle', 'star'];
        shapeCheckboxes.forEach(checkbox => {
          if (defaultShapes.includes(checkbox.value)) {
            checkbox.checked = true;
            if (!settings.selectedShapes.includes(checkbox.value)) {
              settings.selectedShapes.push(checkbox.value);
            }
          }
        });
      }
      
      // Reset the morphing indices when shape selection changes
      settings.currentShapeIndex = 0;
      settings.nextShapeIndex = 1;
      
      // Apply settings to renderer
      renderer.updateOptions({ 
        selectedShapes: settings.selectedShapes,
        currentShapeIndex: 0,
        nextShapeIndex: 1,
        morphProgress: 0 // Reset morph progress for smooth start
      }).render();
      
      Logger.debug('Updated selected shapes', { shapes: settings.selectedShapes });
    }
    
    // Add event listeners for shape checkboxes
    shapeCheckboxes.forEach(checkbox => {
      setupControlListener(checkbox, 'change', updateSelectedShapes);
    });
    
    // Periodically save settings to local storage
    setInterval(() => {
      ConfigManager.saveSettings(settings);
    }, 30000); // Every 30 seconds
    
    // Function to automatically register tests for a new feature
    function autoRegisterFeatureTests(tabId) {
      const featureName = tabId.replace('-tab', '');
      const tabElement = document.getElementById(tabId);
      
      if (!tabElement) return;
      
      // Find all controls within this tab
      const controlIds = [];
      const controlElements = tabElement.querySelectorAll('input, select, button');
      controlElements.forEach(element => {
        if (element.id) {
          controlIds.push(element.id);
        }
      });
      
      // Register tests for this feature
      window.registerFeatureTests(featureName, controlIds);
    }
    
    // Auto-register tests for each tab
    const tabs = ['basic-tab', 'shapes-tab', 'colors-tab', 'generation-tab', 'animation-tab'];
    tabs.forEach(autoRegisterFeatureTests);
    
    // Add a feature to auto-register tests when new content is added
    const originalInsertAdjacentHTML = Element.prototype.insertAdjacentHTML;
    Element.prototype.insertAdjacentHTML = function(position, text) {
      // Call the original method
      originalInsertAdjacentHTML.call(this, position, text);
      
      // Check if this is adding controls to a tab
      if (this.id === 'modeSpecificControls') {
        // Find all new control elements
        setTimeout(() => {
          const controlIds = [];
          const newControls = this.querySelectorAll('input, select');
          newControls.forEach(element => {
            if (element.id) {
              controlIds.push(element.id);
            }
          });
          
          // Register tests for these new controls under the generation feature
          window.registerFeatureTests('generation-specific', controlIds);
        }, 100); // Short delay to ensure DOM is updated
      }
    };
    
    // Run all tests when loading is complete
    setTimeout(() => {
      Logger.info('Running automatic test suite at startup');
      window.testControls();
    }, 1000);
    
    // Add scale slider event listener
    setupControlListener(scaleSlider, 'input', () => {
      const value = parseFloat(scaleSlider.value);
      applySetting('scale', value);
      updateUIValues();
    });
    
    // Toggle Animation for Sliders
    const toggleAnimations = {};
    let toggleAnimationDuration = parseFloat(toggleAnimationDurationInput.value) * 1000; // Convert to milliseconds
    
    // Make sure toggleAnimDuration is in settings
    settings.toggleAnimDuration = parseFloat(toggleAnimationDurationInput.value);
    
    // Update the animation duration when the slider changes
    toggleAnimationDurationInput.addEventListener('input', function() {
      const value = parseFloat(this.value);
      // Log exact values for debugging
      Logger.debug(`Toggle Animation Duration changed: raw=${this.value}, parsed=${value}`);
      // Update the setting value
      applySetting('toggleAnimDuration', value);
      // Also update the local variable for animation loops
      toggleAnimationDuration = value * 1000; // Convert to milliseconds
      toggleAnimDurationValue.textContent = value;
    });
    
    // Set up toggle switches for each slider
    document.querySelectorAll('.toggle-switch').forEach(toggle => {
      const container = toggle.closest('.toggle-container');
      if (!container) return;
      
      const sliderId = container.dataset.sliderId;
      if (!sliderId) return;
      
      const slider = document.getElementById(sliderId);
      if (!slider) return;
      
      const valueDisplay = document.getElementById(`${sliderId}Value`);
      const min = parseFloat(slider.min);
      const max = parseFloat(slider.max);
      
      // Setup toggle click event
      toggle.addEventListener('click', function() {
        this.classList.toggle('active');
        this.setAttribute('aria-checked', this.classList.contains('active'));
        
        if (this.classList.contains('active')) {
          // Start animation
          if (toggleAnimations[sliderId]) {
            clearInterval(toggleAnimations[sliderId].interval);
          }
          
          // Set up the animation
          let direction = 1;
          let currentValue = parseFloat(slider.value);
          
          toggleAnimations[sliderId] = {
            interval: setInterval(() => {
              // Calculate new value
              currentValue += direction * (max - min) / (toggleAnimationDuration / 100);
              
              // Check bounds and reverse direction if needed
              if (currentValue >= max) {
                currentValue = max;
                direction = -1;
              } else if (currentValue <= min) {
                currentValue = min;
                direction = 1;
              }
              
              // Update slider and trigger change event
              slider.value = currentValue;
              slider.dispatchEvent(new Event('input'));
              
              // Update value display
              if (valueDisplay) {
                if (Number.isInteger(currentValue)) {
                  valueDisplay.textContent = currentValue.toString();
                } else {
                  valueDisplay.textContent = currentValue.toFixed(2);
                }
              }
            }, 100)
          };
        } else {
          // Stop animation
          if (toggleAnimations[sliderId]) {
            clearInterval(toggleAnimations[sliderId].interval);
            toggleAnimations[sliderId] = null;
          }
        }
      });
      
      // Support keyboard navigation
      toggle.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.click();
        }
      });
    });
    
    // Stop all animations when window loses focus
    window.addEventListener('blur', function() {
      Object.keys(toggleAnimations).forEach(key => {
        if (toggleAnimations[key]) {
          clearInterval(toggleAnimations[key].interval);
          
          const toggle = document.querySelector(`.toggle-container[data-slider-id="${key}"] .toggle-switch`);
          if (toggle) {
            toggle.classList.remove('active');
            toggle.setAttribute('aria-checked', 'false');
          }
          
          toggleAnimations[key] = null;
        }
      });
    });
    
    // Copy test results to clipboard
    copyTestResultsBtn.addEventListener('click', () => {
      // Generate a summary of test results
      let resultText = "=== Starburst Designer Test Results ===\n\n";
      let totalPassed = 0;
      let totalFailed = 0;
      let totalTests = 0;
      
      // Gather results by category
      for (const category in TestManager.tests) {
        let categoryPassed = 0;
        let categoryFailed = 0;
        
        resultText += `Category: ${category}\n`;
        
        for (const testName in TestManager.tests[category]) {
          const resultKey = `${category}.${testName}`;
          const result = TestManager.results[resultKey];
          totalTests++;
          
          if (result) {
            if (result.success) {
              resultText += `✅ ${testName}\n`;
              categoryPassed++;
              totalPassed++;
            } else {
              resultText += `❌ ${testName}: ${result.message}\n`;
              categoryFailed++;
              totalFailed++;
            }
          } else {
            resultText += `⚪ ${testName}: Not run\n`;
          }
        }
        
        resultText += `${category}: ${categoryPassed} passed, ${categoryFailed} failed\n\n`;
      }
      
      // Add summary
      resultText += `=== Summary ===\n`;
      resultText += `Total: ${totalPassed}/${totalTests} tests passed (${totalFailed} failed)\n`;
      resultText += `Pass rate: ${Math.round((totalPassed / Math.max(1, totalTests)) * 100)}%\n`;
      
      // Add current timestamp
      resultText += `\nGenerated: ${new Date().toLocaleString()}\n`;
      
      // Copy to clipboard
      navigator.clipboard.writeText(resultText)
        .then(() => {
          const statusMessage = document.getElementById('statusMessage');
          if (statusMessage) {
            statusMessage.textContent = 'Test results copied to clipboard';
            statusMessage.className = 'status-message success-message';
            setTimeout(() => {
              statusMessage.className = 'status-message';
              statusMessage.textContent = 'Ready';
            }, 2000);
          }
          
          // Also show in debug panel
          if (debugContent) {
            debugContent.textContent = 'Test results copied to clipboard:\n\n' + resultText;
            if (debugPanel.style.display === 'none') {
              debugToggle.click();
            }
          }
        })
        .catch(err => {
          Logger.error('Failed to copy test results', err);
          alert('Failed to copy test results. See console for details.');
        });
    });
    
    // Corner Radius Slider
    setupControlListener(cornerRadiusSlider, 'input', () => {
      const value = parseFloat(cornerRadiusSlider.value);
      applySetting('cornerRadius', value);
      cornerRadiusValue.textContent = value.toFixed(2);
    });
    
    // Corner Radius Method Select
    setupControlListener(cornerRadiusMethodSelect, 'change', () => {
      const method = cornerRadiusMethodSelect.value;
      applySetting('cornerRadiusMethod', method);
      Logger.info('Corner radius method changed', { method });
      
      // Immediately re-render with the new method
      renderer.render();
    });
    
    // Typography controls
    
    // Title text input
    setupControlListener(titleTextInput, 'input', () => {
      applySetting('titleText', titleTextInput.value);
    });
    
    // Subtitle text input
    setupControlListener(subtitleTextInput, 'input', () => {
      applySetting('subtitleText', subtitleTextInput.value);
    });
    
    // Font family buttons
    const handwritingFonts = ['saintdelafield', 'herrvon', 'rougescript'];
    
    fontButtons.forEach(button => {
      setupControlListener(button, 'click', () => {
        // Remove active class from all buttons
        fontButtons.forEach(btn => btn.classList.remove('active'));
        // Add active class to clicked button
        button.classList.add('active');
        
        const fontFamily = button.dataset.font;
        // Apply the font family setting
        applySetting('fontFamily', fontFamily);
        
        // For handwriting fonts, disable case toggling and force lowercase
        const isHandwritingFont = handwritingFonts.includes(fontFamily);
        if (isHandwritingFont) {
          // If case toggle is active, turn it off
          if (textCaseToggle.classList.contains('active')) {
            textCaseToggle.classList.remove('active');
            applySetting('textCase', 'normal');
          }
          // Add disabled styling to case toggle, but don't completely disable
          // since we now allow camelCase for handwriting fonts
          textCaseToggle.classList.add('modified-for-handwriting');
          
          // Update status message
          const statusMessage = document.getElementById('statusMessage');
          if (statusMessage) {
            statusMessage.textContent = 'Title Case enabled for handwriting fonts';
            setTimeout(() => {
              statusMessage.textContent = 'Ready';
            }, 2000);
          }
        } else {
          // Re-enable the case toggle
          textCaseToggle.classList.remove('disabled');
          textCaseToggle.classList.remove('modified-for-handwriting');
        }
      });
    });
    
    // Font weight buttons
    fontWeightButtons.forEach(button => {
      setupControlListener(button, 'click', () => {
        // Remove active class from all buttons
        fontWeightButtons.forEach(btn => btn.classList.remove('active'));
        // Add active class to clicked button
        button.classList.add('active');
        // Apply the font weight setting
        applySetting('fontWeight', button.dataset.weight);
      });
    });
    
    // Text case toggle
    setupControlListener(textCaseToggle, 'click', () => {
      textCaseToggle.classList.toggle('active');
      const isUppercase = textCaseToggle.classList.contains('active');
      applySetting('textCase', isUppercase ? 'uppercase' : 'normal');
    });
    
    // Position buttons
    positionButtons.forEach(button => {
      setupControlListener(button, 'click', () => {
        // Remove active class from all buttons
        positionButtons.forEach(btn => btn.classList.remove('active'));
        // Add active class to clicked button
        button.classList.add('active');
        // Apply the position setting
        applySetting('textPosition', button.dataset.position);
      });
    });
    
    // Text size slider
    setupControlListener(textSizeSlider, 'input', () => {
      const value = parseInt(textSizeSlider.value);
      applySetting('textSize', value);
      textSizeValue.textContent = value;
    });
    
    // Character spacing slider
    setupControlListener(charSpacingSlider, 'input', () => {
      const value = parseFloat(charSpacingSlider.value);
      applySetting('charSpacing', value);
      charSpacingValue.textContent = value.toFixed(2);
    });
    
    // Line spacing slider
    setupControlListener(lineSpacingSlider, 'input', () => {
      const value = parseFloat(lineSpacingSlider.value);
      applySetting('lineSpacing', value);
      lineSpacingValue.textContent = value.toFixed(1);
    });
    
    // Text color input
    setupControlListener(textColorInput, 'input', () => {
      applySetting('textColor', textColorInput.value);
      textColorPreview.style.backgroundColor = textColorInput.value;
    });
    
    // Typography toolbar icons
    typographyIcons.forEach(icon => {
      setupControlListener(icon, 'click', () => {
        const type = icon.dataset.typography;
        
        switch (type) {
          case 'metropolis':
          case 'worksans':
          case 'oswald':
          case 'roboto':
          case 'crimsonpro':
          case 'saintdelafield':
          case 'herrvon':
          case 'rougescript':
            // Handle font family selection
            typographyIcons.forEach(i => {
              if (['metropolis', 'worksans', 'oswald', 'roboto', 'crimsonpro', 'saintdelafield', 'herrvon', 'rougescript'].includes(i.dataset.typography)) {
                i.classList.remove('active');
              }
            });
            icon.classList.add('active');
            applySetting('fontFamily', type);
            
            // Also update the control panel
            fontButtons.forEach(btn => {
              btn.classList.toggle('active', btn.dataset.font === type);
            });
            
            // For handwriting fonts, disable case toggling and force lowercase
            const isHandwritingFont = handwritingFonts.includes(type);
            if (isHandwritingFont) {
              // If case toggle is active, turn it off
              if (textCaseToggle.classList.contains('active')) {
                textCaseToggle.classList.remove('active');
                applySetting('textCase', 'normal');
              }
              // Add disabled styling to case toggle, but don't completely disable
              // since we now allow camelCase for handwriting fonts
              textCaseToggle.classList.add('modified-for-handwriting');
              
              // Update status message
              const statusMessage = document.getElementById('statusMessage');
              if (statusMessage) {
                statusMessage.textContent = 'Title Case enabled for handwriting fonts';
                setTimeout(() => {
                  statusMessage.textContent = 'Ready';
                }, 2000);
              }
            } else {
              // Re-enable the case toggle
              textCaseToggle.classList.remove('disabled');
              textCaseToggle.classList.remove('modified-for-handwriting');
            }
            break;
            
          case 'case':
            // Toggle text case with special handling for handwriting fonts
            if (handwritingFonts.includes(settings.fontFamily)) {
              // For handwriting fonts, toggle between normal and camelCase
              icon.classList.toggle('active');
              const isCamelCase = icon.classList.contains('active');
              applySetting('textCase', isCamelCase ? 'camelcase' : 'normal');
              
              // Update the toggle in control panel
              textCaseToggle.classList.toggle('active', isCamelCase);
              
              // Show message about camelCase for handwriting fonts
              const statusMessage = document.getElementById('statusMessage');
              if (statusMessage) {
                statusMessage.textContent = isCamelCase ? 'Title Case enabled for handwriting' : 'Normal case for handwriting';
                setTimeout(() => {
                  statusMessage.textContent = 'Ready';
                }, 2000);
              }
            } else {
              // Regular handling for non-handwriting fonts
              icon.classList.toggle('active');
              const isUppercase = icon.classList.contains('active');
              applySetting('textCase', isUppercase ? 'uppercase' : 'normal');
              
              // Update the toggle in control panel
              textCaseToggle.classList.toggle('active', isUppercase);
            }
            break;
            
          case 'position':
            // Cycle through positions: center -> top -> bottom -> vertical -> center
            const positions = ['center', 'top', 'bottom', 'vertical'];
            let currentIndex = positions.indexOf(settings.textPosition);
            const nextIndex = (currentIndex + 1) % positions.length;
            const nextPosition = positions[nextIndex];
            
            applySetting('textPosition', nextPosition);
            
            // Update position buttons in control panel
            positionButtons.forEach(btn => {
              btn.classList.toggle('active', btn.dataset.position === nextPosition);
            });
            break;
        }
      });
    });
    
    // Displacement X slider
    setupControlListener(displacementXSlider, 'input', () => {
      const value = parseInt(displacementXSlider.value);
      applySetting('displacementX', value);
      displacementXValue.textContent = value;
    });
    
    // Displacement Y slider
    setupControlListener(displacementYSlider, 'input', () => {
      const value = parseInt(displacementYSlider.value);
      applySetting('displacementY', value);
      displacementYValue.textContent = value;
    });
  });