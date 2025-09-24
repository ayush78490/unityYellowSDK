using UnityEngine;
using UnityEngine.UI;
using NitroliteSDK;
using TMPro;

public class SimpleWallet : MonoBehaviour
{
    [Header("Wallet Connection")]
    public Button connectButton;
    public TextMeshProUGUI statusText;

    [Header("Channel Message")]
    public TMP_InputField messageInput;
    public Button sendMessageButton;
    public string clearNodeUrl = "wss://erc7824.org/clearnode"; // Example URL - replace with your ClearNode URL

    private bool isChannelConnected = false;

    void Start()
    {
        // Setup button listeners
        if (connectButton)
            connectButton.onClick.AddListener(ConnectWallet);

        // Setup message UI
        if (sendMessageButton)
            sendMessageButton.onClick.AddListener(SendChannelMessage);

        // Subscribe to ClearNode events
        nitrolite.OnClearNodeOpen += HandleChannelOpen;
        nitrolite.OnClearNodeMessage += HandleChannelMessage;
        nitrolite.OnClearNodeClose += HandleChannelClose;
    }

    void OnDestroy()
    {
        if (nitrolite)
        {
            nitrolite.OnClearNodeOpen -= HandleChannelOpen;
            nitrolite.OnClearNodeMessage -= HandleChannelMessage;
            nitrolite.OnClearNodeClose -= HandleChannelClose;
        }
    }

    public void ConnectWallet()
    {
        // Connect wallet logic (existing code)
        nitrolite.ConnectWallet();
    }

    public void ConnectToChannel()
    {
        if (!PlayerPrefs.HasKey("wallet"))
        {
            Debug.LogWarning("Connect wallet first!");
            return;
        }

        statusText.SetText("Connecting to channel...");
        nitrolite.ConnectClearNode(clearNodeUrl);
    }

    public void SendChannelMessage()
    {
        if (!isChannelConnected || string.IsNullOrEmpty(messageInput.text))
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
        statusText.SetText("Channel connected!");
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
        statusText.SetText("Channel disconnected");
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