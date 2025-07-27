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

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
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
        if (problem != null && problem.getStatus() != Status.CLOSED) { // On peut fermer si pas déjà fermé
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

    private int extractYear(LocalDateTime date) {
        return date.getYear();
    }

    private int extractMonth(LocalDateTime date) {
        return date.getMonthValue();
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
            @RequestParam(name = "priority", required = false) Priority priorityFilter,
            @RequestParam(name = "year", required = false) Integer yearFilter,
            @RequestParam(name = "month", required = false) Integer monthFilter,
            @RequestParam(name = "search", required = false) String search,
            @RequestParam(name = "page", defaultValue = "1") int page,
            @RequestParam(name = "size", defaultValue = "8") int size,
            Model model,
            Authentication authentication
    ) {
        User currentUser = userService.findByLogin(authentication.getName());

        // 1. Récupérer tous les tickets selon le rôle
        Iterable<Problem> allProblems;
        if (currentUser.getRole() == UserRole.CLIENT) {
            allProblems = service.getProblemsByUser(currentUser);
        } else {
            // ADMIN et MEMBER voient tous les tickets
            allProblems = service.getProblems();
        }

        // 2. Années/mois disponibles (pour les filtres dropdown)
        List<Integer> allYears = StreamSupport.stream(allProblems.spliterator(), false)
                .map(p -> p.getCreatedAt().getYear())
                .distinct()
                .sorted(Comparator.reverseOrder())
                .collect(Collectors.toList());

        List<Integer> allMonths;
        if (yearFilter != null) {
            allMonths = StreamSupport.stream(allProblems.spliterator(), false)
                    .filter(p -> p.getCreatedAt().getYear() == yearFilter)
                    .map(p -> p.getCreatedAt().getMonthValue())
                    .distinct()
                    .sorted()
                    .collect(Collectors.toList());
        } else {
            allMonths = StreamSupport.stream(allProblems.spliterator(), false)
                    .map(p -> p.getCreatedAt().getMonthValue())
                    .distinct()
                    .sorted()
                    .collect(Collectors.toList());
        }

        // 3. Appliquer les filtres avancés (statut, priorité, année, mois, search)
        List<Problem> filtered = StreamSupport.stream(allProblems.spliterator(), false)
                .filter(p -> {
                    if (statusFilter == null) {
                        return p.getStatus() != Status.CLOSED;
                    } else {
                        return p.getStatus() == statusFilter;
                    }
                })
                .filter(p -> priorityFilter == null || p.getPriority() == priorityFilter)
                .filter(p -> yearFilter == null || p.getCreatedAt().getYear() == yearFilter)
                .filter(p -> monthFilter == null || p.getCreatedAt().getMonthValue() == monthFilter)
                .filter(p -> {
                    if (search == null || search.trim().isEmpty()) return true;
                    String lc = search.toLowerCase();
                    return (p.getTitle() != null && p.getTitle().toLowerCase().contains(lc))
                            || (p.getCategory() != null && p.getCategory().toLowerCase().contains(lc))
                            || (p.getTicketUserInfo() != null && (
                            (p.getTicketUserInfo().getFirstName() + " " + p.getTicketUserInfo().getLastName()).toLowerCase().contains(lc)
                                    || (p.getTicketUserInfo().getEmail() != null && p.getTicketUserInfo().getEmail().toLowerCase().contains(lc))
                    ))
                            || (p.getUser() != null && p.getUser().getNomEntreprise() != null && p.getUser().getNomEntreprise().toLowerCase().contains(lc));
                })
                .sorted(Comparator.comparing(Problem::getCreatedAt).reversed())
                .collect(Collectors.toList());

        // 4. Pagination (page = 1-based pour l'utilisateur)
        int totalProblems = filtered.size();
        int totalPages = (int) Math.ceil((double) totalProblems / size);
        int currentPage = Math.max(1, Math.min(page, totalPages == 0 ? 1 : totalPages));
        int start = (currentPage - 1) * size;
        int end = Math.min(start + size, totalProblems);
        List<Problem> pageList = filtered.subList(start, end);

        // 5. Affichage "1-10 sur XX"
        model.addAttribute("pageStart", totalProblems == 0 ? 0 : start + 1);
        model.addAttribute("pageEnd", end);
        model.addAttribute("currentPage", currentPage);
        model.addAttribute("totalPages", totalPages);
        model.addAttribute("totalProblems", totalProblems);

        // 6. Pour le diagramme technicien : via ProblemService + ton DTO
        List<TechnicianStatsDTO> technicianStats = service.getTechnicianStats(filtered, currentUser);

        // 7. Attributs pour la vue
        model.addAttribute("problems", pageList);
        model.addAttribute("allStatuses", Status.values());
        model.addAttribute("selectedStatus", statusFilter);
        model.addAttribute("allPriorities", Priority.values());
        model.addAttribute("selectedPriority", priorityFilter);
        model.addAttribute("allYears", allYears);
        model.addAttribute("selectedYear", yearFilter);
        model.addAttribute("allMonths", allMonths);
        model.addAttribute("selectedMonth", monthFilter);
        model.addAttribute("technicianStats", technicianStats);
        model.addAttribute("search", search);
        model.addAttribute("currentUser", currentUser);
        model.addAttribute("module", "problems");

        model.addAttribute("nextPage", Math.min(currentPage + 1, totalPages)); // protection débordement
        model.addAttribute("prevPage", Math.max(currentPage - 1, 1)); // protection


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
        return "redirect:/problems/" + formProblem.getId();
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
            List<User> technicians = userService.getUsersByRole(UserRole.MEMBER);

            // Map<Long, Long> techId → nombre de tickets (hors CLOSED)
            java.util.Map<Long, Long> techTicketCounts = technicians.stream().collect(Collectors.toMap(
                    User::getId,
                    tech -> StreamSupport.stream(service.getProblemsByTechnician(tech).spliterator(), false)
                            .filter(p -> p.getStatus() != Status.CLOSED)
                            .count()
            ));

            model.addAttribute("technicians", technicians);
            model.addAttribute("techTicketCounts", techTicketCounts);
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
                                   @RequestParam Priority priority,
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
            // 2,5) applique la priorité choisie
            problem.setPriority(priority);

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
