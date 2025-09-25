using UnityEngine;
using System.Runtime.InteropServices;
using System.Collections.Generic;
using System;

namespace NitroliteSDK
{
    public class NitroliteManager : MonoBehaviour
    {
        private static NitroliteManager instance;

#if UNITY_WEBGL && !UNITY_EDITOR
        [DllImport("__Internal")] private static extern void Nitrolite_Init();
        [DllImport("__Internal")] private static extern void Nitrolite_ConnectWallet();
        [DllImport("__Internal")] private static extern void Nitrolite_ConnectClearNode(string url);
        [DllImport("__Internal")] private static extern void Nitrolite_DoAuth(string wallet, string participant, string appAddress, int expireSeconds);
        [DllImport("__Internal")] private static extern void Nitrolite_HandleChallenge(string challengeJson, string walletClientJson);
        [DllImport("__Internal")] private static extern void Nitrolite_SendRawMessage(string msg);
        [DllImport("__Internal")] private static extern void Nitrolite_SendYellowTx(string txJson);
        [DllImport("__Internal")] private static extern void Nitrolite_GetChannelId();
#else
        private static void Nitrolite_Init() { Debug.Log("Nitrolite_Init (editor/native stub)"); }
        private static void Nitrolite_ConnectWallet() { 
            Debug.Log("Nitrolite_ConnectWallet (stub)");
            // Simulate wallet connection in editor
            instance?.OnWalletConnected("0x1234567890123456789012345678901234567890");
        }
        private static void Nitrolite_ConnectClearNode(string url) { 
            Debug.Log($"Nitrolite_ConnectClearNode (stub): {url}");
            // Simulate clear node connection in editor
            instance?.OnClearNodeOpen("ok");
        }
        private static void Nitrolite_DoAuth(string wallet, string participant, string appAddress, int expireSeconds) { 
            Debug.Log("Nitrolite_DoAuth (stub)");
            instance?.OnAuthRequestSent("ok");
        }
        private static void Nitrolite_HandleChallenge(string challengeJson, string walletClientJson) { Debug.Log("Nitrolite_HandleChallenge (stub)"); }
        private static void Nitrolite_SendRawMessage(string msg) { Debug.Log("Nitrolite_SendRawMessage (stub)"); }
        private static void Nitrolite_SendYellowTx(string txJson) { Debug.Log("Nitrolite_SendYellowTx (stub)"); }
        private static void Nitrolite_GetChannelId() { 
            Debug.Log("Nitrolite_GetChannelId (stub)");
            // Simulate channel ID in editor
            instance?.OnChannelId("test-channel-123");
        }
#endif

        void Awake()
        {
            if (instance == null)
            {
                instance = this;
                DontDestroyOnLoad(gameObject);
                gameObject.name = "NitroliteManager";
            }
            else if (instance != this)
            {
                Destroy(gameObject);
            }
        }

        void Start() => Nitrolite_Init();

        // Public methods
        public void ConnectWallet() => Nitrolite_ConnectWallet();
        public void ConnectClearNode(string url) => Nitrolite_ConnectClearNode(url);
        public void DoAuth(string wallet, string participant, string appAddress, int expireSeconds = 3600)
            => Nitrolite_DoAuth(wallet, participant, appAddress, expireSeconds);
        public void HandleChallenge(string challengeJson, string walletClientJson)
            => Nitrolite_HandleChallenge(challengeJson, walletClientJson);
        public void SendRawMessage(string msg) => Nitrolite_SendRawMessage(msg);
        public void SendYellowTransaction(string txJson) => Nitrolite_SendYellowTx(txJson);
        public void GetChannelId() => Nitrolite_GetChannelId();

        // ---- Callbacks from JS ----
        public void OnInitComplete(string payloadJson) 
        { 
            Debug.Log("Nitrolite Init Complete: " + payloadJson); 
        }

        public void OnWalletConnected(string account) 
        { 
            PlayerPrefs.SetString("wallet", account); 
            Debug.Log("Wallet Connected: " + account);
            
            // Forward to SimpleWallet
            var simpleWallet = FindObjectOfType<SimpleWallet>();
            if (simpleWallet != null)
            {
                simpleWallet.OnWalletConnected(account);
            }
        }

        public void OnWalletError(string err) 
        { 
            Debug.LogError("Wallet Error: " + err);
            
            // Forward to SimpleWallet
            var simpleWallet = FindObjectOfType<SimpleWallet>();
            if (simpleWallet != null)
            {
                simpleWallet.OnWalletError(err);
            }
        }

        public void OnClearNodeOpen(string v) 
        { 
            Debug.Log("Clear Node WebSocket Opened"); 
            
            // Forward to SimpleWallet
            var simpleWallet = FindObjectOfType<SimpleWallet>();
            if (simpleWallet != null)
            {
                simpleWallet.OnClearNodeConnected();
            }
        }

        public void OnClearNodeMessage(string json)
        {
            Debug.Log("Clear Node Message: " + json);

            try
            {
                var data = DictionaryWrapper.FromJson(json);

                if (data.dict != null)
                {
                    if (data.dict.ContainsKey("auth_challenge"))
                    {
                        string challenge = data.dict["auth_challenge"];
                        string walletClientJson = PlayerPrefs.GetString("walletClientJson", "{}");
                        HandleChallenge(challenge, walletClientJson);
                        return;
                    }

                    if (data.dict.ContainsKey("yellow_tx"))
                    {
                        string txJson = data.dict["yellow_tx"];
                        SendYellowTransaction(txJson);
                        return;
                    }
                }
            }
            catch (Exception e)
            {
                Debug.LogError("Failed to parse Clear Node message: " + e);
            }
        }

        public void OnClearNodeAuthVerifySent(string v) 
        { 
            Debug.Log("Auth Verify Message Sent"); 
            
            // Consider this as auth completion
            var simpleWallet = FindObjectOfType<SimpleWallet>();
            if (simpleWallet != null)
            {
                simpleWallet.OnAuthComplete();
            }
        }

        public void OnClearNodeAuthError(string e) 
        { 
            Debug.LogError("Clear Node Auth Error: " + e);
            
            // Forward to SimpleWallet
            var simpleWallet = FindObjectOfType<SimpleWallet>();
            if (simpleWallet != null)
            {
                simpleWallet.OnClearNodeError(e);
            }
        }

        public void OnClearNodeClose(string code) 
        { 
            Debug.Log("Clear Node WebSocket Closed: " + code); 
            
            // Forward to SimpleWallet
            var simpleWallet = FindObjectOfType<SimpleWallet>();
            if (simpleWallet != null)
            {
                simpleWallet.OnClearNodeError($"Connection closed: {code}");
            }
        }

        public void OnAuthRequestSent(string v) 
        { 
            Debug.Log("Auth Request Sent"); 
            
            // Forward to SimpleWallet
            var simpleWallet = FindObjectOfType<SimpleWallet>();
            if (simpleWallet != null)
            {
                simpleWallet.OnAuthRequestSent();
            }
        }

        public void OnClearNodeMessageSent(string v) 
        { 
            Debug.Log("Message Sent to Clear Node: " + v); 
        }

        public void OnChannelId(string channelId)
        {
            Debug.Log("Channel ID Received: " + channelId);
            
            // Forward to SimpleWallet
            var simpleWallet = FindObjectOfType<SimpleWallet>();
            if (simpleWallet != null)
            {
                simpleWallet.OnChannelId(channelId);
            }
        }

        [Serializable]
        private class DictionaryWrapper
        {
            public Dictionary<string, string> dict;

            public static DictionaryWrapper FromJson(string json)
            {
                try
                {
                    return JsonUtility.FromJson<DictionaryWrapper>(json);
                }
                catch { return new DictionaryWrapper { dict = new Dictionary<string, string>() }; }
            }
        }
    }
}