mergeInto(LibraryManager.library, {
  Nitrolite_Init: function () {
    if (window._nitro_inited) return;
    window._nitro_inited = true;

    // Candidate locations relative to the page / build outputs
    const candidates = [
      'nitrolite.bundle.js',
      './nitrolite.bundle.js',
      'Build/nitrolite.bundle.js',
      './Build/nitrolite.bundle.js',
      'TemplateData/nitrolite.bundle.js',
      './TemplateData/nitrolite.bundle.js',
      '../nitrolite.bundle.js',
      '/nitrolite.bundle.js'
    ];

    function sendInitResult(ok, reason) {
      console.log('Nitrolite load result:', ok, reason || '');
      if (typeof SendMessage === 'function') {
        try {
          SendMessage('NitroliteManager', ok ? 'OnInitComplete' : 'OnWalletError', ok ? JSON.stringify({nitrolite:true}) : (reason || 'NitroliteLoadFailed'));
        } catch(e) {
          console.error('SendMessage failed:', e);
        }
      }
    }

    async function exists(url) {
      try {
        // try HEAD first
        const head = await fetch(url, { method: 'HEAD', cache: 'no-cache' });
        if (head && head.ok) return true;
      } catch (e) {
        // HEAD may be blocked; try GET
      }
      try {
        const res = await fetch(url, { method: 'GET', cache: 'no-cache' });
        return res && res.ok;
      } catch (e) {
        return false;
      }
    }

    (async () => {
      let found = null;
      for (let i = 0; i < candidates.length; i++) {
        const url = candidates[i];
        try {
          const ok = await exists(url);
          if (ok) { found = url; break; }
        } catch (e) {
          console.warn('Probe failed for', url, e);
        }
      }

      if (!found) {
        console.error('Nitrolite bundle not found at candidate paths', candidates);
        // final attempt: try CDN as a fallback (may be CORS-blocked)
        const cdn = 'https://unpkg.com/@erc7824/nitrolite@latest/dist/index.mjs';
        try {
          // Try to dynamically import CDN module (may be blocked by CORS)
          import(cdn).then(mod => {
            window.NitroliteSDK = mod;
            console.log('Nitrolite loaded from CDN', !!window.NitroliteSDK);
            sendInitResult(true, 'cdn');
          }).catch(err => {
            console.error('CDN dynamic import failed', err);
            sendInitResult(false, 'NotFound');
          });
        } catch (e) {
          console.error('CDN import error', e);
          sendInitResult(false, 'NotFound');
        }
        return;
      }

      // append script tag for the local bundle
      try {
        const script = document.createElement('script');
        script.src = found;
        script.type = 'text/javascript';
        // synchronous insertion to preserve load order
        script.async = false;
        script.onload = function () {
          // NitroLite globalName used by build.js
          window.NitroliteSDK = window.NitroLite || window.NitroliteSDK || window.Nitrolite;
          console.log('Nitrolite loaded from', found, !!window.NitroliteSDK);
          if (!window.NitroliteSDK) {
            sendInitResult(false, 'Loaded_but_global_not_found');
          } else {
            sendInitResult(true, 'local');
          }
        };
        script.onerror = function (err) {
          console.error('Failed to load Nitrolite bundle at', found, err);
          sendInitResult(false, 'LoadError');
        };
        // prefer head for script insertion
        (document.head || document.getElementsByTagName('head')[0] || document.documentElement).appendChild(script);
      } catch (e) {
        console.error('Script injection failed', e);
        sendInitResult(false, 'InjectionError');
      }
    })();
  },

  // CONNECT WALLET (use Nitrolite's login helper or a generic provider)
  Nitrolite_ConnectWallet: function () {
    if (!window.NitroliteSDK) { SendMessage('NitroliteManager','OnWalletError','NitroliteNotLoaded'); return; }
    // some SDKs export default; adapt as needed
    const ns = window.NitroliteSDK.default || window.NitroliteSDK;
    ns.login().then(acc => {
      window._nitro_account = acc;
      SendMessage('NitroliteManager','OnWalletConnected', acc);
    }).catch(err => {
      SendMessage('NitroliteManager','OnWalletError', err.message || String(err));
    });
  },

  // CONNECT TO CLEARNODE (open WS, basic event handlers)
  Nitrolite_ConnectClearNode: function (urlPtr) {
    const url = UTF8ToString(urlPtr);
    if (!url) { SendMessage('NitroliteManager','OnClearNodeAuthError','InvalidUrl'); return; }
    try {
      const ws = new WebSocket(url);
      ws.onopen = () => { window._nitro_ws = ws; SendMessage('NitroliteManager','OnClearNodeOpen','ok'); };
      ws.onmessage = (e) => {
        // forward message raw (Unity can parse)
        SendMessage('NitroliteManager','OnClearNodeMessage', e.data);
      };
      ws.onclose = (c) => { SendMessage('NitroliteManager','OnClearNodeClose', String(c.code||0)); };
      ws.onerror = (err) => { SendMessage('NitroliteManager','OnClearNodeAuthError', String(err && err.message || err)); };
    } catch (err) {
      SendMessage('NitroliteManager','OnClearNodeAuthError', err.message || String(err));
    }
  },

  // AUTH FLOW (createAuthRequestMessage + sign + verify)
  Nitrolite_DoAuth: function (walletPtr, participantPtr, appAddrPtr, expireSeconds) {
    const wallet = UTF8ToString(walletPtr);
    const participant = UTF8ToString(participantPtr);
    const appAddr = UTF8ToString(appAddrPtr);
    if (!window.NitroliteSDK || !window._nitro_ws) { SendMessage('NitroliteManager','OnClearNodeAuthError','SDK_or_WS_not_ready'); return; }

    (async () => {
      const ns = window.NitroliteSDK.default || window.NitroliteSDK;
      // create auth request message
      const authReq = await ns.createAuthRequestMessage({
        wallet,
        participant,
        app_name: 'unity-app',
        expire: Math.floor(Date.now()/1000) + (expireSeconds|3600),
        scope: 'console',
        application: appAddr,
        allowances: []
      });

      // send
      window._nitro_ws.send(authReq);

      // the node will respond with an auth_challenge; the handler in onmessage should call back into ns.createAuthVerifyMessage
      // For simplicity, we instruct Unity to wait for OnClearNodeMessage then call Nitrolite_HandleChallenge
      SendMessage('NitroliteManager','OnAuthRequestSent','ok');
    })().catch(err => { SendMessage('NitroliteManager','OnClearNodeAuthError', err.message || String(err)); });
  },

  // HANDLE CHALLENGE (call from Unity when it receives auth_challenge via OnClearNodeMessage)
  Nitrolite_HandleChallenge: function (challengePtr, walletClientJsonPtr) {
    const challenge = UTF8ToString(challengePtr);
    const walletClientJson = UTF8ToString(walletClientJsonPtr); // stringified wallet client config if needed
    if (!window.NitroliteSDK) { SendMessage('NitroliteManager','OnClearNodeAuthError','SDK_not_ready'); return; }
    (async () => {
      const ns = window.NitroliteSDK.default || window.NitroliteSDK;
      // walletClient must be something that implements signTypedData (ethers provider or custom)
      // nitrolite helpers include createEIP712AuthMessageSigner & createAuthVerifyMessage
      const walletClient = window._nitro_account_walletclient || JSON.parse(walletClientJson || '{}');

      const signerFn = ns.createEIP712AuthMessageSigner(walletClient, {
        scope: 'console',
        application: '0x0000000000000000000000000000000000000000'
      }, { name: 'UnityApp' }); // domain
      const verifyMsg = await ns.createAuthVerifyMessage(signerFn, JSON.parse(challenge));
      window._nitro_ws.send(verifyMsg);
      SendMessage('NitroliteManager','OnClearNodeAuthVerifySent','ok');
    })().catch(err => { SendMessage('NitroliteManager','OnClearNodeAuthError', err.message || String(err)); });
  },

  // Send a channel-level message (assumes you already use nitrolite SDK to build it)
  Nitrolite_SendRawMessage: function (msgPtr) {
    const msg = UTF8ToString(msgPtr);
    if (!window._nitro_ws || window._nitro_ws.readyState !== WebSocket.OPEN) { SendMessage('NitroliteManager','OnClearNodeError','ws_not_open'); return; }
    window._nitro_ws.send(msg);
    SendMessage('NitroliteManager','OnClearNodeMessageSent','ok');
  }
});
