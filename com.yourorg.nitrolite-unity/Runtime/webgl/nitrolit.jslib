mergeInto(LibraryManager.library, {
  Nitrolite_Init: function () {
    if (window._nitro_inited) return;
    window._nitro_inited = true;

    // Try to load Nitrolite and (optionally) Yellow SDK from CDN
    Promise.all([
      import('https://unpkg.com/@erc7824/nitrolite@latest/dist/index.mjs').catch(e=>{
        console.error('Nitrolite CDN load failed', e);
        return null;
      }),
      import('https://cdn.jsdelivr.net/npm/yellow-sdk@latest/lib/yellow.js').catch(()=>null)
    ]).then(([nitroliteModule, yellowModule]) => {
      window.NitroliteSDK = nitroliteModule ? nitroliteModule : null;
      window.YellowSDK = yellowModule ? yellowModule : null;
      console.log('Nitrolite/Yellow loaded', !!window.NitroliteSDK, !!window.YellowSDK);
      // notify Unity
      if (typeof SendMessage === 'function') {
        SendMessage('NitroliteManager', 'OnInitComplete', JSON.stringify({nitrolite: !!window.NitroliteSDK, yellow: !!window.YellowSDK}));
      }
    });
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
    if (!url) { SendMessage('NitroliteManager','OnClearNodeError','InvalidUrl'); return; }
    try {
      const ws = new WebSocket(url);
      ws.onopen = () => { window._nitro_ws = ws; SendMessage('NitroliteManager','OnClearNodeOpen','ok'); };
      ws.onmessage = (e) => {
        // forward message raw (Unity can parse)
        SendMessage('NitroliteManager','OnClearNodeMessage', e.data);
      };
      ws.onclose = (c) => { SendMessage('NitroliteManager','OnClearNodeClose', String(c.code||0)); };
      ws.onerror = (err) => { SendMessage('NitroliteManager','OnClearNodeError', String(err && err.message || err)); };
    } catch (err) {
      SendMessage('NitroliteManager','OnClearNodeError', err.message || String(err));
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
