package be.stage.ticharmony.controller;

import be.stage.ticharmony.model.*;
import be.stage.ticharmony.service.CommentService;
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

import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import java.util.stream.StreamSupport;

@Controller
@RequestMapping("/problems")
public class ProblemController {

    @Autowired
    private ProblemService service;

    @Autowired
    private UserService userService;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private CommentService commentService;

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
        return "redirect:/problems";
    }

    @GetMapping("/{id}/resolve")
    @PreAuthorize("hasRole('MEMBER')")
    public String showResolveForm(@PathVariable Long id,
                                  Model model,
                                  Authentication auth) {
        Problem problem = service.getProblem(id);
        User current = userService.findByLogin(auth.getName());

        // Vérifie que c’est bien le technicien assigné et que le ticket est IN_PROGRESS
        if (problem == null
                || !current.equals(problem.getTechnician())
                || problem.getStatus() != Status.IN_PROGRESS) {
            return "redirect:/problems/" + id;
        }

        model.addAttribute("problem", problem);
        model.addAttribute("module", "problems");
        return "formResolveProblem"; // ton template
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
        return "redirect:/problems?status=CLOSED";
    }

    /**
     * Affiche la liste des problèmes.
     * - ADMIN      : voit tous.
     * - MEMBER     : ne voit que ceux qui lui sont assignés.
     * - CLIENT     : (optionnel) ne voit que ses propres tickets.
     */
    @GetMapping
    public String getAllProblems(
            @RequestParam(name = "status", required = false) Status statusFilter,
            Model model,
            Authentication authentication
    ) {
        User currentUser = userService.findByLogin(authentication.getName());

        // 1) on récupère d'abord le sous-ensemble selon le rôle
        Iterable<Problem> problems;
        if (currentUser.getRole() == UserRole.MEMBER) {
            problems = service.getProblemsByTechnician(currentUser);
        } else if (currentUser.getRole() == UserRole.CLIENT) {
            problems = service.getProblemsByUser(currentUser);
        } else {
            problems = service.getProblems();
        }

        // 2) on applique le filtre de statut **sur ce sous-ensemble**, ou on enlève les CLOSED par défaut
        List<Problem> filtered = StreamSupport.stream(problems.spliterator(), false)
                .filter(p -> {
                    if (statusFilter != null) {
                        return p.getStatus() == statusFilter;
                    } else {
                        return p.getStatus() != Status.CLOSED;
                    }
                })
                .collect(Collectors.toList());

        filtered.sort(Comparator.comparing(Problem::getCreatedAt).reversed());

        model.addAttribute("problems", filtered);
        model.addAttribute("allStatuses", Status.values());
        model.addAttribute("selectedStatus", statusFilter);
        model.addAttribute("module", "problems");
        return "listProblems";
    }

    private int priorityOrder(Priority p) {
        return switch (p) {
            case URGENT -> 0;
            case HIGH -> 1;
            case MEDIUM -> 2;
            case LOW -> 3;
        };
    }


    /**
     * Formulaire de création.
     */
    @GetMapping("/create")
    public String showCreateForm(Model model, Authentication authentication) {
        Problem problem = new Problem();

        // Récupère l'utilisateur connecté
        User currentUser = userService.findByLogin(authentication.getName());

        // Préremplit les infos s'il s'agit d'un ADMIN
        if (currentUser != null && currentUser.getRole() == UserRole.ADMIN) {
            TicketUserInfo info = new TicketUserInfo();
            info.setFirstName(currentUser.getFirstname());
            info.setLastName(currentUser.getLastname());
            info.setEmail(currentUser.getEmail());
            info.setPhone(currentUser.getTelephone());
            problem.setTicketUserInfo(info);
        }

        model.addAttribute("problem", problem);
        return "formCreateProblem"; // ton template
    }

    /**
     * Formulaire de mise à jour.
     */
    @GetMapping("/update/{id}")
    public String showUpdateForm(@PathVariable Long id, Model model, Authentication authentication) {
        Problem problem = service.getProblem(id);
        if (problem == null) {
            return "redirect:/problems";
        }
        model.addAttribute("problem", problem);

        // Ajoute les techniciens pour l'admin
        User current = userService.findByLogin(authentication.getName());
        if (current.getRole() == UserRole.ADMIN) {
            List<User> technicians = userService.getUsersByRole(UserRole.MEMBER);
            model.addAttribute("technicians", technicians);
        }
        return "formUpdateProblem";
    }

    /**
     * Sauvegarde ou création d'un problème.
     * Notifie tous les ADMIN lors de la création.
     */
    @PostMapping("/save")
    public String saveProblem(
            @ModelAttribute("problem") Problem formProblem,
            @RequestParam(value = "technicianId", required = false) Long technicianId
    ) {
        if (formProblem.getId() == null) {
            // --- création ---
            formProblem.setStatus(Status.OPEN);
            formProblem.setPriority(Priority.MEDIUM);
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            User currentUser = userService.findByLogin(auth.getName());
            formProblem.setUser(currentUser);

            // Si un technicien a été sélectionné à la création (optionnel)
            if (technicianId != null && technicianId != 0) {
                User tech = userService.getUser(technicianId);
                formProblem.setTechnician(tech);
            }

            service.createProblem(formProblem);

            // notification NEW_PROBLEM pour tous les admins
            userService.getAllUsers().stream()
                    .filter(u -> u.getRole() == UserRole.ADMIN)
                    .forEach(admin ->
                            notificationService.notify(admin, formProblem, NotificationType.NEW_PROBLEM)
                    );

            // Notifier le technicien s'il y en a un
            if (formProblem.getTechnician() != null) {
                notificationService.notify(formProblem.getTechnician(), formProblem, NotificationType.ASSIGNED_TO_PROBLEM);
            }

        } else {
            // --- mise à jour ---
            Problem existing = service.getProblem(formProblem.getId());
            if (existing == null) {
                return "redirect:/problems";
            }
            // Champs modifiables
            existing.setTitle(formProblem.getTitle());
            existing.setDescription(formProblem.getDescription());
            existing.setCategory(formProblem.getCategory());
            existing.setPriority(formProblem.getPriority());
            existing.setStatus(formProblem.getStatus());

            // ----- GESTION DU CHANGEMENT DE TECHNICIEN -----
            User oldTech = existing.getTechnician();
            User newTech = null;
            boolean techChanged = false;

            if (technicianId != null && technicianId != 0) {
                newTech = userService.getUser(technicianId);
            }

            // Cas changement de technicien
            if ((oldTech == null && newTech != null)
                    || (oldTech != null && (newTech == null || !oldTech.getId().equals(newTech.getId())))) {

                techChanged = true;

                // 1. Marquer l'ancienne notif comme lue
                if (oldTech != null) {
                    notificationService.markAssignmentNotificationsRead(oldTech, existing);
                }
                // 2. Notifier le nouveau technicien
                if (newTech != null) {
                    notificationService.notify(newTech, existing, NotificationType.ASSIGNED_TO_PROBLEM);
                }
                // 3. Changer le technicien assigné
                existing.setTechnician(newTech);

            } else if (technicianId != null && technicianId == 0) {
                // Désassigner le technicien si "Aucun"
                if (oldTech != null) {
                    notificationService.markAssignmentNotificationsRead(oldTech, existing);
                }
                existing.setTechnician(null);
            }

            // Si le technicien a été changé, remettre le statut à OPEN
            if (techChanged) {
                existing.setStatus(Status.OPEN);
            }

            // Mise à jour du ticket
            service.updateProblem(existing);
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

        // Pour commentaires :
        List<Comment> comments = commentService.getCommentsByProblem(problem);
        model.addAttribute("comments", comments);

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
