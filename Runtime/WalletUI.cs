using UnityEngine;
using UnityEngine.UI;
using NitroliteSDK;  // Add this namespace reference

public class WalletUI : MonoBehaviour
{
    public Button connectButton;
    public Text walletInfoText;

    private NitroliteManager nitroManager;

    void Awake()
    {
        nitroManager = FindObjectOfType<NitroliteManager>();
        if (nitroManager == null)
        {
            Debug.LogError("NitroliteManager not found in scene!");
            return;
        }

        connectButton.onClick.AddListener(OnConnectWallet);

        // Optional: you can poll PlayerPrefs for wallet if already connected
        if (PlayerPrefs.HasKey("wallet"))
        {
            walletInfoText.text = "Wallet: " + PlayerPrefs.GetString("wallet");
        }
    }

    void OnConnectWallet()
    {
        walletInfoText.text = "Connecting wallet...";
        nitroManager.ConnectWallet();
    }

    void Update()
    {
        // Update the wallet address if connected
        if (PlayerPrefs.HasKey("wallet"))
        {
            walletInfoText.text = "Wallet: " + PlayerPrefs.GetString("wallet");
        }
    }
}
