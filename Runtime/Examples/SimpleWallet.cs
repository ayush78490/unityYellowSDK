using UnityEngine;
using UnityEngine.UI;
using NitroliteSDK;
#if TEXTMESH_PRO
using TMPro;
#endif

public class SimpleWallet : MonoBehaviour
{
    [Header("Wallet Connection")]
    public Button connectButton;
#if TEXTMESH_PRO
    public TextMeshProUGUI statusText;
#else
    public Text statusText;
#endif

    [Header("Channel Message")]
#if TEXTMESH_PRO
    public TMP_InputField messageInput;
#else
    public InputField messageInput;
#endif
    public Button sendMessageButton;
    public string clearNodeUrl = "wss://erc7824.org/clearnode"; // Example URL - replace with your ClearNode URL

    private NitroliteManager nitrolite;
    private bool isChannelConnected = false;

    void Start()
    {
        // Initialize NitroliteManager first
        nitrolite = FindObjectOfType<NitroliteManager>();
        if (nitrolite == null)
        {
            // Create NitroliteManager if it doesn't exist
            GameObject nitroliteGO = new GameObject("NitroliteManager");
            nitrolite = nitroliteGO.AddComponent<NitroliteManager>();
        }

        // Setup button listeners
        if (connectButton)
            connectButton.onClick.AddListener(ConnectWallet);

        // Setup message UI
        if (sendMessageButton)
            sendMessageButton.onClick.AddListener(SendChannelMessage);

        // Subscribe to ClearNode events AFTER nitrolite is initialized
        nitrolite.OnClearNodeOpen += HandleChannelOpen;
        nitrolite.OnClearNodeMessage += HandleChannelMessage;
        nitrolite.OnClearNodeClose += HandleChannelClose;
    }

    void OnDestroy()
    {
        if (nitrolite != null)
        {
            nitrolite.OnClearNodeOpen -= HandleChannelOpen;
            nitrolite.OnClearNodeMessage -= HandleChannelMessage;
            nitrolite.OnClearNodeClose -= HandleChannelClose;
        }
    }

    public void ConnectWallet()
    {
        // Connect wallet logic (existing code)
        if (nitrolite != null)
        {
            nitrolite.ConnectWallet();
        }
    }

    public void ConnectToChannel()
    {
        if (!PlayerPrefs.HasKey("wallet"))
        {
            Debug.LogWarning("Connect wallet first!");
            return;
        }

        if (statusText != null)
            statusText.text = "Connecting to channel...";
        
        if (nitrolite != null)
        {
            nitrolite.ConnectClearNode(clearNodeUrl);
        }
    }

    public void SendChannelMessage()
    {
        if (!isChannelConnected || string.IsNullOrEmpty(messageInput.text) || nitrolite == null)
            return;

        // Create message JSON
        string msgJson = JsonUtility.ToJson(new ChannelMessage
        {
            type = "chat",
            from = PlayerPrefs.GetString("wallet"),
            content = messageInput.text,
            timestamp = System.DateTime.UtcNow.ToString("o")
        });

        nitrolite.SendRawMessage(msgJson);
        messageInput.text = ""; // Clear input
    }

    // Channel event handlers
    private void HandleChannelOpen(string _)
    {
        isChannelConnected = true;
        if (statusText != null)
            statusText.text = "Channel connected!";
        Debug.Log("Channel opened");
    }

    private void HandleChannelMessage(string json)
    {
        Debug.Log($"Channel message received: {json}");
        try
        {
            var msg = JsonUtility.FromJson<ChannelMessage>(json);
            if (msg.type == "chat")
            {
                Debug.Log($"Chat from {msg.from}: {msg.content}");
            }
        }
        catch (System.Exception e)
        {
            Debug.LogError($"Failed to parse message: {e.Message}");
        }
    }

    private void HandleChannelClose(string code)
    {
        isChannelConnected = false;
        if (statusText != null)
            statusText.text = "Channel disconnected";
        Debug.Log($"Channel closed with code: {code}");
    }

    [System.Serializable]
    private class ChannelMessage
    {
        public string type;
        public string from;
        public string content;
        public string timestamp;
    }
}