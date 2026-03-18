package be.stage.ticharmony.controller;

import be.stage.ticharmony.model.User;
import be.stage.ticharmony.repository.UserRepository;
import be.stage.ticharmony.service.NotificationService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;

import java.security.Principal;

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
        return "redirect:" + (referer != null ? referer : "/problems");
    }
}