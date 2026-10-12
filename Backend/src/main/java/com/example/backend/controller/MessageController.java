package com.example.backend.controller;

import com.example.backend.entity.Message;
import com.example.backend.entity.User;
import com.example.backend.entity.GamePlayer;
import com.example.backend.entity.Conversation;
import com.example.backend.service.MessageService;
import com.example.backend.service.UserService;
import com.example.backend.service.GamePlayerService;
import com.example.backend.repository.GamePlayerRepository;
import com.example.backend.repository.PlayerImageRepository;
import com.example.backend.entity.PlayerImage;
import lombok.Data;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;

import java.util.List;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Set;
import java.util.LinkedHashSet;

@RestController
@RequestMapping("/api/messages")
public class MessageController {

    private final MessageService messageService;
    private final UserService userService;
    private final GamePlayerService gamePlayerService;
    private final GamePlayerRepository gamePlayerRepository;
    private final PlayerImageRepository playerImageRepository;

    public MessageController(MessageService messageService,
                             UserService userService,
                             GamePlayerService gamePlayerService,
                             GamePlayerRepository gamePlayerRepository,
                             PlayerImageRepository playerImageRepository) {
        this.messageService = messageService;
        this.userService = userService;
        this.gamePlayerService = gamePlayerService;
        this.gamePlayerRepository = gamePlayerRepository;
        this.playerImageRepository = playerImageRepository;
    }

    private User resolveTargetUser(Long id) {
        if (id == null) return null;
        User user = userService.findById(id);
        if (user != null) {
            return user;
        }
        var gpOpt = gamePlayerRepository.findById(id);
        if (gpOpt.isPresent() && gpOpt.get().getUser() != null) {
            return gpOpt.get().getUser();
        }
        return null;
    }

    @PostMapping("/send/{userId}")
    public ResponseEntity<?> sendMessage(
            @PathVariable Long userId,
            @RequestBody MessageRequest request,
            Authentication authentication) {
        if (request == null || request.getContent() == null || request.getContent().trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Nội dung tin nhắn không được để trống");
        }

        User sender = userService.findByUsername(authentication.getName());
        User receiver = resolveTargetUser(userId);
        if (receiver == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Không tìm thấy người nhận");
        }

        if (sender.getId().equals(receiver.getId())) {
            return ResponseEntity.badRequest().body("Bạn không thể gửi tin nhắn cho chính mình");
        }

        Message message = messageService.sendMessage(sender, receiver, request.getContent().trim());
        String senderName = getDisplayName(sender);
        String receiverName = getDisplayName(receiver);
        DetailMessageDTO response = new DetailMessageDTO(
            message.getId(),
            message.getContent(),
            message.getSender().getId(),
            senderName,
            message.getReceiver().getId(),
            receiverName,
            message.getTimestamp(),
            message.isRead()
        );
        return ResponseEntity.ok(response);
    }

    @GetMapping("/conversation/{userId}")
    public ResponseEntity<?> getConversation(
            @PathVariable Long userId,
            Authentication authentication) {
        User currentUser = userService.findByUsername(authentication.getName());
        User otherUser = resolveTargetUser(userId);
        if (otherUser == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Không tìm thấy người dùng");
        }

        Conversation conversation = messageService.getOrCreateConversation(currentUser, otherUser);
        List<Message> messages = messageService.getConversation(currentUser, otherUser);
        List<DetailMessageDTO> detailList = messages.stream()
            .map(m -> new DetailMessageDTO(
                m.getId(),
                m.getContent(),
                m.getSender().getId(),
                getDisplayName(m.getSender()),
                m.getReceiver().getId(),
                getDisplayName(m.getReceiver()),
                m.getTimestamp(),
                m.isRead()
            ))
            .toList();

        String otherName = getDisplayName(otherUser);
        String lastMsg = !detailList.isEmpty()
            ? detailList.get(detailList.size() - 1).getContent()
            : conversation.getLastMessageContent();
        LocalDateTime lastTime = !detailList.isEmpty()
            ? detailList.get(detailList.size() - 1).getTimestamp()
            : conversation.getLastMessageTime();

        long unreadCount = messages.stream()
            .filter(m -> m.getReceiver().getId().equals(currentUser.getId()) && !m.isRead())
            .count();

        ConversationDetailDTO result = new ConversationDetailDTO(
            conversation.getId(),
            otherUser.getId(),
            otherName,
            otherUser.getUsername(),
            getUserAvatar(otherUser),
            lastMsg,
            lastTime,
            (int) unreadCount,
            detailList
        );
        return ResponseEntity.ok(result);
    }

    @GetMapping("/unread")
    public ResponseEntity<?> getUnreadMessages(Authentication authentication) {
        User user = userService.findByUsername(authentication.getName());
        List<Message> unreadMessages = messageService.getUnreadMessages(user);
        return ResponseEntity.ok(unreadMessages);
    }

    @GetMapping("/unread/count")
    public ResponseEntity<?> getUnreadMessageCount(Authentication authentication) {
        User user = userService.findByUsername(authentication.getName());
        long count = messageService.getUnreadMessageCount(user);
        return ResponseEntity.ok(count);
    }

    @PostMapping("/read/{messageId}")
    public ResponseEntity<?> markMessageAsRead(@PathVariable Long messageId) {
        messageService.markMessageAsRead(messageId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/read-all/{userId}")
    public ResponseEntity<?> markAllMessagesAsRead(
            @PathVariable Long userId,
            Authentication authentication) {
        User currentUser = userService.findByUsername(authentication.getName());
        User otherUser = resolveTargetUser(userId);
        if (otherUser != null) {
            messageService.markAllMessagesAsRead(currentUser, otherUser);
        }
        return ResponseEntity.ok().build();
    }

    @GetMapping("/all-conversations")
    public ResponseEntity<?> getAllConversations(Authentication authentication) {
        User currentUser = userService.findByUsername(authentication.getName());
        List<Message> sentMessages = messageService.getMessagesBySender(currentUser);
        List<Message> receivedMessages = messageService.getMessagesByReceiver(currentUser);
        Set<Long> chatUserIds = new LinkedHashSet<>();

        List<Conversation> conversations = messageService.getUserConversations(currentUser);
        for (Conversation conv : conversations) {
            if (conv.getUser1() != null && !conv.getUser1().getId().equals(currentUser.getId())) {
                chatUserIds.add(conv.getUser1().getId());
            }
            if (conv.getUser2() != null && !conv.getUser2().getId().equals(currentUser.getId())) {
                chatUserIds.add(conv.getUser2().getId());
            }
        }
        for (Message message : sentMessages) {
            if (message.getReceiver() != null) {
                chatUserIds.add(message.getReceiver().getId());
            }
        }
        for (Message message : receivedMessages) {
            if (message.getSender() != null) {
                chatUserIds.add(message.getSender().getId());
            }
        }
        chatUserIds.remove(currentUser.getId());

        List<ConversationDetailDTO> result = new ArrayList<>();
        for (Long otherUserId : chatUserIds) {
            User otherUser = userService.findById(otherUserId);
            if (otherUser != null) {
                Conversation conversation = messageService.getOrCreateConversation(currentUser, otherUser);
                List<Message> messages = messageService.getConversation(currentUser, otherUser);
                List<DetailMessageDTO> detailMessages = messages.stream()
                    .map(m -> new DetailMessageDTO(
                        m.getId(),
                        m.getContent(),
                        m.getSender().getId(),
                        getDisplayName(m.getSender()),
                        m.getReceiver().getId(),
                        getDisplayName(m.getReceiver()),
                        m.getTimestamp(),
                        m.isRead()
                    ))
                    .toList();

                String otherName = getDisplayName(otherUser);
                String lastMsg = !detailMessages.isEmpty()
                    ? detailMessages.get(detailMessages.size() - 1).getContent()
                    : conversation.getLastMessageContent();
                LocalDateTime lastTime = !detailMessages.isEmpty()
                    ? detailMessages.get(detailMessages.size() - 1).getTimestamp()
                    : conversation.getLastMessageTime();

                long unreadCount = messages.stream()
                    .filter(m -> m.getReceiver().getId().equals(currentUser.getId()) && !m.isRead())
                    .count();

                result.add(new ConversationDetailDTO(
                    conversation.getId(),
                    otherUser.getId(),
                    otherName,
                    otherUser.getUsername(),
                    getUserAvatar(otherUser),
                    lastMsg,
                    lastTime,
                    (int) unreadCount,
                    detailMessages
                ));
            }
        }

        result.sort((a, b) -> {
            if (a.getLastMessageTime() == null && b.getLastMessageTime() == null) return 0;
            if (a.getLastMessageTime() == null) return 1;
            if (b.getLastMessageTime() == null) return -1;
            return b.getLastMessageTime().compareTo(a.getLastMessageTime());
        });

        return ResponseEntity.ok(result);
    }

    private String getDisplayName(User user) {
        if (user == null) return "";
        List<GamePlayer> players = gamePlayerService.findByUserId(user.getId());
        if (players != null && !players.isEmpty() && players.get(0).getUsername() != null && !players.get(0).getUsername().trim().isEmpty()) {
            return players.get(0).getUsername();
        }
        return (user.getFullName() != null && !user.getFullName().trim().isEmpty())
            ? user.getFullName()
            : user.getUsername();
    }

    private String getUserAvatar(User user) {
        if (user == null) return null;
        if (user.getAvatarUrl() != null && !user.getAvatarUrl().trim().isEmpty()) {
            return user.getAvatarUrl();
        }
        if (user.getProfileImageUrl() != null && !user.getProfileImageUrl().trim().isEmpty()) {
            return user.getProfileImageUrl();
        }
        try {
            List<GamePlayer> players = gamePlayerService.findByUserId(user.getId());
            if (players != null && !players.isEmpty()) {
                for (GamePlayer gp : players) {
                    List<PlayerImage> images = playerImageRepository.findByGamePlayerId(gp.getId());
                    if (images != null && !images.isEmpty() && images.get(0).getImageUrl() != null && !images.get(0).getImageUrl().trim().isEmpty()) {
                        return images.get(0).getImageUrl();
                    }
                }
            }
        } catch (Exception ignored) {}
        return null;
    }
}

@Data
class MessageRequest {
    private String content;
}

@Data
@AllArgsConstructor
@NoArgsConstructor
class ConversationDetailDTO {
    private Long conversationId;
    private Long partnerId;
    private String otherName;
    private String partnerUsername;
    private String partnerAvatar;
    private String lastMessage;
    private LocalDateTime lastMessageTime;
    private int unreadCount;
    private List<DetailMessageDTO> messages;
}

@Data
@AllArgsConstructor
@NoArgsConstructor
class DetailMessageDTO {
    private Long id;
    private String content;
    private Long senderId;
    private String senderName;
    private Long receiverId;
    private String receiverName;
    private LocalDateTime timestamp;
    private boolean read;
}