mergeInto(LibraryManager.library, {
  Nitrolite_Init: function () {
    if (window._nitro_inited) return;
    window._nitro_inited = true;

    function sendInit(ok, info) {
      console.log('Nitrolite init result:', ok, info || '');
      if (typeof SendMessage === 'function') {
        try {
          SendMessage('NitroliteManager', ok ? 'OnInitComplete' : 'OnWalletError', ok ? JSON.stringify({nitrolite:true, info:info||''}) : String(info||'NitroliteLoadFailed'));
        } catch(e) {
          console.error('SendMessage failed:', e);
        }
      }
    }

    try {
      // 1) If SDK already injected by hosting page, use it.
      if (window.NitroliteSDK) {
        console.log('Nitrolite: SDK already present');
        sendInit(true, 'sdk-present');
        return;
      }

      // 2) Prefer provider fallback (MetaMask / injected) — avoids network fetches and CORS noise
      if (window.ethereum && typeof window.ethereum.request === 'function') {
        console.log('Nitrolite: using provider fallback (window.ethereum)');
        // keep explicit: no SDK but provider available
        window.NitroliteSDK = null;
        sendInit(true, 'provider-fallback');
        return;
      }

      // 3) Fallback: attempt a single local bundle load from TemplateData (common Unity build location)
      // Only one attempt to avoid many 404s / console noise.
      var localPath = 'TemplateData/nitrolite.bundle.js';
      var script = document.createElement('script');
      script.src = localPath;
      script.type = 'text/javascript';
      script.async = false;
      script.onload = function () {
        window.NitroliteSDK = window.NitroLite || window.NitroliteSDK || window.Nitrolite;
        if (window.NitroliteSDK) {
          console.log('Nitrolite loaded from local bundle:', localPath);
          sendInit(true, 'local');
        } else {
          console.warn('Nitrolite bundle loaded but global not found');
          sendInit(false, 'Loaded_but_global_not_found');
        }
      };
      script.onerror = function (err) {
        console.error('Failed to load Nitrolite bundle at', localPath, err);
        sendInit(false, 'LocalBundleNotFound');
      };
      (document.head || document.getElementsByTagName('head')[0] || document.documentElement).appendChild(script);
    } catch (e) {
      console.error('Nitrolite_Init unexpected error', e);
      sendInit(false, 'InitError');
    }
  },

  // CONNECT WALLET: try Nitrolite SDK, otherwise window.ethereum
  Nitrolite_ConnectWallet: function () {
    // Try Nitrolite SDK path first
    if (window.NitroliteSDK) {
      try {
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
      } catch(e) {
        console.warn('Nitrolite SDK login path failed', e);
      }
    }

    // Provider fallback (MetaMask / injected)
    if (window.ethereum && typeof window.ethereum.request === 'function') {
      window.ethereum.request({ method: 'eth_requestAccounts' }).then(accounts => {
        const acc = (accounts && accounts.length>0) ? accounts[0] : '';
        window._nitro_account = acc;
        SendMessage('NitroliteManager','OnWalletConnected', acc);
      }).catch(err => {
        SendMessage('NitroliteManager','OnWalletError', err && err.message ? err.message : String(err));
      });
      return;
    }

    // No SDK and no provider
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
    const wallet = UTF8ToString(walletPtr);
    const participant = UTF8ToString(participantPtr);
    const appAddr = UTF8ToString(appAddrPtr);
    if (!window.NitroliteSDK || !window._nitro_ws) { SendMessage('NitroliteManager','OnClearNodeAuthError','SDK_or_WS_not_ready'); return; }

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
    const challenge = UTF8ToString(challengePtr);
    const walletClientJson = UTF8ToString(walletClientJsonPtr);
    if (!window.NitroliteSDK) { SendMessage('NitroliteManager','OnClearNodeAuthError','SDK_not_ready'); return; }
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
    if (window._nitro_ws && window._nitro_ws.readyState === WebSocket.OPEN) {
      window._nitro_ws.send(msg);
      SendMessage('NitroliteManager','OnClearNodeMessageSent','ok');
      return;
    }

    if (window.ethereum && typeof window.ethereum.request === 'function') {
      try {
        const tx = JSON.parse(msg);
        const txParams = {};
        if (tx.to) txParams.to = tx.to;
        if (tx.value) txParams.value = tx.value;
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
