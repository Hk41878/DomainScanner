(() => {
  const app=window.ScannerApp; const {domainInput,characterSelector,scanButton,progressBox,extensionSelect,pauseButton,playButton,resetButton}=app.dom;
  app.updateStartOptions=function(){
    const name=app.getBaseName(), extension=extensionSelect.value.toLowerCase(), characters=app.getCharacters(), positions=[...app.selectedPositions].sort((a,b)=>a-b);
    const canChoose=Boolean(name&&characters&&positions.length&&app.isValidName(name));
    app.enteredRadio.disabled=app.scanning||!canChoose; app.firstRadio.disabled=app.scanning||!canChoose;
    const enteredName=name?`${name}.${extension}`:"your-domain.com";
    const firstName=name&&characters&&positions.length?`${app.getStartingName(name,characters,positions)}.${extension}`:"first-combination.com";
    app.enteredText.textContent=`Entered domain (${enteredName}) — continue forward from your current characters.`;
    app.firstText.textContent=`First combination (${firstName}) — start selected positions from "${characters[0]||"a"}".`;
    app.startHint.textContent=app.startMode==="entered"?"The entered domain is checked first. Scanning then continues forward without restarting from earlier combinations.":"Selected positions start at the first character in your chosen set, then scan forward through the combinations.";
    app.enteredRadio.checked=app.startMode==="entered"; app.firstRadio.checked=app.startMode==="first";
  };
  app.updateButton=function(){const count=app.getTotal(); scanButton.textContent=`Auto Check ${count.toLocaleString()}`; scanButton.disabled=app.scanning||!count||!app.isValidName(app.getBaseName()); app.updateStartOptions();};
  app.updateActionButtons=function(){pauseButton.disabled=!app.scanning||app.paused; playButton.disabled=!app.scanning||!app.paused; resetButton.disabled=!app.scanning;};
  app.renderCharacterButtons=function(){
    const name=app.getBaseName(); characterSelector.replaceChildren();
    app.selectedPositions=new Set([...app.selectedPositions].filter(index=>index<name.length));
    if(!name){const hint=document.createElement("p"); hint.className="selector-hint"; hint.textContent="Enter a domain name to select characters."; characterSelector.appendChild(hint); app.updateButton(); return;}
    [...name].forEach((character,index)=>{const button=document.createElement("button"); button.type="button"; button.className="char-button"; button.textContent=character; button.setAttribute("aria-pressed","false"); button.setAttribute("aria-label",`Select ${character} at position ${index+1}`);
      const syncButton=()=>{const active=app.selectedPositions.has(index); button.classList.toggle("selected",active); button.setAttribute("aria-pressed",String(active));};
      button.addEventListener("click",()=>{if(app.scanning)return; if(app.selectedPositions.has(index))app.selectedPositions.delete(index); else app.selectedPositions.add(index); syncButton(); app.updateButton(); const count=app.getTotal(); progressBox.textContent=count?`${app.selectedPositions.size} position(s) selected. ${count.toLocaleString()} combinations.`:"Select character positions and a–z or 0–9.";});
      syncButton(); characterSelector.appendChild(button);
    }); app.updateButton(); progressBox.textContent="Select one or more character positions.";
  };
})();
