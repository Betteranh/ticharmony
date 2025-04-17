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
     * Prise en charge → IN_PROGRESS puis affiche le formulaire
     */
    @GetMapping("/{id}/take")
    @PreAuthorize("hasRole('MEMBER')")
    public String takeInCharge(@PathVariable Long id,
                               Model model,
                               Authentication auth) {
        Problem problem = service.getProblem(id);
        User current = userService.findByLogin(auth.getName());
        // on autorise seulement le technicien assigné, et si OPEN ou déjà IN_PROGRESS
        if (problem == null
                || !current.equals(problem.getTechnician())
                || (problem.getStatus() != Status.OPEN
                && problem.getStatus() != Status.IN_PROGRESS)) {
            return "redirect:/problems/" + id;
        }

        // si on arrive la première fois, on passe de OPEN → IN_PROGRESS
        if (problem.getStatus() == Status.OPEN) {
            problem.setStatus(Status.IN_PROGRESS);
            service.updateProblem(problem);
        }

        model.addAttribute("problem", problem);
        model.addAttribute("module", "problems");
        return "formResolveProblem";
    }

    /**
     * Soumet la résolution → RESOLVED + notifie les ADMIN
     */
    @PostMapping("/{id}/resolve")
    @PreAuthorize("hasRole('MEMBER')")
    public String submitResolution(@PathVariable Long id,
                                   @RequestParam String resolution,
                                   Authentication auth) {
        Problem problem = service.getProblem(id);
        User current = userService.findByLogin(auth.getName());

        if (problem.getStatus() == Status.IN_PROGRESS
                && current.equals(problem.getTechnician())) {
            problem.setResolution(resolution);
            problem.setStatus(Status.RESOLVED);
            service.updateProblem(problem);

            // 1) on notifie tous les ADMIN
            userService.getUsersByRole(UserRole.ADMIN).forEach(admin ->
                    notificationService.notify(admin,
                            problem,
                            NotificationType.PROBLEM_CLOSED)
            );

            // 2) on marque la notif "ASSIGNED_TO_PROBLEM" comme lue
            notificationService.markAssignmentNotificationsRead(current, problem);
        }
        return "redirect:/problems/" + id;
    }

    /**
     * Validation finale par l’ADMIN → CLOSED
     */
    @PostMapping("/{id}/close")
    @PreAuthorize("hasRole('ADMIN')")
    public String closeProblem(@PathVariable Long id, Authentication auth) {
        Problem problem = service.getProblem(id);
        if (problem != null && problem.getStatus() == Status.RESOLVED) {
            // passe en CLOSED
            problem.setStatus(Status.CLOSED);
            service.updateProblem(problem);

            // marque la notification RESOLVED pour cet admin comme lue
            User admin = userService.findByLogin(auth.getName());
            notificationService.markReadForProblem(
                    admin,
                    problem,
                    NotificationType.PROBLEM_CLOSED
            );
        }
        return "redirect:/problems/" + id;
    }

    /**
     * Affiche la liste des problèmes.
     */
    /**
     * Affiche la liste des problèmes.
     * - ADMIN      : voit tous.
     * - MEMBER     : ne voit que ceux qui lui sont assignés.
     * - CLIENT     : (optionnel) ne voit que ses propres tickets.
     */
    @GetMapping
    public String getAllProblems(Model model, Authentication authentication) {
        User currentUser = userService.findByLogin(authentication.getName());
        Iterable<Problem> problems;

        if (currentUser.getRole() == UserRole.MEMBER) {
            // Technicien : seulement ses tickets
            problems = service.getProblemsByTechnician(currentUser);

        } else if (currentUser.getRole() == UserRole.CLIENT) {
            // (Optionnel) Client : seulement ses tickets
            problems = service.getProblemsByUser(currentUser);

        } else {
            // ADMIN : tous les tickets
            problems = service.getProblems();
        }

        model.addAttribute("problems", problems);
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
     * avec bouton Prise en charge / Valider.
     */
    @GetMapping("/{id}")
    public String showDetails(@PathVariable Long id,
                              Model model,
                              Authentication auth) {
        Problem problem = service.getProblem(id);
        if (problem == null) return "redirect:/problems";

        User current = userService.findByLogin(auth.getName());
        // si c’est le tech sur **son** ticket, on marque son assignation lue
        if (current.getRole() == UserRole.MEMBER
                && problem.getTechnician() != null
                && problem.getTechnician().equals(current)) {
            notificationService.markAssignmentNotificationsRead(current, problem);
        }

        model.addAttribute("problem", problem);
        model.addAttribute("currentUser", current);
        model.addAttribute("module", "problems");
        if (current.getRole() == UserRole.ADMIN) {
            model.addAttribute("technicians", userService.getUsersByRole(UserRole.MEMBER));
        }
        return "problemDetails";
    }

    /**
     * Assignation d’un technicien — accessible *seulement* aux ADMIN.
     * Notifie le technicien nouvellement assigné.
     */
    @PostMapping("/{id}/assignTechnician")
    @PreAuthorize("hasRole('ADMIN')")
    public String assignTechnician(@PathVariable Long id,
                                   @RequestParam Long technicianId,
                                   Authentication auth) {
        Problem problem = service.getProblem(id);
        if (problem != null) {
            User admin = userService.findByLogin(auth.getName());

            // 1) on marque la notification "nouveau ticket" comme lue pour cet admin
            notificationService.markReadForProblem(
                    admin,
                    problem,
                    NotificationType.NEW_PROBLEM
            );

            // 2) on assigne le nouveau technicien
            User newTech = userService.getUser(technicianId);
            problem.setTechnician(newTech);
            service.updateProblem(problem);

            // 3) on notifie le technicien
            notificationService.notify(
                    newTech,
                    problem,
                    NotificationType.ASSIGNED_TO_PROBLEM
            );
        }
        return "redirect:/problems/" + id;
    }
}
