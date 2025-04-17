package be.stage.ticharmony.config;

import be.stage.ticharmony.model.Notification;
import be.stage.ticharmony.model.User;
import be.stage.ticharmony.service.NotificationService;
import be.stage.ticharmony.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ModelAttribute;

import java.util.List;

@ControllerAdvice
public class NotificationAdvice {
    @Autowired
    private NotificationService notificationService;
    @Autowired
    private UserService userService;

    @ModelAttribute("notifications")
    public List<Notification> populateNotifications(Authentication authentication) {
        if (authentication == null
                || authentication instanceof AnonymousAuthenticationToken
                || !authentication.isAuthenticated()) {
            return List.of();
        }
        String username = authentication.getName();
        if (username == null || "anonymousUser".equals(username)) {
            return List.of();
        }
        User user = userService.findByLogin(username);
        if (user == null) {
            return List.of();
        }
        return notificationService.getUnreadForUser(user);
    }
}
