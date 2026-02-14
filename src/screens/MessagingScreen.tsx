import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { db, auth, supabase } from '../lib/supabase';
import { format } from 'date-fns';

// Import the logo banner image
const logoBanner = require('../../logo banner.png');

interface MessagingScreenProps {
  navigation: any;
}

const MessagingScreen: React.FC<MessagingScreenProps> = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<'client' | 'admin'>('client');
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [showChatModal, setShowChatModal] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadData();

    // Subscribe to new messages
    const subscription = supabase
      .channel('messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        loadData(); // Reload messages when new ones arrive
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadData = async () => {
    try {
      const { session } = await auth.getSession();
      if (!session) return;

      setUserId(session.user.id);

      // Get user role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (profile) {
        setUserRole(profile.role);
      }

      // Get all messages for this user
      const { data: allMessages } = await db.getMessages(session.user.id);

      if (allMessages) {
        setMessages(allMessages);

        // Group messages into conversations
        const conversationMap = new Map();

        allMessages.forEach((msg: any) => {
          const otherUser = msg.sender_id === session.user.id ? msg.recipient : msg.sender;
          const otherUserId = msg.sender_id === session.user.id ? msg.recipient_id : msg.sender_id;

          if (!conversationMap.has(otherUserId)) {
            conversationMap.set(otherUserId, {
              user: otherUser,
              userId: otherUserId,
              lastMessage: msg,
              unreadCount: 0,
            });
          } else {
            const existing = conversationMap.get(otherUserId);
            if (new Date(msg.created_at) > new Date(existing.lastMessage.created_at)) {
              existing.lastMessage = msg;
            }
          }

          // Count unread messages
          if (msg.recipient_id === session.user.id && !msg.read) {
            const conv = conversationMap.get(otherUserId);
            conv.unreadCount += 1;
          }
        });

        // Convert to array and sort by latest message
        const convArray = Array.from(conversationMap.values()).sort((a, b) => {
          return new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime();
        });

        setConversations(convArray);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const openConversation = async (conversation: any) => {
    setSelectedConversation(conversation);
    setShowChatModal(true);

    // Mark unread messages as read
    const unreadMessages = messages.filter(
      (msg: any) => msg.sender_id === conversation.userId && msg.recipient_id === userId && !msg.read
    );

    for (const msg of unreadMessages) {
      await db.markMessageAsRead(msg.id);
    }

    // Reload to update unread count
    loadData();
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !userId || !selectedConversation) return;

    setSending(true);
    try {
      await db.sendMessage(userId, selectedConversation.userId, newMessage.trim());
      setNewMessage('');
      loadData(); // Reload messages
    } catch (error: any) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const getConversationMessages = () => {
    if (!selectedConversation || !userId) return [];

    return messages
      .filter((msg: any) =>
        (msg.sender_id === userId && msg.recipient_id === selectedConversation.userId) ||
        (msg.sender_id === selectedConversation.userId && msg.recipient_id === userId)
      )
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Hero Banner */}
      <Image source={logoBanner} style={styles.heroBanner} resizeMode="cover" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
        <Text style={styles.headerSubtitle}>
          {userRole === 'admin' ? 'Client communications' : 'Chat with your PT'}
        </Text>
      </View>

      {/* Conversations List */}
      {conversations.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="chatbubbles-outline" size={64} color="#d1d5db" />
          <Text style={styles.emptyStateText}>No messages yet</Text>
          <Text style={styles.emptyStateSubtext}>
            {userRole === 'admin'
              ? 'Messages from clients will appear here'
              : 'Start a conversation with your PT'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.userId}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.conversationCard}
              onPress={() => openConversation(item)}
            >
              <View style={styles.avatarContainer}>
                <Ionicons
                  name={item.user.role === 'admin' ? 'person-circle' : 'person-circle-outline'}
                  size={48}
                  color="#3b82f6"
                />
                {item.unreadCount > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadBadgeText}>{item.unreadCount}</Text>
                  </View>
                )}
              </View>

              <View style={styles.conversationContent}>
                <View style={styles.conversationHeader}>
                  <Text style={styles.conversationName}>
                    {item.user.first_name} {item.user.last_name}
                  </Text>
                  <Text style={styles.conversationTime}>
                    {format(new Date(item.lastMessage.created_at), 'MMM d, h:mm a')}
                  </Text>
                </View>

                <Text
                  style={[
                    styles.conversationPreview,
                    item.unreadCount > 0 && styles.conversationPreviewUnread
                  ]}
                  numberOfLines={1}
                >
                  {item.lastMessage.sender_id === userId ? 'You: ' : ''}
                  {item.lastMessage.content}
                </Text>
              </View>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Chat Modal */}
      <Modal
        visible={showChatModal}
        animationType="slide"
        onRequestClose={() => setShowChatModal(false)}
      >
        <SafeAreaView style={styles.chatContainer}>
          {/* Chat Header */}
          <View style={styles.chatHeader}>
            <TouchableOpacity
              onPress={() => {
                setShowChatModal(false);
                setSelectedConversation(null);
              }}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color="#1f2937" />
            </TouchableOpacity>
            {selectedConversation && (
              <View style={styles.chatHeaderInfo}>
                <Text style={styles.chatHeaderName}>
                  {selectedConversation.user.first_name} {selectedConversation.user.last_name}
                </Text>
                <Text style={styles.chatHeaderRole}>
                  {selectedConversation.user.role === 'admin' ? 'Personal Trainer' : 'Client'}
                </Text>
              </View>
            )}
            <View style={{ width: 24 }} />
          </View>

          {/* Messages */}
          <FlatList
            data={getConversationMessages()}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const isMe = item.sender_id === userId;
              return (
                <View
                  style={[
                    styles.messageBubble,
                    isMe ? styles.messageBubbleMe : styles.messageBubbleOther
                  ]}
                >
                  <Text style={[styles.messageText, isMe && styles.messageTextMe]}>
                    {item.content}
                  </Text>
                  <Text style={[styles.messageTime, isMe && styles.messageTimeMe]}>
                    {format(new Date(item.created_at), 'h:mm a')}
                  </Text>
                </View>
              );
            }}
            contentContainerStyle={styles.messagesContent}
            inverted={false}
          />

          {/* Input */}
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.inputContainer}
          >
            <TextInput
              style={styles.input}
              placeholder="Type a message..."
              value={newMessage}
              onChangeText={setNewMessage}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[styles.sendButton, (!newMessage.trim() || sending) && styles.sendButtonDisabled]}
              onPress={sendMessage}
              disabled={!newMessage.trim() || sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Ionicons name="send" size={20} color="white" />
              )}
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  heroBanner: {
    width: '100%',
    height: 160,
  },
  header: {
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  listContent: {
    paddingVertical: 12,
  },
  conversationCard: {
    flexDirection: 'row',
    backgroundColor: 'white',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  unreadBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  conversationContent: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  conversationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  conversationTime: {
    fontSize: 12,
    color: '#9ca3af',
  },
  conversationPreview: {
    fontSize: 14,
    color: '#6b7280',
  },
  conversationPreviewUnread: {
    fontWeight: '600',
    color: '#1f2937',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#9ca3af',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#d1d5db',
    marginTop: 8,
    textAlign: 'center',
  },
  chatContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 4,
  },
  chatHeaderInfo: {
    flex: 1,
    alignItems: 'center',
  },
  chatHeaderName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  chatHeaderRole: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  messagesContent: {
    padding: 16,
  },
  messageBubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
  },
  messageBubbleMe: {
    alignSelf: 'flex-end',
    backgroundColor: '#3b82f6',
  },
  messageBubbleOther: {
    alignSelf: 'flex-start',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  messageText: {
    fontSize: 15,
    color: '#1f2937',
    marginBottom: 4,
  },
  messageTextMe: {
    color: 'white',
  },
  messageTime: {
    fontSize: 11,
    color: '#9ca3af',
  },
  messageTimeMe: {
    color: '#dbeafe',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingTop: 10,
    fontSize: 15,
    maxHeight: 100,
    marginRight: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
});

export default MessagingScreen;
