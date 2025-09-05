import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, TextInput } from 'react-native';
import { BarCodeScanner } from 'expo-barcode-scanner';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types/Navigation';

type QRScannerScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'QRScanner'
>;

interface Props {
  navigation: QRScannerScreenNavigationProp;
}

export default function QRScannerScreen({ navigation }: Props) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [manualUrl, setManualUrl] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);

  useEffect(() => {
    const getBarCodeScannerPermissions = async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === 'granted');
    };

    getBarCodeScannerPermissions();
  }, []);

  const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
    setScanned(true);
    console.log('QR Code scanned - Type:', type, 'Data length:', data.length);
    console.log('Raw QR data:', JSON.stringify(data));
    
    // Show debug info to user for troubleshooting
    if (__DEV__) {
      Alert.alert(
        '🔍 Debug: QR Code Scanned',
        `Type: ${type}\\nData: ${data.substring(0, 100)}${data.length > 100 ? '...' : ''}\\n\\nProcessing...`,
        [{ text: 'OK', onPress: () => processConnectionUrl(data) }]
      );
    } else {
      processConnectionUrl(data);
    }
  };

  const processConnectionUrl = (url: string) => {
    try {
      console.log('🔍 Processing QR code URL:', url);
      
      // Clean up the URL (remove any whitespace or special characters)
      const cleanUrl = url.trim();
      
      // Check if it's a WebSocket URL
      if (!cleanUrl.startsWith('ws://')) {
        console.log('❌ URL does not start with ws://', cleanUrl);
        Alert.alert('Invalid QR Code', 'This is not a valid RemoteClaude connection QR code.\n\nExpected format: ws://host:port/ws?key=...');
        setScanned(false);
        return;
      }

      // Manual parsing for WebSocket URLs since URL() might not handle them properly
      const urlParts = cleanUrl.split('?');
      if (urlParts.length !== 2) {
        console.log('❌ URL missing query parameters:', cleanUrl);
        Alert.alert('Invalid QR Code', 'Missing session key in URL.');
        setScanned(false);
        return;
      }

      const [baseUrl, queryString] = urlParts;
      console.log('📝 Base URL:', baseUrl);
      console.log('📝 Query:', queryString);

      // Parse query parameters manually (URLSearchParams not available in React Native)
      const sessionKey = queryString
        .split('&')
        .find(param => param.startsWith('key='))
        ?.split('=')[1];

      if (!sessionKey) {
        console.log('❌ No session key found in query parameters');
        Alert.alert('Invalid QR Code', 'Session key not found in QR code.');
        setScanned(false);
        return;
      }

      // Extract host from base URL
      const hostMatch = baseUrl.match(/ws:\/\/([^\/]+)/);
      const host = hostMatch ? hostMatch[1] : 'Unknown host';

      console.log('✅ Valid RemoteClaude URL found');
      console.log('🏠 Host:', host);
      console.log('🔑 Session Key:', sessionKey.substring(0, 8) + '...');
      
      Alert.alert(
        '🚀 Connection Found!',
        `Ready to connect to RemoteClaude server.\\n\\nHost: ${host}\\nKey: ${sessionKey.substring(0, 8)}...`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => setScanned(false),
          },
          {
            text: 'Connect',
            onPress: () => {
              navigation.navigate('ProjectList', {
                connectionUrl: cleanUrl,
                sessionKey: sessionKey,
              });
            },
          },
        ]
      );
    } catch (error) {
      console.error('❌ QR Code parsing error:', error);
      console.log('🔍 Raw QR data:', url);
      Alert.alert(
        'QR Code Parse Error', 
        `Could not parse the QR code.\\n\\nReceived data: ${url.substring(0, 100)}...\\n\\nPlease try again or use manual entry.`
      );
      setScanned(false);
    }
  };

  const handleManualConnection = () => {
    if (!manualUrl) {
      Alert.alert('Error', 'Please enter a connection URL.');
      return;
    }
    processConnectionUrl(manualUrl);
  };

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>No access to camera</Text>
        <Text style={styles.subMessage}>
          Please enable camera access in Settings to scan QR codes
        </Text>
        <TouchableOpacity 
          style={styles.manualButton}
          onPress={() => setShowManualInput(true)}
        >
          <Text style={styles.manualButtonText}>Enter URL Manually</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {showManualInput ? (
        <View style={styles.manualInputContainer}>
          <Text style={styles.title}>Manual Connection</Text>
          <Text style={styles.instructions}>
            Enter the WebSocket URL from your macOS server:
          </Text>
          <TextInput
            style={styles.textInput}
            placeholder="ws://192.168.11.102:8090/ws?key=sessionkey123..."
            value={manualUrl}
            onChangeText={setManualUrl}
            autoCapitalize="none"
            autoCorrect={false}
            multiline={true}
            numberOfLines={3}
          />
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={styles.connectButton}
              onPress={handleManualConnection}
            >
              <Text style={styles.connectButtonText}>Connect</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => {
                setShowManualInput(false);
                setManualUrl('');
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <>
          <View style={styles.scannerContainer}>
            <BarCodeScanner
              onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
              style={StyleSheet.absoluteFillObject}
            />
            <View style={styles.overlay}>
              <View style={styles.scanArea} />
            </View>
          </View>
          <View style={styles.instructionsContainer}>
            <Text style={styles.title}>Connect to RemoteClaude</Text>
            <Text style={styles.instructions}>
              1. Start the macOS server: `./remoteclaude-server`{'\n'}
              2. Point your camera at the QR code{'\n'}
              3. Tap to connect when scanned{'\n'}
              {'\n'}
              Expected format: ws://host:port/ws?key=sessionkey
            </Text>
            {scanned && (
              <TouchableOpacity 
                style={styles.rescanButton}
                onPress={() => setScanned(false)}
              >
                <Text style={styles.rescanButtonText}>Tap to Scan Again</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity 
              style={styles.manualButton}
              onPress={() => setShowManualInput(true)}
            >
              <Text style={styles.manualButtonText}>Enter URL Manually</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scannerContainer: {
    flex: 2,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanArea: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#00FF00',
    backgroundColor: 'transparent',
  },
  instructionsContainer: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#007AFF',
  },
  instructions: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    color: '#333',
    marginBottom: 20,
  },
  message: {
    fontSize: 18,
    textAlign: 'center',
    color: '#333',
    marginBottom: 10,
  },
  subMessage: {
    fontSize: 14,
    textAlign: 'center',
    color: '#666',
    marginBottom: 20,
  },
  rescanButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  rescanButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  manualButton: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  manualButtonText: {
    color: '#007AFF',
    fontSize: 16,
  },
  manualInputContainer: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    marginBottom: 20,
    backgroundColor: '#f9f9f9',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  connectButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 10,
  },
  connectButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginLeft: 10,
  },
  cancelButtonText: {
    color: '#007AFF',
    fontSize: 16,
  },
});