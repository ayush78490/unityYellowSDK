mergeInto(LibraryManager.library, {
  Nitrolite_Init: function () {
    if (window._nitro_inited) return;
    window._nitro_inited = true;

    // Candidate locations relative to the page / build outputs and common CDNs
    const localCandidates = [
      'nitrolite.bundle.js',
      './nitrolite.bundle.js',
      'Build/nitrolite.bundle.js',
      './Build/nitrolite.bundle.js',
      'TemplateData/nitrolite.bundle.js',
      './TemplateData/nitrolite.bundle.js',
      '../nitrolite.bundle.js',
      '/nitrolite.bundle.js'
    ];
    const cdnCandidates = [
      'https://cdn.jsdelivr.net/npm/@erc7824/nitrolite@latest/dist/index.mjs',
      'https://unpkg.com/@erc7824/nitrolite@latest/dist/index.mjs'
    ];

    function sendInit(ok, info) {
      console.log('Nitrolite init result:', ok, info || '');
      if (typeof SendMessage === 'function') {
        SendMessage('NitroliteManager', ok ? 'OnInitComplete' : 'OnWalletError', ok ? JSON.stringify({nitrolite:true, info:info||''}) : String(info||'NitroliteLoadFailed'));
      }
    }

    async function exists(url) {
      try {
        const head = await fetch(url, { method: 'HEAD', cache: 'no-cache' });
        if (head && head.ok) return true;
      } catch (e) { /* HEAD may be blocked */ }
      try {
        const res = await fetch(url, { method: 'GET', cache: 'no-cache' });
        return res && res.ok;
      } catch (e) {
        return false;
      }
    }

    (async () => {
      // 1) Try local bundle paths
      let found = null;
      for (let i = 0; i < localCandidates.length; i++) {
        const url = localCandidates[i];
        try {
          if (await exists(url)) { found = url; break; }
        } catch (e) { /* ignore probe errors */ }
      }

      // 2) If local not found, try loading CDN modules (dynamic import)
      if (!found) {
        for (let i = 0; i < cdnCandidates.length; i++) {
          const cdn = cdnCandidates[i];
          try {
            // dynamic import may fail due to CORS; try it but don't block fallback
            const mod = await import(/* webpackIgnore: true */ cdn).catch(()=>null);
            if (mod) { window.NitroliteSDK = mod; console.log('Nitrolite loaded from CDN', !!window.NitroliteSDK); sendInit(true,'cdn'); return; }
          } catch (e) {
            console.warn('CDN import failed', cdn, e);
          }
        }
      }

      // 3) If we found a local script path, inject it
      if (found) {
        try {
          const script = document.createElement('script');
          script.src = found;
          script.type = 'text/javascript';
          script.async = false;
          script.onload = function () {
            // NitroLite globalName used by build.js
            window.NitroliteSDK = window.NitroLite || window.NitroliteSDK || window.Nitrolite;
            console.log('Nitrolite loaded from', found, !!window.NitroliteSDK);
            if (!window.NitroliteSDK) {
              sendInit(false, 'Loaded_but_global_not_found');
            } else {
              sendInit(true, 'local');
            }
          };
          script.onerror = function (err) {
            console.error('Failed to load Nitrolite bundle at', found, err);
            // fall through to provider fallback
            continueToProviderFallback();
          };
          (document.head || document.getElementsByTagName('head')[0] || document.documentElement).appendChild(script);
          return;
        } catch (e) {
          console.error('Script injection failed', e);
          // fall through to provider fallback
        }
      }

      // 4) Provider fallback: if window.ethereum exists, use it for connect & tx
      function continueToProviderFallback() {
        if (window.ethereum) {
          console.log('Using window.ethereum fallback (MetaMask or compatible).');
          window.NitroliteSDK = null; // explicit: no Nitrolite SDK, but provider available
          sendInit(true, 'provider-fallback');
        } else {
          console.error('No Nitrolite bundle, no provider available.');
          sendInit(false, 'NotFound_NoProvider');
        }
      }

      continueToProviderFallback();
    })();
  },

  // CONNECT WALLET: try Nitrolite SDK, otherwise window.ethereum
  Nitrolite_ConnectWallet: function () {
    // Nitrolite path
    if (window.NitroliteSDK) {
      const ns = window.NitroliteSDK.default || window.NitroliteSDK;
      if (ns && typeof ns.login === 'function') {
        ns.login().then(acc => {
          window._nitro_account = acc;
          SendMessage('NitroliteManager','OnWalletConnected', acc);
        }).catch(err => {
          SendMessage('NitroliteManager','OnWalletError', err.message || String(err));
        });
        return;
      }
    }

    // Provider fallback (MetaMask / injected)
    if (window.ethereum && window.ethereum.request) {
      window.ethereum.request({ method: 'eth_requestAccounts' }).then(accounts => {
        const acc = (accounts && accounts.length>0) ? accounts[0] : '';
        window._nitro_account = acc;
        SendMessage('NitroliteManager','OnWalletConnected', acc);
      }).catch(err => {
        SendMessage('NitroliteManager','OnWalletError', err && err.message ? err.message : String(err));
      });
      return;
    }

    // nothing available
    SendMessage('NitroliteManager','OnWalletError','NitroliteNotLoaded');
  },

  // CONNECT TO CLEARNODE — unchanged, still works when SDK present or for raw WS usage
  Nitrolite_ConnectClearNode: function (urlPtr) {
    const url = UTF8ToString(urlPtr);
    if (!url) { SendMessage('NitroliteManager','OnClearNodeAuthError','InvalidUrl'); return; }
    try {
      const ws = new WebSocket(url);
      ws.onopen = () => { window._nitro_ws = ws; SendMessage('NitroliteManager','OnClearNodeOpen','ok'); };
      ws.onmessage = (e) => { SendMessage('NitroliteManager','OnClearNodeMessage', e.data); };
      ws.onclose = (c) => { SendMessage('NitroliteManager','OnClearNodeClose', String(c.code||0)); };
      ws.onerror = (err) => { SendMessage('NitroliteManager','OnClearNodeAuthError', String(err && err.message || err)); };
    } catch (err) {
      SendMessage('NitroliteManager','OnClearNodeAuthError', err.message || String(err));
    }
  },

  // AUTH FLOW — attempt Nitrolite SDK, otherwise error (provider can't do Nitro auth)
  Nitrolite_DoAuth: function (walletPtr, participantPtr, appAddrPtr, expireSeconds) {
    if (!window.NitroliteSDK) { SendMessage('NitroliteManager','OnClearNodeAuthError','SDK_or_WS_not_ready'); return; }
    // ...existing JS Nitrolite DoAuth implementation...
    // For brevity, call original implementation if SDK exists
    const wallet = UTF8ToString(walletPtr);
    const participant = UTF8ToString(participantPtr);
    const appAddr = UTF8ToString(appAddrPtr);
    (async () => {
      const ns = window.NitroliteSDK.default || window.NitroliteSDK;
      const authReq = await ns.createAuthRequestMessage({
        wallet,
        participant,
        app_name: 'unity-app',
        expire: Math.floor(Date.now()/1000) + (expireSeconds|3600),
        scope: 'console',
        application: appAddr,
        allowances: []
      });
      window._nitro_ws.send(authReq);
      SendMessage('NitroliteManager','OnAuthRequestSent','ok');
    })().catch(err => { SendMessage('NitroliteManager','OnClearNodeAuthError', err.message || String(err)); });
  },

  // HANDLE CHALLENGE — unchanged (requires Nitrolite helpers)
  Nitrolite_HandleChallenge: function (challengePtr, walletClientJsonPtr) {
    if (!window.NitroliteSDK) { SendMessage('NitroliteManager','OnClearNodeAuthError','SDK_not_ready'); return; }
    const challenge = UTF8ToString(challengePtr);
    const walletClientJson = UTF8ToString(walletClientJsonPtr);
    (async () => {
      const ns = window.NitroliteSDK.default || window.NitroliteSDK;
      const walletClient = window._nitro_account_walletclient || JSON.parse(walletClientJson || '{}');
      const signerFn = ns.createEIP712AuthMessageSigner(walletClient, {
        scope: 'console',
        application: '0x0000000000000000000000000000000000000000'
      }, { name: 'UnityApp' });
      const verifyMsg = await ns.createAuthVerifyMessage(signerFn, JSON.parse(challenge));
      window._nitro_ws.send(verifyMsg);
      SendMessage('NitroliteManager','OnClearNodeAuthVerifySent','ok');
    })().catch(err => { SendMessage('NitroliteManager','OnClearNodeAuthError', err.message || String(err)); });
  },

  // Send a channel-level message or send transaction via provider fallback
  Nitrolite_SendRawMessage: function (msgPtr) {
    const msg = UTF8ToString(msgPtr);
    // If WS exists send raw message
    if (window._nitro_ws && window._nitro_ws.readyState === WebSocket.OPEN) {
      window._nitro_ws.send(msg);
      SendMessage('NitroliteManager','OnClearNodeMessageSent','ok');
      return;
    }

    // Provider fallback: expect msg to be JSON with tx fields { to, value, data, gas }
    if (window.ethereum && window.ethereum.request) {
      try {
        const tx = JSON.parse(msg);
        const txParams = {};
        if (tx.to) txParams.to = tx.to;
        if (tx.value) txParams.value = tx.value; // hex or decimal string accepted
        if (tx.data) txParams.data = tx.data;
        if (tx.gas) txParams.gas = tx.gas;
        window.ethereum.request({ method: 'eth_sendTransaction', params: [txParams] })
          .then(hash => { SendMessage('NitroliteManager','OnClearNodeMessageSent', String(hash)); })
          .catch(err => { SendMessage('NitroliteManager','OnClearNodeError', err && err.message ? err.message : String(err)); });
        return;
      } catch (e) {
        SendMessage('NitroliteManager','OnClearNodeError','InvalidTxFormat');
        return;
      }
    }

    SendMessage('NitroliteManager','OnClearNodeError','ws_not_open_and_no_provider');
  }
});
