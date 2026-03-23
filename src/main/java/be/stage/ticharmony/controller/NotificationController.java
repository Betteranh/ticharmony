package be.stage.ticharmony.controller;

import be.stage.ticharmony.model.User;
import be.stage.ticharmony.repository.UserRepository;
import be.stage.ticharmony.service.NotificationService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.Map;

@Controller
@RequestMapping("/notifications")
public class NotificationController {

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private UserRepository userRepository;

    @PostMapping("/mark-all-read")
    public String markAllRead(Principal principal, HttpServletRequest request) {
        User user = userRepository.findByLogin(principal.getName());
        if (user != null) {
            notificationService.markAllRead(user);
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
    public Map<String, Object> countUnread(Principal principal) {
        if (principal == null) return Map.of("count", 0L, "hasUrgent", false);
        User user = userRepository.findByLogin(principal.getName());
        long count = user != null ? notificationService.countUnreadForUser(user) : 0L;
        boolean hasUrgent = user != null && notificationService.hasUnreadUrgentForUser(user);
        return Map.of("count", count, "hasUrgent", hasUrgent);
    }

    /**
     * Retourne le fragment HTML du panel de notifications (pour rafraîchissement AJAX du drawer).
     */
    @GetMapping("/panel")
    public String getPanel(Model model, Principal principal) {
        if (principal != null) {
            User user = userRepository.findByLogin(principal.getName());
            if (user != null) {
                model.addAttribute("notifications", notificationService.getUnreadForUser(user));
            }
        }
        return "fragments/notifications :: notifications";
    }
}