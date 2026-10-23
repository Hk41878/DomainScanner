(() => {
  const app=window.ScannerApp; const {domainInput,extensionSelect,includeLetters,includeNumbers}=app.dom;
  domainInput.addEventListener("input",()=>{if(app.scanning)return;app.selectedPositions.clear();window.ScanResults.reset();window.ScanTimer.reset();app.renderCharacterButtons();});
  extensionSelect.addEventListener("change",()=>{if(app.scanning)return;window.ScanResults.reset();window.ScanTimer.reset();app.updateButton();});
  app.enteredRadio.addEventListener("change",()=>{if(app.scanning||!app.enteredRadio.checked)return;app.startMode="entered";app.updateButton();});
  app.firstRadio.addEventListener("change",()=>{if(app.scanning||!app.firstRadio.checked)return;app.startMode="first";app.updateButton();});
  includeLetters.addEventListener("change",app.updateButton); includeNumbers.addEventListener("change",app.updateButton);
  app.renderCharacterButtons(); app.updateActionButtons();
})();
