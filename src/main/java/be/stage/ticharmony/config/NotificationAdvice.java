package be.stage.ticharmony.config;

import be.stage.ticharmony.model.Notification;
import be.stage.ticharmony.model.User;
import be.stage.ticharmony.service.NotificationService;
import be.stage.ticharmony.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
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

    @ModelAttribute("currentUri")
    public String populateCurrentUri(HttpServletRequest request) {
        return request.getRequestURI();
    }

    @ModelAttribute("currentUser")
    public User populateCurrentUser(Authentication authentication) {
        if (authentication == null
                || authentication instanceof AnonymousAuthenticationToken
                || !authentication.isAuthenticated()) {
            return null;
        }
        String username = authentication.getName();
        if (username == null || "anonymousUser".equals(username)) {
            return null;
        }
        return userService.findByLogin(username);
    }

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
