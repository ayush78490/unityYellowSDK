using UnityEngine;
using NitroliteSDK;

public class TestNitrolite : MonoBehaviour
{
    void Start()
    {
        var manager = GetComponent<NitroliteManager>();
        if (manager != null)
        {
            Debug.Log("NitroliteSDK found!");
        }
        else
        {
            Debug.LogError("NitroliteSDK not found. Make sure the package is imported correctly.");
        }
    }
}
