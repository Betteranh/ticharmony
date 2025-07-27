package be.stage.ticharmony.controller;

import be.stage.ticharmony.model.*;
import be.stage.ticharmony.service.ProblemService;
import be.stage.ticharmony.service.UserService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.StreamSupport;

@Controller
public class DashboardController {

    @Autowired
    private ProblemService problemService;
    @Autowired
    private UserService userService;

    @PreAuthorize("hasRole('CLIENT')")
    @GetMapping("/clientDashboard")
    public String clientDashboard(Model model) {
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
        List<Problem> all = StreamSupport
                .stream(problemService.getProblems().spliterator(), false)
                .collect(Collectors.toList());

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

        // Statistiques globales (non filtrées)
        long totalTickets = all.stream()
                .filter(p -> p.getStatus() != Status.CLOSED)
                .count();
        long newTickets = all.stream().filter(p -> p.getStatus() == Status.OPEN).count();
        long inProgressTickets = all.stream().filter(p -> p.getStatus() == Status.IN_PROGRESS).count();
        long resolvedTickets = all.stream().filter(p -> p.getStatus() == Status.RESOLVED).count();

        long[] ticketsByStatus = {
                newTickets,
                inProgressTickets,
                resolvedTickets,
                all.stream().filter(p -> p.getStatus() == Status.CLOSED).count()
        };
        long[] ticketsByPriority = {
                all.stream().filter(p -> p.getPriority() == Priority.LOW && p.getStatus() != Status.CLOSED).count(),
                all.stream().filter(p -> p.getPriority() == Priority.MEDIUM && p.getStatus() != Status.CLOSED).count(),
                all.stream().filter(p -> p.getPriority() == Priority.HIGH && p.getStatus() != Status.CLOSED).count(),
                all.stream().filter(p -> p.getPriority() == Priority.URGENT && p.getStatus() != Status.CLOSED).count()
        };

        List<Long> ticketsByStatusList = Arrays.stream(ticketsByStatus).boxed().toList();
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

        List<Problem> nonAssigned = filteredProblems.stream()
                .filter(p -> p.getTechnician() == null)
                .collect(Collectors.toList());

        model.addAttribute("problems", nonAssigned);
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

        // On récupère UNIQUEMENT les tickets assignés à ce technicien !
        List<Problem> all = StreamSupport
                .stream(problemService.getProblems().spliterator(), false)
                .filter(p -> p.getTechnician() != null && p.getTechnician().getId().equals(currentUser.getId()))
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

        // Statistiques globales (uniquement sur SES tickets)
        long totalTickets = all.stream().filter(p -> p.getStatus() != Status.CLOSED).count();
        long newTickets = all.stream().filter(p -> p.getStatus() == Status.OPEN).count();
        long inProgressTickets = all.stream().filter(p -> p.getStatus() == Status.IN_PROGRESS).count();
        long resolvedTickets = all.stream().filter(p -> p.getStatus() == Status.RESOLVED).count();

        long[] ticketsByStatus = {
                newTickets,
                inProgressTickets,
                resolvedTickets,
                all.stream().filter(p -> p.getStatus() == Status.CLOSED).count()
        };
        // Diagramme priorité : on ignore les tickets CLOSED
        long[] ticketsByPriority = {
                all.stream().filter(p -> p.getPriority() == Priority.LOW && p.getStatus() != Status.CLOSED).count(),
                all.stream().filter(p -> p.getPriority() == Priority.MEDIUM && p.getStatus() != Status.CLOSED).count(),
                all.stream().filter(p -> p.getPriority() == Priority.HIGH && p.getStatus() != Status.CLOSED).count(),
                all.stream().filter(p -> p.getPriority() == Priority.URGENT && p.getStatus() != Status.CLOSED).count()
        };

        List<Long> ticketsByStatusList = Arrays.stream(ticketsByStatus).boxed().toList();
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

        List<Problem> inProgressTicketsList = filteredProblems.stream()
                .filter(p -> p.getStatus() == Status.IN_PROGRESS)
                .sorted((p1, p2) -> p2.getCreatedAt().compareTo(p1.getCreatedAt()))
                .collect(Collectors.toList());

        model.addAttribute("problems", inProgressTicketsList);
        model.addAttribute("module", "dashboard");

        return "dashboard/memberDashboard";
    }

}
