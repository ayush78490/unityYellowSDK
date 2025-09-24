using UnityEngine;
using System;

namespace NitroliteSDK
{
    public class TransactionHelper
    {
        [Serializable]
        public class TransactionData
        {
            public string to;
            public string value;  // in wei
            public string data;   // hex encoded
            public string gas;    // estimated gas
            public bool verified; // verification flag
        }

        public static TransactionData ValidateTransaction(string to, string value)
        {
            // Basic validation
            if (!IsValidAddress(to))
            {
                Debug.LogError("Invalid ETH address format");
                return null;
            }

            // Parse and validate amount
            if (!decimal.TryParse(value, out decimal amountInWei) || amountInWei <= 0)
            {
                Debug.LogError("Invalid amount");
                return null;
            }

            // Create validated transaction data
            return new TransactionData
            {
                to = to,
                value = value,
                verified = true
            };
        }

        private static bool IsValidAddress(string address)
        {
            // Basic ETH address validation (0x + 40 hex chars)
            if (string.IsNullOrEmpty(address)) return false;
            if (!address.StartsWith("0x")) return false;
            if (address.Length != 42) return false;
            
            // Check if valid hex after 0x
            string hex = address.Substring(2);
            return System.Text.RegularExpressions.Regex.IsMatch(hex, @"\A\b[0-9a-fA-F]+\b\Z");
        }
    }
}
