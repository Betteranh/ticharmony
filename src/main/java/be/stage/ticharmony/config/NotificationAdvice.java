package be.stage.ticharmony.config;

import be.stage.ticharmony.controller.ProfileController;
import be.stage.ticharmony.model.Notification;
import be.stage.ticharmony.model.User;
import be.stage.ticharmony.model.UserProfile;
import be.stage.ticharmony.model.UserRole;
import be.stage.ticharmony.service.NotificationService;
import be.stage.ticharmony.service.UserProfileService;
import be.stage.ticharmony.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
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
    @Autowired
    private UserProfileService userProfileService;

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

    @ModelAttribute("activeProfile")
    public UserProfile populateActiveProfile(Authentication authentication, HttpSession session) {
        if (authentication == null
                || authentication instanceof AnonymousAuthenticationToken
                || !authentication.isAuthenticated()) {
            return null;
        }
        Long profileId = (Long) session.getAttribute(ProfileController.SESSION_PROFILE_KEY);
        if (profileId == null) return null;
        return userProfileService.findById(profileId).orElse(null);
    }

    @ModelAttribute("notifications")
    public List<Notification> populateNotifications(Authentication authentication, HttpSession session) {
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
        if (user.getRole() == UserRole.CLIENT) {
            Long profileId = (Long) session.getAttribute(ProfileController.SESSION_PROFILE_KEY);
            if (profileId == null) return List.of();
            return userProfileService.findById(profileId)
                    .map(notificationService::getUnreadForProfile)
                    .orElse(List.of());
        }
        return notificationService.getUnreadForUser(user);
    }
}
