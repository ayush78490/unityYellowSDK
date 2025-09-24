using UnityEngine;
using UnityEngine.UI;
using NitroliteSDK;

namespace NitroliteSDK.Examples
{
    public class SimpleWalletManager : MonoBehaviour
    {
        [Header("UI References")]
        public Button connectWalletButton;
        public Button sendTransactionButton;
        public InputField recipientAddressInput;
        public InputField amountInput;
        public Text statusText;

        private NitroliteManager nitrolite;
        private bool isConnected = false;

        void Start()
        {
            // Get or create NitroliteManager
            nitrolite = FindObjectOfType<NitroliteManager>();
            if (!nitrolite) {
                Debug.LogError("Add NitroliteManager to scene!");
                return;
            }

            // Setup UI listeners
            connectWalletButton.onClick.AddListener(ConnectWallet);
            sendTransactionButton.onClick.AddListener(SendTransaction);
            
            // Initialize UI state
            UpdateUIState();
        }

        void ConnectWallet()
        {
            statusText.text = "Connecting wallet...";
            nitrolite.ConnectWallet();
        }

        void SendTransaction()
        {
            string to = recipientAddressInput.text;
            string amount = amountInput.text;

            if (string.IsNullOrEmpty(to) || string.IsNullOrEmpty(amount))
            {
                statusText.text = "Enter valid address and amount";
                return;
            }

            // Create and send transaction message
            string txMsg = $"{{\"type\":\"tx\",\"to\":\"{to}\",\"amount\":\"{amount}\"}}";
            nitrolite.SendRawMessage(txMsg);
            statusText.text = "Sending transaction...";
        }

        void UpdateUIState()
        {
            isConnected = PlayerPrefs.HasKey("wallet");
            sendTransactionButton.interactable = isConnected;
            
            if (isConnected)
            {
                statusText.text = "Connected: " + PlayerPrefs.GetString("wallet");
                connectWalletButton.GetComponentInChildren<Text>().text = "Connected";
            }
            else
            {
                statusText.text = "Not connected";
                connectWalletButton.GetComponentInChildren<Text>().text = "Connect Wallet";
            }
        }

        void Update()
        {
            // Check for wallet connection changes
            if (isConnected != PlayerPrefs.HasKey("wallet"))
            {
                UpdateUIState();
            }
        }
    }
}
