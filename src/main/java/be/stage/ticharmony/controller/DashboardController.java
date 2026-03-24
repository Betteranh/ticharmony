package be.stage.ticharmony.controller;

import be.stage.ticharmony.model.*;
import be.stage.ticharmony.service.ProblemService;
import be.stage.ticharmony.service.UserProfileService;
import be.stage.ticharmony.service.UserService;
import be.stage.ticharmony.controller.ProfileController;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

import be.stage.ticharmony.repository.ProblemSpecification;
import org.springframework.data.jpa.domain.Specification;

import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.StreamSupport;

@Controller
public class DashboardController {

    @Autowired
    private ProblemService problemService;
    @Autowired
    private UserService userService;
    @Autowired
    private UserProfileService userProfileService;

    @PreAuthorize("hasRole('CLIENT')")
    @GetMapping("/clientDashboard")
    public String clientDashboard(Model model, Authentication auth, HttpSession session) {
        Long profileId = (Long) session.getAttribute(ProfileController.SESSION_PROFILE_KEY);
        if (profileId == null) {
            return "redirect:/select-profile";
        }

        User currentUser = userService.findByLogin(auth.getName());
        UserProfile activeProfile = userProfileService.findById(profileId).orElse(null);
        if (activeProfile == null || !activeProfile.getUser().getId().equals(currentUser.getId())) {
            session.removeAttribute(ProfileController.SESSION_PROFILE_KEY);
            return "redirect:/select-profile";
        }

        List<Problem> profileProblems = StreamSupport
                .stream(problemService.getProblemsByUserProfile(activeProfile).spliterator(), false)
                .collect(Collectors.toList());

        List<Problem> resolvedPending = profileProblems.stream()
                .filter(p -> p.getStatus() == Status.RESOLVED)
                .sorted((p1, p2) -> p2.getCreatedAt().compareTo(p1.getCreatedAt()))
                .collect(Collectors.toList());

        long activeCount = profileProblems.stream()
                .filter(p -> p.getStatus() == Status.OPEN || p.getStatus() == Status.IN_PROGRESS)
                .count();

        model.addAttribute("currentUser", currentUser);
        model.addAttribute("activeProfile", activeProfile);
        model.addAttribute("resolvedPending", resolvedPending);
        model.addAttribute("activeCount", activeCount);
        model.addAttribute("module", "dashboard");
        return "dashboard/clientDashboard";
    }

    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/adminDashboard")
    public String adminDashboard(
            @RequestParam(value = "status", required = false) String selectedStatus,
            Model model, Authentication auth) {

        ObjectMapper mapper = new ObjectMapper();
        User currentUser = userService.findByLogin(auth.getName());

        // Récupérer tous les tickets
        List<Problem> all = problemService.getProblems();

        // Filtrer selon le statut (Tous = "sauf Closed")
        List<Problem> filteredProblems;
        if (selectedStatus != null && !selectedStatus.isEmpty()) {
            filteredProblems = all.stream()
                    .filter(p -> p.getStatus().name().equalsIgnoreCase(selectedStatus))
                    .collect(Collectors.toList());
        } else {
            filteredProblems = all.stream()
                    .filter(p -> p.getStatus() != Status.CLOSED)
                    .collect(Collectors.toList());
        }

        // Trier du plus récent au plus ancien
        filteredProblems.sort((p1, p2) -> p2.getCreatedAt().compareTo(p1.getCreatedAt()));

        // Statistiques globales + listes sectorielles — un seul passage sur all
        long totalTickets = 0, newTickets = 0, inProgressTickets = 0, resolvedTickets = 0, closedTickets = 0;
        long pLow = 0, pMedium = 0, pHigh = 0, pUrgent = 0;
        List<Problem> nonAssignedAll = new ArrayList<>();
        List<Problem> resolvedAll    = new ArrayList<>();
        List<Problem> urgentList     = new ArrayList<>();

        for (Problem p : all) {
            Status s = p.getStatus();
            boolean notClosed = s != Status.CLOSED;
            if (notClosed) {
                totalTickets++;
                if (s == Status.OPEN)        newTickets++;
                if (s == Status.IN_PROGRESS) inProgressTickets++;
                if (s == Status.RESOLVED)    resolvedTickets++;
                if (p.getPriority() == Priority.LOW)    pLow++;
                if (p.getPriority() == Priority.MEDIUM) pMedium++;
                if (p.getPriority() == Priority.HIGH)   pHigh++;
                if (p.getPriority() == Priority.URGENT) pUrgent++;
                if (p.getTechnician() == null)           nonAssignedAll.add(p);
                if (s == Status.RESOLVED)                resolvedAll.add(p);
                if (p.getPriority() == Priority.URGENT && p.getTechnician() == null && s != Status.RESOLVED)
                    urgentList.add(p);
            } else {
                closedTickets++;
            }
        }

        Comparator<Problem> byDateDesc = (p1, p2) -> p2.getCreatedAt().compareTo(p1.getCreatedAt());
        nonAssignedAll.sort(byDateDesc);
        resolvedAll.sort(byDateDesc);
        urgentList.sort(byDateDesc);

        long[] ticketsByStatus   = { newTickets, inProgressTickets, resolvedTickets, closedTickets };
        long[] ticketsByPriority = { pLow, pMedium, pHigh, pUrgent };

        List<Long> ticketsByStatusList   = Arrays.stream(ticketsByStatus).boxed().toList();
        List<Long> ticketsByPriorityList = Arrays.stream(ticketsByPriority).boxed().toList();

        model.addAttribute("currentUser", currentUser);
        model.addAttribute("totalTickets", totalTickets);
        model.addAttribute("newTickets", newTickets);
        model.addAttribute("inProgressTickets", inProgressTickets);
        model.addAttribute("resolvedTickets", resolvedTickets);

        try {
            model.addAttribute("ticketsByStatusJs", mapper.writeValueAsString(ticketsByStatusList));
            model.addAttribute("ticketsByPriorityJs", mapper.writeValueAsString(ticketsByPriorityList));
        } catch (Exception e) {
            model.addAttribute("ticketsByStatusJs", "[]");
            model.addAttribute("ticketsByPriorityJs", "[]");
        }

        // Pour le filtre (menu déroulant)
        model.addAttribute("allStatuses", Arrays.asList(Status.values()));
        model.addAttribute("selectedStatus", selectedStatus);

        model.addAttribute("nonAssignedList",  nonAssignedAll.stream().limit(5).collect(Collectors.toList()));
        model.addAttribute("nonAssignedTotal", (long) nonAssignedAll.size());
        model.addAttribute("resolvedList",     resolvedAll.stream().limit(5).collect(Collectors.toList()));
        model.addAttribute("resolvedTotal",    (long) resolvedAll.size());
        model.addAttribute("urgentList", urgentList);
        model.addAttribute("module", "dashboard");

        return "dashboard/adminDashboard";
    }

//    @PreAuthorize("hasRole('MEMBER')")
//    @GetMapping("/memberDashboard")
//    public String memberDashboard(Model model) {
//        model.addAttribute("module", "dashboard");
//        return "dashboard/memberDashboard";
//    }

    @PreAuthorize("hasRole('MEMBER')")
    @GetMapping("/memberDashboard")
    public String memberDashboard(
            @RequestParam(value = "status", required = false) String selectedStatus,
            Model model, Authentication auth) {

        ObjectMapper mapper = new ObjectMapper();
        User currentUser = userService.findByLogin(auth.getName());

        // On récupère UNIQUEMENT les tickets assignés à ce technicien via requête directe
        List<Problem> all = StreamSupport
                .stream(problemService.getProblemsByTechnician(currentUser).spliterator(), false)
                .collect(Collectors.toList());

        // Filtre par statut comme pour admin
        List<Problem> filteredProblems;
        if (selectedStatus != null && !selectedStatus.isEmpty()) {
            filteredProblems = all.stream()
                    .filter(p -> p.getStatus().name().equalsIgnoreCase(selectedStatus))
                    .collect(Collectors.toList());
        } else {
            filteredProblems = all.stream()
                    .filter(p -> p.getStatus() != Status.CLOSED)
                    .collect(Collectors.toList());
        }
        filteredProblems.sort((p1, p2) -> p2.getCreatedAt().compareTo(p1.getCreatedAt()));

        // Statistiques + listes — un seul passage sur all (SES tickets)
        long totalTickets = 0, newTickets = 0, inProgressTickets = 0, resolvedTickets = 0, closedTickets = 0;
        long pLow = 0, pMedium = 0, pHigh = 0, pUrgent = 0;
        List<Problem> inProgressList      = new ArrayList<>();
        List<Problem> resolvedPendingList = new ArrayList<>();

        for (Problem p : all) {
            Status s = p.getStatus();
            boolean notClosed = s != Status.CLOSED;
            if (notClosed) {
                totalTickets++;
                if (s == Status.OPEN)        newTickets++;
                if (s == Status.IN_PROGRESS) { inProgressTickets++; inProgressList.add(p); }
                if (s == Status.RESOLVED)    { resolvedTickets++;    resolvedPendingList.add(p); }
                if (p.getPriority() == Priority.LOW)    pLow++;
                if (p.getPriority() == Priority.MEDIUM) pMedium++;
                if (p.getPriority() == Priority.HIGH)   pHigh++;
                if (p.getPriority() == Priority.URGENT) pUrgent++;
            } else {
                closedTickets++;
            }
        }

        Comparator<Problem> byDateDesc = (p1, p2) -> p2.getCreatedAt().compareTo(p1.getCreatedAt());
        inProgressList.sort(byDateDesc);
        resolvedPendingList.sort(byDateDesc);

        // Tickets non assignés — requête SQL directe, pas de chargement total
        List<Problem> unassignedList = problemService.getProblems(
                Specification.where(ProblemSpecification.unassigned())
                             .and(ProblemSpecification.withStatus(Status.OPEN))
        );
        unassignedList.sort(byDateDesc);

        long[] ticketsByStatus   = { newTickets, inProgressTickets, resolvedTickets, closedTickets };
        long[] ticketsByPriority = { pLow, pMedium, pHigh, pUrgent };

        List<Long> ticketsByStatusList   = Arrays.stream(ticketsByStatus).boxed().toList();
        List<Long> ticketsByPriorityList = Arrays.stream(ticketsByPriority).boxed().toList();

        model.addAttribute("currentUser", currentUser);
        model.addAttribute("totalTickets", totalTickets);
        model.addAttribute("newTickets", newTickets);
        model.addAttribute("inProgressTickets", inProgressTickets);
        model.addAttribute("resolvedTickets", resolvedTickets);

        try {
            model.addAttribute("ticketsByStatusJs", mapper.writeValueAsString(ticketsByStatusList));
            model.addAttribute("ticketsByPriorityJs", mapper.writeValueAsString(ticketsByPriorityList));
        } catch (Exception e) {
            model.addAttribute("ticketsByStatusJs", "[]");
            model.addAttribute("ticketsByPriorityJs", "[]");
        }

        // Pour le filtre (menu déroulant)
        model.addAttribute("allStatuses", Arrays.asList(Status.values()));
        model.addAttribute("selectedStatus", selectedStatus);

        model.addAttribute("inProgressList",       inProgressList.stream().limit(5).collect(Collectors.toList()));
        model.addAttribute("inProgressTotal",      (long) inProgressList.size());
        model.addAttribute("resolvedPendingList",  resolvedPendingList.stream().limit(5).collect(Collectors.toList()));
        model.addAttribute("resolvedPendingTotal", (long) resolvedPendingList.size());
        model.addAttribute("unassignedList",       unassignedList.stream().limit(5).collect(Collectors.toList()));
        model.addAttribute("unassignedTotal",      (long) unassignedList.size());

        model.addAttribute("module", "dashboard");

        return "dashboard/memberDashboard";
    }

}
