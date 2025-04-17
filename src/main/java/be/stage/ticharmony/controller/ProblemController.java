package be.stage.ticharmony.controller;

import be.stage.ticharmony.model.NotificationType;
import be.stage.ticharmony.model.Priority;
import be.stage.ticharmony.model.Problem;
import be.stage.ticharmony.model.Status;
import be.stage.ticharmony.model.User;
import be.stage.ticharmony.model.UserRole;
import be.stage.ticharmony.service.NotificationService;
import be.stage.ticharmony.service.ProblemService;
import be.stage.ticharmony.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

@Controller
@RequestMapping("/problems")
public class ProblemController {

    @Autowired
    private ProblemService service;

    @Autowired
    private UserService userService;

    @Autowired
    private NotificationService notificationService;

    /**
     * Affiche la liste des problèmes.
     */
    @GetMapping
    public String getAllProblems(Model model) {
        model.addAttribute("problems", service.getProblems());
        model.addAttribute("module", "problems");
        return "listProblems";
    }

    /**
     * Formulaire de création.
     */
    @GetMapping("/create")
    public String showCreateForm(Model model) {
        model.addAttribute("problem", new Problem());
        return "formCreateProblem";
    }

    /**
     * Formulaire de mise à jour.
     */
    @GetMapping("/update/{id}")
    public String showUpdateForm(@PathVariable Long id, Model model) {
        Problem problem = service.getProblem(id);
        if (problem == null) {
            return "redirect:/problems";
        }
        model.addAttribute("problem", problem);
        return "formUpdateProblem";
    }

    /**
     * Sauvegarde ou création d'un problème.
     * Notifie tous les ADMIN lors de la création.
     */
    @PostMapping("/save")
    public String saveProblem(@ModelAttribute("problem") Problem problem) {
        if (problem.getId() == null) {
            // Valeurs par défaut
            problem.setStatus(Status.OPEN);
            problem.setPriority(Priority.MEDIUM);

            // Associer l'utilisateur connecté
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            String username = auth.getName();
            User currentUser = userService.findByLogin(username);
            problem.setUser(currentUser);

            // Création
            service.createProblem(problem);

            // Notifier tous les ADMIN
            userService.getAllUsers().stream()
                    .filter(u -> u.getRole() == UserRole.ADMIN)
                    .forEach(admin ->
                            notificationService.notify(admin, problem, NotificationType.NEW_PROBLEM)
                    );
        } else {
            // Mise à jour
            service.updateProblem(problem);
        }
        return "redirect:/problems";
    }

    /**
     * Supprime un problème.
     */
    @GetMapping("/delete/{id}")
    public String deleteProblem(@PathVariable Long id) {
        service.deleteProblem(id);
        return "redirect:/problems";
    }

    /**
     * Détail d’un ticket + liste des techniciens pour l’admin.
     */
    @GetMapping("/{id}")
    public String showDetails(@PathVariable Long id, Model model) {
        Problem problem = service.getProblem(id);
        if (problem == null) {
            return "redirect:/problems";
        }
        model.addAttribute("problem", problem);
        model.addAttribute("module", "problems");
        // Fournir la liste des users avec rôle MEMBER pour l'assignation
        model.addAttribute("technicians", userService.getUsersByRole(UserRole.MEMBER));
        return "problemDetails";
    }

    /**
     * Assignation d’un technicien — accessible *seulement* aux ADMIN.
     * Notifie le technicien nouvellement assigné.
     */
    @PostMapping("/{id}/assignTechnician")
    @PreAuthorize("hasRole('ADMIN')")
    public String assignTechnician(@PathVariable Long id,
                                   @RequestParam Long technicianId) {
        Problem problem = service.getProblem(id);
        if (problem != null) {
            User newTech = userService.getUser(technicianId);
            problem.setTechnician(newTech);
            service.updateProblem(problem);

            // Notifier le technicien assigné
            notificationService.notify(
                    newTech,
                    problem,
                    NotificationType.ASSIGNED_TO_PROBLEM
            );
        }
        return "redirect:/problems/" + id;
    }
}
