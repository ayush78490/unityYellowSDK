using UnityEngine;
using UnityEngine.UI;
using NitroliteSDK;
using TMPro;

public class SimpleWallet : MonoBehaviour
{
    [Header("UI References")]
    public Button connectButton;
    public Button connectClearNodeButton;
    public TMP_Text statusText;
    public TMP_InputField clearNodeUrlInput;
    
    [Header("Configuration")]
    public string defaultClearNodeUrl = "wss://your-clearnode-url.com";
    public string appAddress = "0x0000000000000000000000000000000000000000";
    
    private NitroliteManager nitrolite;
    private bool isWalletConnected = false;
    private bool isClearNodeConnected = false;
    private string connectedWallet = "";

    void Start()
    {
        // Find NitroliteManager in the scene
        nitrolite = FindObjectOfType<NitroliteManager>();
        if (nitrolite == null)
        {
            Debug.LogError("NitroliteManager not found! Please add a NitroliteManager component to your scene.");
            statusText.SetText("ERROR: NitroliteManager missing");
            return;
        }

        // Setup button listeners
        connectButton.onClick.AddListener(ConnectWallet);
        connectClearNodeButton.onClick.AddListener(ConnectToClearNode);
        
        // Set default URL if input field exists
        if (clearNodeUrlInput != null)
        {
            clearNodeUrlInput.text = defaultClearNodeUrl;
        }
        
        // Initialize UI
        UpdateUIState();
        
        Debug.Log("SimpleWallet initialized successfully");
    }

    void ConnectWallet()
    {
        if (nitrolite == null)
        {
            Debug.LogError("NitroliteManager is null!");
            return;
        }

        statusText.SetText("Connecting wallet...");
        nitrolite.ConnectWallet();
    }

    void ConnectToClearNode()
    {
        if (nitrolite == null || !isWalletConnected)
        {
            statusText.SetText("Connect wallet first!");
            return;
        }

        string url = clearNodeUrlInput != null ? clearNodeUrlInput.text : defaultClearNodeUrl;
        if (string.IsNullOrEmpty(url))
        {
            statusText.SetText("Enter Clear Node URL!");
            return;
        }

        statusText.SetText("Connecting to Clear Node...");
        nitrolite.ConnectClearNode(url);
    }

    // Called by NitroliteManager when wallet connects
    public void OnWalletConnected(string account)
    {
        Debug.Log($"SimpleWallet received wallet connection: {account}");
        
        connectedWallet = account;
        PlayerPrefs.SetString("wallet", account);
        isWalletConnected = true;
        
        statusText.SetText($"Wallet Connected: {account.Substring(0, 8)}...");
        UpdateUIState();
        
        // DON'T call GetChannelId() here - wait for Clear Node connection
        Debug.Log("Wallet connected. Now connect to Clear Node to get channel ID.");
    }

    // Called by NitroliteManager when Clear Node WebSocket opens
    public void OnClearNodeConnected()
    {
        Debug.Log("Clear Node connected successfully");
        isClearNodeConnected = true;
        statusText.SetText("Clear Node Connected. Getting Channel ID...");
        
        // NOW we can safely call GetChannelId
        if (nitrolite != null)
        {
            nitrolite.GetChannelId();
        }
        
        UpdateUIState();
    }

    // Called by NitroliteManager with the channel ID
    public void OnChannelId(string channelId)
    {
        Debug.Log($"SimpleWallet received channel ID: {channelId}");
        statusText.SetText($"Ready - Channel: {channelId}");
        
        // Now you can start authentication or other operations
        StartAuthentication();
    }

    void StartAuthentication()
    {
        if (!isWalletConnected || !isClearNodeConnected)
        {
            Debug.LogError("Cannot start auth - wallet or Clear Node not connected");
            return;
        }

        Debug.Log("Starting authentication process...");
        statusText.SetText("Starting authentication...");
        
        // Start the authentication process
        nitrolite.DoAuth(connectedWallet, connectedWallet, appAddress, 3600);
    }

    // Called when authentication request is sent
    public void OnAuthRequestSent()
    {
        Debug.Log("Authentication request sent");
        statusText.SetText("Auth request sent, waiting for challenge...");
    }

    // Called when authentication is complete
    public void OnAuthComplete()
    {
        Debug.Log("Authentication completed successfully");
        statusText.SetText("Authenticated - Ready to use!");
    }

    // Error handlers
    public void OnWalletError(string error)
    {
        Debug.LogError($"Wallet error: {error}");
        statusText.SetText($"Wallet Error: {error}");
        isWalletConnected = false;
        UpdateUIState();
    }

    public void OnClearNodeError(string error)
    {
        Debug.LogError($"Clear Node error: {error}");
        statusText.SetText($"Clear Node Error: {error}");
        isClearNodeConnected = false;
        UpdateUIState();
    }

    void UpdateUIState()
    {
        // Update connect wallet button
        if (isWalletConnected)
        {
            connectButton.GetComponentInChildren<TMP_Text>().text = "Wallet Connected";
            connectButton.interactable = false;
        }
        else
        {
            connectButton.GetComponentInChildren<TMP_Text>().text = "Connect Wallet";
            connectButton.interactable = true;
        }

        // Update clear node button
        if (connectClearNodeButton != null)
        {
            connectClearNodeButton.interactable = isWalletConnected && !isClearNodeConnected;
            
            if (isClearNodeConnected)
            {
                connectClearNodeButton.GetComponentInChildren<TMP_Text>().text = "Clear Node Connected";
            }
            else
            {
                connectClearNodeButton.GetComponentInChildren<TMP_Text>().text = "Connect Clear Node";
            }
        }
    }

    void OnDestroy()
    {
        // Clean up button listeners
        if (connectButton != null)
        {
            connectButton.onClick.RemoveListener(ConnectWallet);
        }
        if (connectClearNodeButton != null)
        {
            connectClearNodeButton.onClick.RemoveListener(ConnectToClearNode);
        }
    }
}