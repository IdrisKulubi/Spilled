/**
 * Debug button for testing authentication setup
 * This component helps diagnose OAuth issues directly in the app
 */

import React, { useState } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  Alert,
  ScrollView,
  View,
  Modal,
} from 'react-native';
import { AuthDebugger, debugAuth } from '../utils/debug-auth';
import { Colors } from '../../constants/Colors';

export const AuthDebugButton: React.FC = () => {
  const [isDebugging, setIsDebugging] = useState(false);
  const [debugOutput, setDebugOutput] = useState<string>('');
  const [showModal, setShowModal] = useState(false);

  const runDebugger = async () => {
    setIsDebugging(true);
    setShowModal(true);
    
    // Capture console logs
    const logs: string[] = [];
    const originalLog = console.log;
    const originalError = console.error;
    
    console.log = (...args: any[]) => {
      logs.push(args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' '));
      originalLog(...args);
    };
    
    console.error = (...args: any[]) => {
      logs.push('ERROR: ' + args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' '));
      originalError(...args);
    };
    
    try {
      await debugAuth();
      setDebugOutput(logs.join('\n'));
    } catch (error) {
      logs.push(`\nFatal Error: ${error instanceof Error ? error.message : String(error)}`);
      setDebugOutput(logs.join('\n'));
    } finally {
      // Restore original console methods
      console.log = originalLog;
      console.error = originalError;
      setIsDebugging(false);
    }
  };

  const copyToClipboard = () => {
    // In React Native, you would use Clipboard API
    Alert.alert('Debug Output', 'Check console logs for detailed debug information');
  };

  return (
    <>
      <TouchableOpacity
        style={styles.debugButton}
        onPress={runDebugger}
        disabled={isDebugging}
      >
        <Text style={styles.debugButtonText}>
          {isDebugging ? 'Running Diagnostics...' : '🔍 Debug Auth'}
        </Text>
      </TouchableOpacity>

      <Modal
        visible={showModal}
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Auth Debug Output</Text>
            <TouchableOpacity
              onPress={() => setShowModal(false)}
              style={styles.closeButton}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.debugOutputContainer}>
            <Text style={styles.debugOutput}>{debugOutput}</Text>
          </ScrollView>
          
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={copyToClipboard}
            >
              <Text style={styles.actionButtonText}>View in Console</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, styles.runAgainButton]}
              onPress={runDebugger}
              disabled={isDebugging}
            >
              <Text style={styles.actionButtonText}>Run Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  debugButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 10,
    alignSelf: 'center',
  },
  debugButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  closeButtonText: {
    fontSize: 24,
    color: '#666',
  },
  debugOutputContainer: {
    flex: 1,
    padding: 15,
  },
  debugOutput: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#333',
    lineHeight: 18,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 15,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  actionButton: {
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  runAgainButton: {
    backgroundColor: '#4CAF50',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});
