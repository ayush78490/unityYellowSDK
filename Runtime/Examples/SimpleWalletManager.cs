using UnityEngine;
using UnityEngine.UI;
using NitroliteSDK;
using TMPro;

public class SimpleWallet : MonoBehaviour
{
    [Header("UI References")]
    public Button connectButton;
    public TMP_Text statusText;
    
    private NitroliteManager nitrolite;
    private bool isWalletConnected = false;

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

        // Setup button listener
        connectButton.onClick.AddListener(ConnectWallet);
        
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

    // This method will be called by NitroliteManager when wallet connects
    public void OnWalletConnected(string account)
    {
        Debug.Log($"SimpleWallet received wallet connection: {account}");
        
        PlayerPrefs.SetString("wallet", account);
        statusText.SetText($"Connected: {account.Substring(0, 8)}...");
        isWalletConnected = true;
        
        UpdateUIState();

        // Request channel ID after successful connection
        if (nitrolite != null)
        {
            Debug.Log("Requesting channel ID...");
            nitrolite.GetChannelId();
        }
    }

    // This method will be called by NitroliteManager with the channel ID
    public void OnChannelId(string channelId)
    {
        Debug.Log($"SimpleWallet received channel ID: {channelId}");
        // You can update UI or store this ID as needed
        statusText.SetText($"Connected - Channel: {channelId}");
    }

    void UpdateUIState()
    {
        string savedWallet = PlayerPrefs.GetString("wallet", "");
        isWalletConnected = !string.IsNullOrEmpty(savedWallet);

        if (isWalletConnected)
        {
            connectButton.GetComponentInChildren<TMP_Text>().text = "Connected";
            connectButton.interactable = false;
            statusText.SetText($"Connected: {savedWallet.Substring(0, 8)}...");
        }
        else
        {
            connectButton.GetComponentInChildren<TMP_Text>().text = "Connect Wallet";
            connectButton.interactable = true;
            statusText.SetText("Wallet not connected");
        }
    }

    void OnDestroy()
    {
        // Clean up button listener
        if (connectButton != null)
        {
            connectButton.onClick.RemoveListener(ConnectWallet);
        }
    }
}