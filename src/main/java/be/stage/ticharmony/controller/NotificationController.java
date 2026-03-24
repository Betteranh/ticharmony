package be.stage.ticharmony.controller;

import be.stage.ticharmony.model.Notification;
import be.stage.ticharmony.model.User;
import be.stage.ticharmony.model.UserProfile;
import be.stage.ticharmony.model.UserRole;
import be.stage.ticharmony.repository.UserRepository;
import be.stage.ticharmony.service.NotificationService;
import be.stage.ticharmony.service.UserProfileService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.Map;

@Controller
@RequestMapping("/notifications")
public class NotificationController {

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private UserProfileService userProfileService;

    @PostMapping("/mark-all-read")
    public String markAllRead(Principal principal, HttpServletRequest request, HttpSession session) {
        User user = userRepository.findByLogin(principal.getName());
        if (user != null) {
            if (user.getRole() == UserRole.CLIENT) {
                getActiveProfile(user, session).ifPresent(notificationService::markAllRead);
            } else {
                notificationService.markAllRead(user);
            }
        }
        String referer = request.getHeader("Referer");
        String redirect = (referer != null && referer.contains("/")) ? "/" + referer.replaceAll(".*//[^/]+/", "") : "/problems";
        if (!redirect.startsWith("/")) redirect = "/problems";
        return "redirect:" + redirect;
    }

    /**
     * Marque une notification individuelle comme lue puis redirige vers le ticket.
     */
    @GetMapping("/{id}/read")
    public String markOneRead(@PathVariable Long id,
                              @RequestParam(defaultValue = "/problems") String redirect,
                              Principal principal) {
        if (principal != null) {
            User user = userRepository.findByLogin(principal.getName());
            if (user != null) {
                notificationService.markOneRead(user, id);
            }
        }
        String safeRedirect = (redirect != null && redirect.startsWith("/")) ? redirect : "/problems";
        return "redirect:" + safeRedirect;
    }

    /**
     * Retourne le nombre de notifications non lues (polling badge live).
     */
    @GetMapping("/count")
    @ResponseBody
    public Map<String, Object> countUnread(Principal principal, HttpSession session) {
        if (principal == null) return Map.of("count", 0L, "hasUrgent", false);
        User user = userRepository.findByLogin(principal.getName());
        if (user == null) return Map.of("count", 0L, "hasUrgent", false);
        if (user.getRole() == UserRole.CLIENT) {
            long count = getActiveProfile(user, session)
                    .map(notificationService::countUnreadForProfile).orElse(0L);
            return Map.of("count", count, "hasUrgent", false);
        }
        long count = notificationService.countUnreadForUser(user);
        boolean hasUrgent = notificationService.hasUnreadUrgentForUser(user);
        return Map.of("count", count, "hasUrgent", hasUrgent);
    }

    /**
     * Retourne le fragment HTML du panel de notifications (pour rafraîchissement AJAX du drawer).
     */
    @GetMapping("/panel")
    public String getPanel(Model model, Principal principal, HttpSession session) {
        if (principal != null) {
            User user = userRepository.findByLogin(principal.getName());
            if (user != null) {
                List<Notification> notifications = user.getRole() == UserRole.CLIENT
                        ? getActiveProfile(user, session)
                                .map(notificationService::getUnreadForProfile)
                                .orElse(List.of())
                        : notificationService.getUnreadForUser(user);
                model.addAttribute("notifications", notifications);
            }
        }
        return "fragments/notifications :: notifications";
    }

    private java.util.Optional<UserProfile> getActiveProfile(User user, HttpSession session) {
        Long profileId = (Long) session.getAttribute(ProfileController.SESSION_PROFILE_KEY);
        if (profileId == null) return java.util.Optional.empty();
        return userProfileService.findById(profileId)
                .filter(p -> p.getUser().getId().equals(user.getId()));
    }
}