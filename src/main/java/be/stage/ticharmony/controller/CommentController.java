package be.stage.ticharmony.controller;

import be.stage.ticharmony.model.*;
import be.stage.ticharmony.repository.ProblemRepository;
import be.stage.ticharmony.repository.UserRepository;
import be.stage.ticharmony.service.CommentService;
import be.stage.ticharmony.service.MailService;
import be.stage.ticharmony.service.NotificationService;
import be.stage.ticharmony.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;

import java.security.Principal;

@Controller
public class CommentController {
    @Autowired
    private ProblemRepository problemRepository;
    @Autowired
    private CommentService commentService;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private UserService userService;
    @Autowired
    private NotificationService notificationService;
    @Autowired
    private MailService mailService;

    @PostMapping("/problems/{problemId}/comments")
    public String addComment(@PathVariable Long problemId,
                             @RequestParam String content,
                             Principal principal) {
        if (content == null || content.isBlank() || content.length() > 5000) {
            return "redirect:/problems/" + problemId;
        }
        Problem problem = problemRepository.findById(problemId).orElseThrow();
        User author = userRepository.findByLogin(principal.getName());
        if (author == null) {
            throw new UsernameNotFoundException("Identifiants invalides");
        }

        Comment comment = commentService.addComment(problem, author, content.trim());

        // Notifications NEW_COMMENT : uniquement le technicien assigné et le client du ticket
        User technician = problem.getTechnician();
        User client = problem.getUser();

        if (technician != null && !technician.getId().equals(author.getId())) {
            notificationService.notifyOnce(technician, problem, NotificationType.NEW_COMMENT);
        }
        if (client != null && client.getRole() == UserRole.CLIENT
                && !client.getId().equals(author.getId())) {
            notificationService.notifyOnce(client, problem.getUserProfile(), problem, NotificationType.NEW_COMMENT);
            mailService.sendNewCommentEmail(problem, comment);
        }

        return "redirect:/problems/" + problemId;
    }
}
