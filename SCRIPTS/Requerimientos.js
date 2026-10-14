// ==UserScript==
// @name         Requerimientos
// @namespace    http://tampermonkey.net/
// @version      4.0
// @description  Barra Superior + Lector PDF + Llenado Automático de REQs (Anti-Crashes)
// @updateURL    https://gist.github.com/wildersican/b7384e89ba403177a35af28b6c5e261f/raw/modulo-y-llenado-requerimientos.user.js
// @downloadURL  https://gist.github.com/wildersican/b7384e89ba403177a35af28b6c5e261f/raw/modulo-y-llenado-requerimientos.user.js
// @match        *://tips-amer.intertek.com/Transactions/testpiecereq_xml.aspx*
// @require      https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const pdfjsLib = window['pdfjs-dist/build/pdf'];
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

    setTimeout(() => {
        const btnStyle = `color: white; border: none; border-radius: 4px; padding: 4px 10px; font-size: 12px; cursor: pointer; font-weight: bold; height: 26px; box-shadow: 0px 2px 4px rgba(0,0,0,0.3);`;

        // 1. BARRA SUPERIOR
        const topBar = document.createElement('div');
        topBar.style.cssText = `position: fixed; top: 0; left: 0; width: 100%; z-index: 99999; background-color: #e9ecef; padding: 8px 15px; box-shadow: 0px 2px 6px rgba(0,0,0,0.3); border-bottom: 1px solid #ccc; display: flex; gap: 15px; align-items: center; font-family: Arial, sans-serif; font-size: 12px; justify-content: center; flex-wrap: wrap;`;

        const titleBar = document.createElement('span'); titleBar.innerHTML = '⚙️ <b>Datos:</b>'; topBar.appendChild(titleBar);

        const wrapperSubida = document.createElement('div'); wrapperSubida.style.cssText = "display: flex; align-items: center; gap: 5px;";
        const lblSubirPDF = document.createElement('label'); lblSubirPDF.innerHTML = '📄 Subir PDF'; lblSubirPDF.style.cssText = "padding: 4px 10px; font-size: 11px; border-radius: 4px; background-color: #6f42c1; color: white; cursor: pointer; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.2); margin: 0;";
        const fileInput = document.createElement('input'); fileInput.type = 'file'; fileInput.accept = 'application/pdf'; fileInput.style.display = 'none';
        const txtEstado = document.createElement('span'); txtEstado.style.cssText = "font-size: 11px; color: #555; font-style: italic; width: 60px;";
        lblSubirPDF.appendChild(fileInput); wrapperSubida.appendChild(lblSubirPDF); wrapperSubida.appendChild(txtEstado); topBar.appendChild(wrapperSubida);

        const txtPegarInput = document.createElement('input'); txtPegarInput.type = 'text'; txtPegarInput.placeholder = '📋 Pegar texto (Plan B)...'; txtPegarInput.style.cssText = "width: 140px; padding: 2px 5px; font-size: 11px; border-radius: 4px; border: 1px solid #6f42c1; height: 24px; margin-right: 5px; background-color: #fff;"; topBar.appendChild(txtPegarInput);

        function addTopInput(id, labelTxt, type, options = []) {
            const wrapper = document.createElement('div'); wrapper.id = id + '_wrapper'; wrapper.style.cssText = "display: flex; align-items: center; gap: 5px;";
            const lbl = document.createElement('label'); lbl.innerText = labelTxt; lbl.style.cssText = "font-weight:bold; color:#333;"; wrapper.appendChild(lbl);
            let el;
            if (type === 'select') { el = document.createElement('select'); options.forEach(opt => { let o = document.createElement('option'); o.value = opt.val; o.innerText = opt.text; el.appendChild(o); }); }
            else { el = document.createElement('input'); el.type = 'text'; el.placeholder = options; el.style.width = '70px'; }
            el.id = id; el.style.cssText += "padding: 2px 5px; font-size: 11px; border-radius: 4px; border: 1px solid #ccc; height: 24px;";
            const valorGuardado = localStorage.getItem('intertek_' + id); if (valorGuardado !== null) el.value = valorGuardado;
            const guardarValor = () => { localStorage.setItem('intertek_' + id, el.value); }; el.addEventListener('input', guardarValor); el.addEventListener('change', guardarValor);
            wrapper.appendChild(el); topBar.appendChild(wrapper);
        }

        addTopInput('varEdad', 'Edad:', 'select', [{val:'Adult/Kid', text:'Adult / Kid'}, {val:'Baby', text:'Baby'}]); addTopInput('varWeight', 'Weight:', 'text', 'Ej: 145'); addTopInput('varFiber', 'Fiber:', 'select', [{val:'', text:'-Select-'}, {val:'Natural', text:'Natural'}, {val:'Regenerated Cellulose', text:'Regen. Cellulose'}, {val:'Synthetic', text:'Synthetic'}]); addTopInput('varFiberComp', 'Comp:', 'text', 'Ej: 100% Cotton'); addTopInput('varBrand', 'Brand:', 'select', [{val:'', text:'-Select-'}, {val:'Old Navy', text:'Old Navy'}, {val:'Others', text:'Others'}]); addTopInput('varType', 'Type:', 'select', [{val:'', text:'-Select-'}, {val:'Top', text:'Top'}, {val:'Bottom', text:'Bottom'}]); addTopInput('varShrinkage', 'Shrinkage:', 'select', [{val:'', text:'-Select-'}, {val:'Preshrunk', text:'Preshrunk'}, {val:'Non-Preshrunk', text:'Non-Preshrunk'}]); addTopInput('varConst', 'Const:', 'select', [{val:'', text:'-Select-'}, {val:'Jersey', text:'Jersey'}, {val:'1x1 Rib', text:'1x1 Rib'}, {val:'2x2 Rib', text:'2x2 Rib'}, {val:'Fleece', text:'Fleece'}, {val:'Waffle', text:'Waffle'}, {val:'Mesh', text:'Mesh'}, {val:'French Terry', text:'French Terry'}]); addTopInput('varYarnSizeReq', 'Yarn Size:', 'select', [{val:'-', text:'-'}, {val:'26 S/1', text:'26 S/1'}, {val:'30 S/1', text:'30 S/1'}, {val:'20 S/1', text:'20 S/1'}]); addTopInput('varIron', 'Iron:', 'select', [{val:'', text:'-Select-'}, {val:'Cool Iron', text:'Cool Iron'}, {val:'Warm Iron', text:'Warm Iron'}, {val:'Do Not Iron', text:'Do Not Iron'}]);

        document.body.appendChild(topBar);

        // 2. PANEL INFERIOR DERECHO
        const panelDer = document.createElement('div'); panelDer.style.cssText = `position: fixed; bottom: 30px; right: 30px; z-index: 99999; display: flex; gap: 10px; align-items: center;`;

        const btnData = document.createElement('button'); btnData.innerText = 'DATA'; btnData.style.cssText = btnStyle + "background-color: #17a2b8;";
        const btnPiece = document.createElement('button'); btnPiece.innerText = 'Sig. Piece'; btnPiece.style.cssText = btnStyle + "background-color: #17a2b8;";

        const espacioPdf = document.createElement('div'); espacioPdf.id = 'espacio-boton-pdf'; espacioPdf.style.width = '85px'; espacioPdf.style.display = 'flex'; espacioPdf.style.justifyContent = 'center';

        const btnLlenar = document.createElement('button'); btnLlenar.innerText = "REQ's"; btnLlenar.style.cssText = btnStyle + "background-color: #28a745;";
        const btnTest = document.createElement('button'); btnTest.innerText = 'Sig. Test'; btnTest.style.cssText = btnStyle + "background-color: #17a2b8;";

        panelDer.appendChild(btnData); panelDer.appendChild(btnPiece); panelDer.appendChild(espacioPdf); panelDer.appendChild(btnLlenar); panelDer.appendChild(btnTest);
        document.body.appendChild(panelDer);

        // 3. FUNCIONES AUXILIARES
        function triggerEvents(element) { element.dispatchEvent(new Event('input', { bubbles: true })); element.dispatchEvent(new Event('change', { bubbles: true })); element.dispatchEvent(new Event('blur', { bubbles: true })); }
        function getNativeSelects() { return Array.from(document.querySelectorAll('select')).filter(sel => !sel.id.startsWith('var')); }
        function getTestDropdown() { const selects = getNativeSelects(); for (let i = 0; i < selects.length; i++) { let sel = selects[i]; if (sel.options && sel.options.length > 0) { for (let j = 0; j < Math.min(sel.options.length, 3); j++) { let text = sel.options[j].text.toUpperCase(); if (text.includes("ANALYTICAL -") || text.includes("COLOR FASTNESS -") || text.includes("CHEMICAL -") || text.includes("PHYSICAL -") || text.includes("SHRINKAGE -")) { return sel; } } } } return null; }
        function getPieceDropdown() { const selects = getNativeSelects(); for (let sel of selects) { if (sel.parentElement && sel.parentElement.textContent.includes("Piece :") && !sel.multiple) return sel; } if (selects.length >= 3) return selects[2]; return null; }

        setInterval(() => { const testDropdown = getTestDropdown(); if (testDropdown && testDropdown.selectedIndex >= 0) { const testText = testDropdown.options[testDropdown.selectedIndex].text.toUpperCase(); const wrapperType = document.getElementById('varType_wrapper'); if (wrapperType) wrapperType.style.display = testText.includes("FABRIC") ? "none" : "flex"; } }, 500);

        // 4. LÓGICA DE PDF (DATOS)
        function procesarTextoCompletoPDF(textoLimpio) {
            let text = textoLimpio.replace(/\r?\n|\r/g, ' ').replace(/\s+/g, ' ');
            let edadAsignada = false; let ageMatch = text.match(/Intended\s*Age[\s\S]{0,150}?(Baby|Kids|Adult|Child)/i); if (ageMatch) { let val = ageMatch[1].toLowerCase(); if (val === 'baby') { document.getElementById('varEdad').value = 'Baby'; edadAsignada = true; } else { document.getElementById('varEdad').value = 'Adult/Kid'; edadAsignada = true; } } if (!edadAsignada) { if (text.includes('Baby') || text.includes('BABY')) { document.getElementById('varEdad').value = 'Baby'; } else if (text.includes('Kids') || text.includes('KIDS') || text.includes('Adult')) { document.getElementById('varEdad').value = 'Adult/Kid'; } }
            if (/Brand[\s\S]{0,100}Old\s*Navy/i.test(text)) { document.getElementById('varBrand').value = 'Old Navy'; } else if (/Brand/i.test(text)) { document.getElementById('varBrand').value = 'Others'; }
            let shValue = 'Non-Preshrunk'; if (/Non[- ]*Preshrunk/i.test(text) || /No\s*Finishing/i.test(text)) { shValue = 'Non-Preshrunk'; } else if (/Pre[- ]*Shrunk/i.test(text)) { shValue = 'Preshrunk'; } document.getElementById('varShrinkage').value = shValue;
            if (/Jersey/i.test(text)) { document.getElementById('varConst').value = 'Jersey'; } else if (/1x1\s*Rib/i.test(text)) { document.getElementById('varConst').value = '1x1 Rib'; } else if (/2x2\s*Rib/i.test(text)) { document.getElementById('varConst').value = '2x2 Rib'; } else if (/Fleece/i.test(text)) { document.getElementById('varConst').value = 'Fleece'; } else if (/Waffle/i.test(text)) { document.getElementById('varConst').value = 'Waffle'; }
            let listaFibrasDef = [ 
                { name: 'cotton', type: 'natural' }, 
                { name: 'linen', type: 'natural' }, 
                { name: 'wool', type: 'natural' }, 
                { name: 'silk', type: 'natural' }, 
                { name: 'polyester', type: 'synthetic' }, 
                { name: 'nylon', type: 'synthetic' }, 
                { name: 'spandex', type: 'synthetic' }, 
                { name: 'elastane', type: 'synthetic' }, 
                { name: 'acrylic', type: 'synthetic' }, 
                { name: 'viscose', type: 'regen' }, 
                { name: 'rayon', type: 'regen' }, 
                { name: 'modal', type: 'regen' }, 
                { name: 'lyocell', type: 'regen' } 
            ]; 
            let candidates = []; 
            listaFibrasDef.forEach(f => { 
                let reA = new RegExp('(\\d+(?:\\.\\d+)?)\\s*%\\s*' + f.name + '\\b', 'gi'); 
                let mA; 
                while ((mA = reA.exec(text)) !== null) { 
                    let pct = parseFloat(mA[1]); 
                    if (pct > 0 && pct <= 100) { candidates.push({ name: f.name, type: f.type, pct: pct, index: mA.index }); } 
                } 
                let reB = new RegExp('\\b' + f.name + '[\\s:_\\-]*(\\d+(?:\\.\\d+)?)\\s*%', 'gi'); 
                let mB; 
                while ((mB = reB.exec(text)) !== null) { 
                    let pct = parseFloat(mB[1]); 
                    if (pct > 0 && pct <= 100) { candidates.push({ name: f.name, type: f.type, pct: pct, index: mB.index }); } 
                } 
            }); 
            if (candidates.length === 0) { 
                let fibrasDetectadas = []; 
                listaFibrasDef.forEach(f => { 
                    let regex = new RegExp('\\b' + f.name + '\\b', 'gi'); 
                    let match; 
                    while ((match = regex.exec(text)) !== null) { fibrasDetectadas.push({ name: f.name, type: f.type, index: match.index }); } 
                }); 
                fibrasDetectadas.sort((a, b) => a.index - b.index); 
                if (fibrasDetectadas.length > 0) { 
                    let esLayoutColumna = true; 
                    for (let i = 0; i < fibrasDetectadas.length; i++) { 
                        let inicio = fibrasDetectadas[i].index; 
                        let fin = (i + 1 < fibrasDetectadas.length) ? fibrasDetectadas[i + 1].index : text.length; 
                        if (i === fibrasDetectadas.length - 1) { fin = Math.min(inicio + 250, text.length); } 
                        let fragmento = text.substring(inicio, fin); 
                        let matchesNum = fragmento.match(/\b\d+(?:\.\d+)?\b/g); 
                        let numsFiltrados = matchesNum ? matchesNum.map(Number).filter(n => n > 0 && n <= 100) : []; 
                        if (numsFiltrados.length > 0 && i < fibrasDetectadas.length - 1) { esLayoutColumna = false; } 
                        fibrasDetectadas[i].numsSegmento = numsFiltrados; 
                    } 
                    if (esLayoutColumna) { 
                        let ultimaFibra = fibrasDetectadas[fibrasDetectadas.length - 1]; 
                        let todosLosNums = ultimaFibra.numsSegmento || []; 
                        for (let i = 0; i < fibrasDetectadas.length; i++) { 
                            let pct = todosLosNums[i] || 0; 
                            if (pct > 0 && pct <= 100) candidates.push({ name: fibrasDetectadas[i].name, type: fibrasDetectadas[i].type, pct: pct, index: fibrasDetectadas[i].index }); 
                        } 
                    } else { 
                        for (let i = 0; i < fibrasDetectadas.length; i++) { 
                            let pct = fibrasDetectadas[i].numsSegmento[0] || 0; 
                            if (pct > 0 && pct <= 100) candidates.push({ name: fibrasDetectadas[i].name, type: fibrasDetectadas[i].type, pct: pct, index: fibrasDetectadas[i].index }); 
                        } 
                    } 
                } 
            } 
            let mapeoFinal = []; 
            if (candidates.length > 0) { 
                let unicos = []; 
                let vistos = new Set(); 
                candidates.forEach(c => { 
                    let k = c.name + '_' + c.pct; 
                    if (!vistos.has(k)) { vistos.add(k); unicos.push(c); } 
                }); 
                let fibra100 = unicos.find(c => c.pct === 100); 
                if (fibra100) { 
                    mapeoFinal = [fibra100]; 
                } else { 
                    let porNombre = {}; 
                    unicos.forEach(c => { 
                        if (!porNombre[c.name]) porNombre[c.name] = []; 
                        porNombre[c.name].push(c); 
                    }); 
                    let nombresFibras = Object.keys(porNombre); 
                    let comboExacto = null; 
                    function buscarCombo100(idx, comboActual, sumaActual) { 
                        if (Math.abs(sumaActual - 100) < 0.1) { comboExacto = [...comboActual]; return true; } 
                        if (sumaActual > 100.1 || idx >= nombresFibras.length) return false; 
                        let nombre = nombresFibras[idx]; 
                        for (let cand of porNombre[nombre]) { 
                            if (sumaActual + cand.pct <= 100.1) { 
                                comboActual.push(cand); 
                                if (buscarCombo100(idx + 1, comboActual, sumaActual + cand.pct)) return true; 
                                comboActual.pop(); 
                            } 
                        } 
                        if (buscarCombo100(idx + 1, comboActual, sumaActual)) return true; 
                        return false; 
                    } 
                    buscarCombo100(0, [], 0); 
                    if (comboExacto && comboExacto.length > 0) { 
                        mapeoFinal = comboExacto; 
                    } else { 
                        let ordenados = [...unicos].sort((a, b) => b.pct - a.pct); 
                        let sumaAcumulada = 0; 
                        let fibrasUsadas = new Set(); 
                        for (let c of ordenados) { 
                            if (fibrasUsadas.has(c.name)) continue; 
                            if (sumaAcumulada + c.pct <= 100) { 
                                mapeoFinal.push(c); 
                                sumaAcumulada += c.pct; 
                                fibrasUsadas.add(c.name); 
                            } 
                        } 
                    } 
                } 
            } 
            let natural = 0, synthetic = 0, regen = 0; 
            let compArr = []; 
            mapeoFinal.forEach(item => { 
                if (item.type === 'natural') natural += item.pct; 
                if (item.type === 'synthetic') synthetic += item.pct; 
                if (item.type === 'regen') regen += item.pct; 
                if (item.pct > 0) { 
                    let cleanPct = parseFloat(item.pct).toString(); 
                    let capName = item.name.charAt(0).toUpperCase() + item.name.slice(1); 
                    compArr.push(`${cleanPct}% ${capName}`); 
                } 
            }); 
            if (compArr.length > 0) { 
                document.getElementById('varFiberComp').value = compArr.join(' '); 
            } 
            if (synthetic >= 50) { 
                document.getElementById('varFiber').value = 'Synthetic'; 
            } else if (natural > 50) { 
                document.getElementById('varFiber').value = 'Natural'; 
            } else if (regen > 50) { 
                document.getElementById('varFiber').value = 'Regenerated Cellulose'; 
            } else if (synthetic > 0 || natural > 0 || regen > 0) { 
                let maxVal = Math.max(natural, synthetic, regen); 
                if (maxVal === synthetic) document.getElementById('varFiber').value = 'Synthetic'; 
                else if (maxVal === natural) document.getElementById('varFiber').value = 'Natural'; 
                else document.getElementById('varFiber').value = 'Regenerated Cellulose'; 
            }
            let beforeWeight = null, afterWeight = null; let bChunk = text.match(/Before\s*Wash[\s\S]{0,150}/i); if (bChunk) { let bNums = bChunk[0].match(/\d+(?:\.\d+)?/g); if (bNums) { let validB = bNums.map(Number).filter(n => n >= 40 && n <= 500); if (validB.length > 0) beforeWeight = validB[0]; } } let aChunk = text.match(/After\s*Wash[\s\S]{0,150}/i); if (aChunk) { let aNums = aChunk[0].match(/\d+(?:\.\d+)?/g); if (aNums) { let validA = aNums.map(Number).filter(n => n >= 40 && n <= 500); if (validA.length > 0) afterWeight = validA[0]; } } if (!beforeWeight && !afterWeight) { let fallbackChunk = text.match(/Fabric\s*Weight[\s\S]{0,300}/i); if (fallbackChunk) { let numbers = fallbackChunk[0].match(/\d+(?:\.\d+)?/g); if (numbers) { let validNums = numbers.map(Number).filter(n => n >= 40 && n <= 500); if (validNums.length > 0) { beforeWeight = validNums[0]; if (validNums[1]) afterWeight = validNums[1]; } } } } let finalWeightCalculated = ''; if (shValue === 'Preshrunk') { finalWeightCalculated = afterWeight || beforeWeight || ''; } else { finalWeightCalculated = beforeWeight || afterWeight || ''; } if (finalWeightCalculated !== '') { document.getElementById('varWeight').value = Math.round(finalWeightCalculated); } let yarnMatch = text.match(/Yarn\s*Size\s*(\d+)\s*S\/1/i); let yarnVal = '-'; if (yarnMatch) { let sizeNum = yarnMatch[1]; if (sizeNum === '26' || sizeNum === '30' || sizeNum === '20') { yarnVal = sizeNum + ' S/1'; } } document.getElementById('varYarnSizeReq').value = yarnVal;
            let typeMatch = text.match(/End\s*Use[\s\S]{0,100}?(Top|Bottom)/i); if (typeMatch) { let typeVal = typeMatch[1].toLowerCase(); if (typeVal === 'top') document.getElementById('varType').value = 'Top'; else if (typeVal === 'bottom') document.getElementById('varType').value = 'Bottom'; } else { if (/Tees|Shirt|Top|Hoodie|Sweater/i.test(text)) { document.getElementById('varType').value = 'Top'; } else if (/Pant|Short|Bottom|Jogger|Legging/i.test(text)) { document.getElementById('varType').value = 'Bottom'; } }
            let ironVal = ''; if (/cool\s*[\/\-]?\s*iron/i.test(text)) { ironVal = 'Cool Iron'; } else if (/warm\s*[\/\-]?\s*iron/i.test(text)) { ironVal = 'Warm Iron'; } else if (/do\s*not\s*[\/\-]?\s*iron/i.test(text)) { ironVal = 'Do Not Iron'; } document.getElementById('varIron').value = ironVal;
            ['varEdad', 'varWeight', 'varFiber', 'varFiberComp', 'varBrand', 'varType', 'varShrinkage', 'varConst', 'varYarnSizeReq', 'varIron'].forEach(id => { let el = document.getElementById(id); localStorage.setItem('intertek_' + id, el.value); triggerEvents(el); });
        }

        fileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0]; if (!file) return; txtEstado.innerText = '⏳ Procesando...'; txtEstado.style.color = '#d39e00';
            const reader = new FileReader();
            reader.onload = async function() {
                try {
                    const typedarray = new Uint8Array(this.result); const pdfjs = window.pdfjsLib; if (!pdfjs) throw new Error("Bloqueado");
                    const loadingTask = pdfjs.getDocument({data: typedarray}); const pdf = await loadingTask.promise; let fullText = '';
                    for (let i = 1; i <= pdf.numPages; i++) { const page = await pdf.getPage(i); const textContent = await page.getTextContent(); fullText += textContent.items.map(item => item.str).join(' ') + ' \n'; }
                    procesarTextoCompletoPDF(fullText); txtEstado.innerText = '✅ Extraído'; txtEstado.style.color = '#28a745'; setTimeout(() => { txtEstado.innerText = ''; fileInput.value = ''; }, 3000);
                } catch (error) { txtEstado.innerText = '❌ Error'; txtEstado.style.color = '#dc3545'; }
            }; reader.readAsArrayBuffer(file);
        });

        txtPegarInput.addEventListener('input', (e) => { let valor = e.target.value.trim(); if (valor.length > 30) { procesarTextoCompletoPDF(valor); txtPegarInput.value = ''; txtPegarInput.placeholder = '✅ ¡Extraído!'; txtPegarInput.style.borderColor = '#28a745'; txtPegarInput.style.backgroundColor = '#e8f5e9'; setTimeout(() => { txtPegarInput.placeholder = '📋 Pegar texto (Plan B)...'; txtPegarInput.style.borderColor = '#6f42c1'; txtPegarInput.style.backgroundColor = '#fff'; }, 2500); } });

        // 5. EVENTOS BOTONES
        btnTest.addEventListener('click', (e) => { e.preventDefault(); const testDropdown = getTestDropdown(); if (testDropdown) { if (testDropdown.selectedIndex < testDropdown.options.length - 1) { testDropdown.selectedIndex += 1; triggerEvents(testDropdown); if (typeof $ !== 'undefined') $(testDropdown).trigger('change'); } else { alert('Ya te encuentras en el último Test.'); } } });
        btnPiece.addEventListener('click', (e) => { e.preventDefault(); const pieceDropdown = getPieceDropdown(); if (pieceDropdown) { if (pieceDropdown.selectedIndex < pieceDropdown.options.length - 1) { pieceDropdown.selectedIndex += 1; triggerEvents(pieceDropdown); if (typeof $ !== 'undefined') $(pieceDropdown).trigger('change'); } else { alert('Ya te encuentras en la última Piece.'); } } });
        btnData.addEventListener('click', (e) => { e.preventDefault(); let count = 0; document.querySelectorAll('select').forEach(select => { let targetOption = Array.from(select.options).find(opt => opt.text.trim().toUpperCase() === 'DATA' || opt.value.trim().toUpperCase() === 'DATA'); if (!targetOption) { targetOption = Array.from(select.options).find(opt => opt.text.trim().toUpperCase() === 'NOT PROVIDED' || opt.value.trim().toUpperCase() === 'NOT PROVIDED'); } if (targetOption) { select.value = targetOption.value; targetOption.selected = true; select.selectedIndex = targetOption.index; triggerEvents(select); count++; if (typeof $ !== 'undefined') $(select).trigger('change'); } }); const originalText = btnData.innerText; btnData.innerText = `✅ (${count})`; setTimeout(() => btnData.innerText = originalText, 2000); });

        // 6. CEREBRO REQ's (A PRUEBA DE CRASHES)
        btnLlenar.addEventListener('click', (e) => {
            e.preventDefault();
            try {
                let llenados = 0;
                const testDropdown = getTestDropdown();
                let testSeleccionado = testDropdown && testDropdown.selectedIndex >= 0 ? testDropdown.options[testDropdown.selectedIndex].text.toUpperCase() : "";

                if (testDropdown) {
                    for (let i = 0; i < testDropdown.options.length; i++) {
                        let opcionTexto = testDropdown.options[i].text.toUpperCase();
                        if (opcionTexto.includes("FORMALDEHYDE")) {
                            if (opcionTexto.includes("BABY") || opcionTexto.includes("BABIES")) { document.getElementById('varEdad').value = "Baby"; localStorage.setItem('intertek_varEdad', 'Baby'); triggerEvents(document.getElementById('varEdad')); }
                            else if (opcionTexto.includes("ADULT") || opcionTexto.includes("KID")) { document.getElementById('varEdad').value = "Adult/Kid"; localStorage.setItem('intertek_varEdad', 'Adult/Kid'); triggerEvents(document.getElementById('varEdad')); }
                            break;
                        }
                    }
                }

                const categoriaElegida = document.getElementById('varEdad').value;
                const valWeight = document.getElementById('varWeight').value.trim();
                const valFiber = document.getElementById('varFiber').value;
                const valBrand = document.getElementById('varBrand').value;
                const valType = document.getElementById('varType').value;
                const valShrinkage = document.getElementById('varShrinkage').value;
                const valConst = document.getElementById('varConst').value;

                let colorExtraido = "";
                document.querySelectorAll('select').forEach(sel => { if (sel.selectedIndex >= 0) { let txt = sel.options[sel.selectedIndex].text; if (/^[A-Z0-9]{1,5}\s*:/.test(txt)) { colorExtraido = txt.substring(txt.indexOf(':') + 1).trim(); } } });

                const isFabricTest = testSeleccionado.includes("FABRIC");
                const filas = document.querySelectorAll('tr');
                let reqIndex = -1; let minIndex = -1; let resultColIndex = -1;

                filas.forEach(fila => {
                    Array.from(fila.cells).forEach((celda, index) => {
                        const texto = celda.innerText.trim().toUpperCase();
                        if (texto.includes('REQUIREMENT') || texto.includes('REQ')) reqIndex = index;
                        if (texto === 'MIN') minIndex = index;
                        if (texto === 'RESULT' && reqIndex !== -1 && index > reqIndex) resultColIndex = index;
                    });
                });

                const isAnalytical = testSeleccionado.includes("ANALYTICAL"); const isAccelerated = testSeleccionado.includes("ACCELERATED LAUNDERING"); const isPerspiration = testSeleccionado.includes("PERSPIRATION"); const isWater = testSeleccionado.includes("WATER"); const isBurntGas = testSeleccionado.includes("BURNT GAS"); const isLight = testSeleccionado.includes("LIGHT"); const isNonChlorineBleach = testSeleccionado.includes("NON-CHLORINE") || testSeleccionado.includes("NON CHLORINE"); const isCrocking = testSeleccionado.includes("CROCKING"); const isSaliva = testSeleccionado.includes("SALIVA"); const isWeight = testSeleccionado.includes("WEIGHT") || testSeleccionado.includes("D3776"); const isBursting = testSeleccionado.includes("BURSTING"); const isPilling = testSeleccionado.includes("PILLING"); const isDimensional = testSeleccionado.includes("DIMENSIONAL STABILITY"); const isTorque = testSeleccionado.includes("TORQUE"); const isPH = testSeleccionado.includes("PH LEVEL"); const isFlammability = testSeleccionado.includes("FLAMMABILITY"); const isSeamStretch = testSeleccionado.includes("SEAM STRETCHABILITY"); const isDurabilityExtended = testSeleccionado.includes("DURABILITY TO EXTENDED LAUNDERING"); const isAppearance = testSeleccionado.includes("APPEARANCE AFTER LAUNDERING"); const isRepeatedLaundering = testSeleccionado.includes("DURABILITY TO REPEATED LAUNDERING"); const isThreadCount = testSeleccionado.includes("THREAD COUNT"); const isStitchLength = testSeleccionado.includes("STITCH LENGTH"); const isYarnSize = testSeleccionado.includes("YARN SIZE"); const isStretchRecovery = testSeleccionado.includes("STRETCH AND RECOVERY"); const isFiberShedding = testSeleccionado.includes("FIBER SHEDDING"); const isFiberAnalysis = testSeleccionado.includes("FIBER ANALYSIS") || testSeleccionado.includes("FIBER CONTENT");
                const pruebaValida = isAnalytical || isAccelerated || isPerspiration || isWater || isBurntGas || isLight || isNonChlorineBleach || isCrocking || isSaliva || isWeight || isBursting || isPilling || isDimensional || isTorque || isPH || isFlammability || isSeamStretch || isDurabilityExtended || isAppearance || isRepeatedLaundering || isThreadCount || isStitchLength || isYarnSize || isStretchRecovery || isFiberShedding || isFiberAnalysis;

                let appPartColorFilled = false, appPartPillingFilled = false, appGradeColorFilled = false, appGradePillingFilled = false; let repPartColorFilled = false, repGradeColorFilled = false;

                if (reqIndex !== -1 && pruebaValida) {
                    let currentReading = "";
                    filas.forEach(fila => {
                        if (fila.cells.length > 0) {
                            let firstCellText = fila.cells[0].innerText.trim().toUpperCase();
                            if (firstCellText !== "" && !firstCellText.includes("SPECIMEN") && !firstCellText.includes("AVERAGE") && !firstCellText.includes("HIGHEST") && !firstCellText.includes("LENGTH") && !firstCellText.includes("WIDTH") && firstCellText !== "READING" && firstCellText !== "RESULT" && !firstCellText.includes("CATEGORY")) {
                                currentReading = firstCellText;
                            }
                        }

                        // Validamos que la fila sea lo suficientemente larga
                        if (fila.cells.length > reqIndex && fila.cells[1]) {
                            let paramName = fila.cells[1].innerText.trim().toUpperCase();
                            if (paramName === "") paramName = fila.cells[0].innerText.trim().toUpperCase();

                            // Aseguramos que la celda de Requisito exista en ESTA fila antes de leerla
                            const reqCell = fila.cells[reqIndex];
                            const reqInputs = reqCell ? Array.from(reqCell.querySelectorAll('input')).filter(i => i.type !== 'checkbox' && i.type !== 'hidden') : [];
                            const inputRequisito = reqInputs.length > 0 ? reqInputs[0] : null;

                            const resCell = fila.cells[reqIndex - 1];
                            const resInputs = resCell ? Array.from(resCell.querySelectorAll('input')).filter(i => i.type !== 'checkbox' && i.type !== 'hidden') : [];
                            const inputResultado = resInputs.length > 0 ? resInputs[0] : null;

                            if ((inputRequisito || inputResultado || resultColIndex !== -1) && (paramName !== "" || isStitchLength)) {
                                let valorAplicar = "", minAplicar = "", resultAplicar = "PASS", valorResultadoInyectar = "";

                                if (isAnalytical) { if (testSeleccionado.includes("FORMALDEHYDE")) { if (categoriaElegida === "Baby" || testSeleccionado.includes("QUANTITATIVE") || testSeleccionado.includes("BABY")) { if (paramName.includes("HIGHEST")) { if (currentReading.includes("ABSORBENCY")) { valorAplicar = "≤ 0.05"; } else { valorAplicar = "< 16"; } resultAplicar = "PASS"; } else { valorAplicar = "-"; resultAplicar = "DATA"; } } else { valorAplicar = "Negative"; resultAplicar = "PASS"; } } else if (testSeleccionado.includes("PFAS")) { valorAplicar = "Pass"; } else if (testSeleccionado.includes("CADMIUM CONTENT") && paramName.includes("CADMIUM")) { valorAplicar = "≤ 40 mg/kg (0.004% by"; minAplicar = "5"; } else if (testSeleccionado.includes("HEAVY METALS")) { if (paramName.includes("ANTIMONY")) { valorAplicar = "< 60 mg/kg"; minAplicar = "5"; } else if (paramName.includes("ARSENIC")) { valorAplicar = "< 25 mg/kg"; minAplicar = "5"; } else if (paramName.includes("BARIUM")) { valorAplicar = "< 1000 mg/kg"; minAplicar = "10"; } else if (paramName.includes("CADMIUM")) { valorAplicar = "< 75 mg/kg"; minAplicar = "5"; } else if (paramName.includes("CHROMIUM")) { valorAplicar = "< 60 mg/kg"; minAplicar = "5"; } else if (paramName.includes("LEAD")) { valorAplicar = "< 90 mg/kg"; minAplicar = "5"; } else if (paramName.includes("MERCURY")) { valorAplicar = "< 60 mg/kg"; minAplicar = "5"; } else if (paramName.includes("SELENIUM")) { valorAplicar = "< 500 mg/kg"; minAplicar = "10"; } } else if (testSeleccionado.includes("PHTHALATES")) { valorAplicar = "≤ 1000 mg/kg (0.1% by"; minAplicar = "0.005"; } else if (testSeleccionado.includes("TOTAL LEAD CONTENT") && paramName.includes("LEAD")) { valorAplicar = "≤ 90 mg/kg (0.009% by"; minAplicar = "10"; } }
                                else if (isAccelerated) { if (paramName.includes("COLOR CHANGE")) valorAplicar = "3.5"; else if (paramName.includes("SELF STAINING")) valorAplicar = "4"; else valorAplicar = "3"; }
                                else if (isPerspiration || isWater) { valorAplicar = (categoriaElegida === "Baby") ? "4" : (paramName.includes("SELF STAINING") ? "4" : "3.5"); }
                                else if (isCrocking) { if (paramName.includes("DRY")) valorAplicar = (categoriaElegida === "Baby") ? "4" : "3.5"; else if (paramName.includes("WET")) valorAplicar = "2.5"; }
                                else if (isBurntGas) valorAplicar = "3.5"; else if (isLight) valorAplicar = "3"; else if (isNonChlorineBleach) valorAplicar = "4";
                                else if (isSaliva) { if (paramName.includes("COLOR CHANGE") || paramName.includes("SELF & ADJACENT")) { valorAplicar = "4"; resultAplicar = "PASS"; } else if (paramName.includes("OTHERS FOR REFERENCE")) { valorAplicar = "-"; resultAplicar = "DATA"; } }
                                else if (isWeight) { 
                                    let numWeight = parseFloat(valWeight);
                                    if (!isNaN(numWeight) && numWeight > 340) {
                                        valorAplicar = "+/- 3.0% from claim";
                                    } else {
                                        valorAplicar = "+/- 5.0% from claim"; 
                                    }
                                    resultAplicar = "PASS"; 
                                    if (currentReading.includes("CLAIM") && !currentReading.includes("OZ")) { 
                                        if (valWeight !== "") { 
                                            valorResultadoInyectar = valWeight; 
                                        } 
                                    } 
                                }
                                else if (isBursting) { let numWeight = parseFloat(valWeight); if (!isNaN(numWeight)) { if (numWeight < 150) { valorAplicar = "40 PSI"; } else if (numWeight >= 150 && numWeight < 200) { valorAplicar = "45 PSI"; } else if (numWeight >= 200) { valorAplicar = "50 PSI"; } resultAplicar = "PASS"; } }
                                else if (isPilling) { valorAplicar = "3"; resultAplicar = "PASS"; }
                                else if (isDimensional) { let varBaseShrink = ""; if (valFiber === "Synthetic") { if (valShrinkage === "Preshrunk") varBaseShrink = "-2.0"; else varBaseShrink = "-3.5"; } else if (valFiber === "Regenerated Cellulose") { if (valShrinkage === "Preshrunk") varBaseShrink = "-6.0"; else { if (valBrand === "Old Navy" && isFabricTest) varBaseShrink = "-8.0"; else varBaseShrink = "-6.0"; } } else if (valFiber === "Natural") { let isGrupo1 = (valConst === "Jersey" || valConst === "1x1 Rib"); if (valShrinkage === "Preshrunk") { if (isGrupo1) varBaseShrink = "-3.5"; else varBaseShrink = "-6.0"; } else { if (valBrand === "Old Navy") { if (isGrupo1) varBaseShrink = "-6.0"; else { if (isFabricTest) varBaseShrink = "-8.0"; else varBaseShrink = "-6.0"; } } else { varBaseShrink = "-6.0"; } } } if (varBaseShrink !== "") { valorAplicar = varBaseShrink + "%/+2.0%"; resultAplicar = "PASS"; } }
                                else if (isTorque) { valorAplicar = "Max. 5%"; resultAplicar = "PASS"; } else if (isPH) { valorAplicar = "All White: 4.0-6.5; Others: 4.0-7.5"; resultAplicar = "PASS"; } else if (isFlammability) { valorAplicar = "Class 1"; resultAplicar = "PASS"; }
                                else if (isSeamStretch) { if (valType === "Top") { valorAplicar = "7 lbs. or 50% Elongation"; } else if (valType === "Bottom") { valorAplicar = "20 lbs. or 50% Elongation"; } if (valorAplicar !== "") { resultAplicar = "PASS"; } }
                                else if (isDurabilityExtended) { let isRegulated = testSeleccionado.includes("REGULATED") && !testSeleccionado.includes("NON-REGULATED") && !testSeleccionado.includes("NON REGULATED"); if (paramName.includes("COMMENT")) { valorAplicar = "Satisfactory"; valorResultadoInyectar = "Satisfactory"; } else if (paramName.includes("LABEL TEXT")) { valorAplicar = "Labels must be legible after wash"; valorResultadoInyectar = "Legible"; } else if (paramName.includes("SMALL PART")) { valorAplicar = isRegulated ? "See Above Requirement" : "Comply"; valorResultadoInyectar = "Comply"; } else if (paramName.includes("PEELING") || paramName.includes("FLAKING") || paramName.includes("ROUGH")) { valorAplicar = isRegulated ? "Comply" : "See Above Requirement"; valorResultadoInyectar = "Comply"; } else if (paramName.includes("LABEL LIFTING") || paramName.includes("DETACHING")) { valorAplicar = "See Above Requirement"; valorResultadoInyectar = "Comply"; } else if (paramName.includes("SHARP POINT")) { valorAplicar = "Comply"; valorResultadoInyectar = "Comply"; } else if (paramName.includes("SHARP EDGE")) { valorAplicar = "See Above Requirement"; valorResultadoInyectar = "Comply"; } else if (paramName.includes("MECHANICAL OR SAFETY HAZARDS")) { valorAplicar = "See Above Requirement"; valorResultadoInyectar = "Comply"; } resultAplicar = "PASS"; }
                                else if (isAppearance) { let matched = false; let iv = document.getElementById('varIron') ? document.getElementById('varIron').value : ""; if (currentReading === "GRADE") { if (paramName.includes("COLOR CHANGE")) { if (!appGradeColorFilled) { valorAplicar = "3.5"; appGradeColorFilled = true; matched = true; } } else if (paramName.includes("PILLING")) { if (!appGradePillingFilled) { valorAplicar = "3.5"; appGradePillingFilled = true; matched = true; } } else if (paramName.includes("SELF/CROSS")) { valorAplicar = "4"; matched = true; } } else if (currentReading === "OBSERVATION") { if (paramName.includes("IRON SAFE")) { valorAplicar = "Safe"; if (iv !== "Do Not Iron") { valorResultadoInyectar = iv || "Cool Iron"; } matched = true; } else if (paramName.includes("OTHER OBSERVATION")) { valorAplicar = "Satisfactory"; matched = true; } else if (paramName.includes("BEFORE IRONING") || paramName.includes("AFTER IRONING")) { valorAplicar = "Satisfactory"; if (iv !== "Do Not Iron") { valorResultadoInyectar = "Satisfactory"; } matched = true; } } if (matched) { resultAplicar = "PASS"; } }
                                else if (isRepeatedLaundering) { let matched = false; if (currentReading === "PART") { if (paramName.includes("COLOR CHANGE")) { if (!repPartColorFilled) { valorResultadoInyectar = colorExtraido; repPartColorFilled = true; matched = true; } } } else if (currentReading === "GRADE") { if (paramName.includes("COLOR CHANGE")) { if (!repGradeColorFilled) { valorAplicar = "3.5"; valorResultadoInyectar = "4.5"; repGradeColorFilled = true; matched = true; } } else if (paramName.includes("SELF/CROSS")) { valorAplicar = "4"; valorResultadoInyectar = "4.5"; matched = true; } } else if (currentReading === "OBSERVATION") { if (paramName.includes("OTHER OBSERVATION")) { valorAplicar = "Satisfactory"; valorResultadoInyectar = "Satisfactory"; matched = true; } } if (matched) { resultAplicar = "PASS"; } }
                                else if (isThreadCount) { valorAplicar = "+/- 5.0% from claim"; resultAplicar = "DATA"; if (currentReading === "CLAIM") { valorResultadoInyectar = "-"; } }
                                else if (isStitchLength) { valorAplicar = "DATA Only"; resultAplicar = "DATA"; if (currentReading.includes("CLAIM")) { valorResultadoInyectar = "-"; } }
                                else if (isYarnSize) { valorAplicar = "+/- 5.0% from claim"; resultAplicar = "PASS"; if (currentReading === "MARKED") { let yv = document.getElementById('varYarnSizeReq').value; if(yv) { valorResultadoInyectar = yv; } } }
                                else if (isStretchRecovery) { resultAplicar = "DATA"; if (paramName.includes("SPECIMEN") || paramName.includes("AVERAGE")) { valorAplicar = "-"; } }
                                else if (isFiberShedding) { resultAplicar = "PASS"; if (paramName.includes("LOSS IN GRAM") || paramName.includes("LOSS RATIO")) { valorAplicar = "DATA Only"; } else if (paramName.includes("SYRINGE TEST")) { valorAplicar = "≤ 0.8 ml"; } else if (paramName.includes("OBSERVATION")) { valorAplicar = ""; } }
                                else if (isFiberAnalysis) { let customFiber = document.getElementById('varFiberComp') ? document.getElementById('varFiberComp').value.trim() : ""; if (customFiber !== "") { if (!/^\d/.test(customFiber)) { let re = /([a-zA-Z]+(?:\s+[a-zA-Z]+)*)\s*(\d+(?:\.\d+)?\s*%)/g; if (re.test(customFiber)) { customFiber = customFiber.replace(re, (match, txt, pct) => pct.trim() + ' ' + txt.trim() + ' ').replace(/\s{2,}/g, ' ').trim(); } } valorAplicar = customFiber; } else { valorAplicar = "+/- 3%"; } resultAplicar = "PASS"; }

                                let filaModificada = false;

                                if (valorAplicar !== "" && inputRequisito) {
                                    inputRequisito.value = valorAplicar;
                                    triggerEvents(inputRequisito);
                                    filaModificada = true;
                                }

                                if (valorResultadoInyectar !== "" && inputResultado) {
                                    inputResultado.value = valorResultadoInyectar;
                                    triggerEvents(inputResultado);
                                    filaModificada = true;
                                }

                                if (filaModificada || resultAplicar === "PASS" || resultAplicar === "DATA") {
                                    if (minAplicar !== "" && minIndex !== -1 && fila.cells[minIndex]) {
                                        const reqMins = Array.from(fila.cells[minIndex].querySelectorAll('input')).filter(i => i.type !== 'checkbox' && i.type !== 'hidden');
                                        const inputMin = reqMins.length > 0 ? reqMins[0] : null;
                                        if (inputMin) { inputMin.value = minAplicar; triggerEvents(inputMin); }
                                    }

                                    // AQUI ESTABA EL ERROR: Aseguramos que la celda resultColIndex EXISTA en la fila
                                    let resultSelect = null;
                                    if (resultColIndex !== -1 && fila.cells[resultColIndex]) {
                                        resultSelect = fila.cells[resultColIndex].querySelector('select');
                                    }
                                    if (!resultSelect) {
                                        resultSelect = Array.from(fila.querySelectorAll('select')).find(sel => Array.from(sel.options).some(opt => opt.text.trim().toUpperCase() === 'PASS'));
                                    }
                                    if (resultSelect) {
                                        const targetOption = Array.from(resultSelect.options).find(opt => opt.text.trim().toUpperCase() === resultAplicar.toUpperCase() || opt.value.trim().toUpperCase() === resultAplicar.toUpperCase() );
                                        if (targetOption) {
                                            resultSelect.value = targetOption.value;
                                            targetOption.selected = true;
                                            resultSelect.selectedIndex = targetOption.index;
                                            triggerEvents(resultSelect);
                                            if (typeof $ !== 'undefined') $(resultSelect).trigger('change');
                                            resultSelect.setAttribute('data-intertek-filled', 'true');
                                        }
                                    }
                                    llenados++;
                                }
                            }
                        }
                    });

                    if (llenados > 0) {
                        document.querySelectorAll('select').forEach(sel => {
                            if (sel.hasAttribute('data-intertek-filled')) return;
                            const opciones = Array.from(sel.options).map(o => o.text.trim().toUpperCase());
                            const esResultGeneral = opciones.includes('NOT PROVIDED'); const esExtraConclusion = opciones.some(txt => txt.includes('EXTRA CONCLUSION'));
                            if ((esResultGeneral || esExtraConclusion) && opciones.includes('PASS')) { const passOpt = Array.from(sel.options).find(o => o.text.trim().toUpperCase() === 'PASS'); if (passOpt && sel.selectedIndex !== passOpt.index) { sel.value = passOpt.value; passOpt.selected = true; sel.selectedIndex = passOpt.index; triggerEvents(sel); } }
                        });
                    }
                } else if (!pruebaValida) {
                    alert('La prueba seleccionada no tiene reglas configuradas.');
                    return;
                } else {
                    alert('ERROR: No se detectó la columna de Requirements en esta tabla.');
                }

                const originalText = "REQ's"; btnLlenar.innerText = `✅ (${llenados})`; setTimeout(() => btnLlenar.innerText = originalText, 2000);
            } catch (error) {
                alert("Hubo un error interno al llenar los datos.\nDetalle: " + error.message);
                console.error(error);
            }
        });

    }, 2000);
})();


