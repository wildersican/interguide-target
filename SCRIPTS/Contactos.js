// ==UserScript==
// @name         Selector Automático de Contactos
// @namespace    http://tampermonkey.net/
// @version      2.40
// @description  Selector automatico de contactos actualizado a la lista v54
// @author       Wilder Sican
// @match        *://tips-amer.intertek.com/Transactions/Add_Sample_Contacts.aspx*
// @updateURL    https://gist.githubusercontent.com/wildersican/7d5fd735a4c61d835469b6abd9cc4ec8/raw/selector-automatico-contactos.user.js
// @downloadURL  https://gist.githubusercontent.com/wildersican/7d5fd735a4c61d835469b6abd9cc4ec8/raw/selector-automatico-contactos.user.js
// @run-at       document-end
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // --- MATRIZ DE CONTACTOS POR REGIÓN (VACÍA / LISTA PARA CONFIGURAR) ---
    const regionEmails = {
        "Americas": [],
        "Central America": [],
        "Hong Kong": [],
        "Vietnam": [],
        "Shanghai": []
    };

    // --- TRADUCTOR INVISIBLE DE DOMINIOS (BLINDADO PARA SAE-A, C-SITE Y KANTEX) ---
    function normalizeEmail(email) {
        if (!email) return "";
        let e = email.toLowerCase().trim();
        e = e.replace(/@sae(?:-?a)?(?:\.[a-z.]+)?$/i, '@sae-a.com');
        e = e.replace(/@c?-?site(?:\.[a-z.]+)?$/i, '@c-site.co.kr');
        e = e.replace(/@kantex(?:-?gt)?(?:\.[a-z.]+)?$/i, '@kantex-gt.com');
        return e;
    }

    function openExtractorUI() {
        if(document.getElementById('custom-email-extractor')) return;

        const container = document.createElement('div');
        container.id = 'custom-email-extractor';
        container.style.cssText = 'position:fixed; top:50px; left:50%; transform:translateX(-50%); width:600px; background:#f4f7f6; border:2px solid #3caed6; padding:15px; z-index:999999; box-shadow:0 4px 10px rgba(0,0,0,0.2); font-family:Arial, sans-serif; border-radius:8px;';

        const title = document.createElement('h3');
        title.innerText = 'Lector de PDF: Selección Inteligente Avanzada (v2.39)';
        title.style.cssText = 'margin:0 0 10px 0; color:#333; font-size:16px; border-bottom:1px solid #ccc; padding-bottom:5px;';

        const textarea = document.createElement('textarea');
        textarea.placeholder = 'Pega aquí el texto del PDF... Soldador de prefijos en saltos de línea activado.';
        textarea.style.cssText = 'width:100%; height:120px; margin-bottom:15px; padding:8px; box-sizing:border-box; border:1px solid #aaa; border-radius:4px; resize:vertical; font-size:13px;';

        const controls = document.createElement('div');
        controls.style.cssText = 'display:flex; justify-content:flex-end; align-items:center;';

        const btnExtract = document.createElement('button');
        btnExtract.innerText = 'Procesar Texto';
        btnExtract.style.cssText = 'background:#3caed6; color:white; border:none; padding:8px 15px; cursor:pointer; font-weight:bold; border-radius:4px; margin-right:8px; transition:0.2s;';

        const btnClose = document.createElement('button');
        btnClose.innerText = 'Cerrar';
        btnClose.style.cssText = 'background:#dc3545; color:white; border:none; padding:8px 15px; cursor:pointer; font-weight:bold; border-radius:4px; transition:0.2s;';

        controls.appendChild(btnExtract);
        controls.appendChild(btnClose);

        container.appendChild(title);
        container.appendChild(textarea);
        container.appendChild(controls);
        document.body.appendChild(container);

        btnClose.onclick = () => container.remove();

        btnExtract.onclick = () => {
            const rawText = textarea.value;
            if(!rawText.trim()) {
                alert('La caja está vacía. Pega el texto del PDF primero.');
                return;
            }

            let text = rawText;

            // --- 1. CORRECCIÓN DE TYPOS EN DOMINIOS (Ej. willbes,com -> willbes.com) ---
            text = text.replace(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+),([a-zA-Z]{2,4})\b/g, '$1.$2');

            // --- REPARADORES BÁSICOS ---
            text = text.replace(/c-[\s\r\n\u00AD\u200B]+site/gi, 'c-site');
            text = text.replace(/\bc[\s\r\n\u00AD\u200B]+site/gi, 'c-site');
            text = text.replace(/sae[\s\r\n\u00AD\u200B]*-[\s\r\n\u00AD\u200B]*a\.com/gi, 'sae-a.com');

            // --- PRE-EXPANSIÓN DE DOMINIOS INCOMPLETOS EN EL TEXTO ---
            text = text.replace(/([a-zA-Z0-9._%+-]+)@sae(?:-?a)?(?:\.[a-z.]+)?\b/gi, '$1@sae-a.com');
            text = text.replace(/([a-zA-Z0-9._%+-]+)@c?-?site(?:\.[a-z.]+)?\b/gi, '$1@c-site.co.kr');
            text = text.replace(/([a-zA-Z0-9._%+-]+)@kantex(?:-?gt)?(?:\.[a-z.]+)?\b/gi, '$1@kantex-gt.com');

            // --- GUILLOTINA QUIRÚRGICA ---
            const cutoffRegex = /Page[\s\r\n]*5[\s\r\n]*(?:of|\/)[\s\r\n]*\d+/i;
            const cutoffMatch = text.match(cutoffRegex);
            if (cutoffMatch) {
                text = text.substring(0, cutoffMatch.index);
            }

            // --- 2. REPARADOR Y SOLDADOR EN BUCLE DE SALTOS DE LÍNEA ---
            text = text.replace(/[\u2013\u2014\u2212\u00AD]/g, '-');
            for(let i = 0; i < 3; i++) {
                // A) Soldador de prefijos cortados tras separadores (/s + \n + rdcpsia@ -> /srdcpsia@)
                text = text.replace(/([/,;:]\s*[a-zA-Z0-9._%+-]+)[\s\r\n\u00AD\u200B]+([a-zA-Z0-9._%+-]+@)/g, '$1$2');
                // B) Unir guiones que cortan dominios
                text = text.replace(/([a-zA-Z0-9._%+-]+-)[\s\r\n\u00AD\u200B]+([a-zA-Z0-9.-]*\.[a-zA-Z]{2,})/g, '$1$2');
                // C) Unir saltos antes o después del @
                text = text.replace(/([a-zA-Z0-9._%+-]+@)[\s\r\n\u00AD\u200B]+([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, '$1$2');
                text = text.replace(/([a-zA-Z0-9._%+-]+)[\s\r\n\u00AD\u200B]+(@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, '$1$2');
                // D) Unir saltos en medio del dominio
                text = text.replace(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+)[\s\r\n\u00AD\u200B]+([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, function(match, p1, p2) {
                    if(p2.includes('@')) return match;
                    return p1 + p2;
                });
            }

            // --- 3. LIMPIADOR UNIVERSAL DE SEPARADORES ENTRE CORREOS (/, ;, ,) ---
            text = text.replace(/(\.[a-zA-Z]{2,})[\s/,;]+([a-zA-Z0-9._%+-]+@)/g, '$1 $2');

            // --- EXTRACCIÓN GLOBAL (Con Traductor Invisible) ---
            const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
            const allFoundEmails = [...new Set((text.match(emailRegex) || []).map(e => normalizeEmail(e)))];

            // --- SEPARACIÓN POR BLOQUES ---
            const specialRegex = /SPECIAL TEST INSTRUCTIONS[\s\S]*?(?=APPLICANT INFORMATION|BILLING INFORMATION|VENDOR INFORMATION|FACTORY INFORMATION|$)/i;
            const specialMatch = text.match(specialRegex);
            let specialEmails = [];
            if (specialMatch) { specialEmails = [...new Set((specialMatch[0].match(emailRegex) || []).map(e => normalizeEmail(e)))]; }

            const applicantRegex = /APPLICANT INFORMATION[\s\S]*?(?=BILLING INFORMATION|VENDOR INFORMATION|FACTORY INFORMATION|$)/i;
            const applicantMatch = text.match(applicantRegex);
            let applicantEmails = [];
            if (applicantMatch) { applicantEmails = [...new Set((applicantMatch[0].match(emailRegex) || []).map(e => normalizeEmail(e)))]; }

            const billingRegex = /BILLING INFORMATION[\s\S]*?(?=VENDOR INFORMATION|FACTORY INFORMATION|MILL INFORMATION|$)/i;
            const billingMatch = text.match(billingRegex);
            let billingEmails = [];
            if (billingMatch) { billingEmails = [...new Set((billingMatch[0].match(emailRegex) || []).map(e => normalizeEmail(e)))]; }

            const factoryRegex = /FACTORY INFORMATION[\s\S]*?(?=MILL INFORMATION|PRODUCT DETAILS|$)/i;
            const factoryMatch = text.match(factoryRegex);
            let factoryEmails = [];
            if (factoryMatch) { factoryEmails = [...new Set((factoryMatch[0].match(emailRegex) || []).map(e => normalizeEmail(e)))]; }

            let gapContactEmails = allFoundEmails.filter(e =>
                !applicantEmails.includes(e) &&
                !billingEmails.includes(e) &&
                !specialEmails.includes(e) &&
                !factoryEmails.includes(e)
            );

            // --- BÚSQUEDA INVERSA POR NOMBRE ---
            const gapContactBlockRegex = /Gap Inc\.?\s*Contact[\s\S]*?(?=Design Number|PO Number|Ship-Cancel Date|PO Quantity|$)/i;
            const gapContactBlockMatch = text.match(gapContactBlockRegex);

            if (gapContactBlockMatch) {
                let rawNamesContent = gapContactBlockMatch[0].replace(/Gap Inc\.?\s*Contact/i, '').trim();

                // if (rawNamesContent.toLowerCase().includes("cesar")) { gapContactEmails.push("labtest_ca@gap.com"); }

                let potentialNames = rawNamesContent.split(/[\n/,&;]+/).map(n => n.trim().toLowerCase()).filter(n => n.length > 4);
                const allRows = document.querySelectorAll('table tr');

                allRows.forEach(row => {
                    const cells = row.querySelectorAll('td');
                    const emailMatch = row.innerText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+/);

                    if (emailMatch && cells.length > 2) {
                        const rowEmail = normalizeEmail(emailMatch[0]);
                        const rawNameCell = cells[1].innerText.trim();

                        let cleanTblName = rawNameCell.replace(/^[A-Za-z]:/i, '').replace(/\([^)]+\)$/i, '').toLowerCase().replace(/[^a-z0-9]/g, '');
                        let emailPrefix = rowEmail.split('@')[0].replace(/[^a-z0-9]/g, '').toLowerCase();
                        let isMatch = false;

                        for(let pName of potentialNames) {
                            let cleanPdfName = pName.replace(/[^a-z0-9]/g, '');
                            if (cleanPdfName.length > 4) {
                                let matchName = cleanTblName.length > 3 && (cleanTblName.includes(cleanPdfName) || cleanPdfName.includes(cleanTblName));
                                let matchPrefix = emailPrefix.length > 3 && emailPrefix.includes(cleanPdfName);
                                if (matchName || matchPrefix) {
                                    isMatch = true;
                                    break;
                                }
                            }
                        }

                        if (isMatch && !applicantEmails.includes(rowEmail) && !billingEmails.includes(rowEmail) && !specialEmails.includes(rowEmail) && !factoryEmails.includes(rowEmail)) {
                            gapContactEmails.push(rowEmail);
                        }
                    }
                });
            }

            gapContactEmails = [...new Set(gapContactEmails)];

            // --- DETECCIÓN DE REGIONES ---
            const textUpper = text.toUpperCase();
            let regionEmailsList = [];

            if (textUpper.includes("GIS HONG KONG") || textUpper.match(/\bGIS[\s-]*HK\b/) || textUpper.includes("NORTH ASIA") || textUpper.includes("HIS HONG KONG")) {
                regionEmailsList = regionEmailsList.concat(regionEmails["Hong Kong"]);
            }
            if (textUpper.includes("SHANGHAI") || textUpper.includes("SHANGAI")) {
                regionEmailsList = regionEmailsList.concat(regionEmails["Shanghai"]);
            }
            if (textUpper.includes("GIS CENTRAL AMERICA") || textUpper.match(/\bGIS[\s-]*CA\b/)) {
                regionEmailsList = regionEmailsList.concat(regionEmails["Central America"]);
            }
            if (textUpper.includes("GIS AMERCIA") || textUpper.match(/\bGIS AMERIC\b/) || textUpper.includes("GIS AMERICAS")) {
                regionEmailsList = regionEmailsList.concat(regionEmails["Americas"]);
            }
            if (textUpper.includes("GIS VIETNAM") || textUpper.match(/\bGIS[\s-]*VN\b/)) {
                regionEmailsList = regionEmailsList.concat(regionEmails["Vietnam"]);
            }

            regionEmailsList = [...new Set(regionEmailsList.map(e => normalizeEmail(e)))];

            // --- CORREO OBLIGATORIO FIJO (VACÍO) ---
            const mandatoryEmails = [];

            const expectedEmails = new Set([
                ...specialEmails, ...applicantEmails, ...billingEmails, ...factoryEmails, ...gapContactEmails, ...regionEmailsList, ...mandatoryEmails
            ]);

            if(expectedEmails.size === 0){
                alert('No se detectaron correos ni nombres clave en las primeras páginas del reporte.');
                return;
            }

            const rows = document.querySelectorAll('table tr');
            let matchCount = 0;
            let clearedCount = 0;
            const foundEmailsInTable = new Set();

            rows.forEach(row => {
                let rowEmail = "";
                const singleEmailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+/;
                const match = row.innerText.match(singleEmailRegex);
                if(match) { rowEmail = normalizeEmail(match[0]); }

                if(rowEmail) {
                    const checkboxes = Array.from(row.querySelectorAll('input[type="checkbox"]'));

                    if(checkboxes.length >= 12) {
                        const isTargetEmail = specialEmails.includes(rowEmail) || applicantEmails.includes(rowEmail) || billingEmails.includes(rowEmail) || factoryEmails.includes(rowEmail) || gapContactEmails.includes(rowEmail) || regionEmailsList.includes(rowEmail) || mandatoryEmails.includes(rowEmail);

                        if(isTargetEmail) {
                            foundEmailsInTable.add(rowEmail);
                            let columnsToClick = new Set();

                            if(specialEmails.includes(rowEmail)) { [2, 11].forEach(c => columnsToClick.add(c)); }
                            if(applicantEmails.includes(rowEmail)) { [0, 2, 5, 11].forEach(c => columnsToClick.add(c)); }
                            if(billingEmails.includes(rowEmail)) { [2, 5, 6, 11].forEach(c => columnsToClick.add(c)); }
                            if(factoryEmails.includes(rowEmail)) { [2, 5, 11].forEach(c => columnsToClick.add(c)); }
                            if(gapContactEmails.includes(rowEmail)) { [2, 11, 12].forEach(c => columnsToClick.add(c)); }
                            if(regionEmailsList.includes(rowEmail)) { [2, 11].forEach(c => columnsToClick.add(c)); }
                            if(mandatoryEmails.includes(rowEmail)) { [2, 11].forEach(c => columnsToClick.add(c)); }

                            let rowUpdated = false;

                            checkboxes.forEach((cb, idx) => {
                                let shouldBeChecked = columnsToClick.has(idx);
                                if (columnsToClick.has(12) && idx === checkboxes.length - 1) {
                                    shouldBeChecked = true;
                                }
                                if(cb.checked !== shouldBeChecked) {
                                    cb.click();
                                    if(cb.checked !== shouldBeChecked) {
                                        cb.checked = shouldBeChecked;
                                        cb.dispatchEvent(new Event('change', { bubbles: true }));
                                    }
                                    rowUpdated = true;
                                }
                            });

                            if(rowUpdated) {
                                row.style.setProperty('background-color', '#d4edda', 'important'); // Verde
                                matchCount++;
                            }
                        } else {
                            let wasCleared = false;
                            checkboxes.forEach(cb => {
                                if(cb.checked) {
                                    cb.click();
                                    if(cb.checked) {
                                        cb.checked = false;
                                        cb.dispatchEvent(new Event('change', { bubbles: true }));
                                    }
                                    wasCleared = true;
                                }
                            });
                            if(wasCleared) {
                                row.style.setProperty('background-color', '#f8d7da', 'important'); // Rojo
                                clearedCount++;
                            }
                        }
                    }
                }
            });

            const missingEmails = [...expectedEmails].filter(email => !foundEmailsInTable.has(email));

            if (missingEmails.length > 0) {
                alert(`⚠️ ADVERTENCIA: Los siguientes (${missingEmails.length}) contactos/nombres se detectaron en el PDF pero NO existen en la lista de Intertek:\n\n` + missingEmails.join("\n"));
            }

            btnExtract.innerText = `¡Listo! (${matchCount} Agregados | ${clearedCount} Borrados)`;
            setTimeout(() => { btnExtract.innerText = 'Procesar Texto'; }, 4000);
        };
    }

    function maintainLauncherButton() {
        if (!document.getElementById('launcher-btn-extractor')) {
            const launcherBtn = document.createElement('button');
            launcherBtn.id = 'launcher-btn-extractor';
            launcherBtn.innerHTML = '⚡ Seleccionar Contactos';
            launcherBtn.style.cssText = 'position:fixed; bottom:20px; right:20px; background:#28a745; color:white; border:none; padding:10px 15px; border-radius:50px; cursor:pointer; font-weight:bold; box-shadow:0 4px 6px rgba(0,0,0,0.2); z-index:999998; transition:transform 0.2s; font-family:Arial, sans-serif;';
            launcherBtn.onmouseover = () => launcherBtn.style.transform = 'scale(1.05)';
            launcherBtn.onmouseout = () => launcherBtn.style.transform = 'scale(1)';
            launcherBtn.onclick = openExtractorUI;
            document.body.appendChild(launcherBtn);
        }
    }
    setInterval(maintainLauncherButton, 1000);

})();