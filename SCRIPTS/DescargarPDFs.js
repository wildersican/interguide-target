// ==UserScript==
// @name         Descargador Múltiple de PDFs - Intertek
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Añade un botón flotante DENTRO de la ventana que contiene los PDFs.
// @author       Wilder Sican
// @match        https://interlink2.intertek.com/*
// @grant        none
// @downloadURL  https://gist.githubusercontent.com/wildersican/0322ea0342a5e1bd39e4ce6a60c4e2f2/raw/DescargarPDFs.user.js
// @updateURL    https://gist.githubusercontent.com/wildersican/0322ea0342a5e1bd39e4ce6a60c4e2f2/raw/DescargarPDFs.user.js
// ==/UserScript==

(function() {
    'use strict';

    // 1. Verificar si esta ventana (sea la principal o el iframe del modal) tiene PDFs
    let localLinks = Array.from(document.querySelectorAll('a'));
    let pdfLinks = localLinks.filter(link => {
        const text = (link.textContent || '').toLowerCase();
        const href = (link.href || '').toLowerCase();
        return text.includes('.pdf') || href.includes('.pdf');
    });

    // Si no hay PDFs en esta sub-pantalla, detenemos el script (así no sale el botón en el fondo)
    if (pdfLinks.length === 0) {
        return;
    }

    // 2. Crear y dar estilo al botón flotante
    const btn = document.createElement('button');
    btn.textContent = `Descargar ${pdfLinks.length} PDFs`;
    btn.style.position = 'fixed';
    // Subimos el botón un poco para que no choque con la barra gris del modal
    btn.style.bottom = '40px'; 
    btn.style.right = '20px';
    btn.style.zIndex = '999999';
    btn.style.padding = '10px 15px';
    btn.style.backgroundColor = '#FFC107'; // Amarillo corporativo
    btn.style.color = '#000';
    btn.style.border = 'none';
    btn.style.borderRadius = '5px';
    btn.style.cursor = 'pointer';
    btn.style.fontWeight = 'bold';
    btn.style.boxShadow = '0px 4px 6px rgba(0,0,0,0.3)';
    btn.style.transition = 'all 0.2s ease-in-out';
    
    // Efectos visuales al pasar el ratón
    btn.onmouseover = () => btn.style.transform = 'scale(1.05)';
    btn.onmouseout = () => btn.style.transform = 'scale(1)';

    // Agregar el botón al cuerpo del modal/ventana actual
    document.body.appendChild(btn);

    // 3. Lógica de descarga al hacer clic
    btn.addEventListener('click', async () => {
        // Volvemos a buscar por si la lista se actualizó
        localLinks = Array.from(document.querySelectorAll('a'));
        pdfLinks = localLinks.filter(link => {
            const text = (link.textContent || '').toLowerCase();
            const href = (link.href || '').toLowerCase();
            return text.includes('.pdf') || href.includes('.pdf');
        });

        btn.disabled = true;
        btn.style.backgroundColor = '#ccc';
        btn.style.cursor = 'wait';

        // Proceso de descargas secuenciales
        for (let i = 0; i < pdfLinks.length; i++) {
            const link = pdfLinks[i];
            const url = link.href;
            
            let filename = link.textContent.trim();
            if (!filename.toLowerCase().endsWith('.pdf')) filename += '.pdf';
            
            // Actualizar el texto del botón para ver el progreso
            btn.textContent = `Descargando (${i + 1}/${pdfLinks.length})`;
            
            try {
                const response = await fetch(url);
                if (!response.ok) throw new Error("Error HTTP");
                
                const originalBlob = await response.blob();
                // Ocultar el tipo MIME para evitar aperturas forzadas
                const hiddenBlob = new Blob([originalBlob], { type: 'application/octet-stream' });
                
                const downloadUrl = window.URL.createObjectURL(hiddenBlob);
                
                const tempLink = document.createElement('a');
                tempLink.href = downloadUrl;
                tempLink.download = filename;
                
                document.body.appendChild(tempLink);
                tempLink.click();
                document.body.removeChild(tempLink);
                window.URL.revokeObjectURL(downloadUrl);
            } catch (error) {
                console.error(`Error con ${filename}, usando fallback:`, error);
                const originalTarget = link.target;
                link.target = "_blank"; 
                link.setAttribute('download', filename);
                link.click();
                link.target = originalTarget;
            }

            // Pausa entre descargas
            await new Promise(resolve => setTimeout(resolve, 1500));
        }
        
        // Finalizar
        btn.textContent = '¡Completado! ✅';
        btn.style.backgroundColor = '#4CAF50'; // Verde
        btn.style.color = 'white';
        
        setTimeout(() => {
            btn.textContent = `Descargar ${pdfLinks.length} PDFs`;
            btn.disabled = false;
            btn.style.backgroundColor = '#FFC107';
            btn.style.color = '#000';
            btn.style.cursor = 'pointer';
        }, 3000);
    });
})();

