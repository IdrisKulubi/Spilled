/**
 * ChatScreen - Complete messaging interface with real-time updates
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { TeaKEStyles, Spacing } from '../constants/Styles';
import { useAuth } from '../contexts/AuthContext';
import { 
  sendMessage, 
  fetchChatHistory, 
  ChatHistory,
  MessageResponse
} from '../actions/sendMessage';
import { supabase } from '../config/supabase';

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  text: string;
  created_at: string;
  expires_at: string;
}

interface ChatScreenProps {
  otherUserId?: string;
  otherUserNickname?: string;
}

export const ChatScreen: React.FC<ChatScreenProps> = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{ userId: string; nickname: string }>();
  const { user } = useAuth();
  const flatListRef = useRef<FlatList>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [otherUser, setOtherUser] = useState<{ id: string; nickname: string } | null>(null);

  const otherUserId = params.userId;
  const otherUserNickname = params.nickname || 'User';

  // Load chat history
  const loadChatHistory = useCallback(async () => {
    if (!otherUserId || !user) return;

    try {
      setLoading(true);
      const chatData = await fetchChatHistory(otherUserId);
      
      if (chatData) {
        setMessages(chatData.messages);
        setOtherUser(chatData.otherUser);
      } else {
        // Handle case where other user doesn't exist
        Alert.alert(
          'User Not Found', 
          'The user you are trying to message could not be found. They may have deleted their account.',
          [
            {
              text: 'Go Back',
              onPress: () => router.back(),
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
      Alert.alert('Error', 'Failed to load chat history');
    } finally {
      setLoading(false);
    }
  }, [otherUserId, user, router]);

  // Send message
  const handleSendMessage = async () => {
    if (!inputText.trim() || !otherUserId || sending) return;

    const messageText = inputText.trim();
    setInputText('');
    setSending(true);

    try {
      const response: MessageResponse = await sendMessage({
        receiverId: otherUserId,
        text: messageText
      });

      if (response.success) {
        // Message will be added via real-time subscription
        scrollToBottom();
      } else {
        Alert.alert('Error', response.error || 'Failed to send message');
        setInputText(messageText); // Restore the message text
      }
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
      setInputText(messageText); // Restore the message text
    } finally {
      setSending(false);
    }
  };

  // Scroll to bottom
  const scrollToBottom = () => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  // Setup real-time messaging
  useEffect(() => {
    if (!user || !otherUserId) return;

    // Subscribe to new messages
    const messageSubscription = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `or(and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id}))`
        },
        (payload) => {
          const newMessage = payload.new as Message;
          setMessages(prev => [...prev, newMessage]);
          scrollToBottom();
        }
      )
      .subscribe();

    return () => {
      messageSubscription.unsubscribe();
    };
  }, [user, otherUserId]);

  // Load initial data
  useEffect(() => {
    loadChatHistory();
  }, [loadChatHistory]);

  // Auto-scroll when messages change
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages.length]);

  const formatMessageTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    }
  };

  const isMessageFromCurrentUser = (message: Message): boolean => {
    return message.sender_id === user?.id;
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isFromMe = isMessageFromCurrentUser(item);
    const showTime = index === 0 || 
      (new Date(item.created_at).getTime() - new Date(messages[index - 1].created_at).getTime()) > 5 * 60 * 1000; // 5 minutes

    return (
      <View style={styles.messageContainer}>
        {showTime && (
          <Text style={styles.messageTime}>
            {formatMessageTime(item.created_at)}
          </Text>
        )}
        <View style={[
          styles.messageBubble,
          isFromMe ? styles.myMessage : styles.theirMessage
        ]}>
          <Text style={[
            styles.messageText,
            isFromMe ? styles.myMessageText : styles.theirMessageText
          ]}>
            {item.text}
          </Text>
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialIcons name="chat-bubble-outline" size={64} color={Colors.light.primary} />
      <Text style={styles.emptyStateTitle}>Start the conversation</Text>
      <Text style={styles.emptyStateSubtitle}>
        Messages are encrypted and auto-delete after 7 days for privacy
      </Text>
    </View>
  );

  if (!user) {
    return (
      <SafeAreaView style={[TeaKEStyles.safeContainer, styles.container]}>
        <Text>Please log in to view messages</Text>
      </SafeAreaView>
    );
  }

  if (!otherUserId) {
    return (
      <SafeAreaView style={[TeaKEStyles.safeContainer, styles.container]}>
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={64} color={Colors.light.textSecondary} />
          <Text style={styles.errorTitle}>Invalid Chat Session</Text>
          <Text style={styles.errorSubtitle}>
            Unable to start conversation. Please try again.
          </Text>
          <TouchableOpacity 
            style={styles.backToHomeButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backToHomeText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[TeaKEStyles.safeContainer, styles.container]}>
      <KeyboardAvoidingView 
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <MaterialIcons name="arrow-back" size={24} color={Colors.light.text} />
          </TouchableOpacity>
          
          <View style={styles.headerInfo}>
            <View style={styles.headerAvatar}>
              <MaterialIcons name="person" size={20} color={Colors.light.primary} />
            </View>
            <View>
              <Text style={styles.headerName}>{otherUserNickname}</Text>
              <Text style={styles.headerSubtitle}>Encrypted chat</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.infoButton}>
            <MaterialIcons name="info-outline" size={24} color={Colors.light.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Messages List */}
        <View style={styles.messagesContainer}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.light.primary} />
              <Text style={styles.loadingText}>Loading messages...</Text>
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderMessage}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={renderEmptyState}
              contentContainerStyle={messages.length === 0 ? { flex: 1 } : { paddingVertical: Spacing.sm }}
              onContentSizeChange={() => scrollToBottom()}
              onLayout={() => scrollToBottom()}
            />
          )}
        </View>

        {/* Input Section */}
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.textInput}
              placeholder="Type a message..."
              placeholderTextColor={Colors.light.textSecondary}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={1000}
              editable={!sending}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!inputText.trim() || sending) && styles.sendButtonDisabled
              ]}
              onPress={handleSendMessage}
              disabled={!inputText.trim() || sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color={Colors.light.background} />
              ) : (
                <MaterialIcons 
                  name="send" 
                  size={20} 
                  color={inputText.trim() ? Colors.light.background : Colors.light.textSecondary} 
                />
              )}
            </TouchableOpacity>
          </View>
          
          {/* Privacy notice */}
          <View style={styles.privacyNotice}>
            <MaterialIcons name="lock" size={12} color={Colors.light.textSecondary} />
            <Text style={styles.privacyText}>
              End-to-end encrypted • Messages auto-delete after 7 days
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.light.background,
  },
  keyboardContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.light.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  backButton: {
    padding: Spacing.xs,
    marginRight: Spacing.sm,
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.light.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  headerName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  headerSubtitle: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  infoButton: {
    padding: Spacing.xs,
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginTop: Spacing.sm,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  messageContainer: {
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.xs,
  },
  messageTime: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 18,
    marginBottom: 2,
  },
  myMessage: {
    backgroundColor: Colors.light.primary,
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  theirMessage: {
    backgroundColor: Colors.light.cardBackground,
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  myMessageText: {
    color: Colors.light.background,
  },
  theirMessageText: {
    color: Colors.light.text,
  },
  inputContainer: {
    backgroundColor: Colors.light.cardBackground,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: Colors.light.background,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.light.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.light.text,
    maxHeight: 100,
    paddingVertical: Platform.OS === 'ios' ? 8 : 4,
    paddingRight: Spacing.sm,
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.light.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.xs,
  },
  sendButtonDisabled: {
    backgroundColor: Colors.light.border,
  },
  privacyNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  privacyText: {
    fontSize: 11,
    color: Colors.light.textSecondary,
    marginLeft: 4,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  errorSubtitle: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  backToHomeButton: {
    backgroundColor: Colors.light.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: 8,
  },
  backToHomeText: {
    color: Colors.light.background,
    fontSize: 16,
    fontWeight: '600',
  },
});