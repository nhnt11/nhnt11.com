// Journey - state machine for the dream experience

const Journey = (function() {
  // Section definitions
  const sections = [
    {
      id: 'intro',
      text: 'dream',
      blob: { mood: 'curious', behavior: 'emerge' }
    },
    {
      id: 'believe',
      text: 'believe',
      blob: { mood: 'curious' }
    },
    {
      id: 'endeavor',
      text: 'endeavor',
      blob: { mood: 'purposeful' }
    },
    {
      id: 'desire',
      text: 'desire',
      blob: { mood: 'searching' }
    },
    {
      id: 'reprise',
      text: 'dream',
      revealText: 'something worth dying for',
      blob: { mood: 'peaceful', behavior: 'focus' }
    },
    {
      id: 'conclusion',
      text: "let's build our dreams together",
      blob: { mood: 'peaceful', behavior: 'presence' }
    }
  ];

  // State
  let currentSectionIndex = 0;
  let currentSubsectionIndex = 0;
  let transitioning = false;
  let transitionHandlers = [];

  // DOM elements
  let sectionElements = {};
  let dreamOverlay = null;

  // Timing
  const TRANSITION_DURATION = 2200; // Accounts for two-phase text transitions

  function getCurrentSection() {
    return sections[currentSectionIndex];
  }

  function getCurrentSubsection() {
    const section = getCurrentSection();
    if (section.subsections) {
      return section.subsections[currentSubsectionIndex];
    }
    return null;
  }

  function getCurrentBlobConfig() {
    const subsection = getCurrentSubsection();
    if (subsection) {
      return subsection.blob;
    }
    return getCurrentSection().blob;
  }

  function canAdvance() {
    if (transitioning) return false;

    const section = getCurrentSection();

    // If section has subsections, check if we're at the end
    if (section.subsections) {
      if (currentSubsectionIndex < section.subsections.length - 1) {
        return true;
      }
    }

    // Check if there's another main section
    return currentSectionIndex < sections.length - 1;
  }

  // Timing for two-phase text transitions
  const TEXT_TRANSITION_GAP = 400; // Pause between hide and reveal

  function advance() {
    if (!canAdvance()) return false;

    const section = getCurrentSection();
    const prevSection = section.id;
    let prevSubsection = null;

    // Start transition
    transitioning = true;

    // Special case: desire → reprise should be instant black (no glitch delay)
    // The blob despawn fragments will be visible on the black background
    const isDesireToReprise = section.id === 'desire';

    // Text sections use two-phase glitch (hide current, pause, reveal new)
    const textSections = ['intro', 'believe', 'endeavor'];
    const isTextTransition = textSections.includes(section.id);

    if (isDesireToReprise) {
      // Instant transition to black - no glitch
      currentSubsectionIndex = 0;
      currentSectionIndex++;

      const newSection = getCurrentSection();
      const blobConfig = getCurrentBlobConfig();
      if (typeof Blob !== 'undefined' && blobConfig) {
        Blob.setMood(blobConfig.mood);
      }

      // Update DOM immediately (shows black)
      updateDOM();
    } else if (isTextTransition && typeof Glitch !== 'undefined') {
      // Two-phase transition: glitch out → pause → glitch in
      // Phase 1: Glitch to hide current text
      Glitch.triggerHeavy(() => {
        // Hide current section mid-glitch
        const currentEl = sectionElements[section.id];
        if (currentEl) currentEl.classList.remove('active');
      });

      // Phase 2: After pause, glitch to reveal new text
      setTimeout(() => {
        // Advance state
        if (section.subsections && currentSubsectionIndex < section.subsections.length - 1) {
          prevSubsection = section.subsections[currentSubsectionIndex].id;
          currentSubsectionIndex++;
        } else {
          currentSubsectionIndex = 0;
          currentSectionIndex++;
        }

        const newSection = getCurrentSection();
        const newSubsection = getCurrentSubsection();

        // Update blob mood
        const blobConfig = getCurrentBlobConfig();
        if (typeof Blob !== 'undefined' && blobConfig) {
          Blob.setMood(blobConfig.mood);
        }

        // Notify handlers
        const event = {
          from: { section: prevSection, subsection: prevSubsection },
          to: {
            section: newSection.id,
            subsection: newSubsection ? newSubsection.id : null
          },
          blobConfig: blobConfig
        };
        transitionHandlers.forEach(fn => fn(event));

        // Glitch to reveal new text
        Glitch.triggerHeavy(() => {
          // Show new section mid-glitch
          const newEl = sectionElements[newSection.id];
          if (newEl) newEl.classList.add('active');

          // Set blob behavior for new section
          if (typeof Blob !== 'undefined') {
            Blob.setShouldDespawn(newSection.id === 'desire');
            Blob.setDespawnLingerTime(newSection.id === 'desire' ? 1.2 : 0);
          }
        });
      }, 800 + TEXT_TRANSITION_GAP); // 800ms for first glitch + gap
    } else if (typeof Glitch !== 'undefined') {
      // Normal transition with heavy glitch (for non-text sections)
      Glitch.triggerHeavy(() => {
        // This fires mid-glitch - do the actual section change here
        if (section.subsections && currentSubsectionIndex < section.subsections.length - 1) {
          prevSubsection = section.subsections[currentSubsectionIndex].id;
          currentSubsectionIndex++;
        } else {
          currentSubsectionIndex = 0;
          currentSectionIndex++;
        }

        const newSection = getCurrentSection();
        const newSubsection = getCurrentSubsection();

        // Update blob mood
        const blobConfig = getCurrentBlobConfig();
        if (typeof Blob !== 'undefined' && blobConfig) {
          Blob.setMood(blobConfig.mood);
        }

        // Notify handlers
        const event = {
          from: { section: prevSection, subsection: prevSubsection },
          to: {
            section: newSection.id,
            subsection: newSubsection ? newSubsection.id : null
          },
          blobConfig: blobConfig
        };

        transitionHandlers.forEach(fn => fn(event));

        // Update DOM
        updateDOM();
      });
    } else {
      // Fallback if Glitch not available
      if (section.subsections && currentSubsectionIndex < section.subsections.length - 1) {
        prevSubsection = section.subsections[currentSubsectionIndex].id;
        currentSubsectionIndex++;
      } else {
        currentSubsectionIndex = 0;
        currentSectionIndex++;
      }
      updateDOM();
    }

    // For reprise, blob spawns later after "something worth dying for" appears (handled in updateDOM)
    // For other sections, blob uses burst animation which reforms automatically - no respawn needed

    // End transition after duration
    setTimeout(() => {
      transitioning = false;
    }, TRANSITION_DURATION);

    return true;
  }

  function onTransition(fn) {
    transitionHandlers.push(fn);
  }

  function getSections() {
    return sections.map(s => ({
      id: s.id,
      subsections: s.subsections ? s.subsections.map(sub => sub.id) : null
    }));
  }

  function getProgress() {
    // Calculate overall progress through the journey
    let totalSteps = 0;
    let currentStep = 0;

    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      const steps = section.subsections ? section.subsections.length : 1;

      if (i < currentSectionIndex) {
        currentStep += steps;
      } else if (i === currentSectionIndex) {
        currentStep += currentSubsectionIndex;
      }

      totalSteps += steps;
    }

    return {
      current: currentStep,
      total: totalSteps,
      percent: currentStep / totalSteps
    };
  }

  function cacheDOMElements() {
    // Cache section elements (including reprise which is outside dream-overlay)
    document.querySelectorAll('[data-section]').forEach(el => {
      const id = el.dataset.section;
      sectionElements[id] = el;
    });

    dreamOverlay = document.querySelector('.dream-overlay');
  }

  function updateDOM() {
    const currentSection = getCurrentSection();
    const isBlackPhase = currentSection.id === 'reprise' || currentSection.id === 'conclusion';

    // Hide dream-overlay during black phase, show it otherwise
    if (isBlackPhase) {
      dreamOverlay.classList.add('hidden');
    } else {
      dreamOverlay.classList.remove('hidden');
    }

    // Reset reprise/conclusion visibility states when not in those sections
    if (!isBlackPhase) {
      const repriseContainer = sectionElements['reprise']?.querySelector('.reprise-text');
      const conclusionWord = sectionElements['conclusion']?.querySelector('.journey-word');
      if (repriseContainer) {
        repriseContainer.classList.remove('visible');
        repriseContainer.removeAttribute('data-text-size');
        // Clear all text elements
        repriseContainer.querySelectorAll('.dream-parallax, .dream-slice').forEach(el => {
          el.textContent = '';
          if (el.classList.contains('dream-slice')) {
            el.setAttribute('data-text', '');
          }
        });
      }
      if (conclusionWord) conclusionWord.classList.remove('visible');
    }

    // Update section visibility
    Object.keys(sectionElements).forEach(id => {
      const el = sectionElements[id];
      if (id === currentSection.id) {
        el.classList.add('active');
      } else {
        // Keep reprise visible during conclusion transition, then hide after
        if (id === 'reprise' && currentSection.id === 'conclusion') {
          setTimeout(() => {
            el.classList.remove('active');
          }, 2000); // Hide after conclusion has faded in
        } else {
          el.classList.remove('active');
        }
      }
    });

    // Special handling for reprise - sequence of text glitches then blob spawn
    if (currentSection.id === 'reprise') {
      const container = sectionElements['reprise'].querySelector('.reprise-text');

      // Helper to update all text elements in the container
      function setRepriseText(text, isLong = false) {
        if (!container) return;
        // Set size attribute for CSS
        container.setAttribute('data-text-size', isLong ? 'long' : 'short');
        // Update parallax layers
        container.querySelectorAll('.dream-parallax').forEach(el => {
          el.textContent = text;
        });
        // Update slices (both content and data-text attribute for ::before)
        container.querySelectorAll('.dream-slice').forEach(el => {
          el.textContent = text;
          el.setAttribute('data-text', text);
        });
      }

      if (container) {
        // Step 1: After blackness lingers, glitch in "dream"
        setTimeout(() => {
          if (typeof Glitch !== 'undefined') {
            Glitch.triggerHeavy(() => {
              setRepriseText('dream');
              container.classList.add('visible');
            });
          } else {
            setRepriseText('dream');
            container.classList.add('visible');
          }
        }, 2500);

        // Step 2: Glitch to "something worth living for"
        setTimeout(() => {
          if (typeof Glitch !== 'undefined') {
            Glitch.triggerHeavy(() => {
              setRepriseText('something worth living for', true);
            });
          } else {
            setRepriseText('something worth living for', true);
          }
        }, 5000);

        // Step 3: Glitch to "something worth dying for"
        setTimeout(() => {
          if (typeof Glitch !== 'undefined') {
            Glitch.triggerHeavy(() => {
              setRepriseText('something worth dying for', true);
            });
          } else {
            setRepriseText('something worth dying for', true);
          }

          // Step 4: Spawn blob after final text appears
          if (typeof Blob !== 'undefined') {
            setTimeout(() => {
              Blob.setFragmentMultiplier(12); // 18 * 12 = 216 fragments
              Blob.setInteractiveSpawn(true); // Fragments spawn as mouse moves
              Blob.setShouldExpand(true); // Auto-expands when fully built
              Blob.setRadiusMultiplier(2); // 2x bigger blob
              Blob.respawn();
            }, 500);
          }
        }, 7500);
      }
    }

    // Special handling for conclusion - glitch in text on white screen
    if (currentSection.id === 'conclusion') {
      const wordEl = sectionElements['conclusion'].querySelector('.journey-word');

      if (wordEl) {
        // Glitch the text into existence on the white screen
        setTimeout(() => {
          if (typeof Glitch !== 'undefined') {
            Glitch.triggerHeavy(() => {
              wordEl.classList.add('visible');
            });
          } else {
            wordEl.classList.add('visible');
          }
        }, 500); // Short delay after white screen
      }
    }

    // Set blob behavior based on section
    if (typeof Blob !== 'undefined') {
      Blob.setShouldDespawn(currentSection.id === 'desire');
      // Set linger time for desire so fragments are visible on black before evaporating
      Blob.setDespawnLingerTime(currentSection.id === 'desire' ? 1.2 : 0);
      // Reset expand mode, fragment multiplier, interactive spawn, and radius when not in reprise
      if (currentSection.id !== 'reprise') {
        Blob.setShouldExpand(false);
        Blob.setFragmentMultiplier(1);
        Blob.setInteractiveSpawn(false);
        Blob.setRadiusMultiplier(1);
      }
    }
  }

  function init() {
    cacheDOMElements();

    // Wire up blob click to advance
    if (typeof Blob !== 'undefined') {
      Blob.onBlobClick(() => {
        advance();
      });
    }

    // Set initial blob mood
    const blobConfig = getCurrentBlobConfig();
    if (typeof Blob !== 'undefined' && blobConfig) {
      // Wait for blob to emerge before setting mood
      setTimeout(() => {
        Blob.setMood(blobConfig.mood);
      }, 6000);
    }

  }

  function jumpTo(sectionId) {
    // Find the section index
    const index = sections.findIndex(s => s.id === sectionId);
    if (index === -1) {
      console.log('Unknown section. Available:', sections.map(s => s.id).join(', '));
      return false;
    }

    // Use heavy glitch for transition
    if (typeof Glitch !== 'undefined') {
      Glitch.triggerHeavy(() => {
        // Jump mid-glitch
        currentSectionIndex = index;
        currentSubsectionIndex = 0;

        // Update blob
        const blobConfig = getCurrentBlobConfig();
        if (typeof Blob !== 'undefined' && blobConfig) {
          Blob.setMood(blobConfig.mood);
          // Reset blob behavior flags when jumping
          Blob.setShouldDespawn(false);
          Blob.setShouldExpand(false);
          Blob.setFragmentMultiplier(1);
          Blob.setInteractiveSpawn(false);
          Blob.setRadiusMultiplier(1);
          Blob.setDespawnLingerTime(0);
        }

        // Update DOM
        updateDOM();
      });
    } else {
      // Fallback without glitch
      currentSectionIndex = index;
      currentSubsectionIndex = 0;
      if (typeof Blob !== 'undefined') {
        Blob.setShouldDespawn(false);
        Blob.setShouldExpand(false);
        Blob.setFragmentMultiplier(1);
        Blob.setInteractiveSpawn(false);
        Blob.setRadiusMultiplier(1);
        Blob.setDespawnLingerTime(0);
      }
      updateDOM();
    }

    console.log('Jumped to:', sectionId);
    return true;
  }

  return {
    init,
    advance,
    canAdvance,
    onTransition,
    getCurrentSection,
    getCurrentSubsection,
    getCurrentBlobConfig,
    getSections,
    getProgress,
    jumpTo
  };
})();
