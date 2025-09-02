import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  ActivityIndicator,
} from 'react-native';

interface QRScannerProps {
  onScanSuccess: (url: string) => void;
  onScanError: (error: string) => void;
  isActive: boolean;
}

const { width, height } = Dimensions.get('window');

export const QRScanner: React.FC<QRScannerProps> = ({
  onScanSuccess,
  onScanError,
  isActive,
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [cameraPermission, setCameraPermission] = useState<'granted' | 'denied' | 'checking'>('checking');

  useEffect(() => {
    checkCameraPermission();
  }, []);

  const checkCameraPermission = async () => {
    try {
      // In a real implementation, you'd check camera permissions here
      // For now, we'll simulate permission granted
      setCameraPermission('granted');
    } catch (error) {
      setCameraPermission('denied');
      onScanError('Camera permission denied');
    }
  };

  const handleQRCodeScanned = (url: string) => {
    if (!isScanning) {
      setIsScanning(true);
      
      // Validate URL format
      if (url.startsWith('http://') || url.startsWith('https://')) {
        onScanSuccess(url);
      } else {
        onScanError('Invalid QR code: not a valid URL');
      }
      
      // Reset scanning state after a delay
      setTimeout(() => setIsScanning(false), 2000);
    }
  };

  const requestCameraPermission = async () => {
    setCameraPermission('checking');
    checkCameraPermission();
  };

  if (cameraPermission === 'checking') {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#1a73e8" />
        <Text style={styles.loadingText}>カメラの準備中...</Text>
      </View>
    );
  }

  if (cameraPermission === 'denied') {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>カメラのアクセス許可が必要です</Text>
        <TouchableOpacity style={styles.button} onPress={requestCameraPermission}>
          <Text style={styles.buttonText}>許可を再要求</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      
      {/* Camera View Placeholder */}
      <View style={styles.cameraContainer}>
        {/* In a real implementation, this would be the actual camera view */}
        <View style={styles.cameraPlaceholder}>
          <Text style={styles.placeholderText}>📷</Text>
          <Text style={styles.placeholderSubtext}>
            QRコードをカメラで読み取ってください
          </Text>
          
          {/* Simulate QR scanning for development */}
          <TouchableOpacity 
            style={styles.debugButton}
            onPress={() => handleQRCodeScanned('http://192.168.11.102:8080')}
          >
            <Text style={styles.debugButtonText}>デバッグ: 接続テスト</Text>
          </TouchableOpacity>
        </View>
        
        {/* Scanning overlay */}
        <View style={styles.overlay}>
          <View style={styles.scanArea}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>
        </View>
      </View>
      
      <View style={styles.footer}>
        <Text style={styles.instructionText}>
          RemoteClaudeサーバーのQRコードを読み取ってください
        </Text>
        
        {isScanning && (
          <View style={styles.scanningIndicator}>
            <ActivityIndicator size="small" color="#34a853" />
            <Text style={styles.scanningText}>読み取り中...</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  loadingText: {
    color: '#e0e0e0',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#1a73e8',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
    alignSelf: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  cameraPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
  },
  placeholderText: {
    fontSize: 80,
    marginBottom: 20,
  },
  placeholderSubtext: {
    color: '#9aa0a6',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
  },
  debugButton: {
    backgroundColor: '#34a853',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
  },
  debugButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanArea: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: '#1a73e8',
    borderWidth: 3,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  footer: {
    padding: 30,
    backgroundColor: '#2a2a2a',
    alignItems: 'center',
  },
  instructionText: {
    color: '#e0e0e0',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  scanningIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scanningText: {
    color: '#34a853',
    fontSize: 14,
    marginLeft: 10,
    fontWeight: 'bold',
  },
});