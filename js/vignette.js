// Dynamic shadows around text that respond to content size

const Vignette = (function() {
  let nameContainer, navLinks, vignetteTL, vignetteBR;

  function update() {
    const padding = LAYOUT.vignettePadding;
    const nameRect = nameContainer.getBoundingClientRect();
    const navRect = navLinks.getBoundingClientRect();

    // Top-left vignette: double size so center sits at corner
    const tlWidth = (nameRect.width + nameRect.left + padding) * 2;
    const tlHeight = (nameRect.height + nameRect.top + padding) * 2;
    vignetteTL.style.width = tlWidth + 'px';
    vignetteTL.style.height = tlHeight + 'px';
    vignetteTL.style.top = '0';
    vignetteTL.style.left = '0';

    // Bottom-right vignette: double size so center sits at corner
    const brWidth = (navRect.width + (window.innerWidth - navRect.right) + padding) * 2;
    const brHeight = (navRect.height + (window.innerHeight - navRect.bottom) + padding) * 2;
    vignetteBR.style.width = brWidth + 'px';
    vignetteBR.style.height = brHeight + 'px';
    vignetteBR.style.bottom = '0';
    vignetteBR.style.right = '0';
  }

  function init(elements) {
    nameContainer = elements.nameContainer;
    navLinks = elements.navLinks;
    vignetteTL = elements.vignetteTL;
    vignetteBR = elements.vignetteBR;

    update();
    window.addEventListener('resize', update);
  }

  return { init, update };
})();
