// mergeInto(LibraryManager.library, {
//   Nitrolite_Init: function () {
//     if (window._nitro_inited) return;
//     window._nitro_inited = true;

//     var localCandidates = [
//       'TemplateData/nitrolite.bundle.js',
//       'nitrolite.bundle.js',
//       'Build/nitrolite.bundle.js',
//       './nitrolite.bundle.js'
//     ];

//     function sendInit(ok, info) {
//       try {
//         if (typeof SendMessage === 'function') {
//           SendMessage('NitroliteManager', ok ? 'OnInitComplete' : 'OnWalletError', ok ? JSON.stringify({ nitrolite: true, info: info || '' }) : String(info || 'NitroliteLoadFailed'));
//         }
//       } catch (e) {
//         console.error('SendMessage failed:', e);
//       }
//       console.log('Nitrolite init result:', ok, info || '');
//     }

//     function exists(url) {
//       return fetch(url, { method: 'HEAD', cache: 'no-cache' }).then(function (res) {
//         if (res && res.ok) return true;
//         // try GET if HEAD not ok
//         return fetch(url, { method: 'GET', cache: 'no-cache' }).then(function (r2) { return !!(r2 && r2.ok); }).catch(function () { return false; });
//       }).catch(function () {
//         // HEAD failed (maybe blocked) — try GET
//         return fetch(url, { method: 'GET', cache: 'no-cache' }).then(function (r) { return !!(r && r.ok); }).catch(function () { return false; });
//       });
//     }

//     function probeCandidates(candidates) {
//       var i = 0;
//       return new Promise(function (resolve) {
//         function next() {
//           if (i >= candidates.length) { resolve(null); return; }
//           var url = candidates[i++];
//           exists(url).then(function (ok) {
//             if (ok) resolve(url);
//             else next();
//           }).catch(function () { next(); });
//         }
//         next();
//       });
//     }

//     // Start initialization sequence
//     try {
//       // 1) If page already injected SDK, use it
//       if (window.NitroliteSDK) { sendInit(true, 'sdk-present'); return; }

//       // 2) Prefer provider fallback (MetaMask) to avoid network/CORS noise
//       if (window.ethereum && typeof window.ethereum.request === 'function') {
//         window.NitroliteSDK = null; // explicit: using provider rather than SDK
//         sendInit(true, 'provider-fallback');
//         return;
//       }

//       // 3) Probe for local bundle and inject if found
//       probeCandidates(localCandidates).then(function (found) {
//         if (!found) {
//           console.warn('Nitrolite bundle not found in local candidates:', localCandidates);
//           sendInit(false, 'LocalBundleNotFound');
//           return;
//         }
//         try {
//           var script = document.createElement('script');
//           script.src = found;
//           script.type = 'text/javascript';
//           script.async = false;
//           script.onload = function () {
//             window.NitroliteSDK = window.NitroLite || window.NitroliteSDK || window.Nitrolite;
//             if (window.NitroliteSDK) sendInit(true, 'local');
//             else sendInit(false, 'Loaded_but_global_not_found');
//           };
//           script.onerror = function (err) {
//             console.error('Failed to load Nitrolite bundle at', found, err);
//             sendInit(false, 'LocalBundleLoadError');
//           };
//           (document.head || document.getElementsByTagName('head')[0] || document.documentElement).appendChild(script);
//         } catch (e) {
//           console.error('Script injection failed', e);
//           sendInit(false, 'InjectionError');
//         }
//       }).catch(function (err) {
//         console.error('Probe candidates failed', err);
//         sendInit(false, 'ProbeError');
//       });
//     } catch (e) {
//       console.error('Nitrolite_Init unexpected error', e);
//       sendInit(false, 'InitError');
//     }
//   },

//   Nitrolite_ConnectWallet: function () {
//     try {
//       if (window.NitroliteSDK) {
//         var ns = window.NitroliteSDK.default || window.NitroliteSDK;
//         if (ns && typeof ns.login === 'function') {
//           ns.login().then(function (acc) {
//             window._nitro_account = acc;
//             SendMessage('NitroliteManager', 'OnWalletConnected', acc);
//           }).catch(function (err) {
//             SendMessage('NitroliteManager', 'OnWalletError', err && err.message ? err.message : String(err));
//           });
//           return;
//         }
//       }

//       if (window.ethereum && typeof window.ethereum.request === 'function') {
//         window.ethereum.request({ method: 'eth_requestAccounts' }).then(function (accounts) {
//           var acc = (accounts && accounts.length > 0) ? accounts[0] : '';
//           window._nitro_account = acc;
//           SendMessage('NitroliteManager', 'OnWalletConnected', acc);
//         }).catch(function (err) {
//           SendMessage('NitroliteManager', 'OnWalletError', err && err.message ? err.message : String(err));
//         });
//         return;
//       }

//       SendMessage('NitroliteManager', 'OnWalletError', 'NitroliteNotLoaded');
//     } catch (e) {
//       console.error('Nitrolite_ConnectWallet error', e);
//       SendMessage('NitroliteManager', 'OnWalletError', 'ConnectError');
//     }
//   },

//   Nitrolite_ConnectClearNode: function (urlPtr) {
//     var url = UTF8ToString(urlPtr);
//     if (!url) { SendMessage('NitroliteManager', 'OnClearNodeAuthError', 'InvalidUrl'); return; }
//     try {
//       var ws = new WebSocket(url);
//       ws.onopen = function () { window._nitro_ws = ws; SendMessage('NitroliteManager', 'OnClearNodeOpen', 'ok'); };
//       ws.onmessage = function (e) { SendMessage('NitroliteManager', 'OnClearNodeMessage', e.data); };
//       ws.onclose = function (c) { SendMessage('NitroliteManager', 'OnClearNodeClose', String((c && c.code) || 0)); };
//       ws.onerror = function (err) { SendMessage('NitroliteManager', 'OnClearNodeAuthError', String((err && err.message) || err)); };
//     } catch (err) {
//       SendMessage('NitroliteManager', 'OnClearNodeAuthError', err && err.message ? err.message : String(err));
//     }
//   },

//   Nitrolite_DoAuth: function (walletPtr, participantPtr, appAddrPtr, expireSeconds) {
//     var wallet = UTF8ToString(walletPtr);
//     var participant = UTF8ToString(participantPtr);
//     var appAddr = UTF8ToString(appAddrPtr);
//     if (!window.NitroliteSDK || !window._nitro_ws) { SendMessage('NitroliteManager', 'OnClearNodeAuthError', 'SDK_or_WS_not_ready'); return; }

//     (function () {
//       var ns = window.NitroliteSDK.default || window.NitroliteSDK;
//       ns.createAuthRequestMessage({
//         wallet: wallet,
//         participant: participant,
//         app_name: 'unity-app',
//         expire: Math.floor(Date.now() / 1000) + (expireSeconds | 3600),
//         scope: 'console',
//         application: appAddr,
//         allowances: []
//       }).then(function (authReq) {
//         window._nitro_ws.send(authReq);
//         SendMessage('NitroliteManager', 'OnAuthRequestSent', 'ok');
//       }).catch(function (err) {
//         SendMessage('NitroliteManager', 'OnClearNodeAuthError', err && err.message ? err.message : String(err));
//       });
//     })();
//   },

//   Nitrolite_HandleChallenge: function (challengePtr, walletClientJsonPtr) {
//     var challenge = UTF8ToString(challengePtr);
//     var walletClientJson = UTF8ToString(walletClientJsonPtr);
//     if (!window.NitroliteSDK) { SendMessage('NitroliteManager', 'OnClearNodeAuthError', 'SDK_not_ready'); return; }
//     (function () {
//       var ns = window.NitroliteSDK.default || window.NitroliteSDK;
//       var walletClient = window._nitro_account_walletclient || JSON.parse(walletClientJson || '{}');
//       ns.createEIP712AuthMessageSigner(walletClient, {
//         scope: 'console',
//         application: '0x0000000000000000000000000000000000000000'
//       }, { name: 'UnityApp' }).then(function (signerFn) {
//         return ns.createAuthVerifyMessage(signerFn, JSON.parse(challenge));
//       }).then(function (verifyMsg) {
//         window._nitro_ws.send(verifyMsg);
//         SendMessage('NitroliteManager', 'OnClearNodeAuthVerifySent', 'ok');
//       }).catch(function (err) {
//         SendMessage('NitroliteManager', 'OnClearNodeAuthError', err && err.message ? err.message : String(err));
//       });
//     })();
//   },

//   Nitrolite_SendRawMessage: function (msgPtr) {
//     var msg = UTF8ToString(msgPtr);
//     if (window._nitro_ws && window._nitro_ws.readyState === WebSocket.OPEN) {
//       window._nitro_ws.send(msg);
//       SendMessage('NitroliteManager', 'OnClearNodeMessageSent', 'ok');
//       return;
//     }

//     if (window.ethereum && typeof window.ethereum.request === 'function') {
//       try {
//         var tx = JSON.parse(msg);
//         var txParams = {};
//         if (tx.to) txParams.to = tx.to;
//         if (tx.value) txParams.value = tx.value;
//         if (tx.data) txParams.data = tx.data;
//         if (tx.gas) txParams.gas = tx.gas;
//         window.ethereum.request({ method: 'eth_sendTransaction', params: [txParams] }).then(function (hash) {
//           SendMessage('NitroliteManager', 'OnClearNodeMessageSent', String(hash));
//         }).catch(function (err) {
//           SendMessage('NitroliteManager', 'OnClearNodeError', err && err.message ? err.message : String(err));
//         });
//         return;
//       } catch (e) {
//         SendMessage('NitroliteManager', 'OnClearNodeError', 'InvalidTxFormat');
//         return;
//       }
//     }

//     SendMessage('NitroliteManager', 'OnClearNodeError', 'ws_not_open_and_no_provider');
//   },

//   Nitrolite_SendYellowTx: function (txJsonPtr) {
//     try {
//       var txJson = UTF8ToString(txJsonPtr);
//       var tx = JSON.parse(txJson);

//       if (!window.NitroliteSDK) {
//         SendMessage('NitroliteManager', 'OnYellowTxError', 'YellowSDK_not_ready');
//         return;
//       }

//       var ns = window.NitroliteSDK.default || window.NitroliteSDK;
//       if (ns && typeof ns.sendTransaction === 'function') {
//         ns.sendTransaction(tx).then(function (hash) {
//           SendMessage('NitroliteManager', 'OnYellowTxSent', String(hash));
//         }).catch(function (err) {
//           SendMessage('NitroliteManager', 'OnYellowTxError', err && err.message ? err.message : String(err));
//         });
//         return;
//       }

//       // fallback: try ethereum provider
//       if (window.ethereum && typeof window.ethereum.request === 'function') {
//         window.ethereum.request({
//           method: 'eth_sendTransaction',
//           params: [tx]
//         }).then(function (hash) {
//           SendMessage('NitroliteManager', 'OnYellowTxSent', String(hash));
//         }).catch(function (err) {
//           SendMessage('NitroliteManager', 'OnYellowTxError', err && err.message ? err.message : String(err));
//         });
//         return;
//       }

//       SendMessage('NitroliteManager', 'OnYellowTxError', 'NoProviderFound');
//     } catch (e) {
//       console.error('Nitrolite_SendYellowTx error:', e);
//       SendMessage('NitroliteManager', 'OnYellowTxError', e.message || 'TxError');
//     }
//   }
// });


mergeInto(LibraryManager.library, {
  Nitrolite_Init: function () {
    if (window._nitro_inited) return;
    window._nitro_inited = true;

    var localCandidates = [
      'TemplateData/nitrolite.bundle.js',
      'nitrolite.bundle.js',
      'Build/nitrolite.bundle.js',
      './nitrolite.bundle.js'
    ];

    function sendInit(ok, info) {
      try {
        if (typeof SendMessage === 'function') {
          SendMessage('NitroliteManager', ok ? 'OnInitComplete' : 'OnWalletError', ok ? JSON.stringify({ nitrolite: true, info: info || '' }) : String(info || 'NitroliteLoadFailed'));
        }
      } catch (e) {
        console.error('SendMessage failed:', e);
      }
      console.log('Nitrolite init result:', ok, info || '');
    }

    function exists(url) {
      return fetch(url, { method: 'HEAD', cache: 'no-cache' }).then(function (res) {
        if (res && res.ok) return true;
        return fetch(url, { method: 'GET', cache: 'no-cache' }).then(function (r2) { return !!(r2 && r2.ok); }).catch(function () { return false; });
      }).catch(function () {
        return fetch(url, { method: 'GET', cache: 'no-cache' }).then(function (r) { return !!(r && r.ok); }).catch(function () { return false; });
      });
    }

    function probeCandidates(candidates) {
      var i = 0;
      return new Promise(function (resolve) {
        function next() {
          if (i >= candidates.length) { resolve(null); return; }
          var url = candidates[i++];
          exists(url).then(function (ok) {
            if (ok) resolve(url);
            else next();
          }).catch(function () { next(); });
        }
        next();
      });
    }

    try {
      if (window.NitroliteSDK) { sendInit(true, 'sdk-present'); return; }
      if (window.ethereum && typeof window.ethereum.request === 'function') {
        window.NitroliteSDK = null;
        sendInit(true, 'provider-fallback');
        return;
      }

      probeCandidates(localCandidates).then(function (found) {
        if (!found) { sendInit(false, 'LocalBundleNotFound'); return; }
        try {
          var script = document.createElement('script');
          script.src = found;
          script.type = 'text/javascript';
          script.async = false;
          script.onload = function () {
            window.NitroliteSDK = window.NitroLite || window.NitroliteSDK || window.Nitrolite;
            if (window.NitroliteSDK) sendInit(true, 'local');
            else sendInit(false, 'Loaded_but_global_not_found');
          };
          script.onerror = function (err) { sendInit(false, 'LocalBundleLoadError'); };
          (document.head || document.getElementsByTagName('head')[0] || document.documentElement).appendChild(script);
        } catch (e) { sendInit(false, 'InjectionError'); }
      }).catch(function (err) { sendInit(false, 'ProbeError'); });
    } catch (e) { sendInit(false, 'InitError'); }
  },

  Nitrolite_ConnectWallet: function () {
    try {
      if (window.NitroliteSDK) {
        var ns = window.NitroliteSDK.default || window.NitroliteSDK;
        if (ns && typeof ns.login === 'function') {
          ns.login().then(function (acc) {
            window._nitro_account = acc;
            SendMessage('NitroliteManager', 'OnWalletConnected', acc);
          }).catch(function (err) {
            SendMessage('NitroliteManager', 'OnWalletError', err && err.message ? err.message : String(err));
          });
          return;
        }
      }

      if (window.ethereum && typeof window.ethereum.request === 'function') {
        window.ethereum.request({ method: 'eth_requestAccounts' }).then(function (accounts) {
          var acc = (accounts && accounts.length > 0) ? accounts[0] : '';
          window._nitro_account = acc;
          SendMessage('NitroliteManager', 'OnWalletConnected', acc);
        }).catch(function (err) {
          SendMessage('NitroliteManager', 'OnWalletError', err && err.message ? err.message : String(err));
        });
        return;
      }

      SendMessage('NitroliteManager', 'OnWalletError', 'NitroliteNotLoaded');
    } catch (e) { SendMessage('NitroliteManager', 'OnWalletError', 'ConnectError'); }
  },

  Nitrolite_ConnectClearNode: function (urlPtr) {
    var url = UTF8ToString(urlPtr);
    if (!url) { SendMessage('NitroliteManager', 'OnClearNodeAuthError', 'InvalidUrl'); return; }
    try {
      var ws = new WebSocket(url);
      ws.onopen = function () { window._nitro_ws = ws; SendMessage('NitroliteManager', 'OnClearNodeOpen', 'ok'); };
      ws.onmessage = function (e) { SendMessage('NitroliteManager', 'OnClearNodeMessage', e.data); };
      ws.onclose = function (c) { SendMessage('NitroliteManager', 'OnClearNodeClose', String((c && c.code) || 0)); };
      ws.onerror = function (err) { SendMessage('NitroliteManager', 'OnClearNodeAuthError', String((err && err.message) || err)); };
    } catch (err) { SendMessage('NitroliteManager', 'OnClearNodeAuthError', err && err.message ? err.message : String(err)); }
  },

  Nitrolite_DoAuth: function (walletPtr, participantPtr, appAddrPtr, expireSeconds) {
    var wallet = UTF8ToString(walletPtr);
    var participant = UTF8ToString(participantPtr);
    var appAddr = UTF8ToString(appAddrPtr);
    if (!window.NitroliteSDK || !window._nitro_ws) { SendMessage('NitroliteManager', 'OnClearNodeAuthError', 'SDK_or_WS_not_ready'); return; }

    (function () {
      var ns = window.NitroliteSDK.default || window.NitroliteSDK;
      ns.createAuthRequestMessage({
        wallet: wallet,
        participant: participant,
        app_name: 'unity-app',
        expire: Math.floor(Date.now() / 1000) + (expireSeconds | 3600),
        scope: 'console',
        application: appAddr,
        allowances: []
      }).then(function (authReq) {
        window._nitro_ws.send(authReq);
        SendMessage('NitroliteManager', 'OnAuthRequestSent', 'ok');
      }).catch(function (err) {
        SendMessage('NitroliteManager', 'OnClearNodeAuthError', err && err.message ? err.message : String(err));
      });
    })();
  },

  Nitrolite_HandleChallenge: function (challengePtr, walletClientJsonPtr) {
    var challenge = UTF8ToString(challengePtr);
    var walletClientJson = UTF8ToString(walletClientJsonPtr);
    if (!window.NitroliteSDK) { SendMessage('NitroliteManager', 'OnClearNodeAuthError', 'SDK_not_ready'); return; }
    (function () {
      var ns = window.NitroliteSDK.default || window.NitroliteSDK;
      var walletClient = window._nitro_account_walletclient || JSON.parse(walletClientJson || '{}');
      ns.createEIP712AuthMessageSigner(walletClient, {
        scope: 'console',
        application: '0x0000000000000000000000000000000000000000'
      }, { name: 'UnityApp' }).then(function (signerFn) {
        return ns.createAuthVerifyMessage(signerFn, JSON.parse(challenge));
      }).then(function (verifyMsg) {
        window._nitro_ws.send(verifyMsg);
        SendMessage('NitroliteManager', 'OnClearNodeAuthVerifySent', 'ok');
      }).catch(function (err) {
        SendMessage('NitroliteManager', 'OnClearNodeAuthError', err && err.message ? err.message : String(err));
      });
    })();
  },

  Nitrolite_SendRawMessage: function (msgPtr) {
    var msg = UTF8ToString(msgPtr);
    if (window._nitro_ws && window._nitro_ws.readyState === WebSocket.OPEN) {
      window._nitro_ws.send(msg);
      SendMessage('NitroliteManager', 'OnClearNodeMessageSent', 'ok');
      return;
    }

    if (window.ethereum && typeof window.ethereum.request === 'function') {
      try {
        var tx = JSON.parse(msg);
        var txParams = {};
        if (tx.to) txParams.to = tx.to;
        if (tx.value) txParams.value = tx.value;
        if (tx.data) txParams.data = tx.data;
        if (tx.gas) txParams.gas = tx.gas;
        window.ethereum.request({ method: 'eth_sendTransaction', params: [txParams] }).then(function (hash) {
          SendMessage('NitroliteManager', 'OnClearNodeMessageSent', String(hash));
        }).catch(function (err) {
          SendMessage('NitroliteManager', 'OnClearNodeError', err && err.message ? err.message : String(err));
        });
        return;
      } catch (e) {
        SendMessage('NitroliteManager', 'OnClearNodeError', 'InvalidTxFormat');
        return;
      }
    }

    SendMessage('NitroliteManager', 'OnClearNodeError', 'ws_not_open_and_no_provider');
  },

  

  // ---------- NEW FUNCTION FOR YELLOW SDK ----------
  Nitrolite_SendYellowTx: function (txJsonPtr) {
    var txJson = UTF8ToString(txJsonPtr);
    try {
      if (window.NitroliteSDK) {
        var ns = window.NitroliteSDK.default || window.NitroliteSDK;
        if (ns && typeof ns.sendYellowTransaction === 'function') {
          ns.sendYellowTransaction(JSON.parse(txJson))
            .then(function (res) {
              SendMessage('NitroliteManager', 'OnClearNodeMessageSent', JSON.stringify(res));
            })
            .catch(function (err) {
              SendMessage('NitroliteManager', 'OnClearNodeError', err && err.message ? err.message : String(err));
            });
          return;
        }
      }

      if (window._nitro_ws && window._nitro_ws.readyState === WebSocket.OPEN) {
        window._nitro_ws.send(txJson);
        SendMessage('NitroliteManager', 'OnClearNodeMessageSent', 'ok');
        return;
      }

      SendMessage('NitroliteManager', 'OnClearNodeError', 'YellowTxFailed: No SDK or WS');
    } catch (e) {
      SendMessage('NitroliteManager', 'OnClearNodeError', e && e.message ? e.message : String(e));
    }
  },

  // ---------- GET CHANNEL ID ----------
Nitrolite_GetChannelId: function() {
    try {
        if (window.NitroliteSDK && window._nitro_ws) {
            var channelId = window._nitro_ws.channelId || window._nitro_ws.id || "unknown";
            if (typeof SendMessage === 'function') {
                SendMessage('SimpleWallet', 'OnChannelId', channelId);
            }
            console.log("Nitrolite Channel ID:", channelId);
        } else {
            console.warn("Nitrolite SDK or WebSocket not ready");
        }
    } catch (e) {
        console.error("Error fetching channel ID:", e);
    }
}
});
