package be.stage.ticharmony.controller;

import be.stage.ticharmony.model.Comment;
import be.stage.ticharmony.model.Problem;
import be.stage.ticharmony.model.User;
import be.stage.ticharmony.repository.ProblemRepository;
import be.stage.ticharmony.repository.UserRepository;
import be.stage.ticharmony.service.CommentService;
import org.springframework.ui.Model;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;

import java.security.Principal;
import java.util.List;

@Controller
public class CommentController {
    @Autowired
    private ProblemRepository problemRepository;
    @Autowired
    private CommentService commentService;
    @Autowired
    private UserRepository userRepository; // si besoin

    @PostMapping("/problems/{problemId}/comments")
    public String addComment(@PathVariable Long problemId,
                             @RequestParam String content,
                             Principal principal) {
        Problem problem = problemRepository.findById(problemId).orElseThrow();
        User author = userRepository.findByLogin(principal.getName());
        if (author == null) {
            throw new UsernameNotFoundException("Utilisateur non trouvé");
        }

        commentService.addComment(problem, author, content);

        return "redirect:/problems/" + problemId;
    }
}
