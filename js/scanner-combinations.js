(() => {
  const app = window.ScannerApp;
  app.getCharacters = function () { let chars = ""; if (app.dom.includeLetters.checked) chars += app.LETTERS; if (app.dom.includeNumbers.checked) chars += app.NUMBERS; return chars; };
  app.getStartingName = function (name, characters, positions) { const chars = [...name]; if (app.startMode === "first" && characters.length) positions.forEach(position => { chars[position] = characters[0]; }); return chars.join(""); };
  app.getTotal = function () {
    const name = app.getBaseName(), characters = app.getCharacters(), positions = [...app.selectedPositions].sort((a,b)=>a-b);
    if (!name || !characters || !positions.length) return 0;
    const combinations = characters.length ** positions.length; if (app.startMode === "first") return combinations;
    const indices = positions.map(position => characters.indexOf([...name][position]));
    if (indices.some(index => index < 0)) return combinations + 1;
    let rank = 0; indices.forEach(index => { rank = rank * characters.length + index; }); return combinations - rank;
  };
  app.generateVariants = function* (name, positions, characters) {
    const chars = [...name];
    if (app.startMode === "first") {
      positions.forEach(position => { chars[position] = characters[0]; }); const indices = positions.map(() => 0);
      while (true) { yield chars.join(""); let carry = true;
        for (let i=positions.length-1; i>=0 && carry; i--) { indices[i]++; if (indices[i]>=characters.length) indices[i]=0; else carry=false; }
        if (carry) return; positions.forEach((position,i)=>{ chars[position]=characters[indices[i]]; });
      }
    }
    yield name; const original = [...name], indices = positions.map(position => characters.indexOf(original[position]));
    if (indices.some(index => index < 0)) {
      const working=[...name]; function* build(depth) { if (depth===positions.length) { yield working.join(""); return; }
        const position=positions[depth]; for (const character of characters) { working[position]=character; yield* build(depth+1); } working[position]=original[position]; }
      yield* build(0); return;
    }
    while (true) { let carry=true;
      for (let i=positions.length-1; i>=0 && carry; i--) { indices[i]++; if (indices[i]>=characters.length) indices[i]=0; else carry=false; }
      if (carry) return; positions.forEach((position,i)=>{ chars[position]=characters[indices[i]]; }); yield chars.join("");
    }
  };
})();
