// ==UserScript==
// @name         Autodigitación
// @namespace    http://tampermonkey.net/
// @version      9.07
// @description  Pruebas actualizadas
// @author       Wilder Sicán
// @match        *://tips-amer.intertek.com/Transactions/testpiecereq_xml.aspx*
// @require      https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js
// @updateURL    https://gist.githubusercontent.com/wildersican/95464492e91a030ebeabb4eeb7bc3068/raw/auto-digitacion.user.js
// @downloadURL  https://gist.githubusercontent.com/wildersican/95464492e91a030ebeabb4eeb7bc3068/raw/auto-digitacion.user.js
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const pdfjsLib = window['pdfjs-dist/build/pdf'];
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

    setTimeout(() => {
        // --- 1. BOTÓN INFERIOR IZQUIERDO ---
        const panelIzq = document.createElement('div');
        panelIzq.style.cssText = `position: fixed; bottom: 30px; left: 30px; z-index: 99999; display: flex; gap: 10px; align-items: center;`;

        const lblSubirPruebas = document.createElement('label');
        lblSubirPruebas.innerHTML = '📄 Subir PDF Pruebas';
        lblSubirPruebas.style.cssText = `color: white; border: none; border-radius: 4px; padding: 4px 10px; font-size: 12px; cursor: pointer; font-weight: bold; height: 26px; box-shadow: 0px 2px 4px rgba(0,0,0,0.3); background-color: #5a3286; margin: 0; display: flex; align-items: center;`;

        const fileInputPruebas = document.createElement('input');
        fileInputPruebas.type = 'file';
        fileInputPruebas.accept = 'application/pdf';
        fileInputPruebas.style.display = 'none';

        lblSubirPruebas.appendChild(fileInputPruebas);
        panelIzq.appendChild(lblSubirPruebas);
        document.body.appendChild(panelIzq);

        // --- 2. BOTÓN INFERIOR DERECHO ---
        const espacio = document.getElementById('espacio-boton-pdf');
        let btnResults = null;
        if (espacio) {
            btnResults = document.createElement('button');
            btnResults.innerText = 'Result PDF';
            btnResults.style.cssText = `color: white; border: none; border-radius: 4px; padding: 4px 10px; font-size: 12px; cursor: pointer; font-weight: bold; height: 26px; box-shadow: 0px 2px 4px rgba(0,0,0,0.3); background-color: #28a745; width: auto; min-width: 85px;`;
            espacio.appendChild(btnResults);
        }

        function triggerEvents(element) { element.dispatchEvent(new Event('input', { bubbles: true })); element.dispatchEvent(new Event('change', { bubbles: true })); element.dispatchEvent(new Event('blur', { bubbles: true })); }
        function getNativeSelects() { return Array.from(document.querySelectorAll('select')).filter(sel => !sel.id.startsWith('var')); }
        function getTestDropdown() { const selects = getNativeSelects(); for (let i = 0; i < selects.length; i++) { let sel = selects[i]; if (sel.options && sel.options.length > 0) { for (let j = 0; j < Math.min(sel.options.length, 3); j++) { let text = sel.options[j].text.toUpperCase(); if (text.includes("ANALYTICAL -") || text.includes("COLOR FASTNESS -") || text.includes("CHEMICAL -") || text.includes("PHYSICAL -") || text.includes("SHRINKAGE -")) { return sel; } } } } return null; }

        function obtenerPiezasActivasUI() {
            let activas = [];
            let seen = new Set();
            let checkboxes = document.querySelectorAll('input[type="checkbox"]:checked');
            checkboxes.forEach(cb => {
                let id = cb.id;
                let label = id ? document.querySelector(`label[for="${id}"]`) : null;
                let text = label ? label.innerText.toUpperCase() : (cb.parentElement ? cb.parentElement.innerText.toUpperCase() : "");

                let letter = 'A';
                let m = text.trim().match(/^([A-Z0-9]+)\s*:/);
                if (m) letter = m[1].replace(/[0-9]/g, '');

                let key = letter;
                if (text.includes("FABRIC & PRINT") || text.includes("FABRIC&PRINT")) key = letter + "_FABRIC&PRINT";
                else if (text.includes("FABRIC") || text.includes("AUTOGRADING")) key = letter + "_FABRIC";
                else if (text.includes("PRINT") || text.includes("PRINTGRADING")) key = letter + "_PRINT";
                else if (text.includes("HEAT TRANSFER") || text.includes("HEATTRANSFER")) key = letter + "_HEATTRANSFER";

                if (key && !seen.has(key)) { seen.add(key); activas.push(key); }
            });

            if (activas.length === 0) {
                let selects = document.querySelectorAll('select');
                for (let sel of selects) {
                    let opt = sel.options[sel.selectedIndex];
                    if (opt && opt.text) {
                        let text = opt.text.toUpperCase();
                        let letter = 'A';
                        let m = text.trim().match(/^([A-Z0-9]+)\s*:/);
                        if (m) letter = m[1].replace(/[0-9]/g, '');

                        let key = letter;
                        if (text.includes("FABRIC & PRINT") || text.includes("FABRIC&PRINT")) key = letter + "_FABRIC&PRINT";
                        else if (text.includes("FABRIC") || text.includes("AUTOGRADING")) key = letter + "_FABRIC";
                        else if (text.includes("PRINT") || text.includes("PRINTGRADING")) key = letter + "_PRINT";
                        else if (text.includes("HEAT TRANSFER") || text.includes("HEATTRANSFER")) key = letter + "_HEATTRANSFER";

                        if (key && !seen.has(key)) { seen.add(key); activas.push(key); }
                    }
                }
            }
            return activas;
        }

        function inyectarEnPiezasActivas(fila, valor, piezasActivas) {
            let htmlFila = fila.innerHTML.toUpperCase();
            if (htmlFila.includes("REFRESH") && htmlFila.includes("SAVE")) return 0;

            let inyectados = 0;
            const inputs = Array.from(fila.querySelectorAll('input, textarea')).filter(inp => {
                let type = inp.type ? inp.type.toLowerCase() : 'text';
                if (type === 'hidden' || type === 'submit' || type === 'button' || type === 'checkbox' || type === 'radio') return false;
                if (inp.style.display === 'none') return false;
                if (inp.readOnly || inp.disabled) return false;
                return true;
            });

            for (let k = 0; k < inputs.length && k < piezasActivas.length; k++) {
                if (valor !== undefined && valor !== null && valor !== "") {
                    inputs[k].value = valor;
                    triggerEvents(inputs[k]);
                    inyectados++;
                }
            }
            return inyectados;
        }

        fileInputPruebas.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            lblSubirPruebas.innerHTML = '⏳ Procesando...';
            lblSubirPruebas.style.backgroundColor = '#d39e00';

            const reader = new FileReader();
            reader.onload = async function() {
                try {
                    const typedarray = new Uint8Array(this.result);
                    const pdfjs = window.pdfjsLib;
                    if (!pdfjs) throw new Error("PDF.js no cargó");

                    const loadingTask = pdfjs.getDocument({data: typedarray});
                    const pdf = await loadingTask.promise;

                    let itemsAvanzados = [];
                    for (let i = 1; i <= pdf.numPages; i++) {
                        const page = await pdf.getPage(i);
                        const textContent = await page.getTextContent();

                        textContent.items.forEach(item => {
                            if (item.str.trim() !== '') {
                                let parts = item.str.split(/\s{2,}/);
                                if (parts.length > 1) {
                                    let cx = item.transform[4];
                                    parts.forEach(pt => {
                                        if (pt.trim() !== '') {
                                            itemsAvanzados.push({
                                                str: pt, font: item.fontName, y: item.transform[5], x: cx, page: i
                                            });
                                            cx += (pt.length * 6) + 10;
                                        }
                                    });
                                } else {
                                    itemsAvanzados.push({
                                        str: item.str, font: item.fontName, y: item.transform[5], x: item.transform[4], page: i
                                    });
                                }
                            }
                        });
                    }

                    localStorage.setItem('intertek_pdf_pruebas_data', JSON.stringify(itemsAvanzados));

                    lblSubirPruebas.innerHTML = `✅ ¡Listo!`;
                    lblSubirPruebas.style.backgroundColor = '#28a745';
                    setTimeout(() => {
                        lblSubirPruebas.innerHTML = '📄 Subir PDF Pruebas';
                        lblSubirPruebas.style.backgroundColor = '#5a3286';
                        lblSubirPruebas.appendChild(fileInputPruebas);
                        fileInputPruebas.value = '';
                    }, 3000);
                } catch (error) {
                    lblSubirPruebas.innerHTML = '❌ Error';
                    lblSubirPruebas.style.backgroundColor = '#dc3545';
                    setTimeout(() => {
                        lblSubirPruebas.innerHTML = '📄 Subir PDF Pruebas';
                        lblSubirPruebas.style.backgroundColor = '#5a3286';
                        lblSubirPruebas.appendChild(fileInputPruebas);
                    }, 3000);
                }
            };
            reader.readAsArrayBuffer(file);
        });

        if (btnResults) {
            btnResults.addEventListener('click', (e) => {
                e.preventDefault();
                const originalText = btnResults.innerText;
                btnResults.innerText = 'Buscando...';

                try {
                    const testDropdown = getTestDropdown();
                    let testSeleccionado = testDropdown && testDropdown.selectedIndex >= 0 ? testDropdown.options[testDropdown.selectedIndex].text.toUpperCase() : "";

                    // Declaraciones Maestras
                    let isFlammability = testSeleccionado.includes("FLAMMABILITY");
                    let isCadmium = testSeleccionado.includes("CADMIUM CONTENT");
                    let isLeadSurface = testSeleccionado.includes("LEAD CONTENT IN SURFACE COATING");
                    let isLeadSubstrate = testSeleccionado.includes("LEAD CONTENT IN SUBSTRATE");
                    let isPhthalates = testSeleccionado.includes("PHTHALATES");
                    let isHeavyMetals = testSeleccionado.includes("HEAVY METALS");

                    let isFormaldehydeQuant = testSeleccionado.includes("FORMALDEHYDE") && testSeleccionado.includes("QUANTITATIVE");
                    let isFormaldehydeQual = testSeleccionado.includes("FORMALDEHYDE") && !isFormaldehydeQuant;

                    let isCrocking = testSeleccionado.includes("CROCKING") || testSeleccionado.includes("RUBBING");

                    let isChemicalTest = isCadmium || isLeadSurface || isLeadSubstrate || isPhthalates || isHeavyMetals;
                    let isGenericColorFastness = (testSeleccionado.includes("COLORFASTNESS") || testSeleccionado.includes("COLOR FASTNESS")) && !isCrocking;

                    // --- PFAS DECLARATION ---
                    if (testSeleccionado.includes("PFAS DECLARATION")) {
                        let camposLlenados = 0;
                        let piezasActivas = obtenerPiezasActivasUI();
                        if (piezasActivas.length === 0) { piezasActivas = ['A']; }

                        const filas = document.querySelectorAll('tr');
                        filas.forEach(fila => {
                            if (fila.querySelector('table')) return;

                            let textoFila = fila.innerText.toUpperCase();
                            if (textoFila.includes("REQUIREMENT") || textoFila.includes("PARAMETER") || textoFila.includes("[CATEGORY]")) return;
                            if (textoFila.includes("EXTRA CONCLUSION") || textoFila.includes("PIECE DETAILS")) return;

                            if (textoFila.includes("RESULT") || textoFila.includes("TEST METHOD") || textoFila.includes("PFAS")) {
                                if (fila.querySelectorAll('input[type="text"]:not([readonly]):not([disabled])').length > 0) {
                                    camposLlenados += inyectarEnPiezasActivas(fila, 'Submitted', piezasActivas);
                                }
                            }
                        });

                        if (camposLlenados > 0) btnResults.innerText = `✅ (${camposLlenados})`;
                        else btnResults.innerText = '\u26A0\uFE0F Nada inyectado';
                        setTimeout(() => { btnResults.innerText = originalText; }, 3000);
                        return;
                    }

                    // Validación de PDF Subido
                    let itemsAvanzados = [];
                    try { itemsAvanzados = JSON.parse(localStorage.getItem('intertek_pdf_pruebas_data') || "[]"); } catch(e) {}
                    if (itemsAvanzados.length === 0 && !isFlammability) {
                        alert("Sube el PDF de pruebas primero.");
                        btnResults.innerText = originalText;
                        return;
                    }

                    // --- FLAMMABILITY (EXEMPT - Auto-llenado) ---
                    if (isFlammability) {
                        let camposLlenados = 0;
                        let piezasActivas = obtenerPiezasActivasUI();
                        if (piezasActivas.length === 0) { piezasActivas = ['A']; }

                        const filas = document.querySelectorAll('tr');
                        filas.forEach(fila => {
                            if (fila.querySelector('table')) return;
                            let textoFila = fila.innerText.toUpperCase();
                            if (textoFila.includes("REQUIREMENT") || textoFila.includes("[CATEGORY]")) return;
                            if (textoFila.includes("SAVE") || textoFila.includes("REFRESH")) return;
                            let rawHTML = fila.cells.length > 0 ? fila.cells[0].innerText.trim().toUpperCase() : "";
                            let cell1 = fila.cells.length > 1 ? fila.cells[1].innerText.trim().toUpperCase() : "";

                            if (rawHTML.includes("EXEMPTION") || cell1.includes("EXEMPTION") || textoFila.includes("EXEMPTION")) {
                                let count = inyectarEnPiezasActivas(fila, "Exempt*", piezasActivas);
                                if (count > 0) camposLlenados += count;
                            }
                        });

                        if (camposLlenados > 0) btnResults.innerText = `✅ (${camposLlenados})`;
                        else btnResults.innerText = '\u26A0\uFE0F Nada inyectado';
                        setTimeout(() => { btnResults.innerText = originalText; }, 3000);
                        return;

                    // --- PRUEBAS QUÍMICAS (CADMIUM, LEAD, PHTHALATES, METALES) ---
                    } else if (isChemicalTest) {
                        let globalLines = [];
                        let maxPages = Math.max(...itemsAvanzados.map(it => it.page), 1);
                        for (let p = 1; p <= maxPages; p++) {
                            let pageItems = itemsAvanzados.filter(it => it.page === p);
                            let linesY = {};
                            pageItems.forEach(it => {
                                let y = Math.round(it.y * 10) / 10;
                                let foundY = Object.keys(linesY).find(k => Math.abs(parseFloat(k) - y) < 5.0);
                                if (foundY) linesY[foundY].push(it);
                                else linesY[y] = [it];
                            });
                            let sortedY = Object.keys(linesY).sort((a, b) => parseFloat(b) - parseFloat(a));
                            sortedY.forEach(y => {
                                let rowItems = linesY[y];
                                rowItems.sort((a, b) => a.x - b.x);
                                globalLines.push({ page: p, text: rowItems.map(it => it.str).join(" ").trim().toUpperCase() });
                            });
                        }

                        function findResultForSection(sectionName) {
                            let foundSection = false;
                            for (let i = 0; i < globalLines.length; i++) {
                                let text = globalLines[i].text;
                                if (!foundSection) {
                                    if (text.includes(sectionName)) foundSection = true;
                                } else {
                                    if (text.includes("RESULTS:") || text.includes("RESULT:")) {
                                        if (text.includes("N/D") || text.includes(" ND") || text.endsWith("ND")) return "N/D";
                                        if (text.includes("N/A") || text.includes(" NA") || text.endsWith("NA")) return "N/A";
                                    }
                                }
                            }
                            return null;
                        }

                        let camposLlenados = 0;
                        let piezasActivas = obtenerPiezasActivasUI();
                        if (piezasActivas.length === 0) { piezasActivas = ['A']; }
                        const filas = document.querySelectorAll('tr');

                        if (isCadmium || isLeadSurface || isLeadSubstrate) {
                            let hasSurface = false;
                            let hasSubstrate = false;
                            let pdfRes = null;
                            let foundSection = false;

                            for (let i = 0; i < globalLines.length; i++) {
                                let text = globalLines[i].text;
                                if (!foundSection) {
                                    if (text.includes("CADMIUM/LEAD") || text.includes("CADMIUM / LEAD")) {
                                        foundSection = true;
                                    }
                                } else {
                                    if (text.includes("SUBPIEZA") || text.includes("SUB PIECE") || text.includes("SUB-PIECE") || text.includes("SUBPIECE") || text.includes("COMPONENTE")) {
                                        let parts = text.split(":");
                                        if (parts.length > 1 && parts[1].trim() !== "") {
                                            if (text.includes("SURFACE")) hasSurface = true;
                                            else hasSubstrate = true;
                                        }
                                    }
                                    if (text.includes("RESULTS:") || text.includes("RESULT:")) {
                                        if (text.includes("N/D") || text.includes(" ND") || text.endsWith("ND")) { pdfRes = "N/D"; break; }
                                        if (text.includes("N/A") || text.includes(" NA") || text.endsWith("NA")) { pdfRes = "N/A"; break; }
                                    }
                                    if (text === "PHTHALATE" || text === "METALES") break;
                                }
                            }

                            if (!pdfRes) {
                                btnResults.innerText = '⚠️ No se encontró CADMIUM/LEAD';
                                setTimeout(() => { btnResults.innerText = originalText; }, 4000);
                                return;
                            }

                            let finalValue = "";
                            if (isCadmium) {
                                finalValue = (pdfRes === "N/D") ? "ND" : "Document Review";
                            } else {
                                if (pdfRes === "N/A") {
                                    finalValue = "Document Review";
                                } else if (pdfRes === "N/D") {
                                    if (!hasSurface && !hasSubstrate) finalValue = "ND";
                                    else if (hasSurface && !hasSubstrate) {
                                        if (isLeadSurface) finalValue = "ND";
                                        if (isLeadSubstrate) finalValue = "Document Review";
                                    } else if (!hasSurface && hasSubstrate) {
                                        if (isLeadSurface) finalValue = "Document Review";
                                        if (isLeadSubstrate) finalValue = "ND";
                                    } else {
                                        finalValue = "ND";
                                    }
                                }
                            }

                            if (finalValue !== "") {
                                filas.forEach(fila => {
                                    if (fila.querySelector('table')) return;
                                    let htmlFila = fila.innerHTML.toUpperCase();
                                    if (htmlFila.includes("REFRESH") || htmlFila.includes("SAVE")) return;
                                    if (fila.querySelectorAll('input[type="text"], textarea').length > 0) {
                                        camposLlenados += inyectarEnPiezasActivas(fila, finalValue, piezasActivas);
                                    }
                                });
                            }

                        } else if (isPhthalates) {
                            let pdfRes = findResultForSection("PHTHALATE");
                            if (!pdfRes) {
                                btnResults.innerText = '⚠️ No se encontró PHTHALATE';
                                setTimeout(() => { btnResults.innerText = originalText; }, 4000);
                                return;
                            }

                            let dataRows = [];
                            filas.forEach(fila => {
                                if (fila.querySelector('table')) return;
                                let cell1 = fila.cells.length > 1 ? fila.cells[1].innerText.trim().toUpperCase() : "";
                                if (cell1.includes("PHTHALATE") || cell1.includes("PHTALATE")) {
                                    if (fila.querySelectorAll('input[type="text"], textarea').length > 0) {
                                        dataRows.push({ fila: fila, cellText: cell1 });
                                    }
                                }
                            });

                            dataRows.forEach((item, index) => {
                                let isLast = (index === dataRows.length - 1) || item.cellText.includes("SUM OF");
                                let valToInject = "";
                                if (pdfRes === "N/D" && !isLast) valToInject = "ND";
                                else if (pdfRes === "N/A" && isLast) valToInject = "Document Review";

                                if (valToInject !== "") {
                                    camposLlenados += inyectarEnPiezasActivas(item.fila, valToInject, piezasActivas);
                                }
                            });

                        } else if (isHeavyMetals) {
                            let pdfRes = findResultForSection("METALES");
                            if (!pdfRes) {
                                btnResults.innerText = '⚠️ No se encontró METALES';
                                setTimeout(() => { btnResults.innerText = originalText; }, 4000);
                                return;
                            }

                            let valToInject = "";
                            if (pdfRes === "N/D") valToInject = "ND";
                            else if (pdfRes === "N/A") valToInject = "Document Review";

                            if (valToInject !== "") {
                                filas.forEach(fila => {
                                    if (fila.querySelector('table')) return;
                                    let cell1 = fila.cells.length > 1 ? fila.cells[1].innerText.trim().toUpperCase() : "";
                                    if (cell1.includes("[TEST ITEM") || cell1.includes("[SUBSTANCE]") || (cell1.includes("(") && cell1.includes(")"))) {
                                        if (fila.querySelectorAll('input[type="text"], textarea').length > 0) {
                                            camposLlenados += inyectarEnPiezasActivas(fila, valToInject, piezasActivas);
                                        }
                                    }
                                });
                            }
                        }

                        if (camposLlenados > 0) btnResults.innerText = `✅ (${camposLlenados})`;
                        else btnResults.innerText = '\u26A0\uFE0F Nada inyectado';
                        setTimeout(() => { btnResults.innerText = originalText; }, 3000);
                        return;

                    // --- FORMALDEHYDE QUALITATIVE (Regla NEGRITA / BOLD) ---
                    } else if (isFormaldehydeQual) {
                        // REGLA SOLICITADA: Siempre poner "Negative" sin importar el PDF
                        let camposLlenados = 0;
                        let piezasActivas = obtenerPiezasActivasUI();
                        if (piezasActivas.length === 0) { piezasActivas = ['A']; }

                        const filas = document.querySelectorAll('tr');
                        filas.forEach(fila => {
                            if (fila.querySelector('table')) return;
                            let textoFila = fila.innerText.toUpperCase();
                            if (textoFila.includes("REQUIREMENT") || textoFila.includes("[CATEGORY]")) return;
                            if (textoFila.includes("EXTRA CONCLUSION") || textoFila.includes("PIECE DETAILS")) return;

                            if (textoFila.includes("FORMALDEHYDE") || textoFila.includes("RESULT") || textoFila.includes("OBSERVATION") || textoFila.includes("TRIAL")) {
                                let inputs = Array.from(fila.querySelectorAll('input, textarea')).filter(inp => { let type = inp.type ? inp.type.toLowerCase() : 'text'; return !(type === 'hidden' || type === 'submit' || type === 'button' || type === 'checkbox' || type === 'radio' || inp.style.display === 'none' || inp.readOnly || inp.disabled); });

                                for (let k = 0; k < inputs.length && k < piezasActivas.length; k++) {
                                    inputs[k].value = "Negative";
                                    // Simular eventos para que la plataforma lo guarde
                                    let ev = new Event('change', { bubbles: true });
                                    inputs[k].dispatchEvent(ev);
                                    let ev2 = new Event('input', { bubbles: true });
                                    inputs[k].dispatchEvent(ev2);
                                    
                                    camposLlenados++;
                                }
                            }
                        });

                        if (camposLlenados > 0) btnResults.innerText = '\u2705 (' + camposLlenados + ')';
                        else btnResults.innerText = '\u26A0\uFE0F Nada inyectado';
                        setTimeout(() => { btnResults.innerText = originalText; }, 3000);
                        return;
                    } else if (isFormaldehydeQuant) {
                        let pagesData = {};
                        let maxPages = 0;
                        itemsAvanzados.forEach(item => { if (item.page > maxPages) maxPages = item.page; });

                        for (let p = 1; p <= maxPages; p++) {
                            let pageItems = itemsAvanzados.filter(it => it.page === p);
                            if (pageItems.length === 0) continue;

                            let pageText = pageItems.map(it => it.str).join(" ").toUpperCase();
                            if (!pageText.includes("FORMALDEHYDE")) continue;

                            let tipoPieza = "A";
                            if (pageText.includes("FABRIC/PRINT") || pageText.includes("FABRIC & PRINT") || (pageText.includes("FABRIC") && pageText.includes("PRINT"))) {
                                tipoPieza = "FABRIC&PRINT";
                            } else if (pageText.includes("HEAT TRANSFER") || pageText.includes("HEATTRANSFER")) {
                                tipoPieza = "HEATTRANSFER";
                            } else if (pageText.includes("PRINT")) {
                                tipoPieza = "PRINT";
                            } else if (pageText.includes("FABRIC")) {
                                tipoPieza = "FABRIC";
                            }

                            let absorbency = "";
                            let concentration = "";
                            let absorbencyX = 0;
                            let absorbencyY = 0;

                            for (let i = 0; i < pageItems.length; i++) {
                                let txt = pageItems[i].str.trim().toUpperCase();
                                if (txt.includes("MUESTRA CORREGIDA") || txt.includes("(AR)") || txt.includes("CORRECTED SAMPLE")) {
                                    let yBase = pageItems[i].y;
                                    for (let j = i + 1; j < i + 15 && j < pageItems.length; j++) {
                                        if (Math.abs(pageItems[j].y - yBase) < 15) {
                                            let val = pageItems[j].str.trim();
                                            if (/^[0-9.]+$/.test(val)) {
                                                absorbency = val;
                                                absorbencyX = pageItems[j].x;
                                                absorbencyY = pageItems[j].y;
                                                break;
                                            }
                                        }
                                    }
                                    if (absorbency) break;
                                }
                            }

                            if (absorbency) {
                                let num = parseFloat(absorbency);
                                if (!isNaN(num)) {
                                    absorbency = (Math.round(num * 100 + Number.EPSILON) / 100).toFixed(2);
                                }
                            }

                            // 1. Intentar buscar Concentration horizontalmente a la derecha de Absorbency
                            if (absorbencyX > 0 && absorbencyY > 0) {
                                let minXDiff = 9999;
                                for (let j = 0; j < pageItems.length; j++) {
                                    let item = pageItems[j];
                                    // Relajamos la Y a 15px para soportar PDFs mal alineados
                                    if (Math.abs(item.y - absorbencyY) < 15 && item.x > absorbencyX + 5) {
                                        let val = item.str.trim();
                                        if (/^[0-9.]+$/.test(val) || val === "BRL" || val === "ND") {
                                            let diff = item.x - absorbencyX;
                                            if (diff < minXDiff) {
                                                minXDiff = diff;
                                                concentration = val;
                                            }
                                        }
                                    }
                                }
                            }

                            // 2. Si no se encontró horizontalmente, buscar verticalmente
                            if (!concentration) {
                                for (let i = 0; i < pageItems.length; i++) {
                                    let txt = pageItems[i].str.trim().toUpperCase();
                                    if (txt.includes("PPM") || txt.includes("METHOD B") || txt.includes("METODO B")) {
                                        let xBase = pageItems[i].x;
                                        let yBase = pageItems[i].y;
                                        for (let j = 0; j < pageItems.length; j++) {
                                            if (Math.abs(pageItems[j].x - xBase) < 80 && pageItems[j].y < yBase + 10 && pageItems[j].y > yBase - 80) {
                                                let val = pageItems[j].str.trim();
                                                if (/^[0-9.]+$/.test(val) || val === "BRL" || val === "ND") {
                                                    concentration = val;
                                                    break;
                                                }
                                            }
                                        }
                                    }
                                    if (concentration) break;
                                }
                            }

                            // Si encontró un número en concentration, redondearlo a 2 decimales
                            if (concentration && /^[0-9.]+$/.test(concentration)) {
                                let num = parseFloat(concentration);
                                if (!isNaN(num)) {
                                    concentration = (Math.round(num * 100 + Number.EPSILON) / 100).toFixed(2);
                                }
                            }

                            if (absorbency || concentration) {
                                pagesData[tipoPieza] = { absorbency, concentration };
                            }
                        }

                        if (Object.keys(pagesData).length === 0) {
                            btnResults.innerText = '\u26A0\uFE0F Sin resultado (Formaldehyde)';
                            setTimeout(() => { btnResults.innerText = originalText; }, 4000);
                            return;
                        }

                        let camposLlenados = 0;
                        let piezasActivas = obtenerPiezasActivasUI();
                        if (piezasActivas.length === 0) { piezasActivas = ['A']; }

                        const filas = document.querySelectorAll('tr');
                        let currentReading = "";

                        filas.forEach(fila => {
                            if (fila.querySelector('table')) return;

                            let rawHTML = fila.cells.length > 0 ? fila.cells[0].innerText.trim().toUpperCase() : "";
                            let cell1 = fila.cells.length > 1 ? fila.cells[1].innerText.trim().toUpperCase() : "";

                            if (rawHTML !== "") {
                                if (rawHTML.includes("ABSORBENCY")) currentReading = "absorbency";
                                else if (rawHTML.includes("CONCENTRATION")) currentReading = "concentration";
                            }

                            if (!currentReading) return;

                            if (cell1.includes("SPECIMEN") || cell1.includes("AVERAGE") || cell1.includes("HIGHEST")) {
                                let inyectados = 0;
                                const inputs = Array.from(fila.querySelectorAll('input, textarea')).filter(inp => {
                                    let type = inp.type ? inp.type.toLowerCase() : 'text';
                                    if (type === 'hidden' || type === 'submit' || type === 'button' || type === 'checkbox' || type === 'radio') return false;
                                    if (inp.style.display === 'none') return false;
                                    return true;
                                });

                                for (let k = 0; k < inputs.length && k < piezasActivas.length; k++) {
                                    let keyPieza = piezasActivas[k];
                                    let tipo = "A";

                                    if (keyPieza.includes("_FABRIC&PRINT")) tipo = "FABRIC&PRINT";
                                    else if (keyPieza.includes("_FABRIC")) tipo = "FABRIC";
                                    else if (keyPieza.includes("_PRINT")) tipo = "PRINT";
                                    else if (keyPieza.includes("_HEATTRANSFER")) tipo = "HEATTRANSFER";

                                    let data = pagesData[tipo] || pagesData["A"];

                                    if (!data && Object.keys(pagesData).length === 1) {
                                        data = pagesData[Object.keys(pagesData)[0]];
                                    }

                                    if (data) {
                                        let valor = currentReading === "absorbency" ? data.absorbency : data.concentration;
                                        if (valor !== undefined && valor !== null && valor !== "") {
                                            if (inputs[k].disabled) inputs[k].disabled = false;
                                            if (inputs[k].readOnly) inputs[k].readOnly = false;
                                            inputs[k].value = valor;
                                            triggerEvents(inputs[k]);
                                            inyectados++;
                                        }
                                    }
                                }
                                camposLlenados += inyectados;
                            }
                        });

                        if (camposLlenados > 0) btnResults.innerText = `✅ (${camposLlenados})`;
                        else btnResults.innerText = '\u26A0\uFE0F Nada inyectado';
                        setTimeout(() => { btnResults.innerText = originalText; }, 3000);
                        return;

                    // --- COLOR FASTNESS TO CROCKING / RUBBING ---
                    } else if (isCrocking) {
                        let pagesData = {};
                        let maxPages = 0;
                        itemsAvanzados.forEach(item => { if (item.page > maxPages) maxPages = item.page; });

                        for (let p = 1; p <= maxPages; p++) {
                            let pageItems = itemsAvanzados.filter(it => it.page === p);
                            if (pageItems.length === 0) continue;

                            let pageText = pageItems.map(it => it.str).join(" ").toUpperCase();
                            if (!pageText.includes("CROCKING") && !pageText.includes("RUBBING")) continue;

                            let tipoPieza = "A";
                            if (pageText.includes("FABRIC/PRINT") || pageText.includes("FABRIC & PRINT") || (pageText.includes("FABRIC") && pageText.includes("PRINT"))) {
                                tipoPieza = "FABRIC&PRINT";
                            } else if (pageText.includes("HEAT TRANSFER")) {
                                tipoPieza = "HEATTRANSFER";
                            } else if (pageText.includes("PRINT")) {
                                tipoPieza = "PRINT";
                            } else if (pageText.includes("FABRIC")) {
                                tipoPieza = "FABRIC";
                            }

                            let dryX = -1, wetX = -1, warpX = -1, weftX = -1;
                            pageItems.forEach(it => {
                                let txt = it.str.trim().toUpperCase();
                                if (txt === "DRY") dryX = it.x;
                                else if (txt === "WET") wetX = it.x;
                                else if (txt === "WARP") warpX = it.x;
                                else if (txt === "WEFT") weftX = it.x;
                            });

                            let crockItem = pageItems.find(it => it.str.trim().toUpperCase() === "CROCKING 1" || it.str.trim().toUpperCase() === "CROCKING");
                            if (crockItem) {
                                let yBase = crockItem.y;
                                let lineItems = pageItems.filter(it => Math.abs(it.y - yBase) < 15);
                                lineItems.sort((a, b) => a.x - b.x);

                                let vals = lineItems.filter(it => it.x > crockItem.x + 20 && /^[0-9.]+$/.test(it.str.trim()));

                                let lDry="", lWet="", wDry="", wWet="";

                                if (dryX !== -1) { let it = vals.find(v => Math.abs(v.x - dryX) < 25); if (it) lDry = it.str.trim(); }
                                if (wetX !== -1) { let it = vals.find(v => Math.abs(v.x - wetX) < 25); if (it) lWet = it.str.trim(); }
                                if (warpX !== -1) { let it = vals.find(v => Math.abs(v.x - warpX) < 25); if (it) wDry = it.str.trim(); }
                                if (weftX !== -1) { let it = vals.find(v => Math.abs(v.x - weftX) < 25); if (it) wWet = it.str.trim(); }

                                if (!lDry && !lWet) {
                                    let trueVals = vals.filter(v => v.x > crockItem.x + 40);
                                    if (trueVals.length >= 4) {
                                        lDry = trueVals[0].str.trim();
                                        lWet = trueVals[1].str.trim();
                                        wDry = trueVals[2].str.trim();
                                        wWet = trueVals[3].str.trim();
                                    } else if (trueVals.length >= 2) {
                                        lDry = trueVals[0].str.trim();
                                        lWet = trueVals[1].str.trim();
                                    }
                                }

                                if (lDry || lWet || wDry || wWet) {
                                    let isDigiEye = false;
                                    [lDry, lWet, wDry, wWet].forEach(val => {
                                        if (val && val.includes(".")) {
                                            let decs = val.split(".")[1].trim();
                                            if (decs.length >= 2) isDigiEye = true;
                                        }
                                    });

                                    pagesData[tipoPieza] = {
                                        lengthwise_dry: lDry,
                                        lengthwise_wet: lWet,
                                        widthwise_dry: wDry,
                                        widthwise_wet: wWet,
                                        isDigiEye: isDigiEye
                                    };
                                }
                            }
                        }

                        if (Object.keys(pagesData).length === 0) {
                            btnResults.innerText = '\u26A0\uFE0F Sin resultado (Crocking)';
                            setTimeout(() => { btnResults.innerText = originalText; }, 4000);
                            return;
                        }

                        let camposLlenados = 0;
                        let piezasActivas = obtenerPiezasActivasUI();
                        if (piezasActivas.length === 0) { piezasActivas = ['A']; }

                        const filas = document.querySelectorAll('tr');
                        let currentReadingGroup = "";
                        let currentMode = "";

                        filas.forEach(fila => {
                            if (fila.querySelector('table')) return;

                            let rawHTML = fila.cells.length > 0 ? fila.cells[0].innerText.trim().toUpperCase() : "";
                            let cell1 = fila.cells.length > 1 ? fila.cells[1].innerText.trim().toUpperCase() : "";
                            let rowText = fila.innerText.toUpperCase();

                            if (rawHTML !== "") {
                                if (rawHTML.includes("LENGTHWISE")) currentReadingGroup = "LENGTHWISE";
                                else if (rawHTML.includes("WIDTHWISE") || rawHTML.includes("CROSSWISE")) currentReadingGroup = "WIDTHWISE";

                                if (rawHTML.includes("VISUAL")) currentMode = "VISUAL";
                                else if (rawHTML.includes("DIGIEYE") || rawHTML.includes("DIGI EYE") || rawHTML.includes("DIGEYE")) currentMode = "DIGIEYE";
                            }

                            if (!currentReadingGroup || !currentMode) return;

                            if (cell1.includes("CHINA") || rowText.includes("CHINA")) return;

                            let prop = "";
                            if (cell1 === "DRY") prop = "dry";
                            else if (cell1 === "WET") prop = "wet";

                            if (prop !== "") {
                                let inyectados = 0;
                                const inputs = Array.from(fila.querySelectorAll('input, textarea')).filter(inp => {
                                    let type = inp.type ? inp.type.toLowerCase() : 'text';
                                    return !(type === 'hidden' || type === 'submit' || type === 'button' || type === 'checkbox' || type === 'radio' || inp.style.display === 'none');
                                });

                                for (let k = 0; k < inputs.length && k < piezasActivas.length; k++) {
                                    let keyPieza = piezasActivas[k];
                                    let tipo = "A";

                                    if (keyPieza.includes("_FABRIC&PRINT")) tipo = "FABRIC&PRINT";
                                    else if (keyPieza.includes("_FABRIC")) tipo = "FABRIC";
                                    else if (keyPieza.includes("_PRINT")) tipo = "PRINT";
                                    else if (keyPieza.includes("_HEATTRANSFER")) tipo = "HEATTRANSFER";

                                    let data = pagesData[tipo] || pagesData["A"];

                                    if (!data && Object.keys(pagesData).length === 1) {
                                        data = pagesData[Object.keys(pagesData)[0]];
                                    }

                                    if (data) {
                                        if (currentMode === "VISUAL" && data.isDigiEye) continue;
                                        if (currentMode === "DIGIEYE" && !data.isDigiEye) continue;

                                        let valor = "";
                                        if (currentReadingGroup === "LENGTHWISE" && prop === "dry") valor = data.lengthwise_dry;
                                        else if (currentReadingGroup === "LENGTHWISE" && prop === "wet") valor = data.lengthwise_wet;
                                        else if (currentReadingGroup === "WIDTHWISE" && prop === "dry") valor = data.widthwise_dry;
                                        else if (currentReadingGroup === "WIDTHWISE" && prop === "wet") valor = data.widthwise_wet;

                                        if (valor && valor !== "") {
                                            if (inputs[k].disabled) inputs[k].disabled = false;
                                            if (inputs[k].readOnly) inputs[k].readOnly = false;
                                            inputs[k].value = valor;
                                            triggerEvents(inputs[k]);
                                            inyectados++;
                                        }
                                    }
                                }
                                camposLlenados += inyectados;
                            }
                        });

                        if (camposLlenados > 0) btnResults.innerText = `✅ (${camposLlenados})`;
                        else btnResults.innerText = '\u26A0\uFE0F Nada inyectado';
                        setTimeout(() => { btnResults.innerText = originalText; }, 3000);
                        return;

                    // --- FIBER CONTENT ---
                    } else if (testSeleccionado.includes("FIBER CONTENT") || testSeleccionado.includes("FIBER")) {
                        let linesByPage = {};
                        itemsAvanzados.forEach(item => {
                            if (!linesByPage[item.page]) linesByPage[item.page] = {};
                            let linesY = linesByPage[item.page];
                            let y = Math.round(item.y * 10) / 10;
                            let foundY = Object.keys(linesY).find(k => Math.abs(parseFloat(k) - y) < 4.0);
                            if (foundY) { linesY[foundY].push(item); }
                            else { linesY[y] = [item]; }
                        });

                        let rows = [];
                        let pages = Object.keys(linesByPage).sort((a, b) => parseInt(a) - parseInt(b));
                        pages.forEach(p => {
                            let linesY = linesByPage[p];
                            let sortedY = Object.keys(linesY).sort((a, b) => parseFloat(b) - parseFloat(a));
                            sortedY.forEach(y => {
                                let rowItems = linesY[y];
                                rowItems.sort((a, b) => a.x - b.x);
                                rows.push(rowItems);
                            });
                        });

                        let fibers = { 1: "", 2: "", 3: "", 4: "" };
                        let percentages = { 1: "", 2: "", 3: "", 4: "" };

                        let inCualitative = false;
                        let inAverage = false;

                        for (let i = 0; i < rows.length; i++) {
                            let textFila = rows[i].map(x => x.str.trim()).join(" ").toUpperCase();

                            if (textFila.includes("CUALITATIV") || textFila.includes("QUALITATIVE")) {
                                inCualitative = true;
                                inAverage = false;
                            } else if (textFila.includes("CUANTITATIV") || textFila.includes("QUANTITATIVE")) {
                                inCualitative = false;
                            } else if (textFila.includes("FIBER AVERAGE") || textFila.includes("PROMEDIO POR FIBRA") || textFila.includes("PROMEDIO GENERAL")) {
                                inCualitative = false;
                                inAverage = true;
                            }

                            if (inCualitative) {
                                for (let f = 1; f <= 4; f++) {
                                    let fiberItem = rows[i].find(it => it.str.toUpperCase().includes(`FIBRA ${f}`) || it.str.toUpperCase().includes(`FIBER ${f}`));
                                    if (fiberItem) {
                                        let itemsToRight = rows[i].filter(it => it.x > fiberItem.x + 20 && (!it.str.toUpperCase().includes("FIBRA") && !it.str.toUpperCase().includes("FIBER")));
                                        itemsToRight = itemsToRight.filter(it => it.str.trim() !== "" && it.str.trim() !== ":" && it.str.trim() !== "/");
                                        itemsToRight.sort((a,b) => a.x - b.x);
                                        if (itemsToRight.length > 0) {
                                            fibers[f] = itemsToRight[0].str.trim();
                                            if (itemsToRight.length > 1 && (itemsToRight[1].x - itemsToRight[0].x) < 40) {
                                                 fibers[f] += " " + itemsToRight[1].str.trim();
                                            }
                                        }
                                    }
                                }
                            }

                            if (inAverage) {
                                for (let f = 1; f <= 4; f++) {
                                    let fiberItem = rows[i].find(it => it.str.toUpperCase().includes(`FIBRA ${f}`) || it.str.toUpperCase().includes(`FIBER ${f}`));
                                    if (fiberItem) {
                                        let limitX = fiberItem.x + 380; // Ampliado para atrapar el 100.0 pero sin llegar al margen derecho
                                        let otherFibers = rows[i].filter(it => (it.str.toUpperCase().includes("FIBRA") || it.str.toUpperCase().includes("FIBER")) && it.x > fiberItem.x + 10);
                                        if (otherFibers.length > 0) {
                                            otherFibers.sort((a,b) => a.x - b.x);
                                            limitX = Math.min(limitX, otherFibers[0].x);
                                        }

                                        let pageItems = itemsAvanzados.filter(it => it.page === fiberItem.page);
                                        let itemsInBox = pageItems.filter(it => 
                                            it.x > fiberItem.x + 10 && 
                                            it.x < limitX && 
                                            Math.abs(it.y - fiberItem.y) < 15 && 
                                            !it.str.toUpperCase().includes("FIBRA") && 
                                            !it.str.toUpperCase().includes("FIBER")
                                        );
                                        
                                        itemsInBox = itemsInBox.filter(it => it.str.trim() !== "" && it.str.trim() !== ":" && it.str.trim() !== "/");
                                        itemsInBox.sort((a,b) => a.x - b.x); // Ordenamos de izquierda a derecha

                                        let nums = itemsInBox.map(it => it.str.replace(/[^0-9.]/g, '')).filter(x => x !== "" && x !== ".");
                                        // Filtramos los n�meros que sean razonables para un porcentaje (<= 100.01)
                                        // Esto autom�ticamente descarta n�meros grandes como c�digos de prueba (ej: 829)
                                        let validNums = nums.map(n => parseFloat(n)).filter(n => !isNaN(n) && n <= 100.01);
                                        
                                        if (validNums.length > 0) {
                                            // Tomamos el �LTIMO n�mero v�lido de izquierda a derecha.
                                            // Si hay factor y porcentaje, el porcentaje siempre est� a la derecha del factor.
                                            let pNum = validNums[validNums.length - 1];
                                            percentages[f] = pNum.toString();
                                        }
                                    }
                                }
                            }
                        }

                        let numFibers = 0;
                        for (let num of [1, 2, 3, 4]) {
                            if (fibers[num] && fibers[num].trim() !== "") {
                                numFibers++;
                            }
                        }

                        let fibersArr = [];
                        for (let num of [1, 2, 3, 4]) {
                            let fib = fibers[num];
                            let perc = percentages[num];
                            
                            if (fib && fib.trim() !== "") {
                                if (numFibers === 1) {
                                    perc = "100";
                                }
                                
                                if (perc) {
                                    let val = parseFloat(perc.replace(/[^0-9.]/g, ''));
                                    if (!isNaN(val) && val > 0) {
                                        let fibName = fib.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                                        let cleanPerc = perc.includes('%') ? perc : perc + '%';
                                        fibersArr.push(cleanPerc + " " + fibName);
                                    }
                                }
                            }
                        }

                        let finalResult = fibersArr.join(" ");

                        if (finalResult) {
                            let camposLlenados = 0;
                            let piezasActivas = obtenerPiezasActivasUI();
                            if (piezasActivas.length === 0) { piezasActivas = ['A']; }

                            const filas = document.querySelectorAll('tr');

                            // Detectar si la UI est� dividida por fibras (ej: [Test Result] Cotton)
                            let isSplitUI = false;
                            filas.forEach(fila => {
                                let t = fila.innerText.toUpperCase();
                                if (t.includes("TEST RESULT")) {
                                    for (let num of [1, 2, 3, 4]) {
                                        if (fibers[num] && fibers[num].trim() !== "") {
                                            let fibNameUpper = fibers[num].trim().toUpperCase();
                                            let regex = new RegExp("\\b" + fibNameUpper + "\\b");
                                            if (regex.test(t)) isSplitUI = true;
                                        }
                                    }
                                }
                            });

                            filas.forEach(fila => {
                                if (fila.querySelector('table')) return;

                                let textoFila = fila.innerText.toUpperCase();
                                if (textoFila.includes("REQUIREMENT") || textoFila.includes("PARAMETER") || textoFila.includes("[CATEGORY]")) return;
                                if (textoFila.includes("EXTRA CONCLUSION") || textoFila.includes("PIECE DETAILS")) return;

                                if (textoFila.includes("TEST RESULT") || textoFila.includes("TEST METHOD")) {
                                    if (fila.querySelectorAll('input[type="text"]:not([readonly]):not([disabled])').length > 0) {
                                        if (isSplitUI) {
                                            // Inyectar solo si la fila corresponde a una fibra encontrada
                                            let matchedFiber = false;
                                            let textToInject = "";
                                            for (let num of [1, 2, 3, 4]) {
                                                if (fibers[num] && fibers[num].trim() !== "") {
                                                    let fibNameUpper = fibers[num].trim().toUpperCase();
                                                    let regex = new RegExp("\\b" + fibNameUpper + "\\b");
                                                    if (regex.test(textoFila)) {
                                                        matchedFiber = true;
                                                        let perc = percentages[num];
                                                        if (numFibers === 1) perc = "100";
                                                        if (perc) {
                                                            let val = parseFloat(perc.replace(/[^0-9.]/g, ''));
                                                            if (!isNaN(val) && val > 0) {
                                                                let fibName = fibers[num].toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                                                                let cleanPerc = perc.includes('%') ? perc : perc + '%';
                                                                textToInject = cleanPerc;
                                                            }
                                                        }
                                                        break;
                                                    }
                                                }
                                            }
                                            if (matchedFiber && textToInject !== "") {
                                                camposLlenados += inyectarEnPiezasActivas(fila, textToInject, piezasActivas);
                                            }
                                        } else {
                                            // UI normal combinada
                                            camposLlenados += inyectarEnPiezasActivas(fila, finalResult, piezasActivas);
                                        }
                                    }
                                }
                            });

                            if (camposLlenados > 0) {
                                btnResults.innerText = '\u2705 (' + camposLlenados + ')';
                            } else {
                                btnResults.innerText = '\u26A0\uFE0F Nada inyectado';
                            }
                            setTimeout(() => { btnResults.innerText = originalText; }, 3000);
                            return;
                        } else {
                            btnResults.innerText = '\u26A0\uFE0F Sin resultado (Fiber)';
                            setTimeout(() => { btnResults.innerText = originalText; }, 3000);
                            return;
                        }

                    // --- DIMENSIONAL STABILITY (SHRINKAGE) ---
                    } else if ((testSeleccionado.includes("DIMENSIONAL STABILITY") || testSeleccionado.includes("SHRINKAGE")) && !testSeleccionado.includes("APPEARANCE") && !testSeleccionado.includes("TORQUE")) {
                        let linesByPage = {};
                        itemsAvanzados.forEach(item => {
                            if (!linesByPage[item.page]) linesByPage[item.page] = {};
                            let linesY = linesByPage[item.page];
                            let y = Math.round(item.y * 10) / 10;
                            let foundY = Object.keys(linesY).find(k => Math.abs(parseFloat(k) - y) < 4.0);
                            if (foundY) { linesY[foundY].push(item); }
                            else { linesY[y] = [item]; }
                        });
                        let rows = [];
                        let pages = Object.keys(linesByPage).sort((a, b) => parseInt(a) - parseInt(b));
                        pages.forEach(p => {
                            let linesY = linesByPage[p];
                            let sortedY = Object.keys(linesY).sort((a, b) => parseFloat(b) - parseFloat(a));
                            sortedY.forEach(y => {
                                let rowItems = linesY[y];
                                rowItems.sort((a, b) => a.x - b.x);
                                rows.push(rowItems);
                            });
                        });
                        function roundAndFormat(numStr) {
                            if (!numStr) return "";
                            let cleanStr = numStr.replace(/[^0-9.\-]/g, "");
                            if (!cleanStr) return "";
                            let num = parseFloat(cleanStr);
                            if (isNaN(num)) return numStr;
                            let isNeg = num < 0;
                            let absNum = Math.abs(num);
                            let roundedAbs = (Math.round(absNum * 10) / 10).toFixed(1);

                            if (parseFloat(roundedAbs) === 0) {
                                return "0.0";
                            }

                            if (isNeg) {
                                return "(-) " + roundedAbs;
                            } else {
                                return "(+) " + roundedAbs;
                            }
                        }
                        // --- RUTINA GARMENT ---
                        if (testSeleccionado.includes("GARMENT")) {
                            let garmentResults = {
                                "TOP": {},
                                "BOTTOM": {},
                                "UNDERWEAR": {},
                                "OTHER": {}
                            };

                            let colOriginal = -1;
                            let colAfter = -1;
                            let colShrinkage = -1;
                            let currentPdfSection = "TOP";
                            let foundHeaders = false;
                            for (let i = 0; i < rows.length; i++) {
                                let textFila = rows[i].map(x => x.str.trim()).join(" ").toUpperCase();

                                if (!foundHeaders && textFila.includes("ORIGINAL") && textFila.includes("AFTER") && (textFila.includes("SHRINKAGE") || textFila.includes("CHANGE"))) {
                                    let origItem = rows[i].find(it => it.str.toUpperCase().includes("ORIGINAL"));
                                    let afterItem = rows[i].find(it => it.str.toUpperCase().includes("AFTER"));
                                    let shrinkItem = rows[i].find(it => it.str.toUpperCase().includes("SHRINKAGE") || it.str.toUpperCase().includes("CHANGE"));

                                    if (origItem) colOriginal = origItem.x;
                                    if (afterItem) colAfter = afterItem.x;
                                    if (shrinkItem) colShrinkage = shrinkItem.x;

                                    if (colOriginal !== -1 && colAfter !== -1 && colShrinkage !== -1) {
                                        foundHeaders = true;
                                    }
                                    continue;
                                }
                                if (foundHeaders) {
                                    let nameItems = rows[i].filter(item => item.x < colOriginal - 30 && item.str.trim() !== "");
                                    if (nameItems.length > 0) {
                                        let partName = nameItems.map(it => it.str.trim()).join(" ").toUpperCase();

                                        if (partName.includes("ORIGINAL") || partName.includes("AFTER")) continue;
                                        let originalItems = rows[i].filter(item => item.x >= colOriginal - 30 && item.x < colAfter - 30 && item.str.trim() !== "");
                                        let afterItems = rows[i].filter(item => item.x >= colAfter - 30 && item.x < colShrinkage - 30 && item.str.trim() !== "");

                                        for (let j = 0; j < rows[i].length - 1; j++) {
                                            if (["-", "–"].includes(rows[i][j].str.trim())) {
                                                if (rows[i][j+1].str.match(/^\s*\d/)) {
                                                    if (Math.abs(rows[i][j+1].x - rows[i][j].x) < 20) {
                                                        rows[i][j+1].str = "-" + rows[i][j+1].str.trim();
                                                        rows[i][j].str = "";
                                                    }
                                                }
                                            }
                                        }
                                        let shrinkageItems = rows[i].filter(item => item.x >= colShrinkage - 30 && item.str.trim() !== "");
                                        if (originalItems.length === 0 && afterItems.length === 0 && shrinkageItems.length === 0) {
                                             if (partName.match(/\bTOPS?\b/)) currentPdfSection = "TOP";
                                             else if (partName.match(/\bBOTTOMS?\b/) || partName.match(/\bPANTS?\b/)) currentPdfSection = "BOTTOM";
                                             else if (partName.match(/\bUNDERWEAR\b/)) currentPdfSection = "UNDERWEAR";
                                             else if (partName.match(/\bOTHERS?\b/)) currentPdfSection = "OTHER";
                                             continue;
                                        }
                                        originalItems.sort((a,b) => a.x - b.x);
                                        let origVal = originalItems.map(it => it.str.trim()).join(" ");
                                        afterItems.sort((a,b) => a.x - b.x);
                                        let afterVal = afterItems.map(it => it.str.trim()).join(" ");
                                        shrinkageItems.sort((a,b) => a.x - b.x);
                                        let shrinkVal = shrinkageItems.map(it => it.str.trim()).join("").replace(" ", "");
                                        if (origVal || afterVal || shrinkVal) {
                                            if (!garmentResults[currentPdfSection]) garmentResults[currentPdfSection] = {};
                                            let simpleName = partName.split("(")[0].trim();
                                            garmentResults[currentPdfSection][simpleName] = {
                                                original: origVal,
                                                after: afterVal,
                                                shrinkage: shrinkVal
                                            };
                                        }
                                    }
                                }
                            }
                            if (!foundHeaders || (Object.keys(garmentResults["TOP"] || {}).length === 0 && Object.keys(garmentResults["BOTTOM"] || {}).length === 0)) {
                                btnResults.innerText = '\u26A0\uFE0F Sin resultado (Garment)';
                                setTimeout(() => { btnResults.innerText = originalText; }, 4000);
                                return;
                            }
                            let camposLlenados = 0;
                            let piezasActivas = obtenerPiezasActivasUI();
                            if (piezasActivas.length === 0) { piezasActivas = ['A']; }
                            const filas = document.querySelectorAll('tr');
                            let currentReading = "";
                            let currentSectionUI = "TOP";
                            filas.forEach(fila => {
                                if (fila.querySelector('table')) return;

                                let textoFila = fila.innerText.toUpperCase();
                                if (textoFila.includes("REQUIREMENT") || textoFila.includes("PARAMETER") || textoFila.includes("[CATEGORY]")) return;
                                if (textoFila.includes("EXTRA CONCLUSION") || textoFila.includes("PIECE DETAILS")) return;
                                if (textoFila.includes("SAVE") || textoFila.includes("REFRESH")) return;
                                let rawHTML = fila.cells.length > 0 ? fila.cells[0].innerText.trim().toUpperCase() : "";
                                let cell1 = fila.cells.length > 1 ? fila.cells[1].innerText.trim().toUpperCase() : "";

                                if (rawHTML !== "") {
                                    if (rawHTML.includes("ORIGINAL")) currentReading = "original";
                                    else if (rawHTML.includes("AFTER")) currentReading = "after";
                                    else if (rawHTML.includes("CHANGE") || rawHTML.includes("SHRINKAGE")) currentReading = "shrinkage";
                                }
                                if (cell1.includes("**TOP**")) currentSectionUI = "TOP";
                                else if (cell1.includes("**BOTTOM**")) currentSectionUI = "BOTTOM";
                                else if (cell1.includes("**UNDERWEAR**")) currentSectionUI = "UNDERWEAR";
                                if (!currentReading) return;
                                if (cell1.includes("[PART]")) {
                                    let partName = cell1.replace("[PART]", "").replace(":", "").trim().toUpperCase();

                                    let sectionData = garmentResults[currentSectionUI];
                                    if (sectionData) {
                                        let matchKey = Object.keys(sectionData).find(k => k.includes(partName) || partName.includes(k));
                                        if (matchKey) {
                                            let resultObj = sectionData[matchKey];
                                            let valToInject = "";

                                            if (currentReading === "original") valToInject = resultObj.original;
                                            else if (currentReading === "after") valToInject = resultObj.after;
                                            else if (currentReading === "shrinkage") {
                                                if (resultObj.shrinkage && !resultObj.shrinkage.includes("DIV/0")) {
                                                    valToInject = roundAndFormat(resultObj.shrinkage);
                                                }
                                            }

                                            if (valToInject && valToInject.trim() !== "" && !valToInject.includes("DIV/0")) {
                                                camposLlenados += inyectarEnPiezasActivas(fila, valToInject, piezasActivas);
                                            }
                                        }
                                    }
                                }
                            });
                            if (camposLlenados > 0) {
                                btnResults.innerText = `✅ (${camposLlenados})`;
                            } else {
                                btnResults.innerText = '\u26A0\uFE0F Nada inyectado';
                            }
                            setTimeout(() => { btnResults.innerText = originalText; }, 3000);
                            return;
                        // --- RUTINA FABRIC (La clásica) ---
                        } else {
                            let shrinkageResults = {
                                "#1": { length: "", width: "" },
                                "#2": { length: "", width: "" },
                                "#3": { length: "", width: "" },
                                "AVERAGE": { length: "", width: "" }
                            };
                            let headerDCL_X = -1;
                            let headerDCW_X = -1;
                            let specCount = 1;
                            let foundAverageRow = false;
                            let passedHeader = false;
                            for (let i = 0; i < rows.length; i++) {
                                let textFila = rows[i].map(x => x.str.trim()).join(" ").toUpperCase();
                                if (!passedHeader) {
                                    if ((textFila.includes("DC-L") && textFila.includes("DC-W")) || (textFila.includes("LENGTH") && textFila.includes("WIDTH"))) {
                                        rows[i].forEach(item => {
                                            let s = item.str.toUpperCase();
                                            if (s.includes("DC-L") || s.includes("LENGTH")) headerDCL_X = item.x;
                                            if (s.includes("DC-W") || s.includes("WIDTH")) headerDCW_X = item.x;
                                        });
                                        if (headerDCL_X !== -1 && headerDCW_X !== -1) {
                                            passedHeader = true;
                                        }
                                    }
                                    continue;
                                }
                                for (let j = 0; j < rows[i].length - 1; j++) {
                                    if (["-", "–"].includes(rows[i][j].str.trim())) {
                                        if (rows[i][j+1].str.match(/^\s*\d/)) {
                                            if (Math.abs(rows[i][j+1].x - rows[i][j].x) < 20) {
                                                rows[i][j+1].str = "-" + rows[i][j+1].str.trim();
                                                rows[i][j].str = "";
                                            }
                                        }
                                    }
                                }

                                let dcl = null;
                                let dcw = null;
                                let minDclDist = 60;
                                let minDcwDist = 60;

                                rows[i].forEach(item => {
                                    if (!item.str) return;
                                    let cleanStr = item.str.replace(/\s+/g, "");
                                    let numMatch = cleanStr.match(/^-?\d+(\.\d+)?$/);
                                    if (numMatch) {
                                        let distL = Math.abs(item.x - headerDCL_X);
                                        let distW = Math.abs(item.x - headerDCW_X);

                                        if (distL < minDclDist && distL <= distW) {
                                            dcl = numMatch[0];
                                            minDclDist = distL;
                                        }
                                        if (distW < minDcwDist && distW < distL) {
                                            dcw = numMatch[0];
                                            minDcwDist = distW;
                                        }
                                    }
                                });
                                if (textFila.includes("AVERAGE") && !textFila.includes("AVG")) {
                                    foundAverageRow = true;
                                    if (dcl && dcw) {
                                        shrinkageResults["AVERAGE"].length = roundAndFormat(dcl);
                                        shrinkageResults["AVERAGE"].width = roundAndFormat(dcw);
                                        break;
                                    }
                                } else if (foundAverageRow && dcl && dcw) {
                                    shrinkageResults["AVERAGE"].length = roundAndFormat(dcl);
                                    shrinkageResults["AVERAGE"].width = roundAndFormat(dcw);
                                    break;
                                } else if (dcl && dcw) {
                                    let specItem = rows[i].find(item => item.x < headerDCL_X - 20 && item.str.match(/(?:^|\s)[123](?:\s|$)/));
                                    if (specItem) {
                                        let matchSpec = specItem.str.match(/[123]/)[0];
                                        shrinkageResults["#" + matchSpec].length = roundAndFormat(dcl);
                                        shrinkageResults["#" + matchSpec].width = roundAndFormat(dcw);
                                    } else if (specCount <= 3 && !textFila.includes("CV")) {
                                        shrinkageResults["#" + specCount].length = roundAndFormat(dcl);
                                        shrinkageResults["#" + specCount].width = roundAndFormat(dcw);
                                        specCount++;
                                    }
                                }
                            }
                            if (!passedHeader) {
                                btnResults.innerText = '⚠️ No se hallaron columnas (DC-L/W)';
                                setTimeout(() => { btnResults.innerText = originalText; }, 4000);
                                return;
                            }
                            if (!shrinkageResults["AVERAGE"].length) {
                                btnResults.innerText = '\u26A0\uFE0F Sin resultado (AVG)';
                                setTimeout(() => { btnResults.innerText = originalText; }, 4000);
                                return;
                            }
                            let camposLlenados = 0;
                            let piezasActivas = obtenerPiezasActivasUI();
                            if (piezasActivas.length === 0) { piezasActivas = ['A']; }
                            const filas = document.querySelectorAll('tr');
                            let currentReading = "";
                            filas.forEach(fila => {
                                if (fila.querySelector('table')) return;

                                let textoFila = fila.innerText.toUpperCase();
                                if (textoFila.includes("REQUIREMENT") || textoFila.includes("[CATEGORY]")) return;
                                if (textoFila.includes("EXTRA CONCLUSION") || textoFila.includes("PIECE DETAILS")) return;
                                let rawHTML = fila.cells.length > 0 ? fila.cells[0].innerText.trim().toUpperCase() : "";

                                if (rawHTML !== "") {
                                    if (rawHTML.includes("#1")) currentReading = "#1";
                                    else if (rawHTML.includes("#2")) currentReading = "#2";
                                    else if (rawHTML.includes("#3")) currentReading = "#3";
                                    else if (rawHTML.includes("AVERAGE")) currentReading = "AVERAGE";
                                    else currentReading = "";
                                }
                                if (!["#1", "#2", "#3", "AVERAGE"].includes(currentReading)) return;
                                let parameter = null;
                                if (textoFila.includes("LENGTH") || textoFila.includes("LENGHT")) parameter = "length";
                                else if (textoFila.includes("WIDTH")) parameter = "width";
                                if (parameter && shrinkageResults[currentReading] && shrinkageResults[currentReading][parameter]) {
                                    camposLlenados += inyectarEnPiezasActivas(fila, shrinkageResults[currentReading][parameter], piezasActivas);
                                }
                            });
                            if (camposLlenados > 0) {
                                btnResults.innerText = `✅ (${camposLlenados})`;
                            } else {
                                btnResults.innerText = '\u26A0\uFE0F Nada inyectado';
                            }
                            setTimeout(() => { btnResults.innerText = originalText; }, 3000);
                            return;
                        }

                                        // --- YARN SIZE ---
                    } else if (testSeleccionado.includes("YARN SIZE")) {
                        let linesByPage = {};
                        itemsAvanzados.forEach(item => {
                            if (!linesByPage[item.page]) linesByPage[item.page] = {};
                            let linesY = linesByPage[item.page];
                            let y = Math.round(item.y * 10) / 10;
                            let foundY = Object.keys(linesY).find(k => Math.abs(parseFloat(k) - y) < 6.0);
                            if (foundY) { linesY[foundY].push(item); }
                            else { linesY[y] = [item]; }
                        });

                        let rowsOrdered = [];
                        let pages = Object.keys(linesByPage).sort((a, b) => parseInt(a) - parseInt(b));
                        pages.forEach(p => {
                            let linesY = linesByPage[p];
                            let sortedY = Object.keys(linesY).sort((a, b) => parseFloat(b) - parseFloat(a));
                            sortedY.forEach(y => {
                                let rowItems = linesY[y].sort((a, b) => a.x - b.x);
                                rowsOrdered.push(rowItems.map(x => x.str.trim()).join(" ").toUpperCase());
                            });
                        });

                        let foundTitle = false;
                        let foundResultados = false;
                        let data = { "TEX": null, "DENIER": null, "NE": null, "NM": null };
                        let textLogged = "";

                        for (let i = 0; i < rowsOrdered.length; i++) {
                            let rowText = rowsOrdered[i];
                            textLogged += rowText + "\n";

                            if (!foundTitle) {
                                if (rowText.includes("YARN NUMBER") || rowText.includes("YARN SIZE")) {
                                    foundTitle = true;
                                }
                            } else if (!foundResultados) {
                                if (rowText.includes("RESULTADOS") || rowText.includes("RESULTS")) {
                                    foundResultados = true;
                                }
                            } else {
                                if (rowText.includes("+")) {
                                    let parts = rowText.split("+").map(p => p.trim());
                                    if (parts.length >= 2) {
                                        let p0 = parts[0].match(/(\d+.*)$/);
                                        p0 = p0 ? p0[1] : parts[0];
                                        let p1 = parts[1];
                                        let p2 = parts[2] ? parts[2].trim() : "";

                                        let vals = [p0, p1, p2];

                                        if (rowText.includes("NE") || rowText.includes("COTTON")) data["NE"] = vals;
                                        else if (rowText.includes("D ") || rowText.includes("DENIER")) data["DENIER"] = vals;
                                        else if (rowText.includes("TEX")) data["TEX"] = vals;
                                        else if (rowText.includes("NM") || rowText.includes("METRIC")) data["NM"] = vals;
                                    }
                                }
                                
                                // Detenernos si llegamos a otra prueba (heuristica simple)
                                if (rowText.includes("TIGHTNESS FACTOR") || rowText.includes("MÉTODO DE PRUEBA")) {
                                    if (data["NE"] || data["DENIER"] || data["TEX"] || data["NM"]) {
                                        break;
                                    }
                                }
                            }
                        }

                        // Solo tomamos los de NE (Cotton Count) siempre, tal como solicitaste
                        let selectedVals = data["NE"];

                        if (e.shiftKey) {
                            let txt = document.createElement('textarea');
                            txt.value = "=== YARN SIZE LOG ===\nTITLE FOUND: " + foundTitle + "\nRESULTS FOUND: " + foundResultados + "\nEXTRACTED: " + JSON.stringify(selectedVals) + "\n\nTEXT:\n" + textLogged;
                            txt.style.width = '100%';
                            txt.style.height = '400px';
                            txt.style.border = '2px solid orange';
                            txt.style.position = 'relative';
                            txt.style.zIndex = '9999';
                            document.body.prepend(txt);
                            txt.scrollIntoView();
                            setTimeout(() => { btnResults.innerText = originalText; }, 5000);
                            return;
                        }

                        if (!selectedVals) {
                            btnResults.innerText = '\u26A0\uFE0F Sin resultado (Yarn)';
                            setTimeout(() => { btnResults.innerText = originalText; }, 4000);
                            return;
                        }

                        let yarnResults = {
                            "SPECIMEN 1": selectedVals[0],
                            "SPECIMEN 2": selectedVals[1],
                            "AVERAGE": selectedVals[2]
                        };

                        let camposLlenados = 0;
                        let piezasActivas = obtenerPiezasActivasUI();
                        if (piezasActivas.length === 0) { piezasActivas = ['A']; }

                        const filas = document.querySelectorAll('tr');
                        let currentReading = "";

                        filas.forEach(fila => {
                            if (fila.querySelector('table')) return;

                            let textoFila = fila.innerText.toUpperCase();
                            if (textoFila.includes("REQUIREMENT") || textoFila.includes("[CATEGORY]")) return;
                            if (textoFila.includes("EXTRA CONCLUSION") || textoFila.includes("PIECE DETAILS")) return;

                            let rawHTML = fila.cells.length > 0 ? fila.cells[0].innerText.trim().toUpperCase() : "";

                            if (rawHTML !== "") {
                                if (rawHTML.includes("YARN SIZE")) currentReading = "YARN SIZE";
                                else currentReading = "";
                            }

                            if (currentReading !== "YARN SIZE") return;

                            let parameter = null;
                            if (textoFila.includes("SPECIMEN 1")) parameter = "SPECIMEN 1";
                            else if (textoFila.includes("SPECIMEN 2")) parameter = "SPECIMEN 2";
                            else if (textoFila.includes("AVERAGE")) parameter = "AVERAGE";

                            if (parameter && yarnResults[parameter]) {
                                camposLlenados += inyectarEnPiezasActivas(fila, yarnResults[parameter], piezasActivas);
                            }
                        });

                        if (camposLlenados > 0) btnResults.innerText = '\u2705 (' + camposLlenados + ')';
                        else btnResults.innerText = '\u26A0\uFE0F Nada inyectado';
                        setTimeout(() => { btnResults.innerText = originalText; }, 3000);
                        return;

                    // --- THREAD COUNT (KNIT / WOVEN) ---
                    } else if (testSeleccionado.includes("THREAD COUNT")) {
                        let linesByPage = {};
                        itemsAvanzados.forEach(item => {
                            if (!linesByPage[item.page]) linesByPage[item.page] = {};
                            let linesY = linesByPage[item.page];
                            let y = Math.round(item.y * 10) / 10;
                            let foundY = Object.keys(linesY).find(k => Math.abs(parseFloat(k) - y) < 4.0);
                            if (foundY) { linesY[foundY].push(item); }
                            else { linesY[y] = [item]; }
                        });

                        let rows = [];
                        let pages = Object.keys(linesByPage).sort((a, b) => parseInt(a) - parseInt(b));
                        pages.forEach(p => {
                            let linesY = linesByPage[p];
                            let sortedY = Object.keys(linesY).sort((a, b) => parseFloat(b) - parseFloat(a));
                            sortedY.forEach(y => {
                                let rowItems = linesY[y];
                                rowItems.sort((a, b) => a.x - b.x);
                                rows.push(rowItems);
                            });
                        });

                        let threadResults = {
                            "WALES 1": "", "WALES 2": "", "WALES 3": "", "WALES 4": "", "WALES 5": "", "WALES AVERAGE": "",
                            "COURSES 1": "", "COURSES 2": "", "COURSES 3": "", "COURSES 4": "", "COURSES 5": "", "COURSES AVERAGE": "",
                            "WARP 1": "", "WARP 2": "", "WARP 3": "", "WARP 4": "", "WARP 5": "", "WARP AVERAGE": "",
                            "WEFT 1": "", "WEFT 2": "", "WEFT 3": "", "WEFT 4": "", "WEFT 5": "", "WEFT AVERAGE": ""
                        };

                        let startRowIdx = -1;
                        let type1 = "WALES";
                        let type2 = "COURSES";

                        for (let i = 0; i < rows.length; i++) {
                            let textFila = rows[i].map(x => x.str.trim()).join(" ").toUpperCase();
                            if (textFila.includes("WALES") && textFila.includes("COURSES")) {
                                startRowIdx = i;
                                type1 = "WALES";
                                type2 = "COURSES";
                                break;
                            } else if (textFila.includes("WARP") && textFila.includes("WEFT")) {
                                startRowIdx = i;
                                type1 = "WARP";
                                type2 = "WEFT";
                                break;
                            }
                        }

                        if (startRowIdx !== -1) {
                            let numRegex = /\d+(\.\d+)?/g;
                            let idxPromedio = -1;
                            for (let i = startRowIdx; i < Math.min(startRowIdx + 50, rows.length); i++) {
                                let textFila = rows[i].map(x => x.str.trim()).join(" ").toUpperCase();
                                if (textFila.includes("PROMEDIO") || textFila.includes("AVERAGE")) {
                                    idxPromedio = i;
                                    break;
                                }
                            }

                            if (idxPromedio !== -1) {
                                let numbersPromedio = [];
                                rows[idxPromedio].forEach(item => {
                                    let match;
                                    while ((match = numRegex.exec(item.str)) !== null) {
                                        numbersPromedio.push(match[0]);
                                    }
                                });

                                if (numbersPromedio.length >= 2) {
                                    threadResults[`${type1} AVERAGE`] = numbersPromedio[numbersPromedio.length - 2];
                                    threadResults[`${type2} AVERAGE`] = numbersPromedio[numbersPromedio.length - 1];
                                }

                                for (let i = idxPromedio - 1; i >= Math.max(0, idxPromedio - 10); i--) {
                                    let rNumbers = [];
                                    rows[i].forEach(item => {
                                        let match;
                                        while ((match = numRegex.exec(item.str)) !== null) {
                                            rNumbers.push(match[0]);
                                        }
                                    });
                                    if (rNumbers.length >= 3) {
                                        let spec = rNumbers[0];
                                        if (["1","2","3","4","5"].includes(spec)) {
                                            threadResults[`${type1} ` + spec] = rNumbers[rNumbers.length - 2];
                                            threadResults[`${type2} ` + spec] = rNumbers[rNumbers.length - 1];
                                        }
                                    }
                                }
                            }
                        }

                        if (!threadResults["WALES AVERAGE"] && !threadResults["WARP AVERAGE"]) {
                            btnResults.innerText = '\u26A0\uFE0F Sin resultado (Thread)';
                            setTimeout(() => { btnResults.innerText = originalText; }, 3000);
                            return;
                        }

                        let camposLlenados = 0;
                        let piezasActivas = obtenerPiezasActivasUI();
                        if (piezasActivas.length === 0) { piezasActivas = ['A']; }

                        const filas = document.querySelectorAll('tr');
                        let isClaimSection = false;

                        filas.forEach(fila => {
                            if (fila.querySelector('table')) return;

                            let textoFila = fila.innerText.toUpperCase();
                            if (textoFila.includes("REQUIREMENT") || textoFila.includes("[CATEGORY]")) return;
                            if (textoFila.includes("EXTRA CONCLUSION") || textoFila.includes("PIECE DETAILS")) return;

                            let rawHTML = fila.cells.length > 0 ? fila.cells[0].innerText.trim().toUpperCase() : "";

                            if (rawHTML.includes("CLAIM") || textoFila.includes("CLAIM")) {
                                isClaimSection = true;
                            } else if (rawHTML !== "") {
                                isClaimSection = false;
                            }

                            if (isClaimSection) return;

                            let parameter = null;
                            if (textoFila.includes("WALES 1")) parameter = "WALES 1";
                            else if (textoFila.includes("WALES 2")) parameter = "WALES 2";
                            else if (textoFila.includes("WALES 3")) parameter = "WALES 3";
                            else if (textoFila.includes("WALES 4")) parameter = "WALES 4";
                            else if (textoFila.includes("WALES 5")) parameter = "WALES 5";
                            else if (textoFila.includes("WALES AVERAGE")) parameter = "WALES AVERAGE";
                            else if (textoFila.includes("COURSES 1")) parameter = "COURSES 1";
                            else if (textoFila.includes("COURSES 2")) parameter = "COURSES 2";
                            else if (textoFila.includes("COURSES 3")) parameter = "COURSES 3";
                            else if (textoFila.includes("COURSES 4")) parameter = "COURSES 4";
                            else if (textoFila.includes("COURSES 5")) parameter = "COURSES 5";
                            else if (textoFila.includes("COURSES AVERAGE")) parameter = "COURSES AVERAGE";
                            else if (textoFila.includes("WARP 1")) parameter = "WARP 1";
                            else if (textoFila.includes("WARP 2")) parameter = "WARP 2";
                            else if (textoFila.includes("WARP 3")) parameter = "WARP 3";
                            else if (textoFila.includes("WARP AVERAGE")) parameter = "WARP AVERAGE";
                            else if (textoFila.includes("WEFT 1")) parameter = "WEFT 1";
                            else if (textoFila.includes("WEFT 2")) parameter = "WEFT 2";
                            else if (textoFila.includes("WEFT 3")) parameter = "WEFT 3";
                            else if (textoFila.includes("WEFT AVERAGE")) parameter = "WEFT AVERAGE";

                            if (parameter && threadResults[parameter]) {
                                camposLlenados += inyectarEnPiezasActivas(fila, threadResults[parameter], piezasActivas);
                            }
                        });

                        if (camposLlenados > 0) btnResults.innerText = `✅ (${camposLlenados})`;
                        else btnResults.innerText = '\u26A0\uFE0F Nada inyectado';
                        setTimeout(() => { btnResults.innerText = originalText; }, 3000);
                        return;

                    // --- STITCH LENGTH ---
                    } else if (testSeleccionado.includes("STITCH LENGTH")) {
                        let linesByPage = {};
                        itemsAvanzados.forEach(item => {
                            if (!linesByPage[item.page]) linesByPage[item.page] = {};
                            let linesY = linesByPage[item.page];
                            let y = Math.round(item.y * 10) / 10;
                            let foundY = Object.keys(linesY).find(k => Math.abs(parseFloat(k) - y) < 4.0);
                            if (foundY) { linesY[foundY].push(item); }
                            else { linesY[y] = [item]; }
                        });

                        let rows = [];
                        let pages = Object.keys(linesByPage).sort((a, b) => parseInt(a) - parseInt(b));
                        pages.forEach(p => {
                            let linesY = linesByPage[p];
                            let sortedY = Object.keys(linesY).sort((a, b) => parseFloat(b) - parseFloat(a));
                            sortedY.forEach(y => {
                                let rowItems = linesY[y];
                                rowItems.sort((a, b) => a.x - b.x);
                                rows.push(rowItems);
                            });
                        });

                        let startRowIdx = -1;
                        let stitchHeaderX = -1;
                        for (let i = 0; i < rows.length; i++) {
                            let textFila = rows[i].map(x => x.str.trim()).join(" ").toUpperCase();
                            if (textFila.includes("STITCH LENGTH")) {
                                startRowIdx = i;
                                let headerItem = rows[i].find(item => item.str.toUpperCase().includes("STITCH LENGTH") || item.str.toUpperCase().includes("STITCH"));
                                if (headerItem) stitchHeaderX = headerItem.x;
                                break;
                            }
                        }

                        let val = "";
                        if (startRowIdx !== -1 && stitchHeaderX !== -1) {
                            for (let i = startRowIdx + 1; i < Math.min(startRowIdx + 10, rows.length); i++) {
                                let numbersItems = [];
                                let numRegex = /\d+(\.\d+)?/g;
                                rows[i].forEach(item => {
                                    let match;
                                    while ((match = numRegex.exec(item.str)) !== null) {
                                        numbersItems.push({ str: match[0], x: item.x });
                                    }
                                });

                                if (numbersItems.length > 0) {
                                    let bestNum = null;
                                    let minDist = Infinity;
                                    numbersItems.forEach(num => {
                                        let dist = Math.abs(num.x - stitchHeaderX);
                                        if (dist < 80 && dist < minDist) {
                                            minDist = dist;
                                            bestNum = num.str;
                                        }
                                    });
                                    if (bestNum) {
                                        val = bestNum;
                                        break;
                                    }
                                }
                            }
                        }

                        if (!val) {
                            btnResults.innerText = '\u26A0\uFE0F Sin resultado (Stitch)';
                            setTimeout(() => { btnResults.innerText = originalText; }, 3000);
                            return;
                        }

                        let camposLlenados = 0;
                        let piezasActivas = obtenerPiezasActivasUI();
                        if (piezasActivas.length === 0) { piezasActivas = ['A']; }

                        const filas = document.querySelectorAll('tr');
                        filas.forEach(fila => {
                            if (fila.querySelector('table')) return;

                            let textoFila = fila.innerText.toUpperCase();
                            if (textoFila.includes("REQUIREMENT") || textoFila.includes("[CATEGORY]")) return;
                            if (textoFila.includes("EXTRA CONCLUSION") || textoFila.includes("PIECE DETAILS")) return;

                            let rawHTML = fila.cells.length > 0 ? fila.cells[0].innerText.trim().toUpperCase() : "";

                            if (rawHTML.includes("CLAIM") || textoFila.includes("CLAIM")) {
                                return;
                            }

                            if (rawHTML.includes("STITCH LENGTH") || textoFila.includes("STITCH LENGTH")) {
                                camposLlenados += inyectarEnPiezasActivas(fila, val, piezasActivas);
                            }
                        });

                        if (camposLlenados > 0) btnResults.innerText = `✅ (${camposLlenados})`;
                        else btnResults.innerText = '\u26A0\uFE0F Nada inyectado';
                        setTimeout(() => { btnResults.innerText = originalText; }, 3000);
                        return;

                    // --- FABRIC WEIGHT ---
                    } else if (testSeleccionado.includes("WEIGHT")) {
                        let linesByPage = {};
                        itemsAvanzados.forEach(item => {
                            if (!linesByPage[item.page]) linesByPage[item.page] = {};
                            let linesY = linesByPage[item.page];
                            let y = Math.round(item.y * 10) / 10;
                            let foundY = Object.keys(linesY).find(k => Math.abs(parseFloat(k) - y) < 4.0);
                            if (foundY) { linesY[foundY].push(item); }
                            else { linesY[y] = [item]; }
                        });

                        let rows = [];
                        let pages = Object.keys(linesByPage).sort((a, b) => parseInt(a) - parseInt(b));
                        pages.forEach(p => {
                            let linesY = linesByPage[p];
                            let sortedY = Object.keys(linesY).sort((a, b) => parseFloat(b) - parseFloat(a));
                            sortedY.forEach(y => {
                                let rowItems = linesY[y];
                                rowItems.sort((a, b) => a.x - b.x);
                                rows.push(rowItems);
                            });
                        });

                        let weightResults = {
                            "G/M2": { "SPECIMEN 1": "", "SPECIMEN 2": "", "SPECIMEN 3": "", "SPECIMEN 4": "", "SPECIMEN 5": "", "AVERAGE": "" },
                            "OZ/YD2": { "SPECIMEN 1": "", "SPECIMEN 2": "", "SPECIMEN 3": "", "SPECIMEN 4": "", "SPECIMEN 5": "", "AVERAGE": "" }
                        };

                        let startRowIdx = -1;
                        for (let i = 0; i < rows.length; i++) {
                            let textFila = rows[i].map(x => x.str.trim()).join(" ").toUpperCase();
                            let textFilaLimpio = textFila.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                            if ((textFilaLimpio.includes("WEIGHT") || textFilaLimpio.includes("PESO")) && textFilaLimpio.includes("AREA")) {
                                startRowIdx = i;
                                break;
                            }
                        }

                        if (startRowIdx !== -1) {
                            let numRegex = /\d+(\.\d+)?/g;
                            let idxPromedio = -1;
                            for (let i = startRowIdx; i < Math.min(startRowIdx + 50, rows.length); i++) {
                                let textFila = rows[i].map(x => x.str.trim()).join(" ").toUpperCase();
                                if (textFila.includes("PROMEDIO") || textFila.includes("AVERAGE")) {
                                    idxPromedio = i;
                                    break;
                                }
                            }

                            if (idxPromedio !== -1) {
                                let numbersPromedio = [];
                                rows[idxPromedio].forEach(item => {
                                    let match;
                                    while ((match = numRegex.exec(item.str)) !== null) {
                                        numbersPromedio.push(match[0]);
                                    }
                                });

                                if (numbersPromedio.length >= 2) {
                                    weightResults["G/M2"]["AVERAGE"] = numbersPromedio[numbersPromedio.length - 2];
                                    weightResults["OZ/YD2"]["AVERAGE"] = numbersPromedio[numbersPromedio.length - 1];
                                }

                                for (let i = idxPromedio - 1; i >= Math.max(0, idxPromedio - 10); i--) {
                                    let rNumbers = [];
                                    rows[i].forEach(item => {
                                        let match;
                                        while ((match = numRegex.exec(item.str)) !== null) {
                                            rNumbers.push(match[0]);
                                        }
                                    });
                                    if (rNumbers.length >= 3) {
                                        let spec = rNumbers[0];
                                        if (["1","2","3","4","5"].includes(spec)) {
                                            weightResults["G/M2"]["SPECIMEN " + spec] = rNumbers[rNumbers.length - 2];
                                            weightResults["OZ/YD2"]["SPECIMEN " + spec] = rNumbers[rNumbers.length - 1];
                                        }
                                    }
                                }
                            }
                        }

                        if (!weightResults["G/M2"]["AVERAGE"]) {
                            btnResults.innerText = '\u26A0\uFE0F Sin resultado (Weight)';
                            setTimeout(() => { btnResults.innerText = originalText; }, 3000);
                            return;
                        }

                        let camposLlenados = 0;
                        let piezasActivas = obtenerPiezasActivasUI();
                        if (piezasActivas.length === 0) { piezasActivas = ['A']; }

                        const filas = document.querySelectorAll('tr');
                        let currentReading = "";
                        filas.forEach(fila => {
                            if (fila.querySelector('table')) return;

                            let textoFila = fila.innerText.toUpperCase();
                            if (textoFila.includes("REQUIREMENT") || textoFila.includes("[CATEGORY]")) return;
                            if (textoFila.includes("EXTRA CONCLUSION") || textoFila.includes("PIECE DETAILS")) return;

                            let rawHTML = fila.cells.length > 0 ? fila.cells[0].innerText.trim().toUpperCase() : "";
                            if (rawHTML !== "") {
                                if (rawHTML.includes("CLAIM")) currentReading = "CLAIM";
                                else if (rawHTML.includes("G/M")) currentReading = "G/M2";
                                else if (rawHTML.includes("OZ/YD")) currentReading = "OZ/YD2";
                                else currentReading = "";
                            }

                            let parameter = null;
                            if (textoFila.includes("SPECIMEN 1")) parameter = "SPECIMEN 1";
                            else if (textoFila.includes("SPECIMEN 2")) parameter = "SPECIMEN 2";
                            else if (textoFila.includes("SPECIMEN 3")) parameter = "SPECIMEN 3";
                            else if (textoFila.includes("SPECIMEN 4")) parameter = "SPECIMEN 4";
                            else if (textoFila.includes("SPECIMEN 5")) parameter = "SPECIMEN 5";
                            else if (textoFila.includes("AVERAGE")) parameter = "AVERAGE";

                            if (parameter && (currentReading === "G/M2" || currentReading === "OZ/YD2")) {
                                let valor = weightResults[currentReading][parameter];
                                if (valor) {
                                    camposLlenados += inyectarEnPiezasActivas(fila, valor, piezasActivas);
                                }
                            }
                        });

                        if (camposLlenados > 0) btnResults.innerText = `✅ (${camposLlenados})`;
                        else btnResults.innerText = '\u26A0\uFE0F Nada inyectado';
                        setTimeout(() => { btnResults.innerText = originalText; }, 3000);
                        return;

                    // --- BURSTING STRENGTH ---
                    } else if (testSeleccionado.includes("BURSTING")) {
                        let linesByPage = {};
                        itemsAvanzados.forEach(item => {
                            if (!linesByPage[item.page]) linesByPage[item.page] = {};
                            let linesY = linesByPage[item.page];
                            let y = Math.round(item.y * 10) / 10;
                            let foundY = Object.keys(linesY).find(k => Math.abs(parseFloat(k) - y) < 4.0);
                            if (foundY) { linesY[foundY].push(item); }
                            else { linesY[y] = [item]; }
                        });

                        let rows = [];
                        let pages = Object.keys(linesByPage).sort((a, b) => parseInt(a) - parseInt(b));
                        pages.forEach(p => {
                            let linesY = linesByPage[p];
                            let sortedY = Object.keys(linesY).sort((a, b) => parseFloat(b) - parseFloat(a));
                            sortedY.forEach(y => {
                                let rowItems = linesY[y];
                                rowItems.sort((a, b) => a.x - b.x);
                                rows.push(rowItems);
                            });
                        });

                        let burstResults = { "SPECIMEN 1": "", "SPECIMEN 2": "", "SPECIMEN 3": "", "SPECIMEN 4": "", "SPECIMEN 5": "", "AVERAGE": "" };

                        let startRowIdx = -1;
                        for (let i = 0; i < rows.length; i++) {
                            let textFila = rows[i].map(x => x.str.trim()).join(" ").toUpperCase();
                            if (textFila.includes("BURSTING") || textFila.includes("REVENTAMIENTO")) {
                                startRowIdx = i;
                                break;
                            }
                        }

                        if (startRowIdx !== -1) {
                            let idxPromedio = -1;
                            for (let i = startRowIdx; i < Math.min(startRowIdx + 50, rows.length); i++) {
                                let textFila = rows[i].map(x => x.str.trim()).join(" ").toUpperCase();
                                if (textFila.includes("PROMEDIO") || textFila.includes("AVERAGE")) {
                                    idxPromedio = i;
                                    break;
                                }
                            }

                            if (idxPromedio !== -1) {
                                let numRegex = /\d+(\.\d+)?/g;
                                let numbersPromedio = [];
                                rows[idxPromedio].forEach(item => {
                                    let match;
                                    while ((match = numRegex.exec(item.str)) !== null) {
                                        numbersPromedio.push(match[0]);
                                    }
                                });

                                if (numbersPromedio.length > 0) {
                                    burstResults["AVERAGE"] = numbersPromedio[0];
                                }

                                for (let i = idxPromedio - 1; i >= Math.max(0, idxPromedio - 10); i--) {
                                    let rNumbers = [];
                                    rows[i].forEach(item => {
                                        let match;
                                        while ((match = numRegex.exec(item.str)) !== null) {
                                            rNumbers.push(match[0]);
                                        }
                                    });
                                    if (rNumbers.length >= 4) {
                                        let spec = rNumbers[0];
                                        if (["1","2","3","4","5"].includes(spec)) {
                                            burstResults["SPECIMEN " + spec] = rNumbers[3];
                                        }
                                    }
                                }
                            }
                        }

                        if (!burstResults["AVERAGE"]) {
                            btnResults.innerText = '\u26A0\uFE0F Sin resultado (Bursting)';
                            setTimeout(() => { btnResults.innerText = originalText; }, 3000);
                            return;
                        }

                        let camposLlenados = 0;
                        let piezasActivas = obtenerPiezasActivasUI();
                        if (piezasActivas.length === 0) { piezasActivas = ['A']; }

                        const filas = document.querySelectorAll('tr');
                        filas.forEach(fila => {
                            if (fila.querySelector('table')) return;

                            let textoFila = fila.innerText.toUpperCase();
                            if (textoFila.includes("REQUIREMENT") || textoFila.includes("[CATEGORY]")) return;

                            let parameter = null;
                            if (textoFila.includes("SPECIMEN 1")) parameter = "SPECIMEN 1";
                            else if (textoFila.includes("SPECIMEN 2")) parameter = "SPECIMEN 2";
                            else if (textoFila.includes("SPECIMEN 3")) parameter = "SPECIMEN 3";
                            else if (textoFila.includes("SPECIMEN 4")) parameter = "SPECIMEN 4";
                            else if (textoFila.includes("SPECIMEN 5")) parameter = "SPECIMEN 5";
                            else if (textoFila.includes("AVERAGE")) parameter = "AVERAGE";

                            if (parameter && burstResults[parameter]) {
                                camposLlenados += inyectarEnPiezasActivas(fila, burstResults[parameter], piezasActivas);
                            }
                        });

                        if (camposLlenados > 0) btnResults.innerText = `✅ (${camposLlenados})`;
                        else btnResults.innerText = '\u26A0\uFE0F Nada inyectado';
                        setTimeout(() => { btnResults.innerText = originalText; }, 3000);
                        return;

                    // --- pH LEVEL ---
                    } else if (testSeleccionado.includes("PH LEVEL")) {
                        let resultadoAInyectar = '';

                        let phIndices = [];
                        itemsAvanzados.forEach((item, i) => {
                            let s = item.str.toUpperCase();
                            if (s.match(/\bPH\b/) || s.includes("P H")) phIndices.push(i);
                        });

                        let idx = -1;
                        for (let phIdx of phIndices) {
                            for (let i = phIdx; i < Math.min(phIdx + 60, itemsAvanzados.length); i++) {
                                let s = itemsAvanzados[i].str.toUpperCase();
                                if (s.includes("PROMEDIO") || s.includes("AVERAGE") || s.includes("MEAN")) {
                                    idx = i;
                                    break;
                                }
                            }
                            if (idx !== -1) break;
                        }

                        if (idx !== -1) {
                            for (let i = idx; i < Math.min(idx + 10, itemsAvanzados.length); i++) {
                                let matchNum = itemsAvanzados[i].str.match(/(\d+\.\d+)/);
                                if (matchNum) { resultadoAInyectar = matchNum[1]; break; }
                            }
                        }

                        if (!resultadoAInyectar) {
                            let fullText = itemsAvanzados.map(i => i.str.trim()).filter(s => s !== "").join(" ").toUpperCase();
                            let phMatch = fullText.match(/(?:PROMEDIO|AVERAGE)\s*(?:DE)?\s*P\s*H\s*[:\.]?\s*(\d+\.\d+)/);
                            if (phMatch) { resultadoAInyectar = phMatch[1]; }
                        }

                        if (!resultadoAInyectar) {
                            btnResults.innerText = '\u26A0\uFE0F Sin resultado (pH)';
                            setTimeout(() => { btnResults.innerText = originalText; }, 3000);
                            return;
                        }

                        let numFloat = parseFloat(resultadoAInyectar);
                        if (!isNaN(numFloat)) {
                            resultadoAInyectar = (Math.round(numFloat * 10) / 10).toFixed(1);
                        }

                        let camposLlenados = 0;
                        let piezasActivas = obtenerPiezasActivasUI();
                        if (piezasActivas.length === 0) { piezasActivas = ['A']; }

                        const filas = document.querySelectorAll('tr');
                        filas.forEach(fila => {
                            if (fila.querySelector('table')) return;
                            if (fila.innerText.toUpperCase().includes('PH VALUE')) {
                                camposLlenados += inyectarEnPiezasActivas(fila, resultadoAInyectar, piezasActivas);
                            }
                        });

                        if (camposLlenados > 0) btnResults.innerText = `✅ (${camposLlenados})`;
                        else btnResults.innerText = '\u26A0\uFE0F Nada inyectado';
                        setTimeout(() => { btnResults.innerText = originalText; }, 3000);
                        return;

                    // --- PILLING RESISTANCE ---
                    } else if (testSeleccionado.includes("PILLING RESISTANCE") || testSeleccionado.includes("PILLING")) {
                        let linesByPage = {};
                        itemsAvanzados.forEach(item => {
                            if (!linesByPage[item.page]) linesByPage[item.page] = {};
                            let linesY = linesByPage[item.page];
                            let y = Math.round(item.y * 10) / 10;
                            let foundY = Object.keys(linesY).find(k => Math.abs(parseFloat(k) - y) < 4.0);
                            if (foundY) { linesY[foundY].push(item); }
                            else { linesY[y] = [item]; }
                        });

                        let rows = [];
                        let pages = Object.keys(linesByPage).sort((a, b) => parseInt(a) - parseInt(b));
                        pages.forEach(p => {
                            let linesY = linesByPage[p];
                            let sortedY = Object.keys(linesY).sort((a, b) => parseFloat(b) - parseFloat(a));
                            sortedY.forEach(y => {
                                let rowItems = linesY[y];
                                rowItems.sort((a, b) => a.x - b.x);
                                rows.push(rowItems);
                            });
                        });

                        let startRowIdx = -1;
                        for (let i = 0; i < rows.length; i++) {
                            let textFila = rows[i].map(x => x.str.trim()).join(" ").toUpperCase();
                            if (textFila.includes("PILLING") || textFila.includes("ENMOTADO")) {
                                startRowIdx = i;
                                break;
                            }
                        }

                        let pillingResult = "";
                        if (startRowIdx !== -1) {
                            for (let i = startRowIdx; i < Math.min(startRowIdx + 50, rows.length); i++) {
                                let avgItem = rows[i].find(it => it.str.toUpperCase().includes("PROMEDIO") || it.str.toUpperCase().includes("AVERAGE"));
                                if (avgItem) {
                                    let numbers = rows[i].filter(it => it.x > avgItem.x + 15 && it.str.trim().match(/^[0-9.]+$/));
                                    numbers.sort((a, b) => a.x - b.x);
                                    if (numbers.length > 0) {
                                        pillingResult = numbers[0].str.trim();
                                        break;
                                    }
                                }
                            }
                        }

                        if (!pillingResult) {
                            btnResults.innerText = '\u26A0\uFE0F Sin resultado (Pilling)';
                            setTimeout(() => { btnResults.innerText = originalText; }, 3000);
                            return;
                        }

                        let camposLlenados = 0;
                        let piezasActivas = obtenerPiezasActivasUI();
                        if (piezasActivas.length === 0) { piezasActivas = ['A']; }

                        const filas = document.querySelectorAll('tr');
                        filas.forEach(fila => {
                            if (fila.querySelector('table')) return;

                            let textoFila = fila.innerText.toUpperCase();
                            if (textoFila.includes("REQUIREMENT") || textoFila.includes("[CATEGORY]")) return;
                            if (textoFila.includes("EXTRA CONCLUSION") || textoFila.includes("PIECE DETAILS")) return;

                            let rawHTML = fila.cells.length > 0 ? fila.cells[0].innerText.trim().toUpperCase() : "";
                            let cell1 = fila.cells.length > 1 ? fila.cells[1].innerText.trim().toUpperCase() : "";

                            if (rawHTML.includes("AVERAGE") || cell1.includes("AVERAGE") || textoFila.includes("AVERAGE")) {
                                camposLlenados += inyectarEnPiezasActivas(fila, pillingResult, piezasActivas);
                            }
                        });

                        if (camposLlenados > 0) btnResults.innerText = `✅ (${camposLlenados})`;
                        else btnResults.innerText = '\u26A0\uFE0F Nada inyectado';
                        setTimeout(() => { btnResults.innerText = originalText; }, 3000);
                        return;

                    // --- OTRAS PRUEBAS (IGNORAR) ---                    // --- STRETCH AND RECOVERY (GROWTH) ---
                    } else if (testSeleccionado.includes("STRETCH AND RECOVERY") || testSeleccionado.includes("STRETCH & RECOVERY")) {
                        let linesByPage = {};
                        itemsAvanzados.forEach(item => {
                            if (!linesByPage[item.page]) linesByPage[item.page] = {};
                            let linesY = linesByPage[item.page];
                            let y = Math.round(item.y * 10) / 10;
                            let foundY = Object.keys(linesY).find(k => Math.abs(parseFloat(k) - y) < 4.0);
                            if (foundY) { linesY[foundY].push(item); }
                            else { linesY[y] = [item]; }
                        });

                        let rows = [];
                        let pages = Object.keys(linesByPage).sort((a, b) => parseInt(a) - parseInt(b));
                        pages.forEach(p => {
                            let linesY = linesByPage[p];
                            let sortedY = Object.keys(linesY).sort((a, b) => parseFloat(b) - parseFloat(a));
                            sortedY.forEach(y => {
                                let rowItems = linesY[y];
                                rowItems.sort((a, b) => a.x - b.x);
                                rows.push(rowItems);
                            });
                        });

                        let growthData = { "LENGTH": {}, "WIDTH": {} };
                        let recoveryData = { "LENGTH": {}, "WIDTH": {} };
                        let elongationData = { "LENGTH": {}, "WIDTH": {} };

                        let currentDirection = "";
                        let inGrowthTable = false;
                        let inStretchTable = false;

                        for (let i = 0; i < rows.length; i++) {
                            let textFila = rows[i].map(x => x.str.trim()).join(" ").toUpperCase();

                            if (textFila.includes("DIRECCIÃ“N: LARGO") || textFila.includes("DIRECTION: LENGTH") || textFila === "LARGO" || textFila === "LENGTH" || textFila.includes("LARGO") || textFila.includes("LENGTH")) {
                                currentDirection = "LENGTH";
                                inGrowthTable = false;
                                inStretchTable = false;
                            } else if (textFila.includes("DIRECCIÃ“N: ANCHO") || textFila.includes("DIRECTION: WIDTH") || textFila === "ANCHO" || textFila === "WIDTH" || textFila.includes("ANCHO") || textFila.includes("WIDTH")) {
                                currentDirection = "WIDTH";
                                inGrowthTable = false;
                                inStretchTable = false;
                            }

                            if (textFila.includes("CRECIMIENTO") || textFila.includes("GROWTH") || textFila.includes("RECUPERACIÃ“N") || textFila.includes("RECOVERY")) {
                                inGrowthTable = true;
                                inStretchTable = false;
                            } else if (textFila.includes("ESTIRAMIENTO") || textFila.includes("STRETCHABILITY")) {
                                inStretchTable = true;
                                inGrowthTable = false;
                            }

                            if (currentDirection && inGrowthTable) {
                                let matchSpecimen = textFila.match(/(ESP.*CIMEN|SPECIMEN)\s*(\d)/);
                                let isAverage = textFila.includes("PROMEDIO") || textFila.includes("AVERAGE");

                                if (matchSpecimen || isAverage) {
                                    let key = "";
                                    if (matchSpecimen) {
                                        let num = parseInt(matchSpecimen[2]);
                                        if (num === 3) key = "SPECIMEN 1";
                                        else if (num === 4) key = "SPECIMEN 2";
                                        else if (num === 5) key = "SPECIMEN 3";
                                        else if (num === 1) key = "SPECIMEN 1";
                                        else if (num === 2) key = "SPECIMEN 2";
                                    } else {
                                        key = "AVERAGE";
                                    }

                                    if (key) {
                                        let percItems = rows[i].filter(v => v.str.includes("%"));
                                        percItems.sort((a, b) => a.x - b.x);

                                        if (percItems.length >= 2) {
                                            growthData[currentDirection][key] = percItems[0].str.replace("%", "").trim();
                                            recoveryData[currentDirection][key] = percItems[1].str.replace("%", "").trim();
                                        } else if (percItems.length === 1) {
                                            growthData[currentDirection][key] = percItems[0].str.replace("%", "").trim();
                                        } else {
                                            let extractFallback = textFila.match(/(?:#VALUE!|[\d.]+)\s+([\d.]+)(?:%?)\s+(?:#VALUE!|[\d.]+)\s+([\d.]+)(?:%?)$/);
                                            if (extractFallback) {
                                                growthData[currentDirection][key] = extractFallback[1].trim();
                                                recoveryData[currentDirection][key] = extractFallback[2].trim();
                                            }
                                        }
                                    }
                                }
                            } else if (currentDirection && inStretchTable) {
                                let matchSpecimen = textFila.match(/(ESP.*CIMEN|SPECIMEN)\s*(\d)/);
                                let isAverage = textFila.includes("PROMEDIO") || textFila.includes("AVERAGE");

                                if (matchSpecimen || isAverage) {
                                    let key = "";
                                    if (matchSpecimen) {
                                        let num = parseInt(matchSpecimen[2]);
                                        if (num === 1) key = "SPECIMEN 1";
                                        else if (num === 2) key = "SPECIMEN 2";
                                        else if (num === 3) key = "SPECIMEN 3";
                                    } else {
                                        key = "AVERAGE";
                                    }

                                    if (key) {
                                        let percItems = rows[i].filter(v => v.str.includes("%"));
                                        percItems.sort((a, b) => a.x - b.x);
                                        if (percItems.length > 0) {
                                            elongationData[currentDirection][key] = percItems[0].str.replace("%", "").trim();
                                        }
                                    }
                                }
                            }
                        }
                        // Calcular promedios autom�ticamente para ignorar valores basura del PDF como "Twist ="
                        ["LENGTH", "WIDTH"].forEach(dir => {
                            [growthData, recoveryData, elongationData].forEach(dataObj => {
                                let sum = 0;
                                let count = 0;
                                for (let k = 1; k <= 5; k++) {
                                    let specKey = "SPECIMEN " + k;
                                    if (dataObj[dir] && dataObj[dir][specKey]) {
                                        let num = parseFloat(dataObj[dir][specKey]);
                                        if (!isNaN(num)) {
                                            sum += num;
                                            count++;
                                        }
                                    }
                                }
                                if (count > 0) {
                                    let avg = sum / count;
                                    // El PDF normalmente redondea a 1 decimal
                                    dataObj[dir]["AVERAGE"] = (Math.round(avg * 10) / 10).toFixed(1);
                                }
                            });
                        });
                        if (Object.keys(growthData["LENGTH"]).length === 0 && Object.keys(recoveryData["LENGTH"]).length === 0 && Object.keys(elongationData["LENGTH"]).length === 0) {
                            btnResults.innerText = '\u26A0\uFE0F Sin resultado (Stretch)';
                            setTimeout(() => { btnResults.innerText = originalText; }, 4000);
                            return;
                        }

                        let camposLlenados = 0;

                        // We must read the labels directly to preserve "A001 : Growth" because the global function strips them.
                        let localPiezasActivas = [];
                        const checkboxes = document.querySelectorAll('input[type="checkbox"]:checked');
                        checkboxes.forEach(cb => {
                            let id = cb.id;
                            let label = id ? document.querySelector(`label[for="${id}"]`) : null;
                            let txt = label ? label.innerText.toUpperCase() : (cb.parentElement ? cb.parentElement.innerText.toUpperCase() : "");
                            if (txt) localPiezasActivas.push(txt);
                        });

                        // Si falla la deteccin visual, usamos un texto seguro que coincida con el combobox superior
                        if (localPiezasActivas.length === 0) {
                            const pSelect = document.querySelector('select[name*="Piece"]');
                            if (pSelect && pSelect.selectedIndex >= 0) {
                                localPiezasActivas.push(pSelect.options[pSelect.selectedIndex].text.toUpperCase());
                            } else {
                                localPiezasActivas.push("GROWTH"); // fallback extremo
                            }
                        }

                        const filas = document.querySelectorAll('tr');
                        let currentDirectionUI = "";

                        filas.forEach(fila => {
                            if (fila.querySelector('table')) return;

                            let rawHTML = fila.cells.length > 0 ? fila.cells[0].innerText.trim().toUpperCase() : "";
                            let rowText = fila.innerText.toUpperCase();

                            if (rawHTML.includes("LENGTH") || rawHTML.includes("LARGO")) currentDirectionUI = "LENGTH";
                            else if (rawHTML.includes("WIDTH") || rawHTML.includes("ANCHO")) currentDirectionUI = "WIDTH";

                            // Generic target keys ONLY (ignore specific metric rows)
                            let targetKey = "";
                            if (rowText.includes("SPECIMEN 1") && !rowText.includes("RECOVERY") && !rowText.includes("ELONGATION") && !rowText.includes("SHRINKAGE")) targetKey = "SPECIMEN 1";
                            else if (rowText.includes("SPECIMEN 2") && !rowText.includes("RECOVERY") && !rowText.includes("ELONGATION") && !rowText.includes("SHRINKAGE")) targetKey = "SPECIMEN 2";
                            else if (rowText.includes("SPECIMEN 3") && !rowText.includes("RECOVERY") && !rowText.includes("ELONGATION") && !rowText.includes("SHRINKAGE")) targetKey = "SPECIMEN 3";
                            else if (rowText.includes("AVERAGE") && !rowText.includes("RECOVERY") && !rowText.includes("ELONGATION") && !rowText.includes("SHRINKAGE")) targetKey = "AVERAGE";

                            if (currentDirectionUI && targetKey) {
                                let inputs = Array.from(fila.querySelectorAll('input, textarea')).filter(inp => {
                                    let type = inp.type ? inp.type.toLowerCase() : 'text';
                                    return !(type === 'hidden' || type === 'submit' || type === 'button' || type === 'checkbox' || type === 'radio' || inp.style.display === 'none' || inp.readOnly || inp.disabled);
                                });

                                for (let k = 0; k < inputs.length && k < localPiezasActivas.length; k++) {
                                    let subpiece = localPiezasActivas[k];
                                    let val = null;

                                    if (subpiece.includes("GROWTH")) {
                                        if (growthData[currentDirectionUI] && growthData[currentDirectionUI][targetKey]) val = growthData[currentDirectionUI][targetKey];
                                    } else if (subpiece.includes("RECOVERY")) {
                                        if (recoveryData[currentDirectionUI] && recoveryData[currentDirectionUI][targetKey]) val = recoveryData[currentDirectionUI][targetKey];
                                    } else if (subpiece.includes("ELONGATION") || subpiece.includes("STRETCH")) {
                                        if (elongationData[currentDirectionUI] && elongationData[currentDirectionUI][targetKey]) val = elongationData[currentDirectionUI][targetKey];
                                    }

                                    if (val !== null) {
                                        inputs[k].value = val;
                                        let ev = new Event('change', { bubbles: true });
                                        inputs[k].dispatchEvent(ev);
                                        camposLlenados++;
                                    }
                                }
                            }
                        });

                        if (camposLlenados > 0) btnResults.innerText = '\u2705 (' + camposLlenados + ')';
                        else btnResults.innerText = '\u26A0\uFE0F Nada inyectado';
                        setTimeout(() => { btnResults.innerText = originalText; }, 3000);
                        return;

                    // --- APPEARANCE AFTER LAUNDERING ---
                    } else if (testSeleccionado.includes("APPEARANCE AFTER LAUNDERING")) {
                        let linesByPage = {};
                        itemsAvanzados.forEach(item => {
                            if (!linesByPage[item.page]) linesByPage[item.page] = {};
                            let linesY = linesByPage[item.page];
                            let y = Math.round(item.y * 10) / 10;
                            let foundY = Object.keys(linesY).find(k => Math.abs(parseFloat(k) - y) < 4.0);
                            if (foundY) { linesY[foundY].push(item); }
                            else { linesY[y] = [item]; }
                        });

                        let rows = [];
                        let pages = Object.keys(linesByPage).sort((a, b) => parseInt(a) - parseInt(b));
                        pages.forEach(p => {
                            let linesY = linesByPage[p];
                            let sortedY = Object.keys(linesY).sort((a, b) => parseFloat(b) - parseFloat(a));
                            sortedY.forEach(y => {
                                let rowItems = linesY[y];
                                rowItems.sort((a, b) => a.x - b.x);
                                rows.push(rowItems);
                            });
                        });

                        let textByPage = {};
                        pages.forEach(p => {
                            let pageRows = [];
                            let linesY = linesByPage[p];
                            let sortedY = Object.keys(linesY).sort((a, b) => parseFloat(b) - parseFloat(a));
                            sortedY.forEach(y => {
                                let rowItems = linesY[y];
                                rowItems.sort((a, b) => a.x - b.x);
                                pageRows.push(rowItems);
                            });
                            textByPage[p] = pageRows.map(r => r.map(x => x.str.trim()).join(" ").toUpperCase()).join(" ");
                        });
                        let textCompletoApp = Object.values(textByPage).join(" ");

                        let camposLlenados = 0;
                        let piezasActivas = obtenerPiezasActivasUI();
                        if (piezasActivas.length === 0) piezasActivas = ["A"]; // fallback

                        // For the Piece Name we need the exact label
                        let pieceLabels = [];
                        const localCheckboxes = document.querySelectorAll('input[type="checkbox"]:checked');
                        localCheckboxes.forEach(cb => {
                            let id = cb.id;
                            let label = id ? document.querySelector(`label[for="${id}"]`) : null;
                            let rawTxt = label ? label.innerText : (cb.parentElement ? cb.parentElement.innerText : "");
                            let txtUp = rawTxt.toUpperCase();
                            if (txtUp && !txtUp.includes("COPY") && !txtUp.includes("ALL")) {
                                pieceLabels.push(rawTxt.replace(/^[A-Z0-9]+\s*:\s*/i, "").trim());
                            }
                        });

                        if (pieceLabels.length === 0) {
                            const pSelect = document.querySelector('select[name*="Piece"]');
                            if (pSelect && pSelect.selectedIndex >= 0) {
                                pieceLabels.push(pSelect.options[pSelect.selectedIndex].text.replace(/^[A-Z0-9]+\s*:\s*/i, "").trim());
                            } else {
                                pieceLabels.push("Prueba 1"); // Fallback seguro
                            }
                        }

                        let dataByPiece = [];
                        for (let i = 0; i < piezasActivas.length; i++) {
                            let pName = pieceLabels[i] || pieceLabels[0];
                            let appData = { pilling: "", colorChange: "", selfStaining: "", satisfactory: "", pieceName: pName };
                            
                            let foundPage = -1;
                            for (let p in textByPage) {
                                let pageText = textByPage[p];
                                if (pageText.includes("APPEARANCE (AS RECEIVED) APPEARANCE (AFTER LAUNDERING)") || 
                                    pageText.includes("APARIENCIA ORIGINAL Y DESPU�S DE LAVADO") ||
                                    pageText.includes("APPEARANCE AFTER LAUNDERING")) {
                                    foundPage = parseInt(p);
                                    break;
                                }
                            }
                            
                            let targetText = textCompletoApp;
                            if (foundPage !== -1) {
                                targetText = textByPage[foundPage];
                                if (textByPage[foundPage + 1]) {
                                    targetText += " " + textByPage[foundPage + 1];
                                }
                            }
                            
                            function extractNum(regex) {
                                let m = [...targetText.matchAll(regex)];
                                if (m.length === 0) m = [...textCompletoApp.matchAll(regex)];
                                for (let item of m) {
                                    let val = item[1];
                                    if (val && val !== "." && val !== "..") return val;
                                }
                                return "";
                            }
                            
                            appData.pilling = "4.5"; // Hardcoded as requested
                            appData.colorChange = extractNum(/COLOR\s*CHANGE[\s:_.\-(]*(?:RATE|RATING)?[)\s:_.\-]*([0-9]+(?:[\.\-][0-9]+)?)/gi);
                            appData.selfStaining = extractNum(/SELF\s*STAINING[\s:_.\-(]*(?:RATE|RATING)?[)\s:_.\-]*([0-9]+(?:[\.\-][0-9]+)?)/gi);

                            if (targetText.match(/UNSATISFACTORY\s*_*X_*/)) {
                                appData.satisfactory = "Unsatisfactory";
                            } else if (targetText.match(/SATISFACTORY\s*_*X_*/)) {
                                appData.satisfactory = "Satisfactory";
                            } else if (targetText.includes("SATISFACTORY")) {
                                appData.satisfactory = "Satisfactory";
                            }

                            dataByPiece.push(appData);
                        }

                        if (e.shiftKey) {
                            let txt = document.createElement('textarea');
                            txt.value = "=== APP AFTER LAUNDERING LOG ===\nDATA: " + JSON.stringify(dataByPiece, null, 2) + "\n\nTEXT:\n" + textCompletoApp;
                            txt.style.width = '100%';
                            txt.style.height = '400px';
                            txt.style.border = '2px solid red';
                            txt.style.position = 'relative';
                            txt.style.zIndex = '9999';
                            document.body.prepend(txt);
                            txt.scrollIntoView();
                            btnResults.innerText = '\u2705 Log Extraido';
                            setTimeout(() => { btnResults.innerText = originalText; }, 3000);
                            return;
                        }

                        const filas = document.querySelectorAll('tr');

                        let currentReading = "";
                        let countersByReading = {
                            PART: {},
                            GRADE: {},
                            OBSERVATION: {}
                        };

                        function getSectionCount(reading, key) {
                            if (!countersByReading[reading]) countersByReading[reading] = {};
                            countersByReading[reading][key] = (countersByReading[reading][key] || 0) + 1;
                            return countersByReading[reading][key];
                        }

                        let ironSelect = document.querySelector('select[name*="Iron"], select[id*="Iron"]');
                        let ironVal = (ironSelect && ironSelect.selectedIndex >= 0 && ironSelect.options[ironSelect.selectedIndex].text.trim()) 
                                      ? ironSelect.options[ironSelect.selectedIndex].text.trim() 
                                      : "Cool Iron";

                        filas.forEach(fila => {
                            if (fila.querySelector('table')) return;

                            let textoFila = fila.innerText.toUpperCase();
                            if (textoFila.includes("REQUIREMENT") || textoFila.includes("PARAMETER") || textoFila.includes("[CATEGORY]")) return;
                            if (textoFila.includes("EXTRA CONCLUSION") || textoFila.includes("PIECE DETAILS")) return;
                            if (textoFila.includes("SAVE") || textoFila.includes("REFRESH") || textoFila.includes("SUBIR PDF")) return;

                            // Detectar cambio de sección en la columna Reading
                            if (fila.cells.length > 0) {
                                let c0 = fila.cells[0].innerText.trim().toUpperCase().replace(/\s+/g, " ");
                                if (!c0.includes("[")) {
                                    if (c0.includes("PART")) {
                                        currentReading = "PART";
                                    } else if (c0.includes("GRADE")) {
                                        currentReading = "GRADE";
                                    } else if (c0.includes("OBSERVATION")) {
                                        currentReading = "OBSERVATION";
                                    }
                                }
                            }

                            if (!currentReading) return;

                            let keyType = null;
                            let subCounter = 0;

                            if (textoFila.includes("[COLOR CHANGE]")) {
                                subCounter = getSectionCount(currentReading, "COLOR_CHANGE");
                                keyType = "COLOR_CHANGE";
                            } else if (textoFila.includes("[PILLING]")) {
                                subCounter = getSectionCount(currentReading, "PILLING");
                                keyType = "PILLING";
                            } else if (textoFila.includes("[SELF/CROSS STAINING]")) {
                                subCounter = getSectionCount(currentReading, "SELF_STAINING");
                                keyType = "SELF_STAINING";
                            } else if (textoFila.includes("[OBSERVATION] BEFORE IRONING")) {
                                subCounter = getSectionCount(currentReading, "BEFORE_IRONING");
                                keyType = "BEFORE_IRONING";
                            } else if (textoFila.includes("[OBSERVATION] AFTER IRONING")) {
                                subCounter = getSectionCount(currentReading, "AFTER_IRONING");
                                keyType = "AFTER_IRONING";
                            } else if (textoFila.includes("[OBSERVATION] IRON SAFE")) {
                                subCounter = getSectionCount(currentReading, "IRON_SAFE");
                                keyType = "IRON_SAFE";
                            } else if (textoFila.includes("[OBSERVATION] OTHER OBSERVATION")) {
                                subCounter = getSectionCount(currentReading, "OTHER_OBS");
                                keyType = "OTHER_OBS";
                            }

                            if (keyType) {
                                let inputs = Array.from(fila.querySelectorAll('input, textarea')).filter(inp => {
                                    let type = inp.type ? inp.type.toLowerCase() : 'text';
                                    return !(type === 'hidden' || type === 'submit' || type === 'button' || type === 'checkbox' || type === 'radio' || inp.style.display === 'none' || inp.readOnly || inp.disabled);
                                });

                                for (let k = 0; k < inputs.length && k < piezasActivas.length; k++) {
                                    let valToInject = null;
                                    let pData = dataByPiece[k] || dataByPiece[0];

                                    // En PART van únicamente el color (pieceName) y face
                                    if (currentReading === "PART") {
                                        if (keyType === "COLOR_CHANGE" && subCounter === 1) {
                                            valToInject = pData.pieceName;
                                        } else if (keyType === "PILLING" && subCounter === 1) {
                                            valToInject = "Face";
                                        }
                                    // En GRADE van los números
                                    } else if (currentReading === "GRADE") {
                                        if (keyType === "COLOR_CHANGE" && subCounter === 1) {
                                            valToInject = pData.colorChange || "4.5";
                                        } else if (keyType === "SELF_STAINING" && subCounter === 1) {
                                            valToInject = pData.selfStaining || "4.5";
                                        } else if (keyType === "PILLING" && subCounter === 1) {
                                            valToInject = "4.5";
                                        }
                                    // En OBSERVATION va únicamente Other Observation
                                    } else if (currentReading === "OBSERVATION") {
                                        if (keyType === "OTHER_OBS" && subCounter === 1) {
                                            valToInject = pData.satisfactory || "Satisfactory";
                                        }
                                    }

                                    if (valToInject !== null) {
                                        inputs[k].value = valToInject;
                                        let ev = new Event('change', { bubbles: true });
                                        inputs[k].dispatchEvent(ev);
                                        camposLlenados++;
                                    }
                                }
                            }
                        });

                        if (camposLlenados > 0) btnResults.innerText = '\u2705 (' + camposLlenados + ')';
                        else btnResults.innerText = '\u26A0\uFE0F Nada inyectado';
                        setTimeout(() => { btnResults.innerText = originalText; }, 3000);
                        return;

                                                                                                                        // --- TORQUE / SPIRALITY (FABRIC & GARMENT) ---
                    } else if (testSeleccionado.includes("TORQUE")) {
                        let isGarment = testSeleccionado.includes("GARMENT");
                        let averageVal = null;
                        let afterRight = null;
                        let afterLeft = null;
                        
                        // Agrupar por Pagina y luego por Y para leer en orden exacto
                        let linesByPage = {};
                        itemsAvanzados.forEach(item => {
                            if (!linesByPage[item.page]) linesByPage[item.page] = {};
                            let linesY = linesByPage[item.page];
                            let y = Math.round(item.y * 10) / 10;
                            let foundY = Object.keys(linesY).find(k => Math.abs(parseFloat(k) - y) < 8.0);
                            if (foundY) { linesY[foundY].push(item); }
                            else { linesY[y] = [item]; }
                        });
                        
                        let rowsOrdered = [];
                        let pages = Object.keys(linesByPage).sort((a, b) => parseInt(a) - parseInt(b));
                        pages.forEach(p => {
                            let linesY = linesByPage[p];
                            let sortedY = Object.keys(linesY).sort((a, b) => parseFloat(b) - parseFloat(a));
                            sortedY.forEach(y => {
                                let itemsLine = linesY[y].sort((a, b) => a.x - b.x);
                                rowsOrdered.push(itemsLine.map(x => x.str.trim()).join(" ").toUpperCase());
                            });
                        });
                        
                        let foundTitle = false;
                        let textLogged = "";
                        let afterWashesFound = false;

                        for (let i = 0; i < rowsOrdered.length; i++) {
                            let rowText = rowsOrdered[i];
                            textLogged += rowText + "\n";
                            
                            if (!foundTitle) {
                                // Buscamos el título de la prueba
                                if (rowText.includes("SKEWING AND TORQUE") || rowText.includes("SESGO Y TORQUE") || rowText.includes("SEAM TWIST")) {
                                    foundTitle = true;
                                }
                            } else {
                                if (isGarment) {
                                    if (rowText.match(/AFTER \d+ WASH/) || rowText.includes("AFTER WASHES")) {
                                        afterWashesFound = true;
                                    }
                                    
                                    if (afterWashesFound && rowText.includes("CHANGE IN TWIST %")) {
                                        let matchRight = rowText.match(/RIGHT CHANGE IN TWIST %\s*(-?[\d.]+)/);
                                        let matchLeft = rowText.match(/LEFT CHANGE IN TWIST %\s*(-?[\d.]+)/);
                                        if (matchRight) afterRight = matchRight[1];
                                        if (matchLeft) afterLeft = matchLeft[1];
                                        break;
                                    }
                                } else {
                                    // Fabric: Una vez encontrado el título, buscamos el primer AVERAGE
                                    let matchAvg = rowText.match(/AVERAGE\s*:?\s*[%]?\s*(-?[\d.]+)/);
                                    if (matchAvg) {
                                        let val = matchAvg[1].replace(/\s/g, "");
                                        averageVal = val.includes("%") ? val : val + "%";
                                        break;
                                    }
                                }
                            }
                        }

                        // Fallback por si la palabra no es exacta (solo Fabric)
                        if (!isGarment && !averageVal) {
                            let matchAvgFallback = rowsOrdered.join(" ").match(/AVERAGE\s*:?\s*[%]?\s*(-?[\d.]+)/);
                            if (matchAvgFallback) {
                                let val = matchAvgFallback[1].replace(/\s/g, "");
                                averageVal = val.includes("%") ? val : val + "%";
                            }
                        }

                        if (e.shiftKey) {
                            let txt = document.createElement('textarea');
                            if (isGarment) {
                                txt.value = "=== TORQUE GARMENT LOG ===\nTITLE FOUND: " + foundTitle + "\nAFTER WASHES FOUND: " + afterWashesFound + "\nRIGHT: " + afterRight + "\nLEFT: " + afterLeft + "\n\nTEXT:\n" + textLogged;
                            } else {
                                txt.value = "=== TORQUE FABRIC LOG ===\nTITLE FOUND: " + foundTitle + "\nAVG: " + averageVal + "\n\nTEXT:\n" + textLogged;
                            }
                            txt.style.width = '100%';
                            txt.style.height = '400px';
                            txt.style.border = '2px solid orange';
                            txt.style.position = 'relative';
                            txt.style.zIndex = '9999';
                            document.body.prepend(txt);
                            txt.scrollIntoView();
                            setTimeout(() => { btnResults.innerText = originalText; }, 5000);
                            return;
                        }

                        if (isGarment && (!afterRight || !afterLeft)) {
                            btnResults.innerText = '\u26A0\uFE0F Sin resultado (Torque Garment)';
                            setTimeout(() => { btnResults.innerText = originalText; }, 4000);
                            return;
                        }
                        if (!isGarment && !averageVal) {
                            btnResults.innerText = '\u26A0\uFE0F Sin resultado (Torque Fabric)';
                            setTimeout(() => { btnResults.innerText = originalText; }, 4000);
                            return;
                        }

                        let camposLlenados = 0;
                        let piezasActivas = obtenerPiezasActivasUI();
                        if (piezasActivas.length === 0) { piezasActivas = ['A']; }

                        const filas = document.querySelectorAll('tr');
                        let currentReading = "";

                        filas.forEach(fila => {
                            if (fila.querySelector('table')) return;
                            let rowText = fila.innerText.toUpperCase();

                            if (isGarment) {
                                if (rowText.includes("REQUIREMENT") || rowText.includes("[CATEGORY]")) return;
                                if (rowText.includes("EXTRA CONCLUSION") || rowText.includes("PIECE DETAILS")) return;

                                let rawHTML = fila.cells.length > 0 ? fila.cells[0].innerText.trim().toUpperCase() : "";
                                if (rawHTML !== "") {
                                    if (rawHTML.includes("BEFORE WASHED")) currentReading = "BEFORE WASHED";
                                    else if (rawHTML.includes("AFTER WASHED")) currentReading = "AFTER WASHED";
                                    else currentReading = "";
                                }

                                if (currentReading !== "BEFORE WASHED" && currentReading !== "AFTER WASHED") return;

                                let parameter = null;
                                if (rowText.includes("LEFT")) parameter = "LEFT";
                                else if (rowText.includes("RIGHT")) parameter = "RIGHT";

                                let valToInject = null;
                                if (currentReading === "BEFORE WASHED") {
                                    valToInject = "0.0";
                                } else if (currentReading === "AFTER WASHED") {
                                    if (parameter === "LEFT") valToInject = afterLeft;
                                    else if (parameter === "RIGHT") valToInject = afterRight;
                                }

                                if (parameter && valToInject !== null) {
                                    let inputs = Array.from(fila.querySelectorAll('input, textarea')).filter(inp => {
                                        let type = inp.type ? inp.type.toLowerCase() : 'text';
                                        return !(type === 'hidden' || type === 'submit' || type === 'button' || type === 'checkbox' || type === 'radio' || inp.style.display === 'none' || inp.readOnly || inp.disabled);
                                    });

                                    for (let k = 0; k < inputs.length && k < piezasActivas.length; k++) {
                                        inputs[k].value = valToInject;
                                        let ev = new Event('change', { bubbles: true });
                                        inputs[k].dispatchEvent(ev);
                                        camposLlenados++;
                                    }
                                }
                            } else {
                                if (rowText.includes("SPIRALITY")) {
                                    let inputs = Array.from(fila.querySelectorAll('input, textarea')).filter(inp => {
                                        let type = inp.type ? inp.type.toLowerCase() : 'text';
                                        return !(type === 'hidden' || type === 'submit' || type === 'button' || type === 'checkbox' || type === 'radio' || inp.style.display === 'none' || inp.readOnly || inp.disabled);
                                    });

                                    for (let k = 0; k < inputs.length && k < piezasActivas.length; k++) {
                                        inputs[k].value = averageVal;
                                        let ev = new Event('change', { bubbles: true });
                                        inputs[k].dispatchEvent(ev);
                                        camposLlenados++;
                                    }
                                }
                            }
                        });

                        if (camposLlenados > 0) btnResults.innerText = '\u2705 (' + camposLlenados + ')';
                        else btnResults.innerText = '\u26A0\uFE0F Nada inyectado';
                        setTimeout(() => { btnResults.innerText = originalText; }, 3000);
                        return;

                    // --- SEAM STRETCHABILITY ---
                    } else if (testSeleccionado.includes("SEAM STRETCHABILITY") || testSeleccionado.includes("STRETCHABILITY")) {
                        let linesByPage = {};
                        itemsAvanzados.forEach(item => {
                            if (!linesByPage[item.page]) linesByPage[item.page] = {};
                            let linesY = linesByPage[item.page];
                            let y = Math.round(item.y * 10) / 10;
                            let foundY = Object.keys(linesY).find(k => Math.abs(parseFloat(k) - y) < 5.0);
                            if (foundY) { linesY[foundY].push(item); }
                            else { linesY[y] = [item]; }
                        });

                        let rows = [];
                        let pages = Object.keys(linesByPage).sort((a, b) => parseInt(a) - parseInt(b));
                        pages.forEach(p => {
                            let linesY = linesByPage[p];
                            let sortedY = Object.keys(linesY).sort((a, b) => parseFloat(b) - parseFloat(a));
                            sortedY.forEach(y => {
                                let rowItems = linesY[y];
                                rowItems.sort((a, b) => a.x - b.x);
                                rows.push(rowItems);
                            });
                        });

                        let sectionStart = 0;
                        let sectionEnd = rows.length;
                        for (let i = 0; i < rows.length; i++) {
                            let rowText = rows[i].map(x => x.str.trim()).join(" ").toUpperCase();
                            if (rowText.includes("SEAM STRETCHABILITY") || rowText.includes("RESISTENCIA DE COSTURAS")) sectionStart = i;
                            if (sectionStart > 0 && i > sectionStart + 3) {
                                if (rowText.includes("DIMENSIONAL STABILITY") || rowText.includes("SHRINKAGE") || rowText.includes("COLOR FASTNESS") || rowText.includes("APPEARANCE") || rowText.includes("WASHING") || rowText.includes("BURSTING") || rowText.includes("PILING")) {
                                    sectionEnd = i;
                                    break;
                                }
                            }
                        }

                        let garmentResults = { "TOP": {}, "BOTTOM": {}, "UNDERWEAR": {}, "OTHER": {} };
                        let topsHeaders = { str: -1, elo: -1, mod: -1 };
                        let botsHeaders = { str: -1, elo: -1, mod: -1 };

                        for (let i = sectionStart; i < sectionEnd; i++) {
                            let rowText = rows[i].map(x => x.str.trim()).join(" ").toUpperCase();
                            if (rowText.includes("STRENG") || rowText.includes("ELONG") || rowText.includes("MODE") || rowText.includes("FAILURE")) {
                                rows[i].forEach(item => {
                                    let text = item.str.toUpperCase();
                                    if (item.x < 320) {
                                        if (topsHeaders.str === -1 && (text.includes("STRENG") || text.includes("STRENGTH"))) topsHeaders.str = item.x;
                                        if (topsHeaders.elo === -1 && (text.includes("ELONG") || text.includes("ELONGATION"))) topsHeaders.elo = item.x;
                                        if (topsHeaders.mod === -1 && (text.includes("MODE") || text.includes("FAILURE"))) topsHeaders.mod = item.x;
                                    } else {
                                        if (botsHeaders.str === -1 && (text.includes("STRENG") || text.includes("STRENGTH"))) botsHeaders.str = item.x;
                                        if (botsHeaders.elo === -1 && (text.includes("ELONG") || text.includes("ELONGATION"))) botsHeaders.elo = item.x;
                                        if (botsHeaders.mod === -1 && (text.includes("MODE") || text.includes("FAILURE"))) botsHeaders.mod = item.x;
                                    }
                                });
                            }
                        }

                        if (topsHeaders.elo !== -1 && topsHeaders.mod === -1) topsHeaders.mod = topsHeaders.elo + 60;
                        if (botsHeaders.elo !== -1 && botsHeaders.mod === -1) botsHeaders.mod = botsHeaders.elo + 60;

                        let midX = topsHeaders.mod !== -1 ? topsHeaders.mod + 35 : 310;
                        let lastTopPart = null;
                        let lastBotPart = null;

                        for (let i = sectionStart; i < sectionEnd; i++) {
                            let r = rows[i];

                            // TOPS
                            if (topsHeaders.elo !== -1 && topsHeaders.mod !== -1) {
                                let rightOfName = topsHeaders.str !== -1 ? topsHeaders.str - 20 : topsHeaders.elo - 20;
                                let nameItemsRaw = r.filter(item => item.x < rightOfName && item.str.trim() !== "");

                                let trueNameItems = [];
                                let lostNumbers = [];
                                nameItemsRaw.forEach(it => {
                                    let val = it.str.trim();
                                    if (/^[0-9.\s]+$/.test(val) && val.match(/[0-9]/)) lostNumbers.push(it);
                                    else trueNameItems.push(it);
                                });

                                if (trueNameItems.length > 0) {
                                    let partName = trueNameItems.map(it => it.str.trim()).join(" ").toUpperCase();

                                    while (true) {
                                        let matchNum = partName.match(/(.+?)\s+([0-9.]+)$/);
                                        if (matchNum) {
                                            partName = matchNum[1].trim();
                                            lostNumbers.unshift({ str: matchNum[2], x: 999 });
                                        } else {
                                            break;
                                        }
                                    }

                                    let finalPart = partName;
                                    finalPart = finalPart.replace(/\bTOPS\b:?/g, "");
                                    finalPart = finalPart.replace(/\bBOTTOMS\b:?/g, "");
                                    finalPart = finalPart.replace(/^SEAM\s+/g, "");
                                    finalPart = finalPart.replace(/\bSTRENGT[H]?\b/g, "");
                                    finalPart = finalPart.replace(/\bELONGATION\b/g, "");
                                    finalPart = finalPart.replace(/\bMODE\b/g, "");
                                    finalPart = finalPart.replace(/\bOF\b/g, "");
                                    finalPart = finalPart.replace(/\bFAILURE\b/g, "");
                                    finalPart = finalPart.replace(/\bH\b/g, "").trim();

                                    let cleanPart = finalPart.replace(/[^A-Z]/g, "");
                                    if (cleanPart === "SEAM" || cleanPart === "") {
                                    } else if (cleanPart.length >= 3) {
                                        lastTopPart = finalPart.split("(")[0].trim();
                                        if (!garmentResults["TOP"][lastTopPart]) {
                                            garmentResults["TOP"][lastTopPart] = { strength: "", elongation: "", mode: "" };
                                        }
                                    }
                                }

                                if (lastTopPart) {
                                    let col1_right = topsHeaders.str !== -1 ? (topsHeaders.str + topsHeaders.elo) / 2 : topsHeaders.elo - 20;
                                    let col2_right = (topsHeaders.elo + topsHeaders.mod) / 2;

                                    let strItems = topsHeaders.str !== -1 ? r.filter(it => it.x >= topsHeaders.str - 20 && it.x < col1_right && it.str.trim() !== "") : [];
                                    let eloItems = r.filter(it => it.x >= col1_right && it.x < col2_right && it.str.trim() !== "");

                                    if (lostNumbers.length > 0) {
                                        if (lostNumbers.length === 1) strItems.push(lostNumbers[0]);
                                        else if (lostNumbers.length >= 2) {
                                            strItems.push(lostNumbers[0]);
                                            eloItems.push(lostNumbers[1]);
                                        }
                                    }

                                    let modItems = r.filter(it => it.x >= col2_right && it.x < midX && it.str.trim() !== "");

                                    let strValRaw = strItems.map(it => it.str.trim()).join(" ").toUpperCase();
                                    let strVal = strValRaw.replace(/[^0-9.]/g, " ").trim().split(/\s+/)[0] || "";

                                    let eloValRaw = eloItems.map(it => it.str.trim()).join(" ").toUpperCase();
                                    let eloVal = eloValRaw.replace(/[^0-9.]/g, " ").trim().split(/\s+/)[0] || "";

                                    let rawModVal = modItems.map(it => it.str.trim()).join(" ").replace(/N\/A/g, "").toUpperCase();
                                    let modes = [];
                                    if (/\bFR\b/.test(rawModVal)) modes.push("FR");
                                    if (/\bSTB\b/.test(rawModVal)) modes.push("STB");
                                    let cleanModVal = modes.length > 0 ? modes.join(" ") : "";

                                    if (strVal) garmentResults["TOP"][lastTopPart].strength = strVal;
                                    if (eloVal) garmentResults["TOP"][lastTopPart].elongation = eloVal;
                                    if (cleanModVal && !garmentResults["TOP"][lastTopPart].mode.includes(cleanModVal)) {
                                        garmentResults["TOP"][lastTopPart].mode = (garmentResults["TOP"][lastTopPart].mode + " " + cleanModVal).trim();
                                    }
                                }
                            }

                            // BOTTOMS
                            if (botsHeaders.elo !== -1 && botsHeaders.mod !== -1) {
                                let rightOfName = botsHeaders.str !== -1 ? botsHeaders.str - 20 : botsHeaders.elo - 20;
                                let nameItemsRaw = r.filter(item => item.x >= midX && item.x < rightOfName && item.str.trim() !== "");

                                let trueNameItems = [];
                                let lostNumbers = [];
                                nameItemsRaw.forEach(it => {
                                    let val = it.str.trim();
                                    if (/^[0-9.\s]+$/.test(val) && val.match(/[0-9]/)) lostNumbers.push(it);
                                    else trueNameItems.push(it);
                                });

                                if (trueNameItems.length > 0) {
                                    let partName = trueNameItems.map(it => it.str.trim()).join(" ").toUpperCase();

                                    while (true) {
                                        let matchNum = partName.match(/(.+?)\s+([0-9.]+)$/);
                                        if (matchNum) {
                                            partName = matchNum[1].trim();
                                            lostNumbers.unshift({ str: matchNum[2], x: 999 });
                                        } else {
                                            break;
                                        }
                                    }

                                    let finalPart = partName;
                                    finalPart = finalPart.replace(/\bTOPS\b:?/g, "");
                                    finalPart = finalPart.replace(/\bBOTTOMS\b:?/g, "");
                                    finalPart = finalPart.replace(/^SEAM\s+/g, "");
                                    finalPart = finalPart.replace(/\bSTRENGT[H]?\b/g, "");
                                    finalPart = finalPart.replace(/\bELONGATION\b/g, "");
                                    finalPart = finalPart.replace(/\bMODE\b/g, "");
                                    finalPart = finalPart.replace(/\bOF\b/g, "");
                                    finalPart = finalPart.replace(/\bFAILURE\b/g, "");
                                    finalPart = finalPart.replace(/\bH\b/g, "").trim();

                                    let cleanPart = finalPart.replace(/[^A-Z]/g, "");
                                    if (cleanPart === "SEAM" || cleanPart === "") {
                                    } else if (cleanPart.length >= 3) {
                                        lastBotPart = finalPart.split("(")[0].trim();
                                        if (!garmentResults["BOTTOM"][lastBotPart]) {
                                            garmentResults["BOTTOM"][lastBotPart] = { strength: "", elongation: "", mode: "" };
                                        }
                                    }
                                }

                                if (lastBotPart) {
                                    let col1_right = botsHeaders.str !== -1 ? (botsHeaders.str + botsHeaders.elo) / 2 : botsHeaders.elo - 20;
                                    let col2_right = (botsHeaders.elo + botsHeaders.mod) / 2;

                                    let strItems = botsHeaders.str !== -1 ? r.filter(it => it.x >= botsHeaders.str - 20 && it.x < col1_right && it.str.trim() !== "") : [];
                                    let eloItems = r.filter(it => it.x >= col1_right && it.x < col2_right && it.str.trim() !== "");

                                    if (lostNumbers.length > 0) {
                                        if (lostNumbers.length === 1) strItems.push(lostNumbers[0]);
                                        else if (lostNumbers.length >= 2) {
                                            strItems.push(lostNumbers[0]);
                                            eloItems.push(lostNumbers[1]);
                                        }
                                    }

                                    let modItems = r.filter(it => it.x >= col2_right && it.str.trim() !== "");

                                    let strValRaw = strItems.map(it => it.str.trim()).join(" ").toUpperCase();
                                    let strVal = strValRaw.replace(/[^0-9.]/g, " ").trim().split(/\s+/)[0] || "";

                                    let eloValRaw = eloItems.map(it => it.str.trim()).join(" ").toUpperCase();
                                    let eloVal = eloValRaw.replace(/[^0-9.]/g, " ").trim().split(/\s+/)[0] || "";

                                    let rawModVal = modItems.map(it => it.str.trim()).join(" ").replace(/N\/A/g, "").toUpperCase();
                                    let modes = [];
                                    if (/\bFR\b/.test(rawModVal)) modes.push("FR");
                                    if (/\bSTB\b/.test(rawModVal)) modes.push("STB");
                                    let cleanModVal = modes.length > 0 ? modes.join(" ") : "";

                                    if (strVal) garmentResults["BOTTOM"][lastBotPart].strength = strVal;
                                    if (eloVal) garmentResults["BOTTOM"][lastBotPart].elongation = eloVal;
                                    if (cleanModVal && !garmentResults["BOTTOM"][lastBotPart].mode.includes(cleanModVal)) {
                                        garmentResults["BOTTOM"][lastBotPart].mode = (garmentResults["BOTTOM"][lastBotPart].mode + " " + cleanModVal).trim();
                                    }
                                }
                            }
                        }

                        // ====================================================================
                        // RESCATE A LA FUERZA EXTREMA
                        // Bypassea completamente las tablas y busca el texto crudo en el PDF
                        // ====================================================================
                        let foundArmhole = false;
                        let foundBackSeam = false;

                        for (let i = sectionStart; i < itemsAvanzados.length; i++) {
                            if (foundArmhole && foundBackSeam) break;

                            let text = itemsAvanzados[i].str.trim().toUpperCase();

                            // 1. Rescate Front Armhole
                            if (!foundArmhole && (text.includes("FRONT ARMHOLE") || (text === "FRONT" && itemsAvanzados[i+1] && itemsAvanzados[i+1].str.toUpperCase().includes("ARMHOLE")))) {
                                let yBase = itemsAvanzados[i].y;
                                let page = itemsAvanzados[i].page;
                                let nums = [];
                                let modeVal = "";
                                for (let j = i + 1; j < i + 20 && j < itemsAvanzados.length; j++) {
                                    if (itemsAvanzados[j].page !== page) continue;
                                    if (Math.abs(itemsAvanzados[j].y - yBase) > 10) continue; // Misma altura visual

                                    let val = itemsAvanzados[j].str.trim().toUpperCase();
                                    if (/^[0-9.]+$/.test(val)) nums.push(val);
                                    else if (val === "FR" || val === "STB") modeVal = val;
                                }
                                if (nums.length >= 1) {
                                    garmentResults["TOP"]["FRONT ARMHOLE"] = { strength: nums[0] || "", elongation: nums[1] || "", mode: modeVal };
                                    foundArmhole = true;
                                }
                            }

                            // 2. Rescate Back Seam
                            if (!foundBackSeam && (text.includes("BACK SEAM") || (text === "BACK" && itemsAvanzados[i+1] && itemsAvanzados[i+1].str.toUpperCase().includes("SEAM")))) {
                                let yBase = itemsAvanzados[i].y;
                                let page = itemsAvanzados[i].page;
                                let nums = [];
                                let modeVal = "";
                                for (let j = i + 1; j < i + 20 && j < itemsAvanzados.length; j++) {
                                    if (itemsAvanzados[j].page !== page) continue;
                                    if (Math.abs(itemsAvanzados[j].y - yBase) > 10) continue;

                                    let val = itemsAvanzados[j].str.trim().toUpperCase();
                                    if (/^[0-9.]+$/.test(val)) nums.push(val);
                                    else if (val === "FR" || val === "STB") modeVal = val;
                                }
                                if (nums.length >= 1) {
                                    garmentResults["TOP"]["BACK SEAM"] = { strength: nums[0] || "", elongation: nums[1] || "", mode: modeVal };
                                    garmentResults["BOTTOM"]["BACK SEAM"] = { strength: nums[0] || "", elongation: nums[1] || "", mode: modeVal };
                                    foundBackSeam = true;
                                }
                            }
                        }
                        // ====================================================================

                        if (Object.keys(garmentResults["TOP"]).length === 0 && Object.keys(garmentResults["BOTTOM"]).length === 0) {
                            btnResults.innerText = '\u26A0\uFE0F Sin resultado (Stretch)';
                            setTimeout(() => { btnResults.innerText = originalText; }, 4000);
                            return;
                        }

                        let camposLlenados = 0;
                        let piezasActivas = obtenerPiezasActivasUI();
                        if (piezasActivas.length === 0) { piezasActivas = ['A']; }

                        const filas = document.querySelectorAll('tr');
                        let currentReading = "";
                        let currentSectionUI = "TOP";
                        let injectedKeys = { strength: new Set(), elongation: new Set(), mode: new Set() };

                        filas.forEach(fila => {
                            if (fila.querySelector('table')) return;

                            let textoFila = fila.innerText.toUpperCase();
                            if (textoFila.includes("REQUIREMENT") || textoFila.includes("PARAMETER") || textoFila.includes("[CATEGORY]")) return;
                            if (textoFila.includes("EXTRA CONCLUSION") || textoFila.includes("PIECE DETAILS")) return;
                            if (textoFila.includes("SAVE") || textoFila.includes("REFRESH")) return;

                            let rawHTML = fila.cells.length > 0 ? fila.cells[0].innerText.trim().toUpperCase() : "";
                            let cell1 = fila.cells.length > 1 ? fila.cells[1].innerText.trim().toUpperCase() : "";

                            if (rawHTML !== "") {
                                if (rawHTML.includes("STRENGTH")) currentReading = "strength";
                                else if (rawHTML.includes("ELONGATION")) currentReading = "elongation";
                                else if (rawHTML.includes("RUPTURE") || rawHTML.includes("MODE")) currentReading = "mode";
                            }

                            if (cell1.includes("**TOP**")) currentSectionUI = "TOP";
                            else if (cell1.includes("**BOTTOM**")) currentSectionUI = "BOTTOM";
                            else if (cell1.includes("**UNDERWEAR**")) currentSectionUI = "UNDERWEAR";
                            else if (cell1.includes("**OTHER**")) currentSectionUI = "OTHER";

                            if (!currentReading) return;

                            if (cell1.includes("[PART]")) {
                                let partName = cell1.replace("[PART]", "").replace(":", "").trim().toUpperCase();
                                if (partName.length < 3) return;

                                let sectionData = garmentResults[currentSectionUI];
                                if (sectionData) {
                                    let pClean = partName.replace(/\s+/g, "");

                                    let matchKey = Object.keys(sectionData).find(k => k.replace(/\s+/g, "") === pClean);
                                    if (!matchKey) {
                                        matchKey = Object.keys(sectionData).find(k => {
                                            let kClean = k.replace(/\s+/g, "");
                                            if (pClean === "ARMHOLE" && kClean === "FRONTARMHOLE") return true;
                                            if (kClean === "SLEEVE" && pClean.includes("HEM")) return false;
                                            if (pClean === "SLEEVE" && kClean.includes("HEM")) return false;
                                            if (kClean === "BOTTOM" && pClean.includes("HEM")) return false;
                                            if (pClean === "BOTTOM" && kClean.includes("HEM")) return false;
                                            if (kClean === "FRONTARMHOLE" && pClean === "BACKARMHOLE") return false;
                                            return kClean.length >= 3 && (kClean.includes(pClean) || pClean.includes(kClean));
                                        });
                                    }

                                    if (matchKey) {
                                        let uniqueKey = currentSectionUI + "_" + matchKey;
                                        if (!injectedKeys[currentReading].has(uniqueKey)) {
                                            let resultObj = sectionData[matchKey];
                                            let valToInject = "";

                                            if (currentReading === "strength") valToInject = resultObj.strength;
                                            else if (currentReading === "elongation") valToInject = resultObj.elongation;
                                            else if (currentReading === "mode") valToInject = resultObj.mode;

                                            if (valToInject && valToInject.trim() !== "") {
                                                let count = inyectarEnPiezasActivas(fila, valToInject, piezasActivas);
                                                if (count > 0) {
                                                    camposLlenados += count;
                                                    injectedKeys[currentReading].add(uniqueKey);
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        });

                        if (camposLlenados > 0) {
                            btnResults.innerText = `✅ (${camposLlenados})`;
                        } else {
                            btnResults.innerText = '\u26A0\uFE0F Nada inyectado';
                        }
                        setTimeout(() => { btnResults.innerText = originalText; }, 3000);
                        return;

                    // --- GENERIC COLORFASTNESS (Accelerated Laundering, Water, Light, Perspiration, Bleach) ---
                    } else if (testSeleccionado.includes("COLORFASTNESS TO") || testSeleccionado.includes("COLOR FASTNESS TO") || testSeleccionado.includes("PERSPIRATION") || testSeleccionado.includes("WATER") || testSeleccionado.includes("LIGHT") || testSeleccionado.includes("BLEACH") || testSeleccionado.includes("WASHING")) {

                        let autoGradingData = {}; // { subpiece: { testName: { fiber: val } } }
                        let standardData = {}; // { subpiece: { ... } }

                        let testKeyword = "";
                        if (testSeleccionado.includes("ACCELERATED LAUNDERING")) testKeyword = "ACCELERATED LAUNDERING";
                        else if (testSeleccionado.includes("WATER")) testKeyword = "WATER";
                        else if (testSeleccionado.includes("PERSPIRATION")) {
                            if (testSeleccionado.includes("ACID")) testKeyword = "PERSPIRATION ACID";
                            else if (testSeleccionado.includes("ALKALINE") || testSeleccionado.includes("ALCALINE")) testKeyword = "PERSPIRATION ALKALINE";
                            else testKeyword = "PERSPIRATION";
                        }
                        else if (testSeleccionado.includes("LIGHT")) testKeyword = "LIGHT FASTNESS";
                        else if (testSeleccionado.includes("NON CHLORINE BLEACH") || testSeleccionado.includes("NON-CHLORINE BLEACH")) testKeyword = "NON-CHLORINE BLEACH";
                        else if (testSeleccionado.includes("BLEACH")) testKeyword = "BLEACH";
                        else if (testSeleccionado.includes("SALIVA")) testKeyword = "SALIVA";

                        // Agrupar filas
                        let linesByPage = {};
                        itemsAvanzados.forEach(item => {
                            if (!linesByPage[item.page]) linesByPage[item.page] = {};
                            let linesY = linesByPage[item.page];
                            let y = Math.round(item.y * 10) / 10;
                            let foundY = Object.keys(linesY).find(k => Math.abs(parseFloat(k) - y) < 4.0);
                            if (foundY) { linesY[foundY].push(item); }
                            else { linesY[y] = [item]; }
                        });

                        let rows = [];
                        let pages = Object.keys(linesByPage).sort((a, b) => parseInt(a) - parseInt(b));
                        pages.forEach(p => {
                            let linesY = linesByPage[p];
                            let sortedY = Object.keys(linesY).sort((a, b) => parseFloat(b) - parseFloat(a));
                            sortedY.forEach(y => {
                                let rowItems = linesY[y];
                                rowItems.sort((a, b) => a.x - b.x);
                                rows.push(rowItems);
                            });
                        });

                        let currentTable = "";
                        let fastnessHeaders = [];
                        let shadeChgHeaderX = -1;
                        let currentSubpiece = "A"; // Base piece by default

                        // 1. Parsing Auto Grading Table with Subpieces
                        for (let i = 0; i < rows.length; i++) {
                            let textFila = rows[i].map(x => x.str.trim()).join(" ").toUpperCase();
                            let textFilaLimpio = textFila.replace(/\s+/g, "");

                            // Detect Subpiece Titles
                            if (textFilaLimpio === "AUTOGRADING") currentSubpiece = "A";
                            else if (textFilaLimpio === "FABRIC" || textFila.includes("FABRIC/PRINT") || textFila.includes("FABRIC & PRINT")) currentSubpiece = "FABRIC";
                            else if (textFilaLimpio === "PRINT" || textFila.includes("PRINT")) currentSubpiece = "PRINT";
                            else if (textFilaLimpio === "HEATTRANSFER" || textFila.includes("HEAT TRANSFER")) currentSubpiece = "HEATTRANSFER";

                            if (textFilaLimpio === "FASTNESS") {
                                currentTable = "FASTNESS";
                                for (let j = i + 1; j < Math.min(i + 5, rows.length); j++) {
                                    let hRow = rows[j].map(x => x.str.trim().toUpperCase());
                                    if (hRow.includes("ACETATE") && hRow.includes("COTTON")) {
                                        fastnessHeaders = rows[j];
                                        break;
                                    }
                                }
                                continue;
                            } else if (textFilaLimpio === "SHADECHANGE" || textFila.includes("SHADE CHANGE") || textFila.includes("SHADE CHG") || textFila.includes("COLOR CHANGE")) {
                                currentTable = "SHADECHANGE";
                                for (let j = i + 1; j < Math.min(i + 5, rows.length); j++) {
                                    let scHeader = rows[j].find(x => x.str.toUpperCase().includes("SHADE CHG") || x.str.toUpperCase().includes("SHADE CHANGE") || x.str.toUpperCase().includes("OFF TONE"));
                                    if (scHeader) {
                                        shadeChgHeaderX = scHeader.x;
                                        break;
                                    }
                                }
                                continue;
                            }

                            if (currentTable === "FASTNESS" && fastnessHeaders.length > 0) {
                                if (rows[i].some(it => /^[0-9.]{3,4}$/.test(it.str.trim()))) {
                                    let testName = "";
                                    if (textFilaLimpio.includes("ACCELERATEDLAUNDERING")) testName = "ACCELERATED LAUNDERING";
                                    else if (textFilaLimpio.includes("WATER")) testName = "WATER";
                                    else if (textFilaLimpio.includes("PERSPIRATIONACID")) testName = "PERSPIRATION ACID";
                                    else if (textFilaLimpio.includes("PERSPIRATIONALKALINE")) testName = "PERSPIRATION ALKALINE";
                                    else if (textFilaLimpio.includes("LIGHTFASTNESS")) testName = "LIGHT FASTNESS";
                                    else if (textFilaLimpio.includes("NON-CHLORINEBLEACH") || textFilaLimpio.includes("NONCHLORINEBLEACH")) testName = "NON-CHLORINE BLEACH";
                                    else if (textFilaLimpio.includes("SALIVA")) testName = "SALIVA";

                                    if (testName) {
                                        if (!autoGradingData[currentSubpiece]) autoGradingData[currentSubpiece] = {};
                                        if (!autoGradingData[currentSubpiece][testName]) autoGradingData[currentSubpiece][testName] = {};

                                        ["ACETATE", "COTTON", "NYLON", "POLYESTER", "ACRYLIC", "WOOL"].forEach(fiber => {
                                            let hItem = fastnessHeaders.find(h => h.str.toUpperCase().includes(fiber));
                                            if (hItem) {
                                                let valItem = rows[i].find(v => Math.abs(v.x - hItem.x) < 20 && /^[0-9.]+$/.test(v.str.trim()));
                                                if (valItem) autoGradingData[currentSubpiece][testName][fiber] = valItem.str.trim();
                                            }
                                        });
                                    }
                                }
                            } else if (currentTable === "SHADECHANGE" && shadeChgHeaderX !== -1) {
                                if (rows[i].some(it => /^[0-9.]{3,4}$/.test(it.str.trim()))) {
                                    let testName = "";
                                    if (textFilaLimpio.includes("ACCELERATEDLAUNDERING")) testName = "ACCELERATED LAUNDERING";
                                    else if (textFilaLimpio.includes("WATER")) testName = "WATER";
                                    else if (textFilaLimpio.includes("PERSPIRATIONACID")) testName = "PERSPIRATION ACID";
                                    else if (textFilaLimpio.includes("PERSPIRATIONALKALINE")) testName = "PERSPIRATION ALKALINE";
                                    else if (textFilaLimpio.includes("LIGHTFASTNESS")) testName = "LIGHT FASTNESS";
                                    else if (textFilaLimpio.includes("NON-CHLORINEBLEACH") || textFilaLimpio.includes("NONCHLORINEBLEACH")) testName = "NON-CHLORINE BLEACH";
                                    else if (textFilaLimpio.includes("SALIVA")) testName = "SALIVA";

                                    if (testName) {
                                        if (!autoGradingData[currentSubpiece]) autoGradingData[currentSubpiece] = {};
                                        if (!autoGradingData[currentSubpiece][testName]) autoGradingData[currentSubpiece][testName] = {};

                                        let valItem = rows[i].find(v => Math.abs(v.x - shadeChgHeaderX) < 40 && /^[0-9.]+$/.test(v.str.trim()));
                                        if (valItem) autoGradingData[currentSubpiece][testName]["CHANGE"] = valItem.str.trim();
                                    }
                                }
                            }
                        }

                        // 2. Parsing Estandar (Fallback)
                        if (Object.keys(autoGradingData).length === 0) {
                            standardData["A"] = {};
                            let ccVal = '';
                            let ccGroup = itemsAvanzados.find(it => it.str && (it.str.toUpperCase().includes('COLOR CHANGE') || it.str.toUpperCase().includes('COLORCHANGE') || it.str.toUpperCase().includes('SHADE CHANGE')));
                            if (ccGroup) {
                                let lineItems = itemsAvanzados.filter(it => it.page === ccGroup.page && Math.abs(it.y - ccGroup.y) < 15 && it.x > ccGroup.x);
                                lineItems.sort((a, b) => a.x - b.x);
                                for (let it of lineItems) {
                                    let m = it.str.trim().match(/(\d+(?:\.\d+)?)/);
                                    if (m) { ccVal = m[1]; break; }
                                }
                            }
                            if (ccVal) standardData["A"]["CHANGE"] = ccVal;

                            const fibras = ['ACETATE', 'COTTON', 'NYLON', 'POLYESTER', 'ACRYLIC', 'WOOL'];
                            fibras.forEach(fibra => {
                                let fbGroup = itemsAvanzados.find(it => it.str && it.str.toUpperCase() === fibra);
                                if (fbGroup) {
                                    let lineItems = itemsAvanzados.filter(it => it.page === fbGroup.page && Math.abs(it.y - fbGroup.y) < 15 && it.x > fbGroup.x);
                                    lineItems.sort((a, b) => a.x - b.x);
                                    for (let it of lineItems) {
                                        let m = it.str.trim().match(/(\d+(?:\.\d+)?)/);
                                        if (m) { standardData["A"][fibra] = m[1]; break; }
                                    }
                                }
                            });
                        }

                        if (Object.keys(autoGradingData).length === 0 && Object.keys(standardData).length === 0) {
                            btnResults.innerText = '\u26A0\uFE0F Sin resultado (Color)';
                            setTimeout(() => { btnResults.innerText = originalText; }, 4000);
                            return;
                        }

                        let camposLlenados = 0;
                        let piezasActivas = obtenerPiezasActivasUI();
                        if (piezasActivas.length === 0) { piezasActivas = ['A']; }

                        const filas = document.querySelectorAll('tr');
                        let currentMode = ""; // VISUAL o DIGIEYE
                        let currentPerspMode = ""; // ACID o ALKALINE

                        filas.forEach(fila => {
                            if (fila.querySelector('table')) return;

                            let rawHTML = fila.cells.length > 0 ? fila.cells[0].innerText.trim().toUpperCase() : "";
                            let cell1 = fila.cells.length > 1 ? fila.cells[1].innerText.trim().toUpperCase() : "";
                            let rowText = fila.innerText.toUpperCase();

                            if (rawHTML !== "") {
                                if (rawHTML.includes("VISUAL")) currentMode = "VISUAL";
                                else if (rawHTML.includes("DIGIEYE") || rawHTML.includes("DIGI EYE") || rawHTML.includes("DIGEYE")) currentMode = "DIGIEYE";

                                if (rawHTML.includes("ACID")) currentPerspMode = "PERSPIRATION ACID";
                                else if (rawHTML.includes("ALKALINE") || rawHTML.includes("ALCALINE")) currentPerspMode = "PERSPIRATION ALKALINE";
                            }

                            if (rowText.includes("REQUIREMENT") || rowText.includes("EXTRA CONCLUSION") || rowText.includes("PIECE DETAILS")) return;

                            let targetProp = "";
                            if (rowText.includes("COLOR CHANGE") || rowText.includes("SHADE CHANGE") || rowText.includes("GRADE")) targetProp = "CHANGE";
                            else if (rowText.includes("ACETATE")) targetProp = "ACETATE";
                            else if (rowText.includes("COTTON")) targetProp = "COTTON";
                            else if (rowText.includes("NYLON") || rowText.includes("POLYAMIDE")) targetProp = "NYLON";
                            else if (rowText.includes("POLYESTER")) targetProp = "POLYESTER";
                            else if (rowText.includes("ACRYLIC")) targetProp = "ACRYLIC";
                            else if (rowText.includes("WOOL")) targetProp = "WOOL";

                            if (rowText.includes("SELF & ADJACENT") || rowText.includes("OTHERS FOR REFERENCE")) {
                                if (targetProp === "COTTON" || targetProp === "WOOL") {
                                    if (rowText.includes("OTHERS FOR REFERENCE")) targetProp = "";
                                } else if (targetProp === "ACETATE" || targetProp === "NYLON" || targetProp === "POLYESTER" || targetProp === "ACRYLIC") {
                                    if (rowText.includes("SELF & ADJACENT")) targetProp = "";
                                }
                            }

                            if (targetProp !== "") {
                                let inputs = Array.from(fila.querySelectorAll('input, textarea')).filter(inp => {
                                    let type = inp.type ? inp.type.toLowerCase() : 'text';
                                    return !(type === 'hidden' || type === 'submit' || type === 'button' || type === 'checkbox' || type === 'radio' || inp.style.display === 'none' || inp.readOnly || inp.disabled);
                                });

                                for (let k = 0; k < inputs.length && k < piezasActivas.length; k++) {
                                    let keyPieza = piezasActivas[k];
                                    let tipo = "A";

                                    if (keyPieza.includes("_FABRIC&PRINT")) tipo = "FABRIC&PRINT";
                                    else if (keyPieza.includes("_FABRIC")) tipo = "FABRIC";
                                    else if (keyPieza.includes("_PRINT")) tipo = "PRINT";
                                    else if (keyPieza.includes("_HEATTRANSFER")) tipo = "HEATTRANSFER";

                                    let testNameLookup = testKeyword;
                                    if (testKeyword === "PERSPIRATION") {
                                        if (currentPerspMode) testNameLookup = currentPerspMode;
                                        else testNameLookup = "PERSPIRATION ACID";
                                    }

                                    let dataSubpiece = null;
                                    if (Object.keys(autoGradingData).length > 0) {
                                        let subpObj = autoGradingData[tipo] || autoGradingData["A"];
                                        if (!subpObj && Object.keys(autoGradingData).length === 1) {
                                            subpObj = autoGradingData[Object.keys(autoGradingData)[0]];
                                        }
                                        if (subpObj) {
                                            if (subpObj[testNameLookup]) {
                                                dataSubpiece = subpObj[testNameLookup];
                                            } else {
                                                dataSubpiece = subpObj[Object.keys(subpObj)[0]];
                                            }
                                        }
                                    } else {
                                        dataSubpiece = standardData[tipo] || standardData["A"];
                                    }

                                    if (dataSubpiece && dataSubpiece[targetProp]) {
                                        let valToInject = dataSubpiece[targetProp];

                                        let isDigiEye = false;
                                        if (valToInject.includes(".")) {
                                            let decs = valToInject.split(".")[1].trim();
                                            if (decs.length >= 2) isDigiEye = true;
                                        }

                                        if (currentMode === "VISUAL" && isDigiEye) continue;
                                        if (currentMode === "DIGIEYE" && !isDigiEye) continue;

                                        inputs[k].value = valToInject;
                                        let ev = new Event('change', { bubbles: true });
                                        inputs[k].dispatchEvent(ev);
                                        camposLlenados++;
                                    }
                                }
                            }
                        });

                        if (camposLlenados > 0) btnResults.innerText = '\u2705 (' + camposLlenados + ')';
                        else btnResults.innerText = '\u26A0\uFE0F Nada inyectado';
                        setTimeout(() => { btnResults.innerText = originalText; }, 3000);
                        return;
                    // --- FIN DE SEAM STRETCHABILITY ---
                    } else {
                        btnResults.innerText = '\u26A0\uFE0F Prueba no soportada';
                        setTimeout(() => { btnResults.innerText = originalText; }, 3000);
                        return;
                    }

                } catch (error) {
                    console.error(error);
                    btnResults.innerText = '\u274C Error';
                    setTimeout(() => { btnResults.innerText = originalText; }, 3000);
                }
            });
        }

    }, 2500);
})();










