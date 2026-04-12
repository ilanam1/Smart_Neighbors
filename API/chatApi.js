import { getSupabase } from '../DataBase/supabase';
import { encryptMessage, decryptMessage } from '../utils/crypto';

const resolveProfileId = async (authUid) => {
    const supabase = getSupabase();
    const { data, error } = await supabase.from('profiles').select('id').eq('auth_uid', authUid).maybeSingle();
    if (error || !data) return authUid; // Fallback
    return data.id;
};

// =====================
// Fetch user's chats (List of private and group conversations)
// =====================
export const getUserConversations = async (userId) => {
    try {
        const supabase = getSupabase();
        const profileId = await resolveProfileId(userId);
        
        // Find all conversation IDs the user is a part of
        const { data: participants, error: pError } = await supabase
            .from('conversation_participants')
            .select('conversation_id')
            .eq('profile_id', profileId);
            
        if (pError) throw pError;
        if (!participants || participants.length === 0) return [];
        
        const conversationIds = participants.map(p => p.conversation_id);
        
        // Fetch those conversations, optionally joining with profiles if it's a private chat
        // We'll fetch the conversations and the *other* participants to display names
        const { data: conversations, error: cError } = await supabase
            .from('conversations')
            .select(`
                id, 
                is_group, 
                building_id, 
                updated_at,
                conversation_participants (
                    profile_id,
                    profiles (
                        id,
                        first_name,
                        last_name,
                        email
                    )
                )
            `)
            .in('id', conversationIds)
            .order('updated_at', { ascending: false });
            
        if (cError) throw cError;
        
        return conversations;
    } catch (error) {
        console.error('Error fetching conversations:', error);
        throw error;
    }
};

// =====================
// Fetch Building Group Chat (Create if doesn't exist)
// =====================
export const getBuildingGroupChat = async (buildingId, userId) => {
    try {
        const supabase = getSupabase();
        const profileId = await resolveProfileId(userId);
        
        // Find existing group chat for this building
        const { data: existingGroups, error: fetchError } = await supabase
            .from('conversations')
            .select('*')
            .eq('building_id', buildingId)
            .eq('is_group', true)
            .limit(1);
            
        if (fetchError) throw fetchError;
        
        if (existingGroups && existingGroups.length > 0) {
            const conversation = existingGroups[0];
            // Ensure current user is a participant
            await addParticipant(conversation.id, profileId);
            return conversation;
        }
        
        // If no group chat exists, create one
        const { data: newGroup, error: insertError } = await supabase
            .from('conversations')
            .insert([{ building_id: buildingId, is_group: true }])
            .select()
            .single();
            
        if (insertError) throw insertError;
        
        await addParticipant(newGroup.id, profileId);
        return newGroup;
        
    } catch (error) {
        console.error('Error in getBuildingGroupChat:', error);
        throw error;
    }
};

// =====================
// Get or Create Private Chat
// =====================
export const getOrCreatePrivateChat = async (userId, otherUserId, buildingId) => {
    try {
         const supabase = getSupabase();
         const profileA = await resolveProfileId(userId);
         const profileB = await resolveProfileId(otherUserId);
         
         // In a robust implementation, you might want to find an existing conversation
         // where BOTH users are participants and is_group = false.
         
         // 1. Get conversations user A is in
         const { data: userAConvos } = await supabase
            .from('conversation_participants')
            .select('conversation_id')
            .eq('profile_id', profileA);
            
         // 2. Get conversations user B is in
         const { data: userBConvos } = await supabase
            .from('conversation_participants')
            .select('conversation_id')
            .eq('profile_id', profileB);
         
         let existingConvoId = null;
         
         if (userAConvos && userBConvos) {
             const aIds = userAConvos.map(c => c.conversation_id);
             const bIds = userBConvos.map(c => c.conversation_id);
             
             // Find intersection
             const sharedIds = aIds.filter(id => bIds.includes(id));
             
             if (sharedIds.length > 0) {
                 // Check if it's a private chat
                  const { data: convos } = await supabase
                    .from('conversations')
                    .select('*')
                    .in('id', sharedIds)
                    .eq('is_group', false);
                    
                  if (convos && convos.length > 0) {
                      existingConvoId = convos[0].id;
                      return convos[0]; 
                  }
             }
         }
         
         // 3. Create new if doesn't exist
         const { data: newConvo, error: insertError } = await supabase
            .from('conversations')
            .insert([{ building_id: buildingId, is_group: false }])
            .select()
            .single();
            
         if (insertError) throw insertError;
         
         // 4. Add both participants
         await addParticipant(newConvo.id, profileA);
         await addParticipant(newConvo.id, profileB);
         
         return newConvo;

    } catch (error) {
        console.error('Error in getOrCreatePrivateChat:', error);
        throw error;
    }
}


// =====================
// Add Participant to Chat
// =====================
export const addParticipant = async (conversationId, userId) => {
     try {
         const supabase = getSupabase();
         const { error } = await supabase
            .from('conversation_participants')
            .insert([{ conversation_id: conversationId, profile_id: userId }])
            // If already exists, ignore constraint error (UNIQUE conversation_id, profile_id)
            
     } catch (error) {
         // Quietly ignore unique constraint errors
         if (error.code !== '23505') {
            console.error('Error adding participant:', error);
         }
     }
}

// =====================
// Fetch Messages
// =====================
export const getMessages = async (conversationId) => {
    try {
        const supabase = getSupabase();
        const { data, error } = await supabase
            .from('messages')
            .select(`
                id,
                content,
                created_at,
                sender_id,
                reactions,
                profiles (
                   first_name,
                   last_name,
                   auth_uid
                )
            `)
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true });
            
        if (error) throw error;
        
        // Decrypt the contents locally
        const decryptedData = data.map(msg => ({
            ...msg,
            content: decryptMessage(msg.content)
        }));
            
        return decryptedData;
    } catch (error) {
        console.error('Error fetching messages:', error);
        throw error;
    }
};

// =====================
// Send Message
// =====================
export const sendMessage = async (conversationId, senderId, content) => {
    try {
        const supabase = getSupabase();
        const senderProfileId = await resolveProfileId(senderId);

        const encryptedContent = encryptMessage(content);

        const { data, error } = await supabase
            .from('messages')
            .insert([{
                conversation_id: conversationId,
                sender_id: senderProfileId,
                content: encryptedContent
            }])
            .select()
            .single();
            
        if (error) throw error;
        
        // update last_read_at for sender
        await markConversationAsRead(conversationId, senderProfileId);
        
        return data;
    } catch (error) {
        console.error('Error sending message:', error);
        throw error;
    }
};

// =====================
// Toggle Message Reaction
// =====================
export const toggleMessageReaction = async (messageId, emoji, userId) => {
    try {
        const supabase = getSupabase();
        const profileId = await resolveProfileId(userId);

        // Fetch current reactions
        const { data: message, error: fetchError } = await supabase
            .from('messages')
            .select('reactions')
            .eq('id', messageId)
            .single();

        if (fetchError) throw fetchError;

        let reactions = message.reactions || {};

        // Toggle logic: If the same emoji exists for this user, remove it. Otherwise, set it.
        if (reactions[profileId] === emoji) {
            delete reactions[profileId];
        } else {
            reactions[profileId] = emoji;
        }

        const { data, error: updateError } = await supabase
            .from('messages')
            .update({ reactions: reactions })
            .eq('id', messageId)
            .select()
            .single();

        if (updateError) throw updateError;
        return data;
    } catch (error) {
        console.error('Error toggling reaction:', error);
        throw error;
    }
};

// =====================
// Edit Message
// =====================
export const editMessage = async (messageId, newContent) => {
    try {
        const supabase = getSupabase();
        
        const encryptedContent = encryptMessage(newContent);
        
        const { data, error } = await supabase
            .from('messages')
            .update({ content: encryptedContent })
            .eq('id', messageId)
            .select()
            .single();
            
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error editing message:', error);
        throw error;
    }
};

// =====================
// Mark Conversation As Read
// =====================
export const markConversationAsRead = async (conversationId, userId) => {
    try {
        const supabase = getSupabase();
        await supabase
            .from('conversation_participants')
            .update({ last_read_at: new Date().toISOString() })
            .eq('conversation_id', conversationId)
            .eq('profile_id', userId);
    } catch (error) {
        console.error('Error marking as read:', error);
    }
};

// =====================
// Fetch Other Users in Building (for starting private chats)
// =====================
export const getBuildingResidents = async (buildingId, excludeUserId) => {
    try {
         const supabase = getSupabase();
         const { data, error } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, email')
            .eq('building_id', buildingId)
            .neq('auth_uid', excludeUserId);
            
         if (error) {
             console.log('--- SUPABASE ERROR FETCHING RESIDENTS ---');
             console.log(JSON.stringify(error, null, 2));
             throw error;
         }
         return data;
    } catch (error) {
        console.error('Error fetching residents catch block:', error);
        throw error;
    }
}
