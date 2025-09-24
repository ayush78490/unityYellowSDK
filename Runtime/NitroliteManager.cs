// using UnityEngine;
// using System.Runtime.InteropServices;

// namespace NitroliteSDK
// {
//     public class NitroliteManager : MonoBehaviour
//     {
//         private static NitroliteManager instance;

// #if UNITY_WEBGL && !UNITY_EDITOR
//         [DllImport("__Internal")] private static extern void Nitrolite_Init();
//         [DllImport("__Internal")] private static extern void Nitrolite_ConnectWallet();
//         [DllImport("__Internal")] private static extern void Nitrolite_ConnectClearNode(string url);
//         [DllImport("__Internal")] private static extern void Nitrolite_DoAuth(string wallet, string participant, string appAddress, int expireSeconds);
//         [DllImport("__Internal")] private static extern void Nitrolite_HandleChallenge(string challengeJson, string walletClientJson);
//         [DllImport("__Internal")] private static extern void Nitrolite_SendRawMessage(string msg);
// #else
//         // Non WebGL fallbacks — empty stubs (implement HTTP path for native builds)
//         private static void Nitrolite_Init() { Debug.Log("Nitrolite_Init (editor/native stub)"); }
//         private static void Nitrolite_ConnectWallet() { Debug.Log("Nitrolite_ConnectWallet (stub)"); }
//         private static void Nitrolite_ConnectClearNode(string url) { Debug.Log("Nitrolite_ConnectClearNode (stub)"); }
//         private static void Nitrolite_DoAuth(string wallet, string participant, string appAddress, int expireSeconds) { Debug.Log("Nitrolite_DoAuth (stub)"); }
//         private static void Nitrolite_HandleChallenge(string challengeJson, string walletClientJson) { Debug.Log("Nitrolite_HandleChallenge (stub)"); }
//         private static void Nitrolite_SendRawMessage(string msg) { Debug.Log("Nitrolite_SendRawMessage (stub)"); }
// #endif

//         void Awake()
//         {
//             if (instance == null)
//             {
//                 instance = this;
//                 DontDestroyOnLoad(gameObject);
//                 gameObject.name = "NitroliteManager"; // Ensure correct name
//             }
//             else if (instance != this)
//             {
//                 Destroy(gameObject);
//             }
//         }

//         void Start() => Nitrolite_Init();

//         public void ConnectWallet() => Nitrolite_ConnectWallet();
//         public void ConnectClearNode(string url) => Nitrolite_ConnectClearNode(url);
//         public void DoAuth(string wallet, string participant, string appAddress, int expireSeconds=3600)
//             => Nitrolite_DoAuth(wallet, participant, appAddress, expireSeconds);
//         public void HandleChallenge(string challengeJson, string walletClientJson)
//             => Nitrolite_HandleChallenge(challengeJson, walletClientJson);
//         public void SendRawMessage(string msg) => Nitrolite_SendRawMessage(msg);

//         // ---- Callbacks from JS ----
//         public void OnInitComplete(string payloadJson) { Debug.Log("Init: " + payloadJson); }
//         public void OnWalletConnected(string account) { PlayerPrefs.SetString("wallet", account); Debug.Log("Wallet: " + account); }
//         public void OnWalletError(string err) { Debug.LogError("WalletError: " + err); }

//         public void OnClearNodeOpen(string v) { Debug.Log("ClearNode WS open"); }
//         public void OnClearNodeMessage(string json) { Debug.Log("ClearNode msg: " + json); /* parse and if auth_challenge then call HandleChallenge */ }
//         public void OnClearNodeAuthVerifySent(string v) { Debug.Log("Auth verify sent"); }
//         public void OnClearNodeAuthError(string e) { Debug.LogError("AuthError: " + e); }
//         public void OnClearNodeClose(string code) { Debug.Log("ClearNode WS close: " + code); }
//         public void OnAuthRequestSent(string v) { Debug.Log("Auth request sent"); }
//         public void OnClearNodeMessageSent(string v) { Debug.Log("Message sent to ClearNode"); }
//     }
// }


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
        private static void Nitrolite_ConnectWallet() { Debug.Log("Nitrolite_ConnectWallet (stub)"); }
        private static void Nitrolite_ConnectClearNode(string url) { Debug.Log("Nitrolite_ConnectClearNode (stub)"); }
        private static void Nitrolite_DoAuth(string wallet, string participant, string appAddress, int expireSeconds) { Debug.Log("Nitrolite_DoAuth (stub)"); }
        private static void Nitrolite_HandleChallenge(string challengeJson, string walletClientJson) { Debug.Log("Nitrolite_HandleChallenge (stub)"); }
        private static void Nitrolite_SendRawMessage(string msg) { Debug.Log("Nitrolite_SendRawMessage (stub)"); }
        private static void Nitrolite_SendYellowTx(string txJson) { Debug.Log("Nitrolite_SendYellowTx (stub)"); }
        private static void Nitrolite_GetChannelId() { Debug.Log("Nitrolite_GetChannelId (stub)"); }
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
        public void OnInitComplete(string payloadJson) { Debug.Log("Init: " + payloadJson); }
        public void OnWalletConnected(string account) { PlayerPrefs.SetString("wallet", account); Debug.Log("Wallet: " + account); }
        public void OnWalletError(string err) { Debug.LogError("WalletError: " + err); }

        public void OnClearNodeOpen(string v) { Debug.Log("ClearNode WS open"); }

        public void OnClearNodeMessage(string json)
        {
            Debug.Log("ClearNode msg: " + json);

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
                Debug.LogError("Failed to parse ClearNode message: " + e);
            }
        }

        public void OnClearNodeAuthVerifySent(string v) { Debug.Log("Auth verify sent"); }
        public void OnClearNodeAuthError(string e) { Debug.LogError("AuthError: " + e); }
        public void OnClearNodeClose(string code) { Debug.Log("ClearNode WS close: " + code); }
        public void OnAuthRequestSent(string v) { Debug.Log("Auth request sent"); }
        public void OnClearNodeMessageSent(string v) { Debug.Log("Message sent to ClearNode"); }

        // New callback for channel ID
        public void OnChannelId(string channelId)
        {
            Debug.Log("Nitrolite Channel ID: " + channelId);
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


