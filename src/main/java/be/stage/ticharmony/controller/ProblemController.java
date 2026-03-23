package be.stage.ticharmony.controller;

import be.stage.ticharmony.model.*;
import be.stage.ticharmony.service.CommentService;
import be.stage.ticharmony.service.NotificationService;
import be.stage.ticharmony.service.ProblemService;
import be.stage.ticharmony.service.UserProfileService;
import be.stage.ticharmony.service.UserService;
import jakarta.servlet.http.HttpSession;
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

    @Autowired
    private UserProfileService userProfileService;

    /**
     * Prise en charge → IN_PROGRESS puis affiche le formulaire
     */
    @GetMapping("/{id}/take")
    @PreAuthorize("hasRole('MEMBER')")
    public String takeInCharge(@PathVariable Long id, Authentication auth) {
        Problem problem = service.getProblem(id);
        if (problem == null) return "redirect:/problems";
        User current = userService.findByLogin(auth.getName());

        // Cas 1 : ticket non assigné → self-assignation
        if (problem.getTechnician() == null && problem.getStatus() == Status.OPEN) {
            problem.setTechnician(current);
            problem.setStatus(Status.IN_PROGRESS);
            service.updateProblem(problem);
            // Notifier les admins
            userService.getUsersByRole(UserRole.ADMIN).forEach(admin ->
                    notificationService.notify(admin, problem, NotificationType.ASSIGNED_TO_PROBLEM));
            // Notifier le client
            if (problem.getUser() != null && problem.getUser().getRole() == UserRole.CLIENT) {
                notificationService.notify(problem.getUser(), problem, NotificationType.TICKET_IN_PROGRESS);
            }
            return "redirect:/problems/" + id;
        }

        // Cas 2 : déjà assigné au technicien et encore OPEN (fallback)
        if (current.equals(problem.getTechnician()) && problem.getStatus() == Status.OPEN) {
            problem.setStatus(Status.IN_PROGRESS);
            service.updateProblem(problem);
            if (problem.getUser() != null && problem.getUser().getRole() == UserRole.CLIENT) {
                notificationService.notify(problem.getUser(), problem, NotificationType.TICKET_IN_PROGRESS);
            }
        }

        return "redirect:/problems/" + id;
    }

    /**
     * Soumet la résolution → RESOLVED + notifie les ADMIN
     */
    @PostMapping("/{id}/resolve")
    @PreAuthorize("hasAnyRole('MEMBER', 'ADMIN')")
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
        return "redirect:/problems?status=IN_PROGRESS";
    }

    @GetMapping("/{id}/resolve")
    @PreAuthorize("hasAnyRole('MEMBER', 'ADMIN')")
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
     * Validation finale par l'ADMIN → CLOSED
     */
    @PostMapping("/{id}/close")
    @PreAuthorize("hasRole('ADMIN')")
    public String closeProblem(@PathVariable Long id, Authentication auth) {
        Problem problem = service.getProblem(id);
        if (problem != null && problem.getStatus() != Status.CLOSED) {
            problem.setStatus(Status.CLOSED);
            service.updateProblem(problem);

            // Marquer les notifications admin comme lues (plus utiles une fois fermé)
            notificationService.deleteNotificationsForProblem(problem, NotificationType.NEW_PROBLEM);
            notificationService.deleteNotificationsForProblem(problem, NotificationType.PROBLEM_CLOSED);

            // Notifier le client que son dossier est clôturé
            if (problem.getUser() != null && problem.getUser().getRole() == UserRole.CLIENT) {
                notificationService.notify(problem.getUser(), problem, NotificationType.TICKET_CLOSED);
            }
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
            @RequestParam(name = "unassigned", required = false) Boolean unassigned,
            @RequestParam(name = "technicianId", required = false) Long technicianId,
            @RequestParam(name = "page", defaultValue = "1") int page,
            @RequestParam(name = "size", defaultValue = "8") int size,
            Model model,
            Authentication authentication,
            HttpSession session
    ) {
        User currentUser = userService.findByLogin(authentication.getName());

        // 1. Récupérer tous les tickets selon le rôle
        Iterable<Problem> allProblems;
        if (currentUser.getRole() == UserRole.CLIENT) {
            Long profileId = (Long) session.getAttribute(ProfileController.SESSION_PROFILE_KEY);
            if (profileId != null) {
                UserProfile activeProfile = userProfileService.findById(profileId).orElse(null);
                if (activeProfile != null && activeProfile.getUser().getId().equals(currentUser.getId())) {
                    allProblems = service.getProblemsByUserProfile(activeProfile);
                    model.addAttribute("activeProfile", activeProfile);
                } else {
                    allProblems = service.getProblemsByUser(currentUser);
                }
            } else {
                allProblems = service.getProblemsByUser(currentUser);
            }
        } else if (currentUser.getRole() == UserRole.MEMBER) {
            // MEMBER voit ses tickets assignés + les tickets non assignés
            allProblems = StreamSupport.stream(service.getProblems().spliterator(), false)
                    .filter(p -> p.getTechnician() == null
                            || p.getTechnician().getId().equals(currentUser.getId()))
                    .collect(Collectors.toList());
        } else {
            // ADMIN voit tous les tickets
            allProblems = service.getProblems();
        }

        // 2b. Stats globales (admin/membre uniquement)
        List<Problem> allList = StreamSupport.stream(allProblems.spliterator(), false).collect(Collectors.toList());
        if (currentUser.getRole() != UserRole.CLIENT) {
            long countActive     = allList.stream().filter(p -> p.getStatus() != Status.CLOSED).count();
            long countInProgress = allList.stream().filter(p -> p.getStatus() == Status.IN_PROGRESS).count();
            long countResolved   = allList.stream().filter(p -> p.getStatus() == Status.RESOLVED).count();
            long countUnassigned = allList.stream().filter(p -> p.getTechnician() == null && p.getStatus() != Status.CLOSED).count();
            long countUrgent     = allList.stream().filter(p -> p.getPriority() == Priority.URGENT && p.getStatus() != Status.CLOSED).count();
            model.addAttribute("countActive",     countActive);
            model.addAttribute("countInProgress", countInProgress);
            model.addAttribute("countResolved",   countResolved);
            model.addAttribute("countUnassigned", countUnassigned);
            model.addAttribute("countUrgent",     countUrgent);

            model.addAttribute("technicianId",  technicianId);
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
                .filter(p -> unassigned == null || !unassigned || p.getTechnician() == null)
                .filter(p -> technicianId == null || (p.getTechnician() != null && p.getTechnician().getId().equals(technicianId)))
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

        // Stats techniciens adaptées aux filtres actifs
        if (currentUser.getRole() != UserRole.CLIENT) {
            // Si un technicien est sélectionné dans la sidebar, recalculer sans ce filtre
            // pour que tous les techniciens restent visibles avec leurs compteurs relatifs
            List<Problem> techStatsSource = filtered;
            if (technicianId != null) {
                techStatsSource = allList.stream()
                        .filter(p -> statusFilter == null ? p.getStatus() != Status.CLOSED : p.getStatus() == statusFilter)
                        .filter(p -> priorityFilter == null || p.getPriority() == priorityFilter)
                        .filter(p -> yearFilter == null || p.getCreatedAt().getYear() == yearFilter)
                        .filter(p -> monthFilter == null || p.getCreatedAt().getMonthValue() == monthFilter)
                        .collect(Collectors.toList());
            }
            List<TechnicianStatsDTO> allTechStats = service.getTechnicianStats(techStatsSource, currentUser);
            long maxTechCount = allTechStats.stream().mapToLong(TechnicianStatsDTO::getTicketCount).max().orElse(1);
            model.addAttribute("allTechStats", allTechStats);
            model.addAttribute("maxTechCount", maxTechCount);
        }

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
        model.addAttribute("search", search);
        model.addAttribute("unassigned", unassigned);
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
     * Page de confirmation après création d'un ticket.
     */
    @GetMapping("/{id}/confirmation")
    public String showConfirmation(@PathVariable Long id, Model model, Authentication auth) {
        Problem problem = service.getProblem(id);
        if (problem == null) return "redirect:/problems";
        User current = userService.findByLogin(auth.getName());
        // Seul le créateur peut voir la confirmation
        if (problem.getUser() == null || !problem.getUser().getId().equals(current.getId())) {
            return "redirect:/problems/" + id;
        }
        model.addAttribute("problem", problem);
        model.addAttribute("currentUser", current);
        return "problemConfirmation";
    }

    /**
     * Formulaire de création.
     */
    @GetMapping("/create")
    public String showCreateForm(Model model, Authentication authentication, HttpSession session) {
        Problem problem = new Problem();
        User currentUser = userService.findByLogin(authentication.getName());

        if (currentUser != null && currentUser.getRole() == UserRole.ADMIN) {
            // ADMIN : pré-remplir avec ses propres infos
            TicketUserInfo info = new TicketUserInfo();
            info.setFirstName(currentUser.getFirstname());
            info.setLastName(currentUser.getLastname());
            info.setEmail(currentUser.getEmail());
            info.setPhone(currentUser.getTelephone());
            problem.setTicketUserInfo(info);

        } else if (currentUser != null && currentUser.getRole() == UserRole.CLIENT) {
            // CLIENT : pré-remplir depuis le profil actif
            Long profileId = (Long) session.getAttribute(ProfileController.SESSION_PROFILE_KEY);
            if (profileId != null) {
                userProfileService.findById(profileId).ifPresent(profile -> {
                    TicketUserInfo info = new TicketUserInfo();
                    info.setFirstName(profile.getDisplayName());
                    info.setLastName("");
                    info.setEmail(profile.getEmail() != null ? profile.getEmail() : "");
                    info.setPhone(profile.getPhone() != null ? profile.getPhone() : "");
                    problem.setTicketUserInfo(info);
                });
            }
        }

        model.addAttribute("problem", problem);
        return "formCreateProblem";
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
            @RequestParam(value = "technicianId", required = false) Long technicianId,
            HttpSession session
    ) {
        if (formProblem.getId() == null) {
            // --- création ---
            formProblem.setStatus(Status.OPEN);
            formProblem.setPriority(Priority.MEDIUM);
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            User currentUser = userService.findByLogin(auth.getName());
            formProblem.setUser(currentUser);

            // Rattacher le profil actif si CLIENT
            if (currentUser.getRole() == UserRole.CLIENT) {
                Long profileId = (Long) session.getAttribute(ProfileController.SESSION_PROFILE_KEY);
                if (profileId != null) {
                    userProfileService.findById(profileId).ifPresent(formProblem::setUserProfile);
                }
            }

            // Si un technicien a été sélectionné à la création (optionnel)
            if (technicianId != null && technicianId != 0) {
                User tech = userService.getUser(technicianId);
                formProblem.setTechnician(tech);
                formProblem.setStatus(Status.IN_PROGRESS);
            }

            service.createProblem(formProblem);
            long newId = formProblem.getId(); // on capture l'id avant la suite

            // Persister email/téléphone sur le profil CLIENT pour pré-remplissage futur
            if (currentUser.getRole() == UserRole.CLIENT) {
                Long profileId = (Long) session.getAttribute(ProfileController.SESSION_PROFILE_KEY);
                if (profileId != null && formProblem.getTicketUserInfo() != null) {
                    userProfileService.findById(profileId).ifPresent(profile -> {
                        String email = formProblem.getTicketUserInfo().getEmail();
                        String phone = formProblem.getTicketUserInfo().getPhone();
                        if (email != null && !email.isBlank()) profile.setEmail(email);
                        if (phone != null && !phone.isBlank()) profile.setPhone(phone);
                        userProfileService.save(profile);
                    });
                }
            }

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

            // Rediriger vers la page de confirmation pour les nouveaux tickets
            return "redirect:/problems/" + newId + "/confirmation";

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

            // Si le technicien a été changé, passer en IN_PROGRESS directement
            if (techChanged) {
                existing.setStatus(Status.IN_PROGRESS);
            }

            // Mise à jour du ticket
            service.updateProblem(existing);
        }
        return "redirect:/problems/" + formProblem.getId();
    }


    /**
     * Confirmation client : le problème est bien résolu → CLOSED directement.
     */
    @PostMapping("/{id}/confirm")
    @PreAuthorize("hasRole('CLIENT')")
    public String confirmResolution(@PathVariable Long id, Authentication auth) {
        Problem problem = service.getProblem(id);
        User current = userService.findByLogin(auth.getName());
        if (problem != null
                && problem.getStatus() == Status.RESOLVED
                && problem.getUser() != null
                && problem.getUser().getId().equals(current.getId())) {

            problem.setStatus(Status.CLOSED);
            service.updateProblem(problem);

            notificationService.deleteNotificationsForProblem(problem, NotificationType.NEW_PROBLEM);
            notificationService.deleteNotificationsForProblem(problem, NotificationType.PROBLEM_CLOSED);

            // Notifier les admins que le client a confirmé et que le ticket est clos
            userService.getUsersByRole(UserRole.ADMIN).forEach(admin ->
                    notificationService.notify(admin, problem, NotificationType.TICKET_CLOSED)
            );
        }
        return "redirect:/problems/" + id;
    }

    /**
     * Réouverture client : le problème n'est pas résolu → retour en IN_PROGRESS.
     */
    @PostMapping("/{id}/reopen")
    @PreAuthorize("hasRole('CLIENT')")
    public String reopenProblem(@PathVariable Long id, Authentication auth) {
        Problem problem = service.getProblem(id);
        User current = userService.findByLogin(auth.getName());
        if (problem != null
                && problem.getStatus() == Status.RESOLVED
                && problem.getUser() != null
                && problem.getUser().getId().equals(current.getId())) {

            problem.setStatus(Status.IN_PROGRESS);
            problem.setResolution(null);
            service.updateProblem(problem);

            // Notifier le technicien
            if (problem.getTechnician() != null) {
                notificationService.notify(problem.getTechnician(), problem, NotificationType.TICKET_REOPENED);
            }
            // Notifier les admins
            userService.getUsersByRole(UserRole.ADMIN).forEach(admin ->
                    notificationService.notify(admin, problem, NotificationType.TICKET_REOPENED)
            );
        }
        return "redirect:/problems/" + id;
    }

    /**
     * Supprime un problème.
     */
    @PostMapping("/delete/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public String deleteProblem(@PathVariable Long id) {
        service.deleteProblem(id);
        return "redirect:/problems";
    }

    /**
     * Retourne le statut actuel d’un ticket (polling JSON pour le client).
     */
    @GetMapping("/{id}/status")
    @ResponseBody
    public Map<String, String> getTicketStatus(@PathVariable Long id, Authentication auth) {
        Problem problem = service.getProblem(id);
        if (problem == null) return Map.of("status", "NOT_FOUND");
        return Map.of("status", problem.getStatus().name());
    }

    /**
     * Retourne les commentaires d’un ticket après un ID donné (polling JSON).
     */
    @GetMapping("/{id}/comments")
    @ResponseBody
    public List<Map<String, Object>> getCommentsJson(@PathVariable Long id,
                                                     @RequestParam(defaultValue = "0") Long after,
                                                     Authentication auth) {
        Problem problem = service.getProblem(id);
        if (problem == null) return List.of();
        User current = userService.findByLogin(auth.getName());
        List<Comment> comments = commentService.getCommentsByProblemAfter(problem, after);
        return comments.stream().map(c -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", c.getId());
            m.put("content", c.getContent());
            String fn = c.getAuthor().getFirstname() != null ? c.getAuthor().getFirstname() : "";
            String ln = c.getAuthor().getLastname() != null ? c.getAuthor().getLastname() : "";
            m.put("authorName", fn + " " + ln);
            m.put("authorRole", c.getAuthor().getRole().name());
            m.put("initials", fn.isEmpty() ? "?" : String.valueOf(fn.charAt(0)).toUpperCase());
            m.put("isMe", c.getAuthor().getId().equals(current.getId()));
            m.put("createdAt", c.getCreatedAt().format(java.time.format.DateTimeFormatter.ofPattern("dd/MM HH:mm")));
            return m;
        }).collect(Collectors.toList());
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

        // Marquer toutes les notifications de cet utilisateur pour ce ticket comme lues
        notificationService.markAllReadForProblem(current, problem);

        model.addAttribute("problem", problem);
        model.addAttribute("currentUser", current);
        model.addAttribute("module", "problems");

        if (current.getRole() == UserRole.ADMIN) {
            List<User> technicians = new java.util.ArrayList<>(userService.getUsersByRole(UserRole.MEMBER));
            technicians.add(current); // l'admin peut s'assigner lui-même

            // Map<Long, Long> techId → nombre de tickets (hors CLOSED)
            java.util.Map<Long, Long> techTicketCounts = technicians.stream().collect(Collectors.toMap(
                    User::getId,
                    tech -> StreamSupport.stream(service.getProblemsByTechnician(tech).spliterator(), false)
                            .filter(p -> p.getStatus() != Status.CLOSED)
                            .count()
            ));

            model.addAttribute("technicians", technicians);
            model.addAttribute("techTicketCounts", techTicketCounts);
            model.addAttribute("adminId", current.getId());
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
            User oldTech = problem.getTechnician();

            // 1) supprimer les notifications "nouveau ticket"
            notificationService.deleteNotificationsForProblem(problem, NotificationType.NEW_PROBLEM);

            // 2) notifier l'ancien technicien qu'il est réassigné (s'il existe et change)
            User newTech = userService.getUser(technicianId);
            if (newTech == null || (newTech.getRole() != UserRole.MEMBER && newTech.getRole() != UserRole.ADMIN)) {
                return "redirect:/problems/" + id;
            }
            if (oldTech != null && !oldTech.getId().equals(newTech.getId())) {
                notificationService.notify(oldTech, problem, NotificationType.TICKET_REASSIGNED);
                notificationService.markAssignmentNotificationsRead(oldTech, problem);
            }

            // 3) assigner le nouveau technicien + priorité
            problem.setTechnician(newTech);
            problem.setPriority(priority);

            // 4) passer automatiquement en IN_PROGRESS dès l'assignation
            boolean wasOpen = problem.getStatus() == Status.OPEN;
            if (wasOpen) {
                problem.setStatus(Status.IN_PROGRESS);
            }

            service.updateProblem(problem);

            // 5) notifier le nouveau technicien (sauf si c'est l'admin lui-même)
            if (!newTech.getId().equals(admin.getId())) {
                notificationService.notify(newTech, problem, NotificationType.ASSIGNED_TO_PROBLEM);
            }

            // 6) notifier le client que son ticket est pris en charge
            if (wasOpen && problem.getUser() != null && problem.getUser().getRole() == UserRole.CLIENT) {
                notificationService.notify(problem.getUser(), problem, NotificationType.TICKET_IN_PROGRESS);
            }
        }
        return "redirect:/problems/" + id;
    }
}
